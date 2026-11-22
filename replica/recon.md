# Recon — BenchApp → Buddy & Beer

Cartographie de BenchApp faite le 2026-11-22 à partir de sources **publiques seulement** (site, centre d'aide, fiche et avis App Store). Aucun compte, aucun code source, aucune API privée.
On copie les **fonctions et les parcours**. On ne copie pas le nom, le logo, les couleurs, les textes ni les images.

## 1. Portée

| | |
|---|---|
| App étudiée | BenchApp (iOS, Android, web) |
| Tranche | Le cœur de l'appli : horaire → présences (IN/OUT) → spares et liste d'attente → messages → frais → bières. Plus la couche ligue : divisions, calendrier, pointage, classement, site public. |
| Pour qui | Buddy & Beer : ligues de buddy adultes au Québec. Français d'abord, sans pub, spares automatiques, ligue complète incluse. |
| Boucle centrale | Le gérant crée l'horaire → l'appli demande à chaque joueur s'il est IN ou OUT → s'il manque du monde, elle invite les spares → match → pointage, stats, bières. |

## 2. Sources

| # | Source | Ce que ça donne | URL |
|---|---|---|---|
| A | Page d'accueil | Positionnement, les 3 étapes | https://www.benchapp.com/ |
| B | Page hockey | Arguments hockey, FAQ gratuit vs PRO | https://www.benchapp.com/sport/hockey |
| C | Prix | Gratuit / PRO 9 $/mois par équipe / Ligue 10 $/équipe/mois, tableau des fonctions | https://www.benchapp.com/pricing |
| D | Gestion de ligue | Divisions, générateur d'horaire, arbitres, pointeur, classement, site public, inscriptions | https://www.benchapp.com/league-management |
| E | Centre d'aide, gérants (101 articles) | Inventaire des fonctions et des réglages | https://help.benchapp.com/en/collections/2709098-team-managers |
| F | Centre d'aide, joueurs (36 articles) | Côté joueur : compte, présences, calendrier, notifications | https://help.benchapp.com/en/collections/2709096-players |
| G | Invitations automatiques aux spares | Logique des spares, étape par étape | https://help.benchapp.com/en/articles/4770844-how-do-automatic-spare-invites-work |
| H | Liste d'attente automatique | 2 modes : haut de liste ou premier qui accepte | https://help.benchapp.com/en/articles/5155091-how-does-the-auto-waitlist-work |
| I | Classes de joueurs | Régulier, Spare, Spectateur, Staff, Vacances, Blessé, Suspendu | https://help.benchapp.com/en/articles/17044829-what-are-the-different-player-classes |
| J | Rotation des bières | Algorithme pour choisir qui apporte la bière | https://help.benchapp.com/en/articles/4770887-how-does-the-automatic-drink-system-work |
| K | Fiche App Store (US) | Description et avis | https://apps.apple.com/us/app/benchapp-sports-team-manager/id883504378 |
| L | Avis App Store CA et US (20 plus récents) | Plaintes actuelles | Fourni par Firecrawl apps-apple-com/reviews (id 883504378) |
| M | Babillard d'idées | Ce que les utilisateurs demandent | https://feedback.benchapp.com/ |

Pas fait : aucune capture d'écran sauvegardée dans `replica/screens/`, parce que je pouvais pas télécharger les images d'ici. Pour les mises en page, ouvre la fiche App Store (K) et la page Ligue (D) à côté.

## 3. Inventaire des écrans

Les écrans sont déduits des articles d'aide et des pages marketing. « États » = ce que les sources montrent ou rendent nécessaire.

| ID | Écran | Comment on y arrive | But | Composantes clés | États |
|---|---|---|---|---|---|
| S01 | Accueil / choix du rôle | Ouverture sans compte | Créer une équipe, rejoindre une équipe ou créer une ligue | 3 grosses cartes de choix | vide |
| S02 | Création de compte / connexion | S01 | Courriel + mot de passe, mot de passe oublié | formulaire, lien de réinitialisation | erreur « courriel déjà associé » (E) |
| S03 | Rejoindre une équipe | S01, lien d'invitation | Entrer le code ou ouvrir le lien | champ code, aperçu de l'équipe | code invalide |
| S04 | Créer une équipe | S01 | Nom, sport, division, saison | formulaire en étapes | — |
| S05 | Accueil de l'équipe / tableau de bord | Après la connexion | Prochain match, mon statut IN/OUT, bulletins | carte du prochain match, bouton IN/OUT, fil | aucun match, saison pas commencée |
| S06 | Horaire | Onglet | Liste des matchs, pratiques et événements | liste groupée par date, filtre, bouton ajouter | vide, passé/futur |
| S07 | Détail du match | S05, S06 | Lieu, heure, chambres, qui est IN/OUT/en attente/sans réponse | compteurs, listes par statut, note, covoiturage | complet, liste d'attente, annulé |
| S08 | Ajouter / modifier un match | S06 | Date, heure, aréna, adversaire, max de joueurs | formulaire, choix de date | — |
| S09 | Importer / synchroniser l'horaire | S06 | Fichier CSV/Excel ou lien iCal de la ligue | téléversement, aperçu avant d'ajouter | erreurs de format |
| S10 | Formation / trios | S07 | Placer les joueurs IN par position ou trio, équipes Foncé/Pâle au hasard | glisser-déposer, bouton « mélanger » | moins de joueurs que de positions |
| S11 | Alignement | Onglet | Joueurs par classe, parties jouées, stats | liste, filtre par classe | aucun joueur |
| S12 | Ajouter / modifier un joueur | S11 | Nom, contact, n°, position, classe | formulaire, choix de classe | courriel déjà utilisé |
| S13 | Importer l'alignement | S11 | CSV/Excel ou saison précédente | téléversement, sélection | — |
| S14 | Invitation manuelle de spares | S07 | Choisir des spares, message, canal (courriel/texto/notif) | liste à cocher, champ message | aucun spare |
| S15 | Liste d'attente | S07 | Ordre de la liste, accepter quelqu'un | liste ordonnée, bouton accepter | vide |
| S16 | Chat d'équipe | Onglet | Discussion de groupe, GIF, réactions | fil, champ texte, réactions | vide, hors ligne |
| S17 | Messages privés | S16 | Discussion 1 à 1, archiver | boîte de réception | vide |
| S18 | Diffusion | Menu gérant | Un message à toute l'équipe par courriel, texto ou notif | choix du canal, aperçu | — |
| S19 | Bulletins et sondages | Menu | Annonce épinglée, sondage avec votes | carte de sondage, résultats | aucun vote |
| S20 | Finances | Menu gérant | Frais par joueur, frais de spare, payé/en retard, dépenses | tableau, marquer payé, relance | retard |
| S21 | Paiement par carte (Stripe) | S20, S07 « payer pour jouer » | Le joueur paie avant de pouvoir se mettre IN | formulaire carte | refus, remboursement échoué |
| S22 | Rotation des bières | S07, Paramètres | Qui apporte la bière, compteur par joueur | nom désigné, compteurs | personne |
| S23 | Feuille de match / pointeur | S07 | Buts (2 passes max), punitions, tirs par période ; pointage rapide | grosse interface de pointage | match pas commencé |
| S24 | Stats | Onglet | Buts, passes, points, minutes de punition, stats de gardien | tableau triable | vide |
| S25 | Paramètres d'équipe | Menu gérant | Événements (max joueurs/gardiens), rappels, liste d'attente auto, invitations auto, bières, frais, saisons, renonciation | sections | — |
| S26 | Mon compte | Menu | Nom, courriel, notifications, check-in auto, quitter une équipe, supprimer le compte | réglages | — |
| S27 | Abonnement PRO | Menu | Payer pour débloquer | comparaison, achat | déjà PRO |
| L01 | Ligue : accueil | Compte admin de ligue | Matchs en cours, derniers résultats | tableau de bord | saison vide |
| L02 | Ligue : équipes et divisions | L01 | Équipes par division, alignements, frais, fiche | grille, déplacer un joueur | — |
| L03 | Ligue : générateur d'horaire | L01 | Dates + arénas → saison équilibrée | assistant, calendrier | conflits |
| L04 | Ligue : arbitres et officiels | L03 | Assigner arbitres, juges de lignes, pointeurs | listes d'assignation | non assigné |
| L05 | Ligue : classement | L01 | V-D-N-DP, points, BP/BC par division | tableau | — |
| L06 | Ligue : meneurs | L01 | Buts, passes, points, gardiens | palmarès | — |
| L07 | Ligue : inscriptions | L01 | Lien, renonciation, frais en ligne, bassin de joueurs | réglages, lien partageable | — |
| L08 | Site public de la ligue | URL publique | Résultats, classement, horaire, stats, sans connexion | pages web publiques | — |
| L09 | Diffusion à toute la ligue | L01 | Un message à toutes les équipes | choix du canal | — |

**Total : 27 écrans d'équipe + 9 écrans de ligue = 36.**

## 4. Parcours

```
F01 Le gérant met son équipe en marche (« 3 étapes » de A)
    S01 → S02 → S04 → S13 importer l'alignement → S09 importer l'horaire → S05
    cas limites : joueur qui a déjà un compte, courriel en double, horaire de la ligue qui change

F02 Le joueur répond IN/OUT  ← LE cœur de l'appli
    rappel (courriel / texto / notif) → S07 → IN ou OUT (+ note)
    Chemin court : répondre au texto par Y ou N, ou toucher la notif. ~1 clic.
    cas limites : changer d'idée IN → OUT (le gérant est averti), match complet → liste d'attente

F03 Manque de joueurs → spares invités automatiquement (PRO chez BenchApp)
    X jours avant le match, s'il reste de la place → courriel aux spares actifs → le spare se met IN → si c'est complet, il va sur la liste d'attente
    cas limites : déjà invité, déjà répondu, frais de spare, payer pour jouer

F04 Quelqu'un se désiste d'un match complet → liste d'attente automatique (PRO)
    OUT → mode A : le premier de la liste est mis IN (réguliers avant spares)
         mode B : toute la liste est invitée, le premier qui accepte a la place

F05 Le gérant invite des spares à la main
    S07 → S14 choisir → message → canal → envoyer

F06 Rotation des bières
    avant le match : choisir le joueur IN qui a apporté la bière le moins souvent → notif « t'es de bière »
    départage : ordre alphabétique ou n° de chandail ; on peut se retirer de la rotation

F07 Pointage du match
    S07 → S23 (complet) ou pointage rapide → stats S24 → classement L05 → site L08

F08 Frais
    S25 fixer les frais → S20 voir qui doit quoi → relance par courriel → payé par carte (S21) ou marqué payé à la main

F09 Le commissaire monte la saison
    L02 équipes (ou L07 inscriptions → bassin → équipes) → L03 générer l'horaire → L04 officiels → publier → chaque équipe le voit

F10 Communication
    S16 chat / S18 diffusion / S19 sondage / L09 diffusion à toute la ligue
```

**Nombre à battre :** une réponse IN/OUT en **1 clic** depuis le texto ou la notif (F02). Une invitation de spare : **0 clic** pour le gérant (F03).

## 5. Composantes

| Composante | Variantes / états | Écrans |
|---|---|---|
| Bouton IN / OUT | IN, OUT, pas de réponse, liste d'attente, désactivé (pas payé) | S05, S07 |
| Carte de match | à venir, en cours, final, annulé | S05, S06, L01 |
| Compteurs de présences | IN x/max, gardiens x/max | S07 |
| Liste de joueurs | par classe, par statut, triable | S07, S11, S15 |
| Pastille de classe | Régulier, Spare, Spectateur, Staff, Vacances, Blessé, Suspendu | S11, S12 |
| Sélecteur de date et d'heure | — | S08, L03 |
| Téléversement CSV/Excel | aperçu, erreurs | S09, S13 |
| Bulle de chat + réactions | texte, GIF, image | S16, S17 |
| Sélecteur de canal | courriel, texto, notif | S14, S18, L09 |
| Tableau de stats | trié, par saison | S24, L05, L06 |
| Pointeur | +but, +passe, +punition, +tir, période | S23 |
| Formulaire de carte (Stripe) | — | S21, L07 |
| Bannière d'abonnement | — | S27 (à éviter chez nous) |

## 6. Modèle de données déduit

```
Utilisateur  id, nom, courriel, téléphone, langue, préf. de notification
             preuve : F (compte, notifications) — confiance : élevée

Ligue        id, nom, logo, slogan, saison_active
             preuve : D — élevée
Division     id, ligue_id, nom — preuve : D, E (renommer une division) — élevée
Saison       id, équipe_id ou ligue_id, nom, début, fin, active — preuve : E (Saisons) — élevée

Équipe       id, nom, sport, division_id, code_invitation, PRO (oui/non)
             preuve : E (code d'équipe, renommer) — élevée
Membre       id, équipe_id, utilisateur_id, classe (régulier|spare|spectateur|staff|vacances|blessé|suspendu),
             rôle (gérant|adjoint|membre), n° de chandail, position, classement (pour équilibrer), hors rotation bière
             preuve : I, E (rôles, classements), J — élevée

Événement    id, équipe_id, type (match|pratique|autre), début, aréna, adversaire,
             max_joueurs, max_gardiens (réglage d'équipe), chambre_domicile, chambre_visiteur, statut
             preuve : G, E (assigner les chambres) — élevée
Présence     id, événement_id, membre_id, statut (IN|OUT|attente|sans_réponse), note, répondu_le, source (app|courriel|texto)
             preuve : F, H — élevée
EntréeListeAttente  événement_id, membre_id, position, ajouté_le — preuve : H — élevée
InvitationSpare     événement_id, membre_id, canal, envoyée_le, auto (oui/non) — preuve : G — élevée

Match (ligue)       id, ligue_id, domicile_id, visiteur_id, aréna, début, officiels[], statut — preuve : D — élevée
Événement de match  match_id, période, type (but|passe|punition|tir), joueur_id, minute — preuve : D (pointeur) — moyenne
Classement          calculé à partir des matchs finaux — preuve : D — élevée

Frais        id, équipe_id, membre_id, montant, type (saison|spare|inscription), statut (dû|payé|en retard), payé_le
             preuve : E (Paiements & finances) — élevée
Paiement     id, frais_id, fournisseur (Stripe), montant, remboursement — preuve : E — élevée
Dépense      id, équipe_id, montant, description — preuve : C (PRO) — moyenne

TourDeBière  événement_id, membre_id, mode (auto|manuel|compté), nb_consommations — preuve : J — élevée
Message      id, équipe_id, auteur_id, texte, média, réactions, privé_à — preuve : E (Communication) — élevée
Diffusion    id, équipe_id ou ligue_id, canaux[], corps, envoyée_le — preuve : E, D — élevée
Sondage      id, équipe_id, question, options[], votes[] — preuve : E — élevée
Renonciation id, équipe_id ou ligue_id, texte, signatures[] — preuve : F, D — élevée
Covoiturage  événement_id, conducteur_id, places, passagers[] — preuve : E — moyenne
Tâche        événement_id, type, membre_id, accepté — preuve : E (Duties) — moyenne
```

## 7. Ce que les utilisateurs critiquent (20 avis App Store les plus récents, CA + US, source L)

- **Plantages après les mises à jour** (le thème qui revient le plus) : l'appli ouvre pas, plante sur iPad, impossible de se connecter. Il y en a même en français : « Je ne peux plus ouvrir l'application avec la dernière mise à jour. »
- **Bogues dans le cœur de l'appli** : on peut pas lire les noms des gens qui sont IN/OUT, les stats sont plus modifiables, les réactions emoji montrent juste 1 ou 2 noms.
- **Notifications** : jamais reçues pour certains. À l'inverse, d'autres se font spammer de courriels impossibles à désactiver (« 67 courriels en une semaine »).
- **Synchro du calendrier** brisée au changement d'heure.
- **Tout est payant** : plainte de devoir payer « pour un emoji feu ». Il y a des pubs dans la version gratuite (PRO = « No Ads » d'après C), et un « BenchApp Plus » à 1,99 $/mois pour que le joueur enlève les pubs (F).
- **Ce qu'ils aiment** : la rotation des bières, les réponses Y/N par texto, plusieurs équipes de beer league au même endroit (K, D).

## 8. Matrice des fonctions

Dans `replica/features.csv`. Priorités pensées pour Buddy & Beer :
- **must** : la boucle centrale + les spares automatiques + la ligue de base.
- **should** : frais, stats, bières.
- **could** : le reste.

Chez BenchApp, les fonctions PRO sont notées « PRO ». Chez nous, elles sont incluses.

## 9. Ce qu'on peut pas (ou doit pas) copier

| Élément | Raison |
|---|---|
| Nom, logo, écusson, couleurs, textes, captures BenchApp | Leur propriété et leur marque. Apple refuse les copies (règle 4.1). |
| Leurs 60 000 équipes et leur réseau d'utilisateurs | Ça se copie pas, faut le bâtir. |
| Le nom « Drink duty » / « Chatter » | Termes de leur marque. On utilise nos propres mots (« Tournée », « La chambre »...). |
| Import des données d'un compte BenchApp | Seulement si le gérant exporte lui-même son alignement en CSV (fonction publique, E). Pas de grattage. |

## 10. Taille

- **36 écrans, 10 parcours, environ 20 entités.**
- **Les parties difficiles :**
  1. **Les envois automatiques** : rappels, invitations de spares, liste d'attente et bières. Ça prend des tâches planifiées fiables, des textos (Twilio, environ 0,01 $ par texto) et des notifications push.
  2. **La réponse par texto (Y/N)** : réception des textos entrants et lien vers le bon match.
  3. **Le générateur d'horaire de ligue** : équilibrer les matchs avec les heures de glace et les arénas.
  4. Les paiements Stripe, la synchro du calendrier (ICS) et le site public.
- **Taille : L (environ un trimestre)** pour l'équipe + la ligue. Pour une **V1 en M (quelques semaines)**, coupe à : équipe, horaire, IN/OUT, spares auto, liste d'attente, chat, bières. Sans le pointeur, le générateur d'horaire ni les paiements.

**Prochaine étape :** `/replica-architect`, pour choisir les technologies et faire le vrai schéma de base de données.
