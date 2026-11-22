import { Beer, Repeat } from "lucide-react";

/** La tournée : qui apporte la bière ce match-ci. */
export function BeerCard({ name, isMe, drinksBrought }: { name: string | null; isMe?: boolean; drinksBrought?: number }) {
  return (
    <section aria-label="La tournée" className="flex items-center gap-4 rounded-lg border border-border bg-accent-soft p-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
        <Beer aria-hidden className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-accent-soft">La tournée</p>
        {name ? (
          <p className="font-display text-xl font-bold text-text">{isMe ? "C'est toi cette fois-ci 🍺" : name}</p>
        ) : (
          <p className="text-text">Personne encore. On choisit 24 h avant le match.</p>
        )}
        {drinksBrought !== undefined && name && (
          <p className="text-sm text-on-accent-soft">{drinksBrought} tournée{drinksBrought > 1 ? "s" : ""} cette saison</p>
        )}
      </div>
      {isMe && <span className="inline-flex items-center gap-1 text-sm font-semibold text-on-accent-soft"><Repeat aria-hidden className="size-4" />Échanger</span>}
    </section>
  );
}
