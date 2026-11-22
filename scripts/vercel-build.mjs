// Commande de build sur Vercel (Settings → Build → Build Command : npm run vercel-build).
// 1. Applique les migrations sur la base de l'environnement (production ou préproduction), jamais à la main.
// 2. Construit l'appli.
// Les migrations s'appliquent AVANT le build : elles doivent rester compatibles avec la version en ligne
// (ajouter une colonne, oui ; renommer ou supprimer, en deux étapes sur deux déploiements).
import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV ?? "local";
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.DATABASE_URL_DIRECT) {
  console.log(`→ migrations (${env})`);
  run("node scripts/migrate.mjs");
} else if (env === "production") {
  console.error("DATABASE_URL_DIRECT manquant en production : on arrête le build.");
  process.exit(1);
} else {
  console.log(`→ pas de DATABASE_URL_DIRECT (${env}) : migrations sautées`);
}
if (env === "production" && process.env.ALLOW_DEMO) { console.error("ALLOW_DEMO est défini en production : on arrête."); process.exit(1); }
run("npm run build");
