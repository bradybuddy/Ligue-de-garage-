"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Banner } from "@/components/ui/feedback";
import { signInAction, signUpAction } from "@/app/actions/auth";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label="Courriel">
        {({ id }) => <Input id={id} name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />}
      </Field>
      <Field label="Mot de passe">
        {({ id }) => <Input id={id} name="password" type="password" autoComplete="current-password" required />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>Me connecter</Button>
      <p className="text-center text-sm text-muted">
        Mot de passe oublié? <span className="text-text">Le lien de réinitialisation arrive avec la vraie connexion.</span>
      </p>
      <p className="text-center text-sm">
        Pas de compte? <Link href={`/inscription${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-accent-strong underline underline-offset-4">Crée-le en 30 secondes</Link>
      </p>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signUpAction, null);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label="Ton nom" hint="Comme les gars t'appellent dans la chambre." error={f.displayName}>
        {({ id, describedBy, invalid }) => <Input id={id} name="displayName" autoComplete="name" aria-describedby={describedBy} aria-invalid={invalid} defaultValue={state?.values?.displayName} />}
      </Field>
      <Field label="Courriel" error={f.email}>
        {({ id, describedBy, invalid }) => <Input id={id} name="email" type="email" autoComplete="email" aria-describedby={describedBy} aria-invalid={invalid} defaultValue={state?.values?.email} />}
      </Field>
      <Field label="Cellulaire" optional hint="Pour répondre Y ou N par texto. Jamais de pub." error={f.phone}>
        {({ id, describedBy, invalid }) => <Input id={id} name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="514-555-1234" aria-describedby={describedBy} aria-invalid={invalid} defaultValue={state?.values?.phone} />}
      </Field>
      <Field label="Mot de passe" hint="8 caractères minimum." error={f.password}>
        {({ id, describedBy, invalid }) => <Input id={id} name="password" type="password" autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>Créer mon compte</Button>
      <p className="text-center text-sm">
        Déjà un compte? <Link href={`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-accent-strong underline underline-offset-4">Connecte-toi</Link>
      </p>
    </form>
  );
}
