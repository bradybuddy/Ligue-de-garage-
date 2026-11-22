// Session : Supabase Auth (cookies http-only via @supabase/ssr) si configuré,
// sinon cookie signé de démo (développement seulement).
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser, type User } from "./data";
import { supabaseAuthEnabled } from "./supabase/config";
import { supabaseServer } from "./supabase/server";

export { supabaseAuthEnabled };

const COOKIE = "bb_session";
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") throw new Error("SESSION_SECRET manquant");
  return "dev-seulement-a-changer";
}
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");

/** Démo seulement. */
export async function setSession(userId: string) {
  (await cookies()).set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60,
  });
}

export async function clearSession(scope: "local" | "global" = "local") {
  if (supabaseAuthEnabled) {
    await (await supabaseServer()).auth.signOut({ scope });
    return;
  }
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  if (supabaseAuthEnabled) {
    const { data } = await (await supabaseServer()).auth.getUser(); // vérifié auprès de Supabase, pas seulement décodé
    return data.user ? getUser(data.user.id) : null;
  }
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  const id = raw.slice(0, i);
  const sig = Buffer.from(raw.slice(i + 1));
  const ok = Buffer.from(sign(id));
  if (sig.length !== ok.length || !timingSafeEqual(sig, ok)) return null;
  return getUser(id);
}

export async function requireUser(next?: string): Promise<User> {
  const u = await currentUser();
  if (!u) redirect(`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return u;
}
