// Couche de données : Postgres/Supabase avec RLS (pg.ts).
// (La couche de démo en mémoire a été retirée au jalon 2 : une seule implémentation à maintenir.
//  En local : npm run db:up && npm run db:migrate && npm run db:seed.)
import "server-only";
export * from "./pg";
export * from "./types";
