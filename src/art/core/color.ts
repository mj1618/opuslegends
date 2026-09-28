/** Tiny colour math on [r,g,b] tuples (0..255). Allocation-light; results are fresh arrays. */
export type RGB = readonly [number, number, number];

const hexCache = new Map<string, RGB>();

export function hex(h: string): RGB {
  let c = hexCache.get(h);
  if (c) return c;
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.replace(/(.)/g, '$1$1') : s, 16);
  c = [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  hexCache.set(h, c);
  return c;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** multiply (a*b/255) - "lit by" */
export function mul(a: RGB, b: RGB): RGB {
  return [(a[0] * b[0]) / 255, (a[1] * b[1]) / 255, (a[2] * b[2]) / 255];
}

export function scale(a: RGB, k: number): RGB {
  return [a[0] * k, a[1] * k, a[2] * k];
}

export function add(a: RGB, b: RGB, k = 1): RGB {
  return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
}

/** screen blend */
export function screen(a: RGB, b: RGB, k = 1): RGB {
  const s = (x: number, y: number) => 255 - ((255 - x) * (255 - y)) / 255;
  return mix(a, [s(a[0], b[0]), s(a[1], b[1]), s(a[2], b[2])], k);
}

export function lum(c: RGB): number {
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
}

export function desat(c: RGB, amt: number): RGB {
  const l = lum(c) * 255;
  return mix(c, [l, l, l], amt);
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

export function css(c: RGB, a = 1): string {
  if (a >= 1) return `rgb(${clamp255(c[0])},${clamp255(c[1])},${clamp255(c[2])})`;
  return `rgba(${clamp255(c[0])},${clamp255(c[1])},${clamp255(c[2])},${a < 0 ? 0 : a.toFixed(3)})`;
}

export function cssHex(h: string, a = 1): string {
  return css(hex(h), a);
}

/** max channel difference, for "did the lighting change enough to re-tint?" checks */
export function diff(a: RGB, b: RGB): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}
