import Link from "next/link";
import { Construction } from "lucide-react";

/** Écran prévu mais pas encore bâti. Dit clairement ce qui s'en vient. */
export function Stub({ id, title, purpose, milestone, back }: { id: string; title: string; purpose: string; milestone: string; back?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col gap-4">
      {back && <Link href={back.href} className="self-start text-sm font-semibold text-muted hover:text-text">← {back.label}</Link>}
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-input bg-surface px-6 py-10 text-center">
        <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted"><Construction className="size-6" /></span>
        <p className="max-w-sm">{purpose}</p>
        <p className="text-sm text-muted">Écran {id} · arrive au {milestone}.</p>
      </div>
    </div>
  );
}

export function PublicStub(props: Parameters<typeof Stub>[0]) {
  return <main className="mx-auto max-w-content px-4 py-10"><Stub {...props} /></main>;
}
