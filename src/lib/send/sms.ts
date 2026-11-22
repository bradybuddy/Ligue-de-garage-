import "server-only";
import { failFromResponse, isProd, postForm, SendError, type SendResult } from "./config";

/** Texto via l'API officielle de Twilio (clés du propriétaire). Sans clés : console en dev, erreur en prod. */
export async function sendSms(to: string, body: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN;
  const svc = process.env.TWILIO_MESSAGING_SERVICE_SID, from = process.env.TWILIO_FROM;
  if (!sid || !token || (!svc && !from)) {
    if (isProd) throw new SendError("Twilio n'est pas configuré", false);
    console.info(`[texto dev] → ${to.slice(0, -4)}•••• : ${body}`);
    return { provider: "console", id: `dev-${Date.now()}` };
  }
  const form: Record<string, string> = { To: to, Body: body, ...(svc ? { MessagingServiceSid: svc } : { From: from! }) };
  if (process.env.APP_URL?.startsWith("https://")) form.StatusCallback = `${process.env.APP_URL}/api/webhooks/twilio/status`;
  let res: Response;
  try {
    res = await postForm(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, form);
  } catch (e) {
    throw new SendError(`twilio réseau: ${(e as Error).message}`, true);
  }
  const text = await res.text();
  if (!res.ok) failFromResponse("twilio", res.status, text);
  return { provider: "twilio", id: (JSON.parse(text) as { sid: string }).sid };
}
