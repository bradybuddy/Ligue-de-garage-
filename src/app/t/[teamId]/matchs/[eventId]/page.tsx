import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, DoorOpen, MapPin, Pencil, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getEventDetail, type RosterEntry } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { fmtAgo, fmtLongDate, fmtTime } from "@/lib/time";
import { AttendanceCounter } from "@/components/ui/attendance";
import { Banner } from "@/components/ui/feedback";
import { PlayerList, PlayerRow } from "@/components/ui/player-row";
import { PageTitle } from "@/components/app/page-title";
import { MyAttendance } from "@/components/app/my-attendance";
import { LiveRefresh } from "@/components/app/live-refresh";
import { RemindButton, SetForPlayer } from "@/components/app/manager-tools";

const sourceLabel: Record<string, string> = { sms: "par texto", email: "par courriel", manager: "par le gérant", auto: "liste d'attente", app: "", push: "" };

/** S07 — Détail du match */
export default async function Page({ params, searchParams }: { params: Promise<{ teamId: string; eventId: string }>; searchParams: Promise<{ nouveau?: string }> }) {
  const { teamId, eventId } = await params;
  const { nouveau } = await searchParams;
  const user = await requireUser();
  const d = await orNotFound(() => getEventDetail(user.id, eventId));
  if (d.team.id !== teamId) notFound();
  const { event: ev, team, canManage } = d;
  const tz = team.timezone;
  const base = `/t/${teamId}`;
  const open = ev.status === "scheduled" && Date.parse(ev.startsAt) > Date.now() - 3 * 3600_000;
  const title = ev.opponent ? `contre ${ev.opponent}` : ev.title ?? (ev.type === "practice" ? "Pratique" : "Partie");

  const row = (p: RosterEntry, showStatus = false) => (
    <PlayerRow key={p.id} name={p.displayName} jersey={p.jerseyNumber ?? undefined} position={p.position}
      playerClass={p.class !== "regular" ? p.class : undefined} status={showStatus ? p.status : undefined}
      note={p.note ?? undefined}
      meta={p.respondedAt && p.status !== "no_reply" ? [sourceLabel[p.source ?? ""], fmtAgo(p.respondedAt)].filter(Boolean).join(" · ") : undefined}
      action={canManage && open ? <SetForPlayer teamId={teamId} eventId={ev.id} memberId={p.id} name={p.displayName} status={p.status} /> : undefined} />
  );

  return (
    <div className="flex flex-col gap-5">
      {open && <LiveRefresh />}
      <PageTitle title={title} back={{ href: `${base}/horaire`, label: "Horaire" }}
        action={canManage ? <Link href={`${base}/matchs/${ev.id}/modifier`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border-input bg-surface px-3 text-sm font-semibold hover:bg-surface-2"><Pencil aria-hidden className="size-4" />Modifier</Link> : undefined}
        sub={
          <div className="flex flex-col gap-1">
            <p className="font-display text-2xl font-bold text-text first-letter:uppercase">{fmtLongDate(ev.startsAt, tz)} · {fmtTime(ev.startsAt, tz)}</p>
            {ev.venue && <p className="flex items-center gap-1"><MapPin aria-hidden className="size-4 shrink-0" />{ev.venue}</p>}
            {(ev.homeRoom || ev.awayRoom) && <p className="flex items-center gap-1"><DoorOpen aria-hidden className="size-4 shrink-0" />Chambre {ev.homeRoom ?? "?"}{ev.awayRoom ? ` · visiteurs ${ev.awayRoom}` : ""}</p>}
          </div>
        } />

      {nouveau && <Banner tone="info">Match ajouté. Les joueurs recevront la question « t&apos;es là? » {team.reminderHoursBefore} h avant. Tu peux aussi les relancer tout de suite.</Banner>}
      {ev.status === "cancelled" && <Banner tone="danger"><span className="inline-flex items-center gap-1.5"><Ban aria-hidden className="size-4" />Ce match est annulé.</span></Banner>}
      {ev.status === "final" && ev.scoreUs != null && <Banner tone="info">Final : {ev.scoreUs} à {ev.scoreThem}.</Banner>}

      {d.me && open && (
        <section aria-label="Ma réponse" className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <MyAttendance teamId={teamId} eventId={ev.id} memberId={d.me.id} status={d.me.status} />
        </section>
      )}

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-4">
        <AttendanceCounter label="Joueurs" count={d.counts.in} max={d.cap.players} />
        <AttendanceCounter label="Gardiens" count={d.counts.goaliesIn} max={d.cap.goalies} />
      </div>

      {canManage && open && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <RemindButton teamId={teamId} eventId={ev.id} count={d.counts.noReply} />
          <Link href={`${base}/matchs/${ev.id}/spares`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border-input bg-surface px-4 text-sm font-semibold hover:bg-surface-2">
            <UserPlus aria-hidden className="size-4" />Inviter des spares
          </Link>
        </div>
      )}

      <PlayerList label="IN" count={d.groups.in.length}>
        {d.groups.in.length ? d.groups.in.map((p) => row(p)) : <li className="px-4 py-3 text-muted">Personne encore.</li>}
      </PlayerList>
      {d.groups.waitlist.length > 0 && (
        <div className="flex flex-col gap-2">
          <PlayerList label="Liste d'attente" count={d.groups.waitlist.length}>{d.groups.waitlist.map((p) => row(p))}</PlayerList>
          {canManage && open && <Link href={`${base}/matchs/${ev.id}/attente`} className="self-start text-sm font-semibold text-accent-strong underline underline-offset-4">Gérer la liste d&apos;attente</Link>}
        </div>
      )}
      {d.groups.invited.length > 0 && (
        <PlayerList label="Spares invités, sans réponse" count={d.groups.invited.length}>{d.groups.invited.map((p) => row(p))}</PlayerList>
      )}
      <PlayerList label="Pas répondu" count={d.groups.noReply.length}>
        {d.groups.noReply.length ? d.groups.noReply.map((p) => row(p)) : <li className="px-4 py-3 text-muted">Tout le monde a répondu. 🙌</li>}
      </PlayerList>
      {d.groups.out.length > 0 && <PlayerList label="OUT" count={d.groups.out.length}>{d.groups.out.map((p) => row(p))}</PlayerList>}
      {d.groups.away.length > 0 && <PlayerList label="Absents (blessés, vacances…)" count={d.groups.away.length}>{d.groups.away.map((p) => row(p))}</PlayerList>}
    </div>
  );
}
