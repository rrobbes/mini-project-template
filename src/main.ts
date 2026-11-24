// Point d'entrée minimal : boucle moteur + rendu console + contrôle clavier.
// Remplacé par Phaser à l'étape 2.
import { createInitialState, step } from './engine';
import { render } from './ui/game';
import { keyboardControl } from './controls/keyboard';

const DT = 1 / 60;

function main() {
  const state = createInitialState(42);
  let steps = 0;
  while (!state.gameOver && steps < 60 * 30) { // max 30s pour le test
    step(state, keyboardControl(state.elapsed), DT);
    if (steps % 30 === 0) render(state);
    steps++;
  }
  render(state);
  console.log(`Partie terminée : score=${state.score}`);
}

main();
