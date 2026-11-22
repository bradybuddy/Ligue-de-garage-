import { requireUser } from "@/lib/auth";
import { getMember, getTeamForUser } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { prettyPhone } from "@/lib/sms";
import { PageTitle } from "@/components/app/page-title";
import { MemberForm } from "@/components/app/member-form";
import { ConfirmAction } from "@/components/app/confirm-action";
import { Banner } from "@/components/ui/feedback";
import { removeMemberAction } from "@/app/actions/members";

/** S12 — Modifier un joueur */
export default async function Page({ params }: { params: Promise<{ teamId: string; memberId: string }> }) {
  const { teamId, memberId } = await params;
  const user = await requireUser();
  const { me } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const m = await orNotFound(() => getMember(user.id, teamId, memberId));
  const back = { href: `/t/${teamId}/alignement`, label: "Alignement" };
  if (me.role === "member") return (<><PageTitle title={m.displayName} back={back} /><Banner tone="warning">Seuls le gérant et l&apos;adjoint peuvent modifier une fiche.</Banner></>);
  return (
    <div className="flex flex-col gap-8">
      <div>
        <PageTitle title={m.displayName} back={back} sub={m.userId ? "A un compte Buddy & Beer." : "Pas de compte : il répond par texto ou courriel."} />
        <MemberForm teamId={teamId} memberId={m.id} canSetRole={me.role === "manager"} defaults={{
          displayName: m.displayName, email: m.email ?? "", phone: m.phone ? prettyPhone(m.phone) : "", class: m.class, role: m.role,
          position: m.position, jerseyNumber: m.jerseyNumber?.toString() ?? "", smsOptIn: m.smsOptIn ? "on" : "",
        }} />
      </div>
      <section aria-labelledby="rm-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 id="rm-h" className="font-bold">Retirer de l&apos;équipe</h2>
        <p className="text-sm text-muted">Il ne recevra plus rien. Ses stats et ses frais passés restent dans l&apos;historique.</p>
        <div><ConfirmAction label="Retirer" title={`Retirer ${m.displayName}?`} confirmLabel="Retirer de l'équipe"
          body="Il ne recevra plus de rappels. Tu pourras l'ajouter de nouveau plus tard." action={removeMemberAction.bind(null, teamId, m.id)} /></div>
      </section>
    </div>
  );
}
