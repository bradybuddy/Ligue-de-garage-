import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { systemHealth, type SystemHealth } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: `État du service · ${APP_NAME}` };

function ago(s: number) {
  if (s < 90) return `il y a ${s} s`;
  if (s < 5400) return `il y a ${Math.round(s / 60)} min`;
  return `il y a ${Math.round(s / 3600)} h`;
}

/** Page d'état publique : preuve visible que les rappels partent. Aucune donnée personnelle. */
export default async function Etat() {
  let h: SystemHealth | null = null;
  try { h = await systemHealth(); } catch { h = null; }
  const rows = h
    ? [
        { ok: true, label: "Base de données", detail: "Répond" },
        { ok: h.tickAgeSeconds !== null && h.tickAgeSeconds < 600, label: "Rappels et spares automatiques", detail: h.tickAgeSeconds === null ? "Pas encore démarré" : `Dernier passage ${ago(h.tickAgeSeconds)}` },
        { ok: h.outboxWaitingOver10Min === 0, label: "Envoi des textos, courriels et notifs", detail: h.outboxWaitingOver10Min === 0 ? "Rien en retard" : `${h.outboxWaitingOver10Min} envoi(s) en retard` },
      ]
    : [{ ok: false, label: "Base de données", detail: "Ne répond pas" }];
  const allOk = rows.every((r) => r.ok);
  return (
    <main className="mx-auto flex min-h-dvh max-w-content flex-col gap-6 px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-accent-strong underline underline-offset-4">← {APP_NAME}</Link>
      <h1 className="font-display text-3xl font-bold">État du service</h1>
      <p className={allOk ? "font-semibold text-in" : "font-semibold text-out"}>{allOk ? "Tout fonctionne." : "Il y a un problème. On est dessus."}</p>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
            {r.ok ? <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-in" /> : <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-out" />}
            <span className="flex flex-col">
              <span className="font-semibold">{r.label} <span className="sr-only">{r.ok ? "(fonctionne)" : "(problème)"}</span></span>
              <span className="text-sm text-muted">{r.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">Cette page se met à jour à chaque visite.</p>
    </main>
  );
}
