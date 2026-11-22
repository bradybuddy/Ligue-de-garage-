import { APP_NAME } from "@/lib/brand";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Mail, Bell } from "lucide-react";
import { devListInbound, devListOutbox, devListPhones } from "@/lib/data";
import { prettyPhone } from "@/lib/sms";
import { fmtTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { devReplyAction, devTickAction } from "@/app/actions/dev";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata = { title: `Simulateur · ${APP_NAME}` };

/** Outil de dev : simule Twilio (textos) et la tâche planifiée. Absent en production. */
export default async function Page({ searchParams }: { searchParams: Promise<{ tel?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") notFound();
  const { tel } = await searchParams;
  const [outbox, inbound, phones] = await Promise.all([devListOutbox(), devListInbound(), devListPhones()]);
  const phone = tel ?? outbox.find((o) => o.channel === "sms")?.to ?? phones[0]?.phone;
  const thread = [
    ...outbox.filter((o) => o.channel === "sms" && o.to === phone).map((o) => ({ at: o.createdAt, mine: false, body: o.body })),
    ...inbound.filter((i) => i.from === phone).flatMap((i) => [{ at: i.createdAt, mine: true, body: i.body }, { at: i.createdAt, mine: false, body: i.result }]),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const name = phones.find((p) => p.phone === phone)?.name;
  const emails = outbox.filter((o) => o.channel === "email").slice(0, 6);
  const icon = { sms: MessageCircle, email: Mail, push: Bell };

  return (
    <main className="mx-auto flex max-w-wide flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Simulateur (dev)</h1>
        <div className="flex gap-2">
          <Link href="/" className="inline-flex h-10 items-center rounded-md border border-border-input px-4 text-sm font-semibold">Ouvrir l&apos;appli</Link>
        </div>
      </div>

      <section aria-labelledby="tick-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 id="tick-h" className="font-bold">Tâche planifiée</h2>
        <p className="text-sm text-muted">En vrai, pg_cron l&apos;appelle toutes les 2 minutes. Ici, on peut faire semblant d&apos;être plus tard pour déclencher les rappels 48 h avant.</p>
        <form action={devTickAction} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">Faire comme si on était
            <Select name="hours" defaultValue="0" className="w-56">
              <option value="0">maintenant</option><option value="24">dans 1 jour</option><option value="72">dans 3 jours</option><option value="168">dans 7 jours</option>
            </Select>
          </label>
          <Button type="submit">Lancer la tâche</Button>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="phone-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <h2 id="phone-h" className="font-bold">Téléphone simulé</h2>
          <form className="flex items-end gap-2" action="/dev">
            <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">Joueur
              <Select name="tel" defaultValue={phone}>{phones.map((p) => <option key={p.phone} value={p.phone}>{p.name} · {prettyPhone(p.phone)}</option>)}</Select>
            </label>
            <Button type="submit" variant="secondary">Ouvrir</Button>
          </form>
          <div className="flex min-h-64 flex-col gap-2 rounded-md bg-surface-2 p-3" aria-live="polite" aria-label={`Textos de ${name ?? phone}`}>
            {thread.length === 0 && <p className="m-auto text-sm text-muted">Aucun texto pour ce numéro. Lance la tâche ou une relance.</p>}
            {thread.map((m, i) => (
              <div key={i} className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm", m.mine ? "self-end bg-accent text-on-accent" : "self-start bg-surface text-text")}>
                {m.body}<span className={cn("ml-2 text-xs", m.mine ? "text-on-accent" : "text-muted")}>{fmtTime(m.at)}</span>
              </div>
            ))}
          </div>
          <form action={devReplyAction} className="flex gap-2">
            <input type="hidden" name="phone" value={phone} />
            <label className="sr-only" htmlFor="sms-body">Réponse par texto</label>
            <input id="sms-body" name="body" autoComplete="off" placeholder="Y, N, Y 482…" className="h-11 flex-1 rounded-md border border-border-input bg-surface px-3" />
            <Button type="submit">Texter</Button>
          </form>
        </section>

        <section aria-labelledby="mail-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <h2 id="mail-h" className="font-bold">Derniers courriels</h2>
          {emails.length === 0 && <p className="text-sm text-muted">Aucun courriel envoyé.</p>}
          {emails.map((e) => {
            const link = e.body.match(/https?:\/\/\S+\/r\/[a-f0-9]+/)?.[0];
            const path = link ? new URL(link).pathname : null;
            return (
              <article key={e.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-semibold">{e.subject}</p>
                <p className="text-muted">À : {e.to}</p>
                {path && <p className="mt-2 flex gap-3"><Link className="font-semibold text-accent-strong underline" href={`${path}?s=in`}>Je suis là</Link><Link className="font-semibold text-accent-strong underline" href={`${path}?s=out`}>Je suis pas là</Link></p>}
              </article>
            );
          })}
        </section>
      </div>

      <section aria-labelledby="out-h" className="flex flex-col gap-3">
        <h2 id="out-h" className="font-bold">File d&apos;envoi ({outbox.length})</h2>
        <div tabIndex={0} role="region" aria-labelledby="out-h" className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-2 text-left"><tr><th className="px-3 py-2">Canal</th><th className="px-3 py-2">À</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Message</th><th className="px-3 py-2">Heure</th></tr></thead>
            <tbody className="divide-y divide-border">
              {outbox.slice(0, 40).map((o) => { const I = icon[o.channel]; return (
                <tr key={o.id}>
                  <td className="px-3 py-2"><span className="inline-flex items-center gap-1"><I aria-hidden className="size-4" />{o.channel}</span></td>
                  <td className="px-3 py-2">{o.channel === "sms" ? prettyPhone(o.to) : o.to}</td>
                  <td className="px-3 py-2">{o.category}</td>
                  <td className="max-w-md truncate px-3 py-2" title={o.body}>{o.subject ?? o.body}</td>
                  <td className="px-3 py-2 tabular">{fmtTime(o.createdAt)}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
