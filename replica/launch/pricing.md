# Prix

Principe tiré de `fixes.md` #4 : **l'essentiel n'est jamais payant.** Ce qu'on fait payer, ce sont des outils de plus pour le gérant ou la ligue, jamais la réponse IN/OUT, le texto Y/N, les spares, la notif de désistement ou les réactions.

## 1. Ce que font les autres (lu le 2026-11-22)

Les prix changent : relire chaque page avant de publier une comparaison.

| Appli | Gratuit | Payant | Ce qui est payant | Source |
|---|---|---|---|---|
| **L'original** | Oui, **avec pubs** | PRO **9 $/mois par équipe** ; Ligue **10 $/équipe/mois** (mensuel ou annuel) | Retirer les pubs, réponse par texto, rappels et diffusions par texto, rappels le jour du match, liste d'attente automatique, sondages, synchro auto de l'horaire, frais de spare, pointeur en direct | [benchapp.com/pricing](https://www.benchapp.com/pricing), lu le 2026-11-22 (devise non précisée sur la page ; probablement USD) |
| SportEasy | Oui jusqu'à 30 membres, **avec pubs** | Premium **9,99 €/mois** ou **69 €/an** par équipe | Retirer les pubs, stats, bilan d'assiduité | [Fiche App Store FR](https://apps.apple.com/FR/app/id599931266) ; montant annuel confirmé par l'éditeur dans une réponse à un avis ; lu le 2026-11-22 |
| Spond | Oui, **tout** | Rien à l'abonnement | Frais sur les paiements faits dans l'appli (montant selon le pays), collectes de fonds, partenariats de marques dans l'appli | [help.spond.com — gratuit](https://help.spond.com/en/articles/25998-spond-is-free-to-download-and-use), [frais de paiement](https://help.spond.com/app/en/articles/118091-payments-costs-in-the-spond-app), lu le 2026-11-22 |
| TeamSnap | Oui (version de base) | Premium et Ultra par équipe, essai Premium 21 jours | **Prix actuels pas confirmés** : leur page de prix ne les affiche pas pour une équipe seule, et les chiffres des sites tiers datent de 2024 | [teamsnap.com/pricing](https://www.teamsnap.com/pricing), lu le 2026-11-22 |

À retenir :
- L'original fait payer **le texto Y/N et la liste d'attente automatique**, soit exactement ce qui remplit l'équipe le soir du match. Nous les mettons dans le plan gratuit.
- Spond montre qu'un plan de base **entièrement gratuit** est viable si on gagne de l'argent ailleurs. Nous ne prenons pas de frais sur les paiements : voir `fixes.md` #8, Interac et comptant sans frais.

## 2. Ce que disent les avis sur le prix (`feedback.md`)

| Plainte | Avis 1-2★ / tous | Sources |
|---|---|---|
| Des fonctions de base passent en PRO (notif le jour du match, réactions, texto) | 18 / 34 | App Store CA et US, Reddit |
| Pubs dans la version gratuite | inclus dans le thème ci-dessus | App Store |

Aucun avis du corpus ne se plaint d'un renouvellement surprise ou d'une difficulté à annuler. On corrige quand même ces points d'avance (section 5) : ça ne coûte presque rien et ça évite une plainte classique.

Paraphrase des avis : des gérants trouvent injuste de payer environ 9 $ par mois juste pour qu'une notif parte le jour du match, et ils ne comprennent pas qu'une réaction en emoji soit devenue payante. Les citations exactes sont dans `fixes.md` (recherche, **pas** des témoignages).

## 3. Le modèle

- **Gratuit pour une équipe, pour vrai** : pas d'essai qui expire, pas de pub, pas de limite de joueurs.
- **Prix à plat par équipe**, jamais par joueur : ajouter un spare ne change jamais la facture.
- **Mensuel ou annuel** ; l'annuel donne **2 mois gratuits**.
- **En dollars canadiens**, taxes en sus (TPS/TVQ, voir section 6).
- **Rien n'est vendu avant d'exister** : tant qu'un outil du plan Plus n'est pas livré, on ne le facture pas. Au lancement, il n'y a que deux plans actifs : Équipe (gratuit) et Ligue.

## 4. Les trois plans

| | **Équipe** — pour les gars qui jouent | **Gérant Plus** — pour le gérant qui fait tout | **Ligue** — pour le commissaire |
|---|---|---|---|
| Prix | **0 $** | **5 $/mois** ou **50 $/an** par équipe | **6 $/équipe/mois** ou **60 $/équipe/an** |
| Réponse IN/OUT (appli, courriel, **texto Y/N**) | ✓ | ✓ | ✓ |
| Rappels automatiques (délai réglable) | ✓ | ✓ | ✓ |
| **Spares automatiques + liste d'attente juste** | ✓ | ✓ | ✓ |
| Notif au gérant quand un joueur se désiste | ✓ | ✓ | ✓ |
| Chat, réactions avec tous les noms | ✓ | ✓ | ✓ |
| Tournée de bières, calendrier sans erreur d'heure | ✓ | ✓ | ✓ |
| Diffusion (notif et courriel) | ✓ | ✓ | ✓ |
| Diffusion par texto | 2 par mois *(limite pas encore dans le code)* | jusqu'à 5 par jour | ✓ (et à toute la ligue) |
| Zéro pub | ✓ | ✓ | ✓ |
| Équipes Foncé/Pâle équilibrées *(à venir)* | — | ✓ | ✓ |
| Suivi des frais Interac / comptant *(à venir)* | — | ✓ | ✓ |
| Pointeur et stats *(à venir)* | — | ✓ | ✓ |
| Divisions, horaire central, classement, diffusion à la ligue | — | — | ✓ |
| Gérant Plus pour chaque équipe de la ligue | — | — | ✓ inclus |

Comparaison : l'original vend PRO 9 $ et Ligue 10 $ par équipe et par mois ; nous : 5 $ et 6 $, avec le texto Y/N, les spares et la liste d'attente gratuits.

### Le texto, notre seul vrai coût variable

Le texto Y/N est gratuit, mais chaque texto nous coûte (Twilio, Canada : à relire sur leur page de prix avant le lancement, de l'ordre d'un sou par message, plus le numéro). Calcul : une équipe de 20 joueurs, 4 matchs par mois, environ 3 textos par joueur et par match, ça donne environ 240 textos par mois.
- **Usage raisonnable : 500 textos par équipe et par mois**, tous plans. Au-delà, on avertit le gérant ; on ne coupe **jamais** un rappel le soir du match.
- La notif push (gratuite pour nous) passe en premier ; le texto sert aux joueurs sans l'appli. C'est déjà le comportement du code (`PUSH_FALLBACK`).
- Suivre le coût réel par équipe dès la bêta ; ajuster le seuil avec des chiffres, pas au jugé.

## 5. Facturation sans mauvaise surprise (à bâtir avant d'activer Stripe)

| Engagement | Comment |
|---|---|
| Annuler en un clic | Bouton « Annuler mon plan » dans Compte, qui mène au Stripe Customer Portal. Pas de courriel à envoyer, pas d'appel. |
| Pas de renouvellement surprise | Courriel 7 jours avant chaque renouvellement **annuel** (montant, date, lien d'annulation). Webhook Stripe `invoice.upcoming`. |
| Pas de saut de prix | Prix à plat par équipe. La facture d'une ligue change seulement quand le commissaire ajoute une équipe, et l'écran le dit avant. |
| Rien ne disparaît | Si on arrête de payer, l'équipe retourne au plan gratuit : on garde les données et l'historique, rien n'est effacé. |
| Le gratuit ne rapetisse pas | Une fonction du plan Équipe ne devient **jamais** payante. Écrit dans les conditions d'utilisation. |
| Remboursement simple | Annulé dans les 14 jours après un paiement annuel : remboursé au complet, sans question. |

## 6. Stripe : ce que tu crées (mode test d'abord)

| Produit | Prix | `lookup_key` | Facturation |
|---|---|---|---|
| Gérant Plus | 5,00 CAD / mois | `plus_monthly` | par équipe, quantité 1 |
| Gérant Plus | 50,00 CAD / an | `plus_yearly` | par équipe, quantité 1 |
| Ligue | 6,00 CAD / équipe / mois | `league_monthly` | quantité = nombre d'équipes |
| Ligue | 60,00 CAD / équipe / an | `league_yearly` | quantité = nombre d'équipes |

- Prix **hors taxes** ; activer **Stripe Tax** pour la TPS et la TVQ. L'inscription aux taxes devient obligatoire au-delà de 30 000 $ de revenus sur quatre trimestres (petit fournisseur) : à valider avec un comptable.
- Activer le **Customer Portal** : annulation, changement de carte, factures.
- Webhooks à écouter : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.upcoming`, `invoice.payment_failed`.
- **Gérant Plus reste désactivé** dans Stripe jusqu'à ce que ses outils soient livrés.
- Le code de facturation n'existe pas encore ; c'est le travail de `/replica-backend` (paiements) avant de passer en production.
