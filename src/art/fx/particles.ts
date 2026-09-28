/**
 * FX: a pooled structure-of-arrays particle system + presets (dust, sparks, sparkles, rings,
 * flashes, shards, confetti, smoke, streaks). Zero allocation per particle; draws are batched
 * per kind/colour. Theme-agnostic — colours are passed in.
 *
 *   const fx = new Fx();
 *   fx.dust(x, y, { dir: -1 });  fx.sparks(x, y, { angle: -1.2, color: '#FFD34D' });
 *   fx.update(dt);  fx.draw(ctx);            // ctx in world space (camera applied)
 *
 * Beat hooks: `onBeat(b, 'snare', () => fx.ring(...))` fires once per new event of a lane.
 */
import type { BeatInfo, Instrument } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { drawGlow, star4 } from '../core/draw';
import { TAU } from '../core/math';

export const Kind = {
  Dot: 0,
  Puff: 1,
  Spark: 2,
  Star: 3,
  Ring: 4,
  Shard: 5,
  Confetti: 6,
  Smoke: 7,
  Flash: 8,
  Streak: 9,
} as const;
export type Kind = (typeof Kind)[keyof typeof Kind];

const KINDS = 10;

export interface EmitOpts {
  vx?: number;
  vy?: number;
  life?: number;
  size?: number;
  /** end size multiplier */
  grow?: number;
  gravity?: number;
  drag?: number;
  rot?: number;
  vrot?: number;
  color?: string;
  additive?: boolean;
}

export class Fx {
  readonly max: number;
  n = 0;
  private x: Float32Array;
  private y: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private age: Float32Array;
  private life: Float32Array;
  private size: Float32Array;
  private grow: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private rot: Float32Array;
  private vrot: Float32Array;
  private kind: Uint8Array;
  private col: Uint16Array;
  private add: Uint8Array;
  private colors: string[] = [];
  private colorIdx = new Map<string, number>();
  private seed = 1;

  constructor(max = 3000) {
    this.max = max;
    const F = () => new Float32Array(max);
    this.x = F();
    this.y = F();
    this.vx = F();
    this.vy = F();
    this.age = F();
    this.life = F();
    this.size = F();
    this.grow = F();
    this.grav = F();
    this.drag = F();
    this.rot = F();
    this.vrot = F();
    this.kind = new Uint8Array(max);
    this.col = new Uint16Array(max);
    this.add = new Uint8Array(max);
  }

  rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed & 0xffffff) / 0x1000000;
  }

  private ci(c: string): number {
    let i = this.colorIdx.get(c);
    if (i === undefined) {
      i = this.colors.length;
      this.colors.push(c);
      this.colorIdx.set(c, i);
    }
    return i;
  }

  emit(kind: Kind, x: number, y: number, o: EmitOpts = {}): void {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.kind[i] = kind;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = o.vx ?? 0;
    this.vy[i] = o.vy ?? 0;
    this.age[i] = 0;
    this.life[i] = o.life ?? 0.5;
    this.size[i] = o.size ?? 6;
    this.grow[i] = o.grow ?? 1;
    this.grav[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.rot[i] = o.rot ?? 0;
    this.vrot[i] = o.vrot ?? 0;
    this.col[i] = this.ci(o.color ?? '#FFFFFF');
    this.add[i] = o.additive ? 1 : 0;
  }

  update(dt: number): void {
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      const a = this.age[i] + dt;
      if (a >= this.life[i]) continue;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      const vx = this.vx[i] * d;
      const vy = (this.vy[i] + this.grav[i] * dt) * d;
      if (w !== i) {
        this.kind[w] = this.kind[i];
        this.life[w] = this.life[i];
        this.size[w] = this.size[i];
        this.grow[w] = this.grow[i];
        this.grav[w] = this.grav[i];
        this.drag[w] = this.drag[i];
        this.vrot[w] = this.vrot[i];
        this.col[w] = this.col[i];
        this.add[w] = this.add[i];
      }
      this.age[w] = a;
      this.vx[w] = vx;
      this.vy[w] = vy;
      this.x[w] = this.x[i] + vx * dt;
      this.y[w] = this.y[i] + vy * dt;
      this.rot[w] = this.rot[i] + this.vrot[i] * dt;
      w++;
    }
    this.n = w;
  }

  clear(): void {
    this.n = 0;
  }

  draw(g: Ctx): void {
    if (!this.n) return;
    g.save();
    g.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      g.globalCompositeOperation = pass ? 'lighter' : 'source-over';
      for (let k = 0; k < KINDS; k++) this.drawKind(g, k as Kind, pass);
    }
    g.restore();
  }

  private drawKind(g: Ctx, k: Kind, pass: number) {
    for (let i = 0; i < this.n; i++) {
      if (this.kind[i] !== k || this.add[i] !== pass) continue;
      const u = this.age[i] / this.life[i];
      const s = this.size[i] * (1 + (this.grow[i] - 1) * u);
      const x = this.x[i];
      const y = this.y[i];
      const c = this.colors[this.col[i]];
      const fade = 1 - u;
      switch (k) {
        case Kind.Dot:
          g.globalAlpha = fade;
          g.fillStyle = c;
          g.beginPath();
          g.arc(x, y, s, 0, TAU);
          g.fill();
          break;
        case Kind.Puff:
        case Kind.Smoke:
          g.globalAlpha = (k === Kind.Smoke ? 0.45 : 0.85) * fade * Math.min(1, u * 8);
          g.fillStyle = c;
          g.beginPath();
          g.arc(x, y, s, 0, TAU);
          g.arc(x + s * 0.75, y + s * 0.2, s * 0.68, 0, TAU);
          g.arc(x - s * 0.7, y + s * 0.3, s * 0.6, 0, TAU);
          g.fill();
          break;
        case Kind.Spark:
        case Kind.Streak: {
          // velocity-aligned line
          const vx = this.vx[i];
          const vy = this.vy[i];
          const sp = Math.hypot(vx, vy) || 1;
          const len = Math.min(k === Kind.Streak ? 90 : 26, sp * 0.03) + s;
          g.globalAlpha = fade;
          g.strokeStyle = c;
          g.lineWidth = Math.max(1, s * 0.4 * fade + 0.8);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x - (vx / sp) * len, y - (vy / sp) * len);
          g.stroke();
          break;
        }
        case Kind.Star:
          g.globalAlpha = Math.sin(Math.PI * Math.min(1, u * 1.2));
          star4(g, x, y, s, this.rot[i], c);
          break;
        case Kind.Ring:
          g.globalAlpha = fade;
          g.strokeStyle = c;
          g.lineWidth = Math.max(0.5, 5 * fade);
          g.beginPath();
          g.arc(x, y, s, 0, TAU);
          g.stroke();
          break;
        case Kind.Shard:
        case Kind.Confetti: {
          g.globalAlpha = Math.min(1, fade * 2);
          g.fillStyle = c;
          g.save();
          g.translate(x, y);
          g.rotate(this.rot[i]);
          if (k === Kind.Confetti) {
            g.scale(1, Math.cos(this.rot[i] * 2.3));
            g.fillRect(-s, -s * 0.5, s * 2, s);
          } else {
            g.beginPath();
            g.moveTo(-s, -s * 0.6);
            g.lineTo(s, -s * 0.2);
            g.lineTo(-s * 0.2, s);
            g.closePath();
            g.fill();
          }
          g.restore();
          break;
        }
        case Kind.Flash:
          g.globalAlpha = 1;
          drawGlow(g, x, y, c, s, fade * fade, false);
          break;
      }
    }
    g.globalAlpha = 1;
  }

  // ----------------------------------------------------------------------- presets

  /** footstep / skid dust kicked backwards (dir = -1 left, +1 right) */
  dust(x: number, y: number, o: { dir?: number; n?: number; color?: string; power?: number } = {}): void {
    const n = o.n ?? 3;
    const p = o.power ?? 1;
    for (let i = 0; i < n; i++)
      this.emit(Kind.Puff, x + (this.rand() - 0.5) * 8, y - 3, {
        vx: (o.dir ?? -1) * (40 + this.rand() * 80) * p,
        vy: -20 - this.rand() * 40 * p,
        life: 0.35 + this.rand() * 0.25,
        size: 3 + this.rand() * 3 * p,
        grow: 2.4,
        drag: 3,
        color: o.color ?? '#EFE8DA',
      });
  }

  /** landing: dust fans out both ways */
  land(x: number, y: number, o: { power?: number; color?: string } = {}): void {
    const p = o.power ?? 1;
    for (const d of [-1, 1])
      for (let i = 0; i < 4; i++)
        this.emit(Kind.Puff, x + d * 10, y - 4, {
          vx: d * (120 + this.rand() * 160) * p,
          vy: -30 - this.rand() * 50,
          life: 0.4 + this.rand() * 0.2,
          size: 4 + this.rand() * 4,
          grow: 2.2,
          drag: 5,
          color: o.color ?? '#EFE8DA',
        });
  }

  /** hit sparks in a cone */
  sparks(x: number, y: number, o: { angle?: number; spread?: number; n?: number; speed?: number; color?: string } = {}): void {
    const n = o.n ?? 10;
    for (let i = 0; i < n; i++) {
      const a = (o.angle ?? -Math.PI / 2) + (this.rand() - 0.5) * (o.spread ?? 1.6);
      const v = (o.speed ?? 700) * (0.5 + this.rand() * 0.7);
      this.emit(Kind.Spark, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.22 + this.rand() * 0.2, size: 4, gravity: 900, drag: 2, color: o.color ?? '#FFE9A8', additive: true });
    }
  }

  /** reward / perfect sparkle burst */
  sparkle(x: number, y: number, o: { n?: number; radius?: number; color?: string } = {}): void {
    const n = o.n ?? 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + this.rand() * 0.5;
      const v = (o.radius ?? 60) * (2 + this.rand() * 2);
      this.emit(Kind.Star, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.45 + this.rand() * 0.2, size: 7 + this.rand() * 6, drag: 6, rot: this.rand() * 3, vrot: 4, color: o.color ?? '#FFFFFF' });
    }
    this.emit(Kind.Flash, x, y, { life: 0.25, size: 70, color: o.color ?? '#FFE08A' });
  }

  /** expanding shock ring */
  ring(x: number, y: number, o: { radius?: number; life?: number; color?: string } = {}): void {
    this.emit(Kind.Ring, x, y, { life: o.life ?? 0.35, size: 8, grow: (o.radius ?? 90) / 8, color: o.color ?? '#FFFFFF' });
  }

  /** local flash glow (NOT full-screen) */
  flash(x: number, y: number, o: { radius?: number; life?: number; color?: string } = {}): void {
    this.emit(Kind.Flash, x, y, { life: o.life ?? 0.18, size: o.radius ?? 160, color: o.color ?? '#FFFFFF' });
  }

  /** breakable shards */
  shards(x: number, y: number, o: { n?: number; speed?: number; color?: string } = {}): void {
    const n = o.n ?? 12;
    for (let i = 0; i < n; i++) {
      const a = this.rand() * TAU;
      const v = (o.speed ?? 380) * (0.5 + this.rand());
      this.emit(Kind.Shard, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 150, life: 0.6 + this.rand() * 0.3, size: 3 + this.rand() * 5, gravity: 1100, rot: this.rand() * 6, vrot: (this.rand() - 0.5) * 30, color: o.color ?? '#BFEFFF' });
    }
  }

  /** celebration confetti (multi-colour) */
  confetti(x: number, y: number, o: { n?: number; colors?: string[] } = {}): void {
    const cols = o.colors ?? ['#FFD34D', '#FF7F66', '#7FE3B0', '#8FD3F0', '#FFFFFF'];
    const n = o.n ?? 24;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (this.rand() - 0.5) * 1.6;
      const v = 400 + this.rand() * 500;
      this.emit(Kind.Confetti, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2 + this.rand() * 0.8, size: 4 + this.rand() * 3, gravity: 700, drag: 2.2, rot: this.rand() * 6, vrot: (this.rand() - 0.5) * 16, color: cols[i % cols.length] });
    }
  }

  /** slow rising smoke / steam */
  smoke(x: number, y: number, o: { n?: number; color?: string } = {}): void {
    const n = o.n ?? 3;
    for (let i = 0; i < n; i++)
      this.emit(Kind.Smoke, x + (this.rand() - 0.5) * 20, y, { vx: (this.rand() - 0.5) * 30, vy: -40 - this.rand() * 40, life: 1.4 + this.rand(), size: 10 + this.rand() * 8, grow: 3, drag: 0.5, color: o.color ?? '#CFCFD6' });
  }

  /** speed streaks (dash / whoosh), additive */
  streaks(x: number, y: number, o: { dir?: number; n?: number; color?: string } = {}): void {
    const n = o.n ?? 6;
    for (let i = 0; i < n; i++)
      this.emit(Kind.Streak, x + (this.rand() - 0.5) * 30, y + (this.rand() - 0.5) * 70, { vx: -(o.dir ?? 1) * (1600 + this.rand() * 900), vy: 0, life: 0.14 + this.rand() * 0.1, size: 3, color: o.color ?? '#FFFFFF', additive: true });
  }

  stats(): { count: number; max: number } {
    return { count: this.n, max: this.max };
  }
}

/** Fire `fn` once for every new event on a BeatInfo lane (keep one tracker per listener). */
export class BeatTrigger {
  private last = new Map<Instrument, number>();
  on(b: BeatInfo, lane: Instrument, fn: (count: number) => void): void {
    const c = b.count[lane];
    const prev = this.last.get(lane);
    if (prev === undefined) {
      this.last.set(lane, c);
      return;
    }
    if (c !== prev) {
      this.last.set(lane, c);
      if (b.since[lane] < 0.2) fn(c);
    }
  }
}
