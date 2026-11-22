import "server-only";

export const isProd = process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1";

/** Erreur d'envoi : `retry` = vaut la peine de réessayer (réseau, 429, 5xx). */
export class SendError extends Error {
  constructor(message: string, public retry: boolean) { super(message); }
}

export interface SendResult { provider: string; id: string }

export async function postForm(url: string, auth: string, form: Record<string, string>) {
  return fetch(url, { method: "POST", headers: { authorization: auth, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form) });
}

export function failFromResponse(provider: string, status: number, text: string): never {
  // Pas de données personnelles dans le message : seulement le code et le début de la réponse
  throw new SendError(`${provider} ${status}: ${text.slice(0, 200)}`, status === 429 || status >= 500);
}
