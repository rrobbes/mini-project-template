// Contrôle souris : convertit la position du pointeur en commande moteur.
// Module pur — aucune dépendance à Phaser : il reçoit un point {x, y} quelconque
// (pointeur Phaser, événement DOM, coordonnées de test) et renvoie une Command.
// Le moteur reste seul responsable du mouvement (orientation instantanée).
import { Command, GameState } from '../engine';

/**
 * Angle de raquette visé par le pointeur, relativement au noyau.
 * Convention du moteur : atan2(dy, dx), x vers la droite, y vers le bas.
 */
export function pointerToPaddleAngle(
  state: GameState,
  pointer: { x: number; y: number },
): number {
  return Math.atan2(pointer.y - state.core.pos.y, pointer.x - state.core.pos.x);
}

/** Commande envoyée au moteur : viser la position du pointeur. */
export function mouseCommand(
  state: GameState,
  pointer: { x: number; y: number },
): Command {
  return { paddleAngle: pointerToPaddleAngle(state, pointer) };
}
