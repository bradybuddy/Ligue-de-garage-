import { addMatch, addPlayer, expect, expectAccessible, expectNoHorizontalScroll, login, makeUser, sql, teamWithManager, test } from "./fixtures";

test.describe("F06 — la tournée", () => {
  test("F06-H2 le gérant choisit, la joueuse le voit, l'avis part ; retrait de la rotation", async ({ page, browser }) => {
    const { base } = await teamWithManager(page);
    const j = await makeUser("Julie Bière");
    await addPlayer(page, base, { name: "Julie Bière", email: j.email });
    const match = await addMatch(page, base, { opponent: "Les Castors" });
    const p = await (await browser.newContext()).newPage();
    await login(p, j.email);
    await p.goto(match);
    await p.getByRole("radio", { name: /IN/ }).click();
    await expect(p.getByText("Parfait, on compte sur toi.")).toBeVisible();

    await page.goto(`${base}/tournee`);
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
    await expect(page.getByText("Personne encore. On choisit 24 h avant le match.")).toBeVisible();
    await page.getByLabel("Choisir à la main").selectOption({ label: "Julie Bière" });
    await expect(page.getByText("Julie Bière").first()).toBeVisible();
    await expect.poll(async () => (await sql`select body from outbox o join members m on m.id = o.member_id
      where o.template = 'beer_duty' and m.display_name = 'Julie Bière' and o.status = 'sent' order by o.created_at desc limit 1`)[0]?.body ?? "")
      .toMatch(/C'est ta tournée pour le match du \d\d\/\d\d à \d\d h \d\d/);

    await p.goto(match);
    await expect(p.getByText("C'est toi cette fois-ci 🍺")).toBeVisible();
    await p.goto(`${base}/tournee`);
    await expect(p.getByLabel("Choisir à la main")).toHaveCount(0); // pas pour une joueuse
    await p.getByRole("switch", { name: "Je fais partie de la rotation" }).click();
    await expect(p.getByRole("switch", { name: "Je fais partie de la rotation" })).toHaveAttribute("aria-checked", "false");
    await expect(p.getByText("Enregistré ✓")).toBeVisible();
    await p.reload();
    await expect(p.getByText("(hors rotation)")).toBeVisible();

    // Rechoisir : Julie est hors rotation → personne d'autre IN que le gérant ? Il n'est pas IN → personne.
    await page.reload();
    await page.getByRole("button", { name: "Rechoisir" }).click();
    await expect(page.getByText("Personne encore. On choisit 24 h avant le match.")).toBeVisible();
  });
});
