# Journal de construction — Buddy & Beer

Construction propre : tout le code et tous les textes sont écrits ici, à partir de `recon.md`, `architecture.md` et `design/`. Rien n'est repris de BenchApp (ni HTML, ni CSS, ni images, ni libellés).

**Couche de données : de démo (en mémoire).** `src/lib/data/fake.ts` reprend les signatures prévues et les règles du schéma SQL : droits (miroir des RLS), `set_attendance`, `on_spot_freed`. Le point de bascule vers Supabase est `src/lib/data/index.ts`. La session est un cookie signé de démo (`src/lib/auth.ts`). Les données repartent de zéro à chaque redémarrage du serveur.

Comptes de démo : `marc@exemple.ca` (gérant) et `sophie@exemple.ca` (joueuse), mot de passe `buddy123`. Simulateur de textos et de tâche planifiée : `/dev`.

## Jalon 1 — Tranche verticale (2026-11-22)

**Boucle vérifiée de bout en bout dans un vrai navigateur** (`scratchpad/shot/slice.cjs`) :
1. inscription ;
2. création de l'équipe ;
3. ajout d'un joueur avec cellulaire (un doublon de numéro est refusé avec un message clair) ;
4. création du match, affiché à 21 h 15 ;
5. relance ;
6. texto « y » au simulateur → confirmation par texto ;
7. le joueur est IN sur S07, « par texto » ;
8. IN puis OUT au clavier seulement.

Aucune erreur de console. Le lien du courriel est vérifié aussi : une pré-ouverture sans JS (antivirus) ne change rien ; un vrai clic met le joueur IN.

**Tests unitaires** (`npm test`, 8/8) :
- heure avancée : avant et après le changement d'heure, aller-retour UTC ;
- lecture des textos (Y, OUI!, N 482, STOP) ;
- boucle rappel → Y → IN → N → avis au gérant ;
- deux matchs en attente, avec désambiguïsation par code ;
- plafond séparé joueurs et gardiens ; un régulier passe avant un spare sur la liste d'attente ;
- droits ;
- lien de courriel (GET sans effet) ;
- tâche planifiée idempotente.

**Captures** : `replica/clone-screens/*-mobile.png` (390 px) et `*-bureau.png` (1 440 px). axe-core (WCAG 2.2 AA) : 0 violation sur tous les écrans bâtis. Aucun débordement horizontal.

| Écran | Date | État | Ce qui manque | Plus dur que prévu |
|---|---|---|---|---|
| Coquille | 2026-11-22 | fait | — | 53 routes ; barre du bas (mobile) et barre latérale (≥ 1024 px) ; lien « Aller au contenu » |
| S01 Accueil / rôle | 2026-11-22 | fait | La carte « ligue » mène à une page d'attente | — |
| S02 Connexion / inscription | 2026-11-22 | partiel | Mot de passe oublié ; vraie auth (Supabase) | — |
| S04 Créer une équipe | 2026-11-22 | partiel | Division, saison | — |
| S05 Accueil d'équipe | 2026-11-22 | fait | Bulletins (jalon 3) | — |
| S06 Horaire | 2026-11-22 | fait | Import et iCal (S09) | — |
| S07 Détail du match | 2026-11-22 | fait | Covoiturage, champ de note, temps réel (rafraîchit toutes les 5 s en attendant Supabase Realtime) | **Le focus clavier se perdait** pendant l'envoi IN/OUT : un bouton désactivé lâche le focus. Corrigé avec `aria-disabled` et un focus qui suit le choix. |
| S08 Ajouter / modifier un match | 2026-11-22 | fait | — | Conversion heure locale → UTC sans librairie (Intl, 2 passes pour l'heure avancée) |
| S11 Alignement | 2026-11-22 | fait | — | **Noms longs** : ils étaient coupés à 2 lignes, exactement la plainte contre l'original. Maintenant jamais coupés. La note du joueur est séparée des infos secondaires. |
| S12 Ajouter / modifier un joueur | 2026-11-22 | fait | — | Consentement aux textos (loi anti-pourriel) ajouté au formulaire |
| Lien courriel `/r/[jeton]` | 2026-11-22 | fait | Envoi réel (Resend) | Le GET n'écrit jamais ; envoi auto en JS |
| Webhook texto | 2026-11-22 | fait | Vrai numéro Twilio | Signature Twilio vérifiée ; même MessageSid = même réponse, rien rejoué |
| Tâche planifiée `/api/cron/tick` | 2026-11-22 | fait | Branchement pg_cron | — |
| S03, S09, S10, S13–S26, L01–L09 | — | page d'attente | Tout | Chaque page dit ce qu'elle fera et à quel jalon |
| S27 Abonnement PRO | — | volontairement absent | — | Tout est inclus, sans pub |

**Écrans bâtis : 9 sur 36** (S01, S02, S04, S05, S06, S07, S08, S11, S12). Le code d'invitation est affiché sur S11, mais l'écran pour le saisir (S03) reste à faire. Les 26 autres ont leur route et une page d'attente.

**Fonctions « must » : 7 faites et 8 partielles sur 27.**

## Choses à savoir

- **La couche de démo vit en mémoire** : un seul processus. C'est parfait pour développer et faire des démos, impossible pour la production. `/replica-backend` la remplace.
- **Avis au gérant, rappels et promotions** : ils sont bien écrits dans la file d'envoi (visible dans `/dev`), mais rien ne part vraiment tant que Twilio, Resend et Web Push ne sont pas branchés.
- **Les spares automatiques (le « argument #1 »)** ne sont pas dans ce jalon. Ce sont la prochaine priorité du jalon 2, avec S14 et S15.

## Backend (2026-11-22)

La couche de démo est remplacée par Postgres/Supabase quand `DATABASE_URL` est défini. Détails, tests et liste de sécurité dans `replica/backend.md`. Écrans ajoutés :
- mot de passe oublié et nouveau mot de passe ;
- confirmation de courriel (`/auth/confirm`) ;
- désabonnement ;
- S26 Mon compte, partiel : notifs de l'appareil, sessions, suppression.

## Passe de test (2026-11-22)

Plan dans `test-plan.md`, specs dans `e2e/`, bogues dans `bugs.md`. 7 bogues reproduits et corrigés (2 S2, 4 S3, 1 S4), chacun avec son test. S03 (rejoindre par lien ou code) est maintenant bâti : c'était BUG-003.

## Jalon 2 (2026-11-22)

**Décision : la couche de démo en mémoire est retirée.** Chaque fonction devait être écrite deux fois, et la pile Supabase locale tourne avec Docker. Une seule couche de données maintenant ; l'appli exige Supabase, local ou en ligne.

| Écran | Date | État | Ce qui manque | Plus dur que prévu |
|---|---|---|---|---|
| S14 Inviter des spares | 2026-11-22 | fait | — | **Bogue trouvé en route :** le pilote Postgres convertit les clés **à l'intérieur** du JSON en camelCase (`event_id` → `eventId`). Tous les avis mis en file par SQL (gérant, promotion, tournée) partaient avec « Du nouveau dans ton équipe. » Corrigé ; le texte réellement envoyé est maintenant gardé dans la file. |
| Invitations automatiques | 2026-11-22 | fait | — | Il faut créer un jeton de réponse pour les avis rédigés en SQL, sinon un spare sans compte qui répond « Y » tombe sur « rien en attente ». |
| S15 Liste d'attente | 2026-11-22 | fait | — | L'ordre manuel du gérant doit passer avant la règle « réguliers d'abord » (migration 0007). |
| Calendrier ICS | 2026-11-22 | fait | — | Lignes coupées à 75 **octets** (les accents comptent double). Un antislash perdu laissait les `;` non échappés : attrapé par le test. |
| S22 La tournée | 2026-11-22 | fait | Compteur de consommations (could) | — |
| S16 La chambre | 2026-11-22 | partiel | GIF : code prêt, clé GIPHY requise, **pas testé**. Temps réel : rafraîchissement aux 4 s (Supabase Realtime pas dans la pile locale). Pas de compteur de non-lus. | **Bogue trouvé :** un message du chat retombait sur le **courriel** quand le coéquipier n'avait pas les notifs (la plainte des « 67 courriels »). Le repli est maintenant réservé aux avis importants. |
| S18 Message à l'équipe | 2026-11-22 | fait | — | Compteur de segments de texto (les accents → 70 caractères par segment) ; 5 diffusions par jour au maximum (coût des textos). |
| S25 Réglages | 2026-11-22 | fait | Frais de spare, 2e rappel | — |
| S26 Préférences d'avis | 2026-11-22 | fait | — | Avertissement si on coupe tous les rappels. |

Tests : 49 de bout en bout (2 passages de suite), 17 sur la base, 3 de logique. axe : 0 violation sur les 24 écrans bâtis, à 390 et 1440 px.

**Écrans bâtis : 19 sur 36.** Parité : **51,9 %** (33,3 % avant). Must : **20 faits, 2 partiels, 3 manquants** (les 3 de la ligue).
