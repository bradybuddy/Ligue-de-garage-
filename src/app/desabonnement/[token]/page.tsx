import { APP_NAME } from "@/lib/brand";
import { redirect } from "next/navigation";
import { unsubscribeEmail } from "@/lib/data";
import { readUnsubscribeToken } from "@/lib/unsubscribe";
import { AuthLayout } from "@/components/app/auth-layout";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";

export const metadata = { title: `Désabonnement · ${APP_NAME}`, robots: { index: false } };

const labels: Record<string, string> = {
  reminder: "les rappels de match", spare_invite: "les invitations de spare", waitlist: "les avis de liste d'attente", beer: "les avis de tournée",
  chat: "les messages du chat", broadcast: "les messages du gérant", manager_alert: "les alertes de gérant", fees: "les rappels de frais",
};

async function confirm(token: string) {
  "use server";
  const t = readUnsubscribeToken(token);
  if (t) await unsubscribeEmail(t.memberId, t.category);
  redirect(`/desabonnement/${token}?fait=1`);
}

/** GET ne change rien (les antivirus ouvrent les liens) : un bouton confirme. */
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ fait?: string }> }) {
  const { token } = await params;
  const { fait } = await searchParams;
  const t = readUnsubscribeToken(token);
  if (!t) return <AuthLayout title="Lien invalide"><p className="text-muted">Ce lien de désabonnement ne fonctionne pas.</p></AuthLayout>;
  const what = labels[t.category] ?? "ces courriels";
  return (
    <AuthLayout title="Moins de courriels">
      {fait ? (
        <Banner tone="info">C&apos;est fait : tu ne recevras plus {what} par courriel. Tu peux changer d&apos;idée dans Mon compte.</Banner>
      ) : (
        <form action={confirm.bind(null, token)} className="flex flex-col gap-4">
          <p>Ne plus recevoir <strong>{what}</strong> par courriel? Les textos et notifs ne changent pas.</p>
          <Button type="submit" size="lg">Me désabonner</Button>
        </form>
      )}
    </AuthLayout>
  );
}
