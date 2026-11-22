import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getLeagueOverview, type LeagueTeam } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { APP_URL } from "@/lib/messages";
import { AddTeamForm, DivisionsEditor, TeamDivisionSelect } from "@/components/app/league-forms";
import { CopyButton } from "@/components/app/copy-button";
import { ConfirmAction } from "@/components/app/confirm-action";
import { Banner, EmptyState } from "@/components/ui/feedback";
import { detachTeamAction } from "@/app/actions/league";

/** L02 — Équipes et divisions */
export default async function Page({ params, searchParams }: { params: Promise<{ leagueId: string }>; searchParams: Promise<{ bienvenue?: string }> }) {
  const { leagueId } = await params;
  const { bienvenue } = await searchParams;
  const user = await requireUser();
  const o = await orNotFound(() => getLeagueOverview(user.id, leagueId));
  const groups = [...o.divisions.map((d) => ({ id: d.id, name: d.name })), { id: null, name: "Sans division" }]
    .map((d) => ({ ...d, teams: o.teams.filter((t) => t.divisionId === d.id) }))
    .filter((g) => g.teams.length || g.id);
  const row = (t: LeagueTeam) => (
    <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold">{t.name}</p>
        <p className="text-sm text-muted">{t.members} membre{t.members > 1 ? "s" : ""}{t.managerName ? ` · gérant : ${t.managerName}` : " · pas encore de gérant"}</p>
      </div>
      {o.isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <TeamDivisionSelect leagueId={leagueId} team={t} divisions={o.divisions} />
          <span className="rounded-md bg-surface-2 px-2 py-1 font-mono text-sm font-bold tracking-widest" aria-label={`Code : ${t.inviteCode.split("").join(" ")}`}>{t.inviteCode}</span>
          <CopyButton text={`${APP_URL}/j/${t.inviteCode}`} label="Lien" />
          <ConfirmAction label="Retirer" variant="ghost" title={`Retirer ${t.name} de la ligue?`} confirmLabel="Retirer de la ligue"
            body="L'équipe garde ses joueurs et son horaire à elle. Elle ne verra plus l'horaire ni le classement de la ligue." action={detachTeamAction.bind(null, leagueId, t.id)} />
        </div>
      )}
    </li>
  );
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold">Équipes</h1>
      {bienvenue && <Banner tone="info">Ligue créée! Ajoute maintenant tes équipes, puis l&apos;horaire.</Banner>}
      {o.teams.length === 0 && <EmptyState icon={<Users />} title="Aucune équipe encore" body={o.isAdmin ? "Ajoute ta première équipe avec le formulaire ci-dessous." : "Aucune équipe dans cette ligue."} />}
      {groups.filter((g) => g.teams.length).map((g) => (
        <section key={g.id ?? "none"} aria-label={g.name} className="overflow-hidden rounded-lg border border-border bg-surface">
          <h2 className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2 text-sm font-bold">{g.name}<span className="tabular text-muted">{g.teams.length}</span></h2>
          <ul className="divide-y divide-border">{g.teams.map(row)}</ul>
        </section>
      ))}
      {o.isAdmin && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section aria-labelledby="add-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <h2 id="add-h" className="font-bold">Ajouter une équipe</h2>
            <AddTeamForm leagueId={leagueId} divisions={o.divisions} />
          </section>
          <section aria-labelledby="div-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <h2 id="div-h" className="font-bold">Divisions</h2>
            <DivisionsEditor leagueId={leagueId} divisions={o.divisions} />
          </section>
        </div>
      )}
    </div>
  );
}
