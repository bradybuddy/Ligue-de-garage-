# Page d'accueil publique

Bâtie dans `src/components/app/landing.tsx`, affichée à `/` pour un visiteur pas connecté. Un visiteur connecté sans équipe voit encore le choix du rôle (S01) ; s'il a une seule équipe ou une seule ligue, il y va directement.
Le nom et le slogan viennent de `src/lib/brand.ts` : un changement de nom ne touche pas cette page.

Test : `e2e/accueil-public.spec.ts`. Il vérifie axe WCAG 2.2 AA en mobile, bureau et sombre, l'absence de défilement horizontal, le bouton principal, et l'absence de fausse preuve ou du nom de l'original.
Captures : `replica/clone-screens/S00-accueil-public-*.png`.

## 1. Héros
- **Surtitre :** Pour les gérants de hockey de garage
- **Titre :** {APP_TAGLINE} Même le soir du match. → « Ton équipe au complet, à tout coup. Même le soir du match. »
- **Sous-titre :** « Qui est là jeudi? Fini les 40 textos pour le savoir. Rien à installer ni à mettre à jour : les gars répondent Y par texto, et les spares embarquent tout seuls. »
- **Bouton :** « Créer mon équipe gratuitement » → `/inscription?next=/equipes/nouvelle` ; à côté : « Gratuit, sans pub, sans carte de crédit. »
- **Image :** le vrai écran d'un match (S07) avec les données de démo, avec la mention « données de démo » (`public/landing/match.png`, 390×844 @2x).

## 2. Le problème (les deux thèmes les plus lourds de `fixes.md`, en paraphrase)
- *L'appli plante juste après une mise à jour* : thèmes 1 et 2 (64 + 54 avis).
- *L'essentiel est devenu payant* : thème 4 (34 avis).
Aucune citation d'avis, aucun nom de concurrent.

## 3. Comment ça marche
1. Crée ton équipe (joueurs avec leur cell, ou lien d'invitation)
2. Entre tes matchs (« t'es là? » au moment choisi)
3. Arrive à l'aréna (IN, OUT, spares, tournée)

## 4. Ce qu'on règle (chaque carte = un correctif)
| Carte | Correctif / preuve |
|---|---|
| Rien à installer ni à mettre à jour | fixes #1, thème 1 (64 avis) |
| Les gars répondent par texto | essentiel gratuit, fixes #4 |
| Les spares arrivent tout seuls | liste d'attente juste, manque 9 |
| Tu sais tout de suite qui lâche | fixes #4 (notif payante ailleurs) |
| Le bon match à la bonne heure | thème 7, heure avancée |
| Rien ne disparaît sans prévenir | fixes #2, thème 2 (54 avis) |

## 5. Prix
Les trois plans de `pricing.md`. Gérant Plus est marqué « bientôt » et n'a **pas** de bouton d'achat.

## 6. FAQ (les vraies objections)
1. C'est vraiment gratuit? → plan Ligue et Gérant Plus paient ; le gratuit ne rapetisse jamais.
2. Faut-il installer une appli? → non, texto Y/N.
3. **Importer d'une autre appli?** → **pas d'import pour l'instant** (S09 et S13 pas construits) ; le lien d'invitation en attendant.
4. Et si votre site plante? → tests et retour arrière.
5. Trop de courriels? → un rappel par match, grille de préférences, désabonnement en un clic.
6. Annuler? → un bouton, avis 7 jours avant le renouvellement annuel, retour au gratuit sans perte.
7. En français? → oui.

## 7. Appel final
« Ton équipe au complet jeudi prochain » + les trois portes d'entrée (équipe, joueur, ligue).

## Preuve sociale
**Volontairement vide.** Pas de témoignages, de compteur d'équipes, d'étoiles ni de logos. À ajouter seulement avec de vrais gérants de la bêta, et avec leur permission écrite.

## Promesses à tenir avant la mise en ligne
La page dit des choses qui doivent être vraies le jour du lancement :
| Promesse | État | Qui la rend vraie |
|---|---|---|
| « Chaque changement passe 50 tests automatiques avant d'être mis en ligne » | 55 tests e2e existent ; **pas encore branchés à la mise en ligne** | `/replica-deploy` (CI bloquante) |
| « Revenir à la version d'avant en une minute » | dépend de l'hébergeur | `/replica-deploy` (Vercel : *Instant Rollback*) |
| « Le support répond en moins de 24 h », en français | engagement d'exploitation | toi : adresse de support + alerte |
| « Un bouton pour annuler », « avis 7 jours avant » | facturation pas encore codée | `/replica-backend` (Stripe) |
| « Les spares s'ajoutent eux-mêmes avec le lien » | fait (`/j/CODE`) | — |

Contraste : les couleurs sont les jetons de la marque (rapport sans échec, 50 paires) et axe passe sur les trois vues.
