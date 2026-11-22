import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./config";

/** Client Supabase lié aux cookies de la requête (session http-only gérée par @supabase/ssr). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Appelé depuis un composant serveur (lecture seule) : le proxy rafraîchit déjà la session.
        }
      },
    },
  });
}

/** Client administrateur (clé service_role) : suppression de compte, création d'utilisateurs de test. Serveur seulement. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant");
  return createClient(supabaseUrl!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
