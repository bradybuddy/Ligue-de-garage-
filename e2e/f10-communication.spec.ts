import { addPlayer, expect, expectAccessible, expectNoHorizontalScroll, login, makeUser, sql, teamWithManager, test, uniqPhone } from "./fixtures";

test.describe("F10 — communication", () => {
  test("F10-H1 chat : message, réaction avec les noms, suppression, Entrée pour envoyer", async ({ page, browser }) => {
    const { base } = await teamWithManager(page);
    const j = await makeUser("Julie Chat");
    await addPlayer(page, base, { name: "Julie Chat", email: j.email });
    await page.goto(`${base}/chambre`);
    await expect(page.getByText(/Personne n'a encore parlé/)).toBeVisible();
    await expectAccessible(page);
    await page.getByLabel("Message à l'équipe").fill("Qui apporte les rondelles?");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Qui apporte les rondelles?")).toBeVisible();
    await expect(page.getByLabel("Message à l'équipe")).toHaveValue("");

    const p = await (await browser.newContext()).newPage();
    await login(p, j.email);
    await p.goto(`${base}/chambre`);
    await expect(p.getByText("Qui apporte les rondelles?")).toBeVisible();
    await p.getByRole("button", { name: "Réagir", exact: true }).click();
    await p.getByRole("button", { name: "Réagir 🔥" }).click();
    await expect(p.getByRole("button", { name: /🔥 1 : Moi/ })).toBeVisible();
    await p.getByLabel("Message à l'équipe").fill("Moi! Pis c'est ma tournée 🍺");
    await p.getByRole("button", { name: "Envoyer" }).click();
    await expect(p.getByText("Moi! Pis c'est ma tournée 🍺")).toBeVisible();

    await expect(page.getByRole("button", { name: /🔥 1 : Julie Chat/ })).toBeVisible({ timeout: 10_000 }); // rafraîchi tout seul
    await expect(page.getByText("Moi! Pis c'est ma tournée 🍺")).toBeVisible();
    await expect(page.getByRole("button", { name: "Supprimer mon message" })).toHaveCount(1); // seulement le sien
    await page.getByRole("button", { name: "Supprimer mon message" }).click();
    await expect(page.getByText("Tu as supprimé un message.")).toBeVisible();
    await expectNoHorizontalScroll(page);
    // Rien n'est parti par courriel pour le chat
    expect((await sql`select count(*)::int as n from outbox where category = 'chat' and channel <> 'push'`)[0]!.n).toBe(0);
  });

  test("F10-H2 message à toute l'équipe : envoyé, historique, lecture seule pour une joueuse", async ({ page, browser }) => {
    const { base } = await teamWithManager(page);
    const phone = uniqPhone();
    await addPlayer(page, base, { name: "Bob Annonce", phone });
    const j = await makeUser("Julie Annonce");
    await addPlayer(page, base, { name: "Julie Annonce", email: j.email });
    await page.goto(`${base}/diffusion`);
    await expectAccessible(page);
    await page.getByRole("group", { name: "Envoyer par" }).locator("label").filter({ hasText: "Courriel" }).click();
    await expect(page.getByRole("checkbox", { name: /Courriel/ })).toBeChecked(); // ajoute le courriel aux canaux (notif + texto par défaut)
    await page.getByLabel(/Objet du courriel/).fill("Party de fin de saison");
    await page.getByLabel("Message", { exact: true }).fill("Samedi chez Max, apportez votre chaise!");
    await expect(page.getByText(/par texto : 1 segment/)).toBeVisible();
    await page.getByRole("button", { name: "Envoyer à l'équipe" }).click();
    await expect(page.getByText(/Message envoyé à 3 personnes/)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Party de fin de saison" })).toBeVisible();
    const [sms] = await sql`select body from outbox where category = 'broadcast' and channel = 'sms' and to_address = ${"+1" + phone}`;
    expect(sms!.body).toMatch(/Gérant Test : Samedi chez Max/);
    const p = await (await browser.newContext()).newPage();
    await login(p, j.email);
    await p.goto(`${base}/diffusion`);
    await expect(p.getByRole("heading", { name: "Messages du gérant" })).toBeVisible();
    await expect(p.getByText("Samedi chez Max, apportez votre chaise!")).toBeVisible();
    await expect(p.getByRole("button", { name: "Envoyer à l'équipe" })).toHaveCount(0);
  });
});
