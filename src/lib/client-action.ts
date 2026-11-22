"use client";
import { unstable_rethrow } from "next/navigation";

/**
 * Appelle une action serveur depuis un bouton sans jamais faire planter la page.
 * Réseau coupé (Wi-Fi d'aréna!) ou serveur en erreur → message en français au lieu de l'écran d'erreur de Next.
 * Les redirections de Next (session expirée → connexion) passent quand même.
 */
export async function callAction<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; offline: boolean }> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    unstable_rethrow(e);
    return { ok: false, offline: typeof navigator !== "undefined" && navigator.onLine === false };
  }
}

export const failMessage = (offline: boolean, what = "Ta réponse n'a pas été enregistrée.") =>
  offline ? `Pas de connexion. ${what} Réessaie quand le réseau revient.` : `${what} Réessaie dans un instant.`;
