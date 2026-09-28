/**
 * Parallax background: a stack of horizontally tiling layers, each pre-rendered ONCE to an
 * offscreen canvas (procedural placeholder art), then blitted with a parallax factor.
 * Layers can react to the beat (bounce/scale) through the Groove.
 *
 * Creative-agnostic: replace `makePlaceholderLayers` with real art (images drawn to canvases)
 * and keep the same ParallaxLayer contract.
 */
import { VIEW_H, VIEW_W, makeCanvas } from '../engine/display';
import { makeRng, mod } from '../engine/math';
import type { BeatReactSpec, SkyPreset } from '../level/types';
import { type Groove, applyBeatReact } from './groove';

export interface ParallaxLayer {
  canvas: HTMLCanvasElement;
  /** 0 = static, 1 = moves with the world */
  factor: number;
  /** vertical parallax factor */
  factorY: number;
  /** screen y of the canvas top when camera y == 0 */
  y: number;
  react?: BeatReactSpec;
}

/** Lighting presets (DESIGN §3 lighting arc): sky gradient + haze laid over the far layers. */
export const SKY_PRESETS: Record<SkyPreset, { stops: [number, string][]; haze: string; hazeA: number; stars: number }> = {
  // 42nd Street golden hour: faded ochre
  golden: { stops: [[0, '#C9A874'], [0.55, '#DCC7A0'], [1, '#E9D8B4']], haze: '#DCC7A0', hazeA: 0.45, stars: 0 },
  // neon marquee dusk -> night
  neon: { stops: [[0, '#150F1E'], [0.55, '#2A1E3A'], [0.85, '#4A2A4E'], [1, '#6A3A5A']], haze: '#2A1E3A', hazeA: 0.35, stars: 1 },
  // the honky-tonk bar: warm lamplight on timber, a back-bar of glowing bottles (interior backdrop)
  honkytonk: { stops: [[0, '#2E2118'], [0.5, '#4E3A2C'], [1, '#7A5A40']], haze: '#4E3A2C', hazeA: 0.55, stars: 0 },
};

export class Background {
  private sky: HTMLCanvasElement;
  private skies: Record<SkyPreset, HTMLCanvasElement>;
  /** current lighting: cross-fade from -> to by k (set by the renderer from level sky cues) */
  skyFrom: SkyPreset = 'golden';
  skyTo: SkyPreset = 'golden';
  skyK = 1;
  /** beat glow overlay, pre-rendered (gradients are expensive to build per frame) */
  private glow: HTMLCanvasElement;
  private layers: ParallaxLayer[];
  /** 0..1 extra flash (fx 'bgPulse' / section changes) */
  pulse = 0;

  constructor(seed: number) {
    this.sky = makeSky();
    this.skies = { golden: makePresetSky('golden'), neon: makePresetSky('neon'), honkytonk: makePresetSky('honkytonk') };
    this.glow = makeGlow();
    this.layers = makePlaceholderLayers(seed);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, g: Groove): void {
    ctx.drawImage(this.skies[this.skyFrom] ?? this.sky, 0, 0, VIEW_W, VIEW_H);
    if (this.skyK < 1 && this.skyTo !== this.skyFrom) {
      ctx.globalAlpha = this.skyK;
      ctx.drawImage(this.skies[this.skyTo], 0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    } else if (this.skyTo !== this.skyFrom) ctx.drawImage(this.skies[this.skyTo], 0, 0, VIEW_W, VIEW_H);
    // beat glow on the horizon
    const glow = 0.1 * g.pulse(1, 0.35) + 0.18 * g.pulse(4, 0.8) + this.pulse * 0.5;
    if (glow > 0.01) {
      ctx.globalAlpha = Math.min(1, glow);
      ctx.drawImage(this.glow, 0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    for (const L of this.layers) {
      const w = L.canvas.width;
      const ox = -mod(camX * L.factor, w);
      let dy = -camY * L.factorY;
      let sy = 1;
      if (L.react) {
        const r = applyBeatReact(L.react, g);
        dy += r.dy;
        sy = r.sy;
      }
      const y = L.y + dy;
      const h = L.canvas.height;
      for (let x = ox; x < VIEW_W; x += w) {
        if (sy !== 1) ctx.drawImage(L.canvas, x, y + h * (1 - sy), w, h * sy);
        else ctx.drawImage(L.canvas, x, y);
      }
      // aerial haze: far layers lose contrast and take the sky's colour (DESIGN §3 rules)
      const pre = SKY_PRESETS[this.skyK >= 0.5 ? this.skyTo : this.skyFrom];
      ctx.globalAlpha = pre.hazeA * (1 - L.factor);
      ctx.fillStyle = pre.haze;
      ctx.fillRect(0, Math.max(0, y), VIEW_W, VIEW_H - Math.max(0, y));
      ctx.globalAlpha = 1;
    }
  }
}

function makePresetSky(name: SkyPreset): HTMLCanvasElement {
  const pre = SKY_PRESETS[name];
  const [c, ctx] = makeCanvas(VIEW_W / 2, VIEW_H / 2);
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  for (const [o, col] of pre.stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  if (pre.stars) {
    const rng = makeRng(7);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 90; i++) {
      const s = rng() * 1.6 + 0.3;
      ctx.fillRect(rng() * c.width, rng() * c.height * 0.45, s, s);
    }
  }
  // Big Jim's pagoda on the horizon (placeholder silhouette: the goal, always visible)
  ctx.fillStyle = name === 'golden' ? 'rgba(94,43,78,0.45)' : 'rgba(10,8,12,0.75)';
  const bx = c.width * 0.82;
  let by = c.height * 0.66;
  for (let f = 0; f < 5; f++) {
    const w = 70 - f * 11;
    ctx.fillRect(bx - w / 2, by - 22, w, 22);
    ctx.beginPath();
    ctx.moveTo(bx - w / 2 - 16, by - 22);
    ctx.lineTo(bx, by - 34);
    ctx.lineTo(bx + w / 2 + 16, by - 22);
    ctx.closePath();
    ctx.fill();
    by -= 30;
  }
  if (name === 'neon') {
    // aviator glints in the top window
    ctx.fillStyle = 'rgba(201,211,218,0.9)';
    ctx.fillRect(bx - 8, by - 4, 6, 4);
    ctx.fillRect(bx + 2, by - 4, 6, 4);
  }
  if (name === 'honkytonk') {
    // indoors: a back-bar with shelves of glowing bottles and neon beer signs instead of a sky
    ctx.fillStyle = '#2E2118';
    ctx.fillRect(0, 0, c.width, c.height);
    const rng2 = makeRng(3);
    for (let shelf = 0; shelf < 3; shelf++) {
      const sy = c.height * (0.28 + shelf * 0.16);
      ctx.fillStyle = '#4E3A2C';
      ctx.fillRect(0, sy, c.width, 6);
      for (let x = 6; x < c.width; x += 14 + rng2() * 10) {
        const h = 18 + rng2() * 22;
        ctx.fillStyle = ['rgba(47,163,122,0.7)', 'rgba(201,138,58,0.7)', 'rgba(126,58,48,0.7)', 'rgba(233,216,180,0.5)'][Math.floor(rng2() * 4)];
        ctx.fillRect(x, sy - h, 8, h);
        ctx.fillRect(x + 2, sy - h - 8, 4, 8);
      }
    }
    for (const [nx, col] of [[0.18, 'rgba(70,214,160,0.8)'], [0.62, 'rgba(224,86,155,0.8)']] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.strokeRect(c.width * nx, c.height * 0.08, 110, 34);
    }
  }
  return c;
}

function makeGlow(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(VIEW_W / 4, VIEW_H / 4);
  const x = c.width * 0.7;
  const y = c.height * 0.62;
  const grad = ctx.createRadialGradient(x, y, 2, x, y, c.width * 0.6);
  grad.addColorStop(0, '#ffd27a');
  grad.addColorStop(1, 'rgba(255,120,80,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function makeSky(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(VIEW_W / 2, VIEW_H / 2);
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, '#1b1846');
  g.addColorStop(0.55, '#5a2d6e');
  g.addColorStop(0.85, '#d9606a');
  g.addColorStop(1, '#ffb070');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  // sun
  const sx = c.width * 0.7;
  const sy = c.height * 0.62;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 160);
  sg.addColorStop(0, 'rgba(255,240,200,1)');
  sg.addColorStop(0.25, 'rgba(255,200,140,0.9)');
  sg.addColorStop(1, 'rgba(255,140,120,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, c.width, c.height);
  // stars
  const rng = makeRng(7);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 90; i++) {
    const x = rng() * c.width;
    const y = rng() * c.height * 0.45;
    const s = rng() * 1.6 + 0.3;
    ctx.fillRect(x, y, s, s);
  }
  return c;
}

function ridge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: number,
  amp: number,
  color: string,
  rng: () => number,
  jag: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  const pts = Math.floor(w / jag);
  // periodic so it tiles: sum of sines with integer periods over w + jitter that wraps
  const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
  for (let i = 0; i <= pts; i++) {
    const x = (i / pts) * w;
    const t = (x / w) * Math.PI * 2;
    const y = base - amp * (0.55 * Math.sin(t * 2 + ph[0]) + 0.3 * Math.sin(t * 5 + ph[1]) + 0.15 * Math.sin(t * 11 + ph[2]));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function makePlaceholderLayers(seed: number): ParallaxLayer[] {
  const rng = makeRng(seed * 31 + 5);
  const layers: ParallaxLayer[] = [];

  // far mountains
  {
    const [c, ctx] = makeCanvas(2048, 520);
    ridge(ctx, c.width, c.height, 250, 170, '#40306e', rng, 16);
    ridge(ctx, c.width, c.height, 340, 90, '#342760', rng, 24);
    layers.push({ canvas: c, factor: 0.08, factorY: 0.03, y: VIEW_H * 0.38 });
  }
  // mid hills with "speaker towers" (bounce on the beat)
  {
    const [c, ctx] = makeCanvas(1600, 520);
    ridge(ctx, c.width, c.height, 300, 80, '#2a1f55', rng, 20);
    for (let i = 0; i < 5; i++) {
      const x = (i + 0.3 + rng() * 0.4) * (c.width / 5);
      const tw = 60 + rng() * 40;
      const th = 160 + rng() * 140;
      ctx.fillStyle = '#231a4a';
      ctx.fillRect(x - tw / 2, 300 - th, tw, th + 200);
      ctx.fillStyle = '#ff9e6e';
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(x, 300 - th + 30 + k * 45, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    layers.push({ canvas: c, factor: 0.25, factorY: 0.08, y: VIEW_H * 0.42, react: { every: 1, kind: 'bob', amount: 7 } });
  }
  // near silhouettes (squash on beat)
  {
    const [c, ctx] = makeCanvas(1400, 420);
    ridge(ctx, c.width, c.height, 290, 40, '#1a1338', rng, 12);
    ctx.fillStyle = '#1a1338';
    for (let i = 0; i < 9; i++) {
      const x = rng() * c.width;
      const r = 50 + rng() * 70;
      ctx.beginPath();
      ctx.arc(x, 290 - r * 0.3, r, 0, Math.PI * 2);
      ctx.fill();
      // wrap for tiling
      ctx.beginPath();
      ctx.arc(x - c.width, 290 - r * 0.3, r, 0, Math.PI * 2);
      ctx.arc(x + c.width, 290 - r * 0.3, r, 0, Math.PI * 2);
      ctx.fill();
    }
    layers.push({ canvas: c, factor: 0.5, factorY: 0.2, y: VIEW_H * 0.58, react: { every: 1, kind: 'squash', amount: 0.03, decay: 0.2 } });
  }
  return layers;
}
