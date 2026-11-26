// Tests de la session CLI persistante : chargement, sauvegarde, corruption,
// commande d'angle cible appliquée par le moteur.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  CliSession,
  loadSession,
  saveSession,
  applyCommand,
  advance,
} from '../cli';
import { createInitialState, PADDLE_SPEED } from '../../engine';

const DT = 1 / 60;
const SESSION = path.join(os.tmpdir(), `deflect-test-session-${process.pid}.json`);

beforeEach(() => {
  vi.stubEnv('DEFLECT_SESSION', SESSION);
});

afterEach(() => {
  vi.unstubAllEnvs();
  if (fs.existsSync(SESSION)) fs.rmSync(SESSION);
});

describe('session persistante', () => {
  it('fichier absent → partie neuve', () => {
    const session = loadSession();
    expect(session.state.score).toBe(0);
    expect(session.state.elapsed).toBe(0);
    expect(session.state.projectiles).toEqual([]);
    expect(session.targetAngle).toBeNull();
  });

  it('une session sauvegardée se recharge à l\'identique', () => {
    const session: CliSession = {
      state: createInitialState(5),
      targetAngle: null,
    };
    applyCommand(session, { paddleAngle: 1.5 });
    advance(session, 90);
    saveSession(session);

    const reloaded = loadSession();
    expect(reloaded.targetAngle).toBe(1.5);
    expect(JSON.stringify(reloaded.state)).toBe(JSON.stringify(session.state));
  });

  it('fichier corrompu → partie neuve (pas de crash)', () => {
    fs.writeFileSync(SESSION, '{ ceci n\'est pas du json');
    const session = loadSession();
    expect(session.state.score).toBe(0);
    expect(session.state.elapsed).toBe(0);
    expect(session.targetAngle).toBeNull();
  });

  it('fichier valide mais état incohérent → partie neuve', () => {
    fs.writeFileSync(SESSION, JSON.stringify({ state: { score: 'x' } }));
    const session = loadSession();
    expect(session.state.score).toBe(0);
  });
});

describe('commande d\'angle cible', () => {
  it('applyCommand sans angle ne change pas la cible', () => {
    const session = loadSession();
    applyCommand(session, {});
    expect(session.targetAngle).toBeNull();
  });

  it('l\'angle cible est atteint à la vitesse PADDLE_SPEED, pas instantanément', () => {
    const session = loadSession();
    // Cible à π rad : hors de portée d'un seul step (PADDLE_SPEED * dt = 0.1 rad).
    applyCommand(session, { paddleAngle: Math.PI });
    expect(session.state.paddle.angle).toBe(0);

    advance(session, 30); // 0,5 s → au plus 3,0 rad, π ≈ 3,1416 non atteint
    expect(session.state.paddle.angle).toBeCloseTo(30 * PADDLE_SPEED * DT, 10);
    expect(session.state.paddle.angle).toBeLessThan(Math.PI);

    advance(session, 30); // 0,5 s de plus → cible atteinte sans la dépasser
    expect(session.state.paddle.angle).toBeCloseTo(Math.PI, 10);
  });

  it('advance s\'arrête dès que la partie est terminée', () => {
    const session = loadSession();
    // Projectile pile sur le noyau : la partie se termine au premier pas.
    session.state.projectiles.push({
      id: 99,
      pos: { x: session.state.core.pos.x, y: session.state.core.pos.y },
      vel: { x: 0, y: -10 },
      radius: 8,
    });
    advance(session, 10);
    expect(session.state.gameOver).toBe(true);
    expect(session.state.elapsed).toBeLessThan(10 * DT);
  });
});
