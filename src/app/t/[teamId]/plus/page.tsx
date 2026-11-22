import Link from "next/link";
import { BarChart3, Beer, ChevronRight, CircleDollarSign, Megaphone, Settings, UserRound, Vote } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTeamForUser } from "@/lib/data";
import { orNotFound } from "@/lib/guard";
import { PageTitle } from "@/components/app/page-title";

/** Menu « Plus » */
export default async function Page({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const user = await requireUser();
  const { me } = await orNotFound(() => getTeamForUser(user.id, teamId));
  const manager = me.role !== "member";
  const b = `/t/${teamId}`;
  const items = [
    { href: `${b}/tournee`, label: "La tournée", Icon: Beer },
    { href: `${b}/stats`, label: "Stats", Icon: BarChart3 },
    { href: `${b}/bulletins`, label: "Bulletins et sondages", Icon: Vote },
    { href: `${b}/finances`, label: "Frais", Icon: CircleDollarSign },
    ...(manager ? [{ href: `${b}/diffusion`, label: "Message à toute l'équipe", Icon: Megaphone }, { href: `${b}/reglages`, label: "Réglages de l'équipe", Icon: Settings }] : []),
    { href: "/compte", label: "Mon compte et mes avis", Icon: UserRound },
  ];
  return (
    <>
      <PageTitle title="Plus" />
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {items.map(({ href, label, Icon }) => (
          <li key={href}><Link href={href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2">
            <Icon aria-hidden className="size-5 text-muted" /><span className="flex-1 font-semibold">{label}</span><ChevronRight aria-hidden className="size-5 text-muted" />
          </Link></li>
        ))}
      </ul>
    </>
  );
}
