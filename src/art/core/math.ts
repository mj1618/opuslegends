/** Small math helpers for procedural art. */
export const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));
export const fract = (v: number) => v - Math.floor(v);
export const mod = (v: number, m: number) => ((v % m) + m) % m;
export const smooth = (t: number) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};
export const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 3;
export const easeIn = (t: number) => clamp01(t) ** 3;
export const easeInOut = (t: number) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
export const easeOutBack = (t: number, s = 1.70158) => {
  t = clamp01(t) - 1;
  return t * t * ((s + 1) * t + s) + 1;
};
/** damped spring response to a step at t=0: 0 -> 1 with overshoot */
export const spring = (t: number, freq = 3, damp = 5) =>
  t <= 0 ? 0 : 1 - Math.exp(-damp * t) * Math.cos(TAU * freq * t);
/** decaying wobble: 0 at start, oscillates and dies (for follow-through) */
export const wobble = (t: number, freq = 3, damp = 6) => (t <= 0 ? 0 : Math.exp(-damp * t) * Math.sin(TAU * freq * t));
/** exponential envelope: 1 at t=0 decaying with time constant k. 0 for t<0 */
export const env = (t: number, k: number) => (t < 0 ? 0 : Math.exp(-t / k));
/** attack/decay pulse 0..1..0 over [0, dur] */
export const bump = (t: number, dur: number) => (t < 0 || t > dur ? 0 : Math.sin((Math.PI * t) / dur));

/** deterministic hash -> [0,1) */
export function hash(n: number): number {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export const hash2 = (a: number, b: number) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));

/** mulberry32 seeded rng */
export function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1D value noise, smooth, in [-1,1] */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash2(i, seed) * 2 - 1;
  const b = hash2(i + 1, seed) * 2 - 1;
  return a + (b - a) * f * f * (3 - 2 * f);
}

/** fractal 1D noise in ~[-1,1] */
export function fbm1(x: number, seed = 0, oct = 3): number {
  let s = 0;
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    s += noise1(x, seed + o * 17) * amp;
    norm += amp;
    x *= 2.03;
    amp *= 0.5;
  }
  return s / norm;
}
