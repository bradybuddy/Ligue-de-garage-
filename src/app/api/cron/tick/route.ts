import { runTick } from "@/lib/data";

/** Appelé par pg_cron toutes les 2 minutes. Idempotent. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret ? req.headers.get("authorization") !== `Bearer ${secret}` : process.env.NODE_ENV === "production") {
    return new Response("non autorisé", { status: 401 });
  }
  return Response.json(await runTick());
}
