"use client";
import { useActionState, useState } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelPicker, type Channel } from "@/components/ui/channel-picker";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Banner } from "@/components/ui/feedback";
import { broadcastAction } from "@/app/actions/chat";

const audiences = [["regular", "Réguliers"], ["spare", "Spares"], ["staff", "Staff"], ["spectator", "Spectateurs"]] as const;

export function BroadcastForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(broadcastAction.bind(null, teamId), null);
  const [channels, setChannels] = useState<Channel[]>(["push", "sms"]);
  const [body, setBody] = useState(state?.values?.body ?? "");
  const segments = body.length <= 70 ? 1 : Math.ceil(body.length / 67); // les accents font passer le texto en UCS-2 : 70 caractères par segment
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.ok && <Banner tone="info">Message envoyé à {state.values?.sent} personne{Number(state.values?.sent) > 1 ? "s" : ""}.</Banner>}
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">À qui</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {audiences.map(([v, l]) => (
            <label key={v} className="flex min-h-11 items-center gap-2"><input type="checkbox" name="audience" value={v} defaultChecked={v === "regular" || v === "spare"} className="size-5 accent-accent" />{l}</label>
          ))}
        </div>
        {state?.fields?.audience && <p className="text-sm font-medium text-out">{state.fields.audience}</p>}
      </fieldset>
      <ChannelPicker value={channels} onChange={setChannels} error={state?.fields?.channels} />
      {channels.map((c) => <input key={c} type="hidden" name="channels" value={c} />)}
      {channels.includes("email") && (
        <Field label="Objet du courriel" optional error={state?.fields?.subject}>
          {({ id, describedBy, invalid }) => <Input id={id} name="subject" maxLength={120} aria-describedby={describedBy} aria-invalid={invalid} defaultValue={state?.values?.subject} />}
        </Field>
      )}
      <Field label="Message" error={state?.fields?.body}
        hint={channels.includes("sms") ? `${body.length}/1000 · par texto : ${segments} segment${segments > 1 ? "s" : ""} (chaque segment coûte)` : `${body.length}/1000`}>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="body" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid}
          placeholder="Ex. Party de fin de saison samedi chez Max, apportez votre chaise!" />}
      </Field>
      <Button type="submit" size="lg" loading={pending}><Megaphone aria-hidden className="size-4" />Envoyer à l&apos;équipe</Button>
    </form>
  );
}
