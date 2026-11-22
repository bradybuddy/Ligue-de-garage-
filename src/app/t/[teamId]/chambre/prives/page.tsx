import { Stub } from "@/components/app/stub";

/** S17 — Messages privés (à venir) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Stub id="S17" title="Messages privés" purpose="Discussions 1 à 1 entre coéquipiers." milestone="jalon 3" back={{ href: `/t/${teamId}/chambre`, label: "La chambre" }} />;
}
