import { recordSmsStatus } from "@/lib/data";
import { validTwilioSignature } from "@/lib/twilio";

/** Statut de livraison des textos (StatusCallback de Twilio). */
export async function POST(req: Request) {
  const params = Object.fromEntries([...(await req.formData())].map(([k, v]) => [k, String(v)]));
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return new Response("non configuré", { status: 503 });
  const url = `${process.env.APP_URL}/api/webhooks/twilio/status`;
  if (!validTwilioSignature(token, url, params, req.headers.get("x-twilio-signature"))) return new Response("signature invalide", { status: 403 });
  if (params.MessageSid && params.MessageStatus) await recordSmsStatus(params.MessageSid, params.MessageStatus, params.ErrorCode);
  return new Response(null, { status: 204 });
}
