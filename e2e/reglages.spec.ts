import { addMatch, addPlayer, expect, expectAccessible, expectNoHorizontalScroll, login, makeUser, sql, teamWithManager, test, uniqPhone } from "./fixtures";

test.describe("S25 / S26 — réglages et préférences", () => {
  test("S25 le gérant change les réglages ; ils s'appliquent", async ({ page }) => {
    const { base, teamId } = await teamWithManager(page);
    await page.goto(`${base}/reglages`);
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
    await page.getByLabel("Joueurs par match").fill("10");
    await page.getByLabel("Demander « t'es là? »").selectOption("72");
    await page.getByLabel("Moment de l'invitation").selectOption("24");
    await page.getByRole("radio", { name: /Toute la liste est avisée/ }).check();
    await page.getByRole("switch", { name: "Choisir qui apporte la bière" }).click();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Réglages enregistrés.")).toBeVisible();
    const [t] = await sql`select max_players, reminder_hours_before, auto_spares_hours_before, waitlist_mode, beer_enabled from teams where id = ${teamId}`;
    expect(t).toEqual({ max_players: 10, reminder_hours_before: 72, auto_spares_hours_before: 24, waitlist_mode: "first_accept", beer_enabled: false });
    await page.goto(`${base}/tournee`);
    await expect(page.getByText("La tournée est désactivée pour cette équipe.")).toBeVisible();
    await page.goto(`${base}/reglages`);
    await page.getByLabel("Joueurs par match").fill("0");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Entre 1 et 60.")).toBeVisible();
  });

  test("S26 couper les rappels par courriel : le prochain rappel ne part pas par courriel", async ({ page, browser }) => {
    const { base } = await teamWithManager(page);
    const j = await makeUser("Julie Préférences");
    await addPlayer(page, base, { name: "Julie Préférences", email: j.email, phone: uniqPhone() });
    const p = await (await browser.newContext()).newPage();
    await login(p, j.email);
    await p.goto("/compte");
    await expectAccessible(p);
    const box = p.getByRole("checkbox", { name: "Rappels de match (t'es là?) par courriel" });
    await expect(box).toBeChecked();
    await box.uncheck();
    await p.reload();
    await expect(p.getByRole("checkbox", { name: "Rappels de match (t'es là?) par courriel" })).not.toBeChecked();
    for (const c of ["notif", "texto"]) await p.getByRole("checkbox", { name: `Rappels de match (t'es là?) par ${c}` }).uncheck();
    await expect(p.getByText(/Tu ne recevras aucun rappel/)).toBeVisible();
    await p.getByRole("checkbox", { name: "Rappels de match (t'es là?) par texto" }).check();
    const match = await addMatch(page, base);
    await page.goto(match);
    await page.getByRole("button", { name: /Relancer/ }).click();
    await expect(page.getByText(/Relance envoyée/)).toBeVisible();
    await expect.poll(async () => (await sql`select o.channel, o.status from outbox o where o.to_address = ${j.email} and o.category = 'reminder'`)
      .map((r) => `${r.channel}/${r.status}`), { timeout: 30_000 }).toEqual(["email/skipped"]);
    await expect(p.getByRole("checkbox", { name: /Alertes de gérant/ })).toHaveCount(0); // pas gérante
  });

  test("S25 une joueuse ne change pas les réglages", async ({ page, browser }) => {
    const { base } = await teamWithManager(page);
    const j = await makeUser("Joueuse Réglages");
    await addPlayer(page, base, { name: "Joueuse Réglages", email: j.email });
    const p = await (await browser.newContext()).newPage();
    await login(p, j.email);
    await p.goto(`${base}/reglages`);
    await expect(p.getByText(/Seuls le gérant et l'adjoint/)).toBeVisible();
  });
});
