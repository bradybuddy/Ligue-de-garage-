import { Stub } from "@/components/app/stub";

/** S23 — Pointage (à venir) */
export default async function Page({ params }: { params: Promise<{ eventId: string; teamId: string }> }) {
  const { eventId, teamId } = await params;
  return <Stub id="S23" title="Pointage" purpose="Pointage rapide (score final), puis pointeur complet : buts, passes, punitions." milestone="jalon 3" back={{ href: `/t/${teamId}/matchs/${eventId}`, label: "Retour au match" }} />;
}
