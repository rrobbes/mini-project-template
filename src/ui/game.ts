// UI Phaser — DEFLECT v0.2 « Neon Cyber / Cosmic Energy ».
// La scène lit l'état du moteur (jamais d'écriture directe) et l'affiche avec
// interpolation entre les pas de simulation (60 Hz fixes), pour un rendu fluide
// quelle que soit la cadence d'affichage. Tous les effets visuels et sonores
// sont déclenchés par des changements observés dans l'état moteur : ils ne
// participent jamais à la simulation déterministe.
import Phaser from 'phaser';
import {
  createInitialState,
  step,
  GameState,
  Command,
  WORLD_SIZE,
  CORE_RADIUS,
  PADDLE_DISTANCE,
} from '../engine';
import { mouseCommand } from '../controls/mouse';
import { buildTextures } from './textures';
import { PALETTE, FONTS } from './palette';
import { initAudio, playBounce, playExplosion, playUiClick } from './audio';

const DT = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
const R = WORLD_SIZE / 2;
const BEST_KEY = 'deflect.best';

type Phase = 'start' | 'playing' | 'gameover';

/** Un projectile menace-t-il le noyau (s'en rapproche) ? Purement visuel. */
function isThreat(state: GameState, id: number): boolean {
  const p = state.projectiles.find((x) => x.id === id);
  if (!p) return false;
  const dx = state.core.pos.x - p.pos.x;
  const dy = state.core.pos.y - p.pos.y;
  return p.vel.x * dx + p.vel.y * dy > 0;
}

export class DeflectScene extends Phaser.Scene {
  // ── Simulation (lecture seule) ────────────────────────────────────────────
  private state!: GameState;
  private accumulator = 0;
  private seed = 1;
  private phase: Phase = 'start';

  // État interpolé pour le rendu (état juste avant le dernier pas).
  private prevAngle = 0;
  private prevPos = new Map<number, { x: number; y: number }>();

  // ── Objets de rendu ──────────────────────────────────────────────────────
  private coreGroup!: Phaser.GameObjects.Container;
  private coreGlow!: Phaser.GameObjects.Image;
  private coreOrb!: Phaser.GameObjects.Image;
  private coreRingA!: Phaser.GameObjects.Image;
  private coreRingB!: Phaser.GameObjects.Image;
  private paddleGfx!: Phaser.GameObjects.Graphics;
  private trailGfx!: Phaser.GameObjects.Graphics;
  private projectiles = new Map<number, Phaser.GameObjects.Image>();
  private trailHistory: number[] = [];
  private paddleFlash = 0;
  private lastAngle = 0;
  private prevThreat = new Map<number, boolean>();

  // ── HUD et écrans ────────────────────────────────────────────────────────
  private hudScore!: Phaser.GameObjects.Text;
  private hudBest!: Phaser.GameObjects.Text;
  private hudTime!: Phaser.GameObjects.Text;
  private hudLevel!: Phaser.GameObjects.Text;
  private startScreen?: Phaser.GameObjects.Container;
  private overScreen?: Phaser.GameObjects.Container;
  private lastScoreText = '';
  private lastTimeText = '';
  private lastLevelText = '';
  private best = 0;

  constructor() {
    super('deflect');
  }

  create(): void {
    buildTextures(this);
    this.loadBest();
    this.buildArena();
    this.buildCore();
    this.paddleGfx = this.add.graphics();
    this.trailGfx = this.add.graphics();
    this.buildHud();
    this.state = createInitialState(this.seed++);
    this.showStartScreen();

    // Clic n'importe où : initialise l'audio (politique d'autoplay),
    // espace : démarrage rapide.
    this.input.on('pointerdown', () => initAudio());
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.phase === 'start') this.startGame();
    });
  }

  // ── Construction des couches visuelles ───────────────────────────────────

  private buildArena(): void {
    this.add.image(R, R, 'bg-glow');
    const stars = this.add.image(R, R, 'starfield').setScale(1.15).setAlpha(0.9);
    this.add.image(R, R, 'grid');
    this.add.image(R, R, 'rings');
    // Léger mouvement parallaxe du champ d'étoiles.
    this.tweens.add({
      targets: stars,
      x: R - 10,
      y: R - 6,
      duration: 9000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildCore(): void {
    const ring = (radius: number, alpha: number): Phaser.GameObjects.Image => {
      const key = `core-ring-${radius}`;
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.lineStyle(3, PALETTE.core, 1);
        g.beginPath();
        g.arc(R, R, radius, 0, (Math.PI * 4) / 3, false);
        g.strokePath();
        g.lineStyle(2, PALETTE.core, 0.7);
        g.beginPath();
        g.arc(R, R, radius - 6, Math.PI, (Math.PI * 7) / 3, false);
        g.strokePath();
        g.generateTexture(key, WORLD_SIZE, WORLD_SIZE);
        g.destroy();
      }
      return this.add.image(R, R, key).setAlpha(alpha);
    };
    this.coreRingA = ring(52, 0.5);
    this.coreRingB = ring(66, 0.3);

    // Sphère énergétique : halo large + orbe cyan + centre blanc.
    this.coreGlow = this.add.image(R, R, 'glow').setScale(0.55).setTint(PALETTE.core).setAlpha(0.5);
    this.coreGroup = this.add.container(R, R);
    this.coreOrb = this.add.image(0, 0, 'glow').setScale(0.16).setTint(PALETTE.core);
    this.coreGroup.add([this.coreOrb, this.add.image(0, 0, 'glow').setScale(0.07)]);

    // Particules orbitales.
    for (let i = 0; i < 4; i++) {
      const dot = this.add.image(0, 0, 'particle').setScale(0.7).setTint(PALETTE.core).setAlpha(0.8);
      this.coreGroup.add(dot);
      const base = (i * Math.PI) / 2;
      const orbit = (t: number) => {
        const a = base + t;
        dot.setPosition(Math.cos(a) * 40, Math.sin(a) * 40);
      };
      orbit(base);
      this.tweens.addCounter({
        from: 0,
        to: Math.PI * 2,
        duration: 2600 + i * 900,
        repeat: -1,
        onUpdate: (t) => orbit(t.getValue() ?? 0),
      });
    }
    void CORE_RADIUS;
  }

  private buildHud(): void {
    const hudStyle = (size: number, color: string) => ({
      fontFamily: FONTS.hud,
      fontSize: `${size}px`,
      color,
      fontStyle: '700',
    });
    this.add
      .text(R, 30, 'D E F L E C T', { fontFamily: FONTS.title, fontSize: '21px', color: PALETTE.textDim })
      .setOrigin(0.5);
    this.add.text(24, 18, 'SCORE', hudStyle(12, PALETTE.textDim)).setAlpha(0.85);
    this.hudScore = this.add.text(24, 32, '0', hudStyle(26, PALETTE.text));
    this.add.text(WORLD_SIZE - 24, 18, 'RECORD', hudStyle(12, PALETTE.textDim)).setOrigin(1, 0).setAlpha(0.85);
    this.hudBest = this.add.text(WORLD_SIZE - 24, 32, String(this.best), hudStyle(26, PALETTE.text)).setOrigin(1, 0);
    this.hudTime = this.add.text(R, WORLD_SIZE - 26, '', hudStyle(15, PALETTE.textDim)).setOrigin(0.5, 1);
    this.add.text(24, WORLD_SIZE - 26, 'SOURIS', hudStyle(12, PALETTE.textDim)).setOrigin(0, 1);
    this.hudLevel = this.add.text(WORLD_SIZE - 24, WORLD_SIZE - 26, 'NIVEAU 1', hudStyle(12, PALETTE.textDim)).setOrigin(1, 1);
  }

  // ── Écrans (démarrage / game over) ────────────────────────────────────────

  private makeButton(label: string, y: number, onClick: () => void): Phaser.GameObjects.Container {
    const w = 220;
    const h = 54;
    if (!this.textures.exists('btn-bg')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(PALETTE.atmosphereHex, 0.9);
      g.fillRoundedRect(2, 2, w, h, 12);
      g.lineStyle(1, PALETTE.core, 0.8);
      g.strokeRoundedRect(2, 2, w, h, 12);
      g.generateTexture('btn-bg', w + 4, h + 4);
      g.destroy();
    }
    const btnBg = this.add.image(2, 2, 'btn-bg');
    const txt = this.add
      .text(0, 0, label, { fontFamily: FONTS.title, fontSize: '20px', color: PALETTE.text })
      .setOrigin(0.5);
    const container = this.add.container(R, y, [btnBg, txt]);
    container.setSize(w, h).setInteractive({ useHandCursor: true });
    container.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.06, duration: 120 }));
    container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 120 }));
    container.on('pointerdown', () => {
      initAudio();
      playUiClick();
      onClick();
    });
    return container;
  }

  private fadeOutScreen(screen: Phaser.GameObjects.Container): void {
    screen.getAll().forEach((obj) => {
      const interactive = obj as Phaser.GameObjects.Container;
      if (typeof interactive.disableInteractive === 'function') interactive.disableInteractive();
    });
    this.tweens.add({ targets: screen, alpha: 0, duration: 200, onComplete: () => screen.destroy() });
  }

  private showStartScreen(): void {
    this.phase = 'start';
    const dim = this.add.graphics().fillStyle(0x050811, 0.45).fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    const title = this.add
      .text(R, 300, 'D E F L E C T', { fontFamily: FONTS.title, fontSize: '64px', color: PALETTE.text })
      .setOrigin(0.5);
    const sub = this.add
      .text(R, 372, 'Protégez le noyau — renvoyez les projectiles', {
        fontFamily: FONTS.hud,
        fontSize: '17px',
        color: PALETTE.textDim,
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(R, 404, 'Bougez la souris pour orienter le bouclier', {
        fontFamily: FONTS.hud,
        fontSize: '14px',
        color: PALETTE.textDim,
      })
      .setOrigin(0.5);
    const button = this.makeButton('JOUER', 480, () => this.startGame());
    this.startScreen = this.add.container(0, 0, [dim, title, sub, hint, button]).setAlpha(0);
    this.tweens.add({ targets: this.startScreen, alpha: 1, duration: 400 });
  }

  private showGameOverScreen(): void {
    const newRecord = this.state.score >= this.best && this.state.score > 0;
    const dim = this.add.graphics().fillStyle(0x050811, 0.6).fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    const title = this.add
      .text(R, 296, 'GAME OVER', { fontFamily: FONTS.title, fontSize: '52px', color: PALETTE.danger })
      .setOrigin(0.5);
    const items: Phaser.GameObjects.GameObject[] = [dim, title];
    let y = 360;
    if (newRecord) {
      items.push(
        this.add
          .text(R, y, 'NOUVEAU RECORD', { fontFamily: FONTS.title, fontSize: '16px', color: '#61FFD2' })
          .setOrigin(0.5),
      );
      y += 34;
    }
    items.push(
      this.add
        .text(R, y, `Score : ${this.state.score}   ·   Survie : ${this.state.elapsed.toFixed(1)} s`, {
          fontFamily: FONTS.hud,
          fontSize: '19px',
          color: PALETTE.text,
        })
        .setOrigin(0.5),
    );
    y += 30;
    items.push(
      this.add
        .text(R, y, `Record : ${this.best}`, { fontFamily: FONTS.hud, fontSize: '15px', color: PALETTE.textDim })
        .setOrigin(0.5),
    );
    items.push(this.makeButton('REJOUER', 492, () => this.startGame()));
    this.overScreen = this.add.container(0, 0, items).setAlpha(0);
    this.tweens.add({ targets: this.overScreen, alpha: 1, duration: 350 });
  }

  // ── Cycle de jeu ─────────────────────────────────────────────────────────

  private startGame(): void {
    for (const screen of [this.startScreen, this.overScreen]) {
      if (screen) this.fadeOutScreen(screen);
    }
    this.startScreen = undefined;
    this.overScreen = undefined;
    for (const img of this.projectiles.values()) img.destroy();
    this.projectiles.clear();
    this.prevThreat.clear();
    this.trailHistory = [];
    this.paddleFlash = 0;
    this.accumulator = 0;
    this.state = createInitialState(this.seed++);
    // Le noyau reprend son aspect normal après une destruction.
    this.coreGroup.setAlpha(1).setScale(1);
    this.coreGlow.setAlpha(0.5).setScale(0.55);
    this.cameras.main.resetFX();
    this.phase = 'playing';
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000; // clamp : jamais de rattrapage en rafale
    this.ambient(time);

    if (this.phase === 'playing') {
      this.simulate(dt);
      this.detectEvents();
    }

    const alpha = Phaser.Math.Clamp(this.accumulator / DT, 0, 1);
    this.renderGame(alpha, dt);
    this.renderHud();
  }

  /** Avance la simulation à pas fixe, en mémorisant l'état du pas précédent. */
  private simulate(dt: number): void {
    this.accumulator += dt;
    const steps = Math.min(Math.floor(this.accumulator / DT), MAX_STEPS_PER_FRAME);
    if (steps <= 0) return;
    this.accumulator -= steps * DT;
    let remaining = steps;
    while (remaining-- > 0 && !this.state.gameOver) {
      this.snapshot();
      const cmd: Command = mouseCommand(this.state, this.input.activePointer);
      step(this.state, cmd, DT);
    }
  }

  private snapshot(): void {
    this.prevAngle = this.state.paddle.angle;
    this.prevPos.clear();
    for (const p of this.state.projectiles) {
      this.prevPos.set(p.id, { x: p.pos.x, y: p.pos.y });
    }
  }

  /**
   * Effets déclenchés par des changements *observés* de l'état moteur.
   * Aucun effet en retour n'écrit dans la simulation.
   */
  private detectEvents(): void {
    for (const p of this.state.projectiles) {
      const now = isThreat(this.state, p.id);
      const prev = this.prevThreat.get(p.id);
      if (prev === true && now === false) this.onIntercept(p.pos.x, p.pos.y);
      this.prevThreat.set(p.id, now);
    }
    if (this.state.gameOver && this.phase === 'playing') this.onGameOver();
  }

  // ── Effets ───────────────────────────────────────────────────────────────

  private onIntercept(x: number, y: number): void {
    this.paddleFlash = 1;

    // Onde de choc circulaire.
    const shock = this.add.image(x, y, 'shock').setTint(PALETTE.reflected).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: shock,
      scale: { from: 0.15, to: 1.4 },
      alpha: { from: 0.9, to: 0 },
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => shock.destroy(),
    });

    // Émission de particules.
    const burst = this.add.particles(x, y, 'particle', {
      speed: { min: 60, max: 220 },
      lifespan: 420,
      scale: { start: 1.1, end: 0 },
      quantity: 14,
      tint: PALETTE.reflected,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    burst.explode(14, x, y);
    this.time.delayedCall(700, () => burst.destroy());

    // Texte flottant « +1 ».
    const plus = this.add
      .text(x, y - 14, '+1', { fontFamily: FONTS.hud, fontSize: '18px', color: '#61FFD2', fontStyle: '700' })
      .setOrigin(0.5);
    this.tweens.add({
      targets: plus,
      y: y - 46,
      alpha: 0,
      duration: 550,
      ease: 'Cubic.easeOut',
      onComplete: () => plus.destroy(),
    });

    // Pulsation du score.
    this.tweens.add({
      targets: this.hudScore,
      scale: { from: 1.35, to: 1 },
      duration: 160,
      ease: 'Quad.easeOut',
    });
    playBounce();
  }

  private onGameOver(): void {
    this.phase = 'gameover';
    const { x, y } = this.state.core.pos;
    playExplosion();
    this.cameras.main.shake(240, 0.009);

    // Explosion énergétique du noyau.
    const boom = this.add.particles(x, y, 'particle', {
      speed: { min: 120, max: 420 },
      lifespan: 900,
      scale: { start: 1.6, end: 0 },
      quantity: 40,
      tint: [PALETTE.core, 0xffffff, PALETTE.reflected],
      blendMode:Phaser.BlendModes.ADD,
      emitting: false,
    });
    boom.explode(40, x, y);
    this.time.delayedCall(1200, () => boom.destroy());

    // Effondrement du noyau.
    this.tweens.add({ targets: this.coreGlow, alpha: 0, scale: 1.1, duration: 500, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: this.coreGroup, alpha: 0.15, scale: 0.4, duration: 600, ease: 'Cubic.easeIn' });

    // Meilleur score — stockage UI uniquement, hors moteur.
    if (this.state.score > this.best) {
      this.best = this.state.score;
      this.hudBest.setText(String(this.best));
      try {
        localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        /* stockage indisponible : sans conséquence */
      }
    }

    // Transition animée vers l'écran Game Over.
    this.time.delayedCall(750, () => this.showGameOverScreen());
  }

  // ── Rendu (lecture seule de l'état, interpolée) ────────────────────────────

  /** Animations d'ambiance, hors simulation. */
  private ambient(time: number): void {
    const t = time / 1000;
    this.coreOrb.setScale(0.16 * (1 + Math.sin(t * 2.2) * 0.06));   // pulsation douce
    this.coreGlow.setScale(0.55 * (1 + Math.sin(t * 1.6) * 0.08)); // halo
    this.coreRingA.rotation = t * 0.6;                             // anneaux
    this.coreRingB.rotation = -t * 0.4;
  }

  private renderGame(alpha: number, dt: number): void {
    // Angle interpolé : le moteur ne normalise jamais l'angle, il est
    // continu — aucune discontinuité possible autour de ±π.
    const angle = Phaser.Math.Linear(this.prevAngle, this.state.paddle.angle, alpha);
    const { arcLength } = this.state.paddle;
    this.trailGfx.clear();

    // Traînée du bouclier pendant les déplacements rapides.
    const speed = Math.abs(angle - this.lastAngle) / Math.max(dt, 1 / 240);
    this.lastAngle = angle;
    this.trailHistory.unshift(angle);
    if (this.trailHistory.length > 7) this.trailHistory.pop();
    const trailStrength = Phaser.Math.Clamp((speed - 2) / 6, 0, 1);
    if (trailStrength > 0.02 && this.phase === 'playing') {
      this.trailHistory.slice(1).forEach((a, i) => {
        const fade = (1 - (i + 1) / 7) * trailStrength;
        this.trailGfx.lineStyle(9, PALETTE.core, 0.28 * fade);
        this.trailGfx.beginPath();
        this.trailGfx.arc(R, R, PADDLE_DISTANCE, a - arcLength / 2, a + arcLength / 2, false);
        this.trailGfx.strokePath();
      });
    }

    // Bouclier : couches de glow, arc principal, centre lumineux, bouts ronds.
    this.paddleFlash = Math.max(0, this.paddleFlash - dt * 3.5);
    const flash = this.paddleFlash;
    this.paddleGfx.clear();
    if (this.phase !== 'gameover') {
      const shield = (width: number, color: number, alpha: number) => {
        this.paddleGfx.lineStyle(width, color, alpha);
        this.paddleGfx.beginPath();
        this.paddleGfx.arc(R, R, PADDLE_DISTANCE, angle - arcLength / 2, angle + arcLength / 2, false);
        this.paddleGfx.strokePath();
      };
      shield(26, PALETTE.core, 0.1 + 0.18 * flash);
      shield(15, PALETTE.core, 0.28 + 0.3 * flash);
      shield(8, PALETTE.core, 0.95);
      shield(3, 0xffffff, 0.85 + 0.15 * flash);
      for (const dir of [-1, 1]) {
        const a = angle + (dir * arcLength) / 2;
        this.paddleGfx.fillStyle(PALETTE.core, 0.95);
        this.paddleGfx.fillCircle(R + Math.cos(a) * PADDLE_DISTANCE, R + Math.sin(a) * PADDLE_DISTANCE, 4.5);
      }
    }

    // Projectiles énergétiques : orbes interpolés, teinte menace/renvoyé,
    // traînées orientées selon la vitesse.
    const alive = new Set<number>();
    for (const p of this.state.projectiles) {
      alive.add(p.id);
      const prev = this.prevPos.get(p.id);
      const px = prev ? Phaser.Math.Linear(prev.x, p.pos.x, alpha) : p.pos.x;
      const py = prev ? Phaser.Math.Linear(prev.y, p.pos.y, alpha) : p.pos.y;
      const threat = isThreat(this.state, p.id);
      const color = threat ? PALETTE.threat : PALETTE.reflected;
      const vlen = Math.hypot(p.vel.x, p.vel.y) || 1;
      const ux = p.vel.x / vlen;
      const uy = p.vel.y / vlen;
      this.trailGfx.lineStyle(4, color, 0.35);
      this.trailGfx.lineBetween(px - ux * 6, py - uy * 6, px - ux * 30, py - uy * 30);
      this.trailGfx.lineStyle(2, color, 0.2);
      this.trailGfx.lineBetween(px - ux * 30, py - uy * 30, px - ux * 52, py - uy * 52);

      let orb = this.projectiles.get(p.id);
      if (!orb) {
        orb = this.add
          .image(px, py, 'orb')
          .setScale((p.radius * 2.6) / 64)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.projectiles.set(p.id, orb);
      }
      orb.setPosition(px, py).setTint(color);
    }
    for (const [id, img] of this.projectiles) {
      if (!alive.has(id)) {
        img.destroy();
        this.projectiles.delete(id);
      }
    }
  }

  /** HUD mis à jour uniquement quand les valeurs changent (pas de re-rendu). */
  private renderHud(): void {
    const scoreText = String(this.state.score);
    if (scoreText !== this.lastScoreText) {
      this.hudScore.setText(scoreText);
      this.lastScoreText = scoreText;
    }
    const timeText = `SURVIE ${this.state.elapsed.toFixed(1)} s`;
    if (timeText !== this.lastTimeText) {
      this.hudTime.setText(timeText);
      this.lastTimeText = timeText;
    }
    const level = `NIVEAU ${1 + Math.floor(this.state.elapsed / 20)}`;
    if (level !== this.lastLevelText) {
      this.hudLevel.setText(level);
      this.lastLevelText = level;
    }
  }

  private loadBest(): void {
    try {
      this.best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
    } catch {
      this.best = 0;
    }
  }
}
