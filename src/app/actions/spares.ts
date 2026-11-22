"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { acceptFromWaitlist, inviteSpares, reorderWaitlist, DomainError } from "@/lib/data";
import type { FormState } from "@/lib/guard";

const Invite = z.object({
  members: z.array(z.string().uuid()).min(1, "Choisis au moins un spare."),
  channels: z.array(z.enum(["push", "sms", "email"])).min(1, "Choisis au moins un canal."),
  note: z.string().trim().max(200, "200 caractères maximum.").optional(),
});

export async function inviteSparesAction(teamId: string, eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = Invite.safeParse({ members: fd.getAll("members"), channels: fd.getAll("channels"), note: String(fd.get("note") ?? "") });
  if (!p.success) return { fields: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])), values: { note: String(fd.get("note") ?? "") } };
  try {
    const n = await inviteSpares(user.id, eventId, p.data.members, p.data.channels, p.data.note);
    revalidatePath(`/t/${teamId}`, "layout");
    return { ok: true, values: { sent: String(n) } };
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "L'invitation n'est pas partie. Réessaie." };
  }
}

export async function moveInWaitlistAction(teamId: string, eventId: string, order: string[]): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await reorderWaitlist(user.id, eventId, order);
    revalidatePath(`/t/${teamId}`, "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof DomainError ? e.message : "L'ordre n'a pas été enregistré." };
  }
}

export async function acceptFromWaitlistAction(teamId: string, eventId: string, memberId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await acceptFromWaitlist(user.id, eventId, memberId);
    revalidatePath(`/t/${teamId}`, "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof DomainError ? e.message : "Ça n'a pas marché." };
  }
}
