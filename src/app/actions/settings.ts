"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { setNotificationPref, updateTeamSettings, DomainError, type PrefCategory } from "@/lib/data";
import type { FormState } from "@/lib/guard";

const n = (min: number, max: number, msg: string) => z.coerce.number({ error: msg }).int(msg).min(min, msg).max(max, msg);
const Settings = z.object({
  name: z.string().trim().min(2, "Le nom, au moins 2 lettres.").max(60, "60 caractères maximum."),
  maxPlayers: n(1, 60, "Entre 1 et 60."),
  maxGoalies: n(0, 6, "Entre 0 et 6."),
  reminderHoursBefore: n(1, 336, "Entre 1 et 336 heures."),
  autoSparesEnabled: z.boolean(),
  autoSparesHoursBefore: n(1, 336, "Entre 1 et 336 heures."),
  autoSparesChannels: z.array(z.enum(["push", "sms", "email"])),
  waitlistMode: z.enum(["top", "first_accept", "off"]),
  beerEnabled: z.boolean(),
  beerTiebreak: z.enum(["alpha", "jersey"]),
});

export async function saveSettingsAction(teamId: string, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(["name", "maxPlayers", "maxGoalies", "reminderHoursBefore", "autoSparesHoursBefore", "waitlistMode", "beerTiebreak"].map((k) => [k, String(fd.get(k) ?? "")]));
  const p = Settings.safeParse({ ...raw, autoSparesEnabled: fd.get("autoSparesEnabled") === "on", beerEnabled: fd.get("beerEnabled") === "on", autoSparesChannels: fd.getAll("autoSparesChannels") });
  if (!p.success) return { values: raw, fields: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])) };
  if (p.data.autoSparesEnabled && !p.data.autoSparesChannels.length) return { values: raw, fields: { autoSparesChannels: "Choisis au moins un canal pour les invitations." } };
  try {
    await updateTeamSettings(user.id, teamId, p.data);
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : "Les réglages n'ont pas été enregistrés.", values: raw };
  }
  revalidatePath(`/t/${teamId}`, "layout");
  return { ok: true };
}

export async function setPrefAction(memberId: string, category: PrefCategory, channel: "push" | "sms" | "email", enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try { await setNotificationPref(user.id, memberId, category, channel, enabled); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof DomainError ? e.message : "Ton choix n'a pas été enregistré." }; }
}
