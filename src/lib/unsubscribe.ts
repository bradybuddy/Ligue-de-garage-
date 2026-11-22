import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Jeton de désabonnement : membre + catégorie, signé. Pas d'expiration (un vieux courriel doit marcher).
const secret = () => process.env.UNSUBSCRIBE_SECRET ?? process.env.SESSION_SECRET ?? "dev-seulement-a-changer";
const sig = (v: string) => createHmac("sha256", secret()).update(`unsub:${v}`).digest("base64url").slice(0, 32);

export function unsubscribeToken(memberId: string, category: string) {
  const v = `${memberId}.${category}`;
  return `${Buffer.from(v).toString("base64url")}.${sig(v)}`;
}

export function readUnsubscribeToken(token: string): { memberId: string; category: string } | null {
  const [b, s] = token.split(".");
  if (!b || !s) return null;
  const v = Buffer.from(b, "base64url").toString();
  const ok = Buffer.from(sig(v));
  if (ok.length !== Buffer.from(s).length || !timingSafeEqual(ok, Buffer.from(s))) return null;
  const [memberId, category] = v.split(".");
  return memberId && category ? { memberId, category } : null;
}
