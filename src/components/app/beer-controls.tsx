"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Shuffle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { beerOptOutAction, beerTurnAction } from "@/app/actions/beer";
import { callAction, failMessage } from "@/lib/client-action";

export function BeerOptOut({ teamId, optOut }: { teamId: string; optOut: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(!optOut);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Switch checked={value} label="Je fais partie de la rotation" description="Décoche si tu ne veux jamais être choisi (ex. tu ne bois pas, ou tu payes autrement)."
        onChange={(v) => { setValue(v); setSaved(false); start(async () => {
          const r = await callAction(() => beerOptOutAction(teamId, !v));
          if (!r.ok || !r.value.ok) { setValue(!v); setErr(r.ok ? r.value.error! : failMessage(r.offline, "Ton choix n'a pas été enregistré.")); }
          else { setErr(null); setSaved(true); router.refresh(); }
        }); }} />
      <p aria-live="polite" className="min-h-5 text-sm text-muted">{pending ? "Enregistrement…" : saved ? "Enregistré ✓" : ""}</p>
      {err && <Banner tone="danger">{err}</Banner>}
    </div>
  );
}

export function BeerPicker({ teamId, eventId, current, players }: { teamId: string; eventId: string; current: string | null; players: { id: string; name: string }[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (memberId: string | null) => start(async () => {
    const r = await callAction(() => beerTurnAction(teamId, eventId, memberId));
    if (!r.ok || !r.value.ok) setErr(r.ok ? r.value.error! : failMessage(r.offline, "Le changement n'a pas été enregistré."));
    else { setErr(null); router.refresh(); }
  });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-semibold">Choisir à la main
          <Select value={current ?? ""} disabled={pending || !players.length} onChange={(e) => e.target.value && run(e.target.value)}>
            <option value="">{players.length ? "— Joueurs IN —" : "Personne n'est IN encore"}</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </label>
        <Button variant="secondary" loading={pending} onClick={() => run(null)} disabled={!players.length}>
          <Shuffle aria-hidden className="size-4" />{current ? "Rechoisir" : "Choisir maintenant"}
        </Button>
      </div>
      {err && <Banner tone="danger">{err}</Banner>}
    </div>
  );
}
