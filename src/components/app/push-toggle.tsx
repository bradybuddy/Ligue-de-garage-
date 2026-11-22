"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";

const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const toBytes = (b64: string) => Uint8Array.from(atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** Active les notifs sur CET appareil. Sur iPhone : seulement une fois l'appli ajoutée à l'écran d'accueil. */
export function PushToggle() {
  const [state, setState] = useState<"loading" | "unsupported" | "off" | "on" | "denied">("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!key || !("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.register("/sw.js").then((r) => r.pushManager.getSubscription()).then((s) => setState(s ? "on" : "off")).catch(() => setState("unsupported"));
  }, []);
  const toggle = async () => {
    setBusy(true); setErr(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (state === "on") {
        const s = await reg.pushManager.getSubscription();
        if (s) { await fetch("/api/push", { method: "DELETE", body: JSON.stringify({ endpoint: s.endpoint }) }); await s.unsubscribe(); }
        setState("off");
      } else {
        const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(key!) });
        const r = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(s.toJSON()) });
        if (!r.ok) throw new Error();
        setState("on");
      }
    } catch {
      setState(Notification.permission === "denied" ? "denied" : state);
      setErr("Ça n'a pas marché. Vérifie que les notifications sont permises pour ce site.");
    } finally { setBusy(false); }
  };
  if (state === "loading") return null;
  if (state === "unsupported") return <p className="text-sm text-muted">Les notifs ne sont pas disponibles sur cet appareil. Sur iPhone : Partager → « Sur l&apos;écran d&apos;accueil », puis ouvre l&apos;appli de là. Tu recevras les textos en attendant.</p>;
  if (state === "denied") return <p className="text-sm text-muted">Les notifs sont bloquées pour ce site dans les réglages de ton navigateur.</p>;
  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" loading={busy} onClick={toggle}>
        {state === "on" ? <><BellOff aria-hidden className="size-4" />Couper les notifs sur cet appareil</> : <><Bell aria-hidden className="size-4" />Activer les notifs sur cet appareil</>}
      </Button>
      {err && <Banner tone="danger">{err}</Banner>}
    </div>
  );
}
