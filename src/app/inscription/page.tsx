import { APP_NAME } from "@/lib/brand";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/app/auth-layout";
import { SignUpForm } from "@/components/app/auth-forms";
import { currentUser } from "@/lib/auth";

export const metadata = { title: `Créer un compte · ${APP_NAME}` };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentUser()) redirect(next ?? "/");
  return (
    <AuthLayout title="Embarque" subtitle="Gratuit, sans pub. Ton équipe au complet en un clic.">
      <SignUpForm next={next} />
    </AuthLayout>
  );
}
