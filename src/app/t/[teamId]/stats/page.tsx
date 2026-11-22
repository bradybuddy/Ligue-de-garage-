import { Stub } from "@/components/app/stub";

/** S24 — Stats (à venir) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  return <Stub id="S24" title="Stats" purpose="Buts, passes, points, minutes de punition, stats de gardien, parties jouées." milestone="jalon 3" back={{ href: `/t/${teamId}/plus`, label: "Plus" }} />;
}
