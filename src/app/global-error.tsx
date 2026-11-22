"use client";
import { APP_NAME } from "@/lib/brand";

/** Dernier filet : erreur dans le layout racine. Autonome (pas de CSS de l'appli garanti). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr-CA">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 480, margin: "15vh auto", color: "#121722", background: "#F7F5F0" }}>
        <h1>Oups, ça a accroché</h1>
        <p>{APP_NAME} n&apos;a pas pu s&apos;afficher. Réessaie dans un instant.</p>
        <button onClick={reset} style={{ height: 44, padding: "0 20px", borderRadius: 10, border: 0, background: "#F2A516", color: "#1C1300", fontWeight: 600 }}>Réessayer</button>
      </body>
    </html>
  );
}
