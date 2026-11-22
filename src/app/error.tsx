"use client";
import { useEffect } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Erreur inattendue dans une page : message en français, on garde la main (pas l'écran anglais de Next). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error.digest ?? error.message); }, [error]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">
        {offline ? <WifiOff className="size-6" /> : <RefreshCw className="size-6" />}
      </span>
      <h1 className="font-display text-3xl font-bold">{offline ? "Pas de connexion" : "Oups, ça a accroché"}</h1>
      <p className="text-muted">{offline ? "Ton téléphone n'a plus de réseau. Rien n'est perdu : réessaie quand ça revient." : "Quelque chose n'a pas marché de notre bord. Réessaie; si ça continue, écris-nous."}</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Réessayer</Button>
        <a href="/" className="inline-flex h-10 items-center rounded-md border border-border-input px-4 text-sm font-semibold">Accueil</a>
      </div>
    </main>
  );
}
