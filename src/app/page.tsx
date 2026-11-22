import Link from "next/link";
import { redirect } from "next/navigation";
import { Beer, KeyRound, Trophy, UsersRound } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { listMyTeams } from "@/lib/data";

/** S01 — Accueil / choix du rôle */
export default async function Home() {
  const user = await currentUser();
  if (user) {
    const teams = await listMyTeams(user.id);
    if (teams.length === 1) redirect(`/t/${teams[0]!.team.id}`);
    if (teams.length > 1) redirect("/equipes");
  }
  const cards = [
    { href: "/equipes/nouvelle", Icon: UsersRound, title: "Je gère une équipe", body: "Crée ton équipe, ajoute tes joueurs, on s'occupe des présences et des spares." },
    { href: "/rejoindre", Icon: KeyRound, title: "Je joue dans une équipe", body: "Entre le code que ton gérant t'a envoyé." },
    { href: "/ligues/nouvelle", Icon: Trophy, title: "Je gère une ligue", body: "Divisions, horaire de toute la ligue, classement." },
  ];
  return (
    <main className="mx-auto flex min-h-dvh max-w-content flex-col justify-center gap-8 px-4 py-10">
      <div className="flex flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-on-accent"><Beer aria-hidden className="size-6" /></span>
        <h1 className="font-display text-3xl font-bold">Buddy &amp; Beer</h1>
        <p className="text-lg text-muted">Qui est là jeudi? Fini les 40 textos pour le savoir.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {cards.map(({ href, Icon, title, body }) => (
          <li key={href}>
            <Link href={user ? href : `/inscription?next=${encodeURIComponent(href)}`}
              className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm transition-ui hover:border-border-input">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent-soft text-on-accent-soft"><Icon aria-hidden className="size-5" /></span>
              <span className="flex flex-col gap-1">
                <span className="text-lg font-bold">{title}</span>
                <span className="text-muted">{body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!user && (
        <p className="text-center text-sm">
          Déjà un compte? <Link href="/connexion" className="font-semibold text-accent-strong underline underline-offset-4">Connecte-toi</Link>
        </p>
      )}
    </main>
  );
}
