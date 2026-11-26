// Placeholder contrôles clavier/souris — sera remplacé/complété par la webcam.
// Ici : la raquette tourne lentement en rond pour tester le moteur.
import { Command } from '../engine';

export function keyboardControl(elapsed: number): Command {
  return { paddleAngle: elapsed * 2 }; // rotation douce pour le test
}
