import { Megaphone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getLeagueOverview, listLeagueBroadcasts, type Channel } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { fmtAgo } from "@/lib/time";
import { LeagueBroadcastForm } from "@/components/app/league-forms";
import { Banner, EmptyState } from "@/components/ui/feedback";

const ch: Record<Channel, string> = { push: "notif", sms: "texto", email: "courriel" };

/** L09 — Message à toute la ligue */
export default async function Page({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const user = await requireUser();
  const o = await orNotFound(() => getLeagueOverview(user.id, leagueId));
  if (!o.isAdmin) return <Banner tone="warning">Seuls les administrateurs de la ligue envoient des messages à toute la ligue.</Banner>;
  const history = await listLeagueBroadcasts(user.id, leagueId);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section aria-labelledby="f-h" className="flex flex-col gap-3">
        <h1 id="f-h" className="font-display text-3xl font-bold">Message à la ligue</h1>
        <p className="text-muted">Pour les annonces de la ligue : séries, changement d&apos;aréna, fermeture. 3 par jour au maximum.</p>
        <LeagueBroadcastForm leagueId={leagueId} />
      </section>
      <section aria-labelledby="h-h" className="flex flex-col gap-3">
        <h2 id="h-h" className="text-lg font-bold">Messages envoyés</h2>
        {history.length === 0 ? <EmptyState icon={<Megaphone />} title="Aucun message envoyé" body="Tes annonces à la ligue apparaîtront ici." /> : (
          <ul className="flex flex-col gap-3">
            {history.map((b) => (
              <li key={b.id} className="rounded-lg border border-border bg-surface p-4">
                {b.subject && <p className="font-bold">{b.subject}</p>}
                <p className="whitespace-pre-wrap break-words">{b.body}</p>
                <p className="text-sm text-muted">{b.sentAt ? fmtAgo(b.sentAt) : ""} · {b.channels.map((c) => ch[c]).join(", ")} · {b.audience.includes("staff") ? "gérants" : "tous"} · {b.recipients} personne{b.recipients > 1 ? "s" : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
