"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChannelPicker, type Channel } from "@/components/ui/channel-picker";
import { Field, Input, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Banner } from "@/components/ui/feedback";
import { saveSettingsAction } from "@/app/actions/settings";
import type { Team } from "@/lib/data/types";

const hours = [12, 24, 36, 48, 72, 96];
const section = "flex flex-col gap-4 rounded-lg border border-border bg-surface p-4";

export function SettingsForm({ team }: { team: Team }) {
  const [state, action, pending] = useActionState(saveSettingsAction.bind(null, team.id), null);
  const f = state?.fields ?? {};
  const v = state?.values ?? {};
  const [spares, setSpares] = useState(team.autoSparesEnabled);
  const [channels, setChannels] = useState<Channel[]>(team.autoSparesChannels);
  const [beer, setBeer] = useState(team.beerEnabled);
  const hoursSelect = (name: string, value: number, id: string) => (
    <Select id={id} name={name} defaultValue={String(v[name] ?? value)}>
      {[...new Set([...hours, value])].sort((a, b) => a - b).map((h) => <option key={h} value={h}>{h} h avant{h >= 48 ? ` (${h / 24} jours)` : ""}</option>)}
    </Select>
  );
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state?.ok && <Banner tone="info">Réglages enregistrés. Ils s&apos;appliquent aux prochains envois.</Banner>}
      {state?.error && <Banner tone="danger">{state.error}</Banner>}

      <section aria-labelledby="s-team" className={section}>
        <h2 id="s-team" className="font-bold">Équipe</h2>
        <Field label="Nom de l'équipe" error={f.name}>
          {({ id, describedBy, invalid }) => <Input id={id} name="name" maxLength={60} defaultValue={v.name ?? team.name} aria-describedby={describedBy} aria-invalid={invalid} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Joueurs par match" error={f.maxPlayers}>
            {({ id, describedBy, invalid }) => <Input id={id} name="maxPlayers" type="number" inputMode="numeric" min={1} max={60} defaultValue={v.maxPlayers ?? team.maxPlayers} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field label="Gardiens par match" error={f.maxGoalies}>
            {({ id, describedBy, invalid }) => <Input id={id} name="maxGoalies" type="number" inputMode="numeric" min={0} max={6} defaultValue={v.maxGoalies ?? team.maxGoalies} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
        </div>
      </section>

      <section aria-labelledby="s-rem" className={section}>
        <h2 id="s-rem" className="font-bold">Rappels</h2>
        <Field label="Demander « t'es là? »" hint="Par notif, texto et courriel, à ceux qui n'ont pas répondu.">{({ id }) => hoursSelect("reminderHoursBefore", team.reminderHoursBefore, id)}</Field>
      </section>

      <section aria-labelledby="s-spares" className={section}>
        <h2 id="s-spares" className="font-bold">Spares</h2>
        <Switch checked={spares} onChange={setSpares} label="Inviter les spares automatiquement" description="Seulement s'il manque du monde, et seulement les spares qui n'ont pas déjà répondu." />
        <input type="hidden" name="autoSparesEnabled" value={spares ? "on" : ""} />
        {spares && (
          <>
            <Field label="Moment de l'invitation">{({ id }) => hoursSelect("autoSparesHoursBefore", team.autoSparesHoursBefore, id)}</Field>
            <ChannelPicker value={channels} onChange={setChannels} error={f.autoSparesChannels} />
          </>
        )}
        {!spares && <input type="hidden" name="autoSparesHoursBefore" value={team.autoSparesHoursBefore} />}
        {channels.map((c) => <input key={c} type="hidden" name="autoSparesChannels" value={c} />)}
      </section>

      <section aria-labelledby="s-wait" className={section}>
        <h2 id="s-wait" className="font-bold">Liste d&apos;attente</h2>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Quand une place se libère</legend>
          {([["top", "Le premier de la liste monte tout seul", "Réguliers avant spares, sauf si tu changes l'ordre."],
             ["first_accept", "Toute la liste est avisée, le premier qui répond l'obtient", "Plus rapide quand la liste est longue."],
             ["off", "Pas de liste d'attente", "Quand c'est complet, personne d'autre ne peut se mettre IN."]] as const).map(([val, label, hint]) => (
            <label key={val} className="flex min-h-11 items-start gap-3 rounded-md p-2 hover:bg-surface-2">
              <input type="radio" name="waitlistMode" value={val} defaultChecked={(v.waitlistMode ?? team.waitlistMode) === val} className="mt-1 size-5 accent-accent" />
              <span><span className="font-semibold">{label}</span><br /><span className="text-sm text-muted">{hint}</span></span>
            </label>
          ))}
        </fieldset>
      </section>

      <section aria-labelledby="s-beer" className={section}>
        <h2 id="s-beer" className="font-bold">La tournée</h2>
        <Switch checked={beer} onChange={setBeer} label="Choisir qui apporte la bière" description="24 h avant chaque match, parmi les joueurs IN." />
        <input type="hidden" name="beerEnabled" value={beer ? "on" : ""} />
        <Field label="En cas d'égalité">
          {({ id }) => (
            <Select id={id} name="beerTiebreak" defaultValue={v.beerTiebreak ?? team.beerTiebreak ?? "alpha"}>
              <option value="alpha">Ordre alphabétique</option><option value="jersey">Numéro de chandail</option>
            </Select>
          )}
        </Field>
      </section>

      <Button type="submit" size="lg" loading={pending}>Enregistrer</Button>
    </form>
  );
}
