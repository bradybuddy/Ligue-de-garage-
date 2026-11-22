import { test } from "node:test";
import assert from "node:assert/strict";
import { zonedToUtc, utcToZonedParts, fmtTime } from "../src/lib/time";
import { parseSmsReply, normalizePhone } from "../src/lib/sms";
import { db, resetStore } from "../src/lib/data/store";
import * as data from "../src/lib/data/fake";

test("heure avancée : 21 h 15 reste 21 h 15 des deux côtés du changement", () => {
  // Avant (heure avancée, UTC-4) et après (heure normale, UTC-5) le 1er novembre 2026
  assert.equal(zonedToUtc("2026-10-29", "21:15").toISOString(), "2026-10-30T01:15:00.000Z");
  assert.equal(zonedToUtc("2026-11-05", "21:15").toISOString(), "2026-11-06T02:15:00.000Z");
  assert.equal(zonedToUtc("2027-03-18", "21:15").toISOString(), "2027-03-19T01:15:00.000Z");
  // Heure ambiguë (01:30 le jour du recul) : on prend une des deux, sans planter
  assert.ok(!Number.isNaN(zonedToUtc("2026-11-01", "01:30").getTime()));
  // Aller-retour
  assert.deepEqual(utcToZonedParts("2026-11-06T02:15:00.000Z"), { date: "2026-11-05", time: "21:15" });
  assert.equal(fmtTime("2026-11-06T02:15:00.000Z"), "21 h 15");
});

test("lecture des textos", () => {
  assert.deepEqual(parseSmsReply("y"), { kind: "answer", status: "in", code: null });
  assert.deepEqual(parseSmsReply(" Oui! "), { kind: "answer", status: "in", code: null });
  assert.deepEqual(parseSmsReply("N 482"), { kind: "answer", status: "out", code: "482" });
  assert.deepEqual(parseSmsReply("non."), { kind: "answer", status: "out", code: null });
  assert.equal(parseSmsReply("STOP").kind, "stop");
  assert.equal(parseSmsReply("peut-être").kind, "unknown");
  assert.equal(normalizePhone("(514) 555-1234"), "+15145551234");
  assert.equal(normalizePhone("1 514 555 1234"), "+15145551234");
  assert.equal(normalizePhone("555-1234"), null);
});

const setup = () => {
  resetStore();
  const s = db();
  const team = s.teams[0]!;
  const marc = s.users.find((u) => u.email === "marc@exemple.ca")!;
  const ev = s.events.find((e) => e.opponent === "Les Castors")!;
  return { s, team, marc, ev };
};

test("boucle centrale : rappel par texto, Y, le joueur est IN", async () => {
  const { s, marc, ev } = setup();
  const max = s.members.find((m) => m.displayName === "Mathieu Pelletier")!; // n'a pas encore répondu
  const sent = await data.sendReminders(marc.id, ev.id, { manual: true });
  assert.ok(sent > 0);
  const out = s.outbox.find((o) => o.memberId === max.id && o.channel === "sms");
  assert.match(out!.body, /Réponds Y ou N/);
  assert.equal(out!.to, "+15145550108");
  const reply = await data.handleInboundSms("514-555-0108", "y");
  assert.match(reply, /t'es IN/);
  const d = await data.getEventDetail(marc.id, ev.id);
  assert.ok(d.groups.in.some((m) => m.id === max.id));
  assert.equal(s.attendance.find((a) => a.memberId === max.id && a.eventId === ev.id)!.source, "sms");
  // Il change d'idée : N → OUT, le gérant est avisé
  assert.match(await data.handleInboundSms("+15145550108", "N"), /OUT/);
  assert.ok(s.outbox.some((o) => o.category === "manager_alert" && o.body.includes("Mathieu Pelletier")));
});

test("deux matchs en attente : on demande le code, puis Y 123 répond au bon", async () => {
  const { s, marc, ev } = setup();
  const ev2 = s.events.find((e) => e.opponent === "Les Zambonis")!;
  await data.sendReminders(marc.id, ev.id, { manual: true });
  await data.sendReminders(marc.id, ev2.id, { manual: true });
  const reply = await data.handleInboundSms("5145550104", "oui");
  assert.match(reply, /Tu as 2 matchs/);
  const jf = s.members.find((m) => m.phone === "+15145550104")!;
  const code = s.tokens.find((t) => t.eventId === ev2.id && t.memberId === jf.id && t.channel === "sms")!.smsCode!;
  assert.match(await data.handleInboundSms("5145550104", `Y ${code}`), /t'es IN/);
  assert.equal(s.attendance.find((a) => a.eventId === ev2.id && a.memberId === jf.id)!.status, "in");
  assert.equal(s.attendance.find((a) => a.eventId === ev.id && a.memberId === jf.id), undefined);
  assert.match(await data.handleInboundSms("5145550104", "Y 000"), /Code inconnu/);
});

test("plafond : le 17e va en liste d'attente, un régulier passe avant un spare", async () => {
  const { s, team, marc, ev } = setup();
  team.maxPlayers = 7; // 6 patineurs déjà IN dans les données de démo
  const skaters = s.members.filter((m) => m.position === "skater" && m.class === "regular" && !s.attendance.some((a) => a.memberId === m.id && a.eventId === ev.id));
  const spare = s.members.find((m) => m.displayName === "Léa Roy")!;
  assert.equal(await data.respond("system", ev.id, skaters[0]!.id, "in"), "in");
  assert.equal(await data.respond("system", ev.id, spare.id, "in"), "waitlist");
  assert.equal(await data.respond("system", ev.id, skaters[1]!.id, "in"), "waitlist");
  // Quelqu'un se désiste : le régulier monte, même s'il s'est inscrit après le spare
  const leaver = s.members.find((m) => m.displayName === "Max Tremblay")!;
  await data.respond("system", ev.id, leaver.id, "out");
  const st = (id: string) => s.attendance.find((a) => a.eventId === ev.id && a.memberId === id)!.status;
  assert.equal(st(skaters[1]!.id), "in");
  assert.equal(st(spare.id), "waitlist");
  // Les gardiens ont leur propre plafond
  const felix = s.members.find((m) => m.displayName === "Félix Girard")!;
  const patrick = s.members.find((m) => m.displayName === "Patrick Roy-Côté")!;
  assert.equal(await data.respond("system", ev.id, patrick.id, "in"), "in"); // 2e gardien
  assert.equal(await data.respond("system", ev.id, felix.id, "in"), "waitlist"); // 3e gardien
  void marc;
});

test("accès : un joueur ne répond pas pour un autre ; un non-gérant ne crée pas de match", async () => {
  const { s, team, ev } = setup();
  const sophie = s.users.find((u) => u.email === "sophie@exemple.ca")!;
  const max = s.members.find((m) => m.displayName === "Max Tremblay")!;
  await assert.rejects(data.respond(sophie.id, ev.id, max.id, "in"), /que pour toi/);
  await assert.rejects(data.createEvent(sophie.id, team.id, { type: "game", date: "2026-12-03", time: "21:15" }), /gérant/);
  const stranger = await data.signUp({ displayName: "Inconnu", email: "x@y.ca", password: "motdepasse" });
  await assert.rejects(data.getEventDetail(stranger.id, ev.id), /ne fais pas partie/);
});

test("courriel : le lien ne change rien en GET, répond en POST", async () => {
  const { s, marc, ev } = setup();
  await data.sendReminders(marc.id, ev.id, { manual: true });
  const mail = s.outbox.find((o) => o.channel === "email" && o.to === "jf@exemple.ca")!;
  const raw = mail.body.match(/\/r\/([a-f0-9]+)\?s=in/)![1]!;
  const ctx = await data.getTokenContext(raw);
  assert.equal(ctx!.status, "no_reply");
  assert.equal(await data.respondWithToken(raw, "in"), "in");
  assert.equal((await data.getTokenContext(raw))!.status, "in");
  assert.equal(await data.getTokenContext("faux"), null);
});

test("tick : rappel envoyé une seule fois, 48 h avant", async () => {
  const { s, ev } = setup();
  const start = Date.parse(ev.startsAt);
  assert.equal((await data.runTick(new Date(start - 50 * 3600_000))).reminders, 0);
  const first = await data.runTick(new Date(start - 47 * 3600_000));
  assert.ok(first.reminders > 0);
  const n = s.outbox.length;
  assert.equal((await data.runTick(new Date(start - 46 * 3600_000))).reminders, 0);
  assert.equal(s.outbox.length, n);
});
