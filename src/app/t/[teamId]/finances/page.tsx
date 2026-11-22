import { Stub } from "@/components/app/stub";

/** S20 — Frais (à venir) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Stub id="S20" title="Frais" purpose="Qui a payé, qui doit, qui est en retard. Frais de saison et frais de spare." milestone="jalon 3" back={{ href: `/t/${teamId}/plus`, label: "Plus" }} />;
}
