import Link from "next/link";
import { SearchX } from "lucide-react";

/** 404 : même message qu'il s'agisse d'une page qui n'existe pas ou d'une équipe dont on ne fait pas partie. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted"><SearchX className="size-6" /></span>
      <h1 className="font-display text-3xl font-bold">Introuvable</h1>
      <p className="text-muted">Cette page n&apos;existe pas, ou tu ne fais pas partie de cette équipe. Si ton gérant t&apos;a invité, ouvre le lien d&apos;invitation qu&apos;il t&apos;a envoyé.</p>
      <Link href="/" className="inline-flex h-10 items-center self-start rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">Retour à l&apos;accueil</Link>
    </main>
  );
}
