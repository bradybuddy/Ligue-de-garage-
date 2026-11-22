# Architecture — Buddy & Beer

Plan technique tiré de `recon.md` et `features.csv`. Objectif : la **V1 en M** (section 10 de la recon) : équipe, horaire, IN/OUT, spares auto, liste d'attente, chat, tournée. Le schéma couvre aussi la base de la ligue et les frais pour ne pas avoir à tout recasser plus tard.

Schéma : `replica/schema.sql` (migration 0001, testée sur Postgres 16 — voir section 7).

---

## 1. Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Appli web | **Next.js 16 (App Router) + TypeScript** | Un seul code pour le web et les routes serveur (webhooks, ICS, tâches). |
| Mobile V1 | **PWA** (installable, Web Push) | iOS 16.4+ et Android reçoivent les push d'une PWA installée. On évite l'App Store au départ et les « plantages après mise à jour », la plainte n° 1 contre BenchApp. |
| Mobile V2 | **Expo (React Native)** | Quand la boucle est prouvée. Réutilise les types et l'API. |
| Style | **Tailwind**, jetons de `/replica-design` | Rapide, cohérent. |
| i18n | **next-intl**, `fr-CA` par défaut, `en-CA` en second | Français d'abord, c'est un différenciateur. Toutes les chaînes passent par des fichiers de messages dès le jour 1. |
| Base de données | **Postgres sur Supabase, région `ca-central-1` (Montréal)** | Données au Canada (Loi 25 du Québec). RLS, Realtime et Auth fournis. |
| Accès BD | **Pilote `postgres`** (SQL écrit à la main), RLS appliqué par `set local role authenticated` + `request.jwt.claims` ; client Supabase pour l'auth et le Realtime | Changé au backend (voir `backend.md`) : un ORM n'apportait rien avec le RLS en base. Les écritures critiques passent par des fonctions SQL (`set_attendance`, `pick_beer`...). |
| Authentification | **Supabase Auth** : courriel + mot de passe, lien magique | Mot de passe oublié inclus. Un joueur peut répondre **sans compte** (jeton courriel ou texto). |
| Textos | **Twilio**, numéro canadien (514/438) | Envoi + réception Y/N. Environ 0,01 $ par texto. STOP géré par Twilio. |
| Courriel | **Resend** (domaine vérifié SPF/DKIM/DMARC) | Simple, en-tête `List-Unsubscribe` en un clic. |
| Push | **Web Push (VAPID)** via `web-push` ; Expo Push en V2 | Gratuit. |
| Tâches planifiées | **pg_cron** (Supabase) qui appelle `POST /api/cron/tick` toutes les 2 minutes | Une seule horloge. La tâche est idempotente : elle relit l'état en BD à chaque passage. Fonctionne sur le forfait gratuit (le cron Vercel Hobby est limité à 1 fois par jour). |
| Fichiers | **Supabase Storage** | Logos, médias du chat. |
| Paiements (jalon 3) | **Stripe Checkout** | Frais de saison et de spare. Pas d'abonnement : zéro pub, tout inclus. |
| GIF | **API Giphy ou Tenor** (clé à nous) | Chat. |
| Hébergement | **Vercel** (région `yul1` ou `iad1`) | Déploiement automatique depuis GitHub. |
| Suivi | **Sentry** + PostHog | Attraper les plantages avant les avis 1 étoile. |

Une base de données, une appli Next.js. Pas de microservices.

---

## 2. Schéma

Le SQL complet est dans `schema.sql`. **26 tables, 1 vue, 14 fonctions.**

| Domaine | Tables |
|---|---|
| Utilisateurs | `profiles`, `push_subscriptions`, `notification_prefs` |
| Ligue | `leagues`, `league_admins`, `divisions`, `league_games`, vue `standings` |
| Équipe | `teams` (réglages S25 en colonnes), `seasons`, `members` |
| Horaire | `events` |
| Présences | `attendance` (liste d'attente incluse), `attendance_log`, `response_tokens`, `spare_invites` |
| Tournée | `beer_turns` |
| Communication | `threads`, `thread_participants`, `messages`, `message_reactions`, `broadcasts` |
| Envois | `outbox`, `inbound_sms`, `processed_webhooks` |
| Finances | `fees`, `payments` |

### Décisions de modélisation

- **Un membre n'est pas un utilisateur.** `members.user_id` peut être nul. Le gérant ajoute « Ray, 514-555-1234 » ; Ray répond Y par texto sans jamais créer de compte. Quand Ray s'inscrit avec le même courriel, `join_team()` relie sa fiche.
- **La liste d'attente vit dans `attendance`** (`status = 'waitlist'`, `waitlisted_at`, `waitlist_rank`). Une seule source de vérité : impossible d'être IN et en attente en même temps.
- **Les classes Vacances, Blessé et Suspendu** ne reçoivent ni rappel ni invitation. Spectateur et Staff ne comptent pas dans le maximum. C'est appliqué dans les requêtes des tâches, pas dans le schéma.
- **Les réglages d'équipe sont des colonnes** de `teams`, pas du JSON : ils ont des contraintes `check` et la BD refuse « max 0 joueur ».
- **Les réactions ont une ligne par personne** : on affiche tous les noms (bogue de BenchApp relevé dans les avis).
- **Les préférences d'avis par catégorie et par canal** (`notification_prefs`) : la réponse à la plainte « 67 courriels par semaine ». Par défaut, sans ligne = activé pour push, désactivé pour courriel sauf les rappels et les invitations.
- **Argent** : `amount_cents int` + `currency char(3)` (CAD).
- **Heures** : `timestamptz` en UTC partout. Le fuseau (`America/Toronto`, qui couvre le Québec) est sur l'équipe et le profil, pour l'affichage seulement.

### Contraintes dures (réglées en BD, pas dans l'interface)

| Problème | Solution |
|---|---|
| Deux joueurs touchent IN en même temps pour la dernière place | `set_attendance()` prend un verrou `select … for update` sur la ligne de l'événement, compte, puis écrit. Le 21e passe en liste d'attente. |
| Un joueur répond deux fois | `unique (event_id, member_id)` sur `attendance` + `on conflict do update`. |
| Le même spare invité deux fois | `unique (event_id, member_id, channel)` sur `spare_invites`. |
| Le même rappel envoyé deux fois | `outbox.dedupe_key unique` (ex. `reminder:<event>:<member>:sms`). |
| Deux personnes « de bière » | `beer_turns.event_id unique`. |
| Deux saisons actives | index unique partiel `where is_active`. |
| Import CSV/ICS relancé deux fois | `unique (team_id, external_uid)`. |
| Webhook Stripe ou Twilio reçu deux fois | `processed_webhooks (provider, event_id)` en clé primaire ; `inbound_sms.provider_sid unique`. |
| Un joueur se donne le rôle de gérant | trigger `members_guard` : seul un gérant change `role`, `class`, `skill_rank`. |

### Accès : RLS Postgres

**RLS activé sur toutes les tables.** Les fonctions d'aide `is_team_member()`, `is_team_manager()` et `is_league_admin()` sont en `security definer`.

- Un membre voit son équipe : horaire, alignement, présences, chat, tournée.
- Un gérant ou adjoint écrit l'horaire, l'alignement, les frais et les réglages.
- Un admin de ligue gère les divisions et les matchs de ligue, et a les droits de gérant sur les équipes de sa ligue.
- Les présences ne s'écrivent **que** par `set_attendance()` (qui vérifie : moi-même, un gérant, ou le serveur).
- `outbox`, `response_tokens`, `inbound_sms`, `processed_webhooks` : aucune policy, donc seulement la clé de service côté serveur.

---

## 3. API

Mutations en **Server Actions** Next.js (client Supabase de l'utilisateur, donc RLS appliqué). Routes HTTP seulement pour ce qui vient de l'extérieur : liens courriel, webhooks, ICS, cron.

### F01 — Le gérant met son équipe en marche

| Méthode / chemin | Fait quoi | Qui | Entrée | Sortie | Écrans |
|---|---|---|---|---|---|
| action `signUp` / `signIn` / `resetPassword` | Compte (Supabase Auth) | public | courriel, mdp | session | S02 |
| action `createTeam` | `create_team()` : équipe, gérant, fil, saison | connecté | nom, sport | team_id | S04 |
| action `joinTeam` | `join_team()` par code | connecté | code, nom | member_id | S03 |
| GET `/j/[code]` | Lien d'invitation : aperçu puis connexion | public | code | page | S03 |
| action `addMember` / `updateMember` / `removeMember` | Alignement | gérant | nom, courriel, tél., classe, position, n° | member | S11, S12 |
| action `importRoster` | CSV/Excel → aperçu → insertion | gérant | fichier (≤ 1 Mo, ≤ 200 lignes) | rapport d'erreurs | S13 |
| action `copyPreviousSeason` | Ramène l'alignement de la saison passée | gérant | season_id | n ajoutés | S13 |
| action `createEvent` / `updateEvent` / `cancelEvent` | Horaire | gérant | date, heure locale, aréna, adversaire, max | event | S06, S08 |
| action `importSchedule` | CSV/Excel ou URL iCal → aperçu → insertion | gérant | fichier ou URL | rapport | S09 |

### F02 — Le joueur répond IN/OUT (le cœur)

| Méthode / chemin | Fait quoi | Qui | Entrée | Sortie | Écrans |
|---|---|---|---|---|---|
| action `respond` | `set_attendance()` | membre ou gérant | event_id, member_id, in/out, note | statut final (`in`/`waitlist`/`out`) | S05, S07 |
| GET `/r/[token]` | Lien du courriel : page « Tu es IN pour jeudi 21 h » ; la réponse est enregistrée par un POST automatique en JS (les antivirus de courriel qui pré-ouvrent les liens n'exécutent pas le JS) | public avec jeton | jeton signé, `?s=in|out` | page de confirmation + bouton « changer » | — |
| POST `/r/[token]` | Enregistre la réponse | public avec jeton | in/out, note | 303 vers la confirmation | — |
| POST `/api/webhooks/twilio/sms` | Texto entrant : `Y`, `N`, `OUI`, `NON`, `IN`, `OUT`, avec ou sans code (« Y 482 ») | Twilio (signature `X-Twilio-Signature` vérifiée) | From, Body, MessageSid | TwiML : « ✅ T'es IN jeudi 21 h, Aréna X » | — |
| action `snoozeOrNote` | Ajoute une note | membre | texte ≤ 280 | — | S07 |
| GET `/api/ics/[calendar_token].ics` | Abonnement calendrier personnel | public avec jeton | — | `text/calendar` | S26 |

Logique du texto entrant : chercher les `response_tokens` non utilisés et non expirés du numéro. Un seul → on répond pour ce match. Plusieurs → si le message contient un code, on prend celui-là, sinon on répond « Tu as 2 matchs en attente : Y 482 (jeu.) ou Y 517 (dim.) ». Aucun → « Rien en attente. »

### F03, F04, F05 — Spares et liste d'attente

| Méthode / chemin | Fait quoi | Qui | Entrée | Sortie | Écrans |
|---|---|---|---|---|---|
| action `inviteSpares` | Invitation manuelle | gérant | event_id, member_ids[], canaux[], message | n envoyés | S14 |
| action `reorderWaitlist` | Change `waitlist_rank` | gérant | event_id, member_ids ordonnés | — | S15 |
| action `acceptFromWaitlist` | Force un joueur IN (dépasse le max si le gérant le veut) | gérant | event_id, member_id | — | S15 |
| (tâche) invitations auto | voir section Tâches | système | — | — | — |
| (SQL) `on_spot_freed()` | Mode `top` : 1er de la liste monte (réguliers avant spares). Mode `first_accept` : tout le monde est invité, le premier IN gagne (le verrou règle la course) | système | — | — | — |

### F06 — Tournée

| Méthode / chemin | Fait quoi | Qui | Entrée | Sortie | Écrans |
|---|---|---|---|---|---|
| (tâche) `pick_beer()` | Choisit le joueur IN qui a apporté le moins souvent cette saison ; départage alpha ou n° | système | event_id | member_id | S22 |
| action `setBeer` | Choix manuel / échange | gérant | event_id, member_id | — | S22 |
| action `countDrinks` | Compteur de consommations | gérant | event_id, n | — | S22 |
| action `beerOptOut` | Se retirer de la rotation | membre (soi) | bool | — | S26 |

### F10 — Communication

| Méthode / chemin | Fait quoi | Qui | Entrée | Sortie | Écrans |
|---|---|---|---|---|---|
| action `sendMessage` | Message, GIF ou image dans un fil | membre du fil | thread_id, texte/gif/fichier ≤ 10 Mo | message | S16, S17 |
| action `react` / `unreact` | Réaction | membre | message_id, emoji | — | S16 |
| action `openDirect` | Crée ou retrouve le fil 1 à 1 | membre | member_id | thread_id | S17 |
| Realtime `messages`, `message_reactions`, `attendance` | Mise à jour en direct | membre (RLS) | — | — | S07, S16 |
| action `broadcast` | Diffusion équipe ou ligue → `outbox` | gérant / admin ligue | canaux, audience, sujet, texte | n destinataires | S18, L09 |
| GET `/api/gif?q=` | Proxy de recherche GIF (cache la clé) | connecté | q | liste | S16 |

### Réglages et compte

| Méthode / chemin | Fait quoi | Qui | Écrans |
|---|---|---|---|
| action `updateTeamSettings` | max joueurs/gardiens, délais de rappel, invitations auto, mode liste d'attente, tournée, frais de spare | gérant | S25 |
| action `updateNotificationPrefs` | catégorie × canal | membre (soi) | S26 |
| action `subscribePush` / `unsubscribePush` | Abonnement Web Push | connecté | S26 |
| GET/POST `/u/[token]` | Désabonnement en 1 clic (lien et en-tête `List-Unsubscribe-Post`) | public avec jeton | — |
| action `leaveTeam` | `left_at = now()` | membre | S26 |
| action `deleteAccount` | Supprime le compte (voir section 4) | soi | S26 |

### F09 — Ligue (base, jalon 2)

| Méthode / chemin | Fait quoi | Qui | Écrans |
|---|---|---|---|
| action `createLeague`, `addDivision`, `attachTeam` | Ligue, divisions, équipes | admin ligue | L01, L02 |
| action `createLeagueGame` / `updateLeagueGame` | Match central → crée ou met à jour l'`event` des 2 équipes (unique `team_id, league_game_id`) | admin ligue | L03 |
| action `importLeagueSchedule` | CSV → matchs de ligue | admin ligue | L03 |
| action `finalizeScore` | Pointage final → `standings` | admin ligue, gérant d'une des 2 équipes | S23 (rapide), L05 |
| GET `/l/[slug]` | Site public (jalon 4) | public | L08 |

### F08 — Frais (jalon 3)

| Méthode / chemin | Fait quoi | Qui | Écrans |
|---|---|---|---|
| action `createFee` / `markPaid` / `waiveFee` | Frais par joueur | gérant | S20 |
| action `checkout` | Session Stripe Checkout | le joueur concerné | S21 |
| POST `/api/webhooks/stripe` | `checkout.session.completed`, `charge.refunded` → `payments`, `fees.status` | Stripe (signature vérifiée, idempotent) | — |

### Webhooks entrants

| Chemin | Source | Vérification | Idempotence |
|---|---|---|---|
| `/api/webhooks/twilio/sms` | Twilio, texto entrant | signature HMAC Twilio | `inbound_sms.provider_sid` |
| `/api/webhooks/twilio/status` | Twilio, statut de livraison | signature | met à jour `outbox` par `provider_message_id` |
| `/api/webhooks/resend` | Resend, rebonds et plaintes | signature Svix | `processed_webhooks` ; rebond dur → courriel désactivé pour ce membre |
| `/api/webhooks/stripe` | Stripe | `stripe-signature` | `processed_webhooks` |

Webhooks sortants : aucun en V1.

### Tâches planifiées

`pg_cron` appelle `POST /api/cron/tick` (en-tête secret) **toutes les 2 minutes**. Chaque étape choisit les lignes à traiter et les marque dans la même transaction (`… for update skip locked`), donc deux tick qui se chevauchent ne font pas deux fois le même travail.

| Étape | Choisit | Fait | Marqueur |
|---|---|---|---|
| 1. Rappels | événements `scheduled` où `starts_at - reminder_hours_before <= now()` et `reminder_sent_at is null` | crée une `outbox` par membre actif sans réponse (régulier/spare déjà invité), crée les `response_tokens` | `events.reminder_sent_at` |
| 2. 2e rappel | idem avec `second_reminder_hours_before` | seulement les sans-réponse | `second_reminder_sent_at` |
| 3. Spares auto | `auto_spares_enabled` et `starts_at - auto_spares_hours_before <= now()` et places libres et `spares_invited_at is null` | invite les spares actifs pas encore invités, sur les canaux choisis | `spares_invited_at` + `spare_invites` |
| 4. Tournée | `starts_at - 24 h <= now()` et `beer_assigned_at is null` | `pick_beer()` | `beer_assigned_at` |
| 5. Envoi | `outbox` `pending` et `send_after <= now()`, 200 par tick | respecte `notification_prefs`, heures de silence (pas de texto 22 h – 8 h sauf match dans < 12 h), envoie, 3 essais avec délai croissant | `outbox.status` |
| 6. Ménage (1 fois/jour) | jetons expirés, `outbox` envoyée > 90 jours, `inbound_sms` > 90 jours | supprime | — |
| 7. Synchro iCal (1 fois/h, jalon 3) | équipes avec une URL iCal | importe (dédoublonnage `external_uid`) | — |

Un événement déplacé (nouvelle heure) remet ses marqueurs à `null` s'ils n'ont pas encore servi, et envoie un avis « Match déplacé ».

**Seulement des API officielles et publiques avec nos propres clés** (Supabase, Twilio, Resend, Stripe, Giphy/Tenor). Aucune API privée de BenchApp.

---

## 4. Les parties qui mordent

- **Heure avancée** (bogue BenchApp cité dans les avis) : en BD, tout est en UTC. Le formulaire envoie l'heure locale + le fuseau de l'équipe ; on convertit avec `date-fns-tz`. Le fichier ICS émet les heures en **UTC avec `Z`** (`DTSTART:20261108T020000Z`), donc aucun calendrier ne peut se tromper de fuseau. Les rappels se calculent en heures sur des `timestamptz`, donc pas de décalage au changement d'heure. Test automatisé : match le 1er dimanche de novembre et le 2e dimanche de mars.
- **Idempotence** : `outbox.dedupe_key`, `processed_webhooks`, `inbound_sms.provider_sid`, marqueurs `*_sent_at`. Twilio et Stripe renvoient les webhooks ; on répond 200 si déjà traité.
- **Courses** : le dernier IN, la liste d'attente « premier qui accepte » et la tournée prennent un verrou sur la ligne `events`. Le tick prend ses lignes avec `skip locked`.
- **Antivirus de courriel** qui ouvrent les liens : un GET ne change jamais un statut. La page fait un POST en JS ; sans JS, un bouton.
- **Textos** : consentement explicite (`sms_opt_in`, LCAP/CASL), STOP/ARRÊT géré par Twilio et reflété dans `sms_opted_out_at` via le webhook. Numéro canadien. Limite d'envoi Twilio (~1 texto/s par numéro longue portée) : le tick étale les envois ; un 2e numéro (pool de messagerie) quand on dépassera environ 50 équipes. Plafond de coût par équipe et par mois.
- **Délivrabilité des courriels** : domaine dédié (`mail.…`), SPF/DKIM/DMARC, `List-Unsubscribe` + `List-Unsubscribe-Post`, rebonds durs désactivés automatiquement. Un seul courriel de rappel par match ; les messages du chat ne partent **jamais** par courriel par défaut.
- **Push** : les abonnements Web Push expirent (réponse 404/410 → on supprime). iOS exige que la PWA soit installée sur l'écran d'accueil : un écran d'aide pour ça, et le texto comme filet de sécurité.
- **Realtime** : seulement `attendance`, `messages` et `message_reactions`. RLS s'applique au Realtime de Supabase.
- **Hors ligne** : le chat garde un brouillon local ; IN/OUT exige le réseau (on affiche clairement « pas de connexion »). Pas de file hors ligne en V1.
- **Fichiers** : images du chat ≤ 10 Mo, redimensionnées côté client ; CSV d'import ≤ 1 Mo.
- **Recherche** : pas de moteur de recherche. `ilike` sur les noms suffit pour des équipes de 30 personnes.
- **Plusieurs équipes** : un utilisateur peut être dans 5 équipes (sa ligue du mardi et celle du dimanche). Tout est filtré par `team_id` ; le sélecteur d'équipe est dans l'entête.
- **Loi 25 et suppression** : données hébergées au Canada. `deleteAccount` supprime `auth.users` (cascade sur `profiles`, `push_subscriptions`), met `members.user_id` à nul et anonymise la fiche (`display_name = 'Ancien joueur'`, courriel et téléphone effacés) pour garder les stats et les frais de l'équipe cohérents. Exporter mes données : une action qui produit un JSON. Politique de confidentialité en français. Responsable de la protection des renseignements personnels désigné.
- **Langue** : tous les modèles de courriel et de texto existent en `fr-CA` et `en-CA` ; la langue vient du profil, sinon de l'équipe. Les textos restent sous 160 caractères GSM (attention aux accents : ils font passer en UCS-2, limite 70). On garde les accents et on accepte de payer 2 segments quand il le faut, ou on écrit court.

---

## 5. Ordre de construction

### Jalon 1 — Tranche verticale (≈ 1 semaine)

La boucle de bout en bout, sans fignoler : je crée une équipe, j'ajoute un joueur, je crée un match, le joueur reçoit un texto, répond Y, je le vois IN.

- Écrans : S02, S04, S05 (minimal), S06, S07, S08, S11, S12
- Tables : `profiles`, `teams`, `seasons`, `members`, `events`, `attendance`, `attendance_log`, `response_tokens`, `outbox`, `inbound_sms`
- Routes : `signUp`, `createTeam`, `addMember`, `createEvent`, `respond`, `/r/[token]`, `/api/webhooks/twilio/sms`, `/api/cron/tick` (étapes 1 et 5)
- Fini quand : la réponse Y par texto met le joueur IN en moins de 5 s, et la page S07 se met à jour sans recharger.

### Jalon 2 — Les must (≈ 3 semaines)

| Zone | Écrans | Tables | Routes |
|---|---|---|---|
| Compte | S01, S03, S26 | `push_subscriptions`, `notification_prefs` | `joinTeam`, `/j/[code]`, `subscribePush`, `updateNotificationPrefs`, `/u/[token]` |
| Alignement | S11, S12 (classes, rôles) | `members` | `updateMember` |
| Horaire | S08 (modifier/supprimer) | `events` | `updateEvent`, `cancelEvent`, `/api/ics/[token].ics` |
| Présences | S07 complet, S25 | `teams` (réglages) | rappels réglables, 2e rappel, relance manuelle, avis IN → OUT, max joueurs/gardiens |
| Spares | S14, S15 | `spare_invites` | `inviteSpares`, invitations auto (texto + push + courriel), liste d'attente modes `top` et `first_accept` |
| Tournée | S22 | `beer_turns` | `pick_beer`, `setBeer`, `beerOptOut` |
| Communication | S16, S18 | `threads`, `thread_participants`, `messages`, `message_reactions`, `broadcasts` | `sendMessage`, `react`, `broadcast`, `/api/gif` |
| Ligue de base | L01, L02, L09, L03 (saisie manuelle et CSV) | `leagues`, `league_admins`, `divisions`, `league_games` | `createLeague`, `attachTeam`, `createLeagueGame`, `broadcast` ligue |
| Différenciateurs | partout | — | `fr-CA` par défaut, aucune pub |

**Fin de la V1 (M).**

### Jalon 3 — Les should (≈ 3 semaines)

- Import alignement et horaire CSV/Excel, saison précédente (S09, S13).
- Synchro iCal de la ligue (étape 7 du tick).
- Note sur la présence, messages privés (S17), bulletins et sondages (S19 ; migration 0002 : `polls`, `poll_options`, `poll_votes`).
- Pointage rapide (S23 rapide), parties jouées auto, classement (L05, vue `standings`).
- Frais : S20, frais de spare, Stripe Checkout (S21), webhook Stripe.
- Saisons : démarrer et archiver.
- Ligue : officiels et arbitres (L04 ; migration 0003 : `game_officials`).

### Jalon 4 — Les could

Pointeur complet et stats joueurs/gardiens (S23, S24, L06 ; migration 0004 : `game_events`), générateur d'horaire équilibré (L03, le plus dur), site public (L08), inscriptions + bassin (L07), formation et trios (S10), Foncé/Pâle au hasard, classement pour équilibrer, check-in auto, payer pour jouer, dépenses, renonciation, covoiturage, tâches, médias, chambres, export de l'alignement, appli Expo.

### Jalon 5 — Les correctifs

Ce que `/replica-entrepreneur` trouvera dans les avis. Déjà prévus dans cette architecture : stabilité (PWA, Sentry), noms lisibles IN/OUT, réactions avec tous les noms, contrôle fin des courriels, calendrier sans bogue d'heure avancée, tout inclus sans pub.

---

## 6. Estimation de coût à 50 équipes (≈ 1 000 joueurs)

| Poste | Coût / mois |
|---|---|
| Supabase Pro | 25 $ US |
| Vercel Pro | 20 $ US |
| Twilio : ~4 textos/joueur/semaine × 1 000 | ≈ 170 $ US + numéro 1,15 $ |
| Resend | 0–20 $ US |
| Total | ≈ 235 $ US, soit ≈ 4,70 $ par équipe |

Le texto est le gros poste. Push d'abord, texto pour les sans-réponse (ou au choix de l'équipe) le divise environ par trois.

---

## 7. Vérification

`schema.sql` a été chargé dans un Postgres 16 local avec un faux schéma `auth` de Supabase, puis testé :

- max 2 joueurs, 5 réponses IN → 2 IN, 3 en liste d'attente ;
- le gérant passe OUT → la 1re régulière de la liste monte automatiquement (avant le spare inscrit plus tôt), avis au gérant et au joueur promu dans `outbox` ;
- `pick_beer()` choisit un joueur IN ;
- un joueur ne peut pas changer la présence d'un autre (bogue de NULL trouvé et corrigé pendant le test : un membre sans compte faisait sauter la vérification) ;
- RLS avec un rôle non-superutilisateur : un membre voit son équipe mais pas `outbox` ; un inconnu ne voit rien ; un joueur ne peut pas se nommer gérant.

Pas testé : la concurrence réelle (deux transactions en parallèle), le Realtime, les fonctions avec la vraie Auth Supabase.
