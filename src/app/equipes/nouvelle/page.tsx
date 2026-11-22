import { requireUser } from "@/lib/auth";
import { AuthLayout } from "@/components/app/auth-layout";
import { CreateTeamForm } from "@/components/app/create-team-form";

export const metadata = { title: "Créer une équipe · Buddy & Beer" };

/** S04 — Créer une équipe */
export default async function Page() {
  await requireUser("/equipes/nouvelle");
  return (
    <AuthLayout title="Crée ton équipe" subtitle="Étape 1 sur 3. Ensuite : tes joueurs, puis ton horaire.">
      <CreateTeamForm />
    </AuthLayout>
  );
}
