import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireUser, supabaseAuthEnabled } from "@/lib/auth";
import { listMyTeams } from "@/lib/data";
import { prettyPhone } from "@/lib/sms";
import { AuthLayout } from "@/components/app/auth-layout";
import { DeleteAccountForm } from "@/components/app/auth-forms";
import { PushToggle } from "@/components/app/push-toggle";
import { Button } from "@/components/ui/button";
import { signOutAction, signOutEverywhereAction } from "@/app/actions/auth";

export const metadata = { title: "Mon compte · Buddy & Beer" };

/** S26 — Mon compte (partiel : profil, notifs de l'appareil, sessions, suppression) */
export default async function Page() {
  const user = await requireUser("/compte");
  const teams = await listMyTeams(user.id);
  const section = "flex flex-col gap-3 border-t border-border pt-5";
  return (
    <AuthLayout title="Mon compte" subtitle={user.email}>
      <div className="flex flex-col gap-5">
        <section aria-labelledby="me-h" className="flex flex-col gap-1">
          <h2 id="me-h" className="font-bold">{user.displayName}</h2>
          {user.phone && <p className="text-muted">{prettyPhone(user.phone)}</p>}
          <p className="text-sm text-muted">{teams.map((t) => t.team.name).join(" · ") || "Aucune équipe"}</p>
          {teams[0] && <Link href={`/t/${teams[0].team.id}`} className="self-start text-sm font-semibold text-accent-strong underline underline-offset-4">Retour à l&apos;équipe</Link>}
        </section>
        <section aria-labelledby="push-h" className={section}>
          <h2 id="push-h" className="font-bold">Notifications</h2>
          <p className="text-sm text-muted">Les notifs sont gratuites et instantanées. Les rappels par texto et courriel continuent sans elles. Chaque courriel a un lien pour te désabonner de ce type d&apos;envoi.</p>
          <PushToggle />
        </section>
        <section aria-labelledby="sess-h" className={section}>
          <h2 id="sess-h" className="font-bold">Connexion</h2>
          <div className="flex flex-wrap gap-2">
            <form action={signOutAction}><Button type="submit" variant="secondary"><LogOut aria-hidden className="size-4" />Me déconnecter</Button></form>
            {supabaseAuthEnabled && <form action={signOutEverywhereAction}><Button type="submit" variant="ghost">Déconnecter tous mes appareils</Button></form>}
          </div>
          {supabaseAuthEnabled && <Link href="/mot-de-passe-oublie" className="self-start text-sm font-semibold text-accent-strong underline underline-offset-4">Changer mon mot de passe</Link>}
        </section>
        <section aria-labelledby="del-h" className={section}>
          <h2 id="del-h" className="font-bold">Supprimer mon compte</h2>
          <p className="text-sm text-muted">Ton compte et tes infos personnelles sont effacés. Dans tes équipes, ta fiche devient « Ancien joueur » pour garder les stats et les frais cohérents. Ça ne se défait pas.</p>
          <DeleteAccountForm />
        </section>
      </div>
    </AuthLayout>
  );
}
