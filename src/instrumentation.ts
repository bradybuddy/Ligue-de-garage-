import * as Sentry from "@sentry/nextjs";

// Surveillance des erreurs côté serveur. Inactive sans SENTRY_DSN (dev, tests).
export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    // Rien de personnel : ni utilisateur, ni témoins, ni en-têtes, ni contenu des requêtes, ni paramètres d'URL (jetons).
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    tracesSampleRate: 0.05,
  });
}

export const onRequestError = Sentry.captureRequestError;
