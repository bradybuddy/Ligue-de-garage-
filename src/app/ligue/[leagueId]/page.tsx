import Link from "next/link";
import { CalendarPlus, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getLeagueOverview, listLeagueGames } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { EmptyState } from "@/components/ui/feedback";
import { LeagueGameRow } from "@/components/app/league-game-row";

/** L01 — Accueil de la ligue */
export default async function Page({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const user = await requireUser();
  const o = await orNotFound(() => getLeagueOverview(user.id, leagueId));
  const [upcoming, past] = await Promise.all([listLeagueGames(user.id, leagueId, "upcoming"), listLeagueGames(user.id, leagueId, "past")]);
  const tz = o.league.timezone;
  const base = `/ligue/${leagueId}`;
  const week = upcoming.filter((g) => Date.parse(g.startsAt) < Date.now() + 7 * 86400_000);
  const toScore = past.filter((g) => g.status === "scheduled");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Accueil — {o.league.name}</h1>
      <dl className="grid grid-cols-3 gap-3">
        {[["Équipes", o.teams.length], ["Divisions", o.divisions.length], ["Matchs à venir", upcoming.length]].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-surface p-3">
            <dt className="text-sm text-muted">{k}</dt><dd className="font-display text-3xl font-bold tabular">{v}</dd>
          </div>
        ))}
      </dl>
      {o.teams.length === 0 ? (
        <EmptyState icon={<Users />} title="Aucune équipe encore" body="Ajoute les équipes de ta ligue : avec leur code si elles utilisent déjà l'appli, sinon crée-les."
          action={o.isAdmin ? <Link href={`${base}/equipes`} className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">Ajouter des équipes</Link> : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section aria-labelledby="week-h" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between"><h2 id="week-h" className="text-lg font-bold">Cette semaine</h2>
              <Link href={`${base}/horaire`} className="text-sm font-semibold text-accent-strong underline underline-offset-4">Tout l&apos;horaire</Link></div>
            {week.length ? (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">{week.map((g) => <LeagueGameRow key={g.id} g={g} tz={tz} href={o.isAdmin ? `${base}/horaire/${g.id}` : undefined} />)}</ul>
            ) : (
              <EmptyState icon={<CalendarPlus />} title="Aucun match cette semaine" body={o.isAdmin ? "Ajoute des matchs : ils apparaissent chez les deux équipes." : "L'horaire de la ligue apparaîtra ici."}
                action={o.isAdmin ? <Link href={`${base}/horaire`} className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">Ajouter des matchs</Link> : undefined} />
            )}
          </section>
          <section aria-labelledby="res-h" className="flex flex-col gap-3">
            <h2 id="res-h" className="text-lg font-bold">Derniers résultats</h2>
            {o.isAdmin && toScore.length > 0 && (
              <Link href={`${base}/horaire/${toScore[0]!.id}`} className="rounded-md bg-warning-soft px-4 py-3 text-sm font-semibold text-on-warning-soft">
                {toScore.length} match{toScore.length > 1 ? "s" : ""} joué{toScore.length > 1 ? "s" : ""} sans pointage. Entrer le premier →
              </Link>
            )}
            {past.some((g) => g.status === "final") ? (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                {past.filter((g) => g.status === "final").slice(0, 6).map((g) => <LeagueGameRow key={g.id} g={g} tz={tz} />)}
              </ul>
            ) : <p className="rounded-lg border border-border bg-surface p-4 text-muted">Les résultats apparaîtront après les premiers matchs.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
