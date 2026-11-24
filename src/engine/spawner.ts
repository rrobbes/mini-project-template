import { GameState, Projectile, WORLD_SIZE, PROJECTILE_RADIUS } from './types';
import { makeRng } from './rng';

/**
 * Difficulté croissante : vitesse et fréquence augmentent avec le temps.
 * Retourne la vitesse de base et l'intervalle de spawn (en secondes).
 */
export function difficulty(elapsed: number): { speed: number; spawnInterval: number } {
  const speed = 80 + elapsed * 6;          // px/s, accélère avec le temps
  const spawnInterval = Math.max(0.25, 1.2 - elapsed * 0.03); // spawn de plus en plus fréquent
  return { speed, spawnInterval };
}

/** Fait apparaître un projectile depuis un bord vers le noyau. */
export function spawnProjectile(state: GameState, rng: () => number): Projectile {
  const { worldSize, core } = state;
  // Choisir un bord au hasard (0=haut, 1=droite, 2=bas, 3=gauche)
  const side = Math.floor(rng() * 4);
  let x: number, y: number;
  if (side === 0) { x = rng() * worldSize; y = -PROJECTILE_RADIUS; }
  else if (side === 1) { x = worldSize + PROJECTILE_RADIUS; y = rng() * worldSize; }
  else if (side === 2) { x = rng() * worldSize; y = worldSize + PROJECTILE_RADIUS; }
  else { x = -PROJECTILE_RADIUS; y = rng() * worldSize; }

  // Direction vers le noyau
  const dx = core.pos.x - x;
  const dy = core.pos.y - y;
  const len = Math.hypot(dx, dy);
  const speed = difficulty(state.elapsed).speed;

  return {
    id: state.nextId,
    pos: { x, y },
    vel: { x: (dx / len) * speed, y: (dy / len) * speed },
    radius: PROJECTILE_RADIUS,
  };
}
