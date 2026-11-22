"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { cancelEvent, createEvent, deleteEvent, respond, sendReminders, updateEvent, DomainError } from "@/lib/data";
import { toFormError, type FormState } from "@/lib/guard";

const EventForm = z.object({
  type: z.enum(["game", "practice", "other"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choisis une date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choisis une heure."),
  venue: z.string().trim().max(120, "120 caractères maximum.").optional(),
  opponent: z.string().trim().max(60, "60 caractères maximum.").optional(),
  title: z.string().trim().max(60).optional(),
  maxPlayers: z.union([z.literal(""), z.coerce.number().int().min(1, "Au moins 1.").max(60, "60 maximum.")]).optional(),
  homeRoom: z.string().trim().max(10).optional(),
  awayRoom: z.string().trim().max(10).optional(),
});
const keys = ["type", "date", "time", "venue", "opponent", "title", "maxPlayers", "homeRoom", "awayRoom"] as const;

function parse(fd: FormData) {
  const values = Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")])) as Record<string, string>;
  const p = EventForm.safeParse(values);
  if (!p.success) return { ok: false as const, values, fields: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const d = p.data;
  return { ok: true as const, values, input: { ...d, maxPlayers: d.maxPlayers === "" || d.maxPlayers === undefined ? null : d.maxPlayers } };
}

export async function saveEventAction(teamId: string, eventId: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const r = parse(fd);
  if (!r.ok) return { values: r.values, fields: r.fields };
  let id: string;
  try {
    id = eventId ? (await updateEvent(user.id, eventId, r.input)).id : (await createEvent(user.id, teamId, r.input)).id;
  } catch (e) {
    return toFormError(e, r.values);
  }
  revalidatePath(`/t/${teamId}`, "layout");
  redirect(`/t/${teamId}/matchs/${id}${eventId ? "" : "?nouveau=1"}`);
}

export async function cancelEventAction(teamId: string, eventId: string) {
  const user = await requireUser();
  await cancelEvent(user.id, eventId);
  revalidatePath(`/t/${teamId}`, "layout");
  redirect(`/t/${teamId}/matchs/${eventId}`);
}

export async function deleteEventAction(teamId: string, eventId: string) {
  const user = await requireUser();
  await deleteEvent(user.id, eventId);
  revalidatePath(`/t/${teamId}`, "layout");
  redirect(`/t/${teamId}/horaire`);
}

export type RespondResult = { ok: true; status: string } | { ok: false; error: string };

export async function respondAction(teamId: string, eventId: string, memberId: string, status: "in" | "out", note?: string): Promise<RespondResult> {
  const user = await requireUser();
  try {
    const final = await respond(user.id, eventId, memberId, status, { note, source: "app" });
    revalidatePath(`/t/${teamId}`, "layout");
    return { ok: true, status: final };
  } catch (e) {
    return { ok: false, error: e instanceof DomainError ? e.message : "Ta réponse n'a pas été enregistrée. Réessaie." };
  }
}

export async function setNoteAction(teamId: string, eventId: string, memberId: string, status: "in" | "out", note: string): Promise<RespondResult> {
  return respondAction(teamId, eventId, memberId, status, note);
}

export async function remindAction(teamId: string, eventId: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  try {
    const n = await sendReminders(user.id, eventId, { manual: true });
    revalidatePath(`/t/${teamId}`, "layout");
    return { ok: true, message: n ? `Relance envoyée à ${n} joueur${n > 1 ? "s" : ""}.` : "Tout le monde a déjà répondu." };
  } catch (e) {
    return { ok: false, message: e instanceof DomainError ? e.message : "La relance n'est pas partie. Réessaie." };
  }
}
