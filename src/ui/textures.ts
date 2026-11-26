// Assets procéduraux : toutes les textures sont générées une seule fois au
// démarrage (pré-calculées), puis réutilisées — aucun rendu coûteux par frame.
// Rendu par couches concentriques pour simuler des dégradés radiaux.
import Phaser from 'phaser';
import { PADDLE_DISTANCE, WORLD_SIZE } from '../engine';
import { PALETTE } from './palette';

const R = WORLD_SIZE / 2;

/** Dégradé radial par empilement de disques : alpha accumulé vers le centre. */
function radialGradient(
  g: Phaser.GameObjects.Graphics,
  size: number,
  color: number,
  maxAlpha: number,
  rings: number,
): void {
  const c = size / 2;
  for (let i = rings; i >= 1; i--) {
    g.fillStyle(color, maxAlpha / rings);
    g.fillCircle(c, c, (i / rings) * c);
  }
}

/** Génère toutes les textures une fois pour toute (cache). */
export function buildTextures(scene: Phaser.Scene): void {
  // Halo doux blanc (teinté au runtime) — atmosphère, glows.
  let g = scene.make.graphics({ x: 0, y: 0 }, false);
  radialGradient(g, 256, 0xffffff, 1, 40);
  g.generateTexture('glow', 256, 256);
  g.destroy();

  // Orbe énergétique (projectile) : centre dense + halo.
  g = scene.make.graphics({ x: 0, y: 0 }, false);
  radialGradient(g, 64, 0xffffff, 0.5, 24);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(32, 32, 7);
  g.generateTexture('orb', 64, 64);
  g.destroy();

  // Particule : point lumineux doux.
  g = scene.make.graphics({ x: 0, y: 0 }, false);
  radialGradient(g, 16, 0xffffff, 1, 12);
  g.generateTexture('particle', 16, 16);
  g.destroy();

  // Onde de choc : anneau fin blanc (teinté au runtime).
  g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.lineStyle(6, 0xffffff, 1);
  g.strokeCircle(48, 48, 44);
  g.generateTexture('shock', 96, 96);
  g.destroy();

  // Champ d'étoiles subtil (statique, généré aléatoirement une fois).
  g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let i = 0; i < 160; i++) {
    const s = Math.random() < 0.85 ? 1 : 2;
    g.fillStyle(0xe6f8ff, 0.12 + Math.random() * 0.5);
    g.fillRect(Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE, s, s);
  }
  g.generateTexture('starfield', WORLD_SIZE, WORLD_SIZE);
  g.destroy();

  // Dégradé radial discret du fond, centré sur le noyau.
  g = scene.make.graphics({ x: 0, y: 0 }, false);
  radialGradient(g, WORLD_SIZE, PALETTE.atmosphereHex, 0.5, 28);
  g.generateTexture('bg-glow', WORLD_SIZE, WORLD_SIZE);
  g.destroy();

  // Grille futuriste très peu opaque.
  g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.lineStyle(1, 0x81a6bb, 0.06);
  for (let p = 0; p <= WORLD_SIZE; p += WORLD_SIZE / 10) {
    g.lineBetween(p, 0, p, WORLD_SIZE);
    g.lineBetween(0, p, WORLD_SIZE, p);
  }
  g.generateTexture('grid', WORLD_SIZE, WORLD_SIZE);
  g.destroy();

  // Anneaux concentriques autour du noyau (repères de distance).
  g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (const radius of [PADDLE_DISTANCE, 200, 280, 352]) {
    g.lineStyle(1, PALETTE.core, radius === PADDLE_DISTANCE ? 0.16 : 0.09);
    g.strokeCircle(R, R, radius);
  }
  g.generateTexture('rings', WORLD_SIZE, WORLD_SIZE);
  g.destroy();
}
