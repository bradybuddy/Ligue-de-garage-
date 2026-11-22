# Checklist de mise en ligne : Buddy & Beer (nom provisoire ; « Au Complet » recommandé)

Date : 2026-11-22  Commit : voir `git log` (branche `claude/new-session-aidw57`)  **Contrôle d'avant mise en ligne : réussi (`npm run preflight`). Feu vert du propriétaire : pas encore**

> Rien n'est en ligne. Le contrôle du code est vert ; la suite (sections 2 à 4) demande tes comptes. Le nom reste « Buddy & Beer » tant que tu n'as pas choisi.
> Règle : c'est toi qui achètes, qui te connectes et qui colles les clés. Ce document donne les valeurs exactes ; Claude ne crée aucun compte et ne voit aucune clé de production.

## 1. Contrôle d'avant mise en ligne

Relancer en tout temps : `npm run preflight` (et `npm run preflight -- --prod` avec les variables de production chargées).

- [x] Tests e2e : **58 / 58** (Playwright, Pixel 7 ; axe WCAG 2.2 AA, aucune erreur de console ni 5xx), plus base **19 / 19**, unités **3 / 3**
- [x] Aucun bogue S1 ou S2 ouvert (`bugs.md` : 0 / 0 ; 2 S2 corrigés)
- [x] **Fonctions essentielles : 29 / 29.** **Sans GIF au lancement** (décision du propriétaire, 2026-11-22) : le bouton est caché sans `GIPHY_API_KEY`, et GIPHY est retiré de la politique de confidentialité. Pour l'activer plus tard : clé de production, test d'un GIF, GIPHY remis dans `/confidentialite` (le contrôle le vérifie).
- [x] Balayage de la marque propre : aucun nom, domaine, couleur ni police de l'original dans le code ni dans les noms de fichiers. Le test qui vérifiait l'absence du nom lit maintenant `brand.json` au lieu de l'écrire.
- [x] Fiche des magasins conforme (`node scripts/check-listing.mjs`)
- [x] Build de production : réussi
- [x] **Pages légales :** `/confidentialite` (Loi 25, chaque fournisseur nommé) et `/conditions`, liées depuis l'accueil et l'inscription. Exploitant et responsable de la protection des renseignements personnels : Jean Claude Houle, Mirabel (Québec) ; contact : `beerbuddy@gamail.com` (**vérifier l'orthographe : gamail ou gmail?** C'est l'adresse publiée). Ce sont des **ébauches** : à faire relire par un avocat avant d'ouvrir au public.
- [x] Suppression du compte : marche (test X-A3) ; l'historique d'équipe devient « Ancien joueur »
- [~] Icône, favicon, image sociale, manifeste PWA : **faits, avec une icône provisoire** tirée du brief de logo (rondelle ambre + crochet). Quand le designer livre le logo : remplacer `src/app/icon.svg`, puis `npm run brand:assets`. Même commande après un changement de nom (l'image sociale contient le nom).
- [x] Témoins : un seul, la session (essentiel) → pas de bannière de témoins nécessaire

Ajouté pendant cette étape :
- `src/app/manifest.ts`, icônes 192/512/maskable, `apple-icon.png`, `opengraph-image.png` : sans manifeste, un iPhone ne peut pas recevoir les notifs web.
- `/design` (galerie des composantes) fermé en production, comme `/dev`.
- **Sentry** (`src/instrumentation*.ts`) : actif seulement avec un DSN, et sans données personnelles (ni utilisateur, ni témoins, ni en-têtes, ni contenu, ni paramètres d'URL).
- **Battement de cœur du cron** (migration 0009) → `/etat` (page publique) et `/api/sante` (200 / 503, pour la surveillance).
- Le journal d'envoi efface aussi les envois en échec après 90 jours (la politique de confidentialité le promet).
- **CI** `.github/workflows/ci.yml` : types, unités, base, build, e2e sur chaque push et chaque PR.
- `npm run vercel-build` : migrations puis build ; refuse de builder en production sans `DATABASE_URL_DIRECT` ou avec `ALLOW_DEMO`.

## 2. Services de production (toi)

### Supabase (base + comptes)
- [ ] **Nouveau projet séparé**, jamais celui de dev. Région **ca-central-1 (Canada)**, comme le dit la politique de confidentialité.
- [ ] Plan avec **sauvegardes quotidiennes** (7 jours, promis dans la politique ; le plan gratuit n'en a pas : vérifie sur leur page de prix).
- [ ] Database → Extensions : activer **pg_cron** et **pg_net**.
- [ ] Les migrations s'appliquent au déploiement (`vercel-build`), pas à la main.
- [ ] Après le premier déploiement : exécuter `supabase/cron.sql` une fois dans le SQL Editor (remplacer `<CRON_SECRET>` et `<APP_URL>`).
- [ ] Authentication → URL Configuration : **Site URL** = `https://<domaine>` ; **Redirect URLs** = `https://<domaine>/auth/confirm` et `https://<domaine>/reinitialiser`.
- [ ] Authentication → Email Templates : coller `supabase/templates/confirmation.html` et `recovery.html` ; sujets « Confirme ton courriel » et « Réinitialise ton mot de passe ».
- [ ] Authentication → SMTP : **SMTP personnalisé avec Resend** (le SMTP par défaut de Supabase est très limité et n'est pas fait pour la production).

### Twilio (textos)
- [ ] Numéro canadien (local 514/438 ou sans frais) dans un **Messaging Service**.
- [ ] Enregistrement exigé pour envoyer des textos d'application (A2P 10DLC pour un numéro local, ou vérification du numéro sans frais). Compter des jours, pas des minutes.
- [ ] Messaging Service → Integration → webhook entrant : `https://<domaine>/api/webhooks/twilio/sms` (POST) ; statut : `https://<domaine>/api/webhooks/twilio/status`.
- [ ] Lire la page de prix de Twilio pour le Canada et noter le coût par texto dans `pricing.md`.

### Resend (courriels)
- [ ] Ajouter le domaine d'envoi **`mail.<domaine>`** (sous-domaine : protège la réputation du domaine principal).
- [ ] Copier les enregistrements DNS que Resend affiche (section 3). Attendre « Verified ».

### Notifs web (VAPID)
- [ ] `npx web-push generate-vapid-keys` sur ton ordi → coller les deux clés dans Vercel. **Ne plus jamais les changer** : ça désabonnerait tous les appareils.

### Sentry
- [ ] Projet « Next.js », région au choix (US ou EU, à indiquer dans la politique si EU). Copier le DSN dans `SENTRY_DSN` et `NEXT_PUBLIC_SENTRY_DSN`.
- [ ] Alerte : « nouvelle erreur » → ton courriel et l'appli mobile Sentry.

### Stripe
- **Pas pour ce lancement.** La facturation n'est pas codée (`pricing.md` §5-6) et le plan Ligue n'est pas encore payant. Lancer gratuit ; Stripe vient après, par `/replica-backend`.

### OAuth
- Aucun fournisseur OAuth (connexion par courriel et mot de passe seulement) : rien à faire.

## 3. Hébergement et domaine

### Vercel
- [ ] Importer le dépôt GitHub. Framework : Next.js. **Build Command : `npm run vercel-build`**. Branche de production : `main` (les PR reçoivent une URL de préproduction).
- [ ] Région des fonctions : la plus près de Montréal (la base est en ca-central-1).
- [ ] **Exiger la CI** avant la production (Settings → Git → vérifications requises / Deployment Checks). Sans ça, la page d'accueil promet quelque chose de faux.
- [ ] Variables (Settings → Environment Variables), **Production seulement**, noms identiques à `.env.example` :

| Variable | Valeur |
|---|---|
| `APP_URL` | `https://<domaine>` (sans / final) |
| `CRON_SECRET`, `UNSUBSCRIBE_SECRET` | `openssl rand -hex 32` (deux valeurs différentes) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `DATABASE_URL` | Supabase → Database → pooler **transaction** (port 6543) |
| `DATABASE_URL_DIRECT` | connexion directe (port 5432), pour les migrations |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` | Twilio |
| `TWILIO_WEBHOOK_URL` | `https://<domaine>/api/webhooks/twilio/sms` (exactement l'URL configurée chez Twilio : la signature en dépend) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend ; ex. `Au Complet <rappels@mail.<domaine>>` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | web-push ; `mailto:aide@<domaine>` |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Sentry |
| `GIPHY_API_KEY` | **ne pas définir** (pas de GIF au lancement) |
| **Jamais** : `ALLOW_DEMO`, `MAILPIT_URL`, `TEST_DATABASE_URL` | le build de production refuse `ALLOW_DEMO` |

### Domaine (à acheter par toi, chez n'importe quel registraire)
Libres au 2026-11-22 (`brand.json`) : `aucomplet.ca`, `aucomplet.com`, `aucomplet.app`, `buddyandbeer.ca`, `buddyandbeer.com`. **Choisir le nom d'abord.** Pour le Québec, `.ca` comme domaine principal, et `.com` redirigé.

| Type | Nom | Valeur | Pour |
|---|---|---|---|
| A | `@` | l'adresse IP affichée par Vercel dans Settings → Domains | site |
| CNAME | `www` | `cname.vercel-dns.com` (ou la cible affichée par Vercel) | site |
| TXT | selon Vercel | valeur de vérification, si Vercel la demande | site |
| MX, TXT (SPF), TXT (DKIM) | sous `mail` / `send.mail` / `resend._domainkey.mail` | **copier exactement ce que Resend affiche** | courriels |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@<domaine>` → passer à `p=quarantine` après 2 à 4 semaines de rapports propres | courriels |

- [ ] Hôte canonique : **l'apex** (`https://<domaine>`) ; `www` redirige (Vercel le propose à l'ajout du domaine).
- [ ] HTTPS : automatique sur Vercel ; vérifier le cadenas sur l'apex et sur `www`.
- [ ] Changer `APP_URL`, Supabase (Site URL, redirections), Twilio (webhooks) et `TWILIO_WEBHOOK_URL` si l'URL change.

## 4. Surveillance

- [ ] Sentry branché (DSN) + alerte courriel.
- [ ] Vérification de disponibilité (UptimeRobot, Better Stack ou les vérifications de Vercel) aux 5 minutes sur :
  - `https://<domaine>/` → 200
  - `https://<domaine>/api/sante` → 200 ; **503 = le cron ne roule plus ou des envois sont coincés** → alerte **par texto** sur ton cell (c'est le soir du match qui compte)
- [ ] Journaux : ceux de Vercel (durée selon le plan) ; Supabase → Logs pour la base et Auth.
- [ ] Analytique : pas avant d'avoir choisi (Plausible ou PostHog avec IP masquée, sans témoins : pas de bannière). Mettre le fournisseur dans la politique de confidentialité **avant** de l'activer.
- [ ] **Faire le parcours principal sur le site en ligne**, au bureau puis sur ton cell : s'inscrire → créer l'équipe → ajouter un joueur avec ton 2e numéro → ajouter un match → recevoir le texto → répondre Y → voir IN. Puis : ajouter à l'écran d'accueil sur iPhone et recevoir une notif.

## 5. Applis mobiles

**Pas pour ce lancement.** On lance la PWA (c'est l'angle « rien à installer »). Pour l'App Store, il faudra une enveloppe native qui apporte plus qu'un site (règle 4.2 d'Apple) : voir `launch/launch-plan.md` §5. Comptes : Apple 99 $ US/an, Google 25 $ US une fois.

## 6. Première semaine
- `/etat` chaque soir de match entre 18 h et 23 h ; `/api/sante` ne doit jamais passer à 503.
- Twilio → Monitor → Logs : erreurs 30003 à 30008 (numéro injoignable, filtré par l'opérateur). Un taux d'échec au-dessus de 2 % veut dire un problème d'enregistrement.
- Resend → taux de rebond et de plaintes ; DMARC : lire les rapports avant de passer à `quarantine`.
- Sentry : zéro erreur nouvelle non expliquée.
- Coût des textos par équipe (le seuil de 500 par mois dans `pricing.md` est une estimation).

## Checklist

```
## Preflight (all must pass)
- [x] e2e suite green: 58 passed / 58 (+ db 19/19, unit 3/3)
- [x] no open S1 or S2 bugs
- [x] parity: all must-haves done (29/29 — sans GIF au lancement)
- [x] rebrand sweep clean
- [x] store listing passes (stores later)
- [x] production build passes
- [x] privacy policy and terms live, every processor listed (ébauches ; relecture par un avocat recommandée)
- [x] account deletion works
- [~] favicon, titles, OG image, emails, app icon are yours (icône provisoire d'après le brief)

## Production
- [ ] separate production database, backups on, migrations in the deploy (npm run vercel-build ✓ dans le code)
- [ ] env vars set (names match .env.example)
- [ ] Stripe live — reporté : facturation pas codée, lancement gratuit
- [x] OAuth redirect URIs — aucun fournisseur OAuth ; Supabase Auth Site URL + redirections à mettre
- [x] Google OAuth verification — sans objet
- [ ] email sending domain verified (mail.<domaine> chez Resend)

## Domain
- [ ] A @ -> IP affichée par Vercel
- [ ] CNAME www -> cname.vercel-dns.com
- [ ] SPF, DKIM, DMARC set
- [ ] canonical host chosen (apex), www redirects
- [ ] HTTPS valid

## Watch
- [ ] error tracking (Sentry, code prêt)
- [ ] uptime checks (/ et /api/sante, code prêt)
- [ ] analytics (à choisir)
- [ ] core flow done on the live site, desktop and phone
```
