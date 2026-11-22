import Link from "next/link";
import { ChevronRight, Phone, Plus, Upload, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTeamForUser, listMembers, type Member, type PlayerClass } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { APP_URL } from "@/lib/messages";
import { prettyPhone } from "@/lib/sms";
import { PageTitle } from "@/components/app/page-title";
import { CopyButton } from "@/components/app/copy-button";
import { Banner, EmptyState } from "@/components/ui/feedback";
import { PlayerList, PlayerRow } from "@/components/ui/player-row";
import { cn } from "@/lib/cn";

const groupLabel: Record<PlayerClass, string> = {
  regular: "Réguliers", spare: "Spares", staff: "Staff", spectator: "Spectateurs", injured: "Blessés", vacation: "En vacances", suspended: "Suspendus",
};
const filters = [["", "Tous"], ["regular", "Réguliers"], ["spare", "Spares"], ["absents", "Absents"]] as const;

/** S11 — Alignement */
export default async function Page({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ classe?: string; bienvenue?: string }> }) {
  const { teamId } = await params;
  const { classe = "", bienvenue } = await searchParams;
  const user = await requireUser();
  const { team, me } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const all = await listMembers(user.id, teamId);
  const manager = me.role !== "member";
  const base = `/t/${teamId}`;
  const shown = all.filter((m) => !classe || (classe === "absents" ? ["injured", "vacation", "suspended"].includes(m.class) : m.class === classe));
  const groups = new Map<PlayerClass, Member[]>();
  for (const m of shown) groups.set(m.class, [...(groups.get(m.class) ?? []), m]);
  const goalies = all.filter((m) => m.position === "goalie" && m.class === "regular").length;
  const regulars = all.filter((m) => m.class === "regular").length;
  const joinUrl = `${APP_URL}/j/${team.inviteCode}`;

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Alignement" sub={`${regulars} réguliers dont ${goalies} gardien${goalies > 1 ? "s" : ""} · ${all.length - regulars} autres`}
        action={manager ? <Link href={`${base}/alignement/nouveau`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent"><Plus aria-hidden className="size-4" />Ajouter</Link> : undefined} />

      {bienvenue && <Banner tone="info">Équipe créée! Étape 2 : ajoute tes joueurs. Le cellulaire suffit, ils n&apos;ont pas besoin de l&apos;appli.</Banner>}

      {manager && (
        <section aria-labelledby="invite-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <h2 id="invite-h" className="font-bold">Inviter des joueurs</h2>
          <p className="text-sm text-muted">Envoie ce lien dans ton groupe de textos. Ils créent leur compte et rejoignent l&apos;équipe direct.</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-surface-2 px-3 py-2 font-mono text-lg font-bold tracking-widest" aria-label={`Code d'équipe : ${team.inviteCode.split("").join(" ")}`}>{team.inviteCode}</span>
            <CopyButton text={joinUrl} label="Copier le lien" />
          </div>
        </section>
      )}

      <nav aria-label="Filtrer par classe" className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {filters.map(([k, l]) => (
          <Link key={k} href={k ? `${base}/alignement?classe=${k}` : `${base}/alignement`} aria-current={classe === k ? "page" : undefined}
            className={cn("inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-ui",
              classe === k ? "border-accent bg-accent-soft text-on-accent-soft" : "border-border-input bg-surface text-text hover:bg-surface-2")}>{l}</Link>
        ))}
      </nav>

      {all.length <= 1 && manager ? (
        <EmptyState icon={<Users />} title="Il n'y a que toi pour l'instant" body="Ajoute tes joueurs un par un, ou importe la liste que tu as déjà dans Excel."
          action={<div className="flex flex-wrap justify-center gap-2">
            <Link href={`${base}/alignement/nouveau`} className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">Ajouter un joueur</Link>
            <Link href={`${base}/alignement/importer`} className="inline-flex h-10 items-center gap-2 rounded-md border border-border-input px-4 text-sm font-semibold"><Upload aria-hidden className="size-4" />Importer</Link>
          </div>} />
      ) : shown.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-6 text-center text-muted">Personne dans cette catégorie.</p>
      ) : (
        [...groups].map(([cls, list]) => (
          <PlayerList key={cls} label={groupLabel[cls]} count={list.length}>
            {list.map((m) => (
              <PlayerRow key={m.id} name={m.displayName} jersey={m.jerseyNumber ?? undefined} position={m.position}
                meta={[m.role === "manager" ? "Gérant" : m.role === "assistant" ? "Adjoint" : null, manager && m.phone ? prettyPhone(m.phone) : null, !m.userId ? "sans compte" : null].filter(Boolean).join(" · ") || undefined}
                action={manager ? (
                  <Link href={`${base}/alignement/${m.id}`} aria-label={`Modifier ${m.displayName}`} className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text">
                    <ChevronRight aria-hidden className="size-5" />
                  </Link>
                ) : m.phone && m.userId !== user.id ? (
                  <a href={`tel:${m.phone}`} aria-label={`Appeler ${m.displayName}`} className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"><Phone aria-hidden className="size-4" /></a>
                ) : undefined} />
            ))}
          </PlayerList>
        ))
      )}

      {manager && all.length > 1 && (
        <Link href={`${base}/alignement/importer`} className="inline-flex h-10 items-center gap-2 self-start rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text"><Upload aria-hidden className="size-4" />Importer ou ramener la saison passée</Link>
      )}
    </div>
  );
}
