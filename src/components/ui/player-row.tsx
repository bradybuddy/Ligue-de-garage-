import { Beer, MessageSquareText } from "lucide-react";
import { Avatar, ClassBadge, StatusPill, type AttendanceStatus, type PlayerClass } from "./badges";

interface PlayerRowProps {
  name: string;
  jersey?: number;
  position?: "skater" | "goalie";
  playerClass?: PlayerClass;
  status?: AttendanceStatus;
  note?: string;
  beer?: boolean;
  action?: React.ReactNode;
}

/** Rangée de joueur. Le nom n'est jamais tronqué sous 2 lignes (bogue « noms illisibles » évité). */
export function PlayerRow({ name, jersey, position, playerClass, status, note, beer, action }: PlayerRowProps) {
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <Avatar name={name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-2 break-words font-semibold text-text">
          {name}
          {jersey !== undefined && <span className="ml-1.5 font-normal text-muted tabular">#{jersey}</span>}
          {position === "goalie" && <span className="ml-1.5 text-sm font-semibold text-accent-strong">Gardien</span>}
          {beer && (
            <span className="ml-1.5 inline-flex items-center align-middle text-accent-strong" title="De tournée">
              <Beer aria-hidden className="size-4" /><span className="sr-only">, de tournée</span>
            </span>
          )}
        </span>
        {note && (
          <span className="flex items-start gap-1 text-sm text-muted">
            <MessageSquareText aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-2">{note}</span>
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {playerClass && <ClassBadge value={playerClass} />}
        {status && <StatusPill value={status} />}
        {action}
      </div>
    </li>
  );
}

export function PlayerList({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="overflow-hidden rounded-lg border border-border bg-surface">
      <h3 className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2 text-sm font-bold text-text">
        {label}
        {count !== undefined && <span className="tabular text-muted">{count}</span>}
      </h3>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  );
}
