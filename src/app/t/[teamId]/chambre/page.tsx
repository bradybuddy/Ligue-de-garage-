import { requireUser } from "@/lib/auth";
import { getTeamChat } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { ChatRoom } from "@/components/app/chat-room";
import { LiveRefresh } from "@/components/app/live-refresh";

/** S16 — La chambre (chat d'équipe) */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const user = await requireUser();
  const messages = await orNotFound(() => getTeamChat(user.id, teamId));
  return (
    <div className="flex flex-col gap-4">
      <LiveRefresh ms={4000} />
      <h1 className="font-display text-3xl font-bold">La chambre</h1>
      <ChatRoom teamId={teamId} messages={messages} gifEnabled={!!process.env.GIPHY_API_KEY} />
    </div>
  );
}
