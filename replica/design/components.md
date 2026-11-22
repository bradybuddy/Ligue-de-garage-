# Composantes — Buddy & Beer

Système de design à nous. Pas de captures de BenchApp dans `replica/screens/`, et on n'en voulait pas : on reprend leurs **composantes et leurs états** (section 5 de la recon), pas leur apparence.

- Jetons : `tokens.json` (source) → `node replica/design/build-tokens.mjs` → `tokens.css` + `contrast-report.md`. Le script échoue s'il y a un échec AA.
- Tailwind 4 : `src/app/globals.css` (`@theme inline`). **La palette par défaut de Tailwind est retirée** : seules les classes de rôle existent (`bg-surface`, `text-muted`, `bg-in`...).
- Code : `src/components/ui/*`. Vitrine : `/design` (`src/app/design/page.tsx`), bouton de thème clair/sombre, `?theme=dark`.
- Captures : `screens/mobile-clair.png`, `screens/mobile-sombre.png`, `screens/bureau-clair.png`.
- Contraste : 50 paires (25 × 2 thèmes), **0 échec**. axe-core (WCAG 2.0, 2.1 et 2.2, A et AA) sur `/design` : **0 violation** en mobile clair, mobile sombre et bureau. Aucun débordement horizontal à 390 px.

## Fondations

| | Valeur | Notes |
|---|---|---|
| Couleurs | 12 rôles de base + 4 familles de statut (`in`, `out`, `wait`, `warning`) avec version pleine et douce | Ambre « houblon » comme accent : à nous, pas la couleur de BenchApp. `/replica-brand` peut changer les valeurs, pas les noms. |
| Gris | 5 : `bg`, `surface`, `surface-2`, `border`, `border-input` + 2 textes | |
| Thèmes | clair et sombre (sombre suit le système, ou `data-theme`) | Les gens regardent l'appli dans l'aréna à 23 h. |
| Polices | **Inter** (interface) et **Barlow Condensed** (heures, scores, compteurs, titres), toutes deux libres (SIL OFL), servies par `@fontsource` | Chiffres tabulaires (`tabular`) partout où des nombres s'alignent. |
| Échelle de texte | 12/16 · 14/20 · 16/24 · 18/26 · 20/28 · 28/34 · 40/44 | 16 px minimum dans les champs (pas de zoom forcé sur iOS). |
| Espacement | base 4 px : 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 | |
| Rayons | 6 · 10 · 16 · plein | |
| Ombres | `sm` (cartes), `md` (dialogues) | |
| Mouvement | 120 ms / 200 ms, `cubic-bezier(0.2,0,0,1)` ; 0 ms si « réduire les animations » | |
| Mise en page | contenu 720 px, large 1 120 px, barre latérale 256 px, entête 56 px, nav du bas 64 px + zone sûre, marge 16 px | Points de rupture 640 / 768 / 1024. |
| Cibles tactiles | 44 px pour toute action principale ; 24 px minimum absolu | |
| Focus | un seul anneau pour toute l'appli : 2 px `ring`, décalage 2 px | ≥ 3:1 sur `bg` et `surface` dans les 2 thèmes. |
| Icônes | **Lucide** (ISC) | Toujours `aria-hidden` ; le texte porte le sens. |

**Règle de couleur pour le statut : jamais la couleur seule.** IN = ✓ + « IN », OUT = ✕ + « OUT », En attente = horloge + mot, Pas répondu = ? + mot.

---

## Composantes construites (`src/components/ui`)

```
Bouton IN / OUT  (AttendanceToggle)                       ← la composante qui compte
  variantes  taille lg 56px (S07, S05) · md 44px (listes)
  états      pas répondu · IN (vert plein) · OUT (rouge plein) · en attente (violet, le bouton IN dit « En attente »)
             · envoi en cours (roue sur le bouton touché, les 2 désactivés) · verrouillé (cadenas + raison : frais, match annulé)
  jetons     in / on-in, out / on-out, wait / on-wait, border-input, police display 18px/700 majuscules
  a11y       radiogroup « Ma présence » de 2 radios ; flèches ←/→ basculent ; une seule tabulation ;
             message en aria-live sous les boutons (« Le match est complet. Tu montes automatiquement… »)
  utilisé    S05, S07 ; même logique dans la page /r/[token] du courriel
```

```
Compteur de présences  (AttendanceCounter)
  états      normal · complet (étiquette « Complet » en plus de la barre pleine)
  jetons     display 28px tabulaire, barre in sur surface-2
  a11y       role=progressbar avec aria-valuetext « 14 sur 20 » / « 2 sur 2, complet »
  utilisé    S07 (joueurs, gardiens)
```

```
Carte de match  (MatchCard)
  états      à venir (+ mon statut + IN x/max) · en cours (« En cours ») · final (V/D/N + score) · annulé (heure barrée + « Annulé », fond surface-2)
  jetons     surface, border, radius lg, shadow sm ; bloc date surface-2 ; heure display 20px
  a11y       toute la carte est un seul lien ; score lu « Final 6 à 4 » ; dates en fr-CA dans le fuseau de l'équipe (Intl, jamais l'heure du téléphone)
  mobile     min-w-0 + troncature : un nom d'aréna long ne fait jamais déborder l'écran
  utilisé    S05, S06, L01
```

```
Pastille de classe  (ClassBadge)
  variantes  Régulier · Spare (accent-soft) · Spectateur · Staff · Vacances (wait-soft) · Blessé (warning-soft) · Suspendu (out-soft)
  a11y       c'est du texte, rien à annoncer de plus
  utilisé    S11, S12, S15
```

```
Pastille de statut  (StatusPill)
  variantes  IN · OUT · En attente · Pas répondu    (icône + mot)
  utilisé    S05, S07, S11, S15, cartes de match
```

```
Liste et rangée de joueur  (PlayerList, PlayerRow)
  contenu    avatar à initiales, nom (jusqu'à 2 lignes, jamais coupé à 1 : plainte « noms illisibles »), n°, « Gardien »,
             icône de tournée, note de présence, pastille de classe et/ou statut, action à droite (Accepter...)
  états      vide → voir État vide
  a11y       section avec titre + compte ; <ul>/<li> ; l'icône bière a un texte caché « , de tournée »
  utilisé    S07 (par statut), S11 (par classe), S15 (liste d'attente)
```

```
Carte de tournée  (BeerCard)
  états      quelqu'un est désigné (+ nb de tournées) · c'est moi (+ « Échanger ») · personne encore
  jetons     accent-soft, pastille accent
  utilisé    S07, S22
```

```
Bouton  (Button)
  variantes  primary (accent) · secondary (contour) · ghost · danger
  tailles    sm 32px · md 40px · lg 48px · icon 44px
  états      défaut · survol · appuyé · focus-visible (anneau) · désactivé (50 %) · chargement
  a11y       vrai <button type="button"> par défaut ; en chargement : roue + aria-busy, l'étiquette reste lue (opacity-0, pas visibility:hidden — bogue trouvé par axe et corrigé)
  règle      un seul bouton primary par écran
```

```
Champ  (Field + Input, Textarea, Select)
  états      défaut · focus · désactivé (surface-2) · erreur (bordure out 2px + icône + message)
  jetons     bordure border-input (≥ 3:1), hauteur 44px, texte 16px
  a11y       <label for>, aide et erreur reliées par aria-describedby, aria-invalid ; « (facultatif) » écrit, pas d'astérisque
  date/heure les champs natifs (date, time) : bon clavier sur mobile, format de l'appareil. Conversion en UTC côté serveur avec le fuseau de l'équipe.
  utilisé    S02, S04, S08, S12, S20, S25
```

```
Interrupteur  (Switch)
  états      oui · non · désactivé ; description facultative
  a11y       <button role="switch" aria-checked>, étiqueté et décrit par le texte de la rangée
  utilisé    S25, S26
```

```
Sélecteur de canal  (ChannelPicker)
  options    Notif (gratuit) · Texto (réponse Y/N) · Courriel (lien IN/OUT)
  états      coché · décoché · erreur « Choisis au moins un canal »
  a11y       <fieldset><legend>, vraies cases à cocher cachées visuellement ; le focus se voit sur la tuile (has-[:focus-visible])
  utilisé    S14, S18, L09, réglages des invitations auto
```

```
Bulle de chat + réactions  (ChatBubble)
  variantes  la mienne (accent, à droite) · les autres (surface-2, avec avatar et nom)
  états      envoyée · pas envoyée (bordure pointillée out + bouton « Pas envoyé · Réessayer ») · GIF
  réactions  une pastille par emoji avec le nombre ; title ET aria-label listent TOUS les noms (plainte « seulement 1 ou 2 noms ») ; aria-pressed pour la mienne
  utilisé    S16, S17
```

```
Tableau de stats  (StatsTable)
  états      trié (flèche + aria-sort) · vide (phrase qui explique quand les stats apparaissent)
  a11y       <caption>, en-têtes <th scope>, abréviations dans <abbr title> (PJ, B, A, PTS, PUN) ; défile dans son cadre sur mobile
  utilisé    S24, L05, L06
```

```
Téléversement CSV/Excel  (FileDrop)
  états      vide · survol de glisser · fichier choisi · erreur (« Ligne 4 : il manque la date. Rien n'a été importé. »)
  a11y       le bouton « Choisir un fichier » suffit (clavier, mobile) ; le glisser-déposer est un bonus ; erreur en role=alert
  utilisé    S09, S13
```

```
État vide, bannière, squelette  (EmptyState, Banner, Skeleton)
  bannière   info · avertissement · danger (role=alert) · hors ligne
  vide       icône + titre + une phrase qui dit quoi faire + une action
  squelette  pulse, coupé si « réduire les animations »
```

```
Navigation du bas  (BottomNav)
  onglets    Accueil · Horaire · Alignement · La chambre (chat, pastille de non-lus) · Plus
  a11y       <nav aria-label>, aria-current="page", « 3 non lus » lu par les lecteurs d'écran
  mobile     64px + zone sûre iPhone ; sur lg+ devient la barre latérale de 256px
```

```
Dialogue / feuille  (Dialog)
  mobile     feuille ancrée en bas ; sm+ centré, 448px
  a11y       <dialog> natif + showModal : focus piégé, Échap ferme, focus rendu au déclencheur ; clic sur le fond ferme ; bouton Fermer 44px
  utilisé    confirmations, S14 (envoyer), S15, choix d'emoji
```

---

## Composantes spécifiées, pas encore codées

```
Toast
  états      succès · erreur avec « Réessayer » · annuler (« Tu es OUT. Annuler »), 5 s, s'arrête au survol/focus
  a11y       role=status (succès) / role=alert (erreur) ; jamais la seule trace d'une erreur
```

```
Pointeur  (S23, jalon 4)
  pointage   rapide : 2 grands compteurs +/− (64px), période, « Final »
  complet    + but (choisir le marqueur, puis 0 à 2 passes), + punition (joueur, minutes), + tir ; annuler la dernière action
  a11y       chaque bouton dit l'équipe et l'action (« But, Castors ») ; le score change en aria-live
```

```
Formulaire de carte  (S21, L07, jalon 3)
  Stripe Checkout hébergé (pas de champs de carte chez nous) ; bouton primary « Payer 15,00 $ » ; états : refus, réessai, remboursé
```

```
Sélecteur de saison, de semaine (S06, L03)   onglets en défilement horizontal, aria-selected
Sondage (S19)                                 options en radios, résultats en barres avec % écrit
Glisser-déposer des trios (S10)               toujours doublé d'un menu « Déplacer vers… » pour le clavier
```

**Pas de bannière d'abonnement (S27).** Tout est inclus, pas de pub.

---

## Ce qui reste à faire

- `/replica-brand` : nom final, logo, valeurs de couleurs si on change l'ambre. Les noms de rôles restent.
- Les champs date et heure suivent la langue de l'appareil : en anglais dans les captures (Chromium sans locale), en français sur un téléphone en français.
- Tester sur un vrai iPhone : zone sûre, clavier sur les champs, Web Push.
