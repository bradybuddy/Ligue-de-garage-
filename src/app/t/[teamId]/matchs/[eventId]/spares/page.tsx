import Link from "next/link";
import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSparesPanel, getTeamForUser, type Channel } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { fmtAgo, fmtLongDate, fmtTime } from "@/lib/time";
import { PageTitle } from "@/components/app/page-title";
import { SparesForm } from "@/components/app/spares-form";
import { Banner, EmptyState } from "@/components/ui/feedback";

const chLabel: Record<Channel, string> = { push: "notif", sms: "texto", email: "courriel" };

/** S14 — Inviter des spares */
export default async function Page({ params }: { params: Promise<{ teamId: string; eventId: string }> }) {
  const { teamId, eventId } = await params;
  const user = await requireUser();
  const { me } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const back = { href: `/t/${teamId}/matchs/${eventId}`, label: "Retour au match" };
  if (me.role === "member") return (<><PageTitle title="Inviter des spares" back={back} /><Banner tone="warning">Seuls le gérant et l&apos;adjoint peuvent inviter des spares.</Banner></>);
  const panel = await orNotFound(() => getSparesPanel(user.id, eventId));
  if (panel.team.id !== teamId) notFound();
  const { event: ev, team, open } = panel;
  const tz = team.timezone;
  const need = [open.players ? `${open.players} joueur${open.players > 1 ? "s" : ""}` : null, open.goalies ? `${open.goalies} gardien${open.goalies > 1 ? "s" : ""}` : null].filter(Boolean).join(" et ");

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Inviter des spares" back={back} sub={<span className="first-letter:uppercase">{fmtLongDate(ev.startsAt, tz)} · {fmtTime(ev.startsAt, tz)}{ev.opponent ? ` · contre ${ev.opponent}` : ""}</span>} />
      {ev.status !== "scheduled" ? (
        <Banner tone="warning">Ce match n&apos;est plus à l&apos;horaire.</Banner>
      ) : (
        <>
          <Banner tone={need ? "warning" : "info"}>
            {need ? `Il manque ${need}.` : "Le match est complet. Les spares qui disent oui iront sur la liste d'attente."}
            {team.autoSparesEnabled && !ev.sparesInvitedAt && ` Sans rien faire, l'appli invitera les spares ${team.autoSparesHoursBefore} h avant le match s'il manque du monde.`}
          </Banner>
          {panel.spares.length === 0 ? (
            <EmptyState icon={<UserPlus />} title="Aucun spare dans l'alignement" body="Ajoute tes spares avec leur cellulaire : ils recevront l'invitation par texto et répondront Y ou N."
              action={<Link href={`/t/${teamId}/alignement/nouveau`} className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">Ajouter un spare</Link>} />
          ) : (
            <SparesForm teamId={teamId} eventId={ev.id} defaultChannels={team.autoSparesChannels as Channel[]}
              spares={panel.spares.map((s) => ({
                id: s.member.id, name: s.member.displayName, goalie: s.member.position === "goalie", status: s.status,
                invitedLabel: s.invitedAt ? `invité ${fmtAgo(s.invitedAt)} (${s.invitedChannels.map((c) => chLabel[c]).join(", ")})` : null,
                reachable: [s.member.phone && s.member.smsOptIn ? "sms" : null, s.member.email ? "email" : null, s.member.userId ? "push" : null].filter(Boolean) as Channel[],
              }))} />
          )}
        </>
      )}
    </div>
  );
}
