// Contrôleur CLI : lit les commandes depuis une interface agent.
// Implémentation complète à l'étape 3 — ici juste la signature.
import { Command } from '../engine';

export interface CliSession {
  state: import('../engine').GameState;
}

export function readState(session: CliSession) {
  return session.state;
}

export function applyCommand(session: CliSession, cmd: Command): void {
  // Sera câblé dans la CLI de l'étape 3.
  void cmd;
}
