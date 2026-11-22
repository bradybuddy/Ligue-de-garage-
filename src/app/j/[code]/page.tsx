import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { getInvitePreview, listMyTeams } from "@/lib/data";
import { AuthLayout } from "@/components/app/auth-layout";
import { JoinButton } from "@/components/app/join-forms";

export const metadata = { title: "Rejoindre une équipe · Buddy & Beer", robots: { index: false } };

/** S03 — Rejoindre une équipe par lien */
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const preview = await getInvitePreview(code);
  if (!preview) {
    return (
      <AuthLayout title="Code inconnu">
        <p className="text-muted">Ce lien d&apos;invitation ne correspond à aucune équipe. Demande le bon lien à ton gérant, ou <Link href="/rejoindre" className="font-semibold text-accent-strong underline underline-offset-4">entre le code à la main</Link>.</p>
      </AuthLayout>
    );
  }
  const user = await currentUser();
  if (user && (await listMyTeams(user.id)).some((t) => t.team.id === preview.teamId)) redirect(`/t/${preview.teamId}`);
  const next = encodeURIComponent(`/j/${code}`);
  return (
    <AuthLayout title={preview.name} subtitle="Tu es invité à rejoindre l'équipe.">
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-muted"><Users aria-hidden className="size-4" />{preview.players} membre{preview.players > 1 ? "s" : ""}</p>
        {user ? (
          <JoinButton code={code} teamName={preview.name} />
        ) : (
          <div className="flex flex-col gap-2">
            <Link href={`/inscription?next=${next}`} className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-5 font-semibold text-on-accent">Créer mon compte et rejoindre</Link>
            <Link href={`/connexion?next=${next}`} className="inline-flex h-12 items-center justify-center rounded-md border border-border-input bg-surface px-5 font-semibold">J&apos;ai déjà un compte</Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
