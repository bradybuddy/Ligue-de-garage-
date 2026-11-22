"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Banner } from "@/components/ui/feedback";
import { joinTeamAction, lookupCodeAction } from "@/app/actions/join";

export function JoinButton({ code, teamName }: { code: string; teamName: string }) {
  const [state, action, pending] = useActionState(joinTeamAction.bind(null, code), null);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <Button type="submit" size="lg" loading={pending}>Rejoindre {teamName}</Button>
    </form>
  );
}

export function CodeForm() {
  const [state, action, pending] = useActionState(lookupCodeAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Code de l'équipe" hint="6 caractères, ex. BUDDY4. Ton gérant le trouve dans l'alignement." error={state?.fields?.code}>
        {({ id, describedBy, invalid }) => <Input id={id} name="code" autoComplete="off" autoCapitalize="characters" maxLength={10}
          className="font-mono text-lg uppercase tracking-widest" aria-describedby={describedBy} aria-invalid={invalid} defaultValue={state?.values?.code} />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>Continuer</Button>
    </form>
  );
}
