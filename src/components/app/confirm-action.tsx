"use client";
import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Banner } from "@/components/ui/feedback";
import { callAction, failMessage } from "@/lib/client-action";

/** Bouton qui demande confirmation dans un dialogue avant d'exécuter une action serveur. */
export function ConfirmAction({ label, title, body, confirmLabel, action, variant = "danger" }: {
  label: string; title: string; body: string; confirmLabel: string; action: () => Promise<void>; variant?: ButtonProps["variant"];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>Garder</Button>
          <Button variant={variant} loading={pending} onClick={() => start(async () => {
            const r = await callAction(action);
            if (!r.ok) setErr(failMessage(r.offline, "Ça n'a pas marché."));
          })}>{confirmLabel}</Button>
        </>}>
        <p className="text-muted">{body}</p>
        {err && <div className="mt-3"><Banner tone="danger">{err}</Banner></div>}
      </Dialog>
    </>
  );
}
