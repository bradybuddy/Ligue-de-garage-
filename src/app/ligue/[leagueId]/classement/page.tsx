import { Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getLeagueOverview, getStandings } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { StatsTable } from "@/components/ui/stats-table";
import { EmptyState } from "@/components/ui/feedback";

/** L05 — Classement (2 pts victoire, 1 pt nulle ou défaite en prolongation) */
export default async function Page({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const user = await requireUser();
  const o = await orNotFound(() => getLeagueOverview(user.id, leagueId));
  const rows = await getStandings(user.id, leagueId);
  const groups = [...o.divisions.map((d) => ({ id: d.id as string | null, name: d.name })), { id: null, name: o.divisions.length ? "Sans division" : "Classement" }]
    .map((d) => ({ ...d, rows: rows.filter((r) => r.divisionId === d.id) })).filter((g) => g.rows.length);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold">Classement</h1>
      {!rows.some((r) => r.gp > 0) && <EmptyState icon={<Trophy />} title="Pas encore de résultats" body="Le classement se calcule tout seul dès qu'un pointage final est entré." />}
      {groups.map((g) => (
        <section key={g.id ?? "none"} aria-labelledby={`h-${g.id ?? "none"}`} className="flex flex-col gap-2">
          {o.divisions.length > 0 && <h2 id={`h-${g.id ?? "none"}`} className="text-lg font-bold">{g.name}</h2>}
          <StatsTable caption={`Classement ${g.name}`} initialSort="pts"
            cols={[{ key: "team", label: "Équipe" }, { key: "gp", label: "Parties jouées", abbr: "PJ", numeric: true }, { key: "w", label: "Victoires", abbr: "V", numeric: true },
              { key: "l", label: "Défaites", abbr: "D", numeric: true }, { key: "t", label: "Nulles", abbr: "N", numeric: true }, { key: "otl", label: "Défaites en prolongation", abbr: "DP", numeric: true },
              { key: "pts", label: "Points", abbr: "PTS", numeric: true }, { key: "gf", label: "Buts pour", abbr: "BP", numeric: true }, { key: "ga", label: "Buts contre", abbr: "BC", numeric: true }]}
            rows={g.rows.map((r) => ({ team: r.teamName, gp: r.gp, w: r.w, l: r.l, t: r.t, otl: r.otl, pts: r.pts, gf: r.gf, ga: r.ga }))} />
        </section>
      ))}
      <p className="text-sm text-muted">2 points pour une victoire, 1 pour une nulle ou une défaite en prolongation.</p>
    </div>
  );
}
