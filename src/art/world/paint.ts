/** Mask-painting helpers for chalk landforms (used when baking TintBake channels). */
import type { Ctx } from '../core/canvas';
import { TAU, fbm1 } from '../core/math';

/** points along a noisy line */
export function noisyLine(x0: number, y0: number, x1: number, y1: number, amp: number, seed: number, steps = 12): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const n = i === 0 || i === steps ? 0 : fbm1(t * 4 + seed * 7.3, seed, 3) * amp;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const d = Math.hypot(dx, dy) || 1;
    pts.push(x0 + dx * t + (-dy / d) * n, y0 + dy * t + (dx / d) * n);
  }
  return pts;
}

export function polyTo(p: Path2D, pts: number[], skipFirst = false): void {
  for (let i = skipFirst ? 2 : 0; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
}

/** A sea stack: irregular column with a rounded, turf-capped top. Returns path + top profile. */
export function stackShape(cx: number, baseY: number, w: number, h: number, seed: number): { path: Path2D; top: number[] } {
  const p = new Path2D();
  const hw = w / 2;
  const topY = baseY - h;
  const left = noisyLine(cx - hw * 1.12, baseY, cx - hw * 0.92, topY + 14, w * 0.08, seed, 10);
  const top = noisyLine(cx - hw * 0.92, topY + 14, cx + hw * 0.9, topY + 10, 6, seed + 1, 8);
  // round the shoulders
  top[1] -= 0;
  for (let i = 2; i < top.length - 2; i += 2) top[i + 1] -= Math.sin((i / (top.length - 2)) * Math.PI) * 12;
  const right = noisyLine(cx + hw * 0.9, topY + 10, cx + hw * 1.1, baseY, w * 0.08, seed + 2, 10);
  p.moveTo(left[0], left[1]);
  polyTo(p, left, true);
  polyTo(p, top, true);
  polyTo(p, right, true);
  p.closePath();
  return { path: p, top };
}

/** Arch: two legs + span with an opening (fill with 'evenodd'). */
export function archShape(x0: number, x1: number, baseY: number, h: number, seed: number): { path: Path2D; top: number[] } {
  const p = new Path2D();
  const w = x1 - x0;
  const topY = baseY - h;
  const left = noisyLine(x0 - 10, baseY, x0 + 6, topY + 16, 14, seed, 10);
  const top = noisyLine(x0 + 6, topY + 16, x1 - 6, topY + 20, 8, seed + 3, 12);
  for (let i = 2; i < top.length - 2; i += 2) top[i + 1] -= Math.sin((i / (top.length - 2)) * Math.PI) * 14;
  const right = noisyLine(x1 - 6, topY + 20, x1 + 12, baseY, 14, seed + 4, 10);
  p.moveTo(left[0], left[1]);
  polyTo(p, left, true);
  polyTo(p, top, true);
  polyTo(p, right, true);
  p.closePath();
  // opening
  const ow = w * 0.62;
  const oh = h * 0.62;
  const ocx = (x0 + x1) / 2 + w * 0.03;
  p.moveTo(ocx - ow / 2, baseY + 2);
  p.bezierCurveTo(ocx - ow / 2, baseY - oh * 0.7, ocx - ow * 0.3, baseY - oh, ocx, baseY - oh);
  p.bezierCurveTo(ocx + ow * 0.3, baseY - oh, ocx + ow / 2, baseY - oh * 0.7, ocx + ow / 2, baseY + 2);
  p.closePath();
  return { path: p, top };
}

/** Turf along a top profile: a band with scalloped overhang drips + grass tufts. */
export function turf(g: Ctx, top: number[], thick: number, seed: number): void {
  g.beginPath();
  g.moveTo(top[0] - 4, top[1] + 2);
  for (let i = 0; i < top.length; i += 2) g.lineTo(top[i], top[i + 1] - 3);
  const n = top.length / 2;
  for (let i = n - 1; i >= 0; i--) {
    const x = top[i * 2];
    const y = top[i * 2 + 1];
    const drip = (Math.sin(i * 2.7 + seed) * 0.5 + 0.5) * thick * 0.9;
    g.lineTo(x, y + thick + drip);
  }
  g.closePath();
  g.fill();
  // tufts
  for (let i = 0; i < top.length - 2; i += 2) {
    const x = top[i];
    const y = top[i + 1] - 2;
    const k = (Math.sin(i * 1.9 + seed) + 1) * 0.5;
    g.beginPath();
    g.moveTo(x - 3, y + 2);
    g.lineTo(x + k * 3, y - 4 - k * 5);
    g.lineTo(x + 3, y + 2);
    g.fill();
  }
}

/** Horizontal flint bands: rows of nodules clipped by the caller. */
export function flintBands(g: Ctx, x0: number, x1: number, y0: number, y1: number, gap: number, seed: number, r = 3): void {
  for (let y = y0 + gap * 0.5; y < y1; y += gap) {
    const yy = y + Math.sin(seed + y * 0.01) * 6;
    for (let x = x0; x < x1; x += r * 3.2) {
      const k = Math.sin(x * 0.37 + y * 0.11 + seed) * 0.5 + 0.5;
      if (k < 0.25) continue;
      g.beginPath();
      g.ellipse(x + k * 3, yy + Math.sin(x * 0.05 + seed) * 4, r * (0.6 + k * 0.7), r * 0.55, 0, 0, TAU);
      g.fill();
    }
  }
}

/** Vertical erosion streaks (for a shade channel), clipped by the caller. */
export function streaks(g: Ctx, x0: number, x1: number, y0: number, y1: number, seed: number, alpha = 0.35): void {
  for (let x = x0; x < x1; x += 7) {
    const k = Math.sin(x * 0.13 + seed) * Math.sin(x * 0.041 + seed * 2);
    if (k < 0.1) continue;
    g.globalAlpha = alpha * k;
    const len = (y1 - y0) * (0.4 + 0.6 * Math.abs(Math.sin(x * 0.07 + seed)));
    g.fillRect(x, y0 + (y1 - y0 - len) * 0.2, 3 + k * 4, len);
  }
  g.globalAlpha = 1;
}

/** Irregular flint nodules scattered in loose bands (reads as real chalk flint, not stitching). */
export function nodules(g: Ctx, x0: number, x1: number, y0: number, y1: number, gap: number, seed: number, size = 4, density = 0.6): void {
  let k = seed * 9973 + 17;
  const rnd = () => {
    k = (k * 16807) % 2147483647;
    return (k & 0xffffff) / 0x1000000;
  };
  for (let y = y0 + gap * (0.4 + rnd() * 0.3); y < y1; y += gap * (0.8 + rnd() * 0.5)) {
    let x = x0 + rnd() * 30;
    while (x < x1) {
      x += 8 + rnd() * 40;
      if (rnd() > density) continue;
      const s = size * (0.4 + rnd() * 0.9);
      const yy = y + (rnd() - 0.5) * gap * 0.35;
      g.beginPath();
      g.ellipse(x, yy, s * (1 + rnd()), s * (0.5 + rnd() * 0.4), (rnd() - 0.5) * 0.8, 0, TAU);
      g.fill();
      if (rnd() < 0.3) {
        g.beginPath();
        g.ellipse(x + s * 1.6, yy + (rnd() - 0.5) * 3, s * 0.7, s * 0.5, 0, 0, TAU);
        g.fill();
      }
    }
  }
}
