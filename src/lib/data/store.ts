// Magasin en mémoire pour la démo et les tests (remplacé par Postgres/Supabase plus tard).
// Gardé sur globalThis pour survivre au rechargement à chaud de `next dev`.
import { randomBytes, randomUUID } from "node:crypto";
import { zonedToUtc, utcToZonedParts, DEFAULT_TZ } from "../time";
import type { Attendance, InboundSms, Member, OutboxItem, ResponseToken, Team, TeamEvent, User } from "./types";

export interface Store {
  users: User[];
  passwords: Map<string, string>; // démo seulement — Supabase Auth en vrai
  teams: Team[];
  members: Member[];
  events: TeamEvent[];
  attendance: Attendance[];
  tokens: ResponseToken[];
  outbox: OutboxItem[];
  inbound: InboundSms[];
}

export const now = () => new Date();
export const iso = (d: Date = now()) => d.toISOString();
export const uid = () => randomUUID();
export const hexToken = (n = 18) => randomBytes(n).toString("hex");

export function genInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = randomBytes(6);
  return Array.from(b, (x) => alphabet[x % alphabet.length]).join("");
}

export const DEMO_PASSWORD = "buddy123";

function seed(): Store {
  const s: Store = { users: [], passwords: new Map(), teams: [], members: [], events: [], attendance: [], tokens: [], outbox: [], inbound: [] };
  const t0 = iso();

  const user = (displayName: string, email: string, phone: string | null): User => {
    const u: User = { id: uid(), email, displayName, phone, locale: "fr-CA" };
    s.users.push(u);
    s.passwords.set(email, DEMO_PASSWORD);
    return u;
  };
  const marc = user("Marc Lapointe", "marc@exemple.ca", "+15145550100");
  const sophie = user("Sophie Gagnon", "sophie@exemple.ca", "+15145550101");
  const karim = user("Karim Haddad", "karim@exemple.ca", "+15145550102");

  const team: Team = {
    id: uid(), createdBy: marc.id, name: "Les Buddies du jeudi", sport: "hockey", inviteCode: "BUDDY4",
    timezone: DEFAULT_TZ, maxPlayers: 16, maxGoalies: 2, reminderHoursBefore: 48, autoSparesEnabled: true,
    autoSparesHoursBefore: 36, waitlistMode: "top", beerEnabled: true, createdAt: t0,
  };
  s.teams.push(team);

  const m = (
    displayName: string, opts: Partial<Member> & { phone?: string | null } = {},
  ): Member => {
    const mem: Member = {
      id: uid(), teamId: team.id, userId: null, displayName, email: null, phone: null, class: "regular", role: "member",
      position: "skater", jerseyNumber: null, smsOptIn: true, beerOptOut: false, calendarToken: hexToken(),
      leftAt: null, createdAt: t0, ...opts,
    };
    s.members.push(mem);
    return mem;
  };

  const people = [
    m("Marc Lapointe", { userId: marc.id, email: marc.email, phone: marc.phone, role: "manager", jerseyNumber: 9 }),
    m("Sophie Gagnon", { userId: sophie.id, email: sophie.email, phone: sophie.phone, position: "goalie", jerseyNumber: 31 }),
    m("Karim Haddad", { userId: karim.id, email: karim.email, phone: karim.phone, role: "assistant", jerseyNumber: 22 }),
    m("Max Tremblay", { phone: "+15145550103", jerseyNumber: 4 }),
    m("Jean-François Bélanger-Archambault", { phone: "+15145550104", email: "jf@exemple.ca", jerseyNumber: 17 }),
    m("Patrick Roy-Côté", { phone: "+15145550105", jerseyNumber: 33, position: "goalie" }),
    m("Étienne Bouchard", { phone: "+15145550106", jerseyNumber: 11 }),
    m("Simon Lavoie", { phone: "+15145550107", jerseyNumber: 7 }),
    m("Mathieu Pelletier", { phone: "+15145550108", jerseyNumber: 19 }),
    m("Alexandre Morin", { phone: "+15145550109", jerseyNumber: 27 }),
    m("Nicolas Fortin", { email: "nico@exemple.ca", jerseyNumber: 44, smsOptIn: false }),
    m("David Ouellet", { phone: "+15145550111", jerseyNumber: 8 }),
    m("Vincent Gauthier", { phone: "+15145550112", jerseyNumber: 91 }),
    m("Guillaume Bergeron", { phone: "+15145550113", jerseyNumber: 13 }),
    m("Louis-Philippe Caron", { phone: "+15145550114", jerseyNumber: 2 }),
    m("Léa Roy", { phone: "+15145550120", class: "spare" }),
    m("Olivier Dubé", { phone: "+15145550121", class: "spare" }),
    m("Félix Girard", { phone: "+15145550122", class: "spare", position: "goalie" }),
    m("Charles Poirier", { phone: "+15145550130", class: "injured", jerseyNumber: 15 }),
    m("Antoine Leblanc", { phone: "+15145550131", class: "vacation", jerseyNumber: 21 }),
  ];

  // Horaire : jeudis 21 h 15 relatifs à aujourd'hui
  const today = utcToZonedParts(now(), team.timezone).date;
  const base = new Date(`${today}T12:00:00Z`);
  const daysToThu = (4 - base.getUTCDay() + 7) % 7 || 7;
  const thursday = (offsetWeeks: number) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + daysToThu + offsetWeeks * 7);
    return d.toISOString().slice(0, 10);
  };
  const ev = (date: string, opponent: string, venue: string, extra: Partial<TeamEvent> = {}): TeamEvent => {
    const e: TeamEvent = {
      id: uid(), teamId: team.id, type: "game", title: null, startsAt: iso(zonedToUtc(date, "21:15", team.timezone)),
      endsAt: null, venue, opponent, homeRoom: null, awayRoom: null, maxPlayers: null, maxGoalies: null,
      status: "scheduled", scoreUs: null, scoreThem: null, reminderSentAt: null, createdAt: t0, ...extra,
    };
    s.events.push(e);
    return e;
  };
  ev(thursday(-1), "Les Pingouins", "Aréna Saint-Michel", { status: "final", scoreUs: 6, scoreThem: 4, reminderSentAt: t0 });
  const next = ev(thursday(0), "Les Castors", "Aréna Michel-Normandin, glace 2", { homeRoom: "4", awayRoom: "5" });
  ev(thursday(1), "Les Zambonis", "Centre Étienne-Desmarteau");
  ev(thursday(2), "Les Moustaches", "Aréna Maurice-Richard");

  // Quelques réponses déjà entrées pour le prochain match
  const answered: [number, "in" | "out", string | null][] = [
    [0, "in", null], [1, "in", null], [2, "in", "J'arrive à 21 h pile"], [3, "in", null], [6, "in", null],
    [7, "out", "Souper de famille"], [9, "in", null], [11, "in", null],
  ];
  for (const [i, status, note] of answered) {
    s.attendance.push({
      id: uid(), eventId: next.id, memberId: people[i]!.id, status, note, source: "app",
      respondedAt: t0, waitlistedAt: null, waitlistRank: null,
    });
  }
  return s;
}

const g = globalThis as unknown as { __bbStore?: Store };
export function db(): Store {
  if (!g.__bbStore) g.__bbStore = seed();
  return g.__bbStore;
}
/** Tests : repartir des données de démo. */
export function resetStore() {
  g.__bbStore = seed();
}
