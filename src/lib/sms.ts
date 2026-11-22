// Logique des textos, indépendante du fournisseur (Twilio ou simulateur).

/** Normalise un numéro nord-américain en E.164. Retourne null si invalide. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** 514-555-1234 */
export function prettyPhone(e164: string | null): string {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "").slice(-10);
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export type SmsIntent =
  | { kind: "answer"; status: "in" | "out"; code: string | null }
  | { kind: "stop" }
  | { kind: "help" }
  | { kind: "unknown" };

const YES = new Set(["Y", "YES", "O", "OUI", "IN", "OK", "👍"]);
const NO = new Set(["N", "NO", "NON", "OUT", "👎"]);
const STOP = new Set(["STOP", "ARRET", "ARRÊT", "UNSUBSCRIBE", "DESABONNER"]);

/** « y », « Oui! », « Y 482 », « non 517 », « IN » → intention. */
export function parseSmsReply(body: string): SmsIntent {
  const cleaned = body
    .trim()
    .toUpperCase()
    .replace(/[!.?,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return { kind: "unknown" };
  if (STOP.has(cleaned)) return { kind: "stop" };
  if (cleaned === "AIDE" || cleaned === "HELP") return { kind: "help" };
  const [first, second] = cleaned.split(" ");
  const code = second && /^\d{3}$/.test(second) ? second : null;
  if (YES.has(first!)) return { kind: "answer", status: "in", code };
  if (NO.has(first!)) return { kind: "answer", status: "out", code };
  return { kind: "unknown" };
}

/** Libellés pour départager plusieurs matchs en attente : équipe si elles diffèrent, heure si même jour. */
export function disambiguationLabels(items: { teamName: string; day: string; time: string }[]): string[] {
  const multiTeam = new Set(items.map((i) => i.teamName)).size > 1;
  const sameDay = new Set(items.map((i) => i.day)).size < items.length;
  return items.map((i) => [multiTeam ? i.teamName : null, i.day, sameDay && !multiTeam ? i.time : null].filter(Boolean).join(", "));
}
