import type { Browser, Page } from "@playwright/test";
import { addMatch, addPlayer, expect, expectAccessible, inboundSms, linkIn, login, mail, makeUser, sql, teamWithManager, test, uniqPhone } from "./fixtures";

/** Gérant + joueur qui a un compte (relié par son courriel vérifié) + un match. */
async function setup(page: Page, browser: Browser, opts: { max?: number } = {}) {
  const t = await teamWithManager(page);
  const joueur = await makeUser("Julie Joueuse");
  await addPlayer(page, t.base, { name: "Julie Joueuse", email: joueur.email });
  const match = await addMatch(page, t.base, { opponent: "Les Castors", max: opts.max });
  const ctx = await browser.newContext();
  const pj = await ctx.newPage();
  await login(pj, joueur.email);
  return { ...t, joueur, match, pj, ctx };
}
const inRegion = (p: Page) => p.getByRole("region", { name: "IN", exact: true });
const setFor = (p: Page, name: string, s: "IN" | "OUT") => p.getByRole("button", { name: `Mettre ${name} ${s}` }).click();

test.describe("F02 — le joueur répond IN/OUT", () => {
  test("F02-H1 IN puis OUT dans l'appli", async ({ page, browser }) => {
    const { pj, match } = await setup(page, browser);
    await pj.goto(match);
    await expectAccessible(pj);
    await pj.getByRole("radio", { name: /IN/ }).click();
    await expect(pj.getByText("Parfait, on compte sur toi.")).toBeVisible();
    await expect(inRegion(pj).getByText("Julie Joueuse")).toBeVisible();
    await expect(pj.getByRole("progressbar", { name: "Joueurs" })).toHaveAttribute("aria-valuenow", "1");
    await pj.getByRole("radio", { name: /OUT/ }).click();
    await expect(pj.getByText("Noté. Le gérant le sait.")).toBeVisible();
    await expect(pj.getByRole("region", { name: "OUT", exact: true }).getByText("Julie Joueuse")).toBeVisible();
  });

  test("F02-H2 relance → texto → « y » → IN par texto", async ({ page, request }) => {
    const { base } = await teamWithManager(page);
    const phone = uniqPhone();
    await addPlayer(page, base, { name: "Bob Texto", phone });
    const match = await addMatch(page, base);
    await page.goto(match);
    await page.getByRole("button", { name: /Relancer les \d+ sans réponse/ }).click();
    await expect(page.getByText(/Relance envoyée à \d+ joueurs?/)).toBeVisible();
    const [sms] = await sql`select body from outbox where channel = 'sms' and to_address = ${"+1" + phone}`;
    expect(sms!.body).toMatch(/Réponds Y ou N\./);
    expect(await inboundSms(request, "+1" + phone, "y")).toMatch(/C'est noté : t'es IN/);
    await page.reload();
    await expect(inRegion(page).getByText("Bob Texto")).toBeVisible();
    await expect(inRegion(page).getByText(/par texto/)).toBeVisible();
  });

  test("F02-H3/E7 lien du courriel : pré-ouverture sans effet, vrai clic = IN", async ({ page, browser, request }) => {
    const { pj, match, joueur } = await setup(page, browser);
    await page.goto(match);
    await page.getByRole("button", { name: /Relancer/ }).click();
    await expect(page.getByText(/Relance envoyée/)).toBeVisible();
    const link = linkIn(await mail(joueur.email, /t'es là\?/), /http[^"\s]+\/r\/[a-f0-9]+\?s=in/);
    await request.get(link); // antivirus de courriel
    await page.reload();
    await expect(inRegion(page).getByText("Julie Joueuse")).toHaveCount(0);
    await pj.goto(link);
    await expect(pj.getByText("C'est noté : t'es IN. 🏒")).toBeVisible();
    await page.reload();
    await expect(inRegion(page).getByText("Julie Joueuse")).toBeVisible();
  });

  test("F02-E1 IN → OUT : le gérant est avisé", async ({ page, browser }) => {
    const { pj, match, teamId } = await setup(page, browser);
    await pj.goto(match);
    await pj.getByRole("radio", { name: /IN/ }).click();
    await expect(pj.getByText("Parfait, on compte sur toi.")).toBeVisible();
    await pj.getByRole("radio", { name: /OUT/ }).click();
    await expect(pj.getByText("Noté. Le gérant le sait.")).toBeVisible();
    await expect.poll(async () => (await sql`
      select count(*)::int as n from outbox o join members m on m.id = o.member_id
       where m.team_id = ${teamId} and m.role = 'manager' and o.template = 'player_dropped'`)[0]!.n).toBe(1);
  });

  test("F02-E2 match complet → en attente", async ({ page, browser }) => {
    const { pj, match, base } = await setup(page, browser, { max: 1 });
    await page.goto(match);
    await setFor(page, "Gérant Test", "IN");
    await expect(inRegion(page).getByText("Gérant Test")).toBeVisible();
    await pj.goto(match);
    await pj.getByRole("radio", { name: /IN/ }).click();
    await expect(pj.getByText(/Le match est complet\. Tu montes automatiquement/)).toBeVisible();
    await expect(pj.getByRole("radio", { name: /En attente/ })).toBeChecked();
    void base;
  });

  test("F02-E3 deux joueurs, une place, au même moment", async ({ page, browser }) => {
    const t = await teamWithManager(page);
    const a = await makeUser("Anne Rapide"), b = await makeUser("Ben Rapide");
    await addPlayer(page, t.base, { name: "Anne Rapide", email: a.email });
    await addPlayer(page, t.base, { name: "Ben Rapide", email: b.email });
    const match = await addMatch(page, t.base, { max: 1 });
    const pa = await (await browser.newContext()).newPage(), pb = await (await browser.newContext()).newPage();
    await login(pa, a.email); await login(pb, b.email);
    await Promise.all([pa.goto(match), pb.goto(match)]);
    await Promise.all([pa.getByRole("radio", { name: /IN/ }).click(), pb.getByRole("radio", { name: /IN/ }).click()]);
    await expect.poll(async () => (await sql`
      select array_agg(a.status order by a.status) as s from attendance a join events e on e.id = a.event_id
       where e.id = ${match.split("/").pop()!}`)[0]!.s).toEqual(["in", "waitlist"]);
  });

  test("F02-E4 session expirée → renvoi à la connexion", async ({ browser, page }) => {
    const { pj, ctx, match } = await setup(page, browser);
    await pj.goto(match);
    await ctx.clearCookies();
    await pj.getByRole("radio", { name: /IN/ }).click();
    await pj.waitForURL(/\/connexion/);
  });

  test.describe(() => {
    test.use({ allowConsole: [/Failed to fetch|ERR_INTERNET_DISCONNECTED|net::ERR/] });
    test("F02-E5 hors ligne : message clair, le bouton revient", async ({ page, browser }) => {
      const { pj, ctx, match } = await setup(page, browser);
      await pj.goto(match);
      await ctx.setOffline(true);
      await pj.getByRole("radio", { name: /IN/ }).click();
      await expect(pj.getByText(/Pas de connexion\. Ta réponse n'a pas été enregistrée/)).toBeVisible();
      await expect(pj.getByRole("radiogroup", { name: "Ma présence" })).toBeVisible(); // la page n'a pas planté
      await expect(pj.getByRole("radio", { name: /IN/ })).not.toHaveAttribute("aria-disabled", "true");
      await ctx.setOffline(false);
      await pj.getByRole("radio", { name: /IN/ }).click();
      await expect(pj.getByText("Parfait, on compte sur toi.")).toBeVisible();
    });
  });

  test("F02-E6 match annulé : plus de réponse possible", async ({ page, browser, request }) => {
    const { pj, match } = await setup(page, browser);
    const phone = uniqPhone();
    const base = match.split("/matchs")[0]!;
    await addPlayer(page, base, { name: "Bob Annulé", phone });
    await page.goto(match);
    await page.getByRole("button", { name: /Relancer/ }).click();
    await expect(page.getByText(/Relance envoyée/)).toBeVisible();
    await page.goto(`${match}/modifier`);
    await page.getByRole("button", { name: "Annuler le match" }).click();
    await page.getByRole("button", { name: "Oui, annuler" }).click();
    await page.waitForURL(`**${match}`);
    await pj.goto(match);
    await expect(pj.getByText("Ce match est annulé.")).toBeVisible();
    await expect(pj.getByRole("radiogroup", { name: "Ma présence" })).toHaveCount(0);
    expect(await inboundSms(request, "+1" + phone, "y")).toMatch(/Rien en attente/);
  });

  test("F02-E10 STOP : plus de texto", async ({ page, request }) => {
    const { base } = await teamWithManager(page);
    const phone = uniqPhone();
    await addPlayer(page, base, { name: "Stop Stop", phone });
    expect(await inboundSms(request, "+1" + phone, "STOP")).toMatch(/ne recevras plus/);
    const match = await addMatch(page, base);
    await page.goto(match);
    await page.getByRole("button", { name: /Relancer/ }).click();
    await expect(page.getByText(/Relance envoyée|Tout le monde/)).toBeVisible();
    expect((await sql`select 1 from outbox where channel = 'sms' and to_address = ${"+1" + phone}`).length).toBe(0);
  });

  test("F02-E11 IN/OUT au clavier", async ({ page, browser }) => {
    const { pj, match } = await setup(page, browser);
    await pj.goto(match);
    await pj.getByRole("radio", { name: /IN/ }).focus();
    await pj.keyboard.press("Enter");
    await expect(pj.getByText("Parfait, on compte sur toi.")).toBeVisible();
    await pj.keyboard.press("ArrowRight");
    await expect(pj.getByText("Noté. Le gérant le sait.")).toBeVisible();
    await expect(pj.getByRole("radio", { name: /OUT/ })).toBeFocused();
  });

  test("F02-N1 une joueuse ne voit aucun outil de gérant", async ({ page, browser }) => {
    const { pj, match } = await setup(page, browser);
    await pj.goto(match);
    await expect(pj.getByRole("button", { name: /^Mettre / })).toHaveCount(0);
    await expect(pj.getByRole("button", { name: /Relancer/ })).toHaveCount(0);
    await expect(pj.getByRole("link", { name: "Modifier" })).toHaveCount(0);
  });

  test("F02-N3 lien de courriel invalide", async ({ page }) => {
    await page.goto("/r/abc");
    await expect(page.getByRole("heading", { name: "Lien invalide" })).toBeVisible();
  });
});

test.describe("F04 — liste d'attente automatique", () => {
  test("F04-H1 désistement : le premier en attente monte (régulier avant spare : test db)", async ({ page }) => {
    const { base } = await teamWithManager(page);
    await addPlayer(page, base, { name: "Ali Régulier", phone: uniqPhone() });
    const match = await addMatch(page, base, { max: 1 });
    await page.goto(match);
    await setFor(page, "Gérant Test", "IN");
    await expect(inRegion(page).getByText("Gérant Test")).toBeVisible();
    await setFor(page, "Ali Régulier", "IN");
    const waitlist = page.getByRole("region", { name: "Liste d'attente" });
    await expect(waitlist.getByText("Ali Régulier")).toBeVisible();
    await setFor(page, "Gérant Test", "OUT");
    await expect(inRegion(page).getByText("Ali Régulier")).toBeVisible();
  });
});
