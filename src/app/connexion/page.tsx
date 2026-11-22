import { APP_NAME } from "@/lib/brand";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/app/auth-layout";
import { SignInForm } from "@/components/app/auth-forms";
import { currentUser } from "@/lib/auth";
import { Banner } from "@/components/ui/feedback";

export const metadata = { title: `Connexion · ${APP_NAME}` };

const notices: Record<string, { tone: "info" | "warning" | "danger"; text: string }> = {
  expire: { tone: "warning", text: "Ce lien a expiré. Connecte-toi ou redemande un lien." },
  invalide: { tone: "danger", text: "Ce lien n'est pas valide." },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; lien?: string; partout?: string }> }) {
  const { next, lien, partout } = await searchParams;
  if (await currentUser()) redirect(next ?? "/");
  return (
    <AuthLayout title="Content de te revoir" subtitle="Connecte-toi pour répondre à tes matchs.">
      {lien && notices[lien] && <div className="mb-4"><Banner tone={notices[lien].tone}>{notices[lien].text}</Banner></div>}
      {partout && <div className="mb-4"><Banner tone="info">Tu es déconnecté de tous tes appareils.</Banner></div>}
      <SignInForm next={next} />
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-4 rounded-md bg-surface-2 p-3 text-sm text-muted">
          Démo : <strong className="text-text">marc@exemple.ca</strong> (gérant) ou <strong className="text-text">sophie@exemple.ca</strong> (joueuse), mot de passe <strong className="text-text">buddy123</strong> (données de <code>npm run db:seed</code>).
        </p>
      )}
    </AuthLayout>
  );
}
