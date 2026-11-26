// Vérification automatisée du rendu DEFLECT (Playwright + Firefox headless).
// Usage : node scripts/visual-check.mjs [URL]  (défaut http://localhost:5173)
// Les captures d'écran headless de canvas WebGL sont peu fiables : l'analyse
// des pixels se fait donc directement dans le framebuffer (gl.readPixels,
// avec preserveDrawingBuffer activé dans main.ts).
import { firefox } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:5173';
const OUT = 'reports';
mkdirSync(OUT, { recursive: true });

const near = (a, b, tol) => Math.abs(a - b) <= tol;

const report = {
  consoleErrors: [],
  pageErrors: [],
  loaded: false,
  dpr: null,
  canvasCss: null,
  canvasBuffer: null,
  gl: null,
  fps: { samples: [], min: null, avg: null },
  phaseStart: null,
  phasePlaying: null,
  scoreObserved: 0,
  paddleFollowedMouse: null,
  gameOverReached: false,
  screens: { start: null, playing: null, gameover: null },
};

/** Grille RGBA du canvas (1 pixel sur 4), coordonnées jeu (0-800, origine en haut). */
async function canvasGrid(page) {
  return page.evaluate(() => {
    const c = document.querySelector('#game canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return null;
    const W = c.width;
    const H = c.height;
    const buf = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const step = 4;
    const grid = [];
    for (let y = 0; y < H; y += step) {
      const row = [];
      for (let x = 0; x < W; x += step) {
        const i = ((H - 1 - y) * W + x) * 4; // readPixels : origine en bas
        row.push([buf[i], buf[i + 1], buf[i + 2]]);
      }
      grid.push(row);
    }
    return { step, size: grid.length, grid };
  });
}

/** Compte les pixels de la palette dans une zone canvas (coordonnées jeu). */
function regionCount(grid, step, x0, y0, x1, y1, pred) {
  let n = 0;
  for (let y = Math.floor(y0 / step); y < Math.ceil(y1 / step) && y < grid.length; y++) {
    for (let x = Math.floor(x0 / step); x < Math.ceil(x1 / step) && x < grid[y].length; x++) {
      const [r, g, b] = grid[y][x];
      if (pred(r, g, b)) n++;
    }
  }
  return n;
}

function analyzeScreen(grid, step) {
  return {
    // Éléments attendus, par zone.
    titleOrText: regionCount(grid, step, 250, 270, 550, 340, (r, g, b) => (r + g + b) / 3 > 120),
    coreCenter: regionCount(grid, step, 380, 380, 420, 420, (r, g, b) => g > 100 && b > 120),
    shieldRing: (() => {
      let n = 0;
      for (let a = 0; a < 360; a += 2) {
        const gx = Math.round((400 + Math.cos((a * Math.PI) / 180) * 122) / step);
        const gy = Math.round((400 + Math.sin((a * Math.PI) / 180) * 122) / step);
        if (gy < 0 || gy >= grid.length || gx < 0 || gx >= grid[gy].length) continue;
        const [r, g, b] = grid[gy][gx];
        if (g > 100 && b > 140 && g > r) n++;
      }
      return n;
    })(),
    projectiles: regionCount(grid, step, 0, 0, 800, 800, (r, g, b) => r > 120 && g < 110 && b > 40 && b < 180),
    hudScore: regionCount(grid, step, 20, 28, 90, 62, (r, g, b) => (r + g + b) / 3 > 100),
    cyanTotal: regionCount(grid, step, 0, 0, 800, 800, (r, g, b) => g > 150 && b > 180 && r < g),
  };
}

const browser = await firefox.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') report.consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => report.pageErrors.push(String(err)));

await page.goto(URL);
try {
  await page.waitForFunction(() => window.__deflect?.game?.isRunning, { timeout: 15000 });
  report.loaded = true;
} catch {
  report.loaded = false;
}

const sceneOf = () => page.evaluate(() => window.__deflect?.game?.scene?.getScene('deflect') ?? null);

if (report.loaded) {
  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('#game canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const rect = c.getBoundingClientRect();
    return {
      cssW: rect.width, cssH: rect.height, bufW: c.width, bufH: c.height,
      dpr: window.devicePixelRatio,
      gl: !!gl,
      preserve: gl ? gl.getContextAttributes().preserveDrawingBuffer : false,
    };
  });
  report.canvasCss = `${canvasInfo.cssW.toFixed(0)}x${canvasInfo.cssH.toFixed(0)}`;
  report.canvasBuffer = `${canvasInfo.bufW}x${canvasInfo.bufH}`;
  report.dpr = canvasInfo.dpr;
  report.gl = { webgl: canvasInfo.gl, preserveDrawingBuffer: canvasInfo.preserve };

  // Écran de démarrage.
  report.phaseStart = (await sceneOf())?.phase ?? null;
  let grid = await canvasGrid(page);
  report.screens.start = analyzeScreen(grid.grid, grid.step);
  await page.screenshot({ path: `${OUT}/01-start.png` });

  // Lancer la partie via le bouton JOUER.
  const box = await page.locator('#game canvas').boundingBox();
  const sx = box.width / 800;
  const click = (x, y) => page.mouse.click(box.x + x * sx, box.y + y * sx);
  const move = (x, y) => page.mouse.move(box.x + x * sx, box.y + y * sx);
  await click(400, 480);
  await page.waitForTimeout(400);
  report.phasePlaying = (await sceneOf())?.phase ?? null;

  // Suivi souris.
  const angleBefore = await page.evaluate(() => window.__deflect.game.scene.getScene('deflect').state.paddle.angle);
  await move(600, 400);
  await page.waitForTimeout(700);
  const angleAfter = await page.evaluate(() => window.__deflect.game.scene.getScene('deflect').state.paddle.angle);
  report.paddleFollowedMouse = Math.abs(angleAfter - angleBefore) > 0.3;

  // Grille « playing » tôt (souris immobile : la partie se termine vers 6 s,
  // il faut mesurer avant le game over).
  await page.waitForTimeout(2500);
  report.scoreObserved = (await sceneOf())?.state?.score ?? 0;
  grid = await canvasGrid(page);
  report.screens.playing = analyzeScreen(grid.grid, grid.step);
  await page.screenshot({ path: `${OUT}/02-playing.png` });

  // FPS pendant 5 s (la partie peut se terminer pendant la mesure).
  const samples = await page.evaluate(async () => {
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 5000) {
      out.push(window.__deflect.game.loop.actualFps);
      await new Promise((r) => setTimeout(r, 250));
    }
    return out;
  });
  report.fps.samples = samples.map((v) => +v.toFixed(1));
  report.fps.min = +Math.min(...samples).toFixed(1);
  report.fps.avg = +(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1);

  // Attendre le game over.
  try {
    await page.waitForFunction(
      () => window.__deflect?.game?.scene?.getScene('deflect')?.phase === 'gameover',
      { timeout: 90000 },
    );
    report.gameOverReached = true;
  } catch {
    report.gameOverReached = false;
  }
  await page.waitForTimeout(1400);
  grid = await canvasGrid(page);
  report.screens.gameover = analyzeScreen(grid.grid, grid.step);
  await page.screenshot({ path: `${OUT}/03-gameover.png` });
}

await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

// Affichage compact.
const { screens, fps } = report;
console.log(JSON.stringify({
  loaded: report.loaded,
  errors: report.consoleErrors.length + report.pageErrors.length,
  gl: report.gl,
  phases: `${report.phaseStart} -> ${report.phasePlaying} | gameover=${report.gameOverReached}`,
  paddleFollowedMouse: report.paddleFollowedMouse,
  score: report.scoreObserved,
  fps: `avg ${fps.avg} / min ${fps.min}`,
  start: screens.start,
  playing: screens.playing,
  gameover: screens.gameover,
}, null, 2));

// Critères de succès.
const ok =
  report.loaded &&
  report.consoleErrors.length === 0 &&
  report.pageErrors.length === 0 &&
  report.phasePlaying === 'playing' &&
  report.gameOverReached &&
  report.paddleFollowedMouse &&
  fps.avg > 45 &&
  screens.start.titleOrText > 200 &&
  screens.playing.coreCenter > 20 &&
  screens.playing.shieldRing > 5 &&
  screens.playing.cyanTotal > 50 &&
  screens.gameover.titleOrText > 200;
process.exit(ok ? 0 : 1);
