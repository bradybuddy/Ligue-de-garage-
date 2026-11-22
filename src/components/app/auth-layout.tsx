import { APP_NAME } from "@/lib/brand";
import Link from "next/link";
import { Beer } from "lucide-react";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Link href="/" className="flex items-center gap-2 self-start font-display text-xl font-bold">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-on-accent"><Beer aria-hidden className="size-5" /></span>
        {APP_NAME}
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">{children}</div>
    </main>
  );
}
