"use server";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { handleInboundSms, runTick } from "@/lib/data";

const guard = () => { if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") notFound(); };

export async function devTickAction(fd: FormData) {
  guard();
  const hours = Number(fd.get("hours") ?? 0);
  await runTick(new Date(Date.now() + hours * 3600_000));
  revalidatePath("/", "layout");
}

export async function devReplyAction(fd: FormData) {
  guard();
  const phone = String(fd.get("phone") ?? "");
  const body = String(fd.get("body") ?? "");
  if (phone && body.trim()) await handleInboundSms(phone, body, `SIM${Date.now()}`);
  revalidatePath("/", "layout");
}

