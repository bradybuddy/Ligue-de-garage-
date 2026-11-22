import { expect, expectAccessible, expectNoHorizontalScroll, test } from "./fixtures";

// Page publique (replica/launch/landing.md) : visiteur pas connecté.
test.describe("S00 — accueil public", () => {
  for (const [name, viewport, colorScheme] of [
    ["mobile", { width: 390, height: 844 }, "light"],
    ["bureau", { width: 1280, height: 900 }, "light"],
    ["mobile sombre", { width: 390, height: 844 }, "dark"],
  ] as const) {
    test(`S00 ${name} : accessible, sans défilement horizontal`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Même le soir du match");
      for (const h of ["Comment ça marche", "Ce qu'on règle", "Prix", "Questions"]) {
        await expect(page.getByRole("heading", { level: 2, name: h })).toBeVisible();
      }
      await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
      await expectAccessible(page);
      await expectNoHorizontalScroll(page);
      await page.screenshot({ path: `replica/clone-screens/S00-accueil-public-${name.replace(" ", "-")}.png`, fullPage: true });
    });
  }

  test("S00 le bouton principal mène à l'inscription, puis à la création d'équipe", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Créer mon équipe gratuitement" }).click();
    await expect(page).toHaveURL(/\/inscription\?next=%2Fequipes%2Fnouvelle/);
  });

  test("S00 aucune fausse preuve ni nom de l'original", async ({ page }) => {
    await page.goto("/");
    const text = (await page.locator("body").innerText()).toLowerCase();
    for (const bad of ["benchapp", "bench app", "étoiles", "★", "témoignage", "ils nous font confiance"]) expect(text).not.toContain(bad);
  });
});
