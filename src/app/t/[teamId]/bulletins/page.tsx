import { Stub } from "@/components/app/stub";

/** S19 — Bulletins et sondages (à venir) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Stub id="S19" title="Bulletins et sondages" purpose="Annonces épinglées et sondages (ex. « party de fin de saison : vendredi ou samedi? »)." milestone="jalon 3" back={{ href: `/t/${teamId}/plus`, label: "Plus" }} />;
}
