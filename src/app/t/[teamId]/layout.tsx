import Link from "next/link";
import { Beer, LogOut, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTeamForUser } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { TeamBottomNav, TeamSideNav } from "@/components/app/team-nav";
import { signOutAction } from "@/app/actions/auth";

export default async function TeamLayout({ children, params }: { children: React.ReactNode; params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const user = await requireUser(`/t/${teamId}`);
  const { team } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const base = `/t/${team.id}`;
  return (
    <div className="min-h-dvh">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:p-3">Aller au contenu</a>
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href="/equipes" className="flex min-w-0 items-center gap-2" aria-label={`${team.name} — changer d'équipe`}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent"><Beer aria-hidden className="size-4" /></span>
            <span className="truncate font-display text-xl font-bold">{team.name}</span>
          </Link>
          {team.leagueId && (
            <Link href={`/ligue/${team.leagueId}`} className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text">
              <Trophy aria-hidden className="size-4" />Ligue
            </Link>
          )}
          <form action={signOutAction}>
            <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text">
              <LogOut aria-hidden className="size-4" /><span className="hidden sm:inline">Déconnexion</span><span className="sr-only sm:hidden">Déconnexion</span>
            </button>
          </form>
        </div>
      </header>
      <div className="flex">
        <TeamSideNav base={base} teamName={team.name} />
        <main id="contenu" className="min-w-0 flex-1 px-4 pb-28 pt-5 lg:pb-10">
          <div className="mx-auto max-w-content">{children}</div>
        </main>
      </div>
      <TeamBottomNav base={base} />
    </div>
  );
}
