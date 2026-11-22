import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { deletePushSubscription, savePushSubscription } from "@/lib/data";

const Sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

/** Enregistre (POST) ou retire (DELETE) l'abonnement Web Push de l'appareil. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("connexion requise", { status: 401 });
  const p = Sub.safeParse(await req.json().catch(() => null));
  if (!p.success) return new Response("abonnement invalide", { status: 400 });
  await savePushSubscription(user.id, { endpoint: p.data.endpoint, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth, userAgent: req.headers.get("user-agent") ?? undefined });
  return new Response(null, { status: 204 });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("connexion requise", { status: 401 });
  const p = z.object({ endpoint: z.string().url() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return new Response("invalide", { status: 400 });
  await deletePushSubscription(user.id, p.data.endpoint);
  return new Response(null, { status: 204 });
}
