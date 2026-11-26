// Types purs du moteur — aucune dépendance à Phaser ni à aucun rendu.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Projectile {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
}

export interface Paddle {
  /** Angle sur l'arc autour du noyau, en radians. */
  angle: number;
  /** Longueur de l'arc (en radians) — taille de la raquette. */
  arcLength: number;
  /** Distance du noyau au centre de la raquette. */
  distance: number;
}

export interface GameState {
  /** Taille du monde (carré). */
  worldSize: number;
  core: { pos: Vec2; radius: number };
  paddle: Paddle;
  projectiles: Projectile[];
  score: number;
  /** Temps écoulé en secondes. */
  elapsed: number;
  gameOver: boolean;
  /** Prochain id de projectile. */
  nextId: number;
  /** Seed du RNG pour le déterminisme. */
  seed: number;
}

/** Commandes envoyées au moteur à chaque pas. */
export interface Command {
  /** Position absolue de la raquette sur l'arc (radians), ou null = ne bouge pas. */
  paddleAngle?: number;
}

export const WORLD_SIZE = 800;
export const CORE_RADIUS = 30;
export const PADDLE_DISTANCE = 120;
export const PADDLE_ARC = Math.PI / 3; // 60 degrés
export const PROJECTILE_RADIUS = 8;
