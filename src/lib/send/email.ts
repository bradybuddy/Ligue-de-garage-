import { APP_NAME } from "@/lib/brand";
import "server-only";
import { failFromResponse, isProd, SendError, type SendResult } from "./config";

export interface EmailMessage { to: string; subject: string; text: string; unsubscribeUrl?: string }

/**
 * Courriel transactionnel. Pilotes :
 *  - resend  : API officielle Resend (RESEND_API_KEY, domaine vérifié)
 *  - mailpit : boîte de test locale (MAILPIT_URL)
 *  - console : développement sans rien
 */
export async function sendEmail(m: EmailMessage): Promise<SendResult> {
  const from = process.env.EMAIL_FROM ?? `${APP_NAME} <noreply@buddyandbeer.local>`;
  const headers: Record<string, string> = {};
  if (m.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${m.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"; // RFC 8058 : désabonnement en un clic
  }
  if (process.env.RESEND_API_KEY) {
    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [m.to], subject: m.subject, text: m.text, headers }),
      });
    } catch (e) {
      throw new SendError(`resend réseau: ${(e as Error).message}`, true);
    }
    const text = await res.text();
    if (!res.ok) failFromResponse("resend", res.status, text);
    return { provider: "resend", id: (JSON.parse(text) as { id: string }).id };
  }
  if (process.env.MAILPIT_URL && !isProd) {
    const [, name = "", addr = from] = from.match(/^(.*)<(.+)>$/) ?? [];
    const res = await fetch(`${process.env.MAILPIT_URL}/api/v1/send`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ From: { Email: addr.trim(), Name: name.trim() }, To: [{ Email: m.to }], Subject: m.subject, Text: m.text, Headers: headers }),
    });
    if (!res.ok) failFromResponse("mailpit", res.status, await res.text());
    return { provider: "mailpit", id: ((await res.json()) as { ID: string }).ID };
  }
  if (isProd) throw new SendError("Aucun fournisseur de courriel configuré", false);
  console.info(`[courriel dev] → ${m.to.replace(/^(.).*@/, "$1•••@")} : ${m.subject}`);
  return { provider: "console", id: `dev-${Date.now()}` };
}
