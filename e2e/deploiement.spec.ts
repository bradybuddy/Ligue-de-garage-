import { readFileSync } from "node:fs";
import { expect, expectAccessible, expectNoHorizontalScroll, test } from "./fixtures";

// Ce qu'il faut avant la mise en ligne (replica/deploy.md) : pages légales, PWA, santé du service.
const CRON_SECRET = readFileSync(".env.local", "utf8").match(/^CRON_SECRET=(.*)$/m)?.[1] ?? "";

test.describe("Mise en ligne", () => {
  test("D-1 pages légales : accessibles, chaque fournisseur nommé, liées depuis l'accueil et l'inscription", async ({ page }) => {
    await page.goto("/confidentialite");
    await expect(page.getByRole("heading", { level: 1, name: "Confidentialité" })).toBeVisible();
    for (const p of ["Supabase", "Vercel", "Twilio", "Resend", "Sentry", "GIPHY"]) await expect(page.getByRole("cell", { name: p, exact: true })).toBeVisible();
    await expect(page.getByText("Commission d'accès à l'information du Québec")).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    await page.goto("/conditions");
    await expect(page.getByRole("heading", { level: 1, name: "Conditions d'utilisation" })).toBeVisible();
    await expect(page.getByText("ne deviendra jamais payante")).toBeVisible();
    await expectAccessible(page);

    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Pages légales" }).getByRole("link", { name: "Confidentialité" })).toHaveAttribute("href", "/confidentialite");
    await page.goto("/inscription");
    await expect(page.getByRole("link", { name: "politique de confidentialité" })).toHaveAttribute("href", "/confidentialite");
    await expect(page.getByRole("link", { name: "conditions" })).toHaveAttribute("href", "/conditions");
  });

  test("D-2 PWA : manifeste, icônes et image sociale servis", async ({ page, request }) => {
    const m = await (await request.get("/manifest.webmanifest")).json();
    expect(m).toMatchObject({ lang: "fr-CA", display: "standalone", start_url: "/" });
    for (const icon of m.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200);
    expect(m.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect((await request.get(new URL(og!).pathname)).status()).toBe(200);
  });

  test("D-3 santé : le cron laisse un battement de cœur ; /api/sante et /etat le montrent", async ({ page, request }) => {
    const tick = await request.post("/api/cron/tick", { headers: { authorization: `Bearer ${CRON_SECRET}` } });
    expect(tick.status()).toBe(200);
    const res = await request.get("/api/sante");
    const body = await res.json();
    expect(body).toMatchObject({ db: true, cron: true });
    expect(body.tickAgeSeconds).toBeLessThan(60);
    expect(JSON.stringify(body)).not.toMatch(/@|\+1\d{10}/); // aucune donnée personnelle
    await page.goto("/etat");
    await expect(page.getByRole("heading", { level: 1, name: "État du service" })).toBeVisible();
    await expect(page.getByText(/Dernier passage il y a/)).toBeVisible();
    await expectAccessible(page);
  });
});
