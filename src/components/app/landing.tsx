import Image from "next/image";
import Link from "next/link";
import { Beer, BellRing, CalendarClock, Check, KeyRound, MessageSquareText, RefreshCw, ShieldCheck, Trophy, UserPlus, UsersRound } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

// Page publique (visiteur pas connecté). Textes : replica/launch/landing.md.
// Aucune fausse preuve : pas de témoignages, de compteurs ni d'étoiles.

const SIGNUP = `/inscription?next=${encodeURIComponent("/equipes/nouvelle")}`;

const fixes = [
  { Icon: RefreshCw, title: "Rien à installer ni à mettre à jour", body: "Ça s'ouvre dans le navigateur du cell. Pas de mise à jour à télécharger la veille du match, pas d'appli qui refuse de démarrer." },
  { Icon: MessageSquareText, title: "Les gars répondent par texto", body: "Le rappel part tout seul. Ils répondent Y ou N, même ceux qui n'ont jamais ouvert l'appli." },
  { Icon: UserPlus, title: "Les spares arrivent tout seuls", body: "S'il manque du monde, l'appli invite tes spares. Le premier qui dit oui embarque; les autres passent sur une liste d'attente juste." },
  { Icon: BellRing, title: "Tu sais tout de suite qui lâche", body: "Un joueur passe à OUT? Tu reçois une notif, et la première personne de la liste d'attente monte toute seule." },
  { Icon: CalendarClock, title: "Le bon match à la bonne heure", body: "Le calendrier du cell reste juste au changement d'heure. Pas de gars qui arrive une heure d'avance." },
  { Icon: ShieldCheck, title: "Rien ne disparaît sans prévenir", body: "Ton horaire, tes stats et ton historique restent là. Une fonction qui change est annoncée d'avance." },
];

const steps = [
  { n: "1", title: "Crée ton équipe", body: "Ajoute tes joueurs avec leur cell, ou envoie le lien : ils s'ajoutent eux-mêmes." },
  { n: "2", title: "Entre tes matchs", body: "L'appli demande « t'es là? » à tout le monde, au moment que tu choisis." },
  { n: "3", title: "Arrive à l'aréna", body: "Tu vois qui est IN, qui est OUT et quels spares ont embarqué. Les bières sont réglées aussi." },
];

const plans = [
  {
    name: "Équipe",
    who: "Pour les gars qui jouent",
    price: "0 $",
    per: "pour toujours",
    items: ["Réponse IN/OUT par texto Y/N", "Spares automatiques et liste d'attente", "Notif quand un joueur lâche", "Chat, réactions, tournée de bières", "Zéro pub"],
    cta: { href: SIGNUP, label: "Créer mon équipe" },
  },
  {
    name: "Gérant Plus",
    who: "Pour le gérant qui fait tout",
    price: "5 $",
    per: "par mois, ou 50 $ par an",
    items: ["Tout le plan Équipe", "Équipes Foncé/Pâle équilibrées", "Suivi des frais Interac et comptant", "Pointeur et stats"],
    soon: true,
  },
  {
    name: "Ligue",
    who: "Pour le commissaire",
    price: "6 $",
    per: "par équipe par mois, ou 60 $ par an",
    items: ["Divisions et horaire central", "Classement automatique", "Annonces à toute la ligue", "Gérant Plus inclus pour chaque équipe"],
    cta: { href: `/inscription?next=${encodeURIComponent("/ligues/nouvelle")}`, label: "Créer ma ligue" },
  },
];

const faq = [
  { q: "C'est vraiment gratuit? C'est quoi l'attrape?", a: "Pas d'attrape. Une équipe a tout l'essentiel gratuitement, sans pub et sans limite de joueurs : texto Y/N, spares, liste d'attente, notifs. On gagne notre vie avec le plan Ligue et, plus tard, avec Gérant Plus. Ce qui est gratuit ne deviendra jamais payant." },
  { q: "Mes joueurs doivent-ils installer une appli?", a: "Non. Ils répondent Y ou N au texto. Ceux qui veulent plus (chat, calendrier, notifs) ouvrent le lien dans leur navigateur, et peuvent l'ajouter à leur écran d'accueil." },
  { q: "Est-ce que je peux importer mon équipe d'une autre appli?", a: "Pas encore d'import automatique. En attendant, envoie le lien d'invitation dans ton groupe de texto : chaque gars s'ajoute lui-même en une minute." },
  { q: "Qu'est-ce qui arrive si votre site plante le soir du match?", a: "Chaque changement passe 50 tests automatiques avant d'être mis en ligne, et on peut revenir à la version d'avant en une minute. Les rappels par texto partent de nos serveurs : ils ne dépendent pas du cell de tes joueurs." },
  { q: "Je reçois déjà trop de courriels. Vous allez m'en envoyer combien?", a: "Un seul courriel de rappel par match, et seulement si tu le veux. Tu choisis chaque type d'avis et son canal (notif, texto, courriel) dans ton compte, et chaque courriel a un lien pour se désabonner en un clic." },
  { q: "Je peux annuler un plan payant facilement?", a: "Oui : un bouton dans ton compte, sans appel ni courriel. On t'écrit 7 jours avant chaque renouvellement annuel. Si tu arrêtes de payer, ton équipe revient au plan gratuit et rien n'est effacé." },
  { q: "C'est en français?", a: "Oui, d'abord en français du Québec, et le support répond en français." },
];

export function Landing() {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="mx-auto flex max-w-wide items-center justify-between gap-4 px-4 py-4">
        <span className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-on-accent"><Beer aria-hidden className="size-5" /></span>
          {APP_NAME}
        </span>
        <Link href="/connexion" className="rounded-md px-3 py-2 text-sm font-semibold text-accent-strong underline underline-offset-4 hover:bg-surface-2">
          Me connecter
        </Link>
      </header>

      <main>
        {/* 1. Héros */}
        <section aria-labelledby="hero-titre" className="mx-auto grid max-w-wide items-center gap-10 px-4 pb-14 pt-6 md:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-5">
            <p className="font-semibold text-accent-strong">Pour les gérants de hockey de garage</p>
            <h1 id="hero-titre" className="font-display text-3xl font-bold md:text-[2.75rem] md:leading-[1.1]">
              {APP_TAGLINE} Même le soir du match.
            </h1>
            <p className="text-lg text-muted">
              Qui est là jeudi? Fini les 40 textos pour le savoir. Rien à installer ni à mettre à jour : les gars répondent Y par texto, et les spares embarquent tout seuls.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={SIGNUP} className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 text-base font-semibold text-on-accent transition-ui hover:brightness-95">
                Créer mon équipe gratuitement
              </Link>
              <span className="text-sm text-muted">Gratuit, sans pub, sans carte de crédit.</span>
            </div>
          </div>
          <figure className="mx-auto w-full max-w-[300px]">
            <Image src="/landing/match.png" alt="L'écran d'un match jeudi à 21 h 15 : le joueur est IN, 8 joueurs sur 16 et 1 gardien sur 2 ont confirmé." width={390} height={844}
              className="rounded-[2rem] border-4 border-text shadow-md" priority />
            <figcaption className="mt-3 text-center text-sm text-muted">Le vrai écran d&apos;un match, données de démo.</figcaption>
          </figure>
        </section>

        {/* 2. Le problème */}
        <section aria-labelledby="probleme-titre" className="border-y border-border bg-surface">
          <div className="mx-auto flex max-w-wide flex-col gap-6 px-4 py-12">
            <h2 id="probleme-titre" className="font-display text-2xl font-bold">Le jeudi soir, c&apos;est là que ça lâche</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold">L&apos;appli plante juste après une mise à jour</h3>
                <p className="text-muted">Tu ouvres l&apos;appli pour voir qui vient, et elle reste figée sur l&apos;écran de départ. Ou bien ton horaire et tes stats ont disparu pendant la nuit. Pendant ce temps, tu recommences à texter tout le monde un par un.</p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-bold">L&apos;essentiel est devenu payant</h3>
                <p className="text-muted">Le texto de rappel, la liste d&apos;attente, même une notif le jour du match : chez d&apos;autres, c&apos;est dans l&apos;abonnement. Et la version gratuite a des pubs.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Comment ça marche */}
        <section aria-labelledby="etapes-titre" className="mx-auto flex max-w-wide flex-col gap-6 px-4 py-12">
          <h2 id="etapes-titre" className="font-display text-2xl font-bold">Comment ça marche</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-4 rounded-lg border border-border bg-surface p-5">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-on-accent">{s.n}</span>
                <span className="flex flex-col gap-1">
                  <span className="text-lg font-bold">{s.title}</span>
                  <span className="text-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* 4. Ce qu'on règle */}
        <section aria-labelledby="fonctions-titre" className="border-y border-border bg-surface">
          <div className="mx-auto flex max-w-wide flex-col gap-6 px-4 py-12">
            <h2 id="fonctions-titre" className="font-display text-2xl font-bold">Ce qu&apos;on règle</h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {fixes.map(({ Icon, title, body }) => (
                <li key={title} className="flex flex-col gap-2">
                  <span className="flex size-11 items-center justify-center rounded-md bg-accent-soft text-on-accent-soft"><Icon aria-hidden className="size-5" /></span>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="text-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5. Prix */}
        <section id="prix" aria-labelledby="prix-titre" className="mx-auto flex max-w-wide flex-col gap-6 px-4 py-12">
          <div className="flex flex-col gap-2">
            <h2 id="prix-titre" className="font-display text-2xl font-bold">Prix</h2>
            <p className="text-muted">L&apos;essentiel n&apos;est jamais payant. Prix à plat par équipe, jamais par joueur. Taxes en sus.</p>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <li key={p.name} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
                <div className="flex flex-col gap-1">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    {p.name}
                    {p.soon && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">bientôt</span>}
                  </h3>
                  <p className="text-sm text-muted">{p.who}</p>
                </div>
                <p><span className="font-display text-3xl font-bold">{p.price}</span> <span className="text-sm text-muted">{p.per}</span></p>
                <ul className="flex flex-1 flex-col gap-2">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-in" />{it}</li>
                  ))}
                </ul>
                {p.cta ? (
                  <Link href={p.cta.href} className="inline-flex h-11 items-center justify-center rounded-md border border-border-input bg-surface px-4 text-sm font-semibold transition-ui hover:bg-surface-2">
                    {p.cta.label}
                  </Link>
                ) : (
                  <p className="text-sm text-muted">Pas encore en vente : on ne fait rien payer avant que ce soit prêt.</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* 6. FAQ */}
        <section aria-labelledby="faq-titre" className="border-y border-border bg-surface">
          <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-12">
            <h2 id="faq-titre" className="font-display text-2xl font-bold">Questions</h2>
            {faq.map((f) => (
              <details key={f.q} className="group rounded-lg border border-border bg-bg p-4">
                <summary className="cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-2 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 7. Appel final : les trois portes d'entrée */}
        <section aria-labelledby="final-titre" className="mx-auto flex max-w-content flex-col gap-5 px-4 py-12">
          <h2 id="final-titre" className="font-display text-2xl font-bold">Ton équipe au complet jeudi prochain</h2>
          <ul className="flex flex-col gap-3">
            {[
              { href: SIGNUP, Icon: UsersRound, title: "Je gère une équipe", body: "Crée ton équipe, ajoute tes joueurs, on s'occupe des présences et des spares." },
              { href: "/rejoindre", Icon: KeyRound, title: "Je joue dans une équipe", body: "Entre le code que ton gérant t'a envoyé." },
              { href: `/inscription?next=${encodeURIComponent("/ligues/nouvelle")}`, Icon: Trophy, title: "Je gère une ligue", body: "Divisions, horaire de toute la ligue, classement." },
            ].map(({ href, Icon, title, body }) => (
              <li key={title}>
                <Link href={href} className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm transition-ui hover:border-border-input">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent-soft text-on-accent-soft"><Icon aria-hidden className="size-5" /></span>
                  <span className="flex flex-col gap-1">
                    <span className="text-lg font-bold">{title}</span>
                    <span className="text-muted">{body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <span>{APP_NAME} · fait au Québec, en français</span>
          <span>Support en français : on répond en moins de 24 h.</span>
          <nav aria-label="Pages légales" className="flex gap-4">
            <Link href="/confidentialite" className="underline underline-offset-4">Confidentialité</Link>
            <Link href="/conditions" className="underline underline-offset-4">Conditions</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
