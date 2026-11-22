"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function LeagueNav({ base, isAdmin }: { base: string; isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: base, label: "Accueil", exact: true },
    { href: `${base}/equipes`, label: "Équipes" },
    { href: `${base}/horaire`, label: "Horaire" },
    { href: `${base}/classement`, label: "Classement" },
    ...(isAdmin ? [{ href: `${base}/diffusion`, label: "Message" }] : []),
  ];
  return (
    <nav aria-label="Navigation de la ligue" className="-mx-4 overflow-x-auto border-b border-border px-4">
      <ul className="flex gap-1">
        {items.map((it) => {
          const on = it.exact ? path === it.href : path.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link href={it.href} aria-current={on ? "page" : undefined}
                className={cn("inline-flex h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-ui",
                  on ? "border-accent text-text" : "border-transparent text-muted hover:text-text")}>{it.label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
