// Placeholder UI — le vrai rendu Phaser viendra à l'étape 2.
// Ici on affiche juste l'état en console pour valider la boucle moteur.
import { GameState } from '../engine';

export function render(state: GameState): void {
  const status = state.gameOver ? 'GAME OVER' : `score=${state.score} t=${state.elapsed.toFixed(1)}s projectiles=${state.projectiles.length}`;
  console.log(`[ui] paddle=${(state.paddle.angle * 180 / Math.PI).toFixed(0)}° ${status}`);
}
