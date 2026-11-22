import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rafraîchit la session Supabase (cookies) à chaque requête de page. Rien à faire en mode démo. */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser(); // valide le jeton auprès de Supabase et le renouvelle au besoin
  return response;
}

export const config = {
  // Pas sur les fichiers statiques ni les webhooks (Twilio, cron) qui n'ont pas de session
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|api/webhooks|api/cron|api/desabonnement|.*\\.(?:svg|png|jpg|ico|webmanifest)$).*)"],
};
