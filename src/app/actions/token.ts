"use server";
import { redirect } from "next/navigation";
import { respondWithToken, DomainError } from "@/lib/data";

export async function respondTokenAction(raw: string, status: "in" | "out") {
  let r: string;
  try {
    r = await respondWithToken(raw, status);
  } catch (e) {
    redirect(`/r/${raw}?erreur=${encodeURIComponent(e instanceof DomainError ? e.message : "Ta réponse n'a pas été enregistrée.")}`);
  }
  redirect(`/r/${raw}?ok=${r}`);
}
