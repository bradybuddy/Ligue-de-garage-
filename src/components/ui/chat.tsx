"use client";
import { SmilePlus } from "lucide-react";
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
  failed?: boolean;
}

/** Bulle de chat. Les réactions listent TOUS les noms (au survol et pour les lecteurs d'écran). */
export function ChatBubble({ author, mine, time, body, gifUrl, reactions = [], onReact, failed }: BubbleProps) {
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
          {gifUrl && <img src={gifUrl} alt="GIF" className="mt-1 max-h-48 rounded-md" />}
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
          <button type="button" aria-label="Réagir" className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface-2">
            <SmilePlus aria-hidden className="size-4" />
          </button>
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
