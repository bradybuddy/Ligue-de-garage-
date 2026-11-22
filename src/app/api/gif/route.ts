import { currentUser } from "@/lib/auth";

/** Recherche de GIF (GIPHY, clé du propriétaire). Garde la clé côté serveur. */
export async function GET(req: Request) {
  const key = process.env.GIPHY_API_KEY;
  if (!key) return new Response("GIF non configurés", { status: 404 });
  if (!(await currentUser())) return new Response("connexion requise", { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 50) || "hockey";
  const r = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(q)}&limit=12&rating=pg-13&lang=fr`, { next: { revalidate: 3600 } });
  if (!r.ok) return Response.json([]);
  const j = (await r.json()) as { data: { id: string; title: string; images: { fixed_height_small: { url: string } } }[] };
  return Response.json(j.data.map((g) => ({ id: g.id, url: g.images.fixed_height_small.url.split("?")[0], alt: g.title })));
}
