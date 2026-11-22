"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { Avatar, ClassBadge, type PlayerClass } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { acceptFromWaitlistAction, moveInWaitlistAction } from "@/app/actions/spares";
import { callAction, failMessage } from "@/lib/client-action";

export interface WaitItem { id: string; name: string; cls: PlayerClass; goalie: boolean; since: string }

/** S15 — l'ordre de la file. Monter/descendre au clavier (pas de glisser-déposer obligatoire). */
export function WaitlistEditor({ teamId, eventId, items, full }: { teamId: string; eventId: string; items: WaitItem[]; full: boolean }) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [seen, setSeen] = useState(items);
  if (items !== seen) { setSeen(items); setList(items); }
  const [msg, setMsg] = useState<{ tone: "info" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    setList(next);
    start(async () => {
      const r = await callAction(() => moveInWaitlistAction(teamId, eventId, next.map((x) => x.id)));
      if (!r.ok || !r.value.ok) { setList(list); setMsg({ tone: "danger", text: r.ok ? r.value.error! : failMessage(r.offline, "L'ordre n'a pas été enregistré.") }); }
      else { setMsg({ tone: "info", text: `${next[i + d]!.name} est maintenant ${i + d + 1}e.` }); router.refresh(); }
    });
  };
  const accept = (w: WaitItem) => start(async () => {
    const r = await callAction(() => acceptFromWaitlistAction(teamId, eventId, w.id));
    if (!r.ok || !r.value.ok) return setMsg({ tone: "danger", text: r.ok ? r.value.error! : failMessage(r.offline, "Ça n'a pas marché.") });
    setMsg({ tone: "info", text: `${w.name} est IN.${full ? " Le match dépasse maintenant le maximum." : ""}` });
    router.refresh();
  });

  return (
    <div className="flex flex-col gap-3">
      <div aria-live="polite">{msg && <Banner tone={msg.tone}>{msg.text}</Banner>}</div>
      <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {list.map((w, i) => (
          <li key={w.id} className="flex min-h-16 items-center gap-3 px-3 py-2">
            <span className="w-6 text-center font-display text-xl font-bold tabular text-muted" aria-hidden>{i + 1}</span>
            <Avatar name={w.name} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="break-words font-semibold">{w.name}{w.goalie && <span className="ml-1.5 text-sm text-accent-strong">Gardien</span>}</span>
              <span className="text-sm text-muted">{w.since}</span>
            </span>
            {w.cls !== "regular" && <ClassBadge value={w.cls} />}
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" disabled={pending || i === 0} onClick={() => move(i, -1)} aria-label={`Monter ${w.name}`}
                className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowUp aria-hidden className="size-4" /></button>
              <button type="button" disabled={pending || i === list.length - 1} onClick={() => move(i, 1)} aria-label={`Descendre ${w.name}`}
                className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowDown aria-hidden className="size-4" /></button>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => accept(w)} aria-label={`Accepter ${w.name}`}>
                <Check aria-hidden className="size-4" />Accepter
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
