// Heures : tout est stocké en UTC ; on convertit avec le fuseau de l'équipe.
// Pas de dépendance : Intl suffit, et gère l'heure avancée.

export const DEFAULT_TZ = "America/Toronto";

/** Décalage (ms) du fuseau `tz` à l'instant `utcMs` : heure locale - UTC. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - (utcMs - (utcMs % 1000));
}

/**
 * « 2026-11-26 » + « 21:15 » à Montréal → Date UTC.
 * Deux passes pour tomber juste autour du changement d'heure.
 * Une heure qui n'existe pas (02:30 le jour du passage à l'heure avancée) avance d'une heure.
 */
export function zonedToUtc(date: string, time: string, tz: string = DEFAULT_TZ): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const naive = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  let guess = naive - tzOffsetMs(naive, tz);
  guess = naive - tzOffsetMs(guess, tz);
  return new Date(guess);
}

/** Date UTC → { date: "2026-11-26", time: "21:15" } dans le fuseau. */
export function utcToZonedParts(d: Date | string, tz: string = DEFAULT_TZ): { date: string; time: string } {
  const dt = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(dt);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}

const clean = (s: string) => s.replace(/\./g, "").replace(/\s+/g, " ").trim();

/** « jeu 26 nov » */
export function fmtShortDate(d: Date | string, tz: string = DEFAULT_TZ) {
  return clean(new Intl.DateTimeFormat("fr-CA", { weekday: "short", day: "numeric", month: "short", timeZone: tz }).format(new Date(d)));
}
/** « jeudi 26 novembre » */
export function fmtLongDate(d: Date | string, tz: string = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(new Date(d));
}
/** « 21 h 15 » */
export function fmtTime(d: Date | string, tz: string = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(d));
}
/** Clé de jour (pour grouper l'horaire) */
export function dayKey(d: Date | string, tz: string = DEFAULT_TZ) {
  return utcToZonedParts(d, tz).date;
}
/** « il y a 5 min », « hier » */
export function fmtAgo(d: Date | string, now = new Date()) {
  const s = Math.round((now.getTime() - new Date(d).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86400);
  return days === 1 ? "hier" : `il y a ${days} jours`;
}
