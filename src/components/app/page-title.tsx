import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageTitle({ title, back, action, sub }: { title: string; back?: { href: string; label: string }; action?: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-2">
      {back && (
        <Link href={back.href} className="-ml-1 inline-flex h-8 items-center gap-1 self-start text-sm font-semibold text-muted hover:text-text">
          <ChevronLeft aria-hidden className="size-4" />{back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-3xl font-bold leading-tight break-words">{title}</h1>
        {action}
      </div>
      {sub && <div className="text-muted">{sub}</div>}
    </div>
  );
}
