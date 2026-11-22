// Types du domaine. Ils suivent replica/schema.sql (noms en camelCase).
// La couche réelle (Supabase) et la couche de démo (mémoire) exposent les mêmes fonctions.

export type PlayerClass = "regular" | "spare" | "spectator" | "staff" | "vacation" | "injured" | "suspended";
export type MemberRole = "manager" | "assistant" | "member";
export type Position = "skater" | "goalie";
export type AttendanceStatus = "in" | "out" | "waitlist" | "no_reply";
export type ResponseSource = "app" | "email" | "sms" | "push" | "manager" | "auto";
export type Channel = "push" | "sms" | "email";
export type WaitlistMode = "off" | "top" | "first_accept";
export type EventType = "game" | "practice" | "other";
export type EventStatus = "scheduled" | "cancelled" | "final";
export type Sport = "hockey" | "dek" | "ringuette" | "soccer" | "balle" | "autre";

export interface User {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  locale: "fr-CA" | "en-CA";
}

export interface Team {
  id: string;
  createdBy: string;
  name: string;
  sport: Sport;
  inviteCode: string;
  timezone: string;
  maxPlayers: number;
  maxGoalies: number;
  reminderHoursBefore: number;
  autoSparesEnabled: boolean;
  autoSparesHoursBefore: number;
  waitlistMode: WaitlistMode;
  beerEnabled: boolean;
  autoSparesChannels: Channel[];
  leagueId?: string | null;
  divisionId?: string | null;
  secondReminderHoursBefore?: number | null;
  beerTiebreak?: "alpha" | "jersey";
  createdAt: string;
}

export interface Member {
  id: string;
  teamId: string;
  userId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  class: PlayerClass;
  role: MemberRole;
  position: Position;
  jerseyNumber: number | null;
  smsOptIn: boolean;
  beerOptOut: boolean;
  calendarToken: string;
  leftAt: string | null;
  createdAt: string;
}

export interface TeamEvent {
  id: string;
  teamId: string;
  type: EventType;
  title: string | null;
  startsAt: string; // ISO UTC
  endsAt: string | null;
  venue: string | null;
  opponent: string | null;
  homeRoom: string | null;
  awayRoom: string | null;
  maxPlayers: number | null;
  maxGoalies: number | null;
  status: EventStatus;
  scoreUs: number | null;
  scoreThem: number | null;
  reminderSentAt: string | null;
  sparesInvitedAt?: string | null;
  leagueGameId?: string | null;
  createdAt: string;
}

export interface Attendance {
  id: string;
  eventId: string;
  memberId: string;
  status: AttendanceStatus;
  note: string | null;
  source: ResponseSource | null;
  respondedAt: string | null;
  waitlistedAt: string | null;
  waitlistRank: number | null;
}

export interface ResponseToken {
  id: string;
  eventId: string;
  memberId: string;
  channel: "email" | "sms";
  tokenHash: string;
  smsCode: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface OutboxItem {
  id: string;
  memberId: string | null;
  channel: Channel;
  category: "reminder" | "spare_invite" | "waitlist" | "beer" | "chat" | "broadcast" | "manager_alert" | "fees";
  template: string;
  to: string | null; // numéro, courriel ou nom (push)
  subject: string | null;
  body: string;
  dedupeKey: string;
  status: "pending" | "sent" | "failed" | "skipped";
  createdAt: string;
  sentAt: string | null;
}

export interface InboundSms {
  id: string;
  providerSid: string | null;
  from: string;
  body: string;
  result: string;
  createdAt: string;
}

/** Erreur métier : message en français, montrable à l'utilisateur. */
export class DomainError extends Error {
  constructor(
    message: string,
    public code: "forbidden" | "not_found" | "invalid" | "full" | "closed" | "conflict" = "invalid",
  ) {
    super(message);
  }
}

// Vues composées pour les écrans
export interface RosterEntry extends Member {
  status: AttendanceStatus;
  note: string | null;
  respondedAt: string | null;
  waitlistedAt: string | null;
  waitlistRank?: number | null;
  source: ResponseSource | null;
}

export interface EventDetail {
  event: TeamEvent;
  team: Team;
  cap: { players: number; goalies: number };
  counts: { in: number; goaliesIn: number; out: number; waitlist: number; noReply: number };
  groups: {
    in: RosterEntry[];
    waitlist: RosterEntry[];
    out: RosterEntry[];
    noReply: RosterEntry[];
    away: RosterEntry[]; // vacances, blessé, suspendu
    invited: RosterEntry[]; // spares invités qui n'ont pas encore répondu
  };
  me: RosterEntry | null;
  canManage: boolean;
  beer: { memberId: string; name: string } | null;
}

// ───────────── Entrées et vues des fonctions de données ─────────────
export type Actor = string | "system"; // userId ou le serveur (clé de service)

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

export interface SpareRow {
  member: Member;
  status: AttendanceStatus;
  invitedAt: string | null;
  invitedChannels: Channel[];
}
export interface SparesPanel {
  event: TeamEvent;
  team: Team;
  open: { players: number; goalies: number };
  spares: SpareRow[];
}

export interface BeerOverview {
  team: Team;
  enabled: boolean;
  canManage: boolean;
  me: { memberId: string; optOut: boolean };
  upcoming: { event: TeamEvent; memberId: string | null; memberName: string | null; mode: "auto" | "manual" | null; inPlayers: { id: string; name: string }[] }[];
  standings: { memberId: string; name: string; count: number; optOut: boolean }[];
}

export interface ChatMessage {
  id: string;
  authorId: string | null;
  authorName: string;
  mine: boolean;
  body: string | null;
  gifUrl: string | null;
  createdAt: string;
  deleted: boolean;
  reactions: { emoji: string; names: string[]; mine: boolean }[];
}
export interface BroadcastSummary { id: string; subject: string | null; body: string; channels: Channel[]; audience: PlayerClass[]; sentAt: string | null; authorName: string | null; recipients: number }

export interface TeamSettingsInput {
  name: string;
  maxPlayers: number;
  maxGoalies: number;
  reminderHoursBefore: number;
  autoSparesEnabled: boolean;
  autoSparesHoursBefore: number;
  autoSparesChannels: Channel[];
  waitlistMode: WaitlistMode;
  beerEnabled: boolean;
  beerTiebreak: "alpha" | "jersey";
}
export type PrefCategory = "reminder" | "spare_invite" | "waitlist" | "beer" | "chat" | "broadcast" | "manager_alert";
export interface MemberPrefs { teamId: string; teamName: string; memberId: string; isManager: boolean; isSpare: boolean; off: string[] /* "categorie:canal" désactivés */ }

// ───────────── Ligue ─────────────
export interface League { id: string; ownerId: string | null; name: string; slug: string; timezone: string }
export interface Division { id: string; leagueId: string; name: string; sortOrder: number }
export interface LeagueTeam { id: string; name: string; divisionId: string | null; inviteCode: string; members: number; managerName: string | null }
export interface LeagueOverview { league: League; isAdmin: boolean; divisions: Division[]; teams: LeagueTeam[] }
export interface LeagueGame {
  id: string; leagueId: string; divisionId: string | null; homeTeamId: string; awayTeamId: string; homeName: string; awayName: string;
  startsAt: string; venue: string | null; status: EventStatus; homeScore: number | null; awayScore: number | null; overtime: boolean;
}
export interface LeagueGameInput { date: string; time: string; homeTeamId: string; awayTeamId: string; venue?: string | null }
export interface StandingRow { divisionId: string | null; teamId: string; teamName: string; gp: number; w: number; l: number; t: number; otl: number; pts: number; gf: number; ga: number }
