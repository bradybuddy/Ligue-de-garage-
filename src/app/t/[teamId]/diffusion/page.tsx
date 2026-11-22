import { Megaphone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTeamForUser, listBroadcasts, type Channel } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { fmtAgo } from "@/lib/time";
import { PageTitle } from "@/components/app/page-title";
import { BroadcastForm } from "@/components/app/broadcast-form";
import { EmptyState } from "@/components/ui/feedback";

const ch: Record<Channel, string> = { push: "notif", sms: "texto", email: "courriel" };

/** S18 — Message à toute l'équipe (diffusion) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const user = await requireUser();
  const { me } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const history = await listBroadcasts(user.id, teamId);
  const manager = me.role !== "member";
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={manager ? "Message à l'équipe" : "Messages du gérant"} back={{ href: `/t/${teamId}/plus`, label: "Plus" }}
        sub={manager ? "Pour les annonces importantes. Pour jaser, il y a la chambre." : undefined} />
      {manager && <BroadcastForm teamId={teamId} />}
      <section aria-labelledby="hist-h" className="flex flex-col gap-3">
        <h2 id="hist-h" className="text-lg font-bold">Messages envoyés</h2>
        {history.length === 0 ? (
          <EmptyState icon={<Megaphone />} title="Aucun message envoyé" body={manager ? "Tes annonces à toute l'équipe apparaîtront ici." : "Les annonces de ton gérant apparaîtront ici."} />
        ) : (
          <ul className="flex flex-col gap-3">
            {history.map((b) => (
              <li key={b.id} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
                {b.subject && <p className="font-bold">{b.subject}</p>}
                <p className="whitespace-pre-wrap break-words">{b.body}</p>
                <p className="text-sm text-muted">
                  {b.authorName ?? "Ancien gérant"} · {b.sentAt ? fmtAgo(b.sentAt) : ""} · {b.channels.map((c) => ch[c]).join(", ")}{manager ? ` · ${b.recipients} personne${b.recipients > 1 ? "s" : ""}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
