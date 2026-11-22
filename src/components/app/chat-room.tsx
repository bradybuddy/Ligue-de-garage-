"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlay, Send, X } from "lucide-react";
import { ChatBubble } from "@/components/ui/chat";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { deleteMessageAction, postMessageAction, reactAction } from "@/app/actions/chat";
import { callAction, failMessage } from "@/lib/client-action";
import type { ChatMessage } from "@/lib/data/types";

const timeFmt = new Intl.DateTimeFormat("fr-CA", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });
const dayFmt = new Intl.DateTimeFormat("fr-CA", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Toronto" });

export function ChatRoom({ teamId, messages, gifEnabled }: { teamId: string; messages: ChatMessage[]; gifEnabled: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [gifOpen, setGifOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id;
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [lastId]);

  const send = (body: string, gifUrl?: string) => start(async () => {
    const r = await callAction(() => postMessageAction(teamId, body, gifUrl));
    if (!r.ok || !r.value.ok) return setErr(r.ok ? r.value.error! : failMessage(r.offline, "Ton message n'est pas parti."));
    setErr(null); setText(""); setGifOpen(false); router.refresh();
  });
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, what: string) => start(async () => {
    const r = await callAction(fn);
    if (!r.ok || !r.value.ok) setErr(r.ok ? r.value.error! : failMessage(r.offline, what)); else { setErr(null); router.refresh(); }
  });

  let lastDay = "";
  return (
    <div className="flex flex-col gap-3">
      <div role="log" aria-label="Messages de l'équipe" aria-live="polite" className="flex min-h-64 flex-col gap-4 rounded-lg border border-border bg-surface p-3 sm:p-4">
        {messages.length === 0 && <p className="m-auto max-w-xs py-10 text-center text-muted">Personne n&apos;a encore parlé. Lance la conversation!</p>}
        {messages.map((m) => {
          const day = dayFmt.format(new Date(m.createdAt));
          const sep = day !== lastDay ? ((lastDay = day), <p key={`d-${m.id}`} className="text-center text-xs font-semibold uppercase tracking-wide text-muted first-letter:uppercase">{day}</p>) : null;
          return (
            <div key={m.id} className="flex flex-col gap-4">
              {sep}
              <ChatBubble author={m.authorName} mine={m.mine} time={timeFmt.format(new Date(m.createdAt))} body={m.body ?? undefined} gifUrl={m.gifUrl ?? undefined}
                deleted={m.deleted} reactions={m.reactions}
                onReact={(e) => act(() => reactAction(teamId, m.id, e), "La réaction n'a pas été enregistrée.")}
                onDelete={m.mine ? () => act(() => deleteMessageAction(teamId, m.id), "Le message n'a pas été supprimé.") : undefined} />
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {err && <Banner tone="danger">{err}</Banner>}
      {gifOpen && <GifPicker onPick={(url) => send("", url)} onClose={() => setGifOpen(false)} />}
      <form className="sticky bottom-20 flex items-end gap-2 rounded-lg border border-border bg-surface p-2 shadow-sm lg:bottom-4"
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) send(text); }}>
        {gifEnabled && (
          <button type="button" aria-label="Ajouter un GIF" aria-expanded={gifOpen} onClick={() => setGifOpen((v) => !v)} className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2">
            <ImagePlay aria-hidden className="size-5" />
          </button>
        )}
        <label htmlFor="chat-input" className="sr-only">Message à l&apos;équipe</label>
        <textarea id="chat-input" value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={4000} placeholder="Écris à l'équipe…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (text.trim()) send(text); } }}
          className="max-h-40 min-h-11 flex-1 resize-y rounded-md border border-border-input bg-surface px-3 py-2.5 text-base" />
        <Button type="submit" size="icon" loading={pending} disabled={!text.trim()} aria-label="Envoyer"><Send aria-hidden className="size-5" /></Button>
      </form>
    </div>
  );
}

function GifPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("hockey");
  const [gifs, setGifs] = useState<{ id: string; url: string; alt: string }[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/gif?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])).then(setGifs).catch(() => setGifs([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        <label htmlFor="gif-q" className="sr-only">Chercher un GIF</label>
        <input id="gif-q" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 flex-1 rounded-md border border-border-input bg-surface px-3" />
        <button type="button" onClick={onClose} aria-label="Fermer les GIF" className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface-2"><X aria-hidden className="size-4" /></button>
      </div>
      <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
        {gifs === null && <p className="col-span-3 text-sm text-muted">Recherche…</p>}
        {gifs?.length === 0 && <p className="col-span-3 text-sm text-muted">Aucun GIF trouvé.</p>}
        {gifs?.map((g) => (
          <button key={g.id} type="button" onClick={() => onPick(g.url)} className="overflow-hidden rounded-md focus-visible:outline-2">
            <img src={g.url} alt={g.alt || "GIF"} loading="lazy" referrerPolicy="no-referrer" className="h-24 w-full object-cover" />
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">GIF fournis par GIPHY</p>
    </div>
  );
}
