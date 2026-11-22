import Link from "next/link";
import { Ban, MapPin } from "lucide-react";
import { fmtShortDate, fmtTime } from "@/lib/time";
import type { LeagueGame } from "@/lib/data/types";
import { cn } from "@/lib/cn";

/** Rangée de match de ligue : date, domicile contre visiteurs, score si final. */
export function LeagueGameRow({ g, tz, href }: { g: LeagueGame; tz: string; href?: string }) {
  const final = g.status === "final" && g.homeScore != null;
  const body = (
    <div className={cn("flex min-h-16 items-center gap-3 px-4 py-2", g.status === "cancelled" && "text-muted")}>
      <div className="w-24 shrink-0 text-sm">
        <p className="font-semibold">{fmtShortDate(g.startsAt, tz)}</p>
        <p className="tabular text-muted">{fmtTime(g.startsAt, tz)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold">
          <span>{g.homeName}</span>{" "}
          <span className="font-normal text-muted">contre</span>{" "}
          <span>{g.awayName}</span>
        </p>
        {g.venue && <p className="flex items-center gap-1 text-sm text-muted"><MapPin aria-hidden className="size-3.5 shrink-0" />{g.venue}</p>}
      </div>
      <div className="shrink-0 text-right">
        {final ? (
          <span className="font-display text-xl font-bold tabular" aria-label={`Final ${g.homeScore} à ${g.awayScore}${g.overtime ? " en prolongation" : ""}`}>
            {g.homeScore}–{g.awayScore}{g.overtime && <span className="ml-1 text-xs font-sans text-muted">(P)</span>}
          </span>
        ) : g.status === "cancelled" ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-on-out-soft bg-out-soft rounded-sm px-1.5 py-0.5"><Ban aria-hidden className="size-3.5" />Annulé</span>
        ) : null}
      </div>
    </div>
  );
  return <li>{href ? <Link href={href} className="block hover:bg-surface-2">{body}</Link> : body}</li>;
}
