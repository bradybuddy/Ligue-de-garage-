"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  addDivision, attachTeam, createLeague, createLeagueTeam, deleteDivision, deleteLeagueGame, detachTeam, renameDivision,
  saveLeagueGame, sendLeagueBroadcast, setLeagueGameResult, setTeamDivision, DomainError,
} from "@/lib/data";
import type { FormState } from "@/lib/guard";

type R = { ok: boolean; error?: string };
const msg = (e: unknown, d: string) => (e instanceof DomainError ? e.message : (e as Error)?.message === "code invalide" ? "Ce code ne correspond à aucune équipe." : d);
const fields = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));
const uuidOrNull = (v: FormDataEntryValue | null) => (typeof v === "string" && /^[0-9a-f-]{36}$/.test(v) ? v : null);

export async function createLeagueAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/ligues/nouvelle");
  const values = { name: String(fd.get("name") ?? ""), divisions: String(fd.get("divisions") ?? "") };
  const p = z.object({ name: z.string().trim().min(2, "Le nom de la ligue, au moins 2 lettres.").max(80, "80 caractères maximum.") }).safeParse(values);
  if (!p.success) return { values, fields: fields(p.error) };
  let id: string;
  try {
    id = await createLeague(user.id, p.data.name, values.divisions.split(/[\n,]/).map((d) => d.trim()).filter(Boolean).slice(0, 20));
  } catch (e) {
    return { values, error: msg(e, "La ligue n'a pas été créée. Réessaie.") };
  }
  redirect(`/ligue/${id}/equipes?bienvenue=1`);
}

export async function divisionAction(leagueId: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(fd.get("name") ?? "").trim();
  const id = uuidOrNull(fd.get("divisionId"));
  const op = String(fd.get("op") ?? "add");
  if (op !== "delete" && (name.length < 1 || name.length > 40)) return { fields: { name: "Entre 1 et 40 caractères." } };
  try {
    if (op === "delete" && id) await deleteDivision(user.id, leagueId, id);
    else if (id) await renameDivision(user.id, leagueId, id, name);
    else await addDivision(user.id, leagueId, name);
  } catch (e) {
    return { error: msg(e, "La division n'a pas été enregistrée.") };
  }
  revalidatePath(`/ligue/${leagueId}`, "layout");
  return { ok: true };
}

export async function addTeamAction(leagueId: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const how = String(fd.get("how") ?? "code");
  const division = uuidOrNull(fd.get("divisionId"));
  const values = { code: String(fd.get("code") ?? ""), name: String(fd.get("name") ?? "") };
  try {
    if (how === "code") {
      const code = values.code.replace(/[\s-]/g, "").toUpperCase();
      if (!/^[A-Z0-9]{4,10}$/.test(code)) return { values, fields: { code: "Le code a 6 caractères, ex. BUDDY4." } };
      await attachTeam(user.id, leagueId, code, division);
    } else {
      if (values.name.trim().length < 2) return { values, fields: { name: "Le nom, au moins 2 lettres." } };
      await createLeagueTeam(user.id, leagueId, values.name.slice(0, 60), division);
    }
  } catch (e) {
    return { values, error: msg(e, "L'équipe n'a pas été ajoutée.") };
  }
  revalidatePath(`/ligue/${leagueId}`, "layout");
  return { ok: true, values: { n: String(Date.now()) } };
}

export async function teamDivisionAction(leagueId: string, teamId: string, divisionId: string | null): Promise<R> {
  const user = await requireUser();
  try { await setTeamDivision(user.id, leagueId, teamId, divisionId); revalidatePath(`/ligue/${leagueId}`, "layout"); return { ok: true }; }
  catch (e) { return { ok: false, error: msg(e, "Le changement n'a pas été enregistré.") }; }
}

export async function detachTeamAction(leagueId: string, teamId: string): Promise<void> {
  const user = await requireUser();
  await detachTeam(user.id, leagueId, teamId);
  revalidatePath(`/ligue/${leagueId}`, "layout");
  redirect(`/ligue/${leagueId}/equipes`);
}

const Game = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choisis une date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choisis une heure."),
  homeTeamId: z.string().uuid("Choisis l'équipe à domicile."),
  awayTeamId: z.string().uuid("Choisis l'équipe visiteuse."),
  venue: z.string().trim().max(120).optional(),
});

export async function saveGameAction(leagueId: string, gameId: string | null, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = Object.fromEntries(["date", "time", "homeTeamId", "awayTeamId", "venue"].map((k) => [k, String(fd.get(k) ?? "")]));
  const p = Game.safeParse(values);
  if (!p.success) return { values, fields: fields(p.error) };
  if (p.data.homeTeamId === p.data.awayTeamId) return { values, fields: { awayTeamId: "Choisis deux équipes différentes." } };
  try {
    await saveLeagueGame(user.id, leagueId, gameId, p.data);
  } catch (e) {
    return { values, error: msg(e, "Le match n'a pas été enregistré.") };
  }
  revalidatePath(`/ligue/${leagueId}`, "layout");
  if (gameId) redirect(`/ligue/${leagueId}/horaire`);
  return { ok: true, values: { date: values.date, time: values.time, venue: values.venue, n: String(Date.now()) } }; // garde date, heure et aréna pour enchaîner
}

export async function resultAction(leagueId: string, gameId: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const op = String(fd.get("op") ?? "final");
  try {
    if (op === "cancel") await setLeagueGameResult(user.id, leagueId, gameId, null, "cancelled");
    else if (op === "reopen") await setLeagueGameResult(user.id, leagueId, gameId, null, "scheduled");
    else {
      const p = z.object({ homeScore: z.coerce.number().int().min(0).max(99), awayScore: z.coerce.number().int().min(0).max(99) })
        .safeParse({ homeScore: fd.get("homeScore"), awayScore: fd.get("awayScore") });
      if (!p.success) return { fields: { score: "Deux nombres entre 0 et 99." } };
      await setLeagueGameResult(user.id, leagueId, gameId, { ...p.data, overtime: fd.get("overtime") === "on" }, "final");
    }
  } catch (e) {
    return { error: msg(e, "Le résultat n'a pas été enregistré.") };
  }
  revalidatePath(`/ligue/${leagueId}`, "layout");
  return { ok: true };
}

export async function deleteGameAction(leagueId: string, gameId: string): Promise<void> {
  const user = await requireUser();
  await deleteLeagueGame(user.id, leagueId, gameId);
  revalidatePath(`/ligue/${leagueId}`, "layout");
  redirect(`/ligue/${leagueId}/horaire`);
}

const LB = z.object({
  subject: z.string().trim().max(120).optional(),
  body: z.string().trim().min(1, "Écris ton message.").max(1000, "1000 caractères maximum."),
  channels: z.array(z.enum(["push", "sms", "email"])).min(1, "Choisis au moins un canal."),
});

export async function leagueBroadcastAction(leagueId: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = { subject: String(fd.get("subject") ?? ""), body: String(fd.get("body") ?? "") };
  const p = LB.safeParse({ ...values, channels: fd.getAll("channels") });
  if (!p.success) return { values, fields: fields(p.error) };
  const managersOnly = fd.get("audience") === "managers";
  try {
    const n = await sendLeagueBroadcast(user.id, leagueId, { ...p.data, audience: ["regular", "spare"], managersOnly });
    revalidatePath(`/ligue/${leagueId}/diffusion`);
    return { ok: true, values: { sent: String(n) } };
  } catch (e) {
    return { values, error: msg(e, "Le message n'est pas parti.") };
  }
}
