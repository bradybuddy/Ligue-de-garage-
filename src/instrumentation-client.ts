import * as Sentry from "@sentry/nextjs";

// Surveillance des erreurs dans le navigateur. Inactive sans NEXT_PUBLIC_SENTRY_DSN.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // Rien de personnel : ni utilisateur, ni témoins, ni en-têtes, ni contenu des requêtes, ni paramètres d'URL (jetons).
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    tracesSampleRate: 0,
    // Les coupures de réseau sur un cell à l'aréna ne sont pas des bogues.
    ignoreErrors: ["Failed to fetch", "NetworkError", "Load failed", "AbortError"],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
