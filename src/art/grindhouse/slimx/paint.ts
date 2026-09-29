/**
 * Shared painting kit for the Slim redesign candidates.
 *
 * THE SHEET (why the old Slim looked amateur: every capsule had the same 3 px outline, so every overlap drew a
 * full-weight seam through the body). A Sheet collects the character as closed Path2D parts in draw order and paints
 * them in two passes:
 *   1. the SILHOUETTE: every part stroked fat in ink  -> one heavy outer contour around the whole figure
 *   2. per part, back to front: a thin part line (stroke x2 then fill, so union seams inside a part vanish),
 *      a hard 2-3 tone cel shade from ONE light direction (the part shifted toward the light = base, the rest =
 *      shadow; optional lit edge), then clipped details (tattoos, seams, creases) in hairline weight.
 * Result: thick outside, thin inside, consistent light — the three line weights of a professional cel look.
 */
import type { Ctx } from '../../core/canvas';
import type { V } from './rig';

export interface Shape {
  p: Path2D;
  fill: string | CanvasGradient;
  /** cel shadow colour + offset (px toward the light that stays lit) */
  shade?: string;
  sh?: number;
  /** lit edge colour + width */
  hi?: string;
  hs?: number;
  /** detail drawn clipped to the part */
  detail?: (g: Ctx) => void;
  /** drawn after the part, unclipped */
  over?: (g: Ctx) => void;
  /** part-line width override (0 = none) */
  part?: number;
  /** part-line colour override */
  line?: string;
  /** false = not part of the outer silhouette */
  sil?: boolean;
}

export interface InkStyle {
  /** silhouette contour width (px each side) */
  outer: number;
  /** part line width */
  part: number;
  ink: string;
  /** part line colour (default ink) */
  partInk?: string;
  /** unit vector TOWARD the key light (character space) */
  lx: number;
  ly: number;
}

export class Sheet {
  readonly list: Shape[] = [];
  add(s: Shape): Shape {
    this.list.push(s);
    return s;
  }
  draw(g: Ctx, st: InkStyle): void {
    g.lineJoin = 'round';
    g.lineCap = 'round';
    if (st.outer > 0) {
      g.strokeStyle = st.ink;
      g.lineWidth = st.outer * 2;
      for (const s of this.list) if (s.sil !== false) g.stroke(s.p);
    }
    for (const s of this.list) {
      const pw = s.part ?? st.part;
      if (pw > 0) {
        g.strokeStyle = s.line ?? st.partInk ?? st.ink;
        g.lineWidth = pw * 2;
        g.stroke(s.p);
      }
      const shaded = !!(s.shade || s.hi || s.detail);
      if (!shaded) {
        g.fillStyle = s.fill;
        g.fill(s.p);
      } else {
        g.save();
        g.clip(s.p);
        if (s.shade || s.hi) {
          g.fillStyle = s.hi ?? s.fill;
          g.fill(s.p);
          if (s.hi) {
            // lit edge: everything but a sliver on the light side
            const h = s.hs ?? 1.5;
            g.save();
            g.translate(-st.lx * h, -st.ly * h);
            g.clip(s.p);
            g.translate(st.lx * h, st.ly * h);
            g.fillStyle = s.shade ?? s.fill;
            g.fill(s.p);
            this.base(g, s, st);
            g.restore();
          } else {
            g.fillStyle = s.shade ?? s.fill;
            g.fill(s.p);
            this.base(g, s, st);
          }
        } else {
          g.fillStyle = s.fill;
          g.fill(s.p);
        }
        if (s.detail) s.detail(g);
        g.restore();
      }
      if (s.over) s.over(g);
    }
  }
  private base(g: Ctx, s: Shape, st: InkStyle): void {
    if (!s.shade) {
      g.fillStyle = s.fill;
      g.fill(s.p);
      return;
    }
    const k = s.sh ?? 3;
    g.save();
    g.translate(st.lx * k, st.ly * k);
    g.fillStyle = s.fill;
    g.fill(s.p);
    g.restore();
  }
}

// ------------------------------------------------------------------------------ geometry

export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
export const len = (a: V) => Math.hypot(a[0], a[1]);
export const lerpV = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const unit = (a: V): V => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
/** +90 deg (screen) normal of a direction */
export const nrm = (d: V): V => [-d[1], d[0]];

/**
 * Tapered limb segment A -> B with round caps. `p`/`m` = half-widths on the +normal / -normal side at t = 0, mid, 1
 * (asymmetric bulges: bicep vs tricep, calf vs shin). The mid point is passed THROUGH (quadratic control solved).
 */
export function seg(path: Path2D, A: V, B: V, p: [number, number, number], m: [number, number, number], midT = 0.5): void {
  const d = unit(sub(B, A));
  const n = nrm(d);
  const M = lerpV(A, B, midT);
  const at = (P: V, w: number): V => [P[0] + n[0] * w, P[1] + n[1] * w];
  const ctl = (s: V, mid: V, e: V): V => [2 * mid[0] - (s[0] + e[0]) / 2, 2 * mid[1] - (s[1] + e[1]) / 2];
  const an = Math.atan2(n[1], n[0]);
  const a0 = at(A, p[0]);
  const a1 = at(M, p[1]);
  const a2 = at(B, p[2]);
  const b0 = at(A, -m[0]);
  const b1 = at(M, -m[1]);
  const b2 = at(B, -m[2]);
  path.moveTo(a0[0], a0[1]);
  const c1 = ctl(a0, a1, a2);
  path.quadraticCurveTo(c1[0], c1[1], a2[0], a2[1]);
  const rB = (p[2] + m[2]) / 2;
  const cB = at(B, (p[2] - m[2]) / 2);
  path.arc(cB[0], cB[1], Math.max(0.1, rB), an, an - Math.PI, true);
  const c2 = ctl(b2, b1, b0);
  path.quadraticCurveTo(c2[0], c2[1], b0[0], b0[1]);
  const rA = (p[0] + m[0]) / 2;
  const cA = at(A, (p[0] - m[0]) / 2);
  path.arc(cA[0], cA[1], Math.max(0.1, rA), an + Math.PI, an, true);
  path.closePath();
}

/** a local frame (origin o, x axis angle a) -> maps local (x, y) to character space */
export function frame(o: V, a: number, sx = 1, sy = 1): (x: number, y: number) => V {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return (x, y) => [o[0] + c * x * sx - s * y * sy, o[1] + s * x * sx + c * y * sy];
}

/**
 * Build a path from a tiny command list in a local frame:
 *   ['M', x, y] ['L', x, y] ['Q', cx, cy, x, y] ['C', c1x, c1y, c2x, c2y, x, y] ['Z']
 */
export type Cmd = (string | number)[];
export function shapePath(f: (x: number, y: number) => V, cmds: Cmd[], path = new Path2D()): Path2D {
  for (const c of cmds) {
    const k = c[0];
    const n = c as number[];
    if (k === 'M') {
      const p = f(n[1], n[2]);
      path.moveTo(p[0], p[1]);
    } else if (k === 'L') {
      const p = f(n[1], n[2]);
      path.lineTo(p[0], p[1]);
    } else if (k === 'Q') {
      const a = f(n[1], n[2]);
      const p = f(n[3], n[4]);
      path.quadraticCurveTo(a[0], a[1], p[0], p[1]);
    } else if (k === 'C') {
      const a = f(n[1], n[2]);
      const b = f(n[3], n[4]);
      const p = f(n[5], n[6]);
      path.bezierCurveTo(a[0], a[1], b[0], b[1], p[0], p[1]);
    } else if (k === 'Z') path.closePath();
  }
  return path;
}

/** ellipse in a local frame */
export function ellipseIn(path: Path2D, o: V, rx: number, ry: number, rot: number): void {
  path.moveTo(o[0] + Math.cos(rot) * rx, o[1] + Math.sin(rot) * rx);
  path.ellipse(o[0], o[1], rx, ry, rot, 0, Math.PI * 2);
}

/** stroke a polyline / curve through local points in a frame */
export function strokeIn(g: Ctx, f: (x: number, y: number) => V, cmds: Cmd[], w: number, col: string): void {
  g.lineWidth = w;
  g.strokeStyle = col;
  g.stroke(shapePath(f, cmds));
}

/** tapered stroke (brush): a filled quad-strip from A to B, width w0 -> w1 */
export function taper(g: Ctx, pts: V[], w0: number, w1: number, col: string): void {
  if (pts.length < 2) return;
  const L: V[] = [];
  const R: V[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const n = nrm(unit(sub(b, a)));
    const t = i / (pts.length - 1);
    const w = (w0 + (w1 - w0) * t) / 2;
    L.push([pts[i][0] + n[0] * w, pts[i][1] + n[1] * w]);
    R.push([pts[i][0] - n[0] * w, pts[i][1] - n[1] * w]);
  }
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < L.length; i++) g.lineTo(L[i][0], L[i][1]);
  for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath();
  g.fill();
}

/** quadratic bezier sample (for brush strokes along curves) */
export function qpts(a: V, c: V, b: V, n = 8): V[] {
  const out: V[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}
