# Plan de lancement

**Angle :** la fiabilité le soir du match, avec le français en deuxième argument (`fixes.md`).
**Ordre :** d'abord le web (PWA), qui est le cœur de l'angle « rien à installer » ; les magasins viennent ensuite.

## 0. Avant d'en parler à qui que ce soit
| | Quoi | Pourquoi |
|---|---|---|
| ☐ | **Choisir le nom** (Au Complet ou Buddy & Beer), puis réserver le domaine et les comptes Instagram, Facebook et TikTok | On ne relance pas une marque après l'avoir annoncée. `brand.md` |
| ☐ | Mise en ligne avec les **55 tests e2e qui bloquent le déploiement** et le retour arrière en un clic | La page d'accueil le promet. `/replica-deploy` |
| ☐ | **Sentry** (erreurs, navigateur et serveur) + alerte par texto si le cron des rappels ne roule pas pendant 10 minutes | Un rappel manqué le jeudi soir, c'est exactement la plainte qu'on règle |
| ☐ | Une page d'état publique (ex. `/etat` : dernier cron, file d'envoi) | Preuve visible de fiabilité, sans fausse preuve |
| ☐ | **Analytique respectueuse de la vie privée** (PostHog avec IP masquée, ou Plausible), avec 4 événements seulement : `equipe_creee`, `match_ajoute`, `premiere_reponse_texto`, `spare_embarque` | Mesurer si la boucle centrale tourne, pas espionner |
| ☐ | Numéro Twilio canadien + enregistrement A2P/10DLC ou numéro sans frais vérifié | Sans ça, les textos sont bloqués |
| ☐ | Politique de confidentialité (**Loi 25** : responsable de la protection des renseignements personnels nommé, incidents à déclarer) et conditions d'utilisation (avec l'engagement « le gratuit ne rapetisse pas ») | Obligatoire au Québec, et pour les magasins |
| ☐ | Adresse de support en français + engagement de réponse en moins de 24 h | Thème 5 : 13 avis sur un support lent |

## 1. Liste d'attente de la bêta (2 à 4 semaines avant)
- Formulaire sur la page d'accueil : nom de l'équipe, aréna, soir de match, nombre de joueurs, courriel du gérant. Une seule question ouverte : « Qu'est-ce qui te fait perdre le plus de temps avant un match? »
- But : **20 équipes de garage** en bêta fermée, sur 2 ou 3 arénas, pour que le bouche-à-oreille se fasse dans la chambre.
- Les gérants de la bêta : gratuit à vie pour leur équipe, et un canal direct (groupe de texto) avec nous.

## 2. Où sont les utilisateurs déçus
Ce sont des lieux de recherche : **on aide, on ne fait pas de pourriel.** On ne publie jamais le nom de l'original dans nos pubs.
| Où | Quoi | Comment s'y prendre |
|---|---|---|
| [r/hockeyplayers — « problems with … »](https://www.reddit.com/r/hockeyplayers/comments/1q7hz9q/does_anyone_else_have_problems_with_benchapp/) | Plantages au démarrage | Répondre seulement si on règle vraiment le problème, en disant qu'on est le fondateur |
| [r/hockeyplayers — « now charging … »](https://www.reddit.com/r/hockeyplayers/comments/5qgxb1/benchapp_now_charging_for_previously_free_services/) | Fonctions devenues payantes | Fil ancien : lire, ne pas répondre |
| [r/hockeyplayers — notifications perdues](https://www.reddit.com/r/hockeyplayers/comments/nze0sz/anyone_having_issues_with_benchapp/) | Chat et notifs | idem |
| r/Benchapp ([équipe disparue](https://www.reddit.com/r/Benchapp/comments/1r0mjbc/my_team_completely_disappeared/), [horaire en UTC](https://www.reddit.com/r/Benchapp/comments/1rz13t3/existing_team_skate_schedule_seems_to_now_happen/)) | Sous-forum de leurs utilisateurs | **Ne pas s'y annoncer** : c'est leur espace. Lire pour la recherche seulement |
| Groupes Facebook de hockey de garage et de « spares » au Québec (Montréal, Québec, Rive-Sud, Laval…) | Les gérants y cherchent des spares chaque semaine | Lire les règles du groupe, demander à l'admin avant de publier |
| Arénas et ligues récréatives (babillard, comptoir, commissaires) | Les ligues adultes | Une affiche avec un code QR, et un dîner avec le commissaire |

## 3. Le message de lancement
**Titre (Product Hunt, Hacker News « Show HN », Reddit r/SideProject) :** mener avec le correctif, pas avec la comparaison.
> Show HN : une appli de présences pour le hockey de garage qui marche même le jeudi soir. Les joueurs répondent Y par texto, sans appli à mettre à jour.

Corps (3 paragraphes) :
1. Le problème vécu : 40 textos pour savoir qui vient, et des applis qui plantent après une mise à jour. Paraphrase, sans citer d'avis.
2. Ce qu'on a fait de différent : une PWA, le texto Y/N, des spares automatiques avec une liste d'attente juste, des heures en UTC dans le calendrier, 55 tests e2e et le retour arrière.
3. Le prix : l'essentiel gratuit, la ligue payante par équipe. Demander de la critique, pas des votes.

- Product Hunt : un mardi ou un mercredi, en anglais (préparer une version anglaise de la page avant).
- Au Québec, ça compte plus : un article ou une entrevue dans un média local de sport amateur, et un balado de hockey de garage.

## 4. Les 10 premiers utilisateurs, un par un
Les trouver soi-même, les installer avec eux, et être présent au premier match.
1. Ton équipe à toi (le premier client, c'est toi)
2. 2 équipes adverses de ta ligue (elles voient l'appli marcher au même aréna)
3. Le **commissaire** de ta ligue → plan Ligue en bêta, pour toute la ligue
4. 2 gérants qui ont publié une demande de spare dans un groupe Facebook cette semaine
5. 1 organisateur de **pickup / drop-in** du dimanche (créneau de l'option C : vérifier si Foncé/Pâle compte)
6. 1 équipe féminine ou mixte (vérifier que les textes ne disent pas que « les gars »)
7. 1 équipe anglophone de Montréal (tester l'intérêt pour une version anglaise)
8. 1 gérant qui a quitté une autre appli pour un groupe de texto (le vrai concurrent)
9. 1 gérant d'une autre ville (Québec, Sherbrooke) pour sortir de ton cercle

Pour chacun : 20 minutes au téléphone avant, présence au premier match, et une question une semaine plus tard : « Qu'est-ce qui t'aurait fait revenir aux textos? »

**Mesure du succès après 4 semaines :** au moins 70 % des réponses IN/OUT arrivent sans que le gérant relance, 0 rappel manqué, et 3 équipes qui en recommandent une autre.

## 5. Magasins d'applis (après la PWA)
**Attention, règle 4.2 d'Apple (fonctionnalité minimale) :** un simple site enveloppé dans une appli est souvent refusé. L'appli native (Capacitor, par exemple) doit apporter quelque chose : notifs APNs natives, réponse IN/OUT depuis la notif, widget « prochain match ». Voir `/replica-deploy`, builds mobiles.
**Règle 4.1 (copies) :** nos correctifs et notre marque doivent se voir dans la **première capture** et les **premières lignes** de la description. C'est fait dans `listing.json`.

- **Fiche :** `listing.json`, vérifiée par `node scripts/check-listing.mjs` (limites, emoji, prétentions, nom de l'original, mots-clés gaspillés).
- **Captures** (tailles exigées : à revérifier dans App Store Connect et Play Console au moment du téléversement, elles changent). Prévoir iPhone 6,9 po, iPad 13 po si l'iPad est pris en charge, et téléphone Android. Ordre :
  1. « Les gars répondent Y par texto » : le texto de rappel + la réponse
  2. « Les spares embarquent tout seuls » : S07 avec un spare IN et la liste d'attente
  3. « Tu sais qui lâche » : la notif de désistement
  4. « L'essentiel n'est jamais payant » : la liste du plan Équipe
  5. La tournée de bières
  6. La ligue : classement
  Les captures sont prises sur les données de démo (`npm run db:seed`), jamais sur de vraies personnes.
- **Étiquettes de confidentialité (Apple) / sécurité des données (Google)**, d'après le schéma :
  | Donnée | Pourquoi | Liée à l'identité | Pistage |
  |---|---|---|---|
  | Nom | afficher dans l'alignement | oui | non |
  | Courriel | compte, rappels | oui | non |
  | Numéro de téléphone | texto Y/N | oui | non |
  | Contenu (messages du chat) | fonction de l'appli | oui | non |
  | Diagnostics (Sentry) | plantages | non | non |
  | Utilisation (4 événements) | analytique | non (si IP masquée) | non |
  Aucune pub, aucune donnée vendue ni partagée pour du pistage. Suppression du compte dans l'appli : **faite** (X-A3), un critère d'Apple.
- **Âge :** questionnaire avec la référence à l'alcool (tournée) ; voir `listing.json`.
- **Notes pour l'examinateur :** compte de démo `examen@<domaine>` avec une équipe déjà remplie, un match dans 2 jours et des réponses. Expliquer que le texto Y/N part d'un numéro Twilio, et que la réponse dans l'appli fait le même effet. Créer ce compte dans la base de production, **pas** avec les mots de passe de démo locaux.
