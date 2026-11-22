# Backend — Buddy & Beer

État au 2026-11-22. La couche de démo (`src/lib/data/fake.ts`) est remplacée par Postgres/Supabase (`src/lib/data/pg.ts`) dès que `DATABASE_URL` est défini. Les deux couches ont les mêmes fonctions ; le compilateur le vérifie dans `src/lib/data/index.ts`.

## Ce qui tourne

| Morceau | Comment | Testé |
|---|---|---|
| **Base de données** | Postgres Supabase, 5 migrations dans `supabase/migrations/`, appliquées par `npm run db:migrate` (suivi dans `schema_migrations`) | Oui, sur l'image officielle `supabase/postgres` 15.8 |
| **Accès** | RLS sur toutes les tables. Chaque requête d'un utilisateur s'exécute avec son identité (`set local role authenticated` + `request.jwt.claims`), donc `auth.uid()` et les policies s'appliquent pour vrai. `service_role` seulement pour les webhooks, la tâche planifiée et les tables réservées au serveur, après une vérification de droits explicite. | Oui : `npm run test:db` |
| **Auth** | Supabase Auth via `@supabase/ssr`, cookies http-only ; rafraîchie par `src/proxy.ts`. Inscription avec vérification du courriel, connexion, mot de passe oublié, nouveau mot de passe (les autres appareils sont déconnectés), déconnexion ici ou partout, suppression du compte. Courriels d'auth en français (`supabase/templates/`). | Oui : vrai GoTrue v2.180 en local, courriels lus dans Mailpit |
| **Textos** | API REST officielle de Twilio (`src/lib/send/sms.ts`). Entrants : `/api/webhooks/twilio/sms`, signature `X-Twilio-Signature` vérifiée. Statuts de livraison : `/api/webhooks/twilio/status`. | Logique et webhook : oui. **Vrai envoi Twilio : non (pas de clés).** |
| **Courriel** | API officielle de Resend (`src/lib/send/email.ts`), `List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058). En local : Mailpit. | Oui avec Mailpit. **Resend réel : non (pas de clé).** |
| **Notifs push** | Web Push (VAPID) : `public/sw.js`, `/api/push`, bouton dans Mon compte ; un abonnement expiré (404/410) est supprimé. | Code seulement. À tester sur un vrai téléphone. |
| **File d'envoi** | `outbox` avec `dedupe_key` unique. Messages réservés avec `for update skip locked`. Réessais après 1, 4, puis 16 min, ensuite `failed` avec l'erreur (journal des échecs). Push → repli texto → courriel. Préférences par catégorie et canal. Pas de texto non urgent entre 22 h et 8 h (heure de l'équipe). | Oui |
| **Tâche planifiée** | `POST /api/cron/tick` (Bearer `CRON_SECRET`) : rappels 48 h avant, tournée 24 h avant, livraison, ménage. À planifier avec `supabase/cron.sql` (pg_cron + pg_net, secret dans Vault). | Route : oui. pg_cron : à faire dans le projet Supabase. |
| **Paiements** | **Pas fait** : Stripe est au jalon 3 de l'architecture (frais d'équipe, aucun abonnement : tout est inclus). | — |

## Tests

- `npm test` : 8 tests de logique (fuseau horaire, textos, plafond, liste d'attente, droits, jeton de courriel, tâche planifiée), sur la couche de démo.
- `npm run test:db` : 11 tests contre la vraie base. **Attention : ils effacent les données de la base visée.**
  - un deuxième utilisateur ne voit RIEN, ni par l'appli ni en SQL direct, et n'écrit nulle part ;
  - liaison d'une fiche seulement après vérification du courriel ;
  - droits joueur / gérant ;
  - boucle complète texto ;
  - webhook rejoué sans double effet ;
  - relance limitée à une fois par 10 min ;
  - plafond, liste d'attente et promotion ;
  - lien de courriel ;
  - rappel une seule fois ;
  - STOP ;
  - suppression de compte ;
  - heures de silence ;
  - signature Twilio.
- Bout en bout (Playwright, pile locale complète), 11 étapes, 3 passages de suite :
  - inscription, puis courriel de confirmation en français, puis connexion ;
  - équipe, joueur, match ;
  - relance : courriel reçu dans Mailpit avec désabonnement en un clic ;
  - webhook texto « y » → TwiML « t'es IN » → affiché IN « par texto » ;
  - lien IN du courriel ;
  - désabonnement en POST ;
  - mot de passe oublié de bout en bout (l'ancien mot de passe est refusé) ;
  - un intrus connecté reçoit 404 sur l'équipe, le match et l'alignement ;
  - suppression de compte ;
  - déconnexion partout.

## Bogues trouvés par les tests et corrigés

1. **`service_role` n'a pas accès à `auth.users`** dans Supabase. C'est voulu de leur côté. Remplacé par deux fonctions étroites réservées au serveur (migration 0003).
2. **Récursion infinie dans les règles du chat** : `threads` ↔ `thread_participants`. Aucun écran ne l'avait déclenchée, le chat n'est pas encore bâti (migration 0004).
3. **`is_service_role()` plantait sur une connexion réutilisée.** Après un `set_config(..., true)`, Postgres laisse une chaîne vide, et `''::jsonb` plante. Ça cassait la confirmation de courriel et la suppression de compte (migration 0005).
4. **Risque de vol d'identité** : une fiche de joueur se reliait au compte qui avait le même courriel, même non vérifié. Maintenant, la liaison attend la vérification (migration 0002).
5. **Texto de départage illisible** : « Y 515 (mer 25 nov) ou Y 249 (mer 25 nov) ». Le nom de l'équipe ou l'heure s'ajoutent maintenant.
6. **Suppression de compte impossible** pour un gérant : `teams.created_by` était en `on delete restrict`. Passé à `set null` (migration 0002).

## À faire par toi (comptes et clés : je ne crée rien à ta place)

1. **Supabase** : créer le projet en région **Canada (ca-central-1)**. Puis :
   - `DATABASE_URL_DIRECT=… npm run db:migrate` ;
   - coller `supabase/templates/*.html` dans Authentication → Email Templates, avec les sujets français ;
   - Site URL = ton domaine, et Redirect URLs = `https://tondomaine/**` ;
   - activer pg_cron et pg_net, puis exécuter `supabase/cron.sql`.
   - **Sauvegardes : le plan gratuit n'en a pas.** Le plan Pro (25 $ US/mois) donne des sauvegardes quotidiennes ; à activer avant d'avoir de vrais joueurs.
   - SMTP personnalisé : le SMTP intégré de Supabase est limité à quelques courriels à l'heure. Mets les identifiants SMTP de Resend dans Authentication → SMTP.
2. **Twilio** :
   - compte, numéro canadien (514/438) et Messaging Service ;
   - URL du webhook entrant : `https://tondomaine/api/webhooks/twilio/sms` (POST), identique à `TWILIO_WEBHOOK_URL` ;
   - garder la gestion du STOP de Twilio activée.
   - Note : pour envoyer vers des numéros canadiens à volume, Twilio peut demander un enregistrement du numéro ou du service. Prévoir quelques jours.
3. **Resend** : vérifier un sous-domaine d'envoi (ex. `mail.buddyandbeer.ca`) avec SPF, DKIM et DMARC.
4. **Web Push** : `npx web-push generate-vapid-keys`.
5. Remplir `.env.local` (dev) et les variables de Vercel (prod) d'après `.env.example`.

## En local

```
npm run db:up                # Postgres + Auth + Mailpit (http://localhost:54324) + passerelle
npm run env:local > .env.local   # puis ajouter APP_URL, CRON_SECRET, UNSUBSCRIBE_SECRET, SESSION_SECRET
npm run db:migrate && npm run db:seed
npm run dev
```

## Liste de sécurité

- [x] Secrets seulement dans des variables d'environnement. `.env*` dans `.gitignore` (sauf `.env.example`, sans valeurs). La clé `service_role` et la connexion Postgres ne sont importées que dans du code marqué `server-only`. Seules les clés `NEXT_PUBLIC_*` (URL et clé publique) vont au navigateur.
- [x] Validation côté serveur (zod) sur chaque action et route : formulaires, `/api/push`. Les webhooks vérifient leur signature et leurs champs.
- [x] Droits vérifiés sur chaque lecture et écriture : RLS en base, plus une vérification explicite avant toute opération `service_role`. **Testé avec un deuxième utilisateur**, dans l'appli et en SQL direct.
- [x] Limites d'envoi :
  - auth : limites intégrées de Supabase ;
  - relance manuelle : une par 10 min par match ;
  - textos entrants : 30 par heure par numéro ;
  - envois : `dedupe_key` unique.
- [ ] **À ajouter avant l'ouverture** : une limite sur la création d'équipes et l'ajout de joueurs par compte, puisque chaque joueur ajouté peut recevoir des textos qui coûtent.
- [x] Webhooks vérifiés :
  - Twilio : signature HMAC-SHA1 ;
  - cron : Bearer secret ;
  - désabonnement : jeton HMAC ;
  - en production sans `TWILIO_AUTH_TOKEN`, le webhook répond 503.
- [ ] Téléversements : aucun pour l'instant. Au jalon 2 (chat) : 10 Mo maximum, images seulement, bucket Supabase Storage séparé.
- [x] Pas de données personnelles dans les URL ni les journaux :
  - les liens ne portent que des jetons opaques ;
  - les journaux de dev masquent numéros et courriels ;
  - les erreurs d'envoi ne gardent que le code du fournisseur ;
  - les GET ne changent jamais rien (lien de courriel, désabonnement).
- [x] Dépendances : `npm audit --omit=dev` → 0 vulnérabilité, après le passage à zod 4.
- [ ] **Politique de confidentialité à écrire**, en français, Loi 25. Responsable désigné. Sous-traitants :
  - Supabase : base de données et auth, Canada ;
  - Vercel : hébergement ;
  - Twilio : textos ;
  - Resend : courriels ;
  - Giphy ou Tenor : GIF, au jalon 2 ;
  - Sentry et PostHog, s'ils sont ajoutés.

## Écarts avec `architecture.md`

- **Pas de Drizzle** : le pilote `postgres` avec du SQL écrit à la main. Avec le RLS appliqué par `set local role`, un ORM n'apportait rien, et les requêtes restent lisibles et testées.
- **Next.js 16** : `proxy.ts` remplace `middleware.ts`.
- `create_team` prend le maximum de joueurs ; `set_attendance` marque la source « manager » quand le gérant répond pour un joueur, et empêche de sauter la file d'attente.
