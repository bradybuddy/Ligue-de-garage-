import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/** Lien des courriels de Supabase Auth (confirmation, réinitialisation) : vérifie le jeton et ouvre la session. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const tokenHash = q.get("token_hash");
  const type = q.get("type") as EmailOtpType | null;
  const nextRaw = q.get("next") ?? (type === "recovery" ? "/reinitialiser" : "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  const to = (path: string) => NextResponse.redirect(new URL(path, req.nextUrl.origin));
  if (!tokenHash || !type) return to("/connexion?lien=invalide");
  const { error } = await (await supabaseServer()).auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return to(`/connexion?lien=${error.code === "otp_expired" ? "expire" : "invalide"}`);
  return to(type === "recovery" ? "/reinitialiser" : next);
}
