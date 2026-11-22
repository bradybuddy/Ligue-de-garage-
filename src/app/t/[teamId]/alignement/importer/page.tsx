import { Stub } from "@/components/app/stub";

/** S13 — Importer l'alignement (à venir) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Stub id="S13" title="Importer l'alignement" purpose="Téléverse ta liste Excel ou ramène les joueurs de la saison passée." milestone="jalon 3" back={{ href: `/t/${teamId}/alignement`, label: "Alignement" }} />;
}
