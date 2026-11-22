"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Menu, MessagesSquare, Users } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { seg: "", label: "Accueil", Icon: Home },
  { seg: "/horaire", label: "Horaire", Icon: CalendarDays, also: ["/matchs"] },
  { seg: "/alignement", label: "Alignement", Icon: Users },
  { seg: "/chambre", label: "La chambre", Icon: MessagesSquare },
  { seg: "/plus", label: "Plus", Icon: Menu, also: ["/reglages", "/finances", "/stats", "/tournee", "/diffusion", "/bulletins"] },
];

function useActive(base: string) {
  const path = usePathname();
  return (it: (typeof items)[number]) => {
    const rest = path.slice(base.length);
    if (it.seg === "") return rest === "" || rest === "/";
    return rest.startsWith(it.seg) || !!it.also?.some((a) => rest.startsWith(a));
  };
}

/** Barre du bas (mobile). */
export function TeamBottomNav({ base }: { base: string }) {
  const isActive = useActive(base);
  return (
    <nav aria-label="Navigation de l'équipe" className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto grid h-16 max-w-content grid-cols-5">
        {items.map((it) => {
          const on = isActive(it);
          return (
            <li key={it.seg}>
              <Link href={`${base}${it.seg}`} aria-current={on ? "page" : undefined}
                className={cn("flex h-full flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-ui", on ? "text-text" : "text-muted hover:text-text")}>
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", on && "bg-accent-soft text-on-accent-soft")}>
                  <it.Icon aria-hidden className="size-5" />
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Barre latérale (lg+). */
export function TeamSideNav({ base, teamName }: { base: string; teamName: string }) {
  const isActive = useActive(base);
  return (
    <nav aria-label="Navigation de l'équipe" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 lg:flex">
      <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-muted">{teamName}</p>
      {items.map((it) => {
        const on = isActive(it);
        return (
          <Link key={it.seg} href={`${base}${it.seg}`} aria-current={on ? "page" : undefined}
            className={cn("flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-ui", on ? "bg-accent-soft text-on-accent-soft" : "text-text hover:bg-surface-2")}>
            <it.Icon aria-hidden className="size-5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
