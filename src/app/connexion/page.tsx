import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/app/auth-layout";
import { SignInForm } from "@/components/app/auth-forms";
import { currentUser } from "@/lib/auth";
import { DEMO_PASSWORD } from "@/lib/data/store";

export const metadata = { title: "Connexion · Buddy & Beer" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentUser()) redirect(next ?? "/");
  return (
    <AuthLayout title="Content de te revoir" subtitle="Connecte-toi pour répondre à tes matchs.">
      <SignInForm next={next} />
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-4 rounded-md bg-surface-2 p-3 text-sm text-muted">
          Démo : <strong className="text-text">marc@exemple.ca</strong> (gérant) ou <strong className="text-text">sophie@exemple.ca</strong> (joueuse), mot de passe <strong className="text-text">{DEMO_PASSWORD}</strong>.
        </p>
      )}
    </AuthLayout>
  );
}
