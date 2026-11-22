import { APP_NAME } from "@/lib/brand";
import { Check, MapPin, X } from "lucide-react";
import { getTokenContext } from "@/lib/data";
import { fmtLongDate, fmtTime } from "@/lib/time";
import { AuthLayout } from "@/components/app/auth-layout";
import { AutoSubmit } from "@/components/app/auto-submit";
import { Banner } from "@/components/ui/feedback";
import { StatusPill } from "@/components/ui/badges";
import { respondTokenAction } from "@/app/actions/token";

export const metadata = { title: `Ta réponse · ${APP_NAME}`, robots: { index: false } };

/** Lien IN/OUT du courriel. GET n'écrit jamais : la réponse part par POST. */
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ s?: string; ok?: string; erreur?: string }> }) {
  const { token } = await params;
  const { s, ok, erreur } = await searchParams;
  const ctx = await getTokenContext(token);
  if (!ctx) {
    return <AuthLayout title="Lien invalide"><p className="text-muted">Ce lien ne fonctionne pas ou plus. Ouvre l&apos;appli ou réponds au texto.</p></AuthLayout>;
  }
  const { event: ev, team, member, status } = ctx;
  const tz = team.timezone;
  const wanted = s === "in" || s === "out" ? s : null;
  const closed = ctx.expired || ev.status !== "scheduled";
  const autosend = wanted && !ok && !erreur && !closed && status !== wanted && !(wanted === "in" && status === "waitlist");
  const btn = "flex h-14 w-full items-center justify-center gap-2 rounded-md border-2 font-display text-lg font-bold uppercase";

  return (
    <AuthLayout title={`Salut ${member.displayName.split(" ")[0]}!`} subtitle={team.name}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-display text-2xl font-bold first-letter:uppercase">{fmtLongDate(ev.startsAt, tz)} · {fmtTime(ev.startsAt, tz)}</p>
          {ev.opponent && <p className="font-semibold">contre {ev.opponent}</p>}
          {ev.venue && <p className="flex items-center gap-1 text-muted"><MapPin aria-hidden className="size-4" />{ev.venue}</p>}
        </div>
        {ok && <Banner tone="info">{ok === "in" ? "C'est noté : t'es IN. 🏒" : ok === "waitlist" ? "Le match est complet : t'es sur la liste d'attente. On t'avertit si une place se libère." : "C'est noté : t'es OUT. Merci d'avoir répondu!"}</Banner>}
        {erreur && <Banner tone="danger">{erreur}</Banner>}
        {closed && !ok && <Banner tone="warning">{ev.status === "cancelled" ? "Ce match est annulé." : "On ne peut plus répondre à ce match."}</Banner>}
        <p className="flex items-center gap-2 text-sm text-muted">Ta réponse actuelle : <StatusPill value={status} /></p>
        {!closed && (
          <div className="grid grid-cols-2 gap-3">
            <form id="f-in" action={respondTokenAction.bind(null, token, "in")}>
              <button type="submit" className={`${btn} ${status === "in" ? "border-in bg-in text-on-in" : "border-border-input bg-surface hover:bg-in-soft"}`}><Check aria-hidden className="size-5" strokeWidth={3} />IN</button>
            </form>
            <form id="f-out" action={respondTokenAction.bind(null, token, "out")}>
              <button type="submit" className={`${btn} ${status === "out" ? "border-out bg-out text-on-out" : "border-border-input bg-surface hover:bg-out-soft"}`}><X aria-hidden className="size-5" strokeWidth={3} />OUT</button>
            </form>
          </div>
        )}
        {autosend && <><p className="text-sm text-muted" aria-live="polite">Envoi de ta réponse…</p><AutoSubmit formId={`f-${wanted}`} /></>}
      </div>
    </AuthLayout>
  );
}
