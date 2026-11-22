import Link from "next/link";
import { Trophy, LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getLeagueOverview } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { LeagueNav } from "@/components/app/league-nav";
import { signOutAction } from "@/app/actions/auth";

export default async function LeagueLayout({ children, params }: { children: React.ReactNode; params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const user = await requireUser();
  const { league, isAdmin } = await orNotFound(() => getLeagueOverview(user.id, leagueId));
  const base = `/ligue/${league.id}`;
  return (
    <div className="min-h-dvh">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:p-3">Aller au contenu</a>
      <header className="sticky top-0 z-30 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-wide items-center justify-between gap-3 px-4">
          <Link href={base} className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent"><Trophy aria-hidden className="size-4" /></span>
            <span className="truncate font-display text-xl font-bold">{league.name}</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/equipes" className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text">Mes équipes</Link>
            <form action={signOutAction}>
              <button type="submit" aria-label="Déconnexion" className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"><LogOut aria-hidden className="size-4" /></button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-wide px-4"><LeagueNav base={base} isAdmin={isAdmin} /></div>
      </header>
      <main id="contenu" className="mx-auto max-w-wide px-4 pb-16 pt-5">{children}</main>
    </div>
  );
}
