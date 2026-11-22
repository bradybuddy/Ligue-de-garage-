import { requireUser } from "@/lib/auth";
import { getTeamForUser } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { PageTitle } from "@/components/app/page-title";
import { MemberForm } from "@/components/app/member-form";
import { Banner } from "@/components/ui/feedback";

/** S12 — Ajouter un joueur */
export default async function Page({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ ajoute?: string }> }) {
  const { teamId } = await params;
  const { ajoute } = await searchParams;
  const user = await requireUser();
  const { me } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const back = { href: `/t/${teamId}/alignement`, label: "Alignement" };
  if (me.role === "member") return (<><PageTitle title="Ajouter un joueur" back={back} /><Banner tone="warning">Seuls le gérant et l&apos;adjoint peuvent modifier l&apos;alignement.</Banner></>);
  return (
    <>
      <PageTitle title="Ajouter un joueur" back={back} />
      {ajoute && <div className="mb-4"><Banner tone="info">{ajoute} est dans l&apos;équipe. Au suivant!</Banner></div>}
      <MemberForm key={ajoute ?? "new"} teamId={teamId} memberId={null} canSetRole={me.role === "manager"} defaults={{ class: "regular", position: "skater", role: "member", smsOptIn: "on" }} />
    </>
  );
}
