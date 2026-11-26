// Direction artistique Neon Cyber / Cosmic Energy — couleurs et typographie.
// Toutes les valeurs visuelles de l'UI sont ici ; le moteur n'en dépend pas.
export const PALETTE = {
  background: '#050811',      // fond principal
  atmosphere: '#14283E',      // atmosphère secondaire
  core: 0x22dfff,             // noyau et bouclier (cyan)
  threat: 0xff436d,           // projectiles ennemis (rouge/rose)
  reflected: 0x61ffd2,        // projectiles renvoyés (turquoise)
  text: '#E6F8FF',            // texte principal
  textDim: '#81A6BB',         // texte secondaire
  danger: '#FF436D',          // game over / alertes
  /** Équivalents numériques pour les APIs Phaser (fillStyle, tint...). */
  atmosphereHex: 0x14283e,
  textHex: 0xe6f8ff,
  textDimHex: 0x81a6bb,
} as const;

/** Typographie : Orbitron pour le titre, Space Grotesk pour le HUD. */
export const FONTS = {
  title: 'Orbitron, sans-serif',
  hud: '"Space Grotesk", sans-serif',
} as const;
