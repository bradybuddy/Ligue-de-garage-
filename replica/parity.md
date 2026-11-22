# Parité — Buddy & Beer vs BenchApp

> **Mise à jour après la ligue (même jour) :** parité **61,6 %**, must **24 faits, 1 partiel (chat : GIF pas testé), 0 manquant**. Il reste surtout des « should » : stats et pointage, frais, import CSV, messages privés, sondages, formation. Pas encore « prêt » selon la règle (80 % et plus) ; voir la section 2 pour la liste à jour avec `node scripts/parity.mjs`.
>
> **Mise à jour après le jalon 2 :** parité **51,9 %** (60,4 % sans la ligue), must **20 faits, 2 partiels, 3 manquants** sur 25. Les cinq chantiers de la section 5 sont faits ; le reste du rapport décrit l'état avant le jalon 2. Il reste les 3 must de la ligue, le chat partiel (GIF pas testé) et la création d'équipe partielle (division, saison). Toujours **pas prêt à lancer**.

Date : 2026-11-22 · Build : `dc0ca4c` · Sources de l'original : pages publiques seulement (recon A à M) et les captures de la fiche App Store (K), décrites région par région. Les images ne sont pas gardées dans le dépôt.

## Verdict : **pas prêt à lancer**

**9 fonctions « must » manquent et 6 sont partielles** (sur 25). Aucun bogue S1 ou S2 ouvert. Ce qui est bâti tient bien : 37 tests de bout en bout, 11 tests sur la base et 0 problème d'accessibilité. Mais il manque l'argument n° 1 (les spares automatiques), le chat, la tournée visible et la ligue.

| | Score |
|---|---|
| **Parité des fonctions** | **33,3 %** (43 points sur 129) |
| Parité, équipe seulement (sans la couche ligue) | 38,7 % |
| Fonctions « must » | 10 faites, 6 partielles, 9 manquantes, sur 25 |
| Mise en page (3 écrans comparables) | 74 en moyenne : proche |
| **Global** (fonctions 80 %, mise en page 20 %) | **41 %** |

Calcul : `node scripts/parity.mjs`.
- Poids : must 3, should 2, could 1 ; une fonction partielle compte pour la moitié.
- Exclus : les lignes `skip` (marque et réseau de BenchApp) et nos différenciateurs (français d'abord, zéro pub), puisque l'original ne les a pas. Ils ne gonflent pas le score.

## 1. Fonctions par zone (la plus faible d'abord)

| Zone | Parité | Commentaire |
|---|---|---|
| Match | 0 % | formation, trios, Foncé/Pâle : rien |
| Stats | 0 % | pointage rapide, stats, parties jouées : rien. Les colonnes de score existent en base. |
| Finances | 0 % | jalon 3 |
| Extras | 0 % | covoiturage, tâches |
| Ligue | 0 % | 3 must, 3 should, 3 could : rien d'écran |
| Communication | 11 % | seulement le désabonnement en un clic. Pas de chat, ni de diffusion. |
| Spares | 20 % | liste d'attente automatique (mode « haut de liste ») ; **pas d'invitation de spares, ni manuelle ni automatique** |
| Bière | 21 % | le choix automatique et l'avis existent ; aucun écran, impossible de se retirer |
| Équipe | 30 % | créer une équipe sans division ni saison ; pas de gestion des saisons |
| Horaire | 36 % | ajouter, modifier, supprimer et chambres : oui. **Calendrier ICS : non (must)**. Import et synchro : non. |
| Alignement | 50 % | classes et rôles : oui ; import, saison passée, export : non |
| Présences | 85 % | le cœur est là : appli, texto Y/N, courriel, relance, avis au gérant, plafonds. Manquent le réglage du délai et le champ de note. |
| Compte | 100 % | inscription vérifiée, mot de passe oublié, rejoindre par lien ou code |

## 2. Ce qui manque, dans l'ordre de construction

**Must (15)**
1. Invitations automatiques aux spares : texto, notif et courriel, et pas seulement le courriel comme BenchApp
2. Invitation manuelle de spares (S14)
3. Liste d'attente : écran S15 (réordonner, accepter) *(partiel)*
4. Liste d'attente auto : mode « premier qui accepte » + réglage *(partiel)*
5. Rotation des bières : écran S22 *(partiel)*
6. Se retirer de la rotation
7. Chat d'équipe + GIF + réactions (S16)
8. Diffusion courriel, texto ou notif (S18)
9. Abonnement calendrier (ICS) pour le joueur
10. Rappels : délai réglable (S25) *(partiel)*
11. Contrôle des courriels : écran des préférences *(partiel)*
12. Créer une équipe : division et saison *(partiel)*
13. Ligue : équipes par division
14. Ligue : horaire central
15. Ligue : diffusion à toute la ligue

**Should (17)**
- Alignement et horaire : import de l'alignement, retour des joueurs de la saison passée, import de l'horaire, synchro iCal de la ligue.
- Présences et spares : note sur la présence *(partiel)*, frais de spare.
- Match et communication : formation et trios, messages privés, bulletins et sondages.
- Stats et finances : pointage rapide, stats, parties jouées auto, suivi des frais.
- Équipe et ligue : saisons, générateur d'horaire de ligue, officiels, classement.

**Could (17)** : les fonctions « nice to have » de la matrice (export, classement des joueurs, check-in, payer pour jouer, Foncé/Pâle, compteur de bières, médias, pointeur complet, relances de paiement, Stripe, dépenses, renonciation, covoiturage, tâches, meneurs, site public, inscriptions).

## 3. Mise en page (structure, pas les couleurs)

Seuls 3 écrans de l'original sont publics et correspondent à des écrans bâtis. Les comparaisons sont faites à 390 px de large (captures du clone dans `replica/clone-screens/`).

| Écran | Score | Pareil | Différent (le plus gros d'abord) |
|---|---|---|---|
| **S05 Accueil d'équipe** | 75 : proche | Le bloc « prochain match » est l'élément dominant dans les deux, avec adversaire, lieu, date, heure, IN/OUT et comptes joueurs et gardiens. Puis les matchs suivants. Barre d'onglets en bas. | 1. Pas de compteurs bulletins, sondages et diffusions en haut (ces fonctions n'existent pas encore). 2. Pas de bandeau d'invitation (chez nous, le code est sur l'alignement). 3. L'en-tête n'a ni la fiche V-D-N ni la saison. 4. Pas de « tournée : X » dans la carte du match. |
| **S06 Horaire** | 80 : proche | Onglets « à venir / passés ». Groupes par mois. Cartes avec la date empilée à gauche, puis l'adversaire et le lieu au centre. | 1. Pas de sélecteur de saison en haut. 2. Par match, l'original montre IN, OUT et sans réponse en trois colonnes ; nous montrons MON statut et « IN x/max ». 3. Pas d'alerte « aucun gardien » ni de bouton « trouver un spare » sur la carte. 4. Pas de tournée sur la carte. 5. Nous avons un bouton « Ajouter » ; l'original non. |
| **S07 Détail du match** | 68 : partiel | Retour, titre et Modifier en haut. Date, heure, lieu. Chambres. IN/OUT pour moi. Comptes par statut. | 1. Pas de rangée d'onglets du match (formation, diffusion, spares, tâches). 2. Pas de bloc domicile / visiteurs. 3. **Ordre inversé, volontairement** : notre IN/OUT est en premier ; dans l'original, il vient sous le résumé et les chambres. 4. Pas de « ajouter une note », covoiturage ni tournée. 5. Notre page est plus longue : les listes par statut (IN, en attente, sans réponse, OUT, absents) sont en entier sur la page. |

Pas comparables pour l'instant (pas bâtis ou pas de capture publique) : chat, finances, pointeur, recherche de spares, alignement (S11), formulaires (S08, S12).

## 4. Comportement

| Parcours | BenchApp | Buddy & Beer | Décision |
|---|---|---|---|
| F02 réponse par texto | Y/N, **payant (PRO)** | Y/N/OUI/NON inclus. Si deux matchs attendent : code à 3 chiffres + nom de l'équipe ou heure. | **garder** (meilleur) |
| F02 réponse par courriel | lien dans le courriel | lien en 1 clic, sûr face aux antivirus qui pré-ouvrent les liens (testé) | garder |
| F02 nombre de gestes | ~1 depuis la notif ou le texto | 1 texto ; dans l'appli, IN/OUT est le premier élément de S05 et S07 (0 défilement) | garder |
| F02 hors ligne | inconnu ; les avis parlent de plantages | message clair, la page reste, on réessaie (BUG-004 corrigé) | garder |
| F03 spares auto | courriel seulement, PRO | **rien** | **à bâtir en premier** |
| F04 liste d'attente | 2 modes, PRO | mode « haut de liste », régulier avant spare, inclus | ajouter « premier qui accepte » |
| F06 tournée | écran, compteur, retrait | choix et avis en coulisse, aucun écran | bâtir S22 |
| Rejoindre | code d'équipe | code + lien ; l'invitation survit à la confirmation du courriel ; entre comme régulier | garder |
| Courriels | plainte « 67 courriels par semaine », désabonnement difficile | un courriel par match, désabonnement en un clic par type (RFC 8058), courriels du chat coupés par défaut | garder ; ajouter l'écran des préférences |
| Calendrier | ICS, bogue au changement d'heure (avis) | **pas d'ICS** ; heures en UTC, testées au changement d'heure | bâtir l'ICS (heures en UTC avec `Z`, comme prévu) |
| Pubs | pubs dans la version gratuite, abonnement pour les retirer | aucune | garder |
| Langue | anglais | français du Québec partout, 404 et erreurs compris | garder |
| Appli | natives iOS et Android | PWA (notif sur iPhone seulement une fois l'appli installée) | garder pour la V1 ; Expo plus tard |
| Courriels d'auth | inconnus | en français, avec vérification ; un compte non vérifié n'est jamais relié à une fiche | garder |

## 5. Les cinq prochaines choses à bâtir

1. **Spares : invitations automatiques et manuelles, plus la liste d'attente (S14, S15).** C'est l'argument n° 1 et le plus gros trou (3 must). La base a déjà `spare_invites`, le marqueur `spares_invited_at` et la file d'envoi. Il manque l'étape du tick, les écrans et le mode « premier qui accepte ».
2. **Calendrier ICS** (1 must, petit). Une route `/api/ics/[jeton].ics`, heures en UTC. Ça corrige directement une plainte contre BenchApp.
3. **Tournée visible (S22) + retrait de la rotation** (2 must, petit). La logique et l'avis existent ; il manque l'écran et un interrupteur.
4. **Chat d'équipe et diffusion (S16, S18)** (2 must, moyen). Les tables et les règles d'accès existent ; la récursion des règles est déjà corrigée. Il reste Realtime, les GIF et les réactions avec tous les noms.
5. **Réglages d'équipe (S25) + écran des préférences d'avis (S26)** (3 must partiels → faits). Délai des rappels, mode de liste d'attente, spares automatiques, catégories de courriels.

Après ces cinq-là : 22 must sur 25 seraient faits. Il ne resterait que les trois must de la **ligue**. C'est une décision de produit : est-ce que la V1 vise d'abord les équipes (le marché des buddy leagues), avec la ligue au jalon suivant ? La recon la classe « must ». Si elle reste dans la V1, c'est le chantier suivant.

Ce n'est qu'après ça que `/replica-entrepreneur` a du sens : la parité d'abord, puis les correctifs qui rendent Buddy & Beer meilleur que l'original.
