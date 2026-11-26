// Point d'entrée navigateur : charge les polices puis démarre la scène Phaser.
// Le moteur reste pur — l'UI lit son état, les contrôles envoient des Command.
import Phaser from 'phaser';
import { DeflectScene } from './ui/game';
import { WORLD_SIZE } from './engine';
import { PALETTE } from './ui/palette';

async function boot(): Promise<void> {
  // Attendre les polices (Orbitron / Space Grotesk) pour éviter les textes
  // rendus en fallback puis figés dans des textures.
  try {
    await Promise.all([
      document.fonts.load('700 64px Orbitron'),
      document.fonts.load('700 26px "Space Grotesk"'),
      document.fonts.load('400 15px "Space Grotesk"'),
    ]);
    await document.fonts.ready;
  } catch {
    /* polices absentes : rendu en sans-serif système */
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: WORLD_SIZE,
    height: WORLD_SIZE,
    backgroundColor: PALETTE.background,
    // Capture fiable du canvas (tests automatisés, captures d'écran).
    preserveDrawingBuffer: true,
    // Arène responsive : la scène garde son carré 800x800 et s'adapte à la
    // fenêtre, centrée — occupe la majeure partie de l'écran.
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [DeflectScene],
  });

  // Handle d'inspection pour les tests automatisés (FPS, état interne).
  (window as unknown as Record<string, unknown>).__deflect = { game };
}

void boot();
