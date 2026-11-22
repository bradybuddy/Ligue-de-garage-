import { requireUser } from "@/lib/auth";
import { getTeamForUser } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { PageTitle } from "@/components/app/page-title";
import { SettingsForm } from "@/components/app/settings-form";
import { Banner } from "@/components/ui/feedback";

/** S25 — Réglages de l'équipe */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const user = await requireUser();
  const { team, me } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const back = { href: `/t/${teamId}/plus`, label: "Plus" };
  if (me.role === "member") return (<><PageTitle title="Réglages de l'équipe" back={back} /><Banner tone="warning">Seuls le gérant et l&apos;adjoint peuvent changer les réglages.</Banner></>);
  return (<><PageTitle title="Réglages de l'équipe" back={back} /><SettingsForm team={team} /></>);
}
