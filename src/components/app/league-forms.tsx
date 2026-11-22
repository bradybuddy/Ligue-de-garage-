"use client";
import { APP_NAME } from "@/lib/brand";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelPicker, type Channel } from "@/components/ui/channel-picker";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Banner } from "@/components/ui/feedback";
import { addTeamAction, createLeagueAction, divisionAction, leagueBroadcastAction, resultAction, saveGameAction, teamDivisionAction } from "@/app/actions/league";
import { callAction, failMessage } from "@/lib/client-action";
import type { Division, LeagueTeam } from "@/lib/data/types";

export function CreateLeagueForm() {
  const [state, action, pending] = useActionState(createLeagueAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <Field label="Nom de la ligue" error={state?.fields?.name}>
        {({ id, describedBy, invalid }) => <Input id={id} name="name" maxLength={80} placeholder="Ex. Ligue de garage du Plateau" defaultValue={state?.values?.name} aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Field label="Divisions" optional hint="Une par ligne. Ex. A, B, Récréatif. Modifiable plus tard.">
        {({ id, describedBy }) => <Textarea id={id} name="divisions" rows={3} defaultValue={state?.values?.divisions} aria-describedby={describedBy} />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>Créer la ligue</Button>
    </form>
  );
}

export function DivisionsEditor({ leagueId, divisions }: { leagueId: string; divisions: Division[] }) {
  const [state, action, pending] = useActionState(divisionAction.bind(null, leagueId), null);
  return (
    <div className="flex flex-col gap-3">
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <ul className="flex flex-wrap gap-2">
        {divisions.map((d) => (
          <li key={d.id}>
            <form action={action} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1">
              <input type="hidden" name="divisionId" value={d.id} />
              <input type="hidden" name="op" value="delete" />
              <span className="text-sm font-semibold">{d.name}</span>
              <button type="submit" aria-label={`Supprimer la division ${d.name}`} disabled={pending} className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-out">
                <Trash2 aria-hidden className="size-3.5" />
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form action={action} className="flex items-end gap-2" noValidate>
        <div className="flex-1">
          <Field label="Nouvelle division" error={state?.fields?.name}>
            {({ id, describedBy, invalid }) => <Input id={id} name="name" maxLength={40} placeholder="Ex. B" aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
        </div>
        <Button type="submit" variant="secondary" loading={pending}><Plus aria-hidden className="size-4" />Ajouter</Button>
      </form>
    </div>
  );
}

export function AddTeamForm({ leagueId, divisions }: { leagueId: string; divisions: Division[] }) {
  const [state, action, pending] = useActionState(addTeamAction.bind(null, leagueId), null);
  const [how, setHow] = useState<"code" | "new">("code");
  return (
    <form action={action} className="flex flex-col gap-4" noValidate key={state?.values?.n ?? "f"}>
      {state?.ok && <Banner tone="info">Équipe ajoutée à la ligue.</Banner>}
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Comment</legend>
        <label className="flex min-h-11 items-start gap-3"><input type="radio" name="how" value="code" checked={how === "code"} onChange={() => setHow("code")} className="mt-1 size-5 accent-accent" />
          <span><span className="font-semibold">L&apos;équipe utilise déjà {APP_NAME}</span><br /><span className="text-sm text-muted">Son gérant te donne le code d&apos;équipe (dans son alignement).</span></span></label>
        <label className="flex min-h-11 items-start gap-3"><input type="radio" name="how" value="new" checked={how === "new"} onChange={() => setHow("new")} className="mt-1 size-5 accent-accent" />
          <span><span className="font-semibold">Créer l&apos;équipe pour elle</span><br /><span className="text-sm text-muted">Tu lui envoies ensuite son code pour que les joueurs la rejoignent.</span></span></label>
      </fieldset>
      {how === "code" ? (
        <Field label="Code de l'équipe" error={state?.fields?.code}>
          {({ id, describedBy, invalid }) => <Input id={id} name="code" autoCapitalize="characters" maxLength={10} className="font-mono uppercase tracking-widest" defaultValue={state?.values?.code} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
      ) : (
        <Field label="Nom de l'équipe" error={state?.fields?.name}>
          {({ id, describedBy, invalid }) => <Input id={id} name="name" maxLength={60} defaultValue={state?.values?.name} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
      )}
      <Field label="Division">
        {({ id }) => <Select id={id} name="divisionId" defaultValue=""><option value="">Sans division</option>{divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}
      </Field>
      <Button type="submit" loading={pending}><Plus aria-hidden className="size-4" />Ajouter l&apos;équipe</Button>
    </form>
  );
}

export function TeamDivisionSelect({ leagueId, team, divisions }: { leagueId: string; team: LeagueTeam; divisions: Division[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <label className="sr-only" htmlFor={`div-${team.id}`}>Division de {team.name}</label>
      <Select id={`div-${team.id}`} defaultValue={team.divisionId ?? ""} disabled={pending} className="h-10 w-40 text-sm"
        onChange={(e) => start(async () => {
          const r = await callAction(() => teamDivisionAction(leagueId, team.id, e.target.value || null));
          if (!r.ok || !r.value.ok) setErr(r.ok ? r.value.error! : failMessage(r.offline, "Non enregistré.")); else { setErr(null); router.refresh(); }
        })}>
        <option value="">Sans division</option>
        {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </Select>
      {err && <span role="alert" className="text-xs text-out">{err}</span>}
    </div>
  );
}

export function GameForm({ leagueId, gameId, teams, defaults }: { leagueId: string; gameId: string | null; teams: LeagueTeam[]; defaults: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveGameAction.bind(null, leagueId, gameId), null);
  const f = state?.fields ?? {};
  const v = { ...defaults, ...(state?.values ?? {}) };
  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name, "fr-CA"));
  return (
    <form action={action} className="flex flex-col gap-4" noValidate key={state?.values?.n ?? "form"}>
      {state?.ok && <Banner tone="info">Match ajouté. Il apparaît dans l&apos;horaire des deux équipes. La date et l&apos;aréna sont gardées pour le suivant.</Banner>}
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" error={f.date}>{({ id, describedBy, invalid }) => <Input id={id} name="date" type="date" defaultValue={v.date} aria-describedby={describedBy} aria-invalid={invalid} />}</Field>
        <Field label="Heure" error={f.time}>{({ id, describedBy, invalid }) => <Input id={id} name="time" type="time" step={300} defaultValue={v.time} aria-describedby={describedBy} aria-invalid={invalid} />}</Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Domicile" error={f.homeTeamId}>
          {({ id, describedBy, invalid }) => <Select id={id} name="homeTeamId" defaultValue={state?.ok ? "" : v.homeTeamId ?? ""} aria-describedby={describedBy} aria-invalid={invalid}><option value="">— Choisir —</option>{sorted.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>}
        </Field>
        <Field label="Visiteurs" error={f.awayTeamId}>
          {({ id, describedBy, invalid }) => <Select id={id} name="awayTeamId" defaultValue={state?.ok ? "" : v.awayTeamId ?? ""} aria-describedby={describedBy} aria-invalid={invalid}><option value="">— Choisir —</option>{sorted.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>}
        </Field>
      </div>
      <Field label="Aréna" optional>{({ id }) => <Input id={id} name="venue" maxLength={120} defaultValue={v.venue} />}</Field>
      <Button type="submit" loading={pending}>{gameId ? "Enregistrer" : "Ajouter le match"}</Button>
    </form>
  );
}

export function ResultForm({ leagueId, gameId, home, away, status, homeScore, awayScore, overtime }: {
  leagueId: string; gameId: string; home: string; away: string; status: string; homeScore: number | null; awayScore: number | null; overtime: boolean;
}) {
  const [state, action, pending] = useActionState(resultAction.bind(null, leagueId, gameId), null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.ok && <Banner tone="info">Enregistré. Le classement et l&apos;horaire des équipes sont à jour.</Banner>}
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-2 text-sm font-semibold">Pointage final</legend>
        <Field label={home}>{({ id }) => <Input id={id} name="homeScore" type="number" inputMode="numeric" min={0} max={99} defaultValue={homeScore ?? ""} className="font-display text-2xl" />}</Field>
        <Field label={away}>{({ id }) => <Input id={id} name="awayScore" type="number" inputMode="numeric" min={0} max={99} defaultValue={awayScore ?? ""} className="font-display text-2xl" />}</Field>
      </fieldset>
      {state?.fields?.score && <p className="text-sm font-medium text-out">{state.fields.score}</p>}
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="overtime" defaultChecked={overtime} className="size-5 accent-accent" />Décidé en prolongation ou en fusillade</label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="op" value="final" loading={pending}>Enregistrer le pointage</Button>
        {status === "scheduled" ? <Button type="submit" name="op" value="cancel" variant="secondary" disabled={pending}>Annuler le match</Button>
          : <Button type="submit" name="op" value="reopen" variant="secondary" disabled={pending}>Remettre à l&apos;horaire</Button>}
      </div>
    </form>
  );
}

export function LeagueBroadcastForm({ leagueId }: { leagueId: string }) {
  const [state, action, pending] = useActionState(leagueBroadcastAction.bind(null, leagueId), null);
  const [channels, setChannels] = useState<Channel[]>(["push", "email"]);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.ok && <Banner tone="info">Message envoyé à {state.values?.sent} personne{Number(state.values?.sent) > 1 ? "s" : ""}.</Banner>}
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">À qui</legend>
        <label className="flex min-h-11 items-center gap-3"><input type="radio" name="audience" value="all" defaultChecked className="size-5 accent-accent" />Tous les joueurs de la ligue</label>
        <label className="flex min-h-11 items-center gap-3"><input type="radio" name="audience" value="managers" className="size-5 accent-accent" />Les gérants seulement</label>
      </fieldset>
      <ChannelPicker value={channels} onChange={setChannels} error={state?.fields?.channels} />
      {channels.map((c) => <input key={c} type="hidden" name="channels" value={c} />)}
      {channels.includes("email") && <Field label="Objet du courriel" optional>{({ id }) => <Input id={id} name="subject" maxLength={120} defaultValue={state?.values?.subject} />}</Field>}
      <Field label="Message" error={state?.fields?.body}>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="body" maxLength={1000} defaultValue={state?.values?.body} aria-describedby={describedBy} aria-invalid={invalid} placeholder="Ex. Les séries commencent le 15 mars. Horaire dans l'appli." />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>Envoyer à la ligue</Button>
    </form>
  );
}
