// Contrôleur CLI : session agent persistante réutilisant le moteur tel quel.
// L'état de la partie est sérialisé en JSON entre les invocations de la CLI,
// ce qui permet la boucle agent : lire l'état, décider, avancer, relire.
import * as fs from 'node:fs';
import { Command, GameState, createInitialState, step } from '../engine';

/** Pas de simulation fixe — garantit un moteur déterministe. */
export const DT = 1 / 60;

export interface CliSession {
  state: GameState;
  /** Angle cible de la raquette (commande en attente), ou null. */
  targetAngle: number | null;
}

/** Chemin du fichier de session (personnalisable via DEFLECT_SESSION). */
export function sessionPath(): string {
  return process.env.DEFLECT_SESSION ?? '.deflect-session.json';
}

/** Vérifie qu'un objet chargé ressemble bien à un état de jeu. */
function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.worldSize === 'number' &&
    typeof s.score === 'number' &&
    typeof s.elapsed === 'number' &&
    typeof s.gameOver === 'boolean' &&
    typeof s.seed === 'number' &&
    Array.isArray(s.projectiles) &&
    typeof s.paddle === 'object' && s.paddle !== null &&
    typeof s.core === 'object' && s.core !== null
  );
}

/**
 * Charge la session depuis le fichier, ou repart d'un état initial neuf
 * si le fichier est absent ou corrompu.
 */
export function loadSession(seed: number = 1): CliSession {
  const path = sessionPath();
  if (fs.existsSync(path)) {
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
      const state = data?.state ?? data;
      if (isGameState(state)) {
        return { state, targetAngle: typeof data?.targetAngle === 'number' ? data.targetAngle : null };
      }
    } catch {
      // Fichier corrompu : on repart d'une nouvelle partie.
    }
  }
  return { state: createInitialState(seed), targetAngle: null };
}

/** Écrit la session sur disque (atomic write pour éviter les sessions à moitié écrites). */
export function saveSession(session: CliSession): void {
  const tmp = `${sessionPath()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(session, null, 2));
  fs.renameSync(tmp, sessionPath());
}

/**
 * Enregistre un déplacement : angle cible absolu sur l'arc.
 * Le mouvement effectif est appliqué par le moteur au pas suivant
 * (orientation instantanée) — la CLI ne contourne pas le moteur.
 */
export function applyCommand(session: CliSession, cmd: Command): void {
  if (cmd.paddleAngle === undefined) return;
  session.targetAngle = cmd.paddleAngle;
}

/** Avance la simulation de n pas (dt fixe), avec la commande en attente. */
export function advance(session: CliSession, n: number): void {
  const cmd: Command =
    session.targetAngle === null ? {} : { paddleAngle: session.targetAngle };
  for (let i = 0; i < n && !session.state.gameOver; i++) {
    step(session.state, cmd, DT);
  }
}
