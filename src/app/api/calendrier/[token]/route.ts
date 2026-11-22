import { getCalendarFeed } from "@/lib/data";
import { buildCalendar } from "@/lib/ics";
import { APP_URL } from "@/lib/messages";
import { fmtTime } from "@/lib/time";

const status = { in: "IN ✅", out: "OUT", waitlist: "en attente", no_reply: "pas encore répondu" } as const;

/** Abonnement calendrier d'un joueur : /api/calendrier/<jeton>.ics (webcal:// pour s'abonner). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const feed = await getCalendarFeed((await params).token.replace(/\.ics$/, ""));
  if (!feed) return new Response("calendrier introuvable", { status: 404 });
  const { team, events } = feed;
  const body = buildCalendar(team.name, events.map((e) => {
    const url = `${APP_URL}/t/${team.id}/matchs/${e.id}`;
    const what = e.opponent ? `${team.name} contre ${e.opponent}` : e.title ?? (e.type === "practice" ? `${team.name} — pratique` : team.name);
    return {
      uid: e.id, start: e.startsAt, end: e.endsAt, summary: what, location: e.venue, url, cancelled: e.status === "cancelled", updatedAt: e.updatedAt,
      description: [`Ta réponse : ${status[e.myStatus ?? "no_reply"]}`, e.homeRoom ? `Chambre ${e.homeRoom}` : null, `Répondre : ${url}`,
        `(${fmtTime(e.startsAt, team.timezone)}, heure de Montréal)`].filter(Boolean).join("\n"),
    };
  }));
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `inline; filename="buddy-and-beer.ics"`,
      "cache-control": "private, max-age=300",
    },
  });
}
