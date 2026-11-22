import { CalendarPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getLeagueOverview, listLeagueGames } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { GameForm } from "@/components/app/league-forms";
import { LeagueGameRow } from "@/components/app/league-game-row";
import { Banner, EmptyState } from "@/components/ui/feedback";

const monthFmt = (tz: string) => new Intl.DateTimeFormat("fr-CA", { month: "long", year: "numeric", timeZone: tz });

/** L03 — Horaire de la ligue */
export default async function Page({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const user = await requireUser();
  const o = await orNotFound(() => getLeagueOverview(user.id, leagueId));
  const games = await listLeagueGames(user.id, leagueId, "all");
  const tz = o.league.timezone;
  const months = new Map<string, typeof games>();
  for (const g of games) { const k = monthFmt(tz).format(new Date(g.startsAt)); months.set(k, [...(months.get(k) ?? []), g]); }
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl font-bold">Horaire de la ligue</h1>
        {games.length === 0 ? (
          <EmptyState icon={<CalendarPlus />} title="Aucun match à l'horaire" body={o.isAdmin ? "Ajoute le premier match avec le formulaire. Il apparaîtra tout seul chez les deux équipes." : "L'horaire n'est pas encore publié."} />
        ) : [...months].map(([m, list]) => (
          <section key={m} aria-label={m} className="flex flex-col gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{m}</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {list.map((g) => <LeagueGameRow key={g.id} g={g} tz={tz} href={o.isAdmin ? `/ligue/${leagueId}/horaire/${g.id}` : undefined} />)}
            </ul>
          </section>
        ))}
      </div>
      {o.isAdmin && (
        <aside aria-labelledby="add-h" className="flex h-fit flex-col gap-3 rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-32">
          <h2 id="add-h" className="font-bold">Ajouter un match</h2>
          {o.teams.length < 2 ? <Banner tone="info">Il faut au moins deux équipes dans la ligue.</Banner>
            : <GameForm leagueId={leagueId} gameId={null} teams={o.teams} defaults={{ time: "21:00" }} />}
        </aside>
      )}
    </div>
  );
}
