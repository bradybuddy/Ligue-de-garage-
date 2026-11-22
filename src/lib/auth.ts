// Session de démo : cookie signé (HMAC) qui contient l'id de l'utilisateur.
// Remplacé par Supabase Auth (cookies @supabase/ssr) au moment de /replica-backend.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser, type User } from "./data";

const COOKIE = "bb_session";
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") throw new Error("SESSION_SECRET manquant");
  return "dev-seulement-a-changer";
}

const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");

export async function setSession(userId: string) {
  (await cookies()).set(COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
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
