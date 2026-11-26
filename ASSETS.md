# ASSETS — sources et licences

Inventaire des ressources visuelles et sonores de DEFLECT.

## Polices (hébergées localement, `public/fonts/`)

| Fichier | Police | Licence | Source |
|---|---|---|---|
| `Orbitron-700.woff2` | Orbitron 700 (latin) | SIL OFL 1.1 | fonts.google.com/specimen/Orbitron |
| `SpaceGrotesk.woff2` | Space Grotesk (variable 400–700, latin) | SIL OFL 1.1 | fonts.google.com/specimen/Space+Grotesk |

Téléchargées depuis Google Fonts (sous-ensemble latin), chargées via
`@font-face` dans `index.html`. Aucune requête vers des serveurs tiers au
chargement du jeu.

## Textures procédurales (aucun fichier externe)

Toutes les textures du jeu sont générées au démarrage dans
`src/ui/textures.ts` (pré-calculées une fois, puis mises en cache) :
`glow` (halos), `orb` (projectiles), `particle`, `shock` (onde de choc),
`starfield`, `bg-glow` (dégradé radial du fond), `grid`, `rings` (anneaux
concentriques), arcs énergétiques du noyau. Rendu par empilement de disques
concentriques (dégradés radiaux).

## Sons (synthétisés, aucun fichier)

`src/ui/audio.ts` : sons générés en WebAudio à l'exécution (rebond, explosion,
clic d'interface). Aucun asset audio, aucune dépendance.

## Assets retirés

Les sprites `core.png` (planet2) et `asteroid1-3.png` — issus du dépôt officiel
d'exemples Phaser (libres de réutilisation) — ont été utilisés temporairement
en v0.1 puis remplacés par le rendu procédural de la direction artistique
« Neon Cyber / Cosmic Energy ». Ils ne sont plus dans le dépôt.

## Outils de vérification

`scripts/visual-check.mjs` (Playwright + Firefox headless, devDependencies
`playwright` et `pngjs`) : vérification automatisée du rendu par lecture
directe du framebuffer WebGL (`gl.readPixels`, `preserveDrawingBuffer`
activé dans `src/main.ts`). Les captures d'écran PNG (`reports/`, ignoré par
git) peuvent être noires sous Firefox headless — artefact de compositing
WebGL sans GPU, sans incidence sur le rendu réel.
