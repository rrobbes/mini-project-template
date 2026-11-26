// Sons synthétisés en WebAudio — aucun asset externe, aucune dépendance.
// Indépendant de la simulation : échoue silencieusement si l'API manque.

let ctx: AudioContext | null = null;

/** À appeler sur un geste utilisateur (autoplay policy des navigateurs). */
export function initAudio(): void {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** Béep court et agréable (rebond de raquette). */
export function playBounce(): void {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(1040, t + 0.08);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

/** Explosion grave au game over (baisse de fréquence + bruit filtré). */
export function playExplosion(): void {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(32, t + 0.5);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.6);

  // Bruit blanc filtré, dispersé sur 0,4 s.
  const len = Math.floor(ctx.sampleRate * 0.4);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const noiseGain = ctx.createGain();
  noise.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  noiseGain.gain.value = 0.18;
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  noise.start(t);
}

/** Petit clic d'interface (boutons). */
export function playUiClick(): void {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(880, t);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}
