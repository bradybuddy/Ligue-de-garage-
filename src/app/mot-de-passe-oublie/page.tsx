import { APP_NAME } from "@/lib/brand";
import { AuthLayout } from "@/components/app/auth-layout";
import { ForgotPasswordForm } from "@/components/app/auth-forms";

export const metadata = { title: `Mot de passe oublié · ${APP_NAME}` };

export default function Page() {
  return (
    <AuthLayout title="Mot de passe oublié" subtitle="On t'envoie un lien pour en choisir un nouveau.">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
