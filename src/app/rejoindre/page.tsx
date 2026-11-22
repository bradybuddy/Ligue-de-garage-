import { APP_NAME } from "@/lib/brand";
import { AuthLayout } from "@/components/app/auth-layout";
import { CodeForm } from "@/components/app/join-forms";

export const metadata = { title: `Rejoindre une équipe · ${APP_NAME}` };

/** S03 — Rejoindre une équipe par code */
export default function Page() {
  return (
    <AuthLayout title="Rejoindre une équipe" subtitle="Entre le code que ton gérant t'a envoyé.">
      <CodeForm />
    </AuthLayout>
  );
}
