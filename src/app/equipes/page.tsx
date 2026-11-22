import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listMyTeams } from "@/lib/data";
import { AuthLayout } from "@/components/app/auth-layout";

/** Choix de l'équipe quand on est dans plusieurs. */
export default async function Page() {
  const user = await requireUser("/equipes");
  const teams = await listMyTeams(user.id);
  return (
    <AuthLayout title="Tes équipes">
      <ul className="flex flex-col divide-y divide-border">
        {teams.map(({ team, me }) => (
          <li key={team.id}>
            <Link href={`/t/${team.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2 hover:text-accent-strong">
              <span className="flex flex-col"><span className="font-semibold">{team.name}</span>
                <span className="text-sm text-muted">{me.role === "manager" ? "Gérant" : me.role === "assistant" ? "Adjoint" : "Joueur"}</span></span>
              <ChevronRight aria-hidden className="size-5 text-muted" />
            </Link>
          </li>
        ))}
        <li><Link href="/equipes/nouvelle" className="flex min-h-14 items-center gap-2 py-2 font-semibold text-accent-strong"><Plus aria-hidden className="size-5" />Créer une autre équipe</Link></li>
      </ul>
    </AuthLayout>
  );
}
