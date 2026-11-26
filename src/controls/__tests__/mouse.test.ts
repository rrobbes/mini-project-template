// Tests du contrôle souris : conversion pointeur → angle → commande moteur.
import { describe, it, expect } from 'vitest';
import { createInitialState, step } from '../../engine';
import { pointerToPaddleAngle, mouseCommand } from '../mouse';

const DT = 1 / 60;

function state() {
  return createInitialState(1);
}

describe('pointerToPaddleAngle', () => {
  it('pointeur à droite du noyau → angle 0', () => {
    const s = state();
    expect(
      pointerToPaddleAngle(s, { x: s.core.pos.x + 100, y: s.core.pos.y }),
    ).toBeCloseTo(0, 10);
  });

  it('pointeur sous le noyau → angle π/2', () => {
    const s = state();
    expect(
      pointerToPaddleAngle(s, { x: s.core.pos.x, y: s.core.pos.y + 100 }),
    ).toBeCloseTo(Math.PI / 2, 10);
  });

  it('pointeur à gauche du noyau → angle π', () => {
    const s = state();
    expect(
      pointerToPaddleAngle(s, { x: s.core.pos.x - 100, y: s.core.pos.y }),
    ).toBeCloseTo(Math.PI, 10);
  });

  it('pointeur au-dessus du noyau → angle -π/2', () => {
    const s = state();
    expect(
      pointerToPaddleAngle(s, { x: s.core.pos.x, y: s.core.pos.y - 100 }),
    ).toBeCloseTo(-Math.PI / 2, 10);
  });

  it('la distance du pointeur ne change pas l\'angle (contrôle angulaire)', () => {
    const s = state();
    const near = pointerToPaddleAngle(s, { x: s.core.pos.x + 50, y: s.core.pos.y + 50 });
    const far = pointerToPaddleAngle(s, { x: s.core.pos.x + 500, y: s.core.pos.y + 500 });
    expect(near).toBeCloseTo(far, 10);
  });
});

describe('mouseCommand → moteur', () => {
  it('la commande vise l\'angle du pointeur', () => {
    const s = state();
    const pointer = { x: s.core.pos.x - 120, y: s.core.pos.y }; // gauche → π
    expect(mouseCommand(s, pointer).paddleAngle).toBeCloseTo(Math.PI, 10);
  });

  it('un pas de simulation oriente instantanément la raquette vers le pointeur', () => {
    const s = state();
    const pointer = { x: s.core.pos.x - 120, y: s.core.pos.y }; // angle π
    step(s, mouseCommand(s, pointer), DT);
    expect(s.paddle.angle).toBeCloseTo(Math.PI, 10);
  });

  it('la raquette reste sur le pointeur pendant toute la simulation', () => {
    const s = state();
    const pointer = { x: s.core.pos.x - 120, y: s.core.pos.y }; // angle π
    const cmd = mouseCommand(s, pointer);
    for (let i = 0; i < 120 && !s.gameOver; i++) step(s, cmd, DT);
    expect(s.paddle.angle).toBeCloseTo(Math.PI, 10);
  });

  it('le pointeur bouge en cours de route : la cible suit', () => {
    const s = state();
    // D'abord vers le haut (angle -π/2)...
    let cmd = mouseCommand(s, { x: s.core.pos.x, y: s.core.pos.y - 120 });
    for (let i = 0; i < 60 && !s.gameOver; i++) step(s, cmd, DT);
    expect(s.paddle.angle).toBeCloseTo(-Math.PI / 2, 10);
    // ...puis vers la droite (angle 0) : raccourci angulaire par le haut.
    cmd = mouseCommand(s, { x: s.core.pos.x + 120, y: s.core.pos.y });
    for (let i = 0; i < 60 && !s.gameOver; i++) step(s, cmd, DT);
    expect(s.paddle.angle).toBeCloseTo(0, 10);
  });
});
