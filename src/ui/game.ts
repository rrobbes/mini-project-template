// UI Phaser — scène vide, première tranche de l'étape 2.
// Les tranches suivantes créeront ici les sprites du noyau, de la raquette
// et des projectiles en lisant l'état du moteur (import de src/engine),
// sans jamais écrire dans le moteur depuis l'UI.
import Phaser from 'phaser';

export class DeflectScene extends Phaser.Scene {
  constructor() {
    super('deflect');
  }

  create(): void {
    // Scène vide volontaire : la boucle moteur → rendu arrive ensuite.
  }
}
