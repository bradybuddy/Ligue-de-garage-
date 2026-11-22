import { readFileSync } from "node:fs";
import { addMatch, addPlayer, expect, expectAccessible, expectNoHorizontalScroll, inboundSms, sql, teamWithManager, test, uniqPhone } from "./fixtures";

const CRON = readFileSync(".env.local", "utf8").match(/^CRON_SECRET=(.*)$/m)?.[1] ?? "";
const tomorrow = () => new Date(Date.now() + 26 * 3600_000).toISOString().slice(0, 10);
const region = (p: import("@playwright/test").Page, name: string) => p.getByRole("region", { name, exact: true });

test.describe("F03/F05 — spares", () => {
  test("F05-H1 le gérant invite un spare → « y » par texto → IN", async ({ page, request }) => {
    const { base } = await teamWithManager(page);
    const phone = uniqPhone();
    await addPlayer(page, base, { name: "Sam Spare", phone, cls: "spare" });
    const match = await addMatch(page, base);
    await page.goto(match);
    await page.getByRole("link", { name: "Inviter des spares" }).click();
    await expect(page.getByRole("heading", { name: "Inviter des spares" })).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
    await expect(page.getByRole("checkbox", { name: /Sam Spare/ })).toBeChecked(); // pas encore invité : coché d'office
    await page.getByLabel(/Petit mot/).fill("On joue contre les premiers!");
    await page.getByRole("button", { name: "Inviter 1 spare" }).click();
    await expect(page.getByText(/Invitation envoyée à 1 spare/)).toBeVisible();
    await expect(page.getByText(/invité à l'instant \(texto/)).toBeVisible();
    const [sms] = await sql`select body from outbox where template = 'spare_invite' and to_address = ${"+1" + phone}`;
    expect(sms!.body).toMatch(/cherche un spare .* « On joue contre les premiers! » Dispo\? Réponds Y ou N\./);
    await page.goto(match);
    await expect(region(page, "Spares invités, sans réponse").getByText("Sam Spare")).toBeVisible();
    expect(await inboundSms(request, "+1" + phone, "y")).toMatch(/t'es IN/);
    await page.reload();
    await expect(region(page, "IN").getByText("Sam Spare")).toBeVisible();
  });

  test("F05-E1 aucun spare dans l'alignement", async ({ page }) => {
    const { base } = await teamWithManager(page);
    const match = await addMatch(page, base);
    await page.goto(`${match}/spares`);
    await expect(page.getByRole("heading", { name: "Aucun spare dans l'alignement" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ajouter un spare" })).toBeVisible();
  });

  test("F03-H1 la tâche planifiée invite les spares s'il manque du monde", async ({ page, request }) => {
    const { base } = await teamWithManager(page);
    const phone = uniqPhone();
    await addPlayer(page, base, { name: "Auto Spare", phone, cls: "spare" });
    const match = await addMatch(page, base, { date: tomorrow() });
    const r = await request.post("/api/cron/tick", { headers: { authorization: `Bearer ${CRON}` } });
    expect(r.status()).toBe(200);
    await expect.poll(async () => (await sql`select count(*)::int as n from outbox where template = 'spare_invite' and to_address = ${"+1" + phone}`)[0]!.n).toBe(1);
    await request.post("/api/cron/tick", { headers: { authorization: `Bearer ${CRON}` } });
    expect((await sql`select count(*)::int as n from outbox where template = 'spare_invite' and to_address = ${"+1" + phone}`)[0]!.n).toBe(1);
    await page.goto(`${match}/spares`);
    await expect(page.getByText(/invité .* \(texto/)).toBeVisible();
  });
});

test.describe("F04/S15 — liste d'attente", () => {
  test("F04-H2 réordonner au clavier et accepter au-delà du maximum", async ({ page, request }) => {
    const { base } = await teamWithManager(page);
    const [p1, p2] = [uniqPhone(), uniqPhone()];
    await addPlayer(page, base, { name: "Premier Attente", phone: p1 });
    await addPlayer(page, base, { name: "Deuxième Attente", phone: p2 });
    const match = await addMatch(page, base, { max: 1 });
    await page.goto(match);
    await page.getByRole("button", { name: "Mettre Gérant Test IN" }).click();
    await expect(region(page, "IN").getByText("Gérant Test")).toBeVisible();
    await page.getByRole("button", { name: /Relancer/ }).click();
    await expect(page.getByText(/Relance envoyée/)).toBeVisible();
    expect(await inboundSms(request, "+1" + p1, "y")).toMatch(/liste d'attente/);
    expect(await inboundSms(request, "+1" + p2, "y")).toMatch(/liste d'attente/);
    await page.reload();
    await page.getByRole("link", { name: "Gérer la liste d'attente" }).click();
    await expect(page.getByRole("heading", { name: "Liste d'attente" })).toBeVisible();
    await expectAccessible(page);
    const items = page.getByRole("listitem");
    await expect(items.first()).toContainText("Premier Attente");
    await page.getByRole("button", { name: "Monter Deuxième Attente" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Deuxième Attente est maintenant 1e.")).toBeVisible();
    await page.reload();
    await expect(items.first()).toContainText("Deuxième Attente");
    await page.getByRole("button", { name: "Accepter Premier Attente" }).click();
    await expect(page.getByText(/Premier Attente est IN\. Le match dépasse maintenant le maximum\./)).toBeVisible();
    await page.goto(match);
    await expect(page.getByRole("progressbar", { name: "Joueurs" })).toHaveAttribute("aria-valuenow", "2");
  });

  test("F04-E3 une joueuse ne gère pas la liste d'attente", async ({ page, browser }) => {
    const { base } = await teamWithManager(page);
    const match = await addMatch(page, base);
    const { makeUser, login } = await import("./fixtures");
    const j = await makeUser("Joueuse Simple");
    await addPlayer(page, base, { name: "Joueuse Simple", email: j.email });
    const p = await (await browser.newContext()).newPage();
    await login(p, j.email);
    await p.goto(`${match}/attente`);
    await expect(p.getByText(/Seuls le gérant et l'adjoint/)).toBeVisible();
    await p.goto(`${match}/spares`);
    await expect(p.getByText(/Seuls le gérant et l'adjoint/)).toBeVisible();
  });
});
