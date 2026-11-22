"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Banner } from "@/components/ui/feedback";
import { deleteAccountAction, forgotPasswordAction, signInAction, signUpAction, updatePasswordAction } from "@/app/actions/auth";
import { MailCheck } from "lucide-react";

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
      <p className="text-center text-sm">
        <Link href="/mot-de-passe-oublie" className="font-semibold text-accent-strong underline underline-offset-4">Mot de passe oublié?</Link>
      </p>
      <p className="text-center text-sm">
        Pas de compte? <Link href={`/inscription${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-accent-strong underline underline-offset-4">Crée-le en 30 secondes</Link>
      </p>
    </form>
  );
}

function CheckYourEmail({ email, what }: { email?: string; what: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
      <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-in-soft text-on-in-soft"><MailCheck className="size-6" /></span>
      <p className="text-lg font-bold">Regarde tes courriels</p>
      <p className="text-muted">Si {email ? <strong className="text-text">{email}</strong> : "ce courriel"} {what} Pense à vérifier les indésirables.</p>
    </div>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signUpAction, null);
  const f = state?.fields ?? {};
  if (state?.ok) return <CheckYourEmail email={state.values?.email} what="est bon, on vient de t'envoyer un lien pour confirmer ton compte." />;
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
      <p className="text-center text-sm text-muted">
        En créant ton compte, tu acceptes les <Link href="/conditions" className="underline underline-offset-4">conditions</Link> et la <Link href="/confidentialite" className="underline underline-offset-4">politique de confidentialité</Link>.
      </p>
      <p className="text-center text-sm">
        Déjà un compte? <Link href={`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-accent-strong underline underline-offset-4">Connecte-toi</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  if (state?.ok) return <CheckYourEmail email={state.values?.email} what="a un compte, on vient d'envoyer un lien pour choisir un nouveau mot de passe." />;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <Field label="Courriel" error={state?.fields?.email}>
        {({ id, describedBy, invalid }) => <Input id={id} name="email" type="email" autoComplete="email" aria-describedby={describedBy} aria-invalid={invalid} defaultValue={state?.values?.email} />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>Envoyer le lien</Button>
      <p className="text-center text-sm"><Link href="/connexion" className="font-semibold text-accent-strong underline underline-offset-4">Retour à la connexion</Link></p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, null);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <Field label="Nouveau mot de passe" hint="8 caractères minimum." error={f.password}>
        {({ id, describedBy, invalid }) => <Input id={id} name="password" type="password" autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Field label="Encore une fois" error={f.confirm}>
        {({ id, describedBy, invalid }) => <Input id={id} name="confirm" type="password" autoComplete="new-password" aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Button type="submit" size="lg" loading={pending}>Enregistrer</Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, null);
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <Field label="Écris SUPPRIMER pour confirmer" error={state?.fields?.confirm}>
        {({ id, describedBy, invalid }) => <Input id={id} name="confirm" autoComplete="off" aria-describedby={describedBy} aria-invalid={invalid} />}
      </Field>
      <Button type="submit" variant="danger" loading={pending}>Supprimer mon compte pour de bon</Button>
    </form>
  );
}
