import { APP_NAME } from "@/lib/brand";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/app/auth-layout";
import { ResetPasswordForm } from "@/components/app/auth-forms";
import { currentUser } from "@/lib/auth";

export const metadata = { title: `Nouveau mot de passe · ${APP_NAME}` };

export default async function Page() {
  if (!(await currentUser())) redirect("/connexion?lien=expire");
  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Tes autres appareils devront se reconnecter.">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
