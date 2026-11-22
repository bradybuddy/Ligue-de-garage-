"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Rafraîchit la page toutes les `ms` quand l'onglet est visible. Remplacé par Supabase Realtime plus tard. */
export function LiveRefresh({ ms = 5000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, ms);
    return () => clearInterval(id);
  }, [router, ms]);
  return null;
}
