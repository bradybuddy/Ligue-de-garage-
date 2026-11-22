# Correctifs et positionnement — Buddy & Beer

À partir de `feedback.md` (253 lignes, 3 sources). Chaque élément donne : le problème, le nombre d'avis, le nombre de sources, et des citations exactes avec leur lien.

## 1. Ce qu'ils détestent

1. **L'appli plante ou ne s'ouvre plus**, souvent juste après une mise à jour : 64 avis App Store (51 à 1-2★), plus 7 non classés qui en sont aussi ; 3 sources.
   - « Last 48 hrs app won’t load. Gets to splash screen with app name and then just dies. » ([1★, CA, 2026-10-26](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-14714236864))
   - « Je ne peux plus ouvrir l’application avec la dernière mise à jour. » ([1★, CA, 2026-09-11](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-14536670394))
   - « The app crashes on startup which forces me to open a new tab on Chrome » ([Reddit, extrait](https://www.reddit.com/r/hockeyplayers/comments/1q7hz9q/does_anyone_else_have_problems_with_benchapp/))
2. **Une mise à jour casse ou retire quelque chose** (horaire, stats, fonctions) : 40 + 14 avis ; 2 sources.
   - « All the stats that were posted in each game are now gone. » ([2★, CA, 2023-11-16](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-10593100083))
   - « My Team completely disappeared. » ([Reddit, extrait](https://www.reddit.com/r/Benchapp/comments/1r0mjbc/my_team_completely_disappeared/))
3. **Le chat est bogué** : réactions qui n'affichent qu'un ou deux noms, champ caché par le clavier, messages qui disparaissent. 38 avis ; 3 sources.
   - « does not show more than 1 or 2 names of emoji reactions » ([1★, US, 2026-10-16](https://apps.apple.com/us/app/id883504378?see-all=reviews#review-14673638685))
   - « Please allow field to scroll as text is added. Field is already half covered by phone’s keyboard » ([1★, CA, 2025-10-31](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-13338676943))
4. **Des fonctions de base passent en payant (PRO)** : 34 avis ; 2 sources. → voir `/replica-launch`.
   - « why does it need to cost $9/month just to get a push notification to my phone on a game day? » ([2★, US, 2026-04-02](https://apps.apple.com/us/app/id883504378?see-all=reviews#review-13914672876))
   - « now you want me to pay to use the fire emoji??? » ([1★, US, 2026-09-12](https://apps.apple.com/us/app/id883504378?see-all=reviews#review-14541562190))
5. **Support lent** : 13 avis ; 1 source.
   - « No live chat and 3-5 days for an email response. » ([2★, CA, 2024-09-28](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-11775924102))
6. *(mince)* **Trop de courriels, impossible de couper** : 3 avis ; 1 source.
   - « I’ve got 67 emails from their app just in 1 week. Their support said they can’t do anything about it. » ([1★, CA, 2026-06-04](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-14142873540))
7. *(mince, mais 3 sources et récent)* **Heures fausses après le changement d'heure** : 3 éléments.
   - « Is anyone else having calendar sync issues after daylight savings time ended? » ([2★, US, 2026-11-07](https://apps.apple.com/us/app/id883504378?see-all=reviews#review-14762111274))
   - « Players who exported to Google calendar or iCal were an hour early » ([tableau d'idées](https://feedback.benchapp.com/b/3v2rr8mn/feature-ideas/daylight-savings-time-change))

## 2. Ce qui manque (demandé par nom)

1. **Plusieurs positions par joueur** (ex. gardien qui joue aussi à l'avant) : 214 votes, 1 source.
2. **Paiement sans frais** (Venmo, PayPal ; ici : Interac, comptant) : 143 votes + 1 avis App Store (« cash vs etransfer ») ; 2 sources.
3. **Statut *Peut-être*** : 113 votes, 1 source.
4. **Choisir l'heure d'envoi des rappels** : 87 votes, 1 source. **Déjà fait chez nous** (délai réglable, S25).
5. **Inviter un +1** : 71 votes, 1 source.
6. **Nombre minimum de réguliers avant d'inviter des spares** : 49 votes, 1 source.
7. **Sondages par texto** : 45 votes, 1 source.
8. **Équipes équilibrées pour le pickup / scrimmage** (Foncé/Pâle selon le calibre) : 1 avis App Store + 2 idées ; 2 sources.
   - « would love to be able to make a pickup game that randomizes players based on skill » ([5★, CA](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-12303115948))
9. **Liste d'attente juste** (avisée quand une place se libère, premier arrivé premier servi) : 1 avis détaillé. **Déjà fait chez nous** : deux modes, et les spares ne doublent pas la file.

## 3. Ce qui n'est pas résolu (des besoins entiers)

1. **Les organisateurs de pickup, de drop-in et de scrimmage.** L'appli est pensée pour une équipe fixe avec des trios et des positions. Eux veulent : faire deux équipes égales chaque semaine, des stats de victoires pour le drop-in, et pas de positions imposées. 7 mentions, 2 sources.
   - « I can't use the current Teams function since it requires Lines and Positions. » ([tableau d'idées](https://feedback.benchapp.com/b/3v2rr8mn/feature-ideas/scrimage-users-just-set-teams-not-lines-or-positions))
2. **Les gérants qui veulent que ça marche, point.** Les 5★ disent « when it works ». Le besoin non comblé, c'est la fiabilité le soir du match, pas une fonction de plus.
3. *(mince)* **Les joueurs francophones.** 2 avis en français au Canada, tous deux sur des plantages. Aucun avis ne réclame le français : **c'est notre choix stratégique, pas une preuve tirée des avis.**

## 4. Plan de correctifs (preuve × coût)

| # | Quoi | Taille | Skill | Preuve |
|---|---|---|---|---|
| 1 | **Fiabilité visible.** Surveillance des erreurs (Sentry), retour arrière en un clic (Vercel), tests de bout en bout avant chaque mise en ligne (50 déjà), page d'état. La PWA évite la *mise à jour à installer qui casse tout* de l'App Store. | M | `/replica-deploy` | Thème 1 : 64+ avis, 3 sources |
| 2 | **Rien ne disparaît sans prévenir.** Page *Quoi de neuf* dans l'appli ; une fonction retirée est annoncée 30 jours avant ; pas de mise à jour forcée. | S | `/replica-build` | Thème 2 : 54 avis |
| 3 | **Chat solide sur mobile.** Le champ grandit avec le texte et reste au-dessus du clavier, testé sur un vrai iPhone et un vrai Android. Réactions avec tous les noms : **déjà fait**. | S | `/replica-test` (sur appareil) | Thème 3 : 38 avis, 3 sources |
| 4 | **L'essentiel n'est jamais payant** : texto Y/N, spares automatiques, notif quand un joueur se désiste, réactions. Ce qu'on fait payer reste à décider. | S | `/replica-launch` | Thème 4 : 34 avis, 2 sources |
| 5 | **Équipes Foncé/Pâle équilibrées** à partir des joueurs IN et du calibre (caché aux joueurs), sans trios ni positions. | M | `/replica-build` | Manque 8 + non résolu 1 : 2 sources |
| 6 | **Minimum de réguliers avant d'inviter des spares** (réglage S25). | S | `/replica-build` | 49 votes |
| 7 | **Statut *Peut-être*** : ne compte pas dans le maximum ; relance automatique 24 h avant. | M | `/replica-build` | 113 votes (1 source : à confirmer) |
| 8 | **Frais payés en Interac ou comptant**, suivis sans frais de transaction. | M | `/replica-build` (jalon 3, frais) | 143 votes + 1 avis, 2 sources |
| + | **Support en français, réponse en moins de 24 h.** C'est un engagement d'exploitation, pas du code. | S | `/replica-launch` | Thème 5 : 13 avis |

Déjà faits, grâce à la recon et aux tests :
- courriels contrôlables par type ;
- calendrier juste au changement d'heure ;
- délai des rappels réglable ;
- liste d'attente juste ;
- réactions avec tous les noms ;
- zéro pub.

Les nouvelles lignes sont dans `features.csv`, avec `original = no` : elles ne gonflent pas le score de parité.

## 5. L'angle

**Option A — La fiabilité (recommandée)**
> Pour les gérants de ligue de garage tannés que l'appli plante le jeudi soir juste après une mise à jour, Buddy & Beer ouvre à tout coup : rien à installer ni à mettre à jour, et les gars répondent Y par texto même sans l'appli.
> Preuve : *plante, ne s'ouvre plus* et *cassé après une mise à jour*, 64 + 40 avis, 3 sources.

**Option B — Tout inclus**
> Pour ceux qui trouvent ridicule de payer pour une notif le soir du match, Buddy & Beer inclut les textos, les spares automatiques et la liste d'attente, sans pub.
> Preuve : *payant / PRO*, 34 avis, 2 sources.

**Option C — Les organisateurs de pickup**
> Pour ceux qui font encore leurs équipes du dimanche dans Excel, Buddy & Beer fait deux équipes égales avec ceux qui ont dit IN.
> Preuve : 7 mentions, 2 sources. C'est un créneau plus étroit.

**Recommandation : A, avec le français comme deuxième argument.** C'est le thème le plus lourd et le plus récent : la vague de plantages de septembre et octobre 2026. Et c'est ce que notre architecture règle structurellement (PWA, tests, retour arrière). B est vrai aussi, mais c'est une promesse de prix que n'importe quel concurrent peut copier ; il vaut mieux le garder pour la page de prix. Le français n'est pas soutenu par les avis : c'est un argument de proximité, à présenter comme tel.

Règles pour la suite :
- pas le nom de BenchApp dans notre nom, nos pubs ou notre fiche App Store ;
- les citations ci-dessus sont de la recherche, pas des témoignages ;
- une page de comparaison factuelle, c'est une question pour un avocat au Québec.
