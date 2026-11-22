import { addMatch, addPlayer, expect, expectAccessible, expectNoHorizontalScroll, linkIn, login, mail, makeUser, PASSWORD, sql, teamWithManager, test, uniq, uniqPhone } from "./fixtures";

test.describe("F01 — le gérant met son équipe en marche", () => {
  test("F01-H1 inscription → courriel → équipe → joueur → match", async ({ page }) => {
    const email = `${uniq("g")}@e2e.local`;
    await page.goto("/inscription");
    await expectAccessible(page);
    await page.getByLabel("Ton nom").fill("Gérant Heureux");
    await page.getByLabel("Courriel").fill(email);
    await page.getByLabel("Cellulaire").fill(uniqPhone());
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Regarde tes courriels")).toBeVisible();
    const m = await mail(email, /Confirme ton courriel/);
    await page.goto(linkIn(m, /http[^"\s]+\/auth\/confirm\?[^"\s]+/));
    await expect(page.getByRole("link", { name: /Je gère une équipe/ })).toBeVisible();
    await expectAccessible(page);

    await page.getByRole("link", { name: /Je gère une équipe/ }).click();
    await page.getByLabel("Nom de l'équipe").fill("Les Heureux");
    await page.getByRole("button", { name: "Créer l'équipe" }).click();
    await expect(page.getByText(/Équipe créée!/)).toBeVisible();
    const base = new URL(page.url()).pathname.split("/alignement")[0]!;
    await addPlayer(page, base, { name: "Bob Premier", phone: uniqPhone() });
    await expect(page.getByText("Bob Premier")).toBeVisible();
    await addMatch(page, base, { opponent: "Les Castors" });
    await page.goto(base);
    await expect(page.getByText("Prochain match")).toBeVisible();
    await expect(page.getByText("contre Les Castors")).toBeVisible();
  });

  test("F01-E1 noms de 60 caractères, accents et emoji", async ({ page }) => {
    const team = "Les Écureuils Endiablés de Saint-Jean-sur-Richelieu 🏒🍺 Ç";
    const player = "Marie-Ève Bélanger-Archambault-Tremblay de la Côte-Nord 🥅";
    const { base } = await teamWithManager(page, { name: team.slice(0, 60) });
    await addPlayer(page, base, { name: player.slice(0, 60), phone: uniqPhone() });
    await expect(page.getByText(player.slice(0, 60))).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto(base);
    await expect(page.getByRole("banner").getByText(team.slice(0, 60))).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("F01-E2 double clic sur « Créer l'équipe » → une seule équipe", async ({ page }) => {
    const u = await makeUser("Double Clic");
    await login(page, u.email);
    const name = `Doublon ${uniq("")}`;
    await page.goto("/equipes/nouvelle");
    await page.getByLabel("Nom de l'équipe").fill(name);
    await page.getByRole("button", { name: "Créer l'équipe" }).dblclick();
    await page.waitForURL(/\/alignement/);
    await page.waitForTimeout(800);
    const [{ n }] = await sql`select count(*)::int as n from teams where name = ${name}`;
    expect(n).toBe(1);
  });

  test("F01-E3 recharger un formulaire en erreur n'enregistre rien", async ({ page }) => {
    const { base, teamId } = await teamWithManager(page);
    await page.goto(`${base}/alignement/nouveau`);
    await page.getByLabel("Nom", { exact: true }).fill("Pas Gardé");
    await page.getByLabel("Cellulaire").fill("555");
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByText(/Numéro invalide/)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("");
    expect((await sql`select 1 from members where team_id = ${teamId} and display_name = 'Pas Gardé'`).length).toBe(0);
  });

  test("F01-E4 inscription au clavier seulement", async ({ page }) => {
    await page.goto("/inscription");
    await page.getByLabel("Ton nom").focus();
    await page.keyboard.type("Clavier Seul");
    await page.keyboard.press("Tab");
    await page.keyboard.type(`${uniq("k")}@e2e.local`);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab"); // cellulaire facultatif
    await page.keyboard.type(PASSWORD);
    await page.keyboard.press("Enter");
    await expect(page.getByText("Regarde tes courriels")).toBeVisible();
  });

  test("F01-E5 heure avancée : 21 h 15 avant et après le changement d'heure", async ({ page }) => {
    const { base } = await teamWithManager(page);
    for (const date of ["2027-03-07", "2027-03-14"]) {
      const path = await addMatch(page, base, { date, time: "21:15" });
      await page.goto(path);
      await expect(page.getByText(/21 h 15/).first()).toBeVisible();
    }
  });

  test("F01-E8 rejoindre une équipe par le lien d'invitation", async ({ page, browser }) => {
    const { base } = await teamWithManager(page);
    const code = (await page.getByLabel(/Code d'équipe/).textContent())!.trim();
    const p = await (await browser.newContext()).newPage();
    const joueur = await makeUser("Nouvelle Recrue");
    await login(p, joueur.email);
    await p.goto(`/j/${code}`);
    await p.getByRole("button", { name: /Rejoindre/ }).click();
    await p.waitForURL(new RegExp(`${base}(\\?|$)`));
    await expect(p.getByRole("banner")).toBeVisible();
  });

  test("F01-E10 invitation sans compte : inscription → courriel → arrive dans l'équipe", async ({ page, browser }) => {
    const { base } = await teamWithManager(page);
    const code = (await page.getByLabel(/Code d'équipe/).textContent())!.trim();
    const p = await (await browser.newContext()).newPage();
    const email = `${uniq("inv")}@e2e.local`;
    await p.goto(`/j/${code}`);
    await p.getByRole("link", { name: "Créer mon compte et rejoindre" }).click();
    await p.getByLabel("Ton nom").fill("Recrue Sans Compte");
    await p.getByLabel("Courriel").fill(email);
    await p.getByLabel("Mot de passe").fill(PASSWORD);
    await p.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(p.getByText("Regarde tes courriels")).toBeVisible();
    await p.goto(linkIn(await mail(email, /Confirme ton courriel/), /http[^"\s]+\/auth\/confirm\?[^"\s]+/));
    await p.getByRole("button", { name: /Rejoindre/ }).click();
    await p.waitForURL(new RegExp(`${base}(\\?|$)`));
  });

  test("F01-E9 BUG-002 ajouter un joueur avec seulement un courriel", async ({ page }) => {
    const { base } = await teamWithManager(page);
    await addPlayer(page, base, { name: "Courriel Seulement", email: `${uniq("c")}@e2e.local` });
    await expect(page.getByText("Courriel Seulement")).toBeVisible();
  });

  test("F01-N1/N2 doublon de numéro et champs invalides", async ({ page }) => {
    const { base } = await teamWithManager(page);
    const phone = uniqPhone();
    await addPlayer(page, base, { name: "Original", phone });
    await page.goto(`${base}/alignement/nouveau`);
    await page.getByLabel("Nom", { exact: true }).fill("Copie");
    await page.getByLabel("Cellulaire").fill(phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3"));
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByText("Ce numéro est déjà dans l'équipe (Original).")).toBeVisible();
    await page.getByLabel("Nom", { exact: true }).fill("");
    await page.getByLabel("Cellulaire").fill("555");
    await page.getByLabel(/^Courriel/).fill("abc");
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByText("Le nom, au moins 2 lettres.")).toBeVisible();
    await expect(page.getByText(/Numéro invalide/)).toBeVisible();
    await expect(page.getByText("Ce courriel n'a pas l'air valide.")).toBeVisible();
    await expectAccessible(page);
  });

  test("F01-N3 mauvais mot de passe", async ({ page }) => {
    const u = await makeUser();
    await page.goto("/connexion");
    await page.getByLabel("Courriel").fill(u.email);
    await page.getByLabel("Mot de passe").fill("pas-le-bon");
    await page.getByRole("button", { name: "Me connecter" }).click();
    await expect(page.getByText("Courriel ou mot de passe incorrect.")).toBeVisible();
  });

  test("F01-N4 courriel pas encore confirmé", async ({ page }) => {
    const email = `${uniq("nc")}@e2e.local`;
    await page.goto("/inscription");
    await page.getByLabel("Ton nom").fill("Pas Confirmé");
    await page.getByLabel("Courriel").fill(email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Regarde tes courriels")).toBeVisible();
    await page.goto("/connexion");
    await page.getByLabel("Courriel").fill(email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Me connecter" }).click();
    await expect(page.getByText(/Confirme d'abord ton courriel/)).toBeVisible();
  });
});
