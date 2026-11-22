import { Ban, MapPin, Radio, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { StatusPill, type AttendanceStatus } from "./badges";

export type MatchState = "upcoming" | "live" | "final" | "cancelled";

interface MatchCardProps {
  startsAt: Date;
  timeZone?: string;
  opponent?: string;
  venue: string;
  state: MatchState;
  myStatus?: AttendanceStatus;
  inCount?: number;
  max?: number;
  score?: { us: number; them: number };
  href?: string;
}

const dayFmt = (tz: string) => new Intl.DateTimeFormat("fr-CA", { weekday: "short", timeZone: tz });
const dateFmt = (tz: string) => new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", timeZone: tz });
const timeFmt = (tz: string) => new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit", timeZone: tz });

/** Carte de match : à venir, en cours, final, annulé. Toute la carte est un lien. */
export function MatchCard({
  startsAt, timeZone = "America/Toronto", opponent, venue, state, myStatus, inCount, max, score, href = "#",
}: MatchCardProps) {
  const cancelled = state === "cancelled";
  const day = dayFmt(timeZone).format(startsAt).replace(".", "");
  const date = dateFmt(timeZone).format(startsAt).replace(".", "");
  const time = timeFmt(timeZone).format(startsAt);
  const result = score ? (score.us > score.them ? "V" : score.us < score.them ? "D" : "N") : null;

  return (
    <a
      href={href}
      className={cn(
        "group flex min-w-0 items-stretch gap-3 rounded-lg sm:gap-4 border border-border bg-surface p-4 shadow-sm transition-ui hover:border-border-input",
        cancelled && "bg-surface-2 shadow-none",
      )}
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-surface-2 py-2 text-center">
        <span className="text-xs font-semibold uppercase text-muted">{day}</span>
        <span className="font-display text-xl font-bold leading-none">{date}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={cn("font-display text-xl font-bold tabular", cancelled && "text-muted line-through")}>{time}</span>
          {state === "live" && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-out-soft px-1.5 py-0.5 text-xs font-bold uppercase text-on-out-soft">
              <Radio aria-hidden className="size-3.5" /> En cours
            </span>
          )}
          {cancelled && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-out-soft px-1.5 py-0.5 text-xs font-bold uppercase text-on-out-soft">
              <Ban aria-hidden className="size-3.5" /> Annulé
            </span>
          )}
        </div>
        <p className="truncate font-semibold text-text">{opponent ? `contre ${opponent}` : "Partie"}</p>
        <p className="flex items-center gap-1 truncate text-sm text-muted">
          <MapPin aria-hidden className="size-4 shrink-0" /> {venue}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        {state === "final" && score ? (
          <span className="font-display text-2xl font-bold tabular" aria-label={`Final ${score.us} à ${score.them}`}>
            <span className={cn("mr-1.5 text-base", result === "V" ? "text-in" : result === "D" ? "text-out" : "text-muted")}>{result}</span>
            {score.us}–{score.them}
          </span>
        ) : myStatus && !cancelled ? (
          <StatusPill value={myStatus} />
        ) : null}
        {inCount !== undefined && max !== undefined && !cancelled && state !== "final" && (
          <span className="inline-flex items-center gap-1 text-sm text-muted tabular">
            <Users aria-hidden className="size-4" /> {inCount}/{max}
          </span>
        )}
      </div>
    </a>
  );
}
