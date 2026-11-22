"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addMember, removeMember, updateMember } from "@/lib/data";
import { normalizePhone } from "@/lib/sms";
import { toFormError, type FormState } from "@/lib/guard";

const MemberForm = z.object({
  displayName: z.string().trim().min(2, "Le nom, au moins 2 lettres.").max(60, "60 caractères maximum."),
  email: z.union([z.literal(""), z.string().trim().email("Ce courriel n'a pas l'air valide.")]),
  phone: z.string().trim().refine((p) => p === "" || normalizePhone(p) !== null, "Numéro invalide. Exemple : 514-555-1234."),
  class: z.enum(["regular", "spare", "spectator", "staff", "vacation", "injured", "suspended"]),
  role: z.enum(["manager", "assistant", "member"]),
  position: z.enum(["skater", "goalie"]),
  jerseyNumber: z.union([z.literal(""), z.coerce.number().int().min(0, "Entre 0 et 99.").max(99, "Entre 0 et 99.")]),
  smsOptIn: z.boolean(),
});
const keys = ["displayName", "email", "phone", "class", "role", "position", "jerseyNumber"] as const;

export async function saveMemberAction(teamId: string, memberId: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")])) as Record<string, string>;
  values.smsOptIn = fd.get("smsOptIn") ? "on" : "";
  const p = MemberForm.safeParse({ ...values, smsOptIn: !!fd.get("smsOptIn") });
  if (!p.success) return { values, fields: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const d = p.data;
  if (d.smsOptIn && !d.phone) return { values, fields: { phone: "Il faut un numéro pour envoyer des textos." } };
  if (!d.email && !d.phone) return { values, fields: { phone: "Ajoute un cellulaire ou un courriel pour qu'il reçoive les rappels." } };
  const input = { ...d, email: d.email || null, phone: d.phone || null, jerseyNumber: d.jerseyNumber === "" ? null : d.jerseyNumber };
  try {
    if (memberId) await updateMember(user.id, teamId, memberId, input);
    else await addMember(user.id, teamId, input);
  } catch (e) {
    return toFormError(e, values);
  }
  revalidatePath(`/t/${teamId}`, "layout");
  const again = fd.get("again");
  redirect(again ? `/t/${teamId}/alignement/nouveau?ajoute=${encodeURIComponent(d.displayName)}` : `/t/${teamId}/alignement`);
}

export async function removeMemberAction(teamId: string, memberId: string) {
  const user = await requireUser();
  await removeMember(user.id, teamId, memberId);
  revalidatePath(`/t/${teamId}`, "layout");
  redirect(`/t/${teamId}/alignement`);
}
