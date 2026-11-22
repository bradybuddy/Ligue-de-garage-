"use client";
import { useRef } from "react";
import { Check, Clock, LoaderCircle, Lock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AttendanceStatus } from "./badges";

interface AttendanceToggleProps {
  value: AttendanceStatus;
  onChange: (v: "in" | "out") => void;
  /** Raison du blocage (ex. frais à payer, match annulé). */
  lockedReason?: string;
  pending?: "in" | "out" | null;
  size?: "md" | "lg";
}

/**
 * Le bouton IN/OUT — LA composante de l'appli.
 * Deux boutons radio dans un radiogroup ; flèches gauche/droite pour basculer.
 * En attente = IN demandé mais match complet : le bouton IN l'affiche.
 */
export function AttendanceToggle({ value, onChange, lockedReason, pending = null, size = "lg" }: AttendanceToggleProps) {
  // Verrouillé = vraiment désactivé. En cours d'envoi = aria-disabled : le bouton garde le focus clavier.
  const locked = !!lockedReason;
  const busy = pending !== null;
  const h = size === "lg" ? "h-14 text-lg" : "h-11 text-base";
  const isIn = value === "in" || value === "waitlist";
  const inRef = useRef<HTMLButtonElement>(null);
  const outRef = useRef<HTMLButtonElement>(null);
  const pick = (v: "in" | "out") => { if (!locked && !busy) onChange(v); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); inRef.current?.focus(); pick("in"); }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); outRef.current?.focus(); pick("out"); }
  };

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Ma présence" onKeyDown={onKey} className="grid grid-cols-2 gap-2">
        <button
          type="button"
          role="radio"
          ref={inRef}
          aria-checked={isIn}
          tabIndex={value === "out" ? -1 : 0}
          disabled={locked}
          aria-disabled={busy || undefined}
          onClick={() => pick("in")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md border-2 font-display font-bold uppercase tracking-wide transition-ui",
            h,
            value === "in" && "border-in bg-in text-on-in",
            value === "waitlist" && "border-wait bg-wait text-on-wait",
            !isIn && "border-border-input bg-surface text-text hover:bg-in-soft hover:text-on-in-soft",
            (locked || busy) && "cursor-not-allowed opacity-60",
          )}
        >
          {pending === "in" ? <LoaderCircle aria-hidden className="size-5 animate-spin" />
            : value === "waitlist" ? <Clock aria-hidden className="size-5" strokeWidth={2.5} />
            : <Check aria-hidden className="size-5" strokeWidth={3} />}
          {value === "waitlist" ? "En attente" : "IN"}
        </button>
        <button
          type="button"
          role="radio"
          ref={outRef}
          aria-checked={value === "out"}
          tabIndex={value === "out" ? 0 : -1}
          disabled={locked}
          aria-disabled={busy || undefined}
          onClick={() => pick("out")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md border-2 font-display font-bold uppercase tracking-wide transition-ui",
            h,
            value === "out"
              ? "border-out bg-out text-on-out"
              : "border-border-input bg-surface text-text hover:bg-out-soft hover:text-on-out-soft",
            (locked || busy) && "cursor-not-allowed opacity-60",
          )}
        >
          {pending === "out" ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <X aria-hidden className="size-5" strokeWidth={3} />}
          OUT
        </button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-muted">
        {lockedReason ? (
          <span className="inline-flex items-center gap-1.5"><Lock aria-hidden className="size-4" />{lockedReason}</span>
        ) : value === "no_reply" ? "Tu n'as pas encore répondu."
          : value === "waitlist" ? "Le match est complet. Tu montes automatiquement si une place se libère."
          : value === "in" ? "Parfait, on compte sur toi."
          : "Noté. Le gérant le sait."}
      </p>
    </div>
  );
}

interface CounterProps {
  label: string;
  count: number;
  max: number;
}

/** Compteur IN x/max avec barre. Complet = texte + couleur. */
export function AttendanceCounter({ label, count, max }: CounterProps) {
  const full = count >= max;
  const pct = Math.min(100, Math.round((count / Math.max(max, 1)) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-muted">{label}</span>
        <span className="font-display text-2xl font-bold tabular">
          {count}<span className="text-lg text-muted">/{max}</span>
          {full && <span className="ml-2 align-middle font-sans text-xs font-bold uppercase text-on-in-soft bg-in-soft rounded-sm px-1.5 py-0.5">Complet</span>}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={count}
        aria-valuetext={`${count} sur ${max}${full ? ", complet" : ""}`}
        className="h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-in transition-ui" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
