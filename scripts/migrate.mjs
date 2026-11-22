// Applique les migrations de supabase/migrations dans l'ordre, une seule fois chacune.
// Usage : DATABASE_URL=postgres://... node scripts/migrate.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL manquant"); process.exit(1); }
const sql = postgres(url, { max: 1, onnotice: () => {} });
const dir = join(import.meta.dirname, "..", "supabase", "migrations");

try {
  await sql`create table if not exists public.schema_migrations (version text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select version from public.schema_migrations`).map((r) => r.version));
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const version = file.split("_")[0];
    if (done.has(version)) continue;
    process.stdout.write(`→ ${file} … `);
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, file), "utf8"));
      await tx`insert into public.schema_migrations (version) values (${version})`;
    });
    console.log("ok");
  }
  console.log("Migrations à jour.");
} catch (e) {
  console.error("\nÉchec :", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
