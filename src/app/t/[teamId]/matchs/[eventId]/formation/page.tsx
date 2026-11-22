import { Stub } from "@/components/app/stub";

/** S10 — Formation et trios (à venir) */
export default async function Page({ params }: { params: Promise<{ eventId: string; teamId: string }> }) {
  const { eventId, teamId } = await params;
  return <Stub id="S10" title="Formation et trios" purpose="Place les joueurs IN par trio, ou fais deux équipes Foncé/Pâle au hasard." milestone="jalon 4" back={{ href: `/t/${teamId}/matchs/${eventId}`, label: "Retour au match" }} />;
}
