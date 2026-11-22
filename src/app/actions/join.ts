"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getInvitePreview, joinTeam } from "@/lib/data";
import { toFormError, type FormState } from "@/lib/guard";

export async function joinTeamAction(code: string): Promise<FormState> {
  const user = await requireUser(`/j/${code}`);
  let teamId: string;
  try {
    teamId = await joinTeam(user.id, code);
  } catch (e) {
    return toFormError(e);
  }
  redirect(`/t/${teamId}?bienvenue=1`);
}

export async function lookupCodeAction(_: FormState, fd: FormData): Promise<FormState> {
  const code = String(fd.get("code") ?? "").replace(/[\s-]/g, "").toUpperCase();
  if (!(await getInvitePreview(code))) return { fields: { code: "Ce code ne correspond à aucune équipe. Vérifie avec ton gérant." }, values: { code } };
  redirect(`/j/${code}`);
}
