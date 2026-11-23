# Marque

Angle retenu (`fixes.md`) : **la fiabilité le soir du match**, avec le français du Québec en deuxième argument. Public : ligues de garage adultes au Québec.

## 1. Le nom

### 20 candidats

| Style | Candidats |
|---|---|
| Descriptif | Au Complet, Feuille de match, Ligue de garage, Présent, Jeudi Soir |
| Composé | Glace Prête, Chambre 5, Allez Go, Toujours Là |
| Inventé | Rondello, Glaço |
| Métaphore | Rondelle, Vestiaire, La Tournée, Calibre |
| Verbe | Embarque, Dispo, Patine, Lineup |
| Nom actuel | Buddy & Beer |

### Écartés, avec la raison

| Nom | Raison | Vérifié |
|---|---|---|
| Dispo | Une appli photo connue porte déjà ce nom (« Dispo: Retro Disposable Camera ») | App Store, 2026-11-22 |
| Présent, Lineup, Calibre | Déjà pris par plusieurs applis (« Present - Guided Meditation », « Lineup11 », « Calibre Companion ») | App Store, 2026-11-22 |
| La Tournée | « La Tournée des Producteurs » existe ; et le mot évoque l'alcool sans parler du produit | App Store, 2026-11-22 |
| Toujours Là | « Toujours Là » existe (aide aux proches) | App Store, 2026-11-22 |
| Vestiaire | « Vestiaire Co » est une marque connue | App Store, 2026-11-22 |
| Patine | Plusieurs applis (« Patine: Antique Identifier ») | App Store, 2026-11-22 |
| Tout ce qui contient « Banc » ou « Bench » | **Même sens que le nom de l'original** : confusion possible | — |
| Glace Prête, Allez Go, Ligue de garage, Glaço, Rondello, Chambre 5, Feuille de match | Trop générique, difficile à dire, ou sens bizarre | — |

### Les 5 retenus : vérifications

« À faire » = pas encore vérifié. Je n'écris jamais « disponible » pour une vérification que personne n'a faite. Ce sont des **filtrages**, pas une autorisation juridique : avant de payer quoi que ce soit, il faut une recherche par un avocat en marques de commerce.

| Vérification | **Au Complet** | **Buddy & Beer** | Rondelle | Jeudi Soir | Embarque |
|---|---|---|---|---|---|
| App Store (API de recherche Apple) | Aucune appli à ce nom (CA), 2026-11-22 | Aucune (CA, US), 2026-11-22 | Aucune à ce nom ; des applis de hockey dans les résultats (CA), 2026-11-22 | Aucune (CA), 2026-11-22 | « EmbarqueSoft » (logistique) (CA, US), 2026-11-22 |
| Google Play | à faire | à faire | à faire | à faire | à faire |
| Domaine | `.ca`, `.com`, `.app` **libres**, 2026-11-22 | `.ca`, `.com` **libres**, 2026-11-22 | `.app` libre ; `.com` pas confirmé, 2026-11-22 | `.ca` libre ; `.com` pas confirmé, 2026-11-22 | à faire |
| Web (nom + hockey ou équipe) | Rien sous ce nom, 2026-11-22 (résultats : seulement des concurrents, [SportEasy](https://apps.apple.com/FR/app/id599931266), [MonClubSportif](https://apps.apple.com/fr/app/monclubsportif/id744667744)) | Rien sous ce nom, 2026-11-22 (seulement des concurrents : [BarDown](https://bardown-site.pages.dev/), [Too Many Men](https://apps.apple.com/py/app/too-many-men/id6532602002), [PuckPlanner](https://apps.apple.com/us/app/puckplanner/id6749377904)) | Rien sous ce nom, 2026-11-22 | à faire | à faire |
| Marque, Canada ([OPIC](https://ised-isde.canada.ca/cipo/trademark-search/srch)) | à faire, classes 9 et 42 | à faire | à faire | à faire | à faire |
| Marque, États-Unis ([USPTO](https://tmsearch.uspto.gov/)) | à faire | à faire | à faire | à faire | à faire |
| Marque, Europe ([TMview](https://www.tmdn.org/tmview/)) | à faire | à faire | à faire | à faire | à faire |
| Mondial ([WIPO](https://branddb.wipo.int/)) | à faire | à faire | à faire | à faire | à faire |
| Comptes Instagram, TikTok, X, GitHub | à faire | à faire | à faire | à faire | à faire |

### Décision : **Buddy & Beer** (choisi par le propriétaire, 2026-11-22)

La recommandation était « Au Complet » ; le propriétaire garde son nom de travail. Les trois risques plus bas restent à traiter : avocat pour la loi 96, questionnaire d'âge des magasins, et une promesse de fiabilité portée par le slogan plutôt que par le nom.

### Recommandation de départ : Au Complet

**Pourquoi « Au Complet » :**
- **Il dit la promesse** : l'équipe au complet jeudi, grâce aux rappels, aux spares et à la liste d'attente. Et il colle à l'angle : « à tout coup ».
- **Il est en français**, ce qui va avec « français d'abord ». La loi 96 (Charte de la langue française) encadre l'usage des marques dans une autre langue au Québec : un nom français évite la question.
- Ses trois domaines sont libres, et je n'ai trouvé aucune appli concurrente sous ce nom.
- Il se dit et s'écrit facilement, même pour un anglophone.

**Pourquoi garder « Buddy & Beer » se défend aussi :** c'est ton nom de travail, il a de la personnalité, ses domaines sont libres et je n'ai trouvé aucune appli à ce nom. Mais il a trois risques :
1. Il est en anglais, donc la loi 96 s'applique : à valider avec un avocat.
2. Le mot « Beer » peut relever la cote d'âge sur l'App Store (questionnaire sur l'alcool) : à vérifier en remplissant le questionnaire.
3. Il met l'accent sur la bière plutôt que sur la promesse de fiabilité.

**Dans le code**, le nom vit dans `src/lib/brand.ts` (`APP_NAME`). Changer de nom, c'est une ligne, plus les fichiers listés dans `brand.json` → `outside_brand_ts`. **Décision prise : « Buddy & Beer ».** Rien à changer dans le code. Pour le logo, suivre la variante « deux chopes qui trinquent » du brief.

## 2. Palette

Les rôles de `replica-design` ne changent pas ; seules les valeurs bougent. Le rapport de contraste est **sans échec** (`replica/design/contrast-report.md`, 50 paires).

| | BenchApp (relevé sur leur site) | Nous |
|---|---|---|
| Marque | bleu `#2F6BEB` | ambre « houblon » `#F2A516`, texte `#1C1300` dessus |
| Encre | marine `#070B1D` | `#121722` |
| Fond | gris bleuté `#F6F8FB` | blanc cassé chaud `#F7F5F0` (changé : l'ancien `#F5F7FA` était presque le leur) |
| Focus | — | ambre foncé `#8A5800` (changé : l'ancien bleu `#1E66D0` était proche de leur bleu) |
| Police | Nunito | Inter + Barlow Condensed |
| Logo | écusson | voir le brief : **jamais d'écusson** |

Les couleurs de l'original sont dans `brand.json` → `avoid.colors`, pour le balayage.

## 3. Logo

**Logo retenu (2026-11-23) : fourni par le propriétaire** : sceau rond rouge et crème, chope de bière au centre, deux bâtons croisés, « BUDDY & BEER » et « EST. 1969 ». Fichiers et régénération : `brand.json` → `logo`.
- Utilisé : en-têtes (accueil public, connexion, équipe), icônes d'appli 180/192/512, image sociale ; favicon = la chope seule (le sceau complet n'est plus lisible sous 48 px).
- Contrôle face à l'original : rond et non en écusson, rouge et crème et non bleu et blanc ; aucune forme commune. Écarts au brief ci-dessous (bâtons croisés, un bâton bleu) : acceptés.
- « EST. 1969 » est un clin d'œil : l'appli date de 2026. Ne jamais l'affirmer dans la fiche ou les pubs.

### Brief de départ (pour mémoire)

**Idée en une ligne :** une rondelle vue de haut, dont le centre forme un crochet ✓. « Tout le monde est là. »

- **Type :** symbole + logotype. Le symbole seul sert d'icône d'appli et de favicon.
- **Symbole :** un cercle plein ambre (`#F2A516`) avec un crochet en creux, couleur encre (`#121722`). Trait épais : il doit se lire à 16 px.
- **Logotype :** « Au Complet » en Barlow Condensed Bold, encre sur fond clair, ambre sur fond foncé. Pas d'italique, pas d'effet de vitesse.
- **Variante si le nom reste Buddy & Beer :** deux chopes qui trinquent, qui dessinent un « & » en creux. Même règles de couleurs.
- **Interdits :**
  - aucun **écusson** ni bouclier (c'est la forme de l'original) ;
  - aucun bleu ;
  - pas de paire bleu et blanc ;
  - pas de bâton croisé façon logo d'équipe de la LNH ;
  - pas de bouteille ni de marque de bière réelle.
- **Livrables :**
  - SVG du symbole et du logotype, en clair et en foncé ;
  - icône d'appli iOS 1024 × 1024 sans transparence (fond ambre) ;
  - favicons 16, 32, 180 et 512 ;
  - image sociale 1200 × 630.
- **Contrôle :** mettre les esquisses à côté du logo de BenchApp. Aucune forme, couleur ou astuce de lettre en commun.

## 4. Le ton

| Mot | Veut dire | Ne veut pas dire |
|---|---|---|
| **Complice** | on parle comme dans la chambre : « t'es là? », « les gars » | niaiseux ou vulgaire |
| **Direct** | une phrase, le geste à faire, le bouton qui le fait | bête ou sec |
| **Fiable** | on dit ce qui s'est passé et ce qui va se passer (« Enregistré ✓ », « on te texte si une place se libère ») | plate ou corporatif |

| À faire | À éviter |
|---|---|
| « T'es là jeudi? Réponds Y ou N. » | « Veuillez confirmer votre présence à l'événement. » |
| « Pas de connexion. Ta réponse n'a pas été enregistrée. Réessaie quand le réseau revient. » | « Une erreur est survenue. » |
| « Le match est complet. Tu montes automatiquement si une place se libère. » | « Vous avez été ajouté à la file d'attente. » |
| Tutoyer, partout. | Vouvoyer, ou passer de l'un à l'autre. |
| Des mots du hockey de garage : spare, tournée, chambre, IN/OUT. | Les termes de l'original : Chatter, Drink duty, Finder. |

### Les 10 textes les plus vus

Tous écrits à neuf pour ce projet. Aucun ne reprend une phrase de l'original.

| # | Où | Texte | Statut |
|---|---|---|---|
| 1 | Accueil (S01) | « Qui est là jeudi? Fini les 40 textos pour le savoir. » + « Ton équipe au complet, à tout coup. Rien à installer, rien à mettre à jour : les gars répondent Y par texto. » | 2e phrase **ajoutée** (angle) |
| 2 | Inscription | « Embarque » / « Gratuit, sans pub. Ton équipe au complet en un clic. » | gardé |
| 3 | Bouton principal | « IN » / « OUT » | gardé (c'est le vocabulaire de la chambre) |
| 4 | Confirmation IN | « Parfait, on compte sur toi. » | gardé |
| 5 | Match complet | « Le match est complet. Tu montes automatiquement si une place se libère. » | gardé |
| 6 | Texto de rappel | « {Équipe} : match jeu 26 nov à 21 h 15 (Aréna). T'es là? Réponds Y ou N. » | gardé |
| 7 | État vide de l'accueil (gérant) | « Ajoute ton prochain match : tout le monde reçoit la question « t'es là? » {délai} h avant. » | **corrigé** : disait « 48 h » en dur alors que le délai est réglable |
| 8 | Hors ligne | « Pas de connexion. Ta réponse n'a pas été enregistrée. Réessaie quand le réseau revient. » | gardé |
| 9 | Erreur | « Oups, ça a accroché » / « Quelque chose n'a pas marché de notre bord. Réessaie; si ça continue, écris-nous. » | gardé |
| 10 | 404 | « Introuvable » / « Cette page n'existe pas, ou tu ne fais pas partie de cette équipe. » | gardé |

## 5. Balayage

Recherche dans `src`, `public`, `supabase`, `e2e`, `scripts`, `tests` et les fichiers de configuration. Le dossier `replica/` est exclu : c'est le dossier de planification.

| Cible | Résultat |
|---|---|
| Nom de l'original (`benchapp`, `bench app`), y compris dans des identifiants | 1 trouvé, dans un commentaire de migration → **reformulé**. 0 restant. |
| Couleurs de l'original (`#2F6BEB`, `#070B1D`, `#F6F8FB`, `#4B5A70`, `#93C5FD`) | 0 |
| Police (Nunito), écusson | 0 |
| Termes de l'original (Chatter, Drink duty, Finder) | 0 dans l'appli (le mot « chatter » ne reste que dans le script d'analyse des avis, où il sert à reconnaître leur vocabulaire) |
| Noms de fichiers | 0 |
| Nom de travail écrit en dur | Centralisé dans `src/lib/brand.ts` (23 fichiers modifiés). Restent : les fichiers listés dans `brand.json` → `outside_brand_ts`. |

**À vérifier à l'œil, une fois le logo fait** (il n'existe pas encore) :
- favicon et icône d'appli ;
- image sociale ;
- titres de pages ;
- courriels d'auth (gabarits français, déjà sans trace de l'original).
