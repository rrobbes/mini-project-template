// CLI agent pour DEFLECT — état persisté entre les invocations.
// Usage : deflect-cli <commande> [argument]
//   state           affiche l'état complet de la partie
//   move <angle>    fixe l'angle cible de la raquette (radians)
//   step [n]        avance la simulation de n pas (défaut 1, 1 pas = 1/60 s)
//   reset           repart d'une nouvelle partie
// Fichier de session : .deflect-session.json (ou $DEFLECT_SESSION).
import { createInitialState } from '../src/engine';
import { advance, applyCommand, loadSession, saveSession } from '../src/controls/cli';

const args = process.argv.slice(2);
const cmd = args[0];

switch (cmd) {
  case 'state': {
    const session = loadSession();
    console.log(JSON.stringify(session.state, null, 2));
    break;
  }
  case 'move': {
    const angle = parseFloat(args[1]);
    if (Number.isNaN(angle)) { console.error('angle requis (radians)'); process.exit(1); }
    const session = loadSession();
    if (session.state.gameOver) { console.error('partie terminée — faites reset'); process.exit(1); }
    applyCommand(session, { paddleAngle: angle });
    saveSession(session);
    console.log(JSON.stringify({ targetAngle: session.targetAngle, paddle: session.state.paddle }));
    break;
  }
  case 'step': {
    const n = Math.max(1, parseInt(args[1] ?? '1', 10) || 1);
    const session = loadSession();
    advance(session, n);
    saveSession(session);
    console.log(JSON.stringify(session.state, null, 2));
    break;
  }
  case 'reset': {
    const fresh = { state: createInitialState(1), targetAngle: null };
    saveSession(fresh);
    console.log(JSON.stringify({ ok: true }));
    break;
  }
  default:
    console.log('Usage: deflect-cli <state|move <angle>|step [n]|reset>');
    process.exit(cmd ? 1 : 0);
}
