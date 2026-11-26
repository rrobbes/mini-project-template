# PROGRESS — Feuille de route DEFLECT

Document de suivi commun du groupe. Statuts mis à jour à chaque intervention,
uniquement sur preuve (test, exécution, code présent dans le dépôt).

## Résumé

- **Version actuelle** : `v0.0` — prototype moteur + CLI agent (toutes les briques
  v0.0 vérifiées par tests). Le jeu n'est **pas encore jouable** : la scène Phaser
  est vide et aucun contrôle joueur réel n'existe.
- **Étape en cours** : `v0.1` — première version jouable (rendu de l'état moteur
  + contrôle souris + boucle complète jusqu'au game over).
- **Prochaines actions prioritaires** :
  1. Committer la tranche Phaser/Vite (5 fichiers modifiés non commités).
  2. Contrôle souris (`src/controls/mouse.ts` → `Command`).
  3. Rendu de l'arène (noyau, raquette, projectiles) branché au moteur en
     lecture seule.
- **Blocages** : aucun technique. Deux points logistiques : le travail Phaser
  n'est pas committé ; le push SSH échoue depuis l'environnement de travail
  (les commits restent locaux, le dépôt distant est accessible en HTTPS lecture).

## Audit — ce qui est réellement fonctionnel

| Fonctionnalité | Statut | Preuve (exécutée, pas déduite du README) |
|---|---|---|
| Moteur (état, spawn, collisions, rebond, score, game over) | Fonctionnel | 16 tests Vitest, `npm test` |
| Déterminisme (même seed → même partie ; step 120 ≡ 2×60) | Fonctionnel | `src/engine/__tests__/engine.test.ts` |
| Difficulté croissante (vitesse ↑, intervalle ↓) | Fonctionnel | Test `difficulty` |
| CLI agent + session persistante | Fonctionnel | Boucle `reset → move 3 → step 120` exécutée : angle 3, elapsed 2 s, état conservé entre invocations ; 7 tests |
| Scène Phaser vide + serveur Vite | Fonctionnel (non committé) | `npm run dev` : Vite démarre, `/` et `/src/main.ts` servis (200). Rendu navigateur vérifié visuellement à faire par le groupe |
| Contrôle souris | **Absent** | Aucun code pointer/mouse dans `src/` |
| Contrôle clavier réel | **Absent** | `keyboard.ts` = rotation automatique, pas une entrée joueur |
| Rendu du jeu (arène, sprites, HUD) | **Absent** | `DeflectScene.create()` vide |
| Écran de fin / recommencer | **Absent** | `gameOver` non géré côté UI |
| Meilleur score persistant | **Absent** | Aucune trace de stockage |

Vérifié le commit `67cea3d` sur `feat/architecture-base` : moteur + tests + CLI
committés ; la tranche Phaser/Vite est en working tree, non committée.

## Règles de progression

- Chaque version intermédiaire doit rester **jouable de bout en bout**.
- Le moteur (`src/engine/`) reste **pur** : pas de rendu, pas d'entrée, pas de
  stockage. UI et contrôles ne font que lire l'état et envoyer des `Command`.
- Pas de refactorisation ni d'architecture superflue : petit pas, testé, jouable.

## Versions et étapes

Légende — Priorité : 🔴 haute · 🟠 moyenne · ⚪ exploratoire.
Statut : `TODO` · `IN PROGRESS` · `DONE` · `BLOCKED`.

### v0.0 — Prototype moteur + CLI (terminée)

**1. Moteur minimal** — 🔴 — `DONE`
- Objectif : simulation complète sans rendu (noyau, raquette sur arc,
  projectiles, collisions, rebond, score, game over, difficulté).
- Tâches : état + types, RNG seedé, spawner, `step()` pas à pas, collisions.
- Dépendances : aucune.
- Validation : `npm test` vert ; simulation d'une partie via CLI sans crash.
- Preuve : commit `e1c6655` (base) + tests `67cea3d`.

**2. CLI agent à session persistante** — 🔴 — `DONE`
- Objectif : boucle agent `state → move → step → reset` entre invocations.
- Tâches : sérialisation JSON atomique, validation au chargement, angle cible
  appliqué par le moteur (limité par `PADDLE_SPEED`).
- Dépendances : étape 1.
- Validation : 7 tests de session + boucle manuelle exécutée (angle 3 atteint,
  `elapsed` cumulé à travers les invocations).

**3. Couverture de tests moteur + session** — 🔴 — `DONE`
- Objectif : protéger le déterminisme et la persistance par des tests.
- Tâches : `src/engine/__tests__/engine.test.ts` (9),
  `src/controls/__tests__/cli.test.ts` (7).
- Dépendances : étapes 1-2.
- Validation : `npm test` → 16/16.
- Preuve : commit `67cea3d`.

**4. Socle Phaser/Vite + scène vide** — 🔴 — `DONE` (à committer)
- Objectif : `npm run dev` démarre une page avec une scène Phaser vide 800×800.
- Tâches : `index.html`, bootstrap `Phaser.Game` dans `src/main.ts`,
  `DeflectScene` vide dans `src/ui/game.ts`, script `dev` → Vite, deps
  `phaser@4.2.1` / `vite@5.4.21`.
- Dépendances : aucune (parallèle aux étapes 1-3).
- Validation : `npm run dev` sert la page et les modules (200) ; `npm run build`
  vert ; ouverture navigateur à confirmer par le groupe.
- Statut : fonctionnel et vérifié, **5 fichiers non committés**.

### v0.1 — Première version jouable (priorité actuelle)

**5. Contrôle souris** — 🔴 — `TODO`
- Objectif : la raquette suit la souris, de façon fluide.
- Tâches : `src/controls/mouse.ts` — convertir la position du pointeur en angle
  cible → `Command { paddleAngle }` ; brancher dans la scène.
- Dépendances : étape 4 (committée).
- Validation : la raquette poursuit le curseur à vitesse limitée
  (`PADDLE_SPEED`), testé en jeu ; l'ancienne rotation auto de `keyboard.ts`
  retirée ou laissée hors du chemin d'exécution.

**6. Rendu de l'arène : noyau + raquette** — 🔴 — `TODO`
- Objectif : voir le noyau au centre et la raquette sur son arc.
- Tâches : dans `DeflectScene`, dessiner noyau et arc de raquette depuis
  l'état moteur (lecture seule) ; scène relie état → rendu chaque frame.
- Dépendances : étape 4.
- Validation : affichage conforme à l'état du moteur (position d'angle vérifiée
  en déplaçant la souris avec l'étape 5).

**7. Rendu des projectiles + boucle pas-à-pas** — 🔴 — `TODO`
- Objectif : les projectiles apparaissent, volent, rebondissent ou éliminent le
  joueur — la partie complète se déroule à l'écran.
- Tâches : avance du moteur à pas fixe (1/60 s) depuis la boucle Phaser
  (accumulateur si nécessaire), sprites des projectiles synchronisés sur
  `state.projectiles`, gestion du `gameOver`.
- Dépendances : étapes 5-6.
- Validation : une partie entière se joue sans la console ; le score monte au
  rebond ; le noyau touché arrête la simulation.

**8. HUD : score et temps** — 🔴 — `TODO`
- Objectif : feedback minimal du score et du temps survécu.
- Tâches : texte Phaser mis à jour depuis `state.score` / `state.elapsed`.
- Dépendances : étape 7.
- Validation : le score affiché correspond au score moteur après des renvois.

**9. Écran de fin + recommencer** — 🔴 — `TODO`
- Objectif : fin lisible et redémarrage sans recharger la page.
- Tâches : overlay « GAME OVER + score » sur `gameOver`, bouton/touche restart
  qui recrée l'état (`createInitialState`) et relance la scène.
- Dépendances : étapes 7-8.
- Validation : enchaîner 2 parties complètes sans recharger ; l'état repart
  bien de zéro.

**10. Validation v0.1** — 🔴 — `TODO`
- Objectif : v0.1 déclarée jouable.
- Tâches : partie complète jouée par un humain (fluidité, difficulté
  ressentie), partie jouée par l'agent via CLI pour confirmer que le moteur
  est identique avec et sans UI ; marquer v0.1 dans ce fichier.
- Dépendances : étapes 5-9.
- Validation : les deux manières de jouer donnent la même simulation à seed
  et commandes égales.

### v0.2 — Boucle complète et finition

**11. Meilleur score persistant** — 🟠 — `TODO`
- Objectif : garder la meilleure partie d'une session à l'autre.
- Tâches : stockage côté UI (`localStorage`, **hors moteur**) ; affichage sur
  l'écran de fin.
- Dépendances : étape 9.
- Validation : meilleur score conservé après rechargement de page.

**12. Équilibrage de la difficulté** — 🟠 — `TODO`
- Objectif : courbe agréable : facile au début, tendue ensuite.
- Tâches : ajuster `difficulty()` (vitesse, fréquence) après parties réelles ;
  éventuellement zone de sûreté au démarrage.
- Dépendances : étape 10.
- Validation : parties testées par les deux membres ; tests unitaires
  toujours verts (adapter les bornes si les constantes changent).

**13. Feedback visuel minimal** — 🟠 — `TODO`
- Objectif : lire le jeu sans réfléchir (impact, rebond, danger).
- Tâches : flash au renvoi, secousse/franche au noyau touché, direction des
  projectiles lisible.
- Dépendances : étape 9.
- Validation : ressenti validé en jeu ; aucun effet ne bloque la boucle.

**14. Fallback clavier (optionnel)** — 🟠 — `TODO`
- Objectif : jouer sans souris (et préfigurer le fallback webcam).
- Tâches : flèches/Q-D → rotation de la raquette via `Command`.
- Dépendances : étape 5.
- Validation : partie jouable uniquement au clavier.

**15. Packaging v0.2** — 🟠 — `TODO`
- Objectif : livrer v0.2 proprement.
- Tâches : `vite build` pour un bundle statique (script `build:ui`, sortie hors
  `dist/` de tsc ou distinguer), favicon/titre, README jouabilité mis à jour.
- Dépendances : étapes 10-12.
- Validation : le build statique fonctionne ouvert depuis un fichier/servi.

### v1.0 — Contrôle webcam (exploratoire)

**16. Spike MediaPipe Hands** — ⚪ — `TODO`
- Objectif : savoir **si** le suivi de main est jouable dans nos conditions
  (webcam, éclairage), avant tout design.
- Tâches : prototype isolé (page dédiée) qui affiche la position de la main ;
  mesurer latence et stabilité.
- Dépendances : aucune — peut démarrer en parallèle de v0.2.
- Validation : latence et précision mesurées ; décision go/no-go documentée ici.

**17. Décision : style de contrôle webcam** — ⚪ — `TODO` (décision ouverte)
- Objectif : choisir entre **raquette circulaire** (la main pilote l'angle,
  même jeu que la souris) et **bouclier libre** (la main pilote une position
  2D, gameplay différent).
- Tâches : essayer les deux sur le spike ; arbitrer.
- Dépendances : étape 16.
- Validation : décision écrite ici avec les arguments ; **aucun choix fait avant
  les essais**.

**18. Intégration calibrage** — ⚪ — `TODO`
- Objectif : la main contrôle le jeu en conditions réelles.
- Tâches : module `src/controls/webcam.ts` → `Command` (comme souris/CLI),
  calibrage au lancement, bascule webcam/souris dans l'UI.
- Dépendances : étapes 16-17, v0.2.
- Validation : partie complète jouée à la main ; le moteur inchangé (les
  contrôles restent interchangeables).

**19. Robustesse et fallback webcam** — ⚪ — `TODO`
- Objectif : détection perdue = pas de mort injuste.
- Tâches : lissage du suivi, détection de perte de main, repli souris
  automatique.
- Dépendances : étape 18.
- Validation : parties avec interruptions volontaires de la détection.

**20. Finitions v1.0** — ⚪ — `TODO`
- Objectif : version finale du semestre.
- Tâches : `report.md` (retour d'expérience, demandé par le plan), relecture
  README/PROGRESS, tags de version.
- Dépendances : étapes 15-19 (selon périmètre webcam retenu).
- Validation : remise conforme au cahier des charges du cours.

### Idées hors périmètre (non décidées)

Ennemis, vagues, améliorations de raquette : **idées d'extension** évoquées,
aucune décision prise, aucun développement prévu dans cette feuille de route.
À rediscuter après v1.0.

## Décisions restantes à prendre

| # | Décision | Quand |
|---|---|---|
| D1 | Contrôle webcam : raquette circulaire vs bouclier libre | Après le spike (étape 16) — rester ouvert jusque-là |
| D2 | Meilleur score : `localStorage` UI vs fichier CLI partagé | Étape 11 |
| D3 | Assets : formes vectorielles Phaser vs sprites | Étape 6 |
| D4 | Sons : oui/non, quels assets libres | Étape 13 |
| D5 | Sort de `keyboard.ts` (rotation auto) : remplacer ou supprimer | Étape 5 |
| D6 | Partage du travail à deux (qui : moteur, UI, webcam) | Dès maintenant |
| D7 | Faut-il une zone de sûreté / grâce au démarrage | Étape 12 |
