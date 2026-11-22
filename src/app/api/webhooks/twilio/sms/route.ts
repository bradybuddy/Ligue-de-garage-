import { handleInboundSms } from "@/lib/data";
import { twiml, validTwilioSignature } from "@/lib/twilio";

/** Texto entrant (Twilio → POST application/x-www-form-urlencoded). Répond en TwiML. */
export async function POST(req: Request) {
  const form = await req.formData();
  const params = Object.fromEntries([...form].map(([k, v]) => [k, String(v)]));
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (token) {
    const url = process.env.TWILIO_WEBHOOK_URL ?? req.url; // l'URL publique exacte configurée chez Twilio
    if (!validTwilioSignature(token, url, params, req.headers.get("x-twilio-signature"))) {
      return new Response("signature invalide", { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") {
    return new Response("TWILIO_AUTH_TOKEN manquant", { status: 503 });
  }
  if (!params.From || params.Body === undefined) return new Response("From et Body requis", { status: 400 });
  const reply = await handleInboundSms(params.From, params.Body, params.MessageSid);
  return new Response(twiml(reply), { headers: { "content-type": "text/xml; charset=utf-8" } });
}
