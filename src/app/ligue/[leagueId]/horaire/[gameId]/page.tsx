import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLeagueGame, getLeagueOverview } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { utcToZonedParts } from "@/lib/time";
import { GameForm, ResultForm } from "@/components/app/league-forms";
import { ConfirmAction } from "@/components/app/confirm-action";
import { Banner } from "@/components/ui/feedback";
import { deleteGameAction } from "@/app/actions/league";

/** L03 — Un match de ligue : modifier, pointage final, annuler, retirer */
export default async function Page({ params }: { params: Promise<{ leagueId: string; gameId: string }> }) {
  const { leagueId, gameId } = await params;
  const user = await requireUser();
  const o = await orNotFound(() => getLeagueOverview(user.id, leagueId));
  const g = await orNotFound(() => getLeagueGame(user.id, leagueId, gameId));
  const back = <Link href={`/ligue/${leagueId}/horaire`} className="self-start text-sm font-semibold text-muted hover:text-text">← Horaire de la ligue</Link>;
  if (!o.isAdmin) return (<div className="flex flex-col gap-3">{back}<Banner tone="warning">Seuls les administrateurs de la ligue peuvent modifier l&apos;horaire.</Banner></div>);
  const p = utcToZonedParts(g.startsAt, o.league.timezone);
  return (
    <div className="flex max-w-content flex-col gap-6">
      {back}
      <h1 className="break-words font-display text-3xl font-bold">{g.homeName} contre {g.awayName}</h1>
      <section aria-labelledby="res-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 id="res-h" className="font-bold">Résultat</h2>
        <ResultForm leagueId={leagueId} gameId={g.id} home={g.homeName} away={g.awayName} status={g.status} homeScore={g.homeScore} awayScore={g.awayScore} overtime={g.overtime} />
      </section>
      <section aria-labelledby="edit-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 id="edit-h" className="font-bold">Date, heure, équipes</h2>
        <p className="text-sm text-muted">Un changement est envoyé aux deux équipes ; s&apos;il change l&apos;heure, les rappels repartent.</p>
        <GameForm leagueId={leagueId} gameId={g.id} teams={o.teams} defaults={{ date: p.date, time: p.time, homeTeamId: g.homeTeamId, awayTeamId: g.awayTeamId, venue: g.venue ?? "" }} />
      </section>
      <ConfirmAction label="Retirer de l'horaire" title="Retirer ce match?" confirmLabel="Retirer pour de bon"
        body="Il disparaît de l'horaire des deux équipes, avec les réponses des joueurs. Pour garder la trace, annule-le plutôt." action={deleteGameAction.bind(null, leagueId, g.id)} />
    </div>
  );
}
