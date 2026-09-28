/**
 * Skeleton: a tiny 2D bone hierarchy for procedural characters (any hero, any theme).
 *
 * Convention: canvas space (y DOWN). Every bone points along its local +x. A bone's local
 * transform = translate(rest.x + pose.x, rest.y + pose.y) · rotate(rest.rot + pose.rot) · scale(sx, sy),
 * relative to its parent. `solve()` computes world matrices; parts are then drawn in bone space.
 *
 *   const sk = new Skeleton([{ name: 'hips', x: 0, y: -44 }, { name: 'chest', parent: 'hips', x: 0, y: -20, rot: -Math.PI/2 }, ...]);
 *   sk.solve(pose, { x, y, sx, sy });   // root placement incl. squash & stretch
 *   sk.apply(ctx, 'chest'); drawTorso(ctx); ctx.restore();
 */
import type { Ctx } from '../core/canvas';

export interface BoneDef {
  name: string;
  parent?: string;
  /** rest offset from the parent's origin, in the parent's space */
  x: number;
  y: number;
  /** rest rotation (radians, clockwise because y is down) */
  rot?: number;
  /** length along local +x (for tips / IK / debug) */
  len?: number;
}

/** Per-bone pose delta, added on top of the rest pose. */
export interface BoneXf {
  rot?: number;
  x?: number;
  y?: number;
  sx?: number;
  sy?: number;
}
export type Pose = Record<string, BoneXf>;

export interface RootXf {
  x?: number;
  y?: number;
  rot?: number;
  sx?: number;
  sy?: number;
  /** squash/stretch pivot (root space), default (0,0) = feet */
  px?: number;
  py?: number;
}

export class Skeleton {
  readonly defs: BoneDef[];
  readonly index = new Map<string, number>();
  private parent: Int16Array;
  /** world matrices, 6 floats per bone: a b c d e f */
  readonly m: Float64Array;
  private order: number[];

  constructor(defs: BoneDef[]) {
    this.defs = defs;
    defs.forEach((d, i) => this.index.set(d.name, i));
    this.parent = new Int16Array(defs.length);
    defs.forEach((d, i) => {
      this.parent[i] = d.parent === undefined ? -1 : (this.index.get(d.parent) ?? -1);
      if (d.parent !== undefined && this.parent[i] < 0) throw new Error(`bone ${d.name}: unknown parent ${d.parent}`);
    });
    // topological order (parents first)
    const seen = new Set<number>();
    this.order = [];
    const visit = (i: number) => {
      if (seen.has(i)) return;
      if (this.parent[i] >= 0) visit(this.parent[i]);
      seen.add(i);
      this.order.push(i);
    };
    defs.forEach((_, i) => visit(i));
    this.m = new Float64Array(defs.length * 6);
  }

  id(name: string): number {
    const i = this.index.get(name);
    if (i === undefined) throw new Error(`unknown bone ${name}`);
    return i;
  }

  solve(pose: Pose, root: RootXf = {}): this {
    // root matrix: translate(x,y) · [pivot] rotate · scale [/pivot]
    const rx = root.x ?? 0;
    const ry = root.y ?? 0;
    const rr = root.rot ?? 0;
    const rsx = root.sx ?? 1;
    const rsy = root.sy ?? 1;
    const px = root.px ?? 0;
    const py = root.py ?? 0;
    const rc = Math.cos(rr);
    const rs = Math.sin(rr);
    // M = T(rx+px, ry+py) R S T(-px,-py)
    const Ra = rc * rsx;
    const Rb = rs * rsx;
    const Rc = -rs * rsy;
    const Rd = rc * rsy;
    const Re = rx + px - (Ra * px + Rc * py);
    const Rf = ry + py - (Rb * px + Rd * py);
    const m = this.m;
    for (const i of this.order) {
      const d = this.defs[i];
      const p = pose[d.name];
      const lx = d.x + (p?.x ?? 0);
      const ly = d.y + (p?.y ?? 0);
      const r = (d.rot ?? 0) + (p?.rot ?? 0);
      const sx = p?.sx ?? 1;
      const sy = p?.sy ?? 1;
      const c = Math.cos(r);
      const s = Math.sin(r);
      // local = T(lx,ly) R(r) S(sx,sy)
      const la = c * sx;
      const lb = s * sx;
      const lc = -s * sy;
      const ld = c * sy;
      let pa: number, pb: number, pc: number, pd: number, pe: number, pf: number;
      const pi = this.parent[i];
      if (pi < 0) {
        pa = Ra;
        pb = Rb;
        pc = Rc;
        pd = Rd;
        pe = Re;
        pf = Rf;
      } else {
        const o = pi * 6;
        pa = m[o];
        pb = m[o + 1];
        pc = m[o + 2];
        pd = m[o + 3];
        pe = m[o + 4];
        pf = m[o + 5];
      }
      const o = i * 6;
      m[o] = pa * la + pc * lb;
      m[o + 1] = pb * la + pd * lb;
      m[o + 2] = pa * lc + pc * ld;
      m[o + 3] = pb * lc + pd * ld;
      m[o + 4] = pa * lx + pc * ly + pe;
      m[o + 5] = pb * lx + pd * ly + pf;
    }
    return this;
  }

  /** bone-local point -> root/world space */
  point(bone: string | number, lx = 0, ly = 0): [number, number] {
    const o = (typeof bone === 'number' ? bone : this.id(bone)) * 6;
    const m = this.m;
    return [m[o] * lx + m[o + 2] * ly + m[o + 4], m[o + 1] * lx + m[o + 3] * ly + m[o + 5]];
  }

  /** end of the bone (local (len, 0)) */
  tip(bone: string): [number, number] {
    const i = this.id(bone);
    return this.point(i, this.defs[i].len ?? 0, 0);
  }

  /** world angle of the bone's +x axis */
  angle(bone: string): number {
    const o = this.id(bone) * 6;
    return Math.atan2(this.m[o + 1], this.m[o]);
  }

  /** ctx.save() + multiply the bone's world matrix. Pair with ctx.restore(). */
  apply(g: Ctx, bone: string | number): void {
    const o = (typeof bone === 'number' ? bone : this.id(bone)) * 6;
    const m = this.m;
    g.save();
    g.transform(m[o], m[o + 1], m[o + 2], m[o + 3], m[o + 4], m[o + 5]);
  }

  /** debug: draw bones as lines + joints */
  debugDraw(g: Ctx, color = 'rgba(255,40,120,0.9)'): void {
    g.save();
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = 2;
    for (let i = 0; i < this.defs.length; i++) {
      const [x0, y0] = this.point(i, 0, 0);
      const [x1, y1] = this.point(i, this.defs[i].len ?? 6, 0);
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
      g.beginPath();
      g.arc(x0, y0, 3, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
}

// ------------------------------------------------------------------------------ pose algebra

function lerpXf(a: BoneXf | undefined, b: BoneXf | undefined, t: number): BoneXf {
  const A = a ?? {};
  const B = b ?? {};
  return {
    rot: (A.rot ?? 0) + ((B.rot ?? 0) - (A.rot ?? 0)) * t,
    x: (A.x ?? 0) + ((B.x ?? 0) - (A.x ?? 0)) * t,
    y: (A.y ?? 0) + ((B.y ?? 0) - (A.y ?? 0)) * t,
    sx: (A.sx ?? 1) + ((B.sx ?? 1) - (A.sx ?? 1)) * t,
    sy: (A.sy ?? 1) + ((B.sy ?? 1) - (A.sy ?? 1)) * t,
  };
}

/** Linear blend of two poses (missing bones = rest). */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = lerpXf(a[k], b[k], t);
  return out;
}

/** Additive layer: base + w * delta (rot/x/y add, scales multiply). */
export function addPose(base: Pose, delta: Pose, w = 1): Pose {
  const out: Pose = { ...base };
  for (const k of Object.keys(delta)) {
    const B = base[k] ?? {};
    const D = delta[k];
    out[k] = {
      rot: (B.rot ?? 0) + (D.rot ?? 0) * w,
      x: (B.x ?? 0) + (D.x ?? 0) * w,
      y: (B.y ?? 0) + (D.y ?? 0) * w,
      sx: (B.sx ?? 1) * (1 + ((D.sx ?? 1) - 1) * w),
      sy: (B.sy ?? 1) * (1 + ((D.sy ?? 1) - 1) * w),
    };
  }
  return out;
}

/**
 * Two-bone IK in root space: angles for (upper, lower) so the chain reaches (tx, ty).
 * `bend` +1/-1 picks the elbow side. Returns world angles; convert with parent angle as needed.
 */
export function ik2(ax: number, ay: number, l1: number, l2: number, tx: number, ty: number, bend = 1): [number, number] {
  const dx = tx - ax;
  const dy = ty - ay;
  const d = Math.min(l1 + l2 - 1e-3, Math.max(Math.abs(l1 - l2) + 1e-3, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const a1 = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const a2 = Math.acos((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2));
  const up = base - bend * a1;
  const lo = up + bend * (Math.PI - a2);
  return [up, lo];
}
