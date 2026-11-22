// X-U1 / X-U2 : chaque écran bâti, en mobile et en bureau : axe WCAG 2.2 AA, aucun défilement horizontal.
import { addMatch, addPlayer, expect, expectAccessible, expectNoHorizontalScroll, teamWithManager, test, uniqPhone } from "./fixtures";

for (const [label, viewport] of [["mobile", { width: 390, height: 844 }], ["bureau", { width: 1440, height: 900 }]] as const) {
  test(`X-U1/U2 tous les écrans bâtis — ${label}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const url of ["/", "/connexion", "/inscription", "/mot-de-passe-oublie"]) {
      await page.goto(url);
      await expectAccessible(page);
      await expectNoHorizontalScroll(page);
    }
    const { base } = await teamWithManager(page, { name: "Les Écrans 🏒 avec un nom vraiment très long pour voir" });
    await addPlayer(page, base, { name: "Jean-François Bélanger-Archambault-Desrosiers", phone: uniqPhone() });
    const match = await addMatch(page, base, { opponent: "Les Castors de la Rive-Sud" });
    const member = await page.goto(`${base}/alignement`).then(() => page.getByRole("link", { name: /Modifier Jean-François/ }).getAttribute("href"));
    for (const url of [base, `${base}/horaire`, `${base}/horaire?vue=passes`, `${base}/horaire/nouveau`, match, `${match}/modifier`,
      `${base}/alignement`, `${base}/alignement/nouveau`, member!, `${base}/plus`, "/compte", "/equipes"]) {
      await page.goto(url);
      await expect(page.locator("main, body").first()).toBeVisible();
      await expectAccessible(page);
      await expectNoHorizontalScroll(page);
    }
  });
}
