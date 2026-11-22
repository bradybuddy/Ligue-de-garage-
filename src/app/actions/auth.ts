"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signUp } from "@/lib/data";
import { clearSession, setSession } from "@/lib/auth";
import { toFormError, type FormState } from "@/lib/guard";

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function signInAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "");
  try {
    const u = await signIn(email, String(fd.get("password") ?? ""));
    await setSession(u.id);
  } catch (e) {
    return toFormError(e, { email });
  }
  redirect(safeNext(fd.get("next")));
}

const SignUp = z.object({
  displayName: z.string().trim().min(2, "Ton nom, au moins 2 lettres.").max(60, "60 caractères maximum."),
  email: z.string().trim().email("Ce courriel n'a pas l'air valide."),
  password: z.string().min(8, "Au moins 8 caractères."),
  phone: z.string().trim().optional(),
});

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = { displayName: String(fd.get("displayName") ?? ""), email: String(fd.get("email") ?? ""), phone: String(fd.get("phone") ?? "") };
  const parsed = SignUp.safeParse({ ...values, password: fd.get("password") });
  if (!parsed.success) {
    return { values, fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  try {
    const u = await signUp(parsed.data);
    await setSession(u.id);
  } catch (e) {
    return toFormError(e, values);
  }
  redirect(safeNext(fd.get("next")));
}

export async function signOutAction() {
  await clearSession();
  redirect("/connexion");
}
