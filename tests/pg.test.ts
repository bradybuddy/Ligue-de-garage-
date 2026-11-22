// Tests de la couche Postgres contre une vraie base Supabase locale (supabase/local).
// Lancer : npm run test:db   (saute si TEST_DATABASE_URL n'est pas défini)
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import postgres from "postgres";

const URL = process.env.TEST_DATABASE_URL;
process.env.DATABASE_URL = URL;
const skip = !URL && "TEST_DATABASE_URL non défini";

const admin = URL ? postgres(URL, { max: 1, onnotice: () => {} }) : (null as unknown as postgres.Sql);
type Data = typeof import("../src/lib/data/pg");
let data: Data;
let quietHoursEnd: typeof import("../src/lib/data/delivery").quietHoursEnd;
let twilio: typeof import("../src/lib/twilio");

async function user(name: string, email: string, verified = true) {
  const id = randomUUID();
  await admin`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
              values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated', ${email}, '',
                      case when ${verified}::boolean then now() end, jsonb_build_object('display_name', ${name}::text), now(), now())`;
  return id;
}
async function asRole(userId: string, q: string) {
  return admin.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
    await tx.unsafe("set local role authenticated");
    return tx.unsafe(q);
  });
}

describe("Postgres + RLS", { skip }, () => {
  let marc: string, sophie: string, stranger: string, teamId: string, eventId: string;

  before(async () => {
    data = await import("../src/lib/data/pg");
    ({ quietHoursEnd } = await import("../src/lib/data/delivery"));
    twilio = await import("../src/lib/twilio");
  });
  after(async () => {
    await admin.end();
    const { sql } = await import("../src/lib/db");
    await sql().end();
  });

  beforeEach(async () => {
    await admin`truncate teams, leagues, outbox, inbound_sms, processed_webhooks, push_subscriptions cascade`;
    await admin`delete from auth.users where email like '%@test.local'`;
    marc = await user("Marc Gérant", "marc@test.local");
    sophie = await user("Sophie Joueuse", "sophie@test.local");
    stranger = await user("Inconnu", "intrus@test.local");
    teamId = (await data.createTeam(marc, { name: "Les Testeurs", sport: "hockey", maxPlayers: 2 })).id;
    await data.addMember(marc, teamId, { displayName: "Sophie Joueuse", email: "sophie@test.local", class: "regular", position: "skater" });
    await data.addMember(marc, teamId, { displayName: "Bob Texto", phone: "438-555-9999", class: "regular", position: "skater", smsOptIn: true });
    await data.addMember(marc, teamId, { displayName: "Léa Spare", phone: "438-555-8888", class: "spare", position: "skater", smsOptIn: true });
    const d = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);
    eventId = (await data.createEvent(marc, teamId, { type: "game", date: d, time: "21:15", venue: "Aréna test" })).id;
  });

  test("un deuxième utilisateur ne voit RIEN", async () => {
    assert.deepEqual(await data.listMyTeams(stranger), []);
    await assert.rejects(data.getTeamForUser(stranger, teamId), /introuvable/);
    await assert.rejects(data.getEventDetail(stranger, eventId), /introuvable/);
    await assert.rejects(data.listMembers(stranger, teamId), /ne fais pas partie/);
    for (const t of ["teams", "members", "events", "attendance", "seasons", "threads", "profiles where id <> auth.uid()"]) {
      const [r] = await asRole(stranger, `select count(*)::int as n from ${t}`);
      assert.equal(r!.n, 0, `${t} visible par un inconnu`);
    }
    for (const t of ["outbox", "response_tokens", "inbound_sms"]) {
      await assert.rejects(asRole(marc, `select * from ${t}`), /permission denied/, `${t} lisible par un utilisateur`);
    }
    // Même en écriture directe, le RLS bloque
    await assert.rejects(asRole(stranger, `insert into events (team_id, starts_at) values ('${teamId}', now())`), /row-level security/);
    const upd = await asRole(stranger, `update teams set name = 'piraté' where id = '${teamId}' returning id`);
    assert.equal(upd.length, 0);
  });

  test("la fiche est reliée au compte de Sophie (courriel vérifié) ; elle voit son équipe", async () => {
    const teams = await data.listMyTeams(sophie);
    assert.equal(teams.length, 1);
    assert.equal(teams[0]!.me.role, "member");
  });

  test("un compte NON vérifié n'est pas relié à la fiche (pas de vol d'identité)", async () => {
    await data.addMember(marc, teamId, { displayName: "JF", email: "jf@test.local", class: "regular", position: "skater" });
    const fake = await user("Faux JF", "jf@test.local", false);
    assert.deepEqual(await data.listMyTeams(fake), []);
    await admin`update auth.users set email_confirmed_at = now() where id = ${fake}`; // il clique le lien de vérification
    assert.equal((await data.listMyTeams(fake)).length, 1);
  });

  test("droits : une joueuse répond pour elle, pas pour les autres ; ne crée pas de match", async () => {
    const d = await data.getEventDetail(sophie, eventId);
    const bob = d.groups.noReply.find((m) => m.displayName === "Bob Texto")!;
    assert.equal(await data.respond(sophie, eventId, d.me!.id, "in"), "in");
    await assert.rejects(data.respond(sophie, eventId, bob.id, "in"), /pas le droit/);
    await assert.rejects(data.createEvent(sophie, teamId, { type: "game", date: "2030-01-01", time: "20:00" }), /gérant/);
    await assert.rejects(data.addMember(sophie, teamId, { displayName: "X", class: "regular", position: "skater", phone: "5145550000" }), /gérant/);
    // Le gérant répond pour Bob : source « manager »
    await data.respond(marc, eventId, bob.id, "in");
    const after = await data.getEventDetail(marc, eventId);
    assert.equal(after.groups.in.find((m) => m.id === bob.id)!.source, "manager");
  });

  test("boucle : relance → texto en file → livré → « Y » → IN ; relance répétée bloquée", async () => {
    const n = await data.sendReminders(marc, eventId, { manual: true });
    assert.equal(n, 3); // Marc, Sophie, Bob (Léa est spare)
    const [sms] = await admin`select * from outbox where channel = 'sms' and to_address = '+14385559999'`;
    assert.match(sms!.body, /Les Testeurs : match .* Réponds Y ou N\./);
    await new Promise((r) => setTimeout(r, 300)); // la livraison part en arrière-plan
    const { deliverOutbox } = await import("../src/lib/data/delivery");
    await deliverOutbox();
    const [delivered] = await admin`select status, provider from outbox where id = ${sms!.id}`;
    assert.equal(delivered!.status, "sent");
    assert.equal(delivered!.provider, "console");

    assert.match(await data.handleInboundSms("438 555 9999", "Oui!", "SM-test-1"), /t'es IN/);
    assert.match(await data.handleInboundSms("438 555 9999", "Oui!", "SM-test-1"), /t'es IN/); // webhook rejoué : même réponse
    const [{ n: logged }] = await admin`select count(*)::int as n from inbound_sms where provider_sid = 'SM-test-1'`;
    assert.equal(logged, 1);
    const d = await data.getEventDetail(marc, eventId);
    assert.equal(d.groups.in.find((m) => m.displayName === "Bob Texto")!.source, "sms");
    await assert.rejects(data.sendReminders(marc, eventId, { manual: true }), /moins de 10 minutes/);
  });

  test("plafond : liste d'attente, puis un régulier monte avant un spare", async () => {
    const d = await data.getEventDetail(marc, eventId);
    const id = (name: string) => [...d.groups.noReply, ...d.groups.in].find((m) => m.displayName === name)?.id
      ?? (async () => (await admin`select id from members where display_name = ${name}`)[0]!.id)();
    const lea = (await admin`select id from members where display_name = 'Léa Spare'`)[0]!.id;
    assert.equal(await data.respond(marc, eventId, await id("Marc Gérant"), "in"), "in");
    assert.equal(await data.respond(sophie, eventId, await id("Sophie Joueuse"), "in"), "in");
    assert.equal(await data.respond("system", eventId, lea, "in"), "waitlist"); // max 2
    assert.equal(await data.respond("system", eventId, await id("Bob Texto"), "in"), "waitlist");
    assert.equal(await data.respond("system", eventId, lea, "in"), "waitlist"); // re-clic : pas de saut dans la file
    await data.respond(sophie, eventId, await id("Sophie Joueuse"), "out");
    const after = await data.getEventDetail(marc, eventId);
    assert.ok(after.groups.in.some((m) => m.displayName === "Bob Texto"), "le régulier monte");
    assert.ok(after.groups.waitlist.some((m) => m.displayName === "Léa Spare"));
    const alerts = await admin`select template from outbox where template in ('player_dropped','promoted_from_waitlist')`;
    assert.deepEqual(alerts.map((a) => a.template).sort(), ["player_dropped", "promoted_from_waitlist"]);
  });

  test("lien de courriel : contexte en lecture, réponse en écriture", async () => {
    await data.sendReminders(marc, eventId, { manual: true });
    const [mail] = await admin`select body from outbox where channel = 'email' and to_address = 'sophie@test.local'`;
    const raw = (mail!.body as string).match(/\/r\/([a-f0-9]+)\?s=in/)![1]!;
    assert.equal((await data.getTokenContext(raw))!.status, "no_reply");
    assert.equal(await data.respondWithToken(raw, "in"), "in");
    assert.equal(await data.getTokenContext("abcdef0123456789"), null);
  });

  test("tâche planifiée : rappel 48 h avant, une seule fois", async () => {
    const start = Date.parse((await admin`select starts_at from events where id = ${eventId}`)[0]!.starts_at);
    assert.equal((await data.runTick(new Date(start - 50 * 3600_000))).reminders, 0);
    assert.ok((await data.runTick(new Date(start - 47 * 3600_000))).reminders > 0);
    assert.equal((await data.runTick(new Date(start - 46 * 3600_000))).reminders, 0);
  });

  test("STOP : plus aucun texto pour ce numéro", async () => {
    assert.match(await data.handleInboundSms("4385559999", "STOP", "SM-stop"), /ne recevras plus/);
    await data.sendReminders(marc, eventId, { manual: true });
    const [{ n }] = await admin`select count(*)::int as n from outbox where channel = 'sms' and to_address = '+14385559999'`;
    assert.equal(n, 0);
  });

  test("suppression de compte : profil effacé, fiche anonymisée, équipe intacte", async () => {
    await admin`delete from auth.users where id = ${sophie}`;
    assert.equal((await admin`select 1 from profiles where id = ${sophie}`).length, 0);
    const [m] = await admin`select display_name, email, user_id from members where email is null and display_name = 'Ancien joueur'`;
    assert.ok(m && m.user_id === null);
    await admin`delete from auth.users where id = ${marc}`; // le créateur de l'équipe peut aussi partir
    assert.equal((await admin`select created_by from teams where id = ${teamId}`)[0]!.created_by, null);
  });

  test("heures de silence et signature Twilio", () => {
    const night = new Date("2026-11-25T04:00:00Z"); // 23 h à Montréal
    assert.equal(quietHoursEnd("America/Toronto", null, night)!.toISOString(), "2026-11-25T13:00:00.000Z"); // 8 h
    assert.equal(quietHoursEnd("America/Toronto", "2026-11-25T10:00:00Z", night), null); // match dans < 12 h
    assert.equal(quietHoursEnd("America/Toronto", null, new Date("2026-11-25T18:00:00Z")), null); // 13 h
    const params = { From: "+14385559999", Body: "Y" };
    const sig = createHmac("sha1", "tok").update("https://x.ca/hook" + "BodyY" + "From+14385559999").digest("base64");
    assert.ok(twilio.validTwilioSignature("tok", "https://x.ca/hook", params, sig));
    assert.ok(!twilio.validTwilioSignature("tok", "https://x.ca/hook", { ...params, Body: "N" }, sig));
    assert.ok(!twilio.validTwilioSignature("tok", "https://x.ca/hook", params, null));
  });
});
