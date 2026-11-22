"use client";
import { useActionState, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelPicker, type Channel } from "@/components/ui/channel-picker";
import { Field, Textarea } from "@/components/ui/field";
import { Banner } from "@/components/ui/feedback";
import { Avatar, StatusPill } from "@/components/ui/badges";
import { inviteSparesAction } from "@/app/actions/spares";
import type { AttendanceStatus } from "@/lib/data/types";

export interface SpareItem { id: string; name: string; goalie: boolean; status: AttendanceStatus; invitedLabel: string | null; reachable: Channel[] }

export function SparesForm({ teamId, eventId, spares, defaultChannels }: { teamId: string; eventId: string; spares: SpareItem[]; defaultChannels: Channel[] }) {
  const [state, action, pending] = useActionState(inviteSparesAction.bind(null, teamId, eventId), null);
  const [channels, setChannels] = useState<Channel[]>(defaultChannels);
  const fresh = spares.filter((s) => s.status === "no_reply" && !s.invitedLabel).map((s) => s.id);
  const [picked, setPicked] = useState<string[]>(fresh);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const all = picked.length === spares.length;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state?.ok && <Banner tone="info">Invitation envoyée à {state.values?.sent} spare{Number(state.values?.sent) > 1 ? "s" : ""}. Les réponses arrivent sur la page du match.</Banner>}
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
          <span>Spares à inviter ({picked.length})</span>
          <button type="button" className="text-sm font-semibold text-accent-strong underline underline-offset-4" onClick={() => setPicked(all ? [] : spares.map((s) => s.id))}>
            {all ? "Tout décocher" : "Tout cocher"}
          </button>
        </legend>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {spares.map((s) => (
            <li key={s.id}>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-surface-2">
                <input type="checkbox" name="members" value={s.id} checked={picked.includes(s.id)} onChange={() => toggle(s.id)} className="size-5 accent-accent" />
                <Avatar name={s.name} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="break-words font-semibold">{s.name}{s.goalie && <span className="ml-1.5 text-sm text-accent-strong">Gardien</span>}</span>
                  <span className="text-sm text-muted">
                    {[s.invitedLabel, s.reachable.length ? null : "aucun moyen de le joindre"].filter(Boolean).join(" · ") || "pas encore invité"}
                  </span>
                </span>
                {s.status !== "no_reply" && <StatusPill value={s.status} />}
              </label>
            </li>
          ))}
        </ul>
        {state?.fields?.members && <p className="text-sm font-medium text-out">{state.fields.members}</p>}
      </fieldset>
      <ChannelPicker value={channels} onChange={setChannels} error={state?.fields?.channels} />
      {channels.map((c) => <input key={c} type="hidden" name="channels" value={c} />)}
      <Field label="Petit mot" optional hint="Ajouté au texto et au courriel. Ex. « On joue contre les premiers, viens en forme! »" error={state?.fields?.note}>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="note" maxLength={200} aria-describedby={describedBy} aria-invalid={invalid} defaultValue={state?.values?.note} />}
      </Field>
      <Button type="submit" size="lg" loading={pending} disabled={!picked.length || !channels.length}>
        <Send aria-hidden className="size-4" />Inviter {picked.length} spare{picked.length > 1 ? "s" : ""}
      </Button>
    </form>
  );
}
