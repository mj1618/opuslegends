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
import type { BeatReactSpec } from '../level/types';
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

export class Background {
  private sky: HTMLCanvasElement;
  /** beat glow overlay, pre-rendered (gradients are expensive to build per frame) */
  private glow: HTMLCanvasElement;
  private layers: ParallaxLayer[];
  /** 0..1 extra flash (fx 'bgPulse' / section changes) */
  pulse = 0;

  constructor(seed: number) {
    this.sky = makeSky();
    this.glow = makeGlow();
    this.layers = makePlaceholderLayers(seed);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, g: Groove): void {
    ctx.drawImage(this.sky, 0, 0, VIEW_W, VIEW_H);
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
    }
  }
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
