import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getEventDetail } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { fmtAgo, fmtLongDate, fmtTime } from "@/lib/time";
import { PageTitle } from "@/components/app/page-title";
import { WaitlistEditor } from "@/components/app/waitlist-editor";
import { Banner, EmptyState } from "@/components/ui/feedback";

const modeText = {
  top: "Quand une place se libère, le premier de la liste monte tout seul et reçoit un avis.",
  first_accept: "Quand une place se libère, toute la liste est avisée : le premier qui répond l'obtient.",
  off: "La liste d'attente automatique est désactivée dans les réglages.",
};

/** S15 — Liste d'attente */
export default async function Page({ params }: { params: Promise<{ teamId: string; eventId: string }> }) {
  const { teamId, eventId } = await params;
  const user = await requireUser();
  const d = await orNotFound(() => getEventDetail(user.id, eventId));
  if (d.team.id !== teamId) notFound();
  const back = { href: `/t/${teamId}/matchs/${eventId}`, label: "Retour au match" };
  const tz = d.team.timezone;
  const sub = <span className="first-letter:uppercase">{fmtLongDate(d.event.startsAt, tz)} · {fmtTime(d.event.startsAt, tz)}</span>;
  if (!d.canManage) return (<><PageTitle title="Liste d'attente" back={back} sub={sub} /><Banner tone="warning">Seuls le gérant et l&apos;adjoint peuvent gérer la liste d&apos;attente.</Banner></>);
  const full = d.counts.in >= d.cap.players;
  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Liste d'attente" back={back} sub={sub} />
      <Banner tone="info">
        {modeText[d.team.waitlistMode]} <Link href={`/t/${teamId}/reglages`} className="font-semibold underline underline-offset-4">Changer le mode</Link>
      </Banner>
      {d.groups.waitlist.length === 0 ? (
        <EmptyState icon={<Clock />} title="Personne en attente" body="Quand le match est complet, ceux qui répondent IN arrivent ici, dans l'ordre." />
      ) : (
        <WaitlistEditor teamId={teamId} eventId={eventId} full={full}
          items={d.groups.waitlist.map((w) => ({ id: w.id, name: w.displayName, cls: w.class, goalie: w.position === "goalie", since: w.waitlistedAt ? `en attente ${fmtAgo(w.waitlistedAt)}` : "" }))} />
      )}
    </div>
  );
}
