"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Banner } from "@/components/ui/feedback";
import { saveEventAction } from "@/app/actions/events";

export interface EventFormDefaults {
  type?: string; date?: string; time?: string; venue?: string; opponent?: string; title?: string;
  maxPlayers?: string; homeRoom?: string; awayRoom?: string;
}

export function EventForm({ teamId, eventId, defaults, teamMax, venues }: {
  teamId: string; eventId: string | null; defaults: EventFormDefaults; teamMax: number; venues: string[];
}) {
  const [state, action, pending] = useActionState(saveEventAction.bind(null, teamId, eventId), null);
  const f = state?.fields ?? {};
  const v = { ...defaults, ...(state?.values ?? {}) };
  const ctl = (name: string) => ({ name, defaultValue: (v as Record<string, string | undefined>)[name] ?? "" });
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <Field label="Type">
        {({ id }) => (
          <Select id={id} {...ctl("type")} defaultValue={v.type ?? "game"}>
            <option value="game">Match</option><option value="practice">Pratique</option><option value="other">Autre (party, tournoi…)</option>
          </Select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" error={f.date}>
          {({ id, describedBy, invalid }) => <Input id={id} type="date" required aria-describedby={describedBy} aria-invalid={invalid} {...ctl("date")} />}
        </Field>
        <Field label="Heure" error={f.time}>
          {({ id, describedBy, invalid }) => <Input id={id} type="time" step={300} required aria-describedby={describedBy} aria-invalid={invalid} {...ctl("time")} />}
        </Field>
      </div>
      <Field label="Aréna" optional error={f.venue}>
        {({ id, describedBy, invalid }) => (
          <>
            <Input id={id} list="venues" placeholder="Ex. Aréna Michel-Normandin, glace 2" maxLength={120} aria-describedby={describedBy} aria-invalid={invalid} {...ctl("venue")} />
            <datalist id="venues">{venues.map((x) => <option key={x} value={x} />)}</datalist>
          </>
        )}
      </Field>
      <Field label="Adversaire" optional error={f.opponent}>
        {({ id, describedBy, invalid }) => <Input id={id} placeholder="Ex. Les Castors" maxLength={60} aria-describedby={describedBy} aria-invalid={invalid} {...ctl("opponent")} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Notre chambre" optional>{({ id }) => <Input id={id} maxLength={10} {...ctl("homeRoom")} />}</Field>
        <Field label="Chambre visiteurs" optional>{({ id }) => <Input id={id} maxLength={10} {...ctl("awayRoom")} />}</Field>
      </div>
      <Field label="Maximum de joueurs" optional hint={`Vide = réglage de l'équipe (${teamMax}).`} error={f.maxPlayers}>
        {({ id, describedBy, invalid }) => <Input id={id} type="number" inputMode="numeric" min={1} max={60} aria-describedby={describedBy} aria-invalid={invalid} {...ctl("maxPlayers")} />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>{eventId ? "Enregistrer" : "Ajouter le match"}</Button>
    </form>
  );
}
