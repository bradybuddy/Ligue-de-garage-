import { Stub } from "@/components/app/stub";

/** S14 — Inviter des spares (à venir) */
export default async function Page({ params }: { params: Promise<{ eventId: string; teamId: string }> }) {
  const { eventId, teamId } = await params;
  return <Stub id="S14" title="Inviter des spares" purpose="Choisis des spares et invite-les par notif, texto ou courriel. En automatique, l'appli le fera toute seule s'il manque du monde." milestone="jalon 2" back={{ href: `/t/${teamId}/matchs/${eventId}`, label: "Retour au match" }} />;
}
