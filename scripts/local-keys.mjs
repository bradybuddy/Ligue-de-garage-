// Génère les clés anon et service_role de la pile Supabase LOCALE (secret de dev public de supabase/local).
// Usage : node scripts/local-keys.mjs >> .env.local     — jamais pour la production.
import { createHmac } from "node:crypto";
const secret = "local-jwt-secret-au-moins-32-caracteres-xx";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (role) => {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ iss: "supabase-local", role, iat: 1735689600, exp: 2051222400 });
  return `${head}.${body}.${createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url")}`;
};
console.log(`# Supabase local (supabase/local/docker-compose.yml)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${jwt("anon")}
SUPABASE_SERVICE_ROLE_KEY=${jwt("service_role")}
DATABASE_URL=postgres://postgres:postgres-local@localhost:54322/postgres
MAILPIT_URL=http://localhost:54324`);
