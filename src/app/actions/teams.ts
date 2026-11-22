"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createTeam } from "@/lib/data";
import { toFormError, type FormState } from "@/lib/guard";

const NewTeam = z.object({
  name: z.string().trim().min(2, "Le nom de l'équipe, au moins 2 lettres.").max(60, "60 caractères maximum."),
  sport: z.enum(["hockey", "dek", "ringuette", "soccer", "balle", "autre"]),
  maxPlayers: z.coerce.number({ invalid_type_error: "Un nombre, svp." }).int().min(1, "Au moins 1.").max(60, "60 maximum."),
});

export async function createTeamAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = Object.fromEntries(["name", "sport", "maxPlayers"].map((k) => [k, String(fd.get(k) ?? "")]));
  const p = NewTeam.safeParse(values);
  if (!p.success) return { values, fields: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])) };
  let id: string;
  try {
    id = (await createTeam(user.id, p.data)).id;
  } catch (e) {
    return toFormError(e, values);
  }
  redirect(`/t/${id}/alignement?bienvenue=1`);
}
