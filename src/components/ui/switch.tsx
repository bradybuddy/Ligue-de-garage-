"use client";
import { useId } from "react";
import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Interrupteur : vrai bouton role="switch", toute la rangée est cliquable. */
export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div className="flex flex-col">
        <span id={`${id}-l`} className="text-base text-text">{label}</span>
        {description && <span id={`${id}-d`} className="text-sm text-muted">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-ui disabled:opacity-50",
          checked ? "border-in bg-in" : "border-border-input bg-surface-2",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-5 rounded-full shadow-sm transition-ui",
            checked ? "translate-x-[22px] bg-on-in" : "translate-x-0.5 bg-muted",
          )}
        />
      </button>
    </div>
  );
}
