"use client";
import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/** Bouton qui demande confirmation dans un dialogue avant d'exécuter une action serveur. */
export function ConfirmAction({ label, title, body, confirmLabel, action, variant = "danger" }: {
  label: string; title: string; body: string; confirmLabel: string; action: () => Promise<void>; variant?: ButtonProps["variant"];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>Garder</Button>
          <Button variant={variant} loading={pending} onClick={() => start(() => action())}>{confirmLabel}</Button>
        </>}>
        <p className="text-muted">{body}</p>
      </Dialog>
    </>
  );
}
