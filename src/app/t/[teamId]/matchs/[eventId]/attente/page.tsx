import { Stub } from "@/components/app/stub";

/** S15 — Liste d'attente (à venir) */
export default async function Page({ params }: { params: Promise<{ eventId: string; teamId: string }> }) {
  const { eventId, teamId } = await params;
  return <Stub id="S15" title="Liste d'attente" purpose="Réordonne la liste d'attente ou accepte quelqu'un à la main. La montée automatique fonctionne déjà." milestone="jalon 2" back={{ href: `/t/${teamId}/matchs/${eventId}`, label: "Retour au match" }} />;
}
