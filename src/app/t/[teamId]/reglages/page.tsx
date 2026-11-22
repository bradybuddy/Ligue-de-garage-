import { Stub } from "@/components/app/stub";

/** S25 — Réglages de l'équipe (à venir) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Stub id="S25" title="Réglages de l'équipe" purpose="Maximum de joueurs et gardiens, délai des rappels, spares automatiques, liste d'attente, tournée, frais." milestone="jalon 2" back={{ href: `/t/${teamId}/plus`, label: "Plus" }} />;
}
