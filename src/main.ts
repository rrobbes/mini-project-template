// Point d'entrée navigateur — étape 2 : démarre la scène Phaser.
// Le moteur reste pur (aucune dépendance au rendu) : l'UI lira son état
// dans les tranches suivantes de l'étape 2, via src/ui/game.ts.
import Phaser from 'phaser';
import { DeflectScene } from './ui/game';
import { WORLD_SIZE } from './engine';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WORLD_SIZE,
  height: WORLD_SIZE,
  backgroundColor: '#111827',
  scene: [DeflectScene],
});
