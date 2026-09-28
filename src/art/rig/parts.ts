/**
 * Reusable procedural character parts: inked limbs, tapered capsules, soft blobs, and an
 * expressive cartoon face kit (eyes with lids/blinks/spirals, brows, mouths). Any hero can be
 * assembled from these on top of a Skeleton.
 */
import type { Ctx } from '../core/canvas';
import { TAU, hash } from '../core/math';

export interface Ink {
  /** outline colour */
  line: string;
  /** outline width (px at scale 1) */
  w: number;
}

export const DEFAULT_INK: Ink = { line: '#1B1726', w: 3 };

/** Polyline limb with round joints: outline pass then fill pass (outline stays outside). */
export function limb(g: Ctx, pts: number[], width: number, fill: string, ink: Ink = DEFAULT_INK): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.strokeStyle = ink.line;
  g.lineWidth = width + ink.w * 2;
  g.stroke();
  g.strokeStyle = fill;
  g.lineWidth = width;
  g.stroke();
}

/** Tapered capsule from (x0,y0,r0) to (x1,y1,r1) as a path (caller fills/strokes). */
export function capsulePath(g: Ctx, x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): void {
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.beginPath();
  g.arc(x0, y0, r0, a + Math.PI / 2, a - Math.PI / 2);
  g.arc(x1, y1, r1, a - Math.PI / 2, a + Math.PI / 2);
  g.closePath();
}

/** Inked fill of the current path: stroke outline (2x) then fill. */
export function inked(g: Ctx, fill: string | CanvasGradient, ink: Ink = DEFAULT_INK): void {
  g.lineJoin = 'round';
  g.lineWidth = ink.w * 2;
  g.strokeStyle = ink.line;
  g.stroke();
  g.fillStyle = fill;
  g.fill();
}

/** Soft superellipse blob centred at (cx, cy) — bodies, heads, bellies. */
export function blobPath(g: Ctx, cx: number, cy: number, rx: number, ry: number, squareness = 0.35, taperTop = 0): void {
  const n = 28;
  const p = 2 / (1 + squareness * 2);
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = Math.sign(c) * Math.pow(Math.abs(c), p) * rx * (s < 0 ? 1 - taperTop * -s : 1);
    const y = Math.sign(s) * Math.pow(Math.abs(s), p) * ry;
    if (i === 0) g.moveTo(cx + x, cy + y);
    else g.lineTo(cx + x, cy + y);
  }
  g.closePath();
}

/** glossy highlight ellipse */
export function gloss(g: Ctx, x: number, y: number, rx: number, ry: number, rot = -0.4, alpha = 0.35): void {
  g.fillStyle = `rgba(255,255,255,${alpha})`;
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, TAU);
  g.fill();
}

// ------------------------------------------------------------------------------ face kit

export type EyeStyle = 'normal' | 'wide' | 'squint' | 'closed' | 'happy' | 'spiral' | 'x' | 'angry';

export interface EyeOpts {
  r: number;
  /** pupil direction -1..1 */
  lookX?: number;
  lookY?: number;
  style?: EyeStyle;
  /** 0 open .. 1 shut */
  lid?: number;
  /** lid slant (+ = angry inward slant for the right eye; mirror sign per eye) */
  lidTilt?: number;
  lidColor?: string;
  white?: string;
  pupil?: string;
  pupilScale?: number;
  ink?: Ink;
  time?: number;
}

/** Periodic blink: returns 1 while blinking. Seeded so characters don't blink in sync. */
export function blink(time: number, seed = 0, period = 3.3): number {
  const k = Math.floor(time / period);
  const off = hash(k * 7 + 3 + seed * 13) * 1.6;
  const tt = time - k * period - off;
  if (tt > 0 && tt < 0.12) return 1;
  if (hash(k + seed) > 0.72 && tt > 0.2 && tt < 0.31) return 1;
  return 0;
}

export function cartoonEye(g: Ctx, x: number, y: number, o: EyeOpts): void {
  const ink = o.ink ?? DEFAULT_INK;
  const R = o.r;
  const style = o.style ?? 'normal';
  if (style === 'closed' || style === 'happy') {
    g.strokeStyle = ink.line;
    g.lineWidth = Math.max(1.5, R * 0.3);
    g.lineCap = 'round';
    g.beginPath();
    if (style === 'happy') g.arc(x, y + R * 0.35, R * 0.7, Math.PI * 1.15, Math.PI * 1.85);
    else {
      g.moveTo(x - R * 0.75, y);
      g.quadraticCurveTo(x, y + R * 0.5, x + R * 0.75, y);
    }
    g.stroke();
    return;
  }
  g.beginPath();
  g.ellipse(x, y, R, R * 1.08, 0, 0, TAU);
  g.lineWidth = ink.w * 1.6;
  g.strokeStyle = ink.line;
  g.stroke();
  g.fillStyle = o.white ?? '#FFFFFF';
  g.fill();
  if (style === 'x') {
    g.lineWidth = Math.max(1.5, R * 0.25);
    g.beginPath();
    g.moveTo(x - R * 0.5, y - R * 0.5);
    g.lineTo(x + R * 0.5, y + R * 0.5);
    g.moveTo(x + R * 0.5, y - R * 0.5);
    g.lineTo(x - R * 0.5, y + R * 0.5);
    g.stroke();
    return;
  }
  if (style === 'spiral') {
    g.lineWidth = Math.max(1.2, R * 0.2);
    g.beginPath();
    const rot = (o.time ?? 0) * 14;
    for (let a = 0; a < TAU * 2.2; a += 0.35) {
      const rr = R * (0.08 + a * 0.055);
      const px = x + Math.cos(a + rot) * rr;
      const py = y + Math.sin(a + rot) * rr;
      if (a === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    return;
  }
  const pr = R * (style === 'wide' ? 0.34 : 0.46) * (o.pupilScale ?? 1);
  const px = x + (o.lookX ?? 0) * R * 0.38;
  const py = y + (o.lookY ?? 0) * R * 0.38;
  g.fillStyle = o.pupil ?? '#111018';
  g.beginPath();
  g.arc(px, py, pr, 0, TAU);
  g.fill();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(px - pr * 0.35, py - pr * 0.38, pr * 0.34, 0, TAU);
  g.fill();
  let lid = o.lid ?? 0;
  if (style === 'squint' || style === 'angry') lid = Math.max(lid, 0.45);
  if (style === 'wide') lid = 0;
  if (lid > 0.02 && o.lidColor) {
    const tilt = (o.lidTilt ?? 0) * R;
    g.save();
    g.beginPath();
    g.ellipse(x, y, R + 0.4, R * 1.08 + 0.4, 0, 0, TAU);
    g.clip();
    const ly = y - R * 1.1 + lid * R * 2.2;
    g.fillStyle = o.lidColor;
    g.beginPath();
    g.moveTo(x - R - 2, y - R - 3);
    g.lineTo(x + R + 2, y - R - 3);
    g.lineTo(x + R + 2, ly - tilt);
    g.lineTo(x - R - 2, ly + tilt);
    g.fill();
    g.strokeStyle = ink.line;
    g.lineWidth = Math.max(1.2, R * 0.22);
    g.beginPath();
    g.moveTo(x - R - 2, ly + tilt);
    g.lineTo(x + R + 2, ly - tilt);
    g.stroke();
    g.restore();
  }
}

/** Brow: angle > 0 = angry (inner end down), < 0 = worried. `side` -1 left eye, +1 right eye. */
export function brow(g: Ctx, x: number, y: number, w: number, angle: number, side: number, ink: Ink = DEFAULT_INK, thick = 3.2): void {
  g.strokeStyle = ink.line;
  g.lineWidth = thick;
  g.lineCap = 'round';
  const dy = Math.sin(angle) * w * 0.5 * side;
  g.beginPath();
  g.moveTo(x - w / 2, y - dy);
  g.quadraticCurveTo(x, y - Math.abs(dy) * 0.2 - 2, x + w / 2, y + dy);
  g.stroke();
}

export type MouthStyle = 'smirk' | 'grin' | 'shout' | 'o' | 'wavy' | 'flat' | 'frown' | 'teeth';

export interface MouthOpts {
  w: number;
  style: MouthStyle;
  /** 0..1 */
  open?: number;
  ink?: Ink;
  inside?: string;
  tongue?: string;
  teeth?: string;
}

export function cartoonMouth(g: Ctx, x: number, y: number, o: MouthOpts): void {
  const ink = o.ink ?? DEFAULT_INK;
  const w = o.w;
  const open = o.open ?? 0.6;
  g.strokeStyle = ink.line;
  g.fillStyle = o.inside ?? '#2A0E1C';
  g.lineWidth = Math.max(1.6, w * 0.11);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const tongue = o.tongue ?? '#E86A5E';
  switch (o.style) {
    case 'smirk':
      g.beginPath();
      g.moveTo(x - w * 0.45, y);
      g.quadraticCurveTo(x + w * 0.05, y + w * 0.25, x + w * 0.5, y - w * 0.15);
      g.stroke();
      g.beginPath();
      g.moveTo(x + w * 0.42, y - w * 0.28);
      g.quadraticCurveTo(x + w * 0.55, y - w * 0.15, x + w * 0.56, y - w * 0.02);
      g.stroke();
      break;
    case 'grin':
    case 'teeth': {
      g.beginPath();
      g.moveTo(x - w * 0.5, y - w * 0.1);
      g.quadraticCurveTo(x, y + w * 0.55, x + w * 0.5, y - w * 0.15);
      g.quadraticCurveTo(x, y + w * 0.08, x - w * 0.5, y - w * 0.1);
      g.fill();
      g.stroke();
      if (o.style === 'teeth') {
        g.fillStyle = o.teeth ?? '#FFFFFF';
        g.beginPath();
        g.moveTo(x - w * 0.38, y - w * 0.02);
        g.quadraticCurveTo(x, y + w * 0.14, x + w * 0.38, y - w * 0.06);
        g.lineTo(x + w * 0.34, y + w * 0.08);
        g.quadraticCurveTo(x, y + w * 0.22, x - w * 0.34, y + w * 0.1);
        g.fill();
      } else {
        g.fillStyle = tongue;
        g.beginPath();
        g.ellipse(x + w * 0.05, y + w * 0.16, w * 0.18, w * 0.08, 0, 0, TAU);
        g.fill();
      }
      break;
    }
    case 'shout': {
      const h = w * (0.3 + 0.6 * open);
      g.beginPath();
      g.moveTo(x - w * 0.45, y - w * 0.15);
      g.quadraticCurveTo(x, y - w * 0.3, x + w * 0.5, y - w * 0.2);
      g.quadraticCurveTo(x + w * 0.45, y - w * 0.15 + h, x, y - w * 0.12 + h);
      g.quadraticCurveTo(x - w * 0.42, y - w * 0.15 + h, x - w * 0.45, y - w * 0.15);
      g.fill();
      g.stroke();
      g.fillStyle = tongue;
      g.beginPath();
      g.ellipse(x, y - w * 0.12 + h - w * 0.12, w * 0.22, w * 0.11, 0, 0, TAU);
      g.fill();
      break;
    }
    case 'o':
      g.beginPath();
      g.ellipse(x, y, w * (0.16 + open * 0.08), w * (0.2 + open * 0.12), 0, 0, TAU);
      g.fill();
      g.stroke();
      break;
    case 'wavy':
      g.beginPath();
      g.moveTo(x - w * 0.45, y);
      for (let i = 1; i <= 8; i++) g.lineTo(x - w * 0.45 + (i * w * 0.9) / 8, y + (i % 2 ? -1 : 1) * w * 0.09);
      g.stroke();
      break;
    case 'frown':
      g.beginPath();
      g.moveTo(x - w * 0.4, y + w * 0.12);
      g.quadraticCurveTo(x, y - w * 0.18, x + w * 0.4, y + w * 0.12);
      g.stroke();
      break;
    default:
      g.beginPath();
      g.moveTo(x - w * 0.35, y);
      g.lineTo(x + w * 0.38, y - w * 0.04);
      g.stroke();
  }
}
