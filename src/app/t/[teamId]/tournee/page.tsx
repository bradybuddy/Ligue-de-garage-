import { Stub } from "@/components/app/stub";

/** S22 — La tournée (à venir) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Stub id="S22" title="La tournée" purpose="Qui apporte la bière : choisi automatiquement parmi les joueurs IN, celui qui l'a fait le moins souvent." milestone="jalon 2" back={{ href: `/t/${teamId}/plus`, label: "Plus" }} />;
}
