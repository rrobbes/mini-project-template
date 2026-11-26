// UI Phaser — v0.1 : rendu complet du jeu (arène, projectiles, HUD, fin).
// La scène lit l'état du moteur et l'affiche ; elle ne modifie jamais le
// moteur autrement qu'en lui envoyant des Command via step().
// Assets : dépôt officiel d'exemples Phaser (planet2, asteroid1-3), CC0.
import Phaser from 'phaser';
import { createInitialState, step, GameState, Command, WORLD_SIZE, CORE_RADIUS } from '../engine';
import { mouseCommand } from '../controls/mouse';

/** Pas de simulation fixe — identique à la CLI, moteur déterministe. */
const DT = 1 / 60;
/** Textures des projectiles, choisies par id pour la variété. */
const ASTEROID_KEYS = ['asteroid1', 'asteroid2', 'asteroid3'] as const;

export class DeflectScene extends Phaser.Scene {
  private state!: GameState;
  private accumulator = 0;
  /** Seed initial, incrémenté à chaque redémarrage (le moteur reste déterministe). */
  private seed = 1;
  private core!: Phaser.GameObjects.Image;
  private paddleGfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private projectiles = new Map<number, Phaser.GameObjects.Image>();

  constructor() {
    super('deflect');
  }

  preload(): void {
    this.load.image('core', 'assets/core.png');
    for (const key of ASTEROID_KEYS) this.load.image(key, `assets/${key}.png`);
  }

  create(): void {
    // Rendu statique : noyau, raquette (arc vectoriel), HUD.
    this.core = this.add
      .image(WORLD_SIZE / 2, WORLD_SIZE / 2, 'core')
      .setScale((CORE_RADIUS * 2) / 444); // texture 444 px → diamètre du noyau
    this.paddleGfx = this.add.graphics();
    this.hud = this.add
      .text(WORLD_SIZE / 2, 12, '', { color: '#e5e7eb', fontSize: '18px' })
      .setOrigin(0.5, 0);

    this.startGame();

    // Redémarrage après game over : clic ou Espace.
    this.input.on('pointerdown', () => {
      if (this.state.gameOver) this.startGame();
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.state.gameOver) this.startGame();
    });
  }

  /** (Re)démarre une partie — recrée l'état moteur, nettoie l'écran de fin. */
  private startGame(): void {
    for (const obj of this.overlay) obj.destroy();
    this.overlay = [];
    for (const img of this.projectiles.values()) img.destroy();
    this.projectiles.clear();
    this.accumulator = 0;
    this.state = createInitialState(this.seed++);
  }

  update(_time: number, delta: number): void {
    // Accumulateur : pas fixe 1/60 s quelle que soit la cadence d'affichage.
    this.accumulator += delta / 1000;
    while (this.accumulator >= DT && !this.state.gameOver) {
      const cmd: Command = mouseCommand(this.state, this.input.activePointer);
      step(this.state, cmd, DT);
      this.accumulator -= DT;
    }
    if (this.state.gameOver) this.accumulator = 0;
    this.sync();
  }

  /** Lecture seule de l'état moteur → rendu Phaser. */
  private sync(): void {
    // Raquette : arc autour du noyau.
    const c = this.state.core.pos;
    const { angle, arcLength, distance } = this.state.paddle;
    this.paddleGfx.clear();
    this.paddleGfx.lineStyle(12, 0x38bdf8, 1);
    this.paddleGfx.beginPath();
    this.paddleGfx.arc(c.x, c.y, distance, angle - arcLength / 2, angle + arcLength / 2, false);
    this.paddleGfx.strokePath();

    // Projectiles : synchronisés par id (création/retrait au fil de l'état).
    const alive = new Set<number>();
    for (const p of this.state.projectiles) {
      alive.add(p.id);
      let img = this.projectiles.get(p.id);
      if (!img) {
        img = this.add
          .image(p.pos.x, p.pos.y, ASTEROID_KEYS[p.id % ASTEROID_KEYS.length])
          .setScale((p.radius * 2) / 32); // texture 32 px → diamètre du projectile
        this.projectiles.set(p.id, img);
      }
      img.setPosition(p.pos.x, p.pos.y);
      img.rotation += 0.05; // rotation purement visuelle
    }
    for (const [id, img] of this.projectiles) {
      if (!alive.has(id)) {
        img.destroy();
        this.projectiles.delete(id);
      }
    }

    // HUD.
    this.hud.setText(
      `Score ${this.state.score}   ·   Survie ${this.state.elapsed.toFixed(1)} s`,
    );

    if (this.state.gameOver && this.overlay.length === 0) this.showGameOver();
  }

  private showGameOver(): void {
    const style = (color: string, size: string): Phaser.Types.GameObjects.Text.TextStyle => ({
      color,
      fontSize: size,
    });
    const dim = this.add
      .graphics()
      .fillStyle(0x000000, 0.6)
      .fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    const title = this.add
      .text(WORLD_SIZE / 2, WORLD_SIZE / 2 - 70, 'GAME OVER', style('#f87171', '52px'))
      .setOrigin(0.5);
    const score = this.add
      .text(
        WORLD_SIZE / 2,
        WORLD_SIZE / 2,
        `Score : ${this.state.score}   ·   Survie : ${this.state.elapsed.toFixed(1)} s`,
        style('#e5e7eb', '22px'),
      )
      .setOrigin(0.5);
    const hint = this.add
      .text(WORLD_SIZE / 2, WORLD_SIZE / 2 + 60, 'Cliquez ou appuyez sur Espace pour rejouer', style('#93c5fd', '16px'))
      .setOrigin(0.5);
    this.overlay = [dim, title, score, hint];
  }
}
