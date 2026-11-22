import "server-only";
import webpush from "web-push";
import { SendError, type SendResult } from "./config";

export interface PushSub { endpoint: string; p256dh: string; auth: string }

let configured = false;
export function pushConfigured() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@buddyandbeer.local", pub, priv);
  configured = true;
  return true;
}

/** Notif Web Push. `gone` = l'abonnement n'existe plus (404/410) : à supprimer. */
export async function sendPush(sub: PushSub, payload: { title: string; body: string; url: string }): Promise<SendResult & { gone?: boolean }> {
  if (!pushConfigured()) throw new SendError("Web Push n'est pas configuré", false);
  try {
    const r = await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 6 * 3600 });
    return { provider: "webpush", id: r.headers?.location ?? `push-${Date.now()}` };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 0;
    if (status === 404 || status === 410) return { provider: "webpush", id: "gone", gone: true };
    throw new SendError(`webpush ${status}`, status === 429 || status >= 500 || status === 0);
  }
}
