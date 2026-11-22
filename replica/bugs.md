# Bogues — Buddy & Beer

Passe de test du 2026-11-22. Build de départ : `acaefea`. Navigateur : Chromium 1243 (Playwright 1.63), Pixel 7 à 390 × 844, et 1440 × 900 pour les écrans. Pile : Supabase local (Postgres 15.8, GoTrue 2.180, Mailpit).

Seulement des bogues reproduits. Chacun a un test qui échouait avant le correctif et qui passe après.

| Gravité | Ouverts | Corrigés |
|---|---|---|
| S1 | 0 | 0 |
| S2 | 0 | 2 (BUG-003, BUG-004) |
| S3 | 0 | 4 (BUG-001, BUG-002, BUG-005, BUG-007) |
| S4 | 0 | 1 (BUG-006) |

Les bogues trouvés pendant `/replica-backend` (vol d'identité par courriel non vérifié, récursion des règles du chat, `is_service_role()` sur une connexion réutilisée…) sont listés dans `backend.md`. Ils sont tous corrigés et couverts par `npm run test:db`.

---

### BUG-001 : après la connexion, on revient à l'accueil de l'équipe au lieu de la page demandée
- Severity: S3
- Flow / case: transversal / X-S3
- Screen: S02 (et toute page d'équipe)
- Build: acaefea · Chrome, 390 px
Steps
1. Déconnecté, ouvrir `/t/<équipe>/horaire`. C'est aussi ce que fait une notif push qui pointe vers un match.
2. Regarder l'adresse de la page de connexion.
Expected: `/connexion?next=/t/<équipe>/horaire`
Actual: `/connexion?next=/t/<équipe>`. Après la connexion, on atterrit sur l'accueil et non sur le match de la notif.
Evidence: `e2e/securite-compte.spec.ts` › X-S3
Suspected cause: le layout d'équipe appelle `requireUser()` avant la page, avec son propre chemin.
Status: fixed in 92087fc. Le proxy note le chemin demandé (`x-bb-path`) et `requireUser()` s'en sert.

### BUG-002 : impossible d'ajouter un joueur qui n'a qu'un courriel
- Severity: S3
- Flow / case: F01 / F01-E9
- Screen: S12
- Build: acaefea · Chrome, 390 px
Steps
1. Alignement → Ajouter.
2. Nom + courriel, sans cellulaire. Laisser la case « Il accepte de recevoir des textos » telle quelle (cochée par défaut).
3. Ajouter.
Expected: le joueur est ajouté. Il recevra les rappels par courriel.
Actual: « Il faut un numéro pour envoyer des textos. » Le joueur n'est pas ajouté tant qu'on ne décoche pas la case.
Evidence: `e2e/f01-mise-en-marche.spec.ts` › F01-E9. Bloquait aussi 11 specs F02.
Status: fixed in 5e7d048. Sans numéro, le consentement texto ne s'applique simplement pas.

### BUG-003 : le lien d'invitation affiché sur l'alignement mène à une page « à venir »
- Severity: S2
- Flow / case: F01 / F01-E8
- Screen: S11 → S03
- Build: acaefea · Chrome, 390 px
Steps
1. Gérant : Alignement → « Copier le lien ».
2. Un joueur ouvre le lien.
Expected: il voit l'équipe et peut la rejoindre.
Actual: page d'attente « Écran S03 · arrive au jalon 2 ». L'appli offrait un lien qui ne fonctionnait pas.
Evidence: `e2e/f01-mise-en-marche.spec.ts` › F01-E8
Status: fixed in cec728e. S03 est bâti :
- `/j/[code]` montre un aperçu (nom et nombre de membres seulement) ;
- `/rejoindre` permet d'entrer le code à la main ;
- `join_team()` fait entrer la personne comme régulier, et relie sa fiche si son courriel est vérifié (migration 0006).

### BUG-004 : toucher IN sans réseau fait planter toute l'appli
- Severity: S2
- Flow / case: F02 / F02-E5
- Screen: S07 (et S05)
- Build: acaefea · Chrome, 390 px, hors ligne
Steps
1. Joueur sur la page du match.
2. Couper le réseau (Wi-Fi d'aréna).
3. Toucher IN.
Expected: un message clair. La page reste là, et on peut réessayer.
Actual: toute la page est remplacée par l'écran d'erreur générique de Next, en anglais (« This page couldn't load. Reload to try again, or go back. »). Le joueur ne sait pas si sa réponse est passée.
Evidence: `e2e/.results/…/test-failed-8.png` (avant le correctif), `replica/clone-screens/S07-hors-ligne-mobile.png` (après) ; `e2e/f02-presence.spec.ts` › F02-E5
Suspected cause: l'action serveur appelée dans une transition rejette sur une erreur réseau, sans `try/catch`. L'erreur remonte jusqu'à la limite d'erreur de Next.
Status: fixed in 84713be. `callAction()` capture l'échec et laisse passer les redirections de Next. Elle est utilisée par IN/OUT, les boutons du gérant, la relance et les confirmations. Message : « Pas de connexion. Ta réponse n'a pas été enregistrée. Réessaie quand le réseau revient. »

### BUG-005 : aucune page d'erreur à nous : les erreurs imprévues s'affichent en anglais
- Severity: S3
- Flow / case: transversal / X-U3
- Screen: toutes
- Build: acaefea
Steps
1. Provoquer une erreur imprévue dans une page (cas de BUG-004 avant son correctif, ou un formulaire envoyé hors ligne).
Expected: un message en français, avec un bouton « Réessayer ».
Actual: l'écran par défaut de Next, en anglais.
Evidence: même capture que BUG-004
Status: fixed in 84713be. Ajout de `app/error.tsx` (distingue « Pas de connexion » d'une autre erreur) et de `app/global-error.tsx`.

### BUG-006 : la page 404 est en anglais
- Severity: S4
- Flow / case: transversal / X-S1
- Screen: 404
- Build: acaefea
Steps
1. Connecté, ouvrir l'équipe de quelqu'un d'autre, ou une adresse inexistante.
Expected: « Introuvable », en français, qui ne dit pas si l'équipe existe.
Actual: « 404 — This page could not be found. »
Evidence: `e2e/securite-compte.spec.ts` › X-S1 (vérifie maintenant le titre « Introuvable »)
Status: fixed in 84713be (`app/not-found.tsx`).

### BUG-007 : une recrue invitée perd l'invitation en confirmant son courriel
- Severity: S3
- Flow / case: F01 / F01-E10
- Screen: S03 → S02 → courriel → S01
- Build: cec728e · Chrome, 390 px
Steps
1. Sans compte, ouvrir `/j/CODE` → « Créer mon compte et rejoindre ».
2. S'inscrire, puis cliquer le lien du courriel de confirmation.
Expected: retour à l'invitation, puis « Rejoindre ».
Actual: on arrive à l'accueil général, sans l'équipe. Il faut retrouver le lien d'invitation.
Evidence: `e2e/f01-mise-en-marche.spec.ts` › F01-E10
Suspected cause: le gabarit du courriel de confirmation renvoie toujours à `/`. Le `next` de l'inscription se perdait.
Status: fixed in d6c3332. L'inscription retient la destination dans un cookie http-only valide 3 jours, que `/auth/confirm` utilise.

---

## À vérifier (pas reproduit comme bogue, ou hors de ce que je peux tester ici)

- **Consentement aux textos (LCAP) :** la case est cochée par défaut, et c'est le gérant qui atteste du consentement du joueur. Une case pré-cochée n'est généralement pas un consentement « exprès ». Il faut le valider avec un avis juridique, ou la décocher par défaut et demander au joueur de confirmer par son premier texto (« Réponds OUI pour recevoir les rappels »).
- **Créer un match dans le passé** est permis sans avertissement. Il va directement dans « Passés ». Ce n'est probablement pas un bogue, mais un avertissement aiderait.
- **Le proxy appelle `auth.getUser()` à chaque requête de page** : c'est un aller-retour vers Supabase. À mesurer sous charge avant le lancement.
- **La page du match se recharge toutes les 5 secondes** (en attendant Supabase Realtime) : c'est du trafic tant que l'onglet est visible.
- **Formulaires envoyés hors ligne** (ajouter un joueur, un match) : ils tombent maintenant sur notre page d'erreur française avec « Réessayer », mais le formulaire est perdu. À améliorer : garder le brouillon.
- **Manuel, sur appareil :**
  - notifs push sur iPhone (PWA installée) et Android (X-M1) ;
  - VoiceOver sur S07 (X-M3).
- **Manuel, avec les clés :** vrai texto Twilio aller-retour et vrai courriel Resend (X-M2).
