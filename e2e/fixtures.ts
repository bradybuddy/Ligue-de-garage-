// Outils communs : erreurs de console et 5xx font échouer le test, axe, courriels (Mailpit), comptes, SQL.
import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { readFileSync } from "node:fs";

// .env.local (clés locales générées par npm run env:local)
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
export const MAILPIT = env.MAILPIT_URL ?? "http://localhost:54324";
export const PASSWORD = "motdepasse-e2e";
export const sql = postgres(env.DATABASE_URL!, { max: 2, onnotice: () => {} });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }).auth.admin;

let n = 0;
export const uniq = (p = "t") => `${p}${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const uniqPhone = () => `438${String(Math.floor(1e6 + Math.random() * 8.99e6))}`;

/** Compte vérifié créé par l'API admin (plus rapide que l'inscription par l'interface). */
export async function makeUser(name = "Joueur Test", opts: { phone?: string } = {}) {
  const email = `${uniq("u")}@e2e.local`;
  const { data, error } = await admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: name, phone: opts.phone } });
  if (error) throw error;
  return { id: data.user.id, email, name };
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/connexion");
  await page.getByLabel("Courriel").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Me connecter" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/connexion"));
}

/** Équipe avec un gérant connecté, prête à l'emploi. Retourne l'URL de base de l'équipe. */
export async function teamWithManager(page: Page, opts: { name?: string; maxPlayers?: number } = {}) {
  const mgr = await makeUser("Gérant Test", { phone: `+1${uniqPhone()}` });
  await login(page, mgr.email);
  await page.goto("/equipes/nouvelle");
  await page.getByLabel("Nom de l'équipe").fill(opts.name ?? `Équipe ${uniq("")}`);
  await page.getByLabel(/Joueurs par match/).fill(String(opts.maxPlayers ?? 16));
  await page.getByRole("button", { name: "Créer l'équipe" }).click();
  await page.waitForURL(/\/alignement\?bienvenue=1/);
  const base = new URL(page.url()).pathname.split("/alignement")[0]!;
  return { mgr, base, teamId: base.split("/")[2]! };
}

export async function addPlayer(page: Page, base: string, p: { name: string; phone?: string; email?: string; cls?: string; goalie?: boolean }) {
  await page.goto(`${base}/alignement/nouveau`);
  await page.getByLabel("Nom", { exact: true }).fill(p.name);
  if (p.phone) await page.getByLabel("Cellulaire").fill(p.phone);
  if (p.email) await page.getByLabel(/^Courriel/).fill(p.email);
  if (p.cls) await page.getByLabel("Classe").selectOption(p.cls);
  if (p.goalie) await page.getByLabel("Position").selectOption("goalie");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.waitForURL(`**${base}/alignement`);
}

export async function addMatch(page: Page, base: string, opts: { date?: string; time?: string; opponent?: string; max?: number } = {}) {
  await page.goto(`${base}/horaire/nouveau`);
  await page.getByLabel("Date", { exact: true }).fill(opts.date ?? new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10));
  await page.getByLabel("Heure", { exact: true }).fill(opts.time ?? "21:15");
  await page.getByLabel(/Aréna/).fill("Aréna e2e");
  if (opts.opponent) await page.getByLabel(/Adversaire/).fill(opts.opponent);
  if (opts.max) await page.getByLabel(/Maximum de joueurs/).fill(String(opts.max));
  await page.getByRole("button", { name: "Ajouter le match" }).click();
  await page.waitForURL(/\/matchs\/[^/?]+\?nouveau=1/);
  return new URL(page.url()).pathname;
}

export async function inboundSms(request: import("@playwright/test").APIRequestContext, from: string, body: string, sid = uniq("SM")) {
  const r = await request.post("/api/webhooks/twilio/sms", { form: { From: from, Body: body, MessageSid: sid } });
  expect(r.status()).toBe(200);
  return (await r.text()).match(/<Message>([\s\S]*)<\/Message>/)?.[1] ?? "";
}

export async function mail(to: string, subject: RegExp) {
  for (let i = 0; i < 30; i++) {
    const r = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)).json();
    const m = r.messages.find((x: { Subject: string }) => subject.test(x.Subject));
    if (m) return (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as { ID: string; Subject: string; Text: string; HTML: string };
    await new Promise((res) => setTimeout(res, 400));
  }
  throw new Error(`courriel introuvable pour ${to} (${subject})`);
}
export const linkIn = (m: { Text: string; HTML: string }, re: RegExp) => (m.HTML || m.Text).replace(/&amp;/g, "&").match(re)![0];

/** Analyse axe WCAG 2.2 AA de la page actuelle. */
export async function expectAccessible(page: Page) {
  const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((x) => x.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}
export async function expectNoHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

/** Toute page : erreur de console ou réponse 5xx = échec, sauf ce qui est permis explicitement. */
export const test = base.extend<{ allowConsole: RegExp[]; guard: void }>({
  allowConsole: [[], { option: true }],
  guard: [async ({ page, allowConsole }, use) => {
    const problems: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !allowConsole.some((r) => r.test(m.text()))) problems.push(`console: ${m.text()}`); });
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("response", (r) => { if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url()}`); });
    await use();
    expect(problems, "erreurs de console ou réponses 5xx").toEqual([]);
  }, { auto: true }],
});
export { expect };
