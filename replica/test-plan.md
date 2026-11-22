# Plan de test : Buddy & Beer

Build : `d6c3332` (départ `acaefea`, 7 bogues corrigés pendant la passe) · Date : 2026-11-22 · Env : local, pile Supabase (`npm run db:up`), données de démo + données créées par chaque test · Navigateur : Chromium 1243 (Playwright 1.63), 390 × 844 et 1440 × 900

On teste **notre clone**. Rien n'est envoyé vers BenchApp.

Colonne « auto » : `e2e` = spec Playwright dans `e2e/` ; `db` = `tests/pg.test.ts` ; `unit` = `tests/core.test.ts` ; `manuel` = à la main ; `—` = pas bâti.

## F01 — Le gérant met son équipe en marche

| cas | type | étapes | attendu | auto | résultat |
|---|---|---|---|---|---|
| F01-H1 | heureux | s'inscrire → lien du courriel → « Je gère une équipe » → nom → ajouter un joueur (cell.) → ajouter un match | connecté après le lien ; l'équipe, le joueur et le match existent ; l'accueil montre le prochain match | e2e | |
| F01-E1 | limite : texte long, accents, emoji | nom d'équipe et de joueur de 60 caractères avec accents et emoji | enregistrés tels quels, aucun débordement à 390 px, nom de joueur jamais coupé | e2e | |
| F01-E2 | limite : double clic | double clic sur « Créer l'équipe » | une seule équipe créée | e2e | |
| F01-E3 | limite : rechargement en cours | formulaire de joueur avec erreur → recharger | rien d'enregistré, formulaire vide | e2e | |
| F01-E4 | limite : clavier seulement | inscription au clavier (Tab, Entrée) | inscription envoyée | e2e | |
| F01-E5 | limite : heure avancée | match le dimanche du changement d'heure (8 mars 2027) et la semaine suivante, 21 h 15 | affiché 21 h 15 les deux fois | e2e + unit | |
| F01-E6 | limite : joueur qui a déjà un compte | ajouter un joueur avec le courriel d'un compte vérifié | sa fiche est reliée, il voit l'équipe | db | |
| F01-E7 | limite : compte non vérifié avec le même courriel | | pas relié avant la vérification | db | |
| F01-E8 | limite : rejoindre par code ou lien | ouvrir `/j/CODE`, se connecter | entre dans l'équipe comme spare | e2e | |
| F01-E9 | limite : joueur avec courriel seulement | nom + courriel, sans cellulaire | ajouté | e2e | réussi (après BUG-002) |
| F01-E10 | limite : invitation sans compte | `/j/CODE` → inscription → lien du courriel | revient à l'invitation, rejoint l'équipe | e2e | réussi (après BUG-007) |
| F01-N1 | négatif : doublon | même cellulaire deux fois | message « Ce numéro est déjà dans l'équipe (Nom) » | e2e | |
| F01-N2 | négatif : champs invalides | nom vide, cellulaire « 555 », courriel « abc » | un message par champ, rien d'enregistré | e2e | |
| F01-N3 | négatif : mauvais mot de passe | | « Courriel ou mot de passe incorrect. » | e2e | |
| F01-N4 | négatif : courriel pas confirmé | se connecter avant de cliquer le lien | message qui dit de confirmer | e2e | |
| F01-N5 | négatif : import CSV, synchro iCal | | | — S09, S13 pas bâtis | |

## F02 — Le joueur répond IN/OUT (le cœur)

| cas | type | étapes | attendu | auto | résultat |
|---|---|---|---|---|---|
| F02-H1 | heureux : appli | joueur ouvre le match → IN | « Parfait, on compte sur toi. », compteur +1, il est dans la liste IN | e2e | |
| F02-H2 | heureux : texto | gérant relance → texto reçu → « y » au webhook | réponse « t'es IN », IN « par texto » sur S07 | e2e | |
| F02-H3 | heureux : courriel | gérant relance → lien « Je suis là » | « C'est noté : t'es IN » | e2e | |
| F02-E1 | limite : change d'idée | IN puis OUT | le gérant reçoit un avis | e2e | |
| F02-E2 | limite : match complet | plafond atteint → IN | « En attente », message clair | e2e | |
| F02-E3 | limite : deux onglets, dernière place | deux joueurs touchent IN en même temps pour la dernière place | un IN, un en attente, jamais au-dessus du maximum | e2e | |
| F02-E4 | limite : session expirée | cookies effacés → IN | renvoi à la connexion, pas de plantage | e2e | |
| F02-E5 | limite : hors ligne | réseau coupé → IN | message d'erreur clair, le bouton revient, aucune page d'erreur | e2e | |
| F02-E6 | limite : match annulé | annuler → le joueur ouvre le match ; « y » par texto | pas de bouton IN/OUT, bannière « annulé » ; le texto dit « rien en attente » | e2e | |
| F02-E7 | limite : antivirus qui pré-ouvre le lien | GET du lien sans JS | aucun changement | e2e | |
| F02-E8 | limite : deux matchs en attente | « y » sans code | demande le code, libellés distincts | db + unit | |
| F02-E9 | limite : webhook rejoué | même MessageSid deux fois | une seule réponse enregistrée | db | |
| F02-E10 | limite : STOP | « STOP » | plus aucun texto à ce numéro | e2e + db | |
| F02-E11 | limite : clavier | flèches gauche/droite sur IN/OUT | le choix suit, le focus reste | e2e | |
| F02-N1 | négatif : répondre pour un autre | joueuse sur S07 | aucun bouton IN/OUT pour les autres ; refusé côté serveur | e2e + db | |
| F02-N2 | négatif : texto incompréhensible | « peut-être » | « Pas compris… » | unit | |
| F02-N3 | négatif : lien de courriel invalide | `/r/abc` | « Lien invalide » | e2e | |

## F03 — Spares invités automatiquement

| cas | type | étapes | attendu | auto | résultat |
|---|---|---|---|---|---|
| F03-* | | | | — pas bâti (jalon 2) | bloqué |

## F04 — Désistement d'un match complet → liste d'attente automatique

| cas | type | étapes | attendu | auto | résultat |
|---|---|---|---|---|---|
| F04-H1 | heureux : mode « haut de liste » | complet, un spare puis un régulier en attente → un IN passe OUT | le régulier monte, avis envoyé, le spare reste en attente | e2e + db | |
| F04-E1 | limite : re-clic IN en attente | | reste en attente, pas de saut dans la file | db | |
| F04-E2 | limite : mode « premier qui accepte » | | | — réglage S25 pas bâti | bloqué |

## F05 — Le gérant invite des spares à la main

| F05-* | | | | — S14 pas bâti | bloqué |
|---|---|---|---|---|---|

## F06 — Tournée

| cas | type | étapes | attendu | auto | résultat |
|---|---|---|---|---|---|
| F06-H1 | heureux : choix automatique 24 h avant | tick à H-24 | un joueur IN est choisi, avis « c'est ta tournée » | db | |
| F06-* | écran S22 | | | — pas bâti | bloqué |

## F07 à F10 — Pointage, frais, ligue, communication

| F07-* à F10-* | | | | — pas bâtis (jalons 2 à 4) | bloqué |
|---|---|---|---|---|---|

## Transversal

| cas | type | étapes | attendu | auto | résultat |
|---|---|---|---|---|---|
| X-S1 | sécurité : deuxième utilisateur | un intrus connecté ouvre l'équipe, le match, l'alignement | 404 partout | e2e + db | |
| X-S2 | sécurité : joueur sur des pages de gérant | ajouter un match, modifier un joueur | refusé avec un message | e2e | |
| X-S3 | sécurité : pas connecté | ouvrir une page d'équipe | renvoi à la connexion avec `next` | e2e | |
| X-S4 | sécurité : webhooks | tâche planifiée sans secret ; texto sans signature (jeton défini) | 401 ; 403 | e2e | |
| X-S5 | sécurité : redirection ouverte | `/connexion?next=//evil.com` | reste sur le site | e2e | |
| X-A1 | compte : mot de passe oublié | demande → courriel → nouveau mot de passe | l'ancien est refusé, le nouveau marche | e2e | |
| X-A2 | compte : déconnexion partout | | l'autre appareil est renvoyé à la connexion | e2e | |
| X-A3 | compte : suppression | | impossible de se reconnecter, fiche anonymisée | e2e + db | |
| X-A4 | compte : désabonnement | POST un clic sur le lien du courriel | 200, plus de courriels de ce type | e2e | |
| X-U1 | accessibilité | axe WCAG 2.2 AA sur chaque écran bâti, 390 et 1440 px | 0 violation | e2e | |
| X-U2 | mise en page | chaque écran bâti, 390 et 1440 px | aucun défilement horizontal | e2e | |
| X-U3 | erreurs | toutes les specs | aucune erreur de console imprévue, aucune réponse 5xx | e2e | |
| X-M1 | manuel : notifs push sur un vrai iPhone et Android | | notif reçue, ouvre le match | manuel | à faire (appareil) |
| X-M2 | manuel : vrai texto Twilio et vrai courriel Resend | | reçus, réponse Y traitée | manuel | à faire (clés) |
| X-M3 | manuel : lecteur d'écran (VoiceOver) sur S07 | | IN/OUT annoncés comme groupe radio, statut lu | manuel | à faire |

## Bilan

| | |
|---|---|
| Cas au plan | 63 |
| Exécutés automatiquement | 46 (37 e2e, 8 unit, 11 db ; certains cas sont couverts à deux niveaux) |
| Réussis | 46 |
| Échoués | 0 (7 avant correctifs, voir `bugs.md`) |
| Bloqués (pas bâtis) | F01-N5, F03, F04-E2, F05, F06 écran, F07 à F10 |
| Manuels à faire | X-M1 (push sur appareil), X-M2 (vrais Twilio et Resend), X-M3 (VoiceOver) |

Lancer : `npm run db:up && npm run build && npm run e2e` · `npm test` · `TEST_DATABASE_URL=… npm run test:db` (efface la base visée).
