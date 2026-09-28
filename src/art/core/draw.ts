/** Shared drawing helpers (ink outlines, glows, sparkles, puffs). */
import { type Ctx, type Sprite, artResolution, drawSprite, makeCanvas } from './canvas';
import { TAU } from './math';
import { PAL } from '../palette';

/** Stroke the current path with a thick outline, then fill it (outline stays outside). */
export function inkFill(g: Ctx, fill: string | CanvasGradient, ow = 3, outline: string = PAL.outline): void {
  g.lineWidth = ow * 2;
  g.strokeStyle = outline;
  g.stroke();
  g.fillStyle = fill;
  g.fill();
}

const glowCache = new Map<string, Sprite>();
const GLOW_MAX = 96;

function parseColor(c: string): [number, number, number] {
  if (c.startsWith('#')) {
    const h = c.length === 4 ? c.replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3') : c;
    const n = parseInt(h.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((v) => parseFloat(v));
    return [r, g, b];
  }
  return [255, 255, 255];
}

/**
 * Soft radial glow sprite (radius 64 logical px), cached per colour quantised to 32 levels per
 * channel in a small LRU (lighting transitions produce endless colour variants).
 */
export function glowSprite(color: string): Sprite {
  const [r, g0, b] = parseColor(color).map((v) => Math.round(Math.max(0, Math.min(255, v)) / 8) * 8);
  const key = `${r},${g0},${b}`;
  let s = glowCache.get(key);
  if (s) {
    glowCache.delete(key);
    glowCache.set(key, s);
    return s;
  }
  const R = 64;
  const res = artResolution();
  const c = makeCanvas(R * 2 * res, R * 2 * res);
  const g = c.getContext('2d')!;
  g.setTransform(res, 0, 0, res, R * res, R * res);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
  gr.addColorStop(0, `rgba(${key},1)`);
  gr.addColorStop(0.5, `rgba(${key},0.35)`);
  gr.addColorStop(1, `rgba(${key},0)`);
  g.fillStyle = gr;
  g.fillRect(-R, -R, R * 2, R * 2);
  s = { canvas: c, w: R * 2, h: R * 2, ox: R, oy: R, res };
  glowCache.set(key, s);
  if (glowCache.size > GLOW_MAX) glowCache.delete(glowCache.keys().next().value as string);
  return s;
}

export function drawGlow(g: Ctx, x: number, y: number, color: string, radius: number, alpha = 1, additive = true): void {
  if (alpha <= 0.005) return;
  const s = glowSprite(color);
  const k = radius / 64;
  const pa = g.globalAlpha;
  const op = g.globalCompositeOperation;
  g.globalAlpha = pa * Math.min(1, alpha);
  if (additive) g.globalCompositeOperation = 'lighter';
  drawSprite(g, s, x, y, 0, k, k);
  g.globalAlpha = pa;
  g.globalCompositeOperation = op;
}

export function glowCacheSize(): number {
  return glowCache.size;
}

export function star4(g: Ctx, x: number, y: number, R: number, rot: number, col: string, thin = 0.22): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? R : R * thin;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.restore();
}

/** Perfect / reward sparkle: white 4-point star with gold core + additive glow. */
export function sparkle(g: Ctx, x: number, y: number, R: number, rot = 0, alpha = 1): void {
  if (alpha <= 0.01) return;
  drawGlow(g, x, y, PAL.gold, R * 2.2, alpha * 0.7);
  const pa = g.globalAlpha;
  g.globalAlpha = pa * alpha;
  star4(g, x, y, R, rot, '#FFFFFF');
  star4(g, x, y, R * 0.5, rot + 0.4, PAL.gold);
  g.globalAlpha = pa;
}

export function puff(g: Ctx, x: number, y: number, r: number, alpha: number, col = '#F4F0E6'): void {
  if (alpha <= 0.01) return;
  const pa = g.globalAlpha;
  g.globalAlpha = pa * alpha;
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.arc(x + r * 0.8, y + r * 0.2, r * 0.7, 0, TAU);
  g.arc(x - r * 0.7, y + r * 0.3, r * 0.6, 0, TAU);
  g.fill();
  g.globalAlpha = pa;
}

/** Filled circle helper */
export function disc(g: Ctx, x: number, y: number, r: number, col: string): void {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}
