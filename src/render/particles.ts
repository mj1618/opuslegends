/**
 * Pooled particle system (struct-of-arrays, zero allocation per particle).
 * Particles are simulated in presentation time (they keep drifting during hitstop unless
 * the caller passes 0), drawn as circles or squares in world space.
 */
export const PShape = { Circle: 0, Square: 1, Spark: 2 } as const;
export type PShape = (typeof PShape)[keyof typeof PShape];

export interface EmitOpts {
  x: number;
  y: number;
  count: number;
  speed: [number, number];
  /** direction (radians) and spread */
  angle?: number;
  spread?: number;
  life: [number, number];
  size: [number, number];
  color: string;
  gravity?: number;
  drag?: number;
  shape?: PShape;
  /** end size multiplier */
  shrink?: number;
  /** extra velocity added to every particle */
  vx?: number;
  vy?: number;
}

export class Particles {
  readonly max: number;
  private n = 0;
  private x: Float32Array;
  private y: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private size: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private shrink: Float32Array;
  private shape: Uint8Array;
  private color: Uint16Array;
  private palette: string[] = [];
  private paletteIdx = new Map<string, number>();

  constructor(max = 3000) {
    this.max = max;
    this.x = new Float32Array(max);
    this.y = new Float32Array(max);
    this.vx = new Float32Array(max);
    this.vy = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.size = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.shrink = new Float32Array(max);
    this.shape = new Uint8Array(max);
    this.color = new Uint16Array(max);
  }

  get count(): number {
    return this.n;
  }

  private colorIndex(c: string): number {
    let i = this.paletteIdx.get(c);
    if (i === undefined) {
      i = this.palette.length;
      this.palette.push(c);
      this.paletteIdx.set(c, i);
    }
    return i;
  }

  emit(o: EmitOpts): void {
    const ci = this.colorIndex(o.color);
    const ang = o.angle ?? -Math.PI / 2;
    const spread = o.spread ?? Math.PI * 2;
    for (let k = 0; k < o.count; k++) {
      let i = this.n;
      if (i >= this.max) {
        // overwrite a random live particle rather than dropping the effect
        i = (Math.random() * this.max) | 0;
      } else this.n++;
      const a = ang + (Math.random() - 0.5) * spread;
      const s = o.speed[0] + Math.random() * (o.speed[1] - o.speed[0]);
      this.x[i] = o.x;
      this.y[i] = o.y;
      this.vx[i] = Math.cos(a) * s + (o.vx ?? 0);
      this.vy[i] = Math.sin(a) * s + (o.vy ?? 0);
      const l = o.life[0] + Math.random() * (o.life[1] - o.life[0]);
      this.life[i] = l;
      this.maxLife[i] = l;
      this.size[i] = o.size[0] + Math.random() * (o.size[1] - o.size[0]);
      this.grav[i] = o.gravity ?? 0;
      this.drag[i] = o.drag ?? 0;
      this.shrink[i] = o.shrink ?? 0;
      this.shape[i] = o.shape ?? PShape.Circle;
      this.color[i] = ci;
    }
  }

  update(dt: number): void {
    if (dt <= 0) return;
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // swap-remove
        const j = --this.n;
        this.x[i] = this.x[j];
        this.y[i] = this.y[j];
        this.vx[i] = this.vx[j];
        this.vy[i] = this.vy[j];
        this.life[i] = this.life[j];
        this.maxLife[i] = this.maxLife[j];
        this.size[i] = this.size[j];
        this.grav[i] = this.grav[j];
        this.drag[i] = this.drag[j];
        this.shrink[i] = this.shrink[j];
        this.shape[i] = this.shape[j];
        this.color[i] = this.color[j];
        continue;
      }
      const d = this.drag[i];
      if (d > 0) {
        const k = Math.exp(-d * dt);
        this.vx[i] *= k;
        this.vy[i] *= k;
      }
      this.vy[i] += this.grav[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      i++;
    }
  }

  clear(): void {
    this.n = 0;
  }

  draw(ctx: CanvasRenderingContext2D, viewX0: number, viewX1: number): void {
    let lastColor = -1;
    for (let i = 0; i < this.n; i++) {
      const x = this.x[i];
      if (x < viewX0 - 50 || x > viewX1 + 50) continue;
      const t = this.life[i] / this.maxLife[i]; // 1 -> 0
      const s = this.size[i] * (1 - this.shrink[i] * (1 - t));
      if (s <= 0.2) continue;
      if (this.color[i] !== lastColor) {
        lastColor = this.color[i];
        ctx.fillStyle = this.palette[lastColor];
      }
      ctx.globalAlpha = Math.min(1, t * 2.5);
      const y = this.y[i];
      switch (this.shape[i]) {
        case PShape.Square:
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
          break;
        case PShape.Spark: {
          // streak along velocity
          const vx = this.vx[i] * 0.03;
          const vy = this.vy[i] * 0.03;
          ctx.beginPath();
          ctx.moveTo(x - vy * 0.15 * s * 0.1, y + vx * 0.15 * s * 0.1);
          ctx.lineTo(x + vx, y + vy);
          ctx.lineTo(x + vy * 0.15 * s * 0.1, y - vx * 0.15 * s * 0.1);
          ctx.lineTo(x - vx * 0.5, y - vy * 0.5);
          ctx.closePath();
          ctx.fill();
          break;
        }
        default:
          ctx.beginPath();
          ctx.arc(x, y, s / 2, 0, Math.PI * 2);
          ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
