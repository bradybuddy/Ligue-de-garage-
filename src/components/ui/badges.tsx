import { Check, Clock, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type PlayerClass = "regular" | "spare" | "spectator" | "staff" | "vacation" | "injured" | "suspended";
export type AttendanceStatus = "in" | "out" | "waitlist" | "no_reply";

const classStyle: Record<PlayerClass, { label: string; cls: string }> = {
  regular: { label: "Régulier", cls: "bg-surface-2 text-text" },
  spare: { label: "Spare", cls: "bg-accent-soft text-on-accent-soft" },
  spectator: { label: "Spectateur", cls: "bg-surface-2 text-muted" },
  staff: { label: "Staff", cls: "bg-surface-2 text-muted" },
  vacation: { label: "Vacances", cls: "bg-wait-soft text-on-wait-soft" },
  injured: { label: "Blessé", cls: "bg-warning-soft text-on-warning-soft" },
  suspended: { label: "Suspendu", cls: "bg-out-soft text-on-out-soft" },
};

/** Pastille de classe. Le texte porte le sens, la couleur aide seulement. */
export function ClassBadge({ value, className }: { value: PlayerClass; className?: string }) {
  const s = classStyle[value];
  return (
    <span className={cn("inline-flex h-6 items-center rounded-sm px-2 text-xs font-semibold", s.cls, className)}>
      {s.label}
    </span>
  );
}

const statusStyle: Record<AttendanceStatus, { label: string; cls: string; Icon: typeof Check }> = {
  in: { label: "IN", cls: "bg-in-soft text-on-in-soft", Icon: Check },
  out: { label: "OUT", cls: "bg-out-soft text-on-out-soft", Icon: X },
  waitlist: { label: "En attente", cls: "bg-wait-soft text-on-wait-soft", Icon: Clock },
  no_reply: { label: "Pas répondu", cls: "bg-surface-2 text-muted", Icon: HelpCircle },
};

/** Statut de présence : icône + mot, jamais la couleur seule. */
export function StatusPill({ value, className }: { value: AttendanceStatus; className?: string }) {
  const s = statusStyle[value];
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full pl-1.5 pr-2.5 text-xs font-bold", s.cls, className)}>
      <s.Icon aria-hidden className="size-3.5" strokeWidth={3} />
      {s.label}
    </span>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold text-text",
        size === "sm" ? "size-7 text-xs" : "size-10 text-sm",
      )}
    >
      {initials}
    </span>
  );
}
