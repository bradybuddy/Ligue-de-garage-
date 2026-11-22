import { addMatch, expect, linkIn, login, mail, makeUser, PASSWORD, sql, teamWithManager, test, uniq } from "./fixtures";

test.describe("Sécurité", () => {
  test.use({ allowConsole: [/status of 404/] });

  test("X-S1 un intrus connecté reçoit 404 partout", async ({ page, browser }) => {
    const { base } = await teamWithManager(page);
    const match = await addMatch(page, base);
    const intrus = await makeUser("Intrus");
    const p = await (await browser.newContext()).newPage();
    await login(p, intrus.email);
    for (const url of [base, match, `${base}/alignement`, `${base}/horaire`, `${match}/modifier`]) {
      expect((await p.goto(url))!.status(), url).toBe(404);
      await expect(p.getByRole("heading", { name: "Introuvable" })).toBeVisible(); // BUG-006 : 404 en français
    }
  });

  test("X-S2 une joueuse sur les pages de gérant", async ({ page, browser }) => {
    const { base } = await teamWithManager(page);
    const j = await makeUser("Joueuse Curieuse");
    await page.goto(`${base}/alignement/nouveau`);
    await page.getByLabel("Nom", { exact: true }).fill("Joueuse Curieuse");
    await page.getByLabel(/^Courriel/).fill(j.email);
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await page.waitForURL(`**${base}/alignement`);
    const p = await (await browser.newContext()).newPage();
    await login(p, j.email);
    await p.goto(`${base}/horaire/nouveau`);
    await expect(p.getByText(/Seuls le gérant et l'adjoint/)).toBeVisible();
    await p.goto(`${base}/alignement/nouveau`);
    await expect(p.getByText(/Seuls le gérant et l'adjoint/)).toBeVisible();
  });

  test("X-S3 pas connecté → connexion avec retour", async ({ page }) => {
    const { base } = await teamWithManager(page);
    await page.context().clearCookies();
    await page.goto(`${base}/horaire`);
    await expect(page).toHaveURL(new RegExp(`/connexion\\?next=${encodeURIComponent(`${base}/horaire`).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });

  test("X-S4 tâche planifiée sans secret → 401", async ({ request }) => {
    expect((await request.post("/api/cron/tick")).status()).toBe(401);
    expect((await request.post("/api/cron/tick", { headers: { authorization: "Bearer mauvais" } })).status()).toBe(401);
  });

  test("X-S5 pas de redirection vers un autre site", async ({ page }) => {
    const u = await makeUser();
    await page.goto("/connexion?next=//evil.example.com");
    await page.getByLabel("Courriel").fill(u.email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Me connecter" }).click();
    await page.waitForLoadState("networkidle");
    expect(new URL(page.url()).host).toBe("localhost:3123");
  });
});

test.describe("Compte", () => {
  test("X-A1 mot de passe oublié de bout en bout", async ({ page, browser }) => {
    const u = await makeUser("Oublieux");
    await page.goto("/mot-de-passe-oublie");
    await page.getByLabel("Courriel").fill(u.email);
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(page.getByText("Regarde tes courriels")).toBeVisible();
    await page.goto(linkIn(await mail(u.email, /nouveau mot de passe/), /http[^"\s]+\/auth\/confirm\?[^"\s]+/));
    await page.waitForURL("**/reinitialiser");
    await page.getByLabel("Nouveau mot de passe").fill("nouveau-secret-9");
    await page.getByLabel("Encore une fois").fill("nouveau-secret-9");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/reinitialiser"));
    const p = await (await browser.newContext()).newPage();
    await p.goto("/connexion");
    await p.getByLabel("Courriel").fill(u.email);
    await p.getByLabel("Mot de passe").fill(PASSWORD);
    await p.getByRole("button", { name: "Me connecter" }).click();
    await expect(p.getByText("Courriel ou mot de passe incorrect.")).toBeVisible();
    await login(p, u.email, "nouveau-secret-9");
  });

  test("X-A2 déconnecter tous mes appareils", async ({ page, browser }) => {
    const u = await makeUser("Deux Appareils");
    const autre = await (await browser.newContext()).newPage();
    await login(page, u.email); await login(autre, u.email);
    await page.goto("/compte");
    await page.getByRole("button", { name: "Déconnecter tous mes appareils" }).click();
    await page.waitForURL(/partout=1/);
    await autre.goto("/compte");
    await expect(autre).toHaveURL(/\/connexion/);
  });

  test("X-A3 supprimer mon compte", async ({ page }) => {
    const u = await makeUser("Partant");
    await login(page, u.email);
    await page.goto("/compte");
    await page.getByRole("button", { name: "Supprimer mon compte pour de bon" }).click();
    await expect(page.getByText("Écris SUPPRIMER pour confirmer.").last()).toBeVisible();
    await page.getByLabel("Écris SUPPRIMER pour confirmer").fill("supprimer");
    await page.getByRole("button", { name: "Supprimer mon compte pour de bon" }).click();
    await page.waitForURL(/compte-supprime=1/);
    expect((await sql`select 1 from profiles where id = ${u.id}`).length).toBe(0);
  });

  test("X-A4 désabonnement en un clic depuis le courriel", async ({ page, request }) => {
    const { base } = await teamWithManager(page);
    const match = await addMatch(page, base);
    await page.goto(match);
    await page.getByRole("button", { name: /Relancer/ }).click();
    await expect(page.getByText(/Relance envoyée/)).toBeVisible();
    const email = (await sql`select o.to_address from outbox o join members m on m.id = o.member_id
      where o.channel = 'email' and m.role = 'manager' and o.payload->>'event_id' = ${match.split("/").pop()!}`)[0]!.to_address;
    const m = await mail(email, /t'es là\?/);
    const headers = await (await fetch(`http://localhost:54324/api/v1/message/${m.ID}/headers`)).json();
    const url = (headers["List-Unsubscribe"][0] as string).replace(/[<>]/g, "");
    expect((await request.post(url, { data: "List-Unsubscribe=One-Click" })).status()).toBe(200);
    expect((await sql`select enabled from notification_prefs np join members mb on mb.id = np.member_id
      where mb.email = ${email} and np.category = 'reminder' and np.channel = 'email'`)[0]!.enabled).toBe(false);
    void uniq;
  });
});
