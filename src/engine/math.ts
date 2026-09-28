/** Small, allocation-free math helpers shared by every system. */

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number): number => (b === a ? 0 : (v - a) / (b - a));
export const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** Move `v` toward `target` by at most `delta` (never overshoots). */
export function approach(v: number, target: number, delta: number): number {
  if (v < target) return Math.min(v + delta, target);
  if (v > target) return Math.max(v - delta, target);
  return v;
}

/** Frame-rate independent exponential smoothing. `lambda` ~ "how many e-folds per second". */
export function damp(a: number, b: number, lambda: number, dt: number): number {
  return lerp(a, b, 1 - Math.exp(-lambda * dt));
}

/** Positive modulo (works for negative numbers). */
export const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Axis-aligned rectangle; x/y is the top-left corner (world y grows downward). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function overlapsXYWH(a: Rect, x: number, y: number, w: number, h: number): boolean {
  return a.x < x + w && a.x + a.w > x && a.y < y + h && a.y + a.h > y;
}

/** Deterministic PRNG (mulberry32). Use for anything that must be reproducible (art, levels). */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Non-deterministic helpers for cosmetic randomness (particles etc.). */
export const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
export const randInt = (lo: number, hi: number): number => Math.floor(rand(lo, hi + 1));
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Cheap smooth 1D value noise in [-1, 1] (used for screen shake). */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    const s = Math.sin((n + seed * 57.13) * 127.1) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}
