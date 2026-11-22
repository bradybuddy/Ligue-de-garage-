"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { deleteMessage, postMessage, sendBroadcast, toggleReaction, DomainError } from "@/lib/data";
import type { FormState } from "@/lib/guard";

type R = { ok: boolean; error?: string };
const fail = (e: unknown, msg: string): R => ({ ok: false, error: e instanceof DomainError ? e.message : msg });

export async function postMessageAction(teamId: string, body: string, gifUrl?: string): Promise<R> {
  const user = await requireUser();
  try { await postMessage(user.id, teamId, { body, gifUrl }); revalidatePath(`/t/${teamId}/chambre`); return { ok: true }; }
  catch (e) { return fail(e, "Ton message n'est pas parti."); }
}

export async function reactAction(teamId: string, messageId: string, emoji: string): Promise<R> {
  const user = await requireUser();
  try { await toggleReaction(user.id, teamId, messageId, emoji); revalidatePath(`/t/${teamId}/chambre`); return { ok: true }; }
  catch (e) { return fail(e, "La réaction n'a pas été enregistrée."); }
}

export async function deleteMessageAction(teamId: string, messageId: string): Promise<R> {
  const user = await requireUser();
  try { await deleteMessage(user.id, messageId); revalidatePath(`/t/${teamId}/chambre`); return { ok: true }; }
  catch (e) { return fail(e, "Le message n'a pas été supprimé."); }
}

const Broadcast = z.object({
  subject: z.string().trim().max(120, "120 caractères maximum.").optional(),
  body: z.string().trim().min(1, "Écris ton message.").max(1000, "1000 caractères maximum."),
  channels: z.array(z.enum(["push", "sms", "email"])).min(1, "Choisis au moins un canal."),
  audience: z.array(z.enum(["regular", "spare", "staff", "spectator"])).min(1, "Choisis à qui l'envoyer."),
});

export async function broadcastAction(teamId: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = { subject: String(fd.get("subject") ?? ""), body: String(fd.get("body") ?? "") };
  const p = Broadcast.safeParse({ ...values, channels: fd.getAll("channels"), audience: fd.getAll("audience") });
  if (!p.success) return { values, fields: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])) };
  try {
    const n = await sendBroadcast(user.id, teamId, p.data);
    revalidatePath(`/t/${teamId}/diffusion`);
    return { ok: true, values: { sent: String(n) } };
  } catch (e) {
    return { ...fail(e, "Le message n'est pas parti. Réessaie."), values } as FormState;
  }
}
