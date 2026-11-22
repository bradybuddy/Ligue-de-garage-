// Couche de données réelle : Postgres (Supabase), RLS appliqué.
// Mêmes signatures que fake.ts — les écrans ne savent pas laquelle tourne.
//
// Règle : toute LECTURE ou ÉCRITURE faite pour un utilisateur passe par asUser() (RLS).
// asService() seulement pour : webhooks, tâche planifiée, tables réservées au serveur
// (outbox, response_tokens, inbound_sms) — et après une vérification de droits explicite.
import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { asService, asUser, type Tx } from "../db";
import { APP_URL, email as emailTpl, sms as smsTpl, spareEmail } from "../messages";
import { disambiguationLabels, normalizePhone, parseSmsReply } from "../sms";
import { fmtShortDate, fmtTime, zonedToUtc } from "../time";
import { deliverOutbox } from "./delivery";
import {
  DomainError, type Attendance, type AttendanceStatus, type EventDetail, type InboundSms, type Member, type OutboxItem, type PlayerClass,
  type ResponseSource, type RosterEntry, type Sport, type Team, type TeamEvent, type User,
  type Actor, type EventInput, type EventSummary, type MemberInput, type Channel, type SpareRow, type SparesPanel, type BeerOverview,
} from "./types";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const tx$ = <T>(actor: Actor, fn: (tx: Tx) => Promise<T>) => (actor === "system" ? asService(fn) : asUser(actor, fn));

async function assertManager(tx: Tx, teamId: string) {
  const [r] = await tx<{ ok: boolean }[]>`select is_team_manager(${teamId}::uuid) as ok`;
  if (!r?.ok) throw new DomainError("Seuls le gérant et l'adjoint peuvent faire ça.", "forbidden");
}
async function assertMember(tx: Tx, teamId: string) {
  const [r] = await tx<{ ok: boolean }[]>`select is_team_member(${teamId}::uuid) or is_team_manager(${teamId}::uuid) as ok`;
  if (!r?.ok) throw new DomainError("Tu ne fais pas partie de cette équipe.", "forbidden");
}

// ───────────── Comptes : gérés par Supabase Auth (src/lib/auth.ts) ─────────────
export async function getUser(id: string): Promise<User | null> {
  if (!isUuid(id)) return null;
  const [u] = await asService((tx) => tx<User[]>`select * from user_with_email(${id})`);
  return u ?? null;
}

// ───────────── Équipes ─────────────
export async function listMyTeams(userId: string): Promise<{ team: Team; me: Member }[]> {
  return asUser(userId, async (tx) => {
    const mine = await tx<Member[]>`select * from members where user_id = ${userId} and left_at is null`;
    if (!mine.length) return [];
    const teams = await tx<Team[]>`select * from teams where id in ${tx(mine.map((m) => m.teamId))}`;
    return mine
      .map((me) => ({ team: teams.find((t) => t.id === me.teamId)!, me }))
      .filter((x) => x.team)
      .sort((a, b) => a.team.name.localeCompare(b.team.name, "fr-CA"));
  });
}

export async function getTeamForUser(userId: string, teamId: string): Promise<{ team: Team; me: Member }> {
  if (!isUuid(teamId)) throw new DomainError("Équipe introuvable.", "not_found");
  return asUser(userId, async (tx) => {
    const [team] = await tx<Team[]>`select * from teams where id = ${teamId}`;
    const [me] = await tx<Member[]>`select * from members where team_id = ${teamId} and user_id = ${userId} and left_at is null`;
    if (!team || !me) throw new DomainError("Équipe introuvable.", "not_found");
    return { team, me };
  });
}

export async function createTeam(userId: string, input: { name: string; sport: Sport; maxPlayers?: number }): Promise<Team> {
  return asUser(userId, async (tx) => {
    const [p] = await tx<{ displayName: string }[]>`select display_name from profiles where id = ${userId}`;
    const [{ id }] = await tx<{ id: string }[]>`select create_team(${input.name.trim()}, ${input.sport}, ${p!.displayName}, ${input.maxPlayers ?? 20}) as id`;
    const [team] = await tx<Team[]>`select * from teams where id = ${id}`;
    return team!;
  });
}

// ───────────── Alignement ─────────────
const classOrder: PlayerClass[] = ["regular", "spare", "staff", "spectator", "injured", "vacation", "suspended"];
const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export async function listMembers(actor: Actor, teamId: string): Promise<Member[]> {
  return tx$(actor, async (tx) => {
    if (actor !== "system") await assertMember(tx, teamId);
    const rows = await tx<Member[]>`select * from members where team_id = ${teamId} and left_at is null`;
    return rows.sort((a, b) => classOrder.indexOf(a.class) - classOrder.indexOf(b.class) || a.displayName.localeCompare(b.displayName, "fr-CA"));
  });
}

export async function getMember(actor: Actor, teamId: string, memberId: string): Promise<Member> {
  if (!isUuid(memberId)) throw new DomainError("Joueur introuvable.", "not_found");
  return tx$(actor, async (tx) => {
    const [m] = await tx<Member[]>`select * from members where id = ${memberId} and team_id = ${teamId} and left_at is null`;
    if (!m) throw new DomainError("Joueur introuvable.", "not_found");
    return m;
  });
}

async function checkMemberUnique(tx: Tx, teamId: string, input: MemberInput, exceptId?: string) {
  const e = input.email?.trim().toLowerCase() || null;
  const p = normalizePhone(input.phone);
  if (input.phone && !p) throw new DomainError("Numéro invalide. Exemple : 514-555-1234.");
  const dup = await tx<{ displayName: string; email: string | null; phone: string | null }[]>`
    select display_name, email, phone from members
     where team_id = ${teamId} and left_at is null and id is distinct from ${exceptId ?? null}::uuid
       and ((${e}::citext is not null and email = ${e}::citext) or (${p}::text is not null and phone = ${p}))`;
  if (dup[0]) {
    const same = e && dup[0].email?.toLowerCase() === e ? "Ce courriel" : "Ce numéro";
    throw new DomainError(`${same} est déjà dans l'équipe (${dup[0].displayName}).`, "conflict");
  }
  return { email: e, phone: p };
}

/** Compte existant ET vérifié avec ce courriel → on relie la fiche. */
async function verifiedUserId(email: string | null): Promise<string | null> {
  if (!email) return null;
  const [u] = await asService((tx) => tx<{ id: string | null }[]>`select verified_user_id(${email}) as id`);
  return u?.id ?? null;
}

export async function addMember(actor: Actor, teamId: string, input: MemberInput): Promise<Member> {
  return tx$(actor, async (tx) => {
    if (actor !== "system") await assertManager(tx, teamId);
    const { email, phone } = await checkMemberUnique(tx, teamId, input);
    const userId = await verifiedUserId(email);
    const already = userId ? (await tx`select 1 from members where team_id = ${teamId} and user_id = ${userId} and left_at is null`).length : 0;
    const [m] = await tx<Member[]>`
      insert into members (team_id, user_id, display_name, email, phone, class, role, position, jersey_number, sms_opt_in)
      values (${teamId}, ${already ? null : userId}, ${input.displayName.trim()}, ${email}, ${phone}, ${input.class}, ${input.role ?? "member"},
              ${input.position}, ${input.jerseyNumber ?? null}, ${input.smsOptIn ?? !!phone})
      returning *`;
    return m!;
  });
}

export async function updateMember(actor: Actor, teamId: string, memberId: string, input: MemberInput): Promise<Member> {
  return tx$(actor, async (tx) => {
    if (actor !== "system") await assertManager(tx, teamId);
    const [cur] = await tx<Member[]>`select * from members where id = ${memberId} and team_id = ${teamId} and left_at is null for update`;
    if (!cur) throw new DomainError("Joueur introuvable.", "not_found");
    const { email, phone } = await checkMemberUnique(tx, teamId, input, memberId);
    if (cur.role === "manager" && input.role && input.role !== "manager") {
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from members where team_id = ${teamId} and role = 'manager' and left_at is null`;
      if (n === 1) throw new DomainError("L'équipe doit garder au moins un gérant.");
    }
    const [m] = await tx<Member[]>`
      update members set display_name = ${input.displayName.trim()}, email = ${email}, phone = ${phone}, class = ${input.class},
             role = ${input.role ?? cur.role}, position = ${input.position}, jersey_number = ${input.jerseyNumber ?? null},
             sms_opt_in = ${input.smsOptIn ?? cur.smsOptIn}
       where id = ${memberId} returning *`;
    return m!;
  });
}

export async function removeMember(actor: Actor, teamId: string, memberId: string): Promise<void> {
  await tx$(actor, async (tx) => {
    if (actor !== "system") await assertManager(tx, teamId);
    const [m] = await tx<Member[]>`select * from members where id = ${memberId} and team_id = ${teamId} and left_at is null`;
    if (!m) throw new DomainError("Joueur introuvable.", "not_found");
    if (m.role === "manager") {
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from members where team_id = ${teamId} and role = 'manager' and left_at is null`;
      if (n === 1) throw new DomainError("Tu es le seul gérant. Nomme quelqu'un d'autre avant de retirer cette fiche.");
    }
    await tx`update members set left_at = now() where id = ${memberId}`;
  });
}

// ───────────── Horaire ─────────────
export async function listEvents(actor: Actor, teamId: string, when: "upcoming" | "past"): Promise<EventSummary[]> {
  return tx$(actor, async (tx) => {
    if (actor !== "system") await assertMember(tx, teamId);
    const upcoming = when === "upcoming";
    const rows = await tx<(TeamEvent & { myStatus: AttendanceStatus | null; myClass: PlayerClass | null; inCount: number; cap: number })[]>`
      select e.*,
             (select a.status from attendance a join members m on m.id = a.member_id
               where a.event_id = e.id and m.user_id = auth.uid()) as my_status,
             (select m.class from members m where m.team_id = e.team_id and m.user_id = auth.uid() and m.left_at is null) as my_class,
             (select count(*)::int from attendance a join members m on m.id = a.member_id
               where a.event_id = e.id and a.status = 'in' and m.position = 'skater') as in_count,
             coalesce(e.max_players, t.max_players) as cap
        from events e join teams t on t.id = e.team_id
       where e.team_id = ${teamId}
         and ${upcoming ? tx`e.starts_at >= now() - interval '3 hours'` : tx`e.starts_at < now() - interval '3 hours'`}
       order by e.starts_at ${upcoming ? tx`asc` : tx`desc`}`;
    return rows.map(({ myClass, ...e }) => ({ ...e, myStatus: e.myStatus ?? (myClass === "regular" ? "no_reply" : null) }));
  });
}

export async function getEventDetail(actor: Actor, eventId: string): Promise<EventDetail> {
  if (!isUuid(eventId)) throw new DomainError("Match introuvable.", "not_found");
  return tx$(actor, async (tx) => {
    const [event] = await tx<TeamEvent[]>`select * from events where id = ${eventId}`;
    if (!event) throw new DomainError("Match introuvable.", "not_found"); // RLS : invisible si pas membre
    const [team] = await tx<Team[]>`select * from teams where id = ${event.teamId}`;
    const members = await tx<Member[]>`select * from members where team_id = ${team!.id} and left_at is null and class not in ('spectator','staff')`;
    const att = new Map((await tx<Attendance[]>`select * from attendance where event_id = ${eventId}`).map((a) => [a.memberId, a]));
    const [{ uid, manager }] = await tx<{ uid: string | null; manager: boolean }[]>`select auth.uid() as uid, is_team_manager(${team!.id}::uuid) as manager`;
    const [beer] = await tx<{ memberId: string; name: string }[]>`
      select b.member_id, m.display_name as name from beer_turns b join members m on m.id = b.member_id where b.event_id = ${eventId}`;
    const invitedIds = new Set((await tx<{ memberId: string }[]>`select distinct member_id from spare_invites where event_id = ${eventId}`.catch(() => [])).map((r) => r.memberId));
    const entries: RosterEntry[] = members.map((m) => {
      const a = att.get(m.id);
      return { ...m, status: a?.status ?? "no_reply", note: a?.note ?? null, respondedAt: a?.respondedAt ?? null, waitlistedAt: a?.waitlistedAt ?? null, waitlistRank: a?.waitlistRank ?? null, source: a?.source ?? null };
    });
    const byName = (a: RosterEntry, b: RosterEntry) =>
      (a.position === b.position ? 0 : a.position === "goalie" ? 1 : -1) || a.displayName.localeCompare(b.displayName, "fr-CA");
    const away = (e: RosterEntry) => ["vacation", "injured", "suspended"].includes(e.class);
    const groups = {
      in: entries.filter((e) => e.status === "in").sort(byName),
      waitlist: entries.filter((e) => e.status === "waitlist")
        .sort((a, b) => (a.waitlistRank ?? Infinity) - (b.waitlistRank ?? Infinity)
          || Number(b.class === "regular") - Number(a.class === "regular") || Date.parse(a.waitlistedAt!) - Date.parse(b.waitlistedAt!)),
      out: entries.filter((e) => e.status === "out").sort(byName),
      noReply: entries.filter((e) => e.status === "no_reply" && e.class === "regular").sort(byName),
      away: entries.filter((e) => e.status === "no_reply" && away(e)).sort(byName),
      invited: entries.filter((e) => e.status === "no_reply" && e.class === "spare" && invitedIds.has(e.id)).sort(byName),
    };
    const cap = { players: event.maxPlayers ?? team!.maxPlayers, goalies: event.maxGoalies ?? team!.maxGoalies };
    return {
      event, team: team!, cap,
      counts: {
        in: groups.in.filter((e) => e.position === "skater").length, goaliesIn: groups.in.filter((e) => e.position === "goalie").length,
        out: groups.out.length, waitlist: groups.waitlist.length, noReply: groups.noReply.length,
      },
      groups,
      me: uid ? (entries.find((e) => e.userId === uid) ?? null) : null,
      canManage: actor === "system" || manager,
      beer: beer ?? null,
    };
  });
}

function startsAtFor(input: EventInput, team: Team): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) throw new DomainError("Date ou heure invalide.");
  const d = zonedToUtc(input.date, input.time, team.timezone);
  if (Number.isNaN(d.getTime())) throw new DomainError("Date ou heure invalide.");
  return d;
}

export async function createEvent(actor: Actor, teamId: string, input: EventInput): Promise<TeamEvent> {
  return tx$(actor, async (tx) => {
    if (actor !== "system") await assertManager(tx, teamId);
    const [team] = await tx<Team[]>`select * from teams where id = ${teamId}`;
    const [season] = await tx<{ id: string }[]>`select id from seasons where team_id = ${teamId} and is_active`;
    const [e] = await tx<TeamEvent[]>`
      insert into events (team_id, season_id, type, title, starts_at, venue, opponent, home_room, away_room, max_players)
      values (${teamId}, ${season?.id ?? null}, ${input.type}, ${input.title?.trim() || null}, ${startsAtFor(input, team!).toISOString()},
              ${input.venue?.trim() || null}, ${input.opponent?.trim() || null}, ${input.homeRoom?.trim() || null}, ${input.awayRoom?.trim() || null},
              ${input.maxPlayers ?? null})
      returning *`;
    return e!;
  });
}

export async function updateEvent(actor: Actor, eventId: string, input: EventInput): Promise<TeamEvent> {
  return tx$(actor, async (tx) => {
    const [cur] = await tx<TeamEvent[]>`select * from events where id = ${eventId}`;
    if (!cur) throw new DomainError("Match introuvable.", "not_found");
    if (actor !== "system") await assertManager(tx, cur.teamId);
    const [team] = await tx<Team[]>`select * from teams where id = ${cur.teamId}`;
    const startsAt = startsAtFor(input, team!).toISOString();
    const moved = startsAt !== cur.startsAt;
    const [e] = await tx<TeamEvent[]>`
      update events set type = ${input.type}, title = ${input.title?.trim() || null}, starts_at = ${startsAt},
             venue = ${input.venue?.trim() || null}, opponent = ${input.opponent?.trim() || null}, max_players = ${input.maxPlayers ?? null},
             home_room = ${input.homeRoom?.trim() || null}, away_room = ${input.awayRoom?.trim() || null},
             reminder_sent_at = case when ${moved} and starts_at > now() then null else reminder_sent_at end,
             spares_invited_at = case when ${moved} then null else spares_invited_at end
       where id = ${eventId} returning *`;
    return e!;
  });
}

export async function cancelEvent(actor: Actor, eventId: string): Promise<void> {
  await tx$(actor, async (tx) => {
    const [cur] = await tx<TeamEvent[]>`select * from events where id = ${eventId}`;
    if (!cur) throw new DomainError("Match introuvable.", "not_found");
    if (actor !== "system") await assertManager(tx, cur.teamId);
    await tx`update events set status = 'cancelled' where id = ${eventId}`;
  });
}

export async function deleteEvent(actor: Actor, eventId: string): Promise<void> {
  await tx$(actor, async (tx) => {
    const [cur] = await tx<TeamEvent[]>`select * from events where id = ${eventId}`;
    if (!cur) throw new DomainError("Match introuvable.", "not_found");
    if (actor !== "system") await assertManager(tx, cur.teamId);
    await tx`delete from events where id = ${eventId}`;
  });
}

// ───────────── Présences ─────────────
export async function respond(
  actor: Actor, eventId: string, memberId: string, status: "in" | "out", opts: { note?: string | null; source?: ResponseSource } = {},
): Promise<AttendanceStatus> {
  if (!isUuid(eventId) || !isUuid(memberId)) throw new DomainError("Introuvable.", "not_found");
  const note = opts.note === undefined ? null : (opts.note?.trim().slice(0, 280) || null);
  const final = await tx$(actor, async (tx) => {
    const [r] = await tx<{ s: AttendanceStatus }[]>`select set_attendance(${eventId}, ${memberId}, ${status}, ${note}, ${opts.source ?? "app"}) as s`;
    return r!.s;
  });
  // set_attendance a pu mettre des avis en file (gérant, joueur promu) : on les livre tout de suite
  void deliverOutbox({ limit: 20 }).catch((e) => console.error("livraison", e));
  return final;
}

// ───────────── Rappels ─────────────
const evCtx = (e: TeamEvent, t: Team) => ({ startsAt: e.startsAt, venue: e.venue, opponent: e.opponent, tz: t.timezone, teamName: t.name });

async function enqueue(tx: Tx, o: { memberId: string; channel: "sms" | "email" | "push"; category: OutboxItem["category"]; template: string; to: string | null; subject?: string; body: string; dedupeKey: string; payload?: object }) {
  const r = await tx`
    insert into outbox (member_id, channel, category, template, payload, dedupe_key, to_address, subject, body)
    values (${o.memberId}, ${o.channel}, ${o.category}, ${o.template}, ${tx.json((o.payload ?? {}) as never)}, ${o.dedupeKey}, ${o.to}, ${o.subject ?? null}, ${o.body})
    on conflict (dedupe_key) do nothing returning id`;
  return r.length > 0;
}

async function smsCodeFor(tx: Tx, phone: string): Promise<string> {
  const taken = new Set((await tx<{ smsCode: string }[]>`
    select t.sms_code from response_tokens t join members m on m.id = t.member_id
     where t.channel = 'sms' and t.expires_at > now() and m.phone = ${phone}`).map((r) => r.smsCode));
  let c: string;
  do c = String(randomInt(100, 1000)); while (taken.has(c));
  return c;
}

async function remindEvent(tx: Tx, ev: TeamEvent, team: Team, round: string): Promise<number> {
  const ctx = evCtx(ev, team);
  const targets = await tx<Member[]>`
    select m.* from members m
     where m.team_id = ${team.id} and m.left_at is null and m.class = 'regular'
       and not exists (select 1 from attendance a where a.event_id = ${ev.id} and a.member_id = m.id and a.status <> 'no_reply')`;
  const expiresAt = new Date(Date.parse(ev.startsAt) + 2 * 3600_000).toISOString();
  let reached = 0;
  for (const m of targets) {
    let sent = false;
    if (m.phone && m.smsOptIn && !(m as Member & { smsOptedOutAt?: string }).smsOptedOutAt) {
      const [tok] = await tx`select 1 from response_tokens where event_id = ${ev.id} and member_id = ${m.id} and channel = 'sms' and expires_at > now()`;
      if (!tok) {
        await tx`insert into response_tokens (event_id, member_id, channel, token_hash, sms_code, expires_at)
                 values (${ev.id}, ${m.id}, 'sms', ${sha(randomBytes(18).toString("hex"))}, ${await smsCodeFor(tx, m.phone)}, ${expiresAt})`;
      }
      sent = (await enqueue(tx, { memberId: m.id, channel: "sms", category: "reminder", template: "reminder", to: m.phone, body: smsTpl.reminder(ctx),
        dedupeKey: `reminder:${ev.id}:${m.id}:sms:${round}`, payload: { event_id: ev.id } })) || sent;
    }
    if (m.email) {
      const raw = randomBytes(24).toString("hex");
      await tx`insert into response_tokens (event_id, member_id, channel, token_hash, expires_at) values (${ev.id}, ${m.id}, 'email', ${sha(raw)}, ${expiresAt})`;
      sent = (await enqueue(tx, { memberId: m.id, channel: "email", category: "reminder", template: "reminder", to: m.email,
        subject: emailTpl.reminderSubject(ctx), body: emailTpl.reminderBody(ctx, `${APP_URL}/r/${raw}`, m.displayName),
        dedupeKey: `reminder:${ev.id}:${m.id}:email:${round}`, payload: { event_id: ev.id } })) || sent;
    }
    if (m.userId) {
      sent = (await enqueue(tx, { memberId: m.id, channel: "push", category: "reminder", template: "reminder", to: null,
        body: smsTpl.reminder(ctx).replace(" Réponds Y ou N.", ""), dedupeKey: `reminder:${ev.id}:${m.id}:push:${round}`,
        payload: { event_id: ev.id, url: `/t/${team.id}/matchs/${ev.id}` } })) || sent;
    }
    if (sent) reached++;
  }
  return reached;
}

const MANUAL_REMINDER_COOLDOWN_MIN = 10;

export async function sendReminders(actor: Actor, eventId: string, opts: { manual?: boolean } = {}): Promise<number> {
  if (!isUuid(eventId)) throw new DomainError("Match introuvable.", "not_found");
  // 1. droits, avec l'identité de l'utilisateur
  const teamId = await tx$(actor, async (tx) => {
    const [ev] = await tx<TeamEvent[]>`select * from events where id = ${eventId}`;
    if (!ev) throw new DomainError("Match introuvable.", "not_found");
    if (actor !== "system") await assertManager(tx, ev.teamId);
    return ev.teamId;
  });
  // 2. écriture dans les tables du serveur
  const n = await asService(async (tx) => {
    const [ev] = await tx<TeamEvent[]>`select * from events where id = ${eventId} for update`;
    if (ev!.status !== "scheduled") throw new DomainError("Ce match n'est plus à l'horaire.", "closed");
    if (opts.manual) {
      const [recent] = await tx`select 1 from outbox where category = 'reminder' and payload->>'event_id' = ${eventId}
                                 and dedupe_key like '%:manual-%' and created_at > now() - make_interval(mins => ${MANUAL_REMINDER_COOLDOWN_MIN})`;
      if (recent) throw new DomainError(`Une relance est déjà partie il y a moins de ${MANUAL_REMINDER_COOLDOWN_MIN} minutes.`, "conflict");
    }
    const [team] = await tx<Team[]>`select * from teams where id = ${teamId}`;
    const reached = await remindEvent(tx, ev!, team!, opts.manual ? `manual-${Date.now()}` : "auto");
    if (!opts.manual) await tx`update events set reminder_sent_at = now() where id = ${eventId}`;
    return reached;
  });
  void deliverOutbox({ limit: 200 }).catch((e) => console.error("livraison", e));
  return n;
}

/** Tâche planifiée (pg_cron → /api/cron/tick toutes les 2 min). Idempotente, plusieurs instances OK (skip locked). */
export async function runTick(at: Date = new Date()): Promise<{ reminders: number; spares: number; beer: number; delivered: number; failed: number }> {
  const atIso = at.toISOString();
  const reminders = await asService(async (tx) => {
    const due = await tx<(TeamEvent & { hours: number })[]>`
      select e.*, t.reminder_hours_before as hours from events e join teams t on t.id = e.team_id
       where e.status = 'scheduled' and e.reminder_sent_at is null and e.starts_at > ${atIso}
         and e.starts_at - make_interval(hours => t.reminder_hours_before) <= ${atIso}
       for update of e skip locked`;
    let n = 0;
    for (const ev of due) {
      const [team] = await tx<Team[]>`select * from teams where id = ${ev.teamId}`;
      n += await remindEvent(tx, ev, team!, "auto");
      await tx`update events set reminder_sent_at = now() where id = ${ev.id}`;
    }
    return n;
  });
  const spares = await autoInviteSpares(atIso);
  const beer = await asService(async (tx) => {
    const due = await tx<{ id: string }[]>`
      select e.id from events e join teams t on t.id = e.team_id
       where t.beer_enabled and e.status = 'scheduled' and e.beer_assigned_at is null
         and e.starts_at > ${atIso} and e.starts_at - interval '24 hours' <= ${atIso}
       for update of e skip locked`;
    for (const e of due) await tx`select pick_beer(${e.id})`;
    return due.length;
  });
  // Ménage : envois coincés (instance morte en plein envoi) et vieux jetons
  await asService(async (tx) => {
    await tx`update outbox set status = 'pending', locked_at = null where status = 'sending' and locked_at < now() - interval '10 minutes'`;
    await tx`delete from response_tokens where expires_at < now() - interval '7 days'`;
    await tx`delete from inbound_sms where created_at < now() - interval '90 days'`;
    await tx`delete from outbox where status in ('sent','skipped') and created_at < now() - interval '90 days'`;
  });
  const d = await deliverOutbox({ limit: 200 });
  return { reminders, spares, beer, delivered: d.sent, failed: d.failed };
}

// ───────────── Réponses entrantes ─────────────
const INBOUND_PER_HOUR = 30;

export async function handleInboundSms(fromRaw: string, body: string, providerSid?: string): Promise<string> {
  const from = normalizePhone(fromRaw) ?? fromRaw;
  const intent = parseSmsReply(body);
  const result = await asService(async (tx): Promise<{ reply: string; answer?: { eventId: string; memberId: string; tokenId: string; status: "in" | "out" } }> => {
    if (providerSid) {
      const [seen] = await tx<{ result: string }[]>`select result from inbound_sms where provider_sid = ${providerSid}`;
      if (seen) return { reply: seen.result };
    }
    const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from inbound_sms where from_phone = ${from} and created_at > now() - interval '1 hour'`;
    if (n >= INBOUND_PER_HOUR) return { reply: "" }; // boucle ou abus : on ne répond plus pendant une heure
    const log = async (reply: string, tokenId: string | null = null) => {
      await tx`insert into inbound_sms (provider_sid, from_phone, body, matched_token_id, result)
               values (${providerSid ?? `local-${randomBytes(8).toString("hex")}`}, ${from}, ${body.slice(0, 500)}, ${tokenId}, ${reply})`;
      return reply;
    };
    if (intent.kind === "stop") {
      await tx`update members set sms_opt_in = false, sms_opted_out_at = now() where phone = ${from}`;
      return { reply: await log(smsTpl.stopped()) };
    }
    if (intent.kind === "help") return { reply: await log(smsTpl.help()) };
    if (intent.kind === "unknown") return { reply: await log(smsTpl.notUnderstood()) };

    const pending = await tx<{ id: string; eventId: string; memberId: string; smsCode: string; startsAt: string; timezone: string; teamName: string }[]>`
      select t.id, t.event_id, t.member_id, t.sms_code, e.starts_at, tm.timezone, tm.name as team_name
        from response_tokens t join members m on m.id = t.member_id join events e on e.id = t.event_id join teams tm on tm.id = e.team_id
       where t.channel = 'sms' and t.expires_at > now() and m.phone = ${from} and m.left_at is null and e.status = 'scheduled'
       order by e.starts_at`;
    if (!pending.length) return { reply: await log(smsTpl.nothingPending()) };
    let tok = pending[0]!;
    if (intent.code) {
      const match = pending.find((t) => t.smsCode === intent.code);
      if (!match) return { reply: await log(smsTpl.unknownCode()) };
      tok = match;
    } else if (pending.length > 1) {
      const labels = disambiguationLabels(pending.map((t) => ({ teamName: t.teamName, day: fmtShortDate(t.startsAt, t.timezone), time: fmtTime(t.startsAt, t.timezone) })));
      return { reply: await log(smsTpl.pickOne(pending.map((t, i) => ({ code: t.smsCode, label: labels[i]! })))) };
    }
    return { reply: "", answer: { eventId: tok.eventId, memberId: tok.memberId, tokenId: tok.id, status: intent.status } };
  });
  if (!result.answer) return result.reply;

  const { eventId, memberId, tokenId, status } = result.answer;
  let reply: string;
  try {
    const final = await respond("system", eventId, memberId, status, { source: "sms" });
    const ctx = await asService(async (tx) => {
      const [ev] = await tx<TeamEvent[]>`select * from events where id = ${eventId}`;
      const [team] = await tx<Team[]>`select * from teams where id = ${ev!.teamId}`;
      return evCtx(ev!, team!);
    });
    reply = final === "in" ? smsTpl.confirmIn(ctx) : final === "waitlist" ? smsTpl.confirmWaitlist() : smsTpl.confirmOut();
  } catch (e) {
    reply = e instanceof DomainError ? `${e.message} Ouvre l'appli pour plus de détails.` : "Oups, ta réponse n'est pas passée. Réessaie dans un instant.";
  }
  await asService(async (tx) => {
    await tx`update response_tokens set used_at = now() where id = ${tokenId}`;
    await tx`insert into inbound_sms (provider_sid, from_phone, body, matched_token_id, result)
             values (${providerSid ?? `local-${randomBytes(8).toString("hex")}`}, ${from}, ${body.slice(0, 500)}, ${tokenId}, ${reply})
             on conflict (provider_sid) do nothing`;
  });
  return reply;
}

export async function getTokenContext(raw: string) {
  if (!/^[a-f0-9]{16,128}$/.test(raw)) return null;
  return asService(async (tx) => {
    const [tok] = await tx<{ eventId: string; memberId: string; expiresAt: string }[]>`
      select event_id, member_id, expires_at from response_tokens where channel = 'email' and token_hash = ${sha(raw)}`;
    if (!tok) return null;
    const [event] = await tx<TeamEvent[]>`select * from events where id = ${tok.eventId}`;
    const [team] = await tx<Team[]>`select * from teams where id = ${event!.teamId}`;
    const [member] = await tx<Member[]>`select * from members where id = ${tok.memberId}`;
    const [a] = await tx<{ status: AttendanceStatus }[]>`select status from attendance where event_id = ${tok.eventId} and member_id = ${tok.memberId}`;
    return { event: event!, team: team!, member: member!, status: a?.status ?? ("no_reply" as AttendanceStatus), expired: Date.parse(tok.expiresAt) < Date.now() };
  });
}

export async function respondWithToken(raw: string, status: "in" | "out"): Promise<AttendanceStatus> {
  const ctx = await getTokenContext(raw);
  if (!ctx) throw new DomainError("Ce lien n'est pas valide.", "not_found");
  if (ctx.expired) throw new DomainError("Ce lien a expiré. Ouvre l'appli pour répondre.", "closed");
  const final = await respond("system", ctx.event.id, ctx.member.id, status, { source: "email" });
  await asService((tx) => tx`update response_tokens set used_at = now() where token_hash = ${sha(raw)}`);
  return final;
}

// ───────────── Outils de développement (lecture seule) ─────────────
export async function devListOutbox(): Promise<OutboxItem[]> {
  return asService((tx) => tx<OutboxItem[]>`
    select id, member_id, channel, category, template, to_address as "to", subject, coalesce(body, template) as body, dedupe_key, status, created_at, sent_at
      from outbox order by created_at desc limit 200`);
}
export async function devListInbound() {
  return asService((tx) => tx<InboundSms[]>`
    select id, provider_sid, from_phone as "from", body, result, created_at from inbound_sms order by created_at desc limit 200`);
}
export async function devListPhones() {
  return asService((tx) => tx<{ phone: string; name: string; teamId: string }[]>`
    select distinct on (phone) phone, display_name as name, team_id from members where phone is not null and left_at is null order by phone`);
}

// ───────────── Avis et abonnements ─────────────
/** Lien de désabonnement d'un courriel (jeton signé vérifié par l'appelant). */
export async function unsubscribeEmail(memberId: string, category: string): Promise<{ teamName: string } | null> {
  if (!isUuid(memberId)) return null;
  return asService(async (tx) => {
    const [m] = await tx<{ teamName: string }[]>`select t.name as team_name from members m join teams t on t.id = m.team_id where m.id = ${memberId}`;
    if (!m) return null;
    await tx`insert into notification_prefs (member_id, category, channel, enabled) values (${memberId}, ${category}, 'email', false)
             on conflict (member_id, category, channel) do update set enabled = false`;
    return m;
  });
}

export async function savePushSubscription(userId: string, sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string }): Promise<void> {
  await asUser(userId, (tx) => tx`
    insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
    values (${userId}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, ${sub.userAgent?.slice(0, 200) ?? null})
    on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, user_id = excluded.user_id, updated_at = now()`);
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  await asUser(userId, (tx) => tx`delete from push_subscriptions where user_id = ${userId} and endpoint = ${endpoint}`);
}

/** Statut de livraison Twilio (webhook) : un texto non livré passe en échec, visible dans le journal. */
export async function recordSmsStatus(providerMessageId: string, status: string, errorCode?: string): Promise<void> {
  if (!["failed", "undelivered"].includes(status)) return;
  await asService((tx) => tx`update outbox set status = 'failed', error = ${`twilio ${status} ${errorCode ?? ""}`.trim()}
                              where provider_message_id = ${providerMessageId}`);
}

// ───────────── Rejoindre par code (S03) ─────────────
export async function getInvitePreview(code: string): Promise<{ teamId: string; name: string; sport: string; players: number } | null> {
  if (!/^[A-Z0-9]{4,10}$/i.test(code.trim())) return null;
  const [r] = await asService((tx) => tx<{ teamId: string; name: string; sport: string; players: number }[]>`select * from invite_preview(${code})`);
  return r ?? null;
}

export async function joinTeam(userId: string, code: string): Promise<string> {
  return asUser(userId, async (tx) => {
    const [p] = await tx<{ displayName: string }[]>`select display_name from profiles where id = ${userId}`;
    await tx`select join_team(${code}, ${p!.displayName})`;
    const [t] = await tx<{ id: string }[]>`select id from teams where invite_code = upper(trim(${code}))`;
    return t!.id;
  });
}


// ───────────── Spares (S14) et liste d'attente (S15) ─────────────
/** Joint un joueur pour un match : jetons de réponse (texto, courriel) + messages en file. Retourne vrai si au moins un canal part. */
async function contactForEvent(tx: Tx, o: {
  ev: TeamEvent; team: Team; m: Member; channels: Channel[]; category: OutboxItem["category"]; template: string; round: string;
  sms: string; push: string; emailSubject: string; emailBody: (link: string) => string;
}): Promise<Channel[]> {
  const { ev, team, m } = o;
  const expiresAt = new Date(Date.parse(ev.startsAt) + 2 * 3600_000).toISOString();
  const used: Channel[] = [];
  if (o.channels.includes("sms") && m.phone && m.smsOptIn && !(m as Member & { smsOptedOutAt?: string | null }).smsOptedOutAt) {
    const [tok] = await tx`select 1 from response_tokens where event_id = ${ev.id} and member_id = ${m.id} and channel = 'sms' and expires_at > now()`;
    if (!tok) {
      await tx`insert into response_tokens (event_id, member_id, channel, token_hash, sms_code, expires_at)
               values (${ev.id}, ${m.id}, 'sms', ${sha(randomBytes(18).toString("hex"))}, ${await smsCodeFor(tx, m.phone)}, ${expiresAt})`;
    }
    if (await enqueue(tx, { memberId: m.id, channel: "sms", category: o.category, template: o.template, to: m.phone, body: o.sms,
      dedupeKey: `${o.template}:${ev.id}:${m.id}:sms:${o.round}`, payload: { event_id: ev.id } })) used.push("sms");
  }
  if (o.channels.includes("email") && m.email) {
    const raw = randomBytes(24).toString("hex");
    await tx`insert into response_tokens (event_id, member_id, channel, token_hash, expires_at) values (${ev.id}, ${m.id}, 'email', ${sha(raw)}, ${expiresAt})`;
    if (await enqueue(tx, { memberId: m.id, channel: "email", category: o.category, template: o.template, to: m.email,
      subject: o.emailSubject, body: o.emailBody(`${APP_URL}/r/${raw}`), dedupeKey: `${o.template}:${ev.id}:${m.id}:email:${o.round}`, payload: { event_id: ev.id } })) used.push("email");
  }
  if (o.channels.includes("push") && m.userId) {
    if (await enqueue(tx, { memberId: m.id, channel: "push", category: o.category, template: o.template, to: null, body: o.push,
      dedupeKey: `${o.template}:${ev.id}:${m.id}:push:${o.round}`, payload: { event_id: ev.id, url: `/t/${team.id}/matchs/${ev.id}` } })) used.push("push");
  }
  return used;
}

async function inviteSparesTx(tx: Tx, ev: TeamEvent, team: Team, members: Member[], channels: Channel[], note: string | null, auto: boolean, invitedBy: string | null) {
  const ctx = evCtx(ev, team);
  const round = auto ? "auto" : `manual-${Date.now()}`;
  let n = 0;
  for (const m of members) {
    const used = await contactForEvent(tx, {
      ev, team, m, channels, category: "spare_invite", template: "spare_invite", round,
      sms: smsTpl.spareInvite(ctx, note), push: `${team.name} cherche un spare ${fmtShortDate(ev.startsAt, team.timezone)} à ${fmtTime(ev.startsAt, team.timezone)}. Dispo?`,
      emailSubject: spareEmail.subject(ctx), emailBody: (link) => spareEmail.body(ctx, link, m.displayName, note),
    });
    if (!used.length) continue;
    n++;
    for (const ch of used) {
      await tx`insert into spare_invites (event_id, member_id, invited_by, channel, message, is_auto)
               values (${ev.id}, ${m.id}, ${invitedBy}, ${ch}, ${note}, ${auto})
               on conflict (event_id, member_id, channel) do update set sent_at = now(), message = excluded.message`;
    }
  }
  return n;
}

export async function getSparesPanel(actor: Actor, eventId: string): Promise<SparesPanel> {
  if (!isUuid(eventId)) throw new DomainError("Match introuvable.", "not_found");
  const { event, team } = await tx$(actor, async (tx) => {
    const [event] = await tx<TeamEvent[]>`select * from events where id = ${eventId}`;
    if (!event) throw new DomainError("Match introuvable.", "not_found");
    if (actor !== "system") await assertManager(tx, event.teamId);
    const [team] = await tx<Team[]>`select * from teams where id = ${event.teamId}`;
    return { event, team: team! };
  });
  return asService(async (tx) => {
    const [open] = await tx<{ players: number; goalies: number }[]>`select * from open_spots(${eventId})`;
    const spares = await tx<(Member & { status: AttendanceStatus | null; invitedAt: string | null; invitedChannels: Channel[] | null })[]>`
      select m.*, a.status, i.invited_at, i.channels as invited_channels
        from members m
        left join attendance a on a.event_id = ${eventId} and a.member_id = m.id
        left join (select member_id, max(sent_at) as invited_at, array_agg(distinct channel) as channels
                     from spare_invites where event_id = ${eventId} group by member_id) i on i.member_id = m.id
       where m.team_id = ${team.id} and m.left_at is null and m.class = 'spare'
       order by m.position desc, m.display_name`;
    const rows: SpareRow[] = spares.map(({ status, invitedAt, invitedChannels, ...member }) => ({
      member: member as Member, status: status ?? "no_reply", invitedAt, invitedChannels: invitedChannels ?? [],
    }));
    return { event, team, open: open ?? { players: 0, goalies: 0 }, spares: rows };
  });
}

export async function inviteSpares(actor: Actor, eventId: string, memberIds: string[], channels: Channel[], note?: string | null): Promise<number> {
  if (!memberIds.length) throw new DomainError("Choisis au moins un spare.");
  if (!channels.length) throw new DomainError("Choisis au moins un canal.");
  const panel = await getSparesPanel(actor, eventId); // droits de gérant vérifiés ici
  if (panel.event.status !== "scheduled") throw new DomainError("Ce match n'est plus à l'horaire.", "closed");
  const chosen = panel.spares.filter((s) => memberIds.includes(s.member.id)).map((s) => s.member);
  if (!chosen.length) throw new DomainError("Ces joueurs ne sont pas des spares de l'équipe.");
  const n = await asService((tx) => inviteSparesTx(tx, panel.event, panel.team, chosen, channels, note?.trim().slice(0, 200) || null, false, actor === "system" ? null : actor));
  void deliverOutbox({ limit: 200 }).catch((e) => console.error("livraison", e));
  return n;
}

/** Tâche planifiée : X h avant le match, s'il manque du monde, on invite les spares (texto + notif + courriel selon l'équipe). */
async function autoInviteSpares(atIso: string): Promise<number> {
  return asService(async (tx) => {
    const due = await tx<(TeamEvent & { channels: Channel[] })[]>`
      select e.*, t.auto_spares_channels as channels from events e join teams t on t.id = e.team_id
       where t.auto_spares_enabled and e.status = 'scheduled' and e.spares_invited_at is null and e.starts_at > ${atIso}
         and e.starts_at - make_interval(hours => t.auto_spares_hours_before) <= ${atIso}
       for update of e skip locked`;
    let n = 0;
    for (const ev of due) {
      const [team] = await tx<Team[]>`select * from teams where id = ${ev.teamId}`;
      const [open] = await tx<{ players: number; goalies: number }[]>`select * from open_spots(${ev.id})`;
      await tx`update events set spares_invited_at = now() where id = ${ev.id}`;
      if (!open || (open.players === 0 && open.goalies === 0)) continue;
      const positions = [...(open.players > 0 ? ["skater"] : []), ...(open.goalies > 0 ? ["goalie"] : [])];
      const spares = await tx<Member[]>`
        select m.* from members m where m.team_id = ${team!.id} and m.left_at is null and m.class = 'spare' and m.position in ${tx(positions)}
           and not exists (select 1 from attendance a where a.event_id = ${ev.id} and a.member_id = m.id and a.status <> 'no_reply')
           and not exists (select 1 from spare_invites i where i.event_id = ${ev.id} and i.member_id = m.id)`;
      n += await inviteSparesTx(tx, ev, team!, spares, ev.channels, null, true, null);
    }
    return n;
  });
}

export async function reorderWaitlist(actor: Actor, eventId: string, memberIds: string[]): Promise<void> {
  if (!isUuid(eventId) || !memberIds.every(isUuid)) throw new DomainError("Introuvable.", "not_found");
  await tx$(actor, (tx) => tx`select reorder_waitlist(${eventId}, ${memberIds}::uuid[])`);
}

export async function acceptFromWaitlist(actor: Actor, eventId: string, memberId: string): Promise<void> {
  if (!isUuid(eventId) || !isUuid(memberId)) throw new DomainError("Introuvable.", "not_found");
  await tx$(actor, (tx) => tx`select force_in(${eventId}, ${memberId})`);
  void deliverOutbox({ limit: 20 }).catch((e) => console.error("livraison", e));
}

// ───────────── Calendrier (abonnement ICS) ─────────────
/** Lecture par jeton secret (l'appli Calendrier n'a pas de session). Seulement l'équipe de ce membre. */
export async function getCalendarFeed(token: string) {
  if (!/^[a-f0-9]{36}$/.test(token)) return null;
  return asService(async (tx) => {
    const [m] = await tx<Member[]>`select * from members where calendar_token = ${token} and left_at is null`;
    if (!m) return null;
    const [team] = await tx<Team[]>`select * from teams where id = ${m.teamId}`;
    const events = await tx<(TeamEvent & { updatedAt: string; myStatus: AttendanceStatus | null })[]>`
      select e.*, a.status as my_status from events e
        left join attendance a on a.event_id = e.id and a.member_id = ${m.id}
       where e.team_id = ${m.teamId} and e.starts_at > now() - interval '60 days'
       order by e.starts_at`;
    return { member: m, team: team!, events };
  });
}

// ───────────── Tournée (S22) ─────────────
export async function getBeerOverview(actor: Actor, teamId: string): Promise<BeerOverview> {
  return tx$(actor, async (tx) => {
    if (actor !== "system") await assertMember(tx, teamId);
    const [team] = await tx<Team[]>`select * from teams where id = ${teamId}`;
    if (!team) throw new DomainError("Équipe introuvable.", "not_found");
    const [{ manager }] = await tx<{ manager: boolean }[]>`select is_team_manager(${teamId}::uuid) as manager`;
    const [me] = await tx<Member[]>`select * from members where team_id = ${teamId} and user_id = auth.uid() and left_at is null`;
    const events = await tx<(TeamEvent & { beerMember: string | null; beerName: string | null; beerMode: "auto" | "manual" | null })[]>`
      select e.*, b.member_id as beer_member, m.display_name as beer_name, b.mode as beer_mode
        from events e left join beer_turns b on b.event_id = e.id left join members m on m.id = b.member_id
       where e.team_id = ${teamId} and e.status = 'scheduled' and e.starts_at > now() - interval '3 hours'
       order by e.starts_at limit 4`;
    const ins = await tx<{ eventId: string; id: string; name: string }[]>`
      select a.event_id, m.id, m.display_name as name from attendance a join members m on m.id = a.member_id
       where a.event_id in ${tx(events.length ? events.map((e) => e.id) : ["00000000-0000-0000-0000-000000000000"])} and a.status = 'in'
       order by m.display_name`;
    const standings = await tx<{ memberId: string; name: string; count: number; optOut: boolean }[]>`
      select m.id as member_id, m.display_name as name, m.beer_opt_out as opt_out,
             (select count(*)::int from beer_turns b join events e on e.id = b.event_id
               where b.member_id = m.id and e.team_id = ${teamId}
                 and e.season_id is not distinct from (select id from seasons where team_id = ${teamId} and is_active)) as count
        from members m where m.team_id = ${teamId} and m.left_at is null and m.class in ('regular','spare')
       order by count desc, m.display_name`;
    return {
      team: team!, enabled: team!.beerEnabled, canManage: actor === "system" || manager,
      me: { memberId: me?.id ?? "", optOut: me?.beerOptOut ?? false },
      upcoming: events.map(({ beerMember, beerName, beerMode, ...event }) => ({
        event: event as TeamEvent, memberId: beerMember, memberName: beerName, mode: beerMode,
        inPlayers: ins.filter((i) => i.eventId === event.id).map(({ id, name }) => ({ id, name })),
      })),
      standings,
    };
  });
}

export async function setBeerOptOut(userId: string, teamId: string, optOut: boolean): Promise<void> {
  const n = await asUser(userId, (tx) => tx`update members set beer_opt_out = ${optOut} where team_id = ${teamId} and user_id = ${userId} and left_at is null returning id`);
  if (!n.length) throw new DomainError("Tu ne fais pas partie de cette équipe.", "forbidden");
}

/** Le gérant choisit à la main (memberId) ou laisse l'appli choisir maintenant (null). */
export async function setBeerTurn(actor: Actor, eventId: string, memberId: string | null): Promise<string | null> {
  if (!isUuid(eventId) || (memberId && !isUuid(memberId))) throw new DomainError("Introuvable.", "not_found");
  const ev = await tx$(actor, async (tx) => {
    const [ev] = await tx<TeamEvent[]>`select * from events where id = ${eventId}`;
    if (!ev) throw new DomainError("Match introuvable.", "not_found");
    if (actor !== "system") await assertManager(tx, ev.teamId);
    return ev;
  });
  const chosen = await asService(async (tx) => {
    if (!memberId) {
      await tx`delete from beer_turns where event_id = ${eventId}`;
      const [r] = await tx<{ id: string | null }[]>`select pick_beer(${eventId}) as id`;
      return r?.id ?? null;
    }
    const [m] = await tx`select 1 from members where id = ${memberId} and team_id = ${ev.teamId} and left_at is null`;
    if (!m) throw new DomainError("Joueur introuvable.", "not_found");
    await tx`insert into beer_turns (event_id, member_id, mode) values (${eventId}, ${memberId}, 'manual')
             on conflict (event_id) do update set member_id = excluded.member_id, mode = 'manual', confirmed_at = null`;
    await tx`update events set beer_assigned_at = now() where id = ${eventId}`;
    await tx`insert into outbox (member_id, channel, category, template, payload, dedupe_key)
             values (${memberId}, 'push', 'beer', 'beer_duty', ${tx.json({ event_id: eventId })}, ${`beer:${eventId}:${memberId}:${Date.now()}`})`;
    return memberId;
  });
  void deliverOutbox({ limit: 20 }).catch((e) => console.error("livraison", e));
  return chosen;
}
