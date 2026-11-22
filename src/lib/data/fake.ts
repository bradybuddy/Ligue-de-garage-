// Couche de données de démo (mémoire). Mêmes signatures que la future couche Supabase.
// Les règles d'accès reproduisent les policies RLS ; les règles de présence reproduisent
// set_attendance() / on_spot_freed() de replica/schema.sql.
import { createHash, randomInt } from "node:crypto";
import { APP_URL, email as emailTpl, push as pushTpl, sms as smsTpl } from "../messages";
import { disambiguationLabels, normalizePhone, parseSmsReply } from "../sms";
import { fmtShortDate, fmtTime, zonedToUtc } from "../time";
import { db, genInviteCode, hexToken, iso, now, uid } from "./store";
import {
  DomainError, type Attendance, type AttendanceStatus, type Channel, type EventDetail, type EventType, type Member,
  type MemberRole, type OutboxItem, type PlayerClass, type Position, type ResponseSource, type RosterEntry, type Sport,
  type Team, type TeamEvent, type User,
} from "./types";

export type Actor = string | "system"; // userId ou le serveur (clé de service)

// ───────────── utilitaires d'accès (≈ is_team_member / is_team_manager) ─────────────
const activeMembers = (teamId: string) => db().members.filter((m) => m.teamId === teamId && !m.leftAt);
const myMember = (userId: string, teamId: string) => activeMembers(teamId).find((m) => m.userId === userId) ?? null;

function requireTeam(teamId: string): Team {
  const t = db().teams.find((x) => x.id === teamId);
  if (!t) throw new DomainError("Équipe introuvable.", "not_found");
  return t;
}
function requireMember(actor: Actor, teamId: string): Member | null {
  if (actor === "system") return null;
  const me = myMember(actor, teamId);
  if (!me) throw new DomainError("Tu ne fais pas partie de cette équipe.", "forbidden");
  return me;
}
function requireManager(actor: Actor, teamId: string) {
  if (actor === "system") return;
  const me = requireMember(actor, teamId);
  if (!me || (me.role !== "manager" && me.role !== "assistant")) {
    throw new DomainError("Seuls le gérant et l'adjoint peuvent faire ça.", "forbidden");
  }
}
const isManager = (m: Member | null) => !!m && (m.role === "manager" || m.role === "assistant");

// ───────────── Comptes (démo ; Supabase Auth en vrai) ─────────────
export async function signIn(emailAddr: string, password: string): Promise<User> {
  const e = emailAddr.trim().toLowerCase();
  const u = db().users.find((x) => x.email === e);
  if (!u || db().passwords.get(e) !== password) throw new DomainError("Courriel ou mot de passe incorrect.");
  return u;
}

export async function signUp(input: { displayName: string; email: string; password: string; phone?: string | null }): Promise<User> {
  const e = input.email.trim().toLowerCase();
  if (db().users.some((x) => x.email === e)) {
    throw new DomainError("Ce courriel a déjà un compte. Connecte-toi plutôt.", "conflict");
  }
  const u: User = { id: uid(), email: e, displayName: input.displayName.trim(), phone: normalizePhone(input.phone), locale: "fr-CA" };
  db().users.push(u);
  db().passwords.set(e, input.password);
  // Relie les fiches que des gérants avaient déjà créées avec ce courriel
  for (const m of db().members) if (!m.userId && m.email === e) m.userId = u.id;
  return u;
}

export async function getUser(id: string): Promise<User | null> {
  return db().users.find((u) => u.id === id) ?? null;
}

// ───────────── Équipes ─────────────
export async function listMyTeams(userId: string): Promise<{ team: Team; me: Member }[]> {
  return db()
    .members.filter((m) => m.userId === userId && !m.leftAt)
    .map((me) => ({ team: requireTeam(me.teamId), me }))
    .sort((a, b) => a.team.name.localeCompare(b.team.name, "fr-CA"));
}

export async function getTeamForUser(userId: string, teamId: string): Promise<{ team: Team; me: Member }> {
  const team = requireTeam(teamId);
  const me = requireMember(userId, teamId)!;
  return { team, me };
}

export async function createTeam(userId: string, input: { name: string; sport: Sport; maxPlayers?: number }): Promise<Team> {
  const user = await getUser(userId);
  if (!user) throw new DomainError("Connexion requise.", "forbidden");
  let code = genInviteCode();
  while (db().teams.some((t) => t.inviteCode === code)) code = genInviteCode();
  const team: Team = {
    id: uid(), createdBy: userId, name: input.name.trim(), sport: input.sport, inviteCode: code, timezone: "America/Toronto",
    maxPlayers: input.maxPlayers ?? 20, maxGoalies: 2, reminderHoursBefore: 48, autoSparesEnabled: true,
    autoSparesHoursBefore: 36, waitlistMode: "top", beerEnabled: true, createdAt: iso(),
  };
  db().teams.push(team);
  db().members.push({
    id: uid(), teamId: team.id, userId, displayName: user.displayName, email: user.email, phone: user.phone,
    class: "regular", role: "manager", position: "skater", jerseyNumber: null, smsOptIn: !!user.phone,
    beerOptOut: false, calendarToken: hexToken(), leftAt: null, createdAt: iso(),
  });
  return team;
}

// ───────────── Alignement ─────────────
const classOrder: PlayerClass[] = ["regular", "spare", "staff", "spectator", "injured", "vacation", "suspended"];

export async function listMembers(actor: Actor, teamId: string): Promise<Member[]> {
  requireTeam(teamId);
  requireMember(actor, teamId);
  return activeMembers(teamId).sort(
    (a, b) => classOrder.indexOf(a.class) - classOrder.indexOf(b.class) || a.displayName.localeCompare(b.displayName, "fr-CA"),
  );
}

export async function getMember(actor: Actor, teamId: string, memberId: string): Promise<Member> {
  requireMember(actor, teamId);
  const m = activeMembers(teamId).find((x) => x.id === memberId);
  if (!m) throw new DomainError("Joueur introuvable.", "not_found");
  return m;
}

export interface MemberInput {
  displayName: string;
  email?: string | null;
  phone?: string | null;
  class: PlayerClass;
  role?: MemberRole;
  position: Position;
  jerseyNumber?: number | null;
  smsOptIn?: boolean;
}

function checkMemberUnique(teamId: string, input: MemberInput, exceptId?: string) {
  const e = input.email?.trim().toLowerCase() || null;
  const p = normalizePhone(input.phone);
  for (const m of activeMembers(teamId)) {
    if (m.id === exceptId) continue;
    if (e && m.email === e) throw new DomainError(`Ce courriel est déjà dans l'équipe (${m.displayName}).`, "conflict");
    if (p && m.phone === p) throw new DomainError(`Ce numéro est déjà dans l'équipe (${m.displayName}).`, "conflict");
  }
  if (input.phone && !p) throw new DomainError("Numéro invalide. Exemple : 514-555-1234.");
}

export async function addMember(actor: Actor, teamId: string, input: MemberInput): Promise<Member> {
  requireManager(actor, teamId);
  checkMemberUnique(teamId, input);
  const e = input.email?.trim().toLowerCase() || null;
  const linked = e ? db().users.find((u) => u.email === e) : undefined;
  const m: Member = {
    id: uid(), teamId, userId: linked?.id ?? null, displayName: input.displayName.trim(), email: e,
    phone: normalizePhone(input.phone), class: input.class, role: input.role ?? "member", position: input.position,
    jerseyNumber: input.jerseyNumber ?? null, smsOptIn: input.smsOptIn ?? !!input.phone, beerOptOut: false,
    calendarToken: hexToken(), leftAt: null, createdAt: iso(),
  };
  db().members.push(m);
  return m;
}

export async function updateMember(actor: Actor, teamId: string, memberId: string, input: MemberInput): Promise<Member> {
  requireManager(actor, teamId);
  const m = await getMember(actor, teamId, memberId);
  checkMemberUnique(teamId, input, memberId);
  if (m.role === "manager" && input.role && input.role !== "manager" && activeMembers(teamId).filter((x) => x.role === "manager").length === 1) {
    throw new DomainError("L'équipe doit garder au moins un gérant.");
  }
  Object.assign(m, {
    displayName: input.displayName.trim(), email: input.email?.trim().toLowerCase() || null, phone: normalizePhone(input.phone),
    class: input.class, role: input.role ?? m.role, position: input.position, jerseyNumber: input.jerseyNumber ?? null,
    smsOptIn: input.smsOptIn ?? m.smsOptIn,
  });
  return m;
}

export async function removeMember(actor: Actor, teamId: string, memberId: string): Promise<void> {
  requireManager(actor, teamId);
  const m = await getMember(actor, teamId, memberId);
  if (m.role === "manager" && activeMembers(teamId).filter((x) => x.role === "manager").length === 1) {
    throw new DomainError("Tu es le seul gérant. Nomme quelqu'un d'autre avant de retirer cette fiche.");
  }
  m.leftAt = iso();
}

// ───────────── Horaire ─────────────
export interface EventInput {
  type: EventType;
  date: string; // AAAA-MM-JJ, heure locale de l'équipe
  time: string; // HH:MM
  venue?: string | null;
  opponent?: string | null;
  title?: string | null;
  maxPlayers?: number | null;
  homeRoom?: string | null;
  awayRoom?: string | null;
}

export interface EventSummary extends TeamEvent {
  myStatus: AttendanceStatus | null;
  inCount: number;
  cap: number;
}

const capOf = (e: TeamEvent, t: Team) => ({ players: e.maxPlayers ?? t.maxPlayers, goalies: e.maxGoalies ?? t.maxGoalies });

export async function listEvents(actor: Actor, teamId: string, when: "upcoming" | "past"): Promise<EventSummary[]> {
  const team = requireTeam(teamId);
  const me = requireMember(actor, teamId);
  const cutoff = now().getTime() - 3 * 3600_000; // un match commencé il y a moins de 3 h est encore « à venir »
  return db()
    .events.filter((e) => e.teamId === teamId && (when === "upcoming" ? Date.parse(e.startsAt) >= cutoff : Date.parse(e.startsAt) < cutoff))
    .sort((a, b) => (when === "upcoming" ? 1 : -1) * (Date.parse(a.startsAt) - Date.parse(b.startsAt)))
    .map((e) => {
      const att = db().attendance.filter((a) => a.eventId === e.id);
      const skatersIn = att.filter((a) => a.status === "in" && memberPos(a.memberId) === "skater").length;
      return {
        ...e,
        myStatus: me ? (att.find((a) => a.memberId === me.id)?.status ?? (expectsAnswer(me) ? "no_reply" : null)) : null,
        inCount: skatersIn,
        cap: capOf(e, team).players,
      };
    });
}

const memberPos = (memberId: string): Position => db().members.find((m) => m.id === memberId)?.position ?? "skater";
const expectsAnswer = (m: Member) => m.class === "regular";
const isAway = (m: Member) => m.class === "vacation" || m.class === "injured" || m.class === "suspended";

function requireEvent(eventId: string): TeamEvent {
  const e = db().events.find((x) => x.id === eventId);
  if (!e) throw new DomainError("Match introuvable.", "not_found");
  return e;
}

export async function getEventDetail(actor: Actor, eventId: string): Promise<EventDetail> {
  const event = requireEvent(eventId);
  const team = requireTeam(event.teamId);
  const me = requireMember(actor, team.id);
  const att = new Map(db().attendance.filter((a) => a.eventId === eventId).map((a) => [a.memberId, a]));
  const entries: RosterEntry[] = activeMembers(team.id)
    .filter((m) => m.class !== "spectator" && m.class !== "staff")
    .map((m) => {
      const a = att.get(m.id);
      return { ...m, status: a?.status ?? "no_reply", note: a?.note ?? null, respondedAt: a?.respondedAt ?? null, waitlistedAt: a?.waitlistedAt ?? null, source: a?.source ?? null };
    });
  const byName = (a: RosterEntry, b: RosterEntry) =>
    (a.position === b.position ? 0 : a.position === "goalie" ? 1 : -1) || a.displayName.localeCompare(b.displayName, "fr-CA");
  const groups = {
    in: entries.filter((e) => e.status === "in").sort(byName),
    waitlist: entries
      .filter((e) => e.status === "waitlist")
      .sort((a, b) => Number(b.class === "regular") - Number(a.class === "regular") || Date.parse(a.waitlistedAt!) - Date.parse(b.waitlistedAt!)),
    out: entries.filter((e) => e.status === "out").sort(byName),
    // Spares : seulement s'ils ont répondu ou été invités (jalon 2). Absents : à part.
    noReply: entries.filter((e) => e.status === "no_reply" && e.class === "regular").sort(byName),
    away: entries.filter((e) => e.status === "no_reply" && isAway(e)).sort(byName),
  };
  const cap = capOf(event, team);
  return {
    event, team, cap,
    counts: {
      in: groups.in.filter((e) => e.position === "skater").length,
      goaliesIn: groups.in.filter((e) => e.position === "goalie").length,
      out: groups.out.length, waitlist: groups.waitlist.length, noReply: groups.noReply.length,
    },
    groups,
    me: me ? (entries.find((e) => e.id === me.id) ?? null) : null,
    canManage: actor === "system" || isManager(me),
  };
}

function validateEventInput(input: EventInput, team: Team): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) throw new DomainError("Date ou heure invalide.");
  const startsAt = zonedToUtc(input.date, input.time, team.timezone);
  if (Number.isNaN(startsAt.getTime())) throw new DomainError("Date ou heure invalide.");
  if (input.maxPlayers != null && (input.maxPlayers < 1 || input.maxPlayers > 60)) throw new DomainError("Le maximum doit être entre 1 et 60.");
  return startsAt;
}

export async function createEvent(actor: Actor, teamId: string, input: EventInput): Promise<TeamEvent> {
  requireManager(actor, teamId);
  const team = requireTeam(teamId);
  const startsAt = validateEventInput(input, team);
  const e: TeamEvent = {
    id: uid(), teamId, type: input.type, title: input.title?.trim() || null, startsAt: iso(startsAt), endsAt: null,
    venue: input.venue?.trim() || null, opponent: input.opponent?.trim() || null, homeRoom: input.homeRoom?.trim() || null,
    awayRoom: input.awayRoom?.trim() || null, maxPlayers: input.maxPlayers ?? null, maxGoalies: null, status: "scheduled",
    scoreUs: null, scoreThem: null, reminderSentAt: null, createdAt: iso(),
  };
  db().events.push(e);
  return e;
}

export async function updateEvent(actor: Actor, eventId: string, input: EventInput): Promise<TeamEvent> {
  const e = requireEvent(eventId);
  requireManager(actor, e.teamId);
  const startsAt = validateEventInput(input, requireTeam(e.teamId));
  const moved = iso(startsAt) !== e.startsAt;
  Object.assign(e, {
    type: input.type, title: input.title?.trim() || null, startsAt: iso(startsAt), venue: input.venue?.trim() || null,
    opponent: input.opponent?.trim() || null, maxPlayers: input.maxPlayers ?? null, homeRoom: input.homeRoom?.trim() || null,
    awayRoom: input.awayRoom?.trim() || null,
  });
  if (moved && e.reminderSentAt && Date.parse(e.startsAt) > now().getTime()) e.reminderSentAt = null; // le rappel repartira
  return e;
}

export async function cancelEvent(actor: Actor, eventId: string): Promise<void> {
  const e = requireEvent(eventId);
  requireManager(actor, e.teamId);
  e.status = "cancelled";
}

export async function deleteEvent(actor: Actor, eventId: string): Promise<void> {
  const e = requireEvent(eventId);
  requireManager(actor, e.teamId);
  const s = db();
  s.events = s.events.filter((x) => x.id !== eventId);
  s.attendance = s.attendance.filter((a) => a.eventId !== eventId);
  s.tokens = s.tokens.filter((t) => t.eventId !== eventId);
}

// ───────────── Présences (≈ set_attendance) ─────────────
const evCtx = (e: TeamEvent, t: Team) => ({ startsAt: e.startsAt, venue: e.venue, opponent: e.opponent, tz: t.timezone, teamName: t.name });

export async function respond(
  actor: Actor, eventId: string, memberId: string, status: "in" | "out", opts: { note?: string | null; source?: ResponseSource } = {},
): Promise<AttendanceStatus> {
  // En Postgres, tout ce bloc tient sous un verrou de ligne sur l'événement. Ici, JS est mono-fil :
  // aucune attente entre la lecture des comptes et l'écriture, donc même garantie.
  const ev = requireEvent(eventId);
  const team = requireTeam(ev.teamId);
  const member = activeMembers(team.id).find((m) => m.id === memberId);
  if (!member) throw new DomainError("Joueur introuvable.", "not_found");
  if (actor !== "system") {
    const me = requireMember(actor, team.id);
    if (member.userId !== actor && !isManager(me)) throw new DomainError("Tu ne peux répondre que pour toi.", "forbidden");
  }
  if (ev.status !== "scheduled") throw new DomainError(ev.status === "cancelled" ? "Ce match est annulé." : "Ce match est terminé.", "closed");
  const source: ResponseSource = actor !== "system" && member.userId !== actor ? "manager" : (opts.source ?? "app");
  const note = opts.note !== undefined ? (opts.note?.trim().slice(0, 280) || null) : undefined;

  const s = db();
  let cur = s.attendance.find((a) => a.eventId === eventId && a.memberId === memberId);
  const prev = cur?.status ?? "no_reply";
  let final: AttendanceStatus = status;

  if (status === "in" && prev === "waitlist") final = "waitlist";
  else if (status === "in" && prev !== "in") {
    const cap = capOf(ev, team);
    const limit = member.position === "goalie" ? cap.goalies : cap.players;
    const taken = s.attendance.filter((a) => a.eventId === eventId && a.status === "in" && memberPos(a.memberId) === member.position).length;
    if (taken >= limit) {
      if (team.waitlistMode === "off") throw new DomainError("Le match est complet.", "full");
      final = "waitlist";
    }
  }

  const t = iso();
  if (!cur) {
    cur = { id: uid(), eventId, memberId, status: final, note: note ?? null, source, respondedAt: t, waitlistedAt: null, waitlistRank: null };
    s.attendance.push(cur);
  } else {
    cur.status = final;
    if (note !== undefined) cur.note = note;
    cur.source = source;
    cur.respondedAt = t;
  }
  cur.waitlistedAt = final === "waitlist" ? (cur.waitlistedAt ?? t) : null;
  if (final !== "waitlist") cur.waitlistRank = null;

  if (status === "out" && prev === "in") onSpotFreed(ev, team, member);
  return final;
}

function onSpotFreed(ev: TeamEvent, team: Team, leaver: Member) {
  const ctx = evCtx(ev, team);
  // Avis aux gérants
  for (const mgr of activeMembers(team.id).filter((m) => isManager(m) && m.id !== leaver.id)) {
    enqueue({ member: mgr, channel: mgr.userId ? "push" : "sms", category: "manager_alert", template: "player_dropped",
      body: pushTpl.playerDropped(leaver.displayName, ctx), dedupeKey: `dropped:${ev.id}:${leaver.id}:${mgr.id}:${Date.now()}` });
  }
  if (team.waitlistMode !== "top") return; // « premier qui accepte » : jalon 2
  const s = db();
  const next = s.attendance
    .filter((a) => a.eventId === ev.id && a.status === "waitlist" && memberPos(a.memberId) === leaver.position)
    .map((a) => ({ a, m: s.members.find((m) => m.id === a.memberId)! }))
    .sort((x, y) =>
      Number(y.m.class === "regular") - Number(x.m.class === "regular") ||
      (x.a.waitlistRank ?? Infinity) - (y.a.waitlistRank ?? Infinity) ||
      Date.parse(x.a.waitlistedAt!) - Date.parse(y.a.waitlistedAt!),
    )[0];
  if (!next) return;
  Object.assign(next.a, { status: "in", source: "auto", respondedAt: iso(), waitlistedAt: null, waitlistRank: null });
  const ch: Channel = next.m.phone && next.m.smsOptIn ? "sms" : next.m.userId ? "push" : "email";
  enqueue({ member: next.m, channel: ch, category: "waitlist", template: "promoted",
    body: ch === "sms" ? smsTpl.promoted(ctx) : pushTpl.promoted(ctx), dedupeKey: `promoted:${ev.id}:${next.m.id}` });
}

// ───────────── Envois (outbox) ─────────────
function enqueue(i: { member: Member; channel: Channel; category: OutboxItem["category"]; template: string; body: string; subject?: string; dedupeKey: string }) {
  const s = db();
  if (s.outbox.some((o) => o.dedupeKey === i.dedupeKey)) return false; // ≈ unique (dedupe_key)
  const to = i.channel === "sms" ? i.member.phone : i.channel === "email" ? i.member.email : i.member.displayName;
  s.outbox.push({
    id: uid(), memberId: i.member.id, channel: i.channel, category: i.category, template: i.template, to,
    subject: i.subject ?? null, body: i.body, dedupeKey: i.dedupeKey,
    // Démo : « envoyé » tout de suite. En vrai, le tick passe la file à Twilio / Resend / Web Push.
    status: to ? "sent" : "skipped", createdAt: iso(), sentAt: to ? iso() : null,
  });
  return true;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function newSmsCode(phone: string): string {
  const s = db();
  const taken = new Set(
    s.tokens.filter((t) => t.channel === "sms" && !expired(t) && s.members.find((m) => m.id === t.memberId)?.phone === phone).map((t) => t.smsCode),
  );
  let c: string;
  do c = String(randomInt(100, 1000));
  while (taken.has(c));
  return c;
}
const expired = (t: { expiresAt: string }) => Date.parse(t.expiresAt) < now().getTime();

/** Envoie le rappel IN/OUT aux réguliers sans réponse. Retourne le nombre de joueurs joints. */
export async function sendReminders(actor: Actor, eventId: string, opts: { manual?: boolean } = {}): Promise<number> {
  const ev = requireEvent(eventId);
  const team = requireTeam(ev.teamId);
  requireManager(actor, team.id);
  if (ev.status !== "scheduled") throw new DomainError("Ce match n'est plus à l'horaire.", "closed");
  const s = db();
  const ctx = evCtx(ev, team);
  const answered = new Set(s.attendance.filter((a) => a.eventId === ev.id && a.status !== "no_reply").map((a) => a.memberId));
  const targets = activeMembers(team.id).filter((m) => expectsAnswer(m) && !answered.has(m.id));
  const round = opts.manual ? `manual-${Date.now()}` : "auto";
  const expiresAt = iso(new Date(Date.parse(ev.startsAt) + 2 * 3600_000));
  let reached = 0;
  for (const m of targets) {
    let sent = false;
    if (m.phone && m.smsOptIn) {
      let tok = s.tokens.find((t) => t.eventId === ev.id && t.memberId === m.id && t.channel === "sms" && !expired(t));
      if (!tok) {
        tok = { id: uid(), eventId: ev.id, memberId: m.id, channel: "sms", tokenHash: sha(hexToken()), smsCode: newSmsCode(m.phone), expiresAt, usedAt: null, createdAt: iso() };
        s.tokens.push(tok);
      }
      sent = enqueue({ member: m, channel: "sms", category: "reminder", template: "reminder", body: smsTpl.reminder(ctx), dedupeKey: `reminder:${ev.id}:${m.id}:sms:${round}` }) || sent;
    }
    if (m.email) {
      const raw = hexToken(24);
      s.tokens.push({ id: uid(), eventId: ev.id, memberId: m.id, channel: "email", tokenHash: sha(raw), smsCode: null, expiresAt, usedAt: null, createdAt: iso() });
      sent = enqueue({ member: m, channel: "email", category: "reminder", template: "reminder", subject: emailTpl.reminderSubject(ctx),
        body: emailTpl.reminderBody(ctx, `${APP_URL}/r/${raw}`, m.displayName), dedupeKey: `reminder:${ev.id}:${m.id}:email:${round}` }) || sent;
    }
    if (m.userId) {
      sent = enqueue({ member: m, channel: "push", category: "reminder", template: "reminder", body: smsTpl.reminder(ctx).replace(" Réponds Y ou N.", ""),
        dedupeKey: `reminder:${ev.id}:${m.id}:push:${round}` }) || sent;
    }
    if (sent) reached++;
  }
  if (!opts.manual) ev.reminderSentAt = iso();
  return reached;
}

/** La tâche planifiée (pg_cron → /api/cron/tick). Idempotente. */
export async function runTick(at: Date = now()): Promise<{ reminders: number }> {
  let reminders = 0;
  for (const ev of db().events) {
    if (ev.status !== "scheduled" || ev.reminderSentAt) continue;
    const team = requireTeam(ev.teamId);
    const start = Date.parse(ev.startsAt);
    if (start <= at.getTime()) continue;
    if (start - team.reminderHoursBefore * 3600_000 <= at.getTime()) {
      reminders += await sendReminders("system", ev.id);
    }
  }
  return { reminders };
}

// ───────────── Réponses entrantes ─────────────
/** Texto entrant (webhook Twilio). Retourne la réponse à texter. */
export async function handleInboundSms(fromRaw: string, body: string, providerSid?: string): Promise<string> {
  const s = db();
  const from = normalizePhone(fromRaw) ?? fromRaw;
  // Twilio peut renvoyer le même webhook : même MessageSid → même réponse, rien de rejoué (≈ inbound_sms.provider_sid unique)
  const seen = providerSid ? s.inbound.find((i) => i.providerSid === providerSid) : undefined;
  if (seen) return seen.result;
  const log = (result: string) => { s.inbound.push({ id: uid(), providerSid: providerSid ?? null, from, body, result, createdAt: iso() }); return result; };
  const intent = parseSmsReply(body);
  const members = s.members.filter((m) => m.phone === from && !m.leftAt);

  if (intent.kind === "stop") {
    for (const m of members) m.smsOptIn = false;
    return log(smsTpl.stopped());
  }
  if (intent.kind === "help") return log(smsTpl.help());
  if (intent.kind === "unknown") return log(smsTpl.notUnderstood());

  const pending = s.tokens
    .filter((t) => t.channel === "sms" && !expired(t) && members.some((m) => m.id === t.memberId))
    .filter((t) => requireEvent(t.eventId).status === "scheduled")
    .sort((a, b) => Date.parse(requireEvent(a.eventId).startsAt) - Date.parse(requireEvent(b.eventId).startsAt));
  if (!pending.length) return log(smsTpl.nothingPending());

  let tok = pending[0]!;
  if (intent.code) {
    const match = pending.find((t) => t.smsCode === intent.code);
    if (!match) return log(smsTpl.unknownCode());
    tok = match;
  } else if (pending.length > 1) {
    const labels = disambiguationLabels(pending.map((t) => {
      const ev = requireEvent(t.eventId), team = requireTeam(ev.teamId);
      return { teamName: team.name, day: fmtShortDate(ev.startsAt, team.timezone), time: fmtTime(ev.startsAt, team.timezone) };
    }));
    return log(smsTpl.pickOne(pending.map((t, i) => ({ code: t.smsCode!, label: labels[i]! }))));
  }
  const ev = requireEvent(tok.eventId);
  const final = await respond("system", ev.id, tok.memberId, intent.status, { source: "sms" });
  tok.usedAt = iso();
  const ctx = evCtx(ev, requireTeam(ev.teamId));
  return log(final === "in" ? smsTpl.confirmIn(ctx) : final === "waitlist" ? smsTpl.confirmWaitlist() : smsTpl.confirmOut());
}

/** Lien du courriel : retrouve le contexte sans rien changer (GET). */
export async function getTokenContext(raw: string) {
  const s = db();
  const tok = s.tokens.find((t) => t.channel === "email" && t.tokenHash === sha(raw));
  if (!tok) return null;
  const ev = requireEvent(tok.eventId);
  const team = requireTeam(ev.teamId);
  const member = s.members.find((m) => m.id === tok.memberId)!;
  const status = s.attendance.find((a) => a.eventId === ev.id && a.memberId === member.id)?.status ?? "no_reply";
  return { event: ev, team, member, status, expired: expired(tok) };
}

/** Lien du courriel : enregistre la réponse (POST seulement). */
export async function respondWithToken(raw: string, status: "in" | "out"): Promise<AttendanceStatus> {
  const ctx = await getTokenContext(raw);
  if (!ctx) throw new DomainError("Ce lien n'est pas valide.", "not_found");
  if (ctx.expired) throw new DomainError("Ce lien a expiré. Ouvre l'appli pour répondre.", "closed");
  const final = await respond("system", ctx.event.id, ctx.member.id, status, { source: "email" });
  const tok = db().tokens.find((t) => t.tokenHash === sha(raw))!;
  tok.usedAt = iso();
  return final;
}

// ───────────── Outils de développement ─────────────
export async function devListOutbox(): Promise<OutboxItem[]> {
  return [...db().outbox].reverse();
}
export async function devListInbound() {
  return [...db().inbound].reverse();
}
export async function devListPhones() {
  return db().members.filter((m) => m.phone && !m.leftAt).map((m) => ({ phone: m.phone!, name: m.displayName, teamId: m.teamId }));
}
/** Démo : toutes les lignes de présence. */
export async function devAttendanceRows(): Promise<Attendance[]> {
  return db().attendance;
}

// ───────────── Avis et abonnements (démo : en mémoire) ─────────────
const g2 = globalThis as unknown as { __bbPrefs?: Set<string>; __bbPush?: Map<string, { userId: string; endpoint: string }> };
export async function unsubscribeEmail(memberId: string, category: string): Promise<{ teamName: string } | null> {
  const m = db().members.find((x) => x.id === memberId);
  if (!m) return null;
  (g2.__bbPrefs ??= new Set()).add(`${memberId}:${category}:email`);
  return { teamName: requireTeam(m.teamId).name };
}
export async function savePushSubscription(userId: string, sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string }): Promise<void> {
  (g2.__bbPush ??= new Map()).set(sub.endpoint, { userId, endpoint: sub.endpoint });
}
export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  const s = g2.__bbPush?.get(endpoint);
  if (s?.userId === userId) g2.__bbPush!.delete(endpoint);
}
export async function recordSmsStatus(_providerMessageId: string, _status: string, _errorCode?: string): Promise<void> {}

// ───────────── Rejoindre par code (S03) ─────────────
export async function getInvitePreview(code: string): Promise<{ teamId: string; name: string; sport: string; players: number } | null> {
  const t = db().teams.find((x) => x.inviteCode === code.trim().toUpperCase());
  return t ? { teamId: t.id, name: t.name, sport: t.sport, players: activeMembers(t.id).length } : null;
}

export async function joinTeam(userId: string, code: string): Promise<string> {
  const t = db().teams.find((x) => x.inviteCode === code.trim().toUpperCase());
  if (!t) throw new DomainError("Ce code ne correspond à aucune équipe.", "not_found");
  if (myMember(userId, t.id)) return t.id;
  const u = (await getUser(userId))!;
  const existing = activeMembers(t.id).find((m) => !m.userId && m.email === u.email);
  if (existing) existing.userId = userId;
  else db().members.push({ id: uid(), teamId: t.id, userId, displayName: u.displayName, email: u.email, phone: u.phone, class: "regular", role: "member",
    position: "skater", jerseyNumber: null, smsOptIn: !!u.phone, beerOptOut: false, calendarToken: hexToken(), leftAt: null, createdAt: iso() });
  return t.id;
}
