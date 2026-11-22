import { requireUser } from "@/lib/auth";
import { getTeamForUser, listEvents } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { utcToZonedParts } from "@/lib/time";
import { PageTitle } from "@/components/app/page-title";
import { EventForm } from "@/components/app/event-form";
import { Banner } from "@/components/ui/feedback";

/** S08 — Ajouter un match */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const user = await requireUser();
  const { team, me } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const back = { href: `/t/${teamId}/horaire`, label: "Horaire" };
  if (me.role === "member") return (<><PageTitle title="Ajouter un match" back={back} /><Banner tone="warning">Seuls le gérant et l&apos;adjoint peuvent modifier l&apos;horaire.</Banner></>);
  const all = [...(await listEvents(user.id, teamId, "upcoming")), ...(await listEvents(user.id, teamId, "past"))];
  const venues = [...new Set(all.map((e) => e.venue).filter((x): x is string => !!x))];
  // Préremplit avec le même jour et la même heure que le dernier match, une semaine plus tard
  const last = all.filter((e) => e.type === "game").sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
  const defaults = last
    ? (() => { const p = utcToZonedParts(new Date(Date.parse(last.startsAt) + 7 * 86400_000), team.timezone); return { date: p.date, time: utcToZonedParts(last.startsAt, team.timezone).time, venue: last.venue ?? "" }; })()
    : { time: "21:00" };
  return (
    <>
      <PageTitle title="Ajouter un match" back={back} />
      <EventForm teamId={teamId} eventId={null} defaults={defaults} teamMax={team.maxPlayers} venues={venues} />
    </>
  );
}
