# Ce que les utilisateurs de BenchApp disent — analyse

Collecte du 2026-11-22. Données brutes : `replica/reviews.csv` (253 lignes, texte copié tel quel). Classement : `scripts/review-themes.py`, puis un recomptage avec des motifs stricts et une lecture à la main.

## Échantillon (dit tel quel)

| Source | Lignes | Comment | Limites |
|---|---|---|---|
| App Store Canada | 82 | Flux RSS officiel d'Apple (`itunes.apple.com/ca/rss/customerreviews/...`), toutes les pages disponibles (2) | Apple ne donne pas d'adresse par avis : le lien pointe vers la page d'avis avec l'identifiant de l'avis en fragment (`#review-…`) |
| App Store États-Unis | 146 | Même flux, 3 pages | Idem |
| Tableau d'idées de BenchApp (Frill) | 19 | `feedback.benchapp.com`, page publique, avec les votes | Pour les idées longues, seule la 1re phrase est copiée (exacte). Dates relatives (*10 days ago*) gardées telles quelles. |
| Reddit | 6 | **Extraits seulement** : les passages mot pour mot que renvoie la recherche | Firecrawl ne lit pas Reddit. Un fournisseur tiers qui gratte Reddit était disponible ; je ne l'ai pas utilisé, la méthode exige l'API officielle. |
| Google Play, G2, Capterra, Trustpilot | 0 | **Pas collectés** | Pas de flux officiel accessible d'ici ; il faudrait les lire à la main dans un navigateur. |

**Total : 253 lignes, 3 sources** (App Store, tableau d'idées, Reddit). Les 228 avis App Store vont de 2014-08-31 à 2026-11-14, dont **91 depuis 2024** (54 avec 1 ou 2 étoiles). Notes App Store : 81 × 1★, 43 × 2★, 30 × 3★, 19 × 4★, 55 × 5★.

Le flux RSS d'Apple ne donne que les ~500 avis les plus récents par pays, et seulement ceux qui ont du texte. Ce n'est pas tout l'historique.

## Thèmes (App Store, motifs stricts)

*Bas* = 1 ou 2 étoiles. Un avis peut toucher plusieurs thèmes.

| Thème | Depuis 2024 : bas / total | 2014-2026 : bas / total | Autres sources | Force |
|---|---|---|---|---|
| **Plante, ne charge pas, ne s'ouvre pas** | **21 / 28** | **51 / 64** | Reddit (1), tableau (2 bogues) | Forte, 3 sources |
| **Cassé ou perdu après une mise à jour** | 13 / 20 | 26 / 40 | Reddit (*équipe disparue*) | Forte |
| **Chat bogué** (réactions, champ caché par le clavier, chat disparu) | 10 / 16 | 21 / 38 | Reddit (messages qui disparaissent), tableau (fils) | Forte, 3 sources |
| **Payant : fonctions passées en PRO** | 7 / 11 | 18 / 34 | Reddit (« We used benchapp but have switched over to one that our league made. ») | Moyenne, 2 sources |
| Lent, pas intuitif | 4 / 6 | 7 / 13 | — | Moyenne, 1 source |
| Support lent (3 à 5 jours, plus de réponse) | 4 / 4 | 6 / 13 | — | Moyenne, 1 source |
| Trop de mises à jour | 3 / 6 | 4 / 9 | — | Mince |
| Fonctions retirées sans prévenir (stats, *3 étoiles du match*, historique) | 3 / 6 | 8 / 14 | — | Moyenne, 1 source |
| Connexion, compte | 3 / 5 | 9 / 15 | — | Moyenne |
| Stats, pointage | 3 / 4 | 5 / 11 | tableau (pointage rapide sur Android) | Moyenne, 2 sources |
| **Trop de courriels, impossible de couper** | 3 / 3 | 3 / 3 | — | **Mince** (3 avis, 1 source) |
| Notifications pas reçues | 2 / 4 | 3 / 5 | Reddit (1) | Mince |
| Heure, fuseau, calendrier au changement d'heure | 2 / 3 | 4 / 5 | tableau (1), Reddit (1) | Mince, mais 3 sources et très récent (nov. 2026) |
| Publicités | 1 / 2 | 4 / 5 | — | Mince |
| *Health check* qu'on ne peut pas fermer | 1 / 1 | 3 / 3 | — | Mince |
| Spares et liste d'attente | 1 / 4 | 1 / 10 | tableau (49 votes : minimum avant d'inviter) | Plutôt des demandes que des plaintes |

**Correction de la recon :** la plainte des *67 courriels par semaine* est réelle mais isolée : **3 avis en tout**. Ce n'est pas une tendance. La mettre au cœur du positionnement serait exagéré.

**Tendance :** les 1 étoile remontent en 2026 (16, contre 9 en 2025 et 7 en 2024). En août et septembre 2026, une vague d'avis dit que l'appli ne s'ouvre plus après la mise à jour 4.0/4.1, surtout sur iPad. Au moins un utilisateur dit que c'est corrigé : « They have now fixed it. Quick response ».

## Demandes, dans les mots des utilisateurs

Du tableau d'idées (votes au 2026-11-22) :

| Votes | Demande | Lien |
|---|---|---|
| 214 | « Allow players to have more than one position. For example, a goalie could also play forward. » | [idée](https://feedback.benchapp.com/b/3v2rr8mn/feature-ideas/allow-multiple-positions-per-player) |
| 143 | « Allow player payment through no-fee software like Venmo, PayPal, or Zelle. » | [idée](https://feedback.benchapp.com/b/3v2rr8mn/feature-ideas/allow-player-payment-through-no-fee-software-like-venmo-paypal-or-zelle) |
| 113 | « Allow a player to choose between IN, OUT and MAYBE. » | [idée](https://feedback.benchapp.com/b/3v2rr8mn/feature-ideas/allow-players-to-set-their-status-as-maybe) |
| 87 | « Allow a team manager to customize the time that the RSVP emails and SMS are sent. » | [idée](https://feedback.benchapp.com/b/3v2rr8mn/feature-ideas/customize-the-time-that-rsvp-emailstexts-are-sent) |
| 71 | « Allow a player to invite a +1 to a game if they're bringing a friend or spare. » | [idée](https://feedback.benchapp.com/b/3v2rr8mn/feature-ideas/inviting-a-1-to-a-game) |
| 49 | « Allow the manager to set a minimum number of roster players before sending spare invites. » | [idée](https://feedback.benchapp.com/b/3v2rr8mn/feature-ideas/minimum-roster-count-before-spares-are-invited) |
| 45 | « Allow managers to send polls via text message. » | [idée](https://feedback.benchapp.com/b/3v2rr8mn/feature-ideas/text-message-polls) |

De l'App Store :
- « would love to be able to make a pickup game that randomizes players based on skill » ([5★, CA, 2025-02-12](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-12303115948)) ;
- « notify waitlist when a spot opens » ([3★, CA, 2026-04-10](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-13943442452)) ;
- « Wish there was a way to review payments collected in different ways.  Eg how much cash vs etransfer. » ([4★, CA, 2025-10-30](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-13333985478)) ;
- « Please allow field to scroll as text is added. Field is already half covered by phone’s keyboard » ([1★, CA, 2025-10-31](https://apps.apple.com/ca/app/id883504378?see-all=reviews#review-13338676943)).

## Avis négatifs non classés (lus à la main)

16 avis de 1 à 3 étoiles ne tombaient dans aucun thème. Une fois lus :
- **7 sont en fait des plantages ou des chargements ratés** (« Can’t get anything to load. », « ERROR 500: INTERNAL SERVER ERROR », « Nothing loads. Can’t see any of my teams. »). Le thème n° 1 est donc encore **plus gros** que le tableau ne le montre.
- 2 parlent du *Health check* imposé.
- Les autres :
  - un sport manquant (tennis) ;
  - l'interface des heures sur Mac ;
  - des bulletins qui ne se publient pas ;
  - un *utilise WhatsApp à la place* ;
  - 2 sans contenu exploitable.
