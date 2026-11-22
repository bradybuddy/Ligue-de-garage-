import { unsubscribeEmail } from "@/lib/data";
import { readUnsubscribeToken } from "@/lib/unsubscribe";

/** Désabonnement en un clic (RFC 8058) : POST envoyé par Gmail, Outlook, Apple Mail. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const t = readUnsubscribeToken((await params).token);
  if (!t) return new Response("lien invalide", { status: 400 });
  await unsubscribeEmail(t.memberId, t.category);
  return new Response("ok");
}
