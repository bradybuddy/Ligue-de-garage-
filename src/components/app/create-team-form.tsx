"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Banner } from "@/components/ui/feedback";
import { createTeamAction } from "@/app/actions/teams";

const sports = [["hockey", "Hockey"], ["dek", "Dek hockey"], ["ringuette", "Ringuette"], ["soccer", "Soccer"], ["balle", "Balle-molle"], ["autre", "Autre"]];

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(createTeamAction, null);
  const f = state?.fields ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <Field label="Nom de l'équipe" error={f.name}>
        {({ id, describedBy, invalid }) => <Input id={id} name="name" placeholder="Ex. Les Buddies du jeudi" maxLength={60} aria-describedby={describedBy} aria-invalid={invalid} defaultValue={v.name} />}
      </Field>
      <Field label="Sport" error={f.sport}>
        {({ id }) => <Select id={id} name="sport" defaultValue={v.sport ?? "hockey"}>{sports.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}
      </Field>
      <Field label="Joueurs par match (sans les gardiens)" hint="Au-delà, les suivants vont sur la liste d'attente. Modifiable en tout temps." error={f.maxPlayers}>
        {({ id, describedBy, invalid }) => <Input id={id} name="maxPlayers" type="number" inputMode="numeric" min={1} max={60} aria-describedby={describedBy} aria-invalid={invalid} defaultValue={v.maxPlayers ?? "16"} />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>Créer l&apos;équipe</Button>
    </form>
  );
}
