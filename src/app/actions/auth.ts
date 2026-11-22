"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AFTER_CONFIRM_COOKIE } from "@/lib/supabase/config";
import { z } from "zod";
import { signIn, signUp } from "@/lib/data";
import { clearSession, currentUser, setSession, supabaseAuthEnabled } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/messages";
import { normalizePhone } from "@/lib/sms";
import { toFormError, type FormState } from "@/lib/guard";

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

// Messages de Supabase Auth → français. On ne révèle jamais si un courriel a un compte.
function authMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_credentials": return "Courriel ou mot de passe incorrect.";
    case "email_not_confirmed": return "Confirme d'abord ton courriel : clique le lien qu'on t'a envoyé (regarde aussi dans les indésirables).";
    case "weak_password": return "Mot de passe trop faible : au moins 8 caractères, pas un mot de passe connu.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Trop d'essais. Attends quelques minutes et réessaie.";
    case "same_password": return "Choisis un mot de passe différent de l'ancien.";
    default: return fallback;
  }
}

export async function signInAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (supabaseAuthEnabled) {
    const { error } = await (await supabaseServer()).auth.signInWithPassword({ email, password });
    if (error) return { error: authMessage(error.code, "Connexion impossible pour l'instant. Réessaie."), values: { email } };
  } else {
    try {
      await setSession((await signIn(email, password)).id);
    } catch (e) {
      return toFormError(e, { email });
    }
  }
  redirect(safeNext(fd.get("next")));
}

const SignUp = z.object({
  displayName: z.string().trim().min(2, "Ton nom, au moins 2 lettres.").max(60, "60 caractères maximum."),
  email: z.string().trim().toLowerCase().email("Ce courriel n'a pas l'air valide."),
  password: z.string().min(8, "Au moins 8 caractères.").max(72, "72 caractères maximum."),
  phone: z.string().trim().refine((p) => p === "" || normalizePhone(p) !== null, "Numéro invalide. Exemple : 514-555-1234."),
});

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = { displayName: String(fd.get("displayName") ?? ""), email: String(fd.get("email") ?? ""), phone: String(fd.get("phone") ?? "") };
  const parsed = SignUp.safeParse({ ...values, password: fd.get("password") ?? "" });
  if (!parsed.success) return { values, fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const d = parsed.data;
  const next = safeNext(fd.get("next"));
  if (supabaseAuthEnabled) {
    const { data, error } = await (await supabaseServer()).auth.signUp({
      email: d.email, password: d.password,
      options: { data: { display_name: d.displayName, phone: normalizePhone(d.phone) }, emailRedirectTo: `${APP_URL}/auth/confirm?next=${encodeURIComponent(next)}` },
    });
    if (error) return { error: authMessage(error.code, "L'inscription n'a pas marché. Réessaie dans un instant."), values };
    // Courriel déjà utilisé : Supabase répond « succès » sans session ni identité. Même message dans les deux cas.
    if (!data.session) {
      // Le lien du courriel de confirmation ramène toujours à « / » : on retient où la personne allait (ex. une invitation)
      if (next !== "/") (await cookies()).set(AFTER_CONFIRM_COOKIE, next, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 3 });
      return { ok: true, values: { email: d.email } };
    }
  } else {
    try {
      await setSession((await signUp({ ...d, phone: d.phone || null })).id);
    } catch (e) {
      return toFormError(e, values);
    }
  }
  redirect(next);
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { fields: { email: "Ce courriel n'a pas l'air valide." }, values: { email } };
  if (!supabaseAuthEnabled) return { error: "La réinitialisation arrive avec Supabase Auth (pas en mode démo).", values: { email } };
  const { error } = await (await supabaseServer()).auth.resetPasswordForEmail(email, { redirectTo: `${APP_URL}/auth/confirm?next=/reinitialiser` });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { error: authMessage(error.code, ""), values: { email } };
  }
  return { ok: true, values: { email } }; // même réponse que le compte existe ou non
}

export async function updatePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { fields: { password: "Au moins 8 caractères." } };
  if (password !== String(fd.get("confirm") ?? "")) return { fields: { confirm: "Les deux mots de passe ne sont pas pareils." } };
  if (!supabaseAuthEnabled) return { error: "Pas disponible en mode démo." };
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: authMessage(error.code, "Le lien a expiré. Redemande un courriel de réinitialisation.") };
  await sb.auth.signOut({ scope: "others" }); // les autres appareils doivent se reconnecter
  redirect("/?motdepasse=1");
}

export async function signOutAction() {
  await clearSession("local");
  redirect("/connexion");
}

export async function signOutEverywhereAction() {
  await clearSession("global");
  redirect("/connexion?partout=1");
}

export async function deleteAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  if (String(fd.get("confirm") ?? "").trim().toUpperCase() !== "SUPPRIMER") return { fields: { confirm: "Écris SUPPRIMER pour confirmer." } };
  if (!supabaseAuthEnabled) return { error: "La suppression de compte passe par Supabase Auth (pas en mode démo)." };
  // Supprime l'utilisateur dans Supabase Auth → cascade : profil effacé, fiches d'équipe anonymisées (migration 0002)
  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) return { error: "La suppression n'a pas marché. Réessaie ou écris-nous." };
  await clearSession("local").catch(() => {});
  redirect("/?compte-supprime=1");
}
