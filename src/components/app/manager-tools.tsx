"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BellRing, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { remindAction, respondAction } from "@/app/actions/events";
import { cn } from "@/lib/cn";
import { callAction, failMessage } from "@/lib/client-action";

export function RemindButton({ teamId, eventId, count }: { teamId: string; eventId: string; count: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" loading={pending} disabled={count === 0}
        onClick={() => start(async () => {
          const r = await callAction(() => remindAction(teamId, eventId));
          setMsg(r.ok ? r.value : { ok: false, message: failMessage(r.offline, "La relance n'est pas partie.") });
          if (r.ok) router.refresh();
        })}>
        <BellRing aria-hidden className="size-4" />
        {count === 0 ? "Tout le monde a répondu" : `Relancer les ${count} sans réponse`}
      </Button>
      <div aria-live="polite">{msg && <Banner tone={msg.ok ? "info" : "danger"}>{msg.message}</Banner>}</div>
    </div>
  );
}

/** Le gérant entre la réponse à la place d'un joueur (ex. il l'a su en personne). */
export function SetForPlayer({ teamId, eventId, memberId, name, status }: { teamId: string; eventId: string; memberId: string; name: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const set = (v: "in" | "out") => start(async () => {
    const r = await callAction(() => respondAction(teamId, eventId, memberId, v));
    setErr(!r.ok ? failMessage(r.offline) : r.value.ok ? null : r.value.error);
    if (r.ok) router.refresh();
  });
  const btn = "inline-flex size-9 items-center justify-center rounded-md border border-border-input text-muted transition-ui hover:bg-surface-2 disabled:opacity-50";
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Réponse pour ${name}`}>
      <button type="button" disabled={pending || status === "in" || status === "waitlist"} onClick={() => set("in")} aria-label={`Mettre ${name} IN`} className={cn(btn, "hover:text-in")}>
        <Check aria-hidden className="size-4" strokeWidth={3} />
      </button>
      <button type="button" disabled={pending || status === "out"} onClick={() => set("out")} aria-label={`Mettre ${name} OUT`} className={cn(btn, "hover:text-out")}>
        <X aria-hidden className="size-4" strokeWidth={3} />
      </button>
      {err && <span role="alert" title={err} className="max-w-28 text-xs font-semibold leading-tight text-out">{err.startsWith("Pas de connexion") ? "Pas de réseau" : "Pas enregistré"}<span className="sr-only"> : {err}</span></span>}
    </div>
  );
}
