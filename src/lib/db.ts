// Accès Postgres (Supabase). Chaque requête d'un utilisateur s'exécute avec SON identité :
//   set local role authenticated + request.jwt.claims = { sub: <id> }
// → auth.uid() fonctionne et les policies RLS s'appliquent, exactement comme via l'API Supabase.
// Le serveur (webhooks, tâche planifiée) utilise service_role, qui contourne le RLS.
import "server-only";
import postgres from "postgres";
import { DomainError } from "./data/types";

type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

// timestamptz → chaîne ISO (les types du domaine utilisent des chaînes ISO UTC)
const toIso = (s: string) => new Date(s.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")).toISOString();

const g = globalThis as unknown as { __bbSql?: Sql };
export function sql(): Sql {
  if (!g.__bbSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL manquant");
    g.__bbSql = postgres(url, {
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      prepare: false, // obligatoire avec le pooler Supabase en mode transaction (port 6543)
      transform: postgres.camel,
      connection: { TimeZone: "UTC", application_name: "buddy-and-beer" },
      types: { tstz: { to: 1184, from: [1184, 1114], serialize: (x: string | Date) => (x instanceof Date ? x.toISOString() : x), parse: toIso } },
      onnotice: () => {},
    });
  }
  return g.__bbSql;
}

/** Transaction avec l'identité d'un utilisateur : le RLS s'applique. */
export function asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return run(async () => sql().begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
    await tx.unsafe("set local role authenticated");
    return fn(tx);
  }) as Promise<T>);
}

/** Transaction du serveur (webhooks, tâches). Contourne le RLS : vérifier les droits avant. */
export function asService<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return run(async () => sql().begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: "service_role" })}, true)`;
    await tx.unsafe("set local role service_role");
    return fn(tx);
  }) as Promise<T>);
}

/** Traduit les erreurs Postgres en erreurs métier en français. */
async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DomainError) throw e;
    const err = e as { code?: string; message?: string; constraint_name?: string };
    const msg = err.message ?? "";
    if (process.env.DB_DEBUG) console.error("[db]", err.code, msg);
    if (err.code === "42501" || msg.includes("accès refusé") || msg.includes("row-level security")) {
      throw new DomainError("Tu n'as pas le droit de faire ça.", "forbidden");
    }
    if (msg === "complet") throw new DomainError("Le match est complet.", "full");
    if (msg === "événement fermé") throw new DomainError("On ne peut plus répondre à ce match.", "closed");
    if (msg === "événement introuvable" || msg === "membre introuvable") throw new DomainError("Introuvable.", "not_found");
    if (msg === "code invalide") throw new DomainError("Ce code ne correspond à aucune équipe.", "not_found");
    if (err.code === "23505") {
      if (err.constraint_name === "members_team_email") throw new DomainError("Ce courriel est déjà dans l'équipe.", "conflict");
      throw new DomainError("Ça existe déjà.", "conflict");
    }
    if (err.code === "23514" || err.code === "22P02") throw new DomainError("Une valeur n'est pas valide.");
    throw e;
  }
}
