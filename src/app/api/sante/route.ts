import { systemHealth } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Pour la surveillance de disponibilité (uptime) : 200 si la base répond, que le cron a roulé
 * dans les 10 dernières minutes et qu'aucun envoi n'est coincé ; 503 sinon. Aucune donnée personnelle.
 */
export async function GET() {
  try {
    const h = await systemHealth();
    const cronOk = h.tickAgeSeconds !== null && h.tickAgeSeconds < 600;
    const queueOk = h.outboxWaitingOver10Min === 0;
    const ok = cronOk && queueOk;
    return Response.json({ ok, db: true, cron: cronOk, queue: queueOk, ...h }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, db: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
