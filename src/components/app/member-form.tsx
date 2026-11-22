"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Banner } from "@/components/ui/feedback";
import { saveMemberAction } from "@/app/actions/members";

const classes = [["regular", "Régulier"], ["spare", "Spare"], ["spectator", "Spectateur"], ["staff", "Staff"], ["vacation", "Vacances"], ["injured", "Blessé"], ["suspended", "Suspendu"]];

export function MemberForm({ teamId, memberId, defaults, canSetRole }: {
  teamId: string; memberId: string | null; defaults: Record<string, string>; canSetRole: boolean;
}) {
  const [state, action, pending] = useActionState(saveMemberAction.bind(null, teamId, memberId), null);
  const f = state?.fields ?? {};
  const v = { ...defaults, ...(state?.values ?? {}) };
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <Field label="Nom" error={f.displayName}>
        {({ id, describedBy, invalid }) => <Input id={id} name="displayName" autoComplete="off" maxLength={60} aria-describedby={describedBy} aria-invalid={invalid} defaultValue={v.displayName} />}
      </Field>
      <Field label="Cellulaire" optional hint="Il pourra répondre Y ou N par texto, sans appli." error={f.phone}>
        {({ id, describedBy, invalid }) => <Input id={id} name="phone" type="tel" inputMode="tel" placeholder="514-555-1234" aria-describedby={describedBy} aria-invalid={invalid} defaultValue={v.phone} />}
      </Field>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" name="smsOptIn" defaultChecked={v.smsOptIn !== ""} className="mt-0.5 size-5 accent-accent" />
        <span><span className="font-semibold">Il accepte de recevoir des textos de l&apos;équipe.</span><br /><span className="text-muted">Obligatoire selon la loi anti-pourriel. Il peut répondre STOP en tout temps.</span></span>
      </label>
      <Field label="Courriel" optional error={f.email}>
        {({ id, describedBy, invalid }) => <Input id={id} name="email" type="email" autoComplete="off" aria-describedby={describedBy} aria-invalid={invalid} defaultValue={v.email} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Classe">
          {({ id }) => <Select id={id} name="class" defaultValue={v.class ?? "regular"}>{classes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}
        </Field>
        <Field label="Position">
          {({ id }) => <Select id={id} name="position" defaultValue={v.position ?? "skater"}><option value="skater">Joueur</option><option value="goalie">Gardien</option></Select>}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="N° de chandail" optional error={f.jerseyNumber}>
          {({ id, describedBy, invalid }) => <Input id={id} name="jerseyNumber" type="number" inputMode="numeric" min={0} max={99} aria-describedby={describedBy} aria-invalid={invalid} defaultValue={v.jerseyNumber} />}
        </Field>
        {canSetRole ? (
          <Field label="Rôle">
            {({ id }) => <Select id={id} name="role" defaultValue={v.role ?? "member"}><option value="member">Joueur</option><option value="assistant">Adjoint</option><option value="manager">Gérant</option></Select>}
          </Field>
        ) : <input type="hidden" name="role" value={v.role ?? "member"} />}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="lg" loading={pending} className="sm:flex-1">{memberId ? "Enregistrer" : "Ajouter"}</Button>
        {!memberId && <Button type="submit" name="again" value="1" size="lg" variant="secondary" disabled={pending} className="sm:flex-1">Ajouter et en ajouter un autre</Button>}
      </div>
    </form>
  );
}
