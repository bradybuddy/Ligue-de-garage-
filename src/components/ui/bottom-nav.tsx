import { CalendarDays, Home, Menu, MessagesSquare, Users } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { key: "home", label: "Accueil", Icon: Home },
  { key: "schedule", label: "Horaire", Icon: CalendarDays },
  { key: "roster", label: "Alignement", Icon: Users },
  { key: "chat", label: "La chambre", Icon: MessagesSquare },
  { key: "more", label: "Plus", Icon: Menu },
] as const;

/** Navigation du bas (mobile). Sur lg+, la même liste devient une barre latérale. */
export function BottomNav({ active, unread = 0, className }: { active: (typeof items)[number]["key"]; unread?: number; className?: string }) {
  return (
    <nav aria-label="Navigation principale" className={cn("border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]", className)}>
      <ul className="mx-auto grid h-16 max-w-content grid-cols-5">
        {items.map(({ key, label, Icon }) => {
          const on = key === active;
          return (
            <li key={key}>
              <a
                href="#"
                aria-current={on ? "page" : undefined}
                className={cn("relative flex h-full flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-ui", on ? "text-text" : "text-muted hover:text-text")}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", on && "bg-accent-soft text-on-accent-soft")}>
                  <Icon aria-hidden className="size-5" />
                </span>
                {label}
                {key === "chat" && unread > 0 && (
                  <span className="absolute right-[calc(50%-22px)] top-1.5 min-w-5 rounded-full bg-out px-1 text-center text-xs font-bold leading-5 text-on-out">
                    {unread}<span className="sr-only"> non lus</span>
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
