"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CalendarPlus, Moon, Send, Sun, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { ClassBadge, StatusPill, type AttendanceStatus, type PlayerClass } from "@/components/ui/badges";
import { AttendanceCounter, AttendanceToggle } from "@/components/ui/attendance";
import { MatchCard } from "@/components/ui/match-card";
import { PlayerList, PlayerRow } from "@/components/ui/player-row";
import { BeerCard } from "@/components/ui/beer-card";
import { ChannelPicker, type Channel } from "@/components/ui/channel-picker";
import { ChatBubble } from "@/components/ui/chat";
import { StatsTable } from "@/components/ui/stats-table";
import { Banner, EmptyState, Skeleton } from "@/components/ui/feedback";
import { BottomNav } from "@/components/ui/bottom-nav";
import { FileDrop } from "@/components/ui/file-drop";
import { Dialog } from "@/components/ui/dialog";

function Section({ id, title, ids, children }: { id: string; title: string; ids?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${id}-h`} className="font-display text-2xl font-bold">{title}</h2>
        {ids && <span className="text-xs text-muted">{ids}</span>}
      </div>
      {children}
    </section>
  );
}

const swatches = [
  ["bg", "text"], ["surface", "text"], ["surface-2", "text"], ["accent", "on-accent"], ["accent-soft", "on-accent-soft"],
  ["in", "on-in"], ["in-soft", "on-in-soft"], ["out", "on-out"], ["out-soft", "on-out-soft"],
  ["wait", "on-wait"], ["wait-soft", "on-wait-soft"], ["warning-soft", "on-warning-soft"],
] as const;

const classes: PlayerClass[] = ["regular", "spare", "spectator", "staff", "vacation", "injured", "suspended"];
const statuses: AttendanceStatus[] = ["in", "out", "waitlist", "no_reply"];

const thursday = new Date("2026-11-26T02:15:00Z"); // mer. 25 nov. 21 h 15 à Montréal

export default function DesignPage() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [me, setMe] = useState<AttendanceStatus>("no_reply");
  const [pending, setPending] = useState<"in" | "out" | null>(null);
  const [channels, setChannels] = useState<Channel[]>(["push", "sms"]);
  const [sw, setSw] = useState({ spares: true, waitlist: false });
  const [dlg, setDlg] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("theme");
    if (t === "dark" || t === "light") setTheme(t);
  }, []);
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
  }, [theme]);

  const respond = (v: "in" | "out") => {
    setPending(v);
    setTimeout(() => { setMe(v); setPending(null); }, 500);
  };

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-wide items-center justify-between px-4">
          <p className="font-display text-xl font-bold">Buddy &amp; Beer · Système de design</p>
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-wide flex-col gap-10 px-4 py-8">
        <Section id="colors" title="Couleurs (rôles)">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {swatches.map(([bg, fg]) => (
              <div key={bg} className="flex h-20 flex-col justify-end rounded-md border border-border p-2 text-xs font-semibold"
                style={{ background: `var(--${bg})`, color: `var(--${fg})` }}>
                <span>{bg}</span><span className="font-normal">{fg}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" title="Typographie">
          <div className="flex flex-col gap-2">
            <p className="font-display text-3xl font-bold">Barlow Condensed 40 · 21 h 15</p>
            <p className="font-display text-2xl font-bold">Barlow Condensed 28 · Mercredi</p>
            <p className="text-xl font-bold">Inter 20 gras · Titre de section</p>
            <p className="text-lg font-semibold">Inter 18 · Sous-titre</p>
            <p className="text-base">Inter 16 · Texte courant. Les accents sont bien rendus : é è ê à ç ô û.</p>
            <p className="text-sm text-muted">Inter 14 · Texte secondaire</p>
            <p className="text-xs text-muted">Inter 12 · Légende, horodatage</p>
          </div>
        </Section>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Section id="attendance" title="Bouton IN / OUT" ids="S05 S07">
            <AttendanceToggle value={me} onChange={respond} pending={pending} />
            <div className="grid grid-cols-2 gap-4">
              <AttendanceToggle value="waitlist" onChange={() => {}} size="md" />
              <AttendanceToggle value="no_reply" onChange={() => {}} size="md" lockedReason="Frais de spare à payer avant de jouer" />
            </div>
          </Section>

          <Section id="counters" title="Compteurs" ids="S07">
            <AttendanceCounter label="Joueurs" count={14} max={20} />
            <AttendanceCounter label="Gardiens" count={2} max={2} />
            <BeerCard name="Max Tremblay" drinksBrought={2} />
            <BeerCard name="Moi" isMe />
            <BeerCard name={null} />
          </Section>
        </div>

        <Section id="match" title="Carte de match" ids="S05 S06 L01">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <MatchCard state="upcoming" startsAt={thursday} opponent="Les Castors" venue="Aréna Michel-Normandin, glace 2" myStatus={me} inCount={14} max={20} />
            <MatchCard state="live" startsAt={thursday} opponent="Les Zambonis" venue="Centre Étienne-Desmarteau" myStatus="in" inCount={20} max={20} />
            <MatchCard state="final" startsAt={thursday} opponent="Les Pingouins" venue="Aréna Saint-Michel" score={{ us: 6, them: 4 }} />
            <MatchCard state="cancelled" startsAt={thursday} opponent="Les Moustaches" venue="Aréna Maurice-Richard" myStatus="in" />
          </div>
        </Section>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Section id="badges" title="Pastilles" ids="S11 S12">
            <div className="flex flex-wrap gap-2">{classes.map((c) => <ClassBadge key={c} value={c} />)}</div>
            <div className="flex flex-wrap gap-2">{statuses.map((s) => <StatusPill key={s} value={s} />)}</div>
          </Section>

          <Section id="buttons" title="Boutons">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Créer le match</Button>
              <Button variant="secondary">Annuler</Button>
              <Button variant="ghost">Plus tard</Button>
              <Button variant="danger">Supprimer</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Petit</Button>
              <Button size="lg"><CalendarPlus aria-hidden className="size-5" />Ajouter au calendrier</Button>
              <Button loading>Envoi</Button>
              <Button disabled>Désactivé</Button>
            </div>
          </Section>
        </div>

        <Section id="players" title="Liste de joueurs" ids="S07 S11 S15">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PlayerList label="IN" count={3}>
              <PlayerRow name="Jean-François Bélanger-Archambault" jersey={17} status="in" note="J'arrive à 21 h pile, je viens du travail" />
              <PlayerRow name="Max Tremblay" jersey={4} status="in" beer />
              <PlayerRow name="Sophie Gagnon" jersey={31} position="goalie" status="in" />
            </PlayerList>
            <PlayerList label="Liste d'attente" count={2}>
              <PlayerRow name="Karim Haddad" playerClass="regular" status="waitlist"
                action={<Button size="sm" variant="secondary">Accepter</Button>} />
              <PlayerRow name="Léa Roy" playerClass="spare" status="waitlist"
                action={<Button size="sm" variant="secondary">Accepter</Button>} />
            </PlayerList>
          </div>
        </Section>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Section id="forms" title="Formulaires" ids="S02 S08 S12">
            <Field label="Aréna" hint="Le nom que les gars reconnaissent.">
              {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} defaultValue="Aréna Michel-Normandin" />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">{({ id }) => <Input id={id} type="date" defaultValue="2026-11-25" />}</Field>
              <Field label="Heure">{({ id }) => <Input id={id} type="time" defaultValue="21:15" />}</Field>
            </div>
            <Field label="Courriel" error="Ce courriel est déjà dans l'équipe.">
              {({ id, describedBy, invalid }) => <Input id={id} type="email" aria-describedby={describedBy} aria-invalid={invalid} defaultValue="max@exemple.ca" />}
            </Field>
            <Field label="Classe">
              {({ id }) => <Select id={id} defaultValue="spare">{classes.map((c) => <option key={c} value={c}>{c}</option>)}</Select>}
            </Field>
            <Field label="Note" optional>{({ id }) => <Textarea id={id} placeholder="Ex. j'apporte les rondelles" />}</Field>
            <Field label="Désactivé">{({ id }) => <Input id={id} disabled defaultValue="Non modifiable" />}</Field>
          </Section>

          <Section id="settings" title="Réglages et canaux" ids="S14 S18 S25 S26">
            <ChannelPicker value={channels} onChange={setChannels} error={channels.length ? undefined : "Choisis au moins un canal."} />
            <div className="divide-y divide-border rounded-lg border border-border bg-surface px-4">
              <Switch checked={sw.spares} onChange={(v) => setSw({ ...sw, spares: v })} label="Inviter les spares automatiquement" description="36 h avant le match s'il manque du monde" />
              <Switch checked={sw.waitlist} onChange={(v) => setSw({ ...sw, waitlist: v })} label="Liste d'attente automatique" />
              <Switch checked={false} onChange={() => {}} label="Courriels du chat" description="Désactivé par défaut" disabled />
            </div>
            <Button variant="secondary" onClick={() => setDlg(true)}><Send aria-hidden className="size-4" />Ouvrir un dialogue</Button>
          </Section>
        </div>

        <Section id="chat" title="La chambre (chat)" ids="S16 S17">
          <div className="flex max-w-content flex-col gap-4 rounded-lg border border-border bg-surface p-4">
            <ChatBubble author="Max Tremblay" time="20 h 41" body="Qui a les clés du local à rondelles?"
              reactions={[{ emoji: "😂", names: ["Sophie Gagnon", "Karim Haddad", "Léa Roy", "Jean-François Bélanger-Archambault"], mine: false }]} />
            <ChatBubble author="Moi" mine time="20 h 43" body="Moi. Pis c'est ma tournée jeudi 🍺"
              reactions={[{ emoji: "🔥", names: ["Max Tremblay", "Sophie Gagnon"], mine: false }, { emoji: "👍", names: ["Moi"], mine: true }]} />
            <ChatBubble author="Moi" mine time="" body="Message qui n'est pas parti" failed />
          </div>
        </Section>

        <Section id="stats" title="Tableau de stats" ids="S24 L05 L06">
          <StatsTable
            caption="Pointeurs de la saison"
            initialSort="pts"
            cols={[
              { key: "name", label: "Joueur" },
              { key: "gp", label: "Parties jouées", abbr: "PJ", numeric: true },
              { key: "g", label: "Buts", abbr: "B", numeric: true },
              { key: "a", label: "Passes", abbr: "A", numeric: true },
              { key: "pts", label: "Points", abbr: "PTS", numeric: true },
              { key: "pim", label: "Minutes de punition", abbr: "PUN", numeric: true },
            ]}
            rows={[
              { name: "Max Tremblay", gp: 12, g: 9, a: 7, pts: 16, pim: 4 },
              { name: "Karim Haddad", gp: 11, g: 5, a: 12, pts: 17, pim: 0 },
              { name: "Jean-François Bélanger-Archambault", gp: 12, g: 3, a: 4, pts: 7, pim: 10 },
            ]}
          />
        </Section>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Section id="upload" title="Importer" ids="S09 S13">
            <FileDrop onFile={() => {}} />
            <FileDrop onFile={() => {}} error="Ligne 4 : il manque la date. Rien n'a été importé." />
          </Section>
          <Section id="states" title="États vides, bannières, chargement">
            <EmptyState icon={<Users />} title="Ton alignement est vide" body="Ajoute tes joueurs un par un, ou importe la liste Excel que tu as déjà."
              action={<Button>Ajouter un joueur</Button>} />
            <Banner tone="offline">Pas de connexion. Ta réponse sera envoyée dès que le réseau revient.</Banner>
            <Banner tone="warning">Le match a été déplacé à 22 h 30.</Banner>
            <Banner tone="danger">Ta réponse n&apos;a pas été enregistrée. Réessaie.</Banner>
            <div className="flex flex-col gap-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
          </Section>
        </div>
      </main>

      <BottomNav active="home" unread={3} className="fixed inset-x-0 bottom-0 lg:hidden" />

      <Dialog open={dlg} onClose={() => setDlg(false)} title="Inviter des spares"
        footer={<><Button variant="ghost" onClick={() => setDlg(false)}>Annuler</Button><Button onClick={() => setDlg(false)}>Envoyer à 4 spares</Button></>}>
        <p className="text-muted">Il manque 3 joueurs pour mercredi. On envoie l&apos;invitation aux spares actifs.</p>
      </Dialog>
    </div>
  );
}
