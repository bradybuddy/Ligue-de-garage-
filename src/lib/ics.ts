// Calendrier iCalendar (RFC 5545). Heures émises en UTC avec « Z » : aucun calendrier ne peut
// se tromper de fuseau au changement d'heure (bogue reproché à l'original).

export interface IcsEvent {
  uid: string;
  start: string; // ISO UTC
  end: string | null;
  summary: string;
  location: string | null;
  description: string;
  url: string;
  cancelled: boolean;
  updatedAt: string;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Coupe les lignes à 75 octets (pas caractères : les accents comptent double en UTF-8). */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function buildCalendar(name: string, events: IcsEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Buddy & Beer//Horaire//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`, "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of events) {
    const end = e.end ?? new Date(Date.parse(e.start) + 90 * 60_000).toISOString();
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@buddyandbeer`,
      `DTSTAMP:${utc(now.toISOString())}`,
      `LAST-MODIFIED:${utc(e.updatedAt)}`,
      `SEQUENCE:${Math.floor((Date.parse(e.updatedAt) - Date.UTC(2026, 0, 1)) / 1000)}`,
      `DTSTART:${utc(e.start)}`,
      `DTEND:${utc(end)}`,
      `SUMMARY:${esc((e.cancelled ? "ANNULÉ — " : "") + e.summary)}`,
      ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
      `DESCRIPTION:${esc(e.description)}`,
      `URL:${e.url}`,
      `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
