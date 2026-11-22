import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEventDetail, listEvents } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { utcToZonedParts } from "@/lib/time";
import { PageTitle } from "@/components/app/page-title";
import { EventForm } from "@/components/app/event-form";
import { Banner } from "@/components/ui/feedback";
import { ConfirmAction } from "@/components/app/confirm-action";
import { cancelEventAction, deleteEventAction } from "@/app/actions/events";

/** S08 — Modifier / annuler / supprimer un match */
export default async function Page({ params }: { params: Promise<{ teamId: string; eventId: string }> }) {
  const { teamId, eventId } = await params;
  const user = await requireUser();
  const d = await orNotFound(() => getEventDetail(user.id, eventId));
  if (d.team.id !== teamId) notFound();
  const back = { href: `/t/${teamId}/matchs/${eventId}`, label: "Retour au match" };
  if (!d.canManage) return (<><PageTitle title="Modifier le match" back={back} /><Banner tone="warning">Seuls le gérant et l&apos;adjoint peuvent modifier l&apos;horaire.</Banner></>);
  const ev = d.event;
  if (ev.leagueGameId) return (<><PageTitle title="Modifier le match" back={back} /><Banner tone="info">Ce match vient de l&apos;horaire de la ligue : c&apos;est la ligue qui le modifie ou l&apos;annule. Ton équipe gère les présences, les spares et la tournée comme d&apos;habitude.</Banner></>);
  const p = utcToZonedParts(ev.startsAt, d.team.timezone);
  const venues = [...new Set((await listEvents(user.id, teamId, "upcoming")).map((e) => e.venue).filter((x): x is string => !!x))];
  return (
    <div className="flex flex-col gap-8">
      <div>
        <PageTitle title="Modifier le match" back={back} />
        <EventForm teamId={teamId} eventId={eventId} teamMax={d.team.maxPlayers} venues={venues} defaults={{
          type: ev.type, date: p.date, time: p.time, venue: ev.venue ?? "", opponent: ev.opponent ?? "", title: ev.title ?? "",
          maxPlayers: ev.maxPlayers?.toString() ?? "", homeRoom: ev.homeRoom ?? "", awayRoom: ev.awayRoom ?? "",
        }} />
      </div>
      <section aria-labelledby="danger-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 id="danger-h" className="font-bold">Annuler ou supprimer</h2>
        <p className="text-sm text-muted">Annuler garde le match à l&apos;horaire, barré, pour que tout le monde le voie. Supprimer l&apos;efface avec les réponses.</p>
        <div className="flex flex-wrap gap-2">
          {ev.status === "scheduled" && (
            <ConfirmAction label="Annuler le match" variant="secondary" title="Annuler ce match?" confirmLabel="Oui, annuler"
              body="Le match restera à l'horaire, barré. Les réponses sont gardées." action={cancelEventAction.bind(null, teamId, eventId)} />
          )}
          <ConfirmAction label="Supprimer" title="Supprimer ce match?" confirmLabel="Supprimer pour de bon"
            body="Le match et toutes les réponses seront effacés. Ça ne se défait pas." action={deleteEventAction.bind(null, teamId, eventId)} />
        </div>
      </section>
    </div>
  );
}
