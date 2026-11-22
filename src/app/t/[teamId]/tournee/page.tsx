import Link from "next/link";
import { Beer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getBeerOverview } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { fmtShortDate, fmtTime } from "@/lib/time";
import { PageTitle } from "@/components/app/page-title";
import { BeerOptOut, BeerPicker } from "@/components/app/beer-controls";
import { Banner, EmptyState } from "@/components/ui/feedback";
import { BeerCard } from "@/components/ui/beer-card";

/** S22 — La tournée */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const user = await requireUser();
  const o = await orNotFound(() => getBeerOverview(user.id, teamId));
  const tz = o.team.timezone;
  const back = { href: `/t/${teamId}/plus`, label: "Plus" };
  if (!o.enabled) {
    return (<><PageTitle title="La tournée" back={back} /><Banner tone="info">La tournée est désactivée pour cette équipe.{o.canManage && <> <Link href={`/t/${teamId}/reglages`} className="font-semibold underline">L&apos;activer</Link></>}</Banner></>);
  }
  const max = Math.max(1, ...o.standings.map((s) => s.count));
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="La tournée" back={back} sub="24 h avant chaque match, l'appli choisit un joueur IN parmi ceux qui ont apporté la bière le moins souvent cette saison, et l'avise." />

      <section aria-labelledby="next-h" className="flex flex-col gap-3">
        <h2 id="next-h" className="text-lg font-bold">Prochains matchs</h2>
        {o.upcoming.length === 0 && <EmptyState icon={<Beer />} title="Aucun match à venir" body="La tournée se décide pour chaque match de l'horaire." />}
        {o.upcoming.map((u) => (
          <div key={u.event.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <Link href={`/t/${teamId}/matchs/${u.event.id}`} className="font-semibold hover:underline">
              {fmtShortDate(u.event.startsAt, tz)} · {fmtTime(u.event.startsAt, tz)}{u.event.opponent ? ` · contre ${u.event.opponent}` : ""}
            </Link>
            <BeerCard name={u.memberName} isMe={u.memberId === o.me.memberId} />
            {o.canManage && <BeerPicker teamId={teamId} eventId={u.event.id} current={u.memberId} players={u.inPlayers} />}
          </div>
        ))}
      </section>

      {o.me.memberId && (
        <section aria-labelledby="me-h" className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-2">
          <h2 id="me-h" className="sr-only">Ma participation</h2>
          <BeerOptOut teamId={teamId} optOut={o.me.optOut} />
        </section>
      )}

      <section aria-labelledby="count-h" className="flex flex-col gap-3">
        <h2 id="count-h" className="text-lg font-bold">Cette saison</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {o.standings.map((s) => (
            <li key={s.memberId} className="flex min-h-12 items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 break-words font-semibold">{s.name}{s.optOut && <span className="ml-2 text-sm font-normal text-muted">(hors rotation)</span>}</span>
              <span aria-hidden className="hidden h-2 w-24 overflow-hidden rounded-full bg-surface-2 sm:block"><span className="block h-full bg-accent" style={{ width: `${(100 * s.count) / max}%` }} /></span>
              <span className="w-24 text-right text-sm tabular text-muted">{s.count} tournée{s.count > 1 ? "s" : ""}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
