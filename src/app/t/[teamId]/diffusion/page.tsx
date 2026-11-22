import { Stub } from "@/components/app/stub";

/** S18 — Diffusion (à venir) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Stub id="S18" title="Diffusion" purpose="Un message à toute l'équipe par notif, texto ou courriel." milestone="jalon 2" back={{ href: `/t/${teamId}/plus`, label: "Plus" }} />;
}
