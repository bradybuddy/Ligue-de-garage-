// Session : Supabase Auth, cookies http-only gérés par @supabase/ssr (rafraîchis dans src/proxy.ts).
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUser, type User } from "./data";
import { supabaseAuthEnabled } from "./supabase/config";
import { supabaseServer } from "./supabase/server";

export { supabaseAuthEnabled };

function assertConfigured() {
  if (!supabaseAuthEnabled) throw new Error("NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY manquants (en local : npm run env:local)");
}

export async function clearSession(scope: "local" | "global" = "local") {
  assertConfigured();
  await (await supabaseServer()).auth.signOut({ scope });
}

export async function currentUser(): Promise<User | null> {
  assertConfigured();
  const { data } = await (await supabaseServer()).auth.getUser(); // vérifié auprès de Supabase, pas seulement décodé
  return data.user ? getUser(data.user.id) : null;
}

export async function requireUser(next?: string): Promise<User> {
  const u = await currentUser();
  if (!u) {
    // Le chemin réellement demandé (noté par le proxy) l'emporte : un layout ne connaît que son propre segment
    const asked = (await headers()).get("x-bb-path");
    const target = asked && asked.startsWith("/") && !asked.startsWith("//") && !asked.startsWith("/_next") ? asked : next;
    redirect(`/connexion${target ? `?next=${encodeURIComponent(target)}` : ""}`);
  }
  return u;
}
