/**
 * Minimal platformer collision: static AABB solids (+ one-way platforms), axis-separated
 * movement (X then Y). Moves are small per 120 Hz step (< 25 px) so no swept tests are needed
 * as long as solids are >= 24 px thick.
 */
import type { Rect } from '../engine/math';

export type SolidKind = 'solid' | 'oneway';

export interface Solid extends Rect {
  kind: SolidKind;
}

/** Physics body anchored at FEET CENTER (x = center, y = bottom). */
export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

export function bodyRect(b: Body, out: Rect = { x: 0, y: 0, w: 0, h: 0 }): Rect {
  out.x = b.x - b.w / 2;
  out.y = b.y - b.h;
  out.w = b.w;
  out.h = b.h;
  return out;
}

export class CollisionWorld {
  private solids: Solid[] = [];
  private maxW = 0;
  private scratch: Solid[] = [];

  add(s: Solid): void {
    this.solids.push(s);
    this.solids.sort((a, b) => a.x - b.x);
    this.maxW = Math.max(this.maxW, s.w);
  }

  clear(): void {
    this.solids = [];
    this.maxW = 0;
  }

  all(): readonly Solid[] {
    return this.solids;
  }

  /** Solids whose x-extent overlaps [x0, x1]. Returned array is reused — don't keep it. */
  query(x0: number, x1: number): Solid[] {
    const out = this.scratch;
    out.length = 0;
    const s = this.solids;
    // binary search first solid with x >= x0 - maxW
    let lo = 0;
    let hi = s.length;
    const key = x0 - this.maxW;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (s[mid].x < key) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < s.length; i++) {
      const o = s[i];
      if (o.x > x1) break;
      if (o.x + o.w > x0) out.push(o);
    }
    return out;
  }

  /** Does the rect overlap any full solid (one-ways ignored)? */
  overlapsSolid(r: Rect): boolean {
    for (const s of this.query(r.x, r.x + r.w)) {
      if (s.kind !== 'solid') continue;
      if (r.y < s.y + s.h && r.y + r.h > s.y) return true;
    }
    return false;
  }

  /** Top y of the highest surface under x within [yFrom, yFrom+maxDist], or NaN. */
  groundBelow(x: number, yFrom: number, maxDist = 2000): number {
    let best = NaN;
    for (const s of this.query(x, x)) {
      if (s.y >= yFrom - 1 && s.y <= yFrom + maxDist && (Number.isNaN(best) || s.y < best)) best = s.y;
    }
    return best;
  }
}

export interface MoveResult {
  hitWallDir: number; // -1 left, 1 right, 0 none
  hitCeiling: boolean;
  landed: boolean;
  steppedUp: boolean;
}

const EPS = 0.001;

export function moveBody(
  b: Body,
  dx: number,
  dy: number,
  world: CollisionWorld,
  opts: { ledgeAssist: number; cornerCorrection: number; canStepUp: boolean },
  res: MoveResult,
): MoveResult {
  res.hitWallDir = 0;
  res.hitCeiling = false;
  res.landed = false;
  res.steppedUp = false;
  const hw = b.w / 2;

  // ---- X
  if (dx !== 0) {
    b.x += dx;
    const top = b.y - b.h;
    for (const s of world.query(b.x - hw, b.x + hw)) {
      if (s.kind !== 'solid') continue;
      if (!(top < s.y + s.h && b.y > s.y)) continue;
      if (b.x - hw >= s.x + s.w || b.x + hw <= s.x) continue;
      // ledge assist: the obstacle's top is just above our feet -> step up if there's room
      const rise = b.y - s.y;
      if (opts.canStepUp && rise > 0 && rise <= opts.ledgeAssist) {
        const r = { x: b.x - hw, y: s.y - b.h, w: b.w, h: b.h };
        if (!world.overlapsSolid(r)) {
          b.y = s.y;
          res.steppedUp = true;
          continue;
        }
      }
      if (dx > 0) {
        b.x = s.x - hw - EPS;
        res.hitWallDir = 1;
      } else {
        b.x = s.x + s.w + hw + EPS;
        res.hitWallDir = -1;
      }
      b.vx = 0;
    }
  }

  // ---- Y
  if (dy !== 0) {
    const prevBottom = b.y;
    b.y += dy;
    const top = b.y - b.h;
    for (const s of world.query(b.x - hw + EPS, b.x + hw - EPS)) {
      if (b.x - hw >= s.x + s.w || b.x + hw <= s.x) continue;
      if (!(top < s.y + s.h && b.y > s.y)) continue;
      if (dy > 0) {
        if (s.kind === 'oneway' && prevBottom > s.y + EPS) continue;
        b.y = s.y;
        b.vy = 0;
        res.landed = true;
      } else if (s.kind === 'solid') {
        // corner correction: nudge sideways if we only clipped the edge
        const overlapL = b.x + hw - s.x; // we're left of the solid
        const overlapR = s.x + s.w - (b.x - hw); // we're right of it
        if (overlapL > 0 && overlapL <= opts.cornerCorrection) {
          const r = { x: b.x - hw - overlapL - EPS, y: top, w: b.w, h: b.h };
          if (!world.overlapsSolid(r)) {
            b.x -= overlapL + EPS;
            continue;
          }
        }
        if (overlapR > 0 && overlapR <= opts.cornerCorrection) {
          const r = { x: b.x - hw + overlapR + EPS, y: top, w: b.w, h: b.h };
          if (!world.overlapsSolid(r)) {
            b.x += overlapR + EPS;
            continue;
          }
        }
        b.y = s.y + s.h + b.h + EPS;
        b.vy = 0;
        res.hitCeiling = true;
      }
    }
  }
  return res;
}
