"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Dialogue modal sur <dialog> natif : piège le focus, Échap ferme, focus rendu au déclencheur.
 * Sur mobile il s'ancre en bas (feuille), sur sm+ il est centré.
 */
export function Dialog({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-labelledby={titleId}
      className="m-0 mt-auto w-full max-w-none rounded-t-lg bg-surface p-0 text-text shadow-md backdrop:bg-overlay sm:m-auto sm:max-w-md sm:rounded-lg"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id={titleId} className="text-lg font-bold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fermer" className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-surface-2">
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </dialog>
  );
}
