import { APP_NAME } from "@/lib/brand";
import { requireUser } from "@/lib/auth";
import { AuthLayout } from "@/components/app/auth-layout";
import { CreateLeagueForm } from "@/components/app/league-forms";

export const metadata = { title: `Créer une ligue · ${APP_NAME}` };

/** L01 — Créer une ligue */
export default async function Page() {
  await requireUser("/ligues/nouvelle");
  return (
    <AuthLayout title="Crée ta ligue" subtitle="Ensuite : tes équipes, puis l'horaire. Chaque match apparaît tout seul chez les deux équipes.">
      <CreateLeagueForm />
    </AuthLayout>
  );
}
