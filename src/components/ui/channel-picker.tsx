"use client";
import { Bell, Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type Channel = "push" | "sms" | "email";
const opts: { v: Channel; label: string; Icon: typeof Bell; hint: string }[] = [
  { v: "push", label: "Notif", Icon: Bell, hint: "Gratuit, instantané" },
  { v: "sms", label: "Texto", Icon: MessageCircle, hint: "Réponse Y/N" },
  { v: "email", label: "Courriel", Icon: Mail, hint: "Avec lien IN/OUT" },
];

/** Sélecteur de canal : cases à cocher dans un fieldset. Au moins un canal requis. */
export function ChannelPicker({ value, onChange, error }: { value: Channel[]; onChange: (v: Channel[]) => void; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-2" aria-invalid={!!error || undefined}>
      <legend className="mb-1.5 text-sm font-semibold text-text">Envoyer par</legend>
      <div className="grid grid-cols-3 gap-2">
        {opts.map(({ v, label, Icon, hint }) => {
          const on = value.includes(v);
          return (
            <label
              key={v}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 p-3 text-center transition-ui has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                on ? "border-accent bg-accent-soft text-on-accent-soft" : "border-border-input bg-surface text-text hover:bg-surface-2",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => onChange(on ? value.filter((x) => x !== v) : [...value, v])}
              />
              <Icon aria-hidden className="size-5" />
              <span className="text-sm font-semibold">{label}</span>
              <span className={cn("text-xs", on ? "text-on-accent-soft" : "text-muted")}>{hint}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-sm font-medium text-out">{error}</p>}
    </fieldset>
  );
}
