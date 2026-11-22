import Link from "next/link";
import { CalendarPlus, MapPin, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getEventDetail, getTeamForUser, listEvents, listMembers } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { fmtLongDate, fmtTime } from "@/lib/time";
import { AttendanceCounter } from "@/components/ui/attendance";
import { EmptyState } from "@/components/ui/feedback";
import { MatchCard } from "@/components/ui/match-card";
import { MyAttendance } from "@/components/app/my-attendance";
import { LiveRefresh } from "@/components/app/live-refresh";

/** S05 — Accueil de l'équipe */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const user = await requireUser();
  const { team, me } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const [events, members] = await Promise.all([listEvents(user.id, teamId, "upcoming"), listMembers(user.id, teamId)]);
  const manager = me.role !== "member";
  const base = `/t/${teamId}`;
  const nextEv = events.find((e) => e.status === "scheduled");
  const detail = nextEv ? await getEventDetail(user.id, nextEv.id) : null;
  const tz = team.timezone;

  return (
    <div className="flex flex-col gap-6">
      <LiveRefresh ms={15000} />
      <h1 className="sr-only">Accueil — {team.name}</h1>

      {manager && members.length <= 1 && (
        <EmptyState icon={<UserPlus />} title="Ton équipe est encore vide" body="Ajoute tes joueurs avec leur cellulaire : ils pourront répondre par texto, sans appli."
          action={<Link href={`${base}/alignement/nouveau`} className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">Ajouter un joueur</Link>} />
      )}

      {detail && nextEv ? (
        <section aria-labelledby="next-h" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-1">
            <h2 id="next-h" className="text-sm font-bold uppercase tracking-wide text-muted">Prochain match</h2>
            <p className="font-display text-3xl font-bold first-letter:uppercase">{fmtLongDate(nextEv.startsAt, tz)} · {fmtTime(nextEv.startsAt, tz)}</p>
            <p className="font-semibold">{nextEv.opponent ? `contre ${nextEv.opponent}` : nextEv.title ?? "Partie"}</p>
            {nextEv.venue && <p className="flex items-center gap-1 text-muted"><MapPin aria-hidden className="size-4 shrink-0" />{nextEv.venue}</p>}
          </div>
          {detail.me && (
            <MyAttendance teamId={teamId} eventId={nextEv.id} memberId={detail.me.id} status={detail.me.status} />
          )}
          <div className="grid grid-cols-2 gap-4">
            <AttendanceCounter label="Joueurs" count={detail.counts.in} max={detail.cap.players} />
            <AttendanceCounter label="Gardiens" count={detail.counts.goaliesIn} max={detail.cap.goalies} />
          </div>
          <Link href={`${base}/matchs/${nextEv.id}`} className="self-start font-semibold text-accent-strong underline underline-offset-4">
            Voir qui vient ({detail.counts.noReply} sans réponse)
          </Link>
        </section>
      ) : (
        <EmptyState icon={<CalendarPlus />} title="Aucun match à venir"
          body={manager ? "Ajoute ton prochain match : tout le monde reçoit la question « t'es là? » 48 h avant." : "Ton gérant n'a pas encore mis l'horaire. On t'avertit dès qu'il est là."}
          action={manager ? <Link href={`${base}/horaire/nouveau`} className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">Ajouter un match</Link> : undefined} />
      )}

      {events.length > 1 && (
        <section aria-labelledby="after-h" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="after-h" className="text-lg font-bold">Ensuite</h2>
            <Link href={`${base}/horaire`} className="text-sm font-semibold text-accent-strong underline underline-offset-4">Tout l&apos;horaire</Link>
          </div>
          {events.filter((e) => e.id !== nextEv?.id).slice(0, 3).map((e) => (
            <MatchCard key={e.id} href={`${base}/matchs/${e.id}`} startsAt={new Date(e.startsAt)} timeZone={tz} opponent={e.opponent ?? e.title ?? undefined}
              venue={e.venue ?? "Lieu à confirmer"} state={e.status === "cancelled" ? "cancelled" : "upcoming"} myStatus={e.myStatus ?? undefined} inCount={e.inCount} max={e.cap} />
          ))}
        </section>
      )}
    </div>
  );
}
