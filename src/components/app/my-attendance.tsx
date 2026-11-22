"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AttendanceToggle } from "@/components/ui/attendance";
import { Banner } from "@/components/ui/feedback";
import { respondAction } from "@/app/actions/events";
import type { AttendanceStatus } from "@/lib/data/types";

/** Bouton IN/OUT relié au serveur. Un clic = une réponse. */
export function MyAttendance({ teamId, eventId, memberId, status, lockedReason, size = "lg" }: {
  teamId: string; eventId: string; memberId: string; status: AttendanceStatus; lockedReason?: string; size?: "md" | "lg";
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"in" | "out" | null>(null);
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const [seen, setSeen] = useState(status);
  if (status !== seen) { setSeen(status); setValue(status); } // suit les changements venus du serveur (texto, gérant)

  const onChange = (v: "in" | "out") => {
    if (v === value || (v === "in" && value === "waitlist")) return;
    setPending(v);
    setError(null);
    start(async () => {
      const r = await respondAction(teamId, eventId, memberId, v);
      if (r.ok) setValue(r.status as AttendanceStatus);
      else setError(r.error);
      setPending(null);
      router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-2">
      <AttendanceToggle value={value} onChange={onChange} pending={pending} lockedReason={lockedReason} size={size} />
      {error && <Banner tone="danger">{error}</Banner>}
    </div>
  );
}
