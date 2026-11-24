import { GameState, Command, PADDLE_SPEED } from './types';
import { makeRng } from './rng';
import { spawnProjectile, difficulty } from './spawner';
import { hitPaddle, hitCore, reflect } from './collisions';

/** Avance la simulation d'un pas de dt secondes. Modifie l'état en place. */
export function step(state: GameState, cmd: Command, dt: number): void {
  if (state.gameOver) return;

  const rng = makeRng(state.seed + Math.floor(state.elapsed * 1000) + state.nextId);

  // 1. Déplacer la raquette vers l'angle cible (vitesse limitée)
  if (cmd.paddleAngle !== undefined) {
    let diff = cmd.paddleAngle - state.paddle.angle;
    // Raccourci angulaire (ex: passer de 350° à 10°)
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const maxStep = PADDLE_SPEED * dt;
    state.paddle.angle += Math.max(-maxStep, Math.min(maxStep, diff));
  }

  // 2. Spawn de projectiles selon l'intervalle de difficulté
  const { spawnInterval } = difficulty(state.elapsed);
  const sinceLast = state.elapsed % spawnInterval;
  if (sinceLast + dt >= spawnInterval || state.projectiles.length === 0) {
    const p = spawnProjectile(state, rng);
    state.projectiles.push(p);
    state.nextId++;
  }

  // 3. Déplacer les projectiles
  for (const p of state.projectiles) {
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
  }

  // 4. Collisions
  const survivors: typeof state.projectiles = [];
  for (const p of state.projectiles) {
    if (hitCore(state, p)) {
      state.gameOver = true;
      return;
    }
    if (hitPaddle(state, p)) {
      reflect(state, p);
      state.score++;
      continue; // le projectile repart, il reste en jeu
    }
    // Supprimer les projectiles sortis du monde (ex: après rebond raté)
    if (p.pos.x < -50 || p.pos.x > state.worldSize + 50 || p.pos.y < -50 || p.pos.y > state.worldSize + 50) {
      continue;
    }
    survivors.push(p);
  }
  state.projectiles = survivors;

  // 5. Temps
  state.elapsed += dt;
}
