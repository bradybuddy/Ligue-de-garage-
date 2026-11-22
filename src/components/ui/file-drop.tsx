"use client";
import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "@/lib/cn";

/** Téléversement CSV/Excel : glisser-déposer + bouton (le bouton suffit au clavier et au mobile). */
export function FileDrop({ onFile, error, accept = ".csv,.xlsx,.xls", maxMb = 1 }: {
  onFile: (f: File) => void; error?: string; accept?: string; maxMb?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const take = (f?: File) => { if (f) { setName(f.name); onFile(f); } };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-ui",
        over ? "border-accent bg-accent-soft" : error ? "border-out bg-out-soft" : "border-border-input bg-surface",
      )}
    >
      {name ? <FileSpreadsheet aria-hidden className="size-8 text-in" /> : <Upload aria-hidden className="size-8 text-muted" />}
      <p className="font-semibold">{name ?? "Glisse ton fichier ici"}</p>
      <p className="text-sm text-muted">CSV ou Excel, {maxMb} Mo max. On te montre un aperçu avant d'ajouter quoi que ce soit.</p>
      <button type="button" onClick={() => ref.current?.click()} className="h-10 rounded-md border border-border-input bg-surface px-4 text-sm font-semibold hover:bg-surface-2">
        {name ? "Choisir un autre fichier" : "Choisir un fichier"}
      </button>
      <input ref={ref} type="file" accept={accept} className="sr-only" tabIndex={-1} onChange={(e) => take(e.target.files?.[0])} aria-label="Fichier à importer" />
      {error && <p role="alert" className="text-sm font-semibold text-on-out-soft">{error}</p>}
    </div>
  );
}
