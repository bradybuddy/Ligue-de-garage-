// Point de bascule entre les deux couches de données (mêmes fonctions, mêmes types) :
//   DATABASE_URL défini → Postgres/Supabase avec RLS (pg.ts)
//   sinon               → démo en mémoire (fake.ts), jamais en production
import "server-only";
import * as fake from "./fake";
import * as pg from "./pg";

type Api = Omit<typeof fake, "devAttendanceRows">;
const pgImpl: Api = pg; // le compilateur vérifie que pg.ts a exactement les mêmes signatures

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1" && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("DATABASE_URL manquant : la démo en mémoire ne doit pas tourner en production.");
}
export const backend: "postgres" | "demo" = process.env.DATABASE_URL ? "postgres" : "demo";
const impl: Api = backend === "postgres" ? pgImpl : fake;

export const {
  signIn, signUp, getUser, listMyTeams, getTeamForUser, createTeam, listMembers, getMember, addMember, updateMember, removeMember,
  listEvents, getEventDetail, createEvent, updateEvent, cancelEvent, deleteEvent, respond, sendReminders, runTick,
  handleInboundSms, getTokenContext, respondWithToken, devListOutbox, devListInbound, devListPhones,
  unsubscribeEmail, savePushSubscription, deletePushSubscription, recordSmsStatus, getInvitePreview, joinTeam,
} = impl;
export type { Actor, EventInput, EventSummary, MemberInput } from "./fake";
export * from "./types";
