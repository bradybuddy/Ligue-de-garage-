import { expect, expectAccessible, expectNoHorizontalScroll, login, makeUser, sql, teamWithManager, test, uniq } from "./fixtures";

test.describe("F09 — le commissaire monte la saison", () => {
  test.use({ allowConsole: [/status of 404/] });

  test("F09-H1 ligue → équipes → match recopié chez l'équipe → pointage → classement → message", async ({ page, browser }) => {
    // Une équipe existante (son gérant donnera le code)
    const { base: teamBase } = await teamWithManager(page, { name: `Les Testeurs ${uniq("")}` });
    const code = (await page.getByLabel(/Code d'équipe/).textContent())!.trim();
    const teamName = (await page.getByRole("banner").getByRole("link").first().textContent())!.trim();

    const boss = await makeUser("Commissaire Test");
    const c = await (await browser.newContext()).newPage();
    await login(c, boss.email);
    await c.goto("/ligues/nouvelle");
    await c.getByLabel("Nom de la ligue").fill("Ligue de garage du Plateau");
    await c.getByLabel(/Divisions/).fill("A\nB");
    await c.getByRole("button", { name: "Créer la ligue" }).click();
    await c.waitForURL(/\/ligue\/[^/]+\/equipes\?bienvenue=1/);
    const league = new URL(c.url()).pathname.split("/equipes")[0]!;
    await expectAccessible(c);

    await c.getByRole("radio", { name: /Créer l'équipe pour elle/ }).check();
    await c.getByLabel("Nom de l'équipe").fill("Les Castors");
    await c.getByLabel("Division", { exact: true }).selectOption({ label: "A" });
    await c.getByRole("button", { name: "Ajouter l'équipe" }).click();
    await expect(c.getByText("Équipe ajoutée à la ligue.")).toBeVisible();
    await c.getByRole("radio", { name: /L'équipe utilise déjà Buddy/ }).check();
    await c.getByLabel("Code de l'équipe").fill(code);
    await c.getByLabel("Division", { exact: true }).selectOption({ label: "A" });
    await c.getByRole("button", { name: "Ajouter l'équipe" }).click();
    await expect(c.getByRole("region", { name: "A" }).getByText(teamName, { exact: true })).toBeVisible();
    await expect(c.getByRole("region", { name: "A" }).getByText("Les Castors", { exact: true })).toBeVisible();
    await expectNoHorizontalScroll(c);

    await c.goto(`${league}/horaire`);
    const d = new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10);
    await c.getByLabel("Date", { exact: true }).fill(d);
    await c.getByLabel("Heure", { exact: true }).fill("20:30");
    await c.getByLabel("Domicile").selectOption({ label: "Les Castors" });
    await c.getByLabel("Visiteurs").selectOption({ label: teamName });
    await c.getByLabel(/Aréna/).fill("Aréna centrale");
    await c.getByRole("button", { name: "Ajouter le match" }).click();
    await expect(c.getByText(/Match ajouté\. Il apparaît dans l'horaire des deux équipes/)).toBeVisible();
    await expect(c.getByRole("link", { name: new RegExp(`Les Castors contre ${teamName}`) })).toBeVisible();
    await expectAccessible(c);

    // Côté équipe : le match est là, marqué « ligue », pas modifiable par l'équipe
    await page.goto(`${teamBase}/horaire`);
    await page.getByRole("link", { name: /contre Les Castors/ }).click();
    await expect(page.getByText("Match de ligue")).toBeVisible();
    await expect(page.getByText(/20 h 30/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);
    await expect(page.getByRole("radiogroup", { name: "Ma présence" })).toBeVisible(); // présences comme d'habitude
    await page.goto(new URL(page.url()).pathname + "/modifier");
    await expect(page.getByText(/c'est la ligue qui le modifie/)).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Ligue" })).toBeVisible();

    // Pointage → classement
    await c.getByRole("link", { name: new RegExp(`Les Castors contre ${teamName}`) }).click();
    await c.getByLabel("Les Castors", { exact: true }).fill("2");
    await c.getByLabel(teamName, { exact: true }).fill("4");
    await c.getByRole("button", { name: "Enregistrer le pointage" }).click();
    await expect(c.getByText(/Le classement et l'horaire des équipes sont à jour/)).toBeVisible();
    await c.goto(`${league}/classement`);
    await expectAccessible(c);
    const first = c.getByRole("table").getByRole("row").nth(1);
    await expect(first).toContainText(teamName);
    await expect(first).toContainText("2"); // 2 points

    // Message à la ligue
    await c.goto(`${league}/diffusion`);
    await c.getByRole("radio", { name: "Les gérants seulement" }).check();
    await c.getByLabel("Message", { exact: true }).fill("Réunion des gérants mardi 19 h.");
    await c.getByRole("button", { name: "Envoyer à la ligue" }).click();
    await expect(c.getByText(/Message envoyé à 1 personne/)).toBeVisible();

    // Bureau : accessibilité et mise en page de chaque écran de ligue
    await c.setViewportSize({ width: 1440, height: 900 });
    for (const u of [league, `${league}/equipes`, `${league}/horaire`, `${league}/classement`, `${league}/diffusion`]) {
      await c.goto(u);
      await expectAccessible(c);
      await expectNoHorizontalScroll(c);
    }

    // Un gérant d'équipe voit la ligue en lecture seule ; un inconnu n'y a pas accès
    await page.goto(league);
    await expect(page.getByRole("navigation", { name: "Navigation de la ligue" }).getByRole("link", { name: "Message" })).toHaveCount(0);
    await page.goto(`${league}/diffusion`);
    await expect(page.getByText(/Seuls les administrateurs de la ligue/)).toBeVisible();
    const x = await (await browser.newContext()).newPage();
    await login(x, (await makeUser("Intrus Ligue")).email);
    expect((await x.goto(league))!.status()).toBe(404);
    expect((await sql`select count(*)::int as n from events e join league_games g on g.id = e.league_game_id where g.league_id::text = ${league.split("/").pop()!}`)[0]!.n).toBe(2);
  });
});
