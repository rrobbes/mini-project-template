# PROGRESS — Feuille de route DEFLECT

Document de suivi commun du groupe. Statuts mis à jour à chaque intervention,
uniquement sur preuve (test, exécution, code présent dans le dépôt).

## Résumé

- **Version actuelle** : `v0.1` en cours — première version **fonctionnelle** :
  rendu complet (noyau, raquette, projectiles, HUD, écran de fin + restart) et
  contrôle souris codés, testés au niveau moteur/build/serveur ; **validation
  en jeu au navigateur à faire par le groupe**.
- **Étape en cours** : étape 10 — validation v0.1 (parties humain + agent).
  Les étapes 5-9 sont posées et validées en jeu au navigateur (retour du groupe).
- **Prochaines actions prioritaires** :
  1. Committer les étapes 5-9 (contrôle souris, rendu, HUD, fin/restart).
  2. Étape 10 — validation v0.1 (partie humain + partie agent via CLI, même
     simulation à seed/commandes égales).
  3. Étape 11 — meilleur score persistant.
- **Blocages** : aucun technique. Point logistique : le push SSH échoue depuis
  l'environnement de travail (push possible en HTTPS, vérifié).

## Audit — ce qui est réellement fonctionnel

| Fonctionnalité | Statut | Preuve (exécutée, pas déduite du README) |
|---|---|---|
| Moteur (état, spawn, collisions, rebond, score, game over) | Fonctionnel | 16 tests Vitest, `npm test` |
| Déterminisme (même seed → même partie ; step 120 ≡ 2×60) | Fonctionnel | `src/engine/__tests__/engine.test.ts` |
| Difficulté croissante (vitesse ↑, intervalle ↓) | Fonctionnel | Test `difficulty` |
| CLI agent + session persistante | Fonctionnel | Boucle `reset → move 3 → step 120` exécutée : angle 3, elapsed 2 s, état conservé entre invocations ; 7 tests |
| Scène Phaser + serveur Vite | Fonctionnel (committé 3683a55) | `npm run dev` : Vite démarre, `/` et `/src/main.ts` servis (200). Rendu navigateur vérifié visuellement à faire par le groupe |
| Contrôle souris | **Fonctionnel** | `src/controls/mouse.ts` + 9 tests ; modules servis par Vite (200) |
| Contrôle clavier réel | **Absent** | `keyboard.ts` = rotation automatique, pas une entrée joueur |
| Rendu du jeu (arène, projectiles, HUD) | **Fonctionnel** | Assets CC0 dans `public/assets/` (planet2 + asteroid1-3) ; build + service 200 |
| Écran de fin / recommencer | **Fonctionnel** | Overlay + clic/Espace → `startGame()` |
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

**5. Contrôle souris** — 🔴 — `DONE`
- Objectif : la raquette suit la souris, de façon fluide.
- Tâches : `src/controls/mouse.ts` — convertir la position du pointeur en angle
  cible → `Command { paddleAngle }` ; brancher dans la scène.
- Dépendances : étape 4 (committée).
- Avancement : module pur posé (aucune dépendance Phaser, testable) ; scène
  avance le moteur à pas fixe (1/60 s, accumulateur) avec la commande du
  pointeur ; texte de débogage temporaire (angle/score/game over) pour valider
  sans le rendu de l'étape 6. `keyboard.ts` (rotation auto) reste hors chemin
  d'exécution — décision D5 toujours ouverte.
- Validation : 9 tests (`src/controls/__tests__/mouse.test.ts`) : angles
  cardinaux, indépendance à la distance, poursuite à `PADDLE_SPEED`, cible
  atteinte sans dépassement, changement de cible en cours de route. `npm test`
  25/25, `npm run build` vert, modules servis par Vite (200).
- Reste : fluidité vérifiée en jeu au navigateur par le groupe, puis passage à
  `DONE`.

**6. Rendu de l'arène : noyau + raquette** — 🔴 — `DONE`
- Objectif : voir le noyau au centre et la raquette sur son arc.
- Tâches : dans `DeflectScene`, dessiner noyau et arc de raquette depuis
  l'état moteur (lecture seule) ; scène relie état → rendu chaque frame.
- Avancement : noyau sprite `public/assets/core.png` (planet2, dépôt officiel
  d'exemples Phaser, CC0, mise à l'échelle sur `CORE_RADIUS`) ; raquette en arc
  vectoriel (`Graphics.arc`, 12 px, cyan) synchronisée sur l'angle moteur.
- Dépendances : étape 4.
- Validation (faite) : `npm run build` vert, assets servis par Vite (200).
  Reste : conforme en jeu — position de l'angle vérifiée visuellement au
  navigateur avec l'étape 5, puis `DONE`.

**7. Rendu des projectiles + boucle pas-à-pas** — 🔴 — `DONE`
- Objectif : les projectiles apparaissent, volent, rebondissent ou éliminent le
  joueur — la partie complète se déroule à l'écran.
- Tâches : avance du moteur à pas fixe (1/60 s) depuis la boucle Phaser
  (accumulateur si nécessaire), sprites des projectiles synchronisés sur
  `state.projectiles`, gestion du `gameOver`.
- Avancement : accumulateur 1/60 s en place ; sprites `asteroid1-3.png` (CC0)
  synchronisés par id dans une Map (création/retrait au fil de l'état), seed
  incrémenté à chaque partie.
- Dépendances : étapes 5-6.
- Validation (faite) : build + modules servis (200). Reste : partie entière
  jouée sans la console au navigateur, rebonds visibles, `DONE`.

**8. HUD : score et temps** — 🔴 — `DONE`
- Objectif : feedback minimal du score et du temps survécu.
- Tâches : texte Phaser mis à jour depuis `state.score` / `state.elapsed`.
- Avancement : HUD texte en haut de l'arène (`Score N · Survie X s`).
- Dépendances : étape 7.
- Validation (faite) : build. Reste : score affiché = score moteur après
  renvois, vérifié en jeu, puis `DONE`.

**9. Écran de fin + recommencer** — 🔴 — `DONE`
- Objectif : fin lisible et redémarrage sans recharger la page.
- Tâches : overlay « GAME OVER + score » sur `gameOver`, bouton/touche restart
  qui recrée l'état (`createInitialState`) et relance la scène.
- Avancement : overlay sombre + score + survie + invite ; restart par clic ou
  Espace (`startGame()` recrée l'état et nettoie sprites/overlay).
- Dépendances : étapes 7-8.
- Validation (faite) : build. Reste : enchaîner 2 parties complètes sans
  recharger au navigateur, puis `DONE`.

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
