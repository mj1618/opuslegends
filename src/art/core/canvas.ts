/**
 * Offscreen canvas + sprite cache helpers.
 *
 * All art caches are rendered at `artResolution()` device pixels per logical pixel (default 1).
 * The game should call `setArtResolution(backingStoreWidth / 1920)` once; caches rebuild lazily.
 */
export type Ctx = CanvasRenderingContext2D;

let RES = 1;
let generation = 0;

export function setArtResolution(scale: number): void {
  const s = Math.max(0.25, Math.min(3, scale));
  if (Math.abs(s - RES) < 1e-3) return;
  RES = s;
  generation++;
  spriteCache.clear();
}
export const artResolution = () => RES;
/** bumps whenever caches must be rebuilt (resolution change) */
export const artGeneration = () => generation;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): Ctx {
  const g = c.getContext('2d');
  if (!g) throw new Error('2d context unavailable');
  return g;
}

/**
 * A cached drawing. (ox, oy) = logical position of the drawing's origin inside the sprite,
 * so `drawSprite(ctx, s, x, y)` puts the origin at (x, y).
 */
export interface Sprite {
  canvas: HTMLCanvasElement;
  /** logical size */
  w: number;
  h: number;
  ox: number;
  oy: number;
  res: number;
}

const spriteCache = new Map<string, Sprite>();

/**
 * Get or build a cached sprite. `draw` paints in logical units with the origin at (0,0);
 * the sprite covers [-ox, w-ox] x [-oy, h-oy].
 */
export function sprite(
  key: string,
  w: number,
  h: number,
  ox: number,
  oy: number,
  draw: (g: Ctx) => void,
  resMul = 1,
): Sprite {
  let s = spriteCache.get(key);
  if (s) return s;
  const res = RES * resMul;
  const c = makeCanvas(w * res, h * res);
  const g = ctx2d(c);
  g.setTransform(res, 0, 0, res, ox * res, oy * res);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  draw(g);
  s = { canvas: c, w, h, ox, oy, res };
  spriteCache.set(key, s);
  return s;
}

export function hasSprite(key: string): boolean {
  return spriteCache.has(key);
}

export function drawSprite(g: Ctx, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = 1): void {
  if (rot === 0 && sx === 1 && sy === 1) {
    g.drawImage(s.canvas, x - s.ox, y - s.oy, s.w, s.h);
    return;
  }
  g.save();
  g.translate(x, y);
  if (rot) g.rotate(rot);
  if (sx !== 1 || sy !== 1) g.scale(sx, sy);
  g.drawImage(s.canvas, -s.ox, -s.oy, s.w, s.h);
  g.restore();
}

/** stats for the lab perf readout */
export function spriteCacheStats(): { count: number; pixels: number } {
  let px = 0;
  for (const s of spriteCache.values()) px += s.canvas.width * s.canvas.height;
  return { count: spriteCache.size, pixels: px };
}

/** Shared scratch canvas (grows as needed). */
let scratch: HTMLCanvasElement | null = null;
export function scratchCanvas(w: number, h: number): { c: HTMLCanvasElement; g: Ctx } {
  if (!scratch) scratch = makeCanvas(w, h);
  if (scratch.width < w || scratch.height < h) {
    scratch.width = Math.max(scratch.width, Math.ceil(w));
    scratch.height = Math.max(scratch.height, Math.ceil(h));
  }
  return { c: scratch, g: ctx2d(scratch) };
}
