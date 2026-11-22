"use client";
import { useState, useTransition } from "react";
import { Banner } from "@/components/ui/feedback";
import { setPrefAction } from "@/app/actions/settings";
import { callAction, failMessage } from "@/lib/client-action";
import type { MemberPrefs, PrefCategory } from "@/lib/data/types";

type Ch = "push" | "sms" | "email";
const rows: { cat: PrefCategory; label: string; channels: Ch[]; who?: "manager" | "spare" }[] = [
  { cat: "reminder", label: "Rappels de match (t'es là?)", channels: ["push", "sms", "email"] },
  { cat: "spare_invite", label: "Invitations comme spare", channels: ["push", "sms", "email"], who: "spare" },
  { cat: "waitlist", label: "Liste d'attente (place libérée)", channels: ["push", "sms", "email"] },
  { cat: "beer", label: "C'est ta tournée", channels: ["push", "sms", "email"] },
  { cat: "broadcast", label: "Messages du gérant", channels: ["push", "sms", "email"] },
  { cat: "chat", label: "Nouveaux messages dans la chambre", channels: ["push"] },
  { cat: "manager_alert", label: "Alertes de gérant (un joueur se désiste)", channels: ["push", "sms", "email"], who: "manager" },
];
const chLabel: Record<Ch, string> = { push: "Notif", sms: "Texto", email: "Courriel" };

export function PrefsGrid({ prefs }: { prefs: MemberPrefs }) {
  const [off, setOff] = useState(new Set(prefs.off));
  const [err, setErr] = useState<string | null>(null);
  const [, start] = useTransition();
  const toggle = (cat: PrefCategory, ch: Ch) => {
    const key = `${cat}:${ch}`;
    const enabled = off.has(key); // on le réactive s'il était coupé
    const next = new Set(off); enabled ? next.delete(key) : next.add(key); setOff(next);
    start(async () => {
      const r = await callAction(() => setPrefAction(prefs.memberId, cat, ch, enabled));
      if (!r.ok || !r.value.ok) { setOff(off); setErr(r.ok ? r.value.error! : failMessage(r.offline, "Ton choix n'a pas été enregistré.")); } else setErr(null);
    });
  };
  const visible = rows.filter((r) => !r.who || (r.who === "manager" ? prefs.isManager : prefs.isSpare));
  const noReminder = ["push", "sms", "email"].every((c) => off.has(`reminder:${c}`));
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-border" role="region" aria-label={`Avis pour ${prefs.teamName}`} tabIndex={0}>
        <table className="w-full min-w-[420px] text-sm">
          <caption className="sr-only">Avis pour {prefs.teamName}</caption>
          <thead className="bg-surface-2"><tr><th scope="col" className="px-3 py-2 text-left">Type d&apos;avis</th>{(["push", "sms", "email"] as Ch[]).map((c) => <th key={c} scope="col" className="w-20 px-2 py-2 text-center">{chLabel[c]}</th>)}</tr></thead>
          <tbody className="divide-y divide-border bg-surface">
            {visible.map((r) => (
              <tr key={r.cat}>
                <th scope="row" className="px-3 py-2 text-left font-normal">{r.label}</th>
                {(["push", "sms", "email"] as Ch[]).map((c) => (
                  <td key={c} className="px-2 py-1 text-center">
                    {r.channels.includes(c) ? (
                      <input type="checkbox" checked={!off.has(`${r.cat}:${c}`)} onChange={() => toggle(r.cat, c)} aria-label={`${r.label} par ${chLabel[c].toLowerCase()}`} className="size-6 accent-accent" />
                    ) : <span className="text-muted" aria-label="Pas offert">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {noReminder && <Banner tone="warning">Tu ne recevras aucun rappel pour cette équipe. Pense à ouvrir l&apos;appli avant chaque match.</Banner>}
      {err && <Banner tone="danger">{err}</Banner>}
    </div>
  );
}
