// Tests du moteur : déterminisme, collisions, difficulté.
// Le moteur étant pur, aucun mock n'est nécessaire.
import { describe, it, expect } from 'vitest';
import { createInitialState, step } from '../index';
import { reflect, hitCore, hitPaddle } from '../collisions';
import { difficulty } from '../spawner';
import { Command, GameState, PROJECTILE_RADIUS } from '../types';

const DT = 1 / 60;

/** Simule n pas avec la même commande, en s'arrêtant sur game over. */
function run(state: GameState, n: number, cmd: Command = {}): void {
  for (let i = 0; i < n && !state.gameOver; i++) step(state, cmd, DT);
}

describe('déterminisme du moteur', () => {
  it('même seed et mêmes commandes → état identique', () => {
    const a = createInitialState(42);
    const b = createInitialState(42);
    const cmd: Command = { paddleAngle: 2.5 };
    run(a, 600, cmd);
    run(b, 600, cmd);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('seeds différents → parties différentes', () => {
    const a = createInitialState(1);
    const b = createInitialState(2);
    run(a, 60);
    run(b, 60);
    expect(JSON.stringify(b)).not.toBe(JSON.stringify(a));
  });

  it('step 120 est équivalent à deux fois step 60', () => {
    const one = createInitialState(7);
    run(one, 120);
    const two = createInitialState(7);
    run(two, 60);
    run(two, 60);
    expect(JSON.stringify(two)).toBe(JSON.stringify(one));
  });

  it('une commande sans cible ne déplace pas la raquette', () => {
    const a = createInitialState(3);
    const b = createInitialState(3);
    run(a, 120);
    run(b, 120, {});
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
});

describe('raquette', () => {
  it('le déplacement vers la cible est instantané', () => {
    const state = createInitialState(1);
    step(state, { paddleAngle: Math.PI / 2 }, DT);
    expect(state.paddle.angle).toBeCloseTo(Math.PI / 2, 10);
    // Changer de cible s'applique aussi immédiatement.
    step(state, { paddleAngle: -0.3 }, DT);
    expect(state.paddle.angle).toBeCloseTo(-0.3, 10);
  });

  it('le raccourci angulaire emprunte le chemin le plus court', () => {
    const state = createInitialState(1);
    // De 350° vers 10° : par le nord, pas par le sud.
    state.paddle.angle = (350 * Math.PI) / 180;
    step(state, { paddleAngle: (10 * Math.PI) / 180 }, DT);
    // 350° + 20° = 370° = 10° modulo 2π : l'angle brut reste continu.
    expect(state.paddle.angle).toBeCloseTo((370 * Math.PI) / 180, 10);
  });

  it('un renvoi de raquette vaut 1 point et renvoie le projectile', () => {
    const state = createInitialState(1);
    // Projectile exactement sur la raquette (angle 0 → centre à (520, 400)),
    // se dirigeant vers le noyau.
    const p = {
      id: 99,
      pos: { x: state.core.pos.x + state.paddle.distance, y: state.core.pos.y },
      vel: { x: -100, y: 0 },
      radius: PROJECTILE_RADIUS,
    };
    expect(hitPaddle(state, p)).toBe(true);
    state.projectiles.push(p);
    step(state, {}, DT);
    expect(state.score).toBe(1);
    expect(p.vel.x).toBeGreaterThan(0); // repart vers l'extérieur
  });
});

describe('collisions et fin de partie', () => {
  it('un projectile sur le noyau met fin à la partie', () => {
    const state = createInitialState(1);
    const p = {
      id: 99,
      pos: { x: state.core.pos.x, y: state.core.pos.y },
      vel: { x: 0, y: -10 },
      radius: PROJECTILE_RADIUS,
    };
    expect(hitCore(state, p)).toBe(true);
    state.projectiles.push(p);
    step(state, {}, DT);
    expect(state.gameOver).toBe(true);
  });

  it('reflect inverse la composante radiale de la vitesse', () => {
    const state = createInitialState(1);
    // Projectile au-dessus du noyau, se dirigeant vers le bas.
    const p = {
      id: 99,
      pos: { x: state.core.pos.x, y: state.core.pos.y - 120 },
      vel: { x: 0, y: 100 },
      radius: PROJECTILE_RADIUS,
    };
    reflect(state, p);
    // La normale radiale est (0, -1) : vy devient -100, puis ×1.05.
    expect(p.vel.x).toBeCloseTo(0, 10);
    expect(p.vel.y).toBeCloseTo(-105, 5);
  });
});

describe('difficulté', () => {
  it('la vitesse augmente et l\'intervalle de spawn diminue avec le temps', () => {
    const early = difficulty(0);
    const late = difficulty(30);
    expect(late.speed).toBeGreaterThan(early.speed);
    expect(late.spawnInterval).toBeLessThan(early.spawnInterval);
  });
});
