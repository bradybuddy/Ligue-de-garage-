import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME, LEGAL } from "@/lib/brand";

/** Gabarit des pages légales : texte lisible, titres hiérarchisés, retour à l'accueil. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-content flex-col gap-6 px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-accent-strong underline underline-offset-4">← {APP_NAME}</Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="text-sm text-muted">Mise à jour : {LEGAL.updatedOn}</p>
      </div>
      <div className="flex flex-col gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_table]:w-full [&_td]:border-t [&_td]:border-border [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-3 [&_th]:text-left [&_th]:text-sm [&_th]:text-muted">
        {children}
      </div>
    </main>
  );
}
