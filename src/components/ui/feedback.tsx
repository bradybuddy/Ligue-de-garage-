import { CircleAlert, Info, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** État vide : une phrase qui dit quoi faire + une action. */
export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-input bg-surface px-6 py-10 text-center">
      <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted [&>svg]:size-6">{icon}</span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-muted">{body}</p>
      {action}
    </div>
  );
}

type Tone = "info" | "warning" | "danger" | "offline";
const tones: Record<Tone, { cls: string; Icon: typeof Info; role: "status" | "alert" }> = {
  info: { cls: "bg-wait-soft text-on-wait-soft", Icon: Info, role: "status" },
  warning: { cls: "bg-warning-soft text-on-warning-soft", Icon: CircleAlert, role: "status" },
  danger: { cls: "bg-out-soft text-on-out-soft", Icon: CircleAlert, role: "alert" },
  offline: { cls: "bg-surface-2 text-text", Icon: WifiOff, role: "status" },
};

export function Banner({ tone = "info", children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  const t = tones[tone];
  return (
    <div role={t.role} className={cn("flex items-start gap-3 rounded-md px-4 py-3 text-sm", t.cls)}>
      <t.Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none", className)} />;
}
