import "server-only";
import { notFound } from "next/navigation";
import { DomainError } from "./data";

/** Exécute une lecture ; « introuvable » ou « pas membre » → page 404 (on ne révèle pas que l'équipe existe). */
export async function orNotFound<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DomainError && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  }
}

export type FormState = { ok?: boolean; error?: string; fields?: Record<string, string>; values?: Record<string, string> } | null;

/** Transforme une erreur en état de formulaire montrable. */
export function toFormError(e: unknown, values?: Record<string, string>): FormState {
  if (e instanceof DomainError) return { error: e.message, values };
  console.error(e);
  return { error: "Oups, quelque chose a planté de notre bord. Réessaie dans un instant.", values };
}
