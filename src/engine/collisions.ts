import { GameState, Projectile, Paddle } from './types';

/** Convertit un angle de raquette en position du centre de l'arc sur le cercle. */
export function paddleCenter(state: GameState, paddle: Paddle) {
  const c = state.core.pos;
  return {
    x: c.x + Math.cos(paddle.angle) * paddle.distance,
    y: c.y + Math.sin(paddle.angle) * paddle.distance,
  };
}

/** Demi-longueur de corde de l'arc de la raquette. */
function paddleHalfChord(paddle: Paddle): number {
  return paddle.distance * Math.sin(paddle.arcLength / 2);
}

/**
 * Teste si un projectile touche la raquette (approximation : distance segment-point).
 * Retourne true si rebond.
 */
export function hitPaddle(state: GameState, p: Projectile): boolean {
  const c = paddleCenter(state, state.paddle);
  const half = paddleHalfChord(state.paddle);
  // Axe tangentiel de l'arc (perpendiculaire au rayon)
  const tx = -Math.sin(state.paddle.angle);
  const ty = Math.cos(state.paddle.angle);
  // Projection du projectile sur cet axe, relative au centre de la raquette
  const rel = { x: p.pos.x - c.x, y: p.pos.y - c.y };
  const along = rel.x * tx + rel.y * ty;       // position le long de l'arc
  const perp = rel.x * Math.cos(state.paddle.angle) + rel.y * Math.sin(state.paddle.angle); // distance radiale
  return Math.abs(along) <= half && Math.abs(perp) <= p.radius + 4;
}

/** Teste si un projectile touche le noyau. */
export function hitCore(state: GameState, p: Projectile): boolean {
  const dx = p.pos.x - state.core.pos.x;
  const dy = p.pos.y - state.core.pos.y;
  return Math.hypot(dx, dy) <= state.core.radius + p.radius;
}

/** Rebond : inverse la composante radiale de la vélocité (rebond vers l'extérieur). */
export function reflect(state: GameState, p: Projectile): void {
  const dx = p.pos.x - state.core.pos.x;
  const dy = p.pos.y - state.core.pos.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len, ny = dy / len;
  // Vitesse radiale (projetée sur la normale)
  const vRadial = p.vel.x * nx + p.vel.y * ny;
  p.vel.x -= 2 * vRadial * nx;
  p.vel.y -= 2 * vRadial * ny;
  // Légère accélération pour récompenser le renvoi
  p.vel.x *= 1.05;
  p.vel.y *= 1.05;
}
