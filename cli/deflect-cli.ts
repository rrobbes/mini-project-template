// CLI agent pour DEFLECT — étape 3.
// Usage prévu : deflect-cli state | move <angle> | step <n> | reset
import { createInitialState, step, GameState } from '../src/engine';

// État persistant en mémoire pour la session (sera persisté en fichier à l'étape 3).
let state: GameState = createInitialState(1);

const args = process.argv.slice(2);
const cmd = args[0];

switch (cmd) {
  case 'state':
    console.log(JSON.stringify(state, null, 2));
    break;
  case 'move': {
    const angle = parseFloat(args[1]);
    if (Number.isNaN(angle)) { console.error('angle requis'); process.exit(1); }
    state.paddle.angle = angle; // position absolue sur l'arc
    console.log(JSON.stringify({ paddle: state.paddle }));
    break;
  }
  case 'step': {
    const n = parseInt(args[1] ?? '1', 10);
    for (let i = 0; i < n && !state.gameOver; i++) step(state, {}, 1 / 60);
    console.log(JSON.stringify(state, null, 2));
    break;
  }
  case 'reset':
    state = createInitialState(1);
    console.log(JSON.stringify({ ok: true }));
    break;
  default:
    console.log('Usage: deflect-cli <state|move <angle>|step <n>|reset>');
    process.exit(cmd ? 1 : 0);
}
