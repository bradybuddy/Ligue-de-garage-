"use client";
import { useEffect, useRef } from "react";

/**
 * Soumet le formulaire au chargement, en JS seulement.
 * Les antivirus de courriel qui pré-ouvrent les liens n'exécutent pas le JS : ils ne répondent jamais à la place du joueur.
 */
export function AutoSubmit({ formId }: { formId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
  }, [formId]);
  return null;
}
