import { Stub } from "@/components/app/stub";

/** S09 — Importer l'horaire (à venir) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Stub id="S09" title="Importer l'horaire" purpose="Téléverse un CSV ou Excel, ou colle le lien iCal de ta ligue. On te montre un aperçu avant d'ajouter quoi que ce soit." milestone="jalon 3" back={{ href: `/t/${teamId}/horaire`, label: "Horaire" }} />;
}
