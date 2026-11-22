"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { setBeerOptOut, setBeerTurn, DomainError } from "@/lib/data";

type R = { ok: boolean; error?: string };
const fail = (e: unknown): R => ({ ok: false, error: e instanceof DomainError ? e.message : "Ça n'a pas marché. Réessaie." });

export async function beerOptOutAction(teamId: string, optOut: boolean): Promise<R> {
  const user = await requireUser();
  try { await setBeerOptOut(user.id, teamId, optOut); revalidatePath(`/t/${teamId}`, "layout"); return { ok: true }; } catch (e) { return fail(e); }
}

export async function beerTurnAction(teamId: string, eventId: string, memberId: string | null): Promise<R> {
  const user = await requireUser();
  try { await setBeerTurn(user.id, eventId, memberId); revalidatePath(`/t/${teamId}`, "layout"); return { ok: true }; } catch (e) { return fail(e); }
}
