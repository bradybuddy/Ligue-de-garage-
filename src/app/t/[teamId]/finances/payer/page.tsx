import { Stub } from "@/components/app/stub";

/** S21 — Payer (à venir) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Stub id="S21" title="Payer" purpose="Paiement par carte (Stripe), sans quitter l'appli." milestone="jalon 3" back={{ href: `/t/${teamId}/finances`, label: "Frais" }} />;
}
