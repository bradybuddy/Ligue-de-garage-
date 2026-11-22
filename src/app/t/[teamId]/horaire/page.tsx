import Link from "next/link";
import { CalendarPlus, CalendarSync, Plus, Upload } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTeamForUser, listEvents } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { MatchCard } from "@/components/ui/match-card";
import { EmptyState } from "@/components/ui/feedback";
import { PageTitle } from "@/components/app/page-title";
import { cn } from "@/lib/cn";

const monthFmt = (tz: string) => new Intl.DateTimeFormat("fr-CA", { month: "long", year: "numeric", timeZone: tz });

/** S06 — Horaire */
export default async function Page({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ vue?: string }> }) {
  const { teamId } = await params;
  const past = (await searchParams).vue === "passes";
  const user = await requireUser();
  const { team, me } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const events = await listEvents(user.id, teamId, past ? "past" : "upcoming");
  const manager = me.role !== "member";
  const base = `/t/${teamId}`;
  const tz = team.timezone;

  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const k = monthFmt(tz).format(new Date(e.startsAt));
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const tab = (on: boolean) => cn("inline-flex h-10 flex-1 items-center justify-center rounded-md text-sm font-semibold transition-ui", on ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text");

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Horaire" action={manager ? (
        <Link href={`${base}/horaire/nouveau`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">
          <Plus aria-hidden className="size-4" />Ajouter
        </Link>) : undefined} />

      <nav aria-label="Période" className="flex gap-1 rounded-lg bg-surface-2 p-1">
        <Link href={`${base}/horaire`} aria-current={!past ? "page" : undefined} className={tab(!past)}>À venir</Link>
        <Link href={`${base}/horaire?vue=passes`} aria-current={past ? "page" : undefined} className={tab(past)}>Passés</Link>
      </nav>

      {events.length === 0 ? (
        <EmptyState icon={<CalendarPlus />} title={past ? "Aucun match passé" : "Rien à l'horaire"}
          body={past ? "Les matchs joués apparaîtront ici avec leur score." : manager ? "Ajoute tes matchs un par un ou importe l'horaire de ta ligue." : "Ton gérant n'a pas encore entré l'horaire."}
          action={!past && manager ? <Link href={`${base}/horaire/nouveau`} className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">Ajouter un match</Link> : undefined} />
      ) : (
        [...groups].map(([month, list]) => (
          <section key={month} aria-label={month} className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{month}</h2>
            {list.map((e) => (
              <MatchCard key={e.id} href={`${base}/matchs/${e.id}`} startsAt={new Date(e.startsAt)} timeZone={tz}
                opponent={e.opponent ?? e.title ?? undefined} venue={e.venue ?? "Lieu à confirmer"}
                state={e.status === "cancelled" ? "cancelled" : e.status === "final" ? "final" : "upcoming"}
                score={e.scoreUs != null && e.scoreThem != null ? { us: e.scoreUs, them: e.scoreThem } : undefined}
                myStatus={past ? undefined : (e.myStatus ?? undefined)} inCount={past ? undefined : e.inCount} max={e.cap} />
            ))}
          </section>
        ))
      )}

      {manager && !past && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Link href={`${base}/horaire/importer`} className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text"><Upload aria-hidden className="size-4" />Importer un fichier</Link>
          <Link href={`${base}/horaire/importer?source=ical`} className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text"><CalendarSync aria-hidden className="size-4" />Synchroniser avec la ligue</Link>
        </div>
      )}
    </div>
  );
}
