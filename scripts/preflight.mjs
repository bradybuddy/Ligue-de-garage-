// Contrôle d'avant mise en ligne (replica/deploy.md). Ne déploie rien.
// Usage : npm run preflight            → vérifications du code
//         npm run preflight -- --prod  → en plus : variables d'environnement de production présentes
// Les tests e2e et le build se lancent à part (npm run e2e, npm run build) ; la CI fait les trois.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const root = join(import.meta.dirname, "..");
const prod = process.argv.includes("--prod");
let failures = 0;
const ok = (m) => console.log(`ok     ${m}`);
const fail = (m) => { failures++; console.log(`ÉCHEC  ${m}`); };
const warn = (m) => console.log(`note   ${m}`);

// 1. Fonctions essentielles (features.csv, priority = must)
const csv = readFileSync(join(root, "replica/features.csv"), "utf8");
const rows = [];
{ // petit lecteur CSV (guillemets doubles)
  let row = [], cell = "", q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (q) { if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
}
const [head, ...data] = rows;
const col = (n) => head.indexOf(n);
const musts = data.filter((r) => r[col("priority")] === "must");
const notDone = musts.filter((r) => r[col("clone")] !== "yes");
if (notDone.length) for (const r of notDone) fail(`fonction essentielle pas finie : ${r[col("feature")]} (${r[col("clone")]})`);
else ok(`fonctions essentielles : ${musts.length}/${musts.length}`);

// 2. Balayage de la marque : noms, domaines, couleurs et polices de l'original
const brand = JSON.parse(readFileSync(join(root, "replica/brand.json"), "utf8"));
const needles = [...brand.avoid.names, ...brand.avoid.domains, ...brand.avoid.colors, ...brand.avoid.fonts].map((s) => s.toLowerCase());
const skip = new Set(["node_modules", ".next", ".git", "replica", ".results", "test-results", "playwright-report"]);
const hits = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name), rel = relative(root, p);
    const st = statSync(p);
    if (needles.some((n) => name.toLowerCase().includes(n))) hits.push(`${rel} (nom de fichier)`);
    if (st.isDirectory()) { walk(p); continue; }
    if (st.size > 2_000_000 || /\.(png|jpe?g|ico|woff2?|lock)$/i.test(name)) continue;
    const text = readFileSync(p, "utf8").toLowerCase();
    for (const n of needles) if (text.includes(n)) hits.push(`${rel} : « ${n} »`);
  }
})(root);
if (hits.length) hits.forEach((h) => fail(`marque de l'original : ${h}`)); else ok("balayage de la marque : propre");

// 3. Fiche des magasins
try { execFileSync("node", [join(root, "scripts/check-listing.mjs")], { stdio: "pipe" }); ok("fiche des magasins : conforme"); }
catch (e) { fail("fiche des magasins : " + String(e.stdout).trim().split("\n").filter((l) => l.startsWith("ÉCHEC")).join(" ; ")); }

// 4. Bogues S1 / S2 ouverts
const bugs = readFileSync(join(root, "replica/bugs.md"), "utf8");
const open = [...bugs.matchAll(/^\| (S[12]) \| (\d+) \|/gm)].filter((m) => Number(m[2]) > 0);
if (open.length) open.forEach((m) => fail(`bogues ${m[1]} ouverts : ${m[2]}`)); else ok("aucun bogue S1 ou S2 ouvert");

// 5. Pages légales remplies
const brandTs = readFileSync(join(root, "src/lib/brand.ts"), "utf8");
const todo = [...brandTs.matchAll(/(\w+): "À REMPLIR[^"]*"/g)].map((m) => m[1]);
if (todo.length) fail(`renseignements légaux à remplir dans src/lib/brand.ts (LEGAL) : ${todo.join(", ")}`); else ok("renseignements légaux remplis");
for (const page of ["confidentialite", "conditions"]) {
  try { statSync(join(root, `src/app/${page}/page.tsx`)); ok(`page /${page} présente`); } catch { fail(`page /${page} manquante`); }
}

// 6. Icônes, manifeste, image sociale
for (const f of ["src/app/icon.svg", "src/app/apple-icon.png", "src/app/opengraph-image.png", "src/app/manifest.ts", "public/icons/icon-512.png", "public/icons/maskable-512.png"]) {
  try { statSync(join(root, f)); } catch { fail(`fichier manquant : ${f}`); continue; }
}
if (readFileSync(join(root, "src/app/icon.svg"), "utf8").includes("PROVISOIRE")) warn("l'icône est provisoire (brief de logo) : à remplacer par le logo du designer, puis npm run brand:assets");
else ok("icône finale");

// 7. Variables de production
if (prod) {
  const required = ["APP_URL", "CRON_SECRET", "UNSUBSCRIBE_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL", "DATABASE_URL_DIRECT", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WEBHOOK_URL", "RESEND_API_KEY", "EMAIL_FROM",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN", "GIPHY_API_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (!process.env.TWILIO_MESSAGING_SERVICE_SID && !process.env.TWILIO_FROM) missing.push("TWILIO_MESSAGING_SERVICE_SID ou TWILIO_FROM");
  if (missing.length) fail(`variables de production manquantes : ${missing.join(", ")}`); else ok("variables de production présentes");
  if (process.env.ALLOW_DEMO) fail("ALLOW_DEMO est défini : JAMAIS en production");
  if (process.env.MAILPIT_URL) fail("MAILPIT_URL est défini : dev seulement");
  if (process.env.APP_URL && !process.env.APP_URL.startsWith("https://")) fail("APP_URL doit commencer par https://");
}

console.log(failures ? `\n${failures} échec(s) : on ne met pas en ligne.` : "\nContrôle réussi.");
process.exit(failures ? 1 : 0);
