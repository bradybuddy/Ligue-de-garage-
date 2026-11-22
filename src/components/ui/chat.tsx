"use client";
import { useState } from "react";
import { SmilePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "./badges";

export interface Reaction { emoji: string; names: string[]; mine: boolean }

interface BubbleProps {
  author: string;
  mine?: boolean;
  time: string;
  body?: string;
  gifUrl?: string;
  reactions?: Reaction[];
  onReact?: (emoji: string) => void;
  onDelete?: () => void;
  choices?: string[];
  failed?: boolean;
  deleted?: boolean;
}

/** Bulle de chat. Les réactions listent TOUS les noms (au survol et pour les lecteurs d'écran). */
export function ChatBubble({ author, mine, time, body, gifUrl, reactions = [], onReact, onDelete, choices = ["👍", "🔥", "😂", "🍺", "🏒"], failed, deleted }: BubbleProps) {
  const [picking, setPicking] = useState(false);
  if (deleted) return <p className={cn("px-10 text-sm italic text-muted", mine && "text-right")}>{mine ? "Tu as" : `${author} a`} supprimé un message.</p>;
  return (
    <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
      {!mine && <Avatar name={author} size="sm" />}
      <div className={cn("flex max-w-[80%] flex-col gap-1", mine && "items-end")}>
        {!mine && <span className="px-1 text-xs font-semibold text-muted">{author}</span>}
        <div
          className={cn(
            "rounded-lg px-3.5 py-2 text-base",
            mine ? "rounded-br-sm bg-accent text-on-accent" : "rounded-bl-sm bg-surface-2 text-text",
            failed && "border-2 border-dashed border-out",
          )}
        >
          {body && <p className="whitespace-pre-wrap break-words">{body}</p>}
          {gifUrl && <img src={gifUrl} alt="GIF animé" loading="lazy" referrerPolicy="no-referrer" className="mt-1 max-h-48 rounded-md" />}
        </div>
        <div className={cn("flex flex-wrap items-center gap-1", mine && "justify-end")}>
          {reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => onReact?.(r.emoji)}
              aria-pressed={r.mine}
              aria-label={`${r.emoji} ${r.names.length} : ${r.names.join(", ")}`}
              title={r.names.join(", ")}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-sm transition-ui",
                r.mine ? "border-accent bg-accent-soft text-on-accent-soft" : "border-border bg-surface text-text hover:bg-surface-2",
              )}
            >
              <span aria-hidden>{r.emoji}</span>
              <span aria-hidden className="tabular text-xs font-semibold">{r.names.length}</span>
            </button>
          ))}
          {onReact && (
            <button type="button" aria-label="Réagir" aria-expanded={picking} onClick={() => setPicking((v) => !v)} className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface-2">
              <SmilePlus aria-hidden className="size-4" />
            </button>
          )}
          {picking && (
            <span role="group" aria-label="Choisir une réaction" className="inline-flex gap-0.5 rounded-full border border-border bg-surface px-1 shadow-sm">
              {choices.map((e) => (
                <button key={e} type="button" aria-label={`Réagir ${e}`} onClick={() => { setPicking(false); onReact?.(e); }} className="inline-flex size-8 items-center justify-center rounded-full text-lg hover:bg-surface-2">{e}</button>
              ))}
            </span>
          )}
          {onDelete && mine && (
            <button type="button" aria-label="Supprimer mon message" onClick={onDelete} className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-out">
              <Trash2 aria-hidden className="size-3.5" />
            </button>
          )}
          {failed ? (
            <button type="button" className="min-h-6 px-1 text-xs font-semibold text-out underline underline-offset-2">Pas envoyé · Réessayer</button>
          ) : (
            <span className="px-1 text-xs text-muted">{time}</span>
          )}
        </div>
      </div>
    </div>
  );
}
