/**
 * Easing functions + a tiny pooled tween manager.
 *
 * Tweens animate a numeric property on any object: `tweens.to(cam, 'zoom', 1.05, 0.08, Ease.outQuad)`.
 * Chain with `.then(...)`. Tweens are updated with whatever dt the owner chooses
 * (presentation time, so they keep running during hitstop unless you pass the sim dt).
 */
export type EaseFn = (t: number) => number;

export const Ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t: number) => {
    const c1 = 1.70158;
    return (c1 + 1) * t * t * t - c1 * t * t;
  },
  outElastic: (t: number) => {
    if (t <= 0 || t >= 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  /** 0 -> 1 -> 0 over the tween ("punch" shape) */
  pulse: (t: number) => Math.sin(Math.PI * t),
} satisfies Record<string, EaseFn>;

type Target = Record<string, unknown>;

export class Tween {
  target: Target = {};
  key = '';
  from = 0;
  to = 0;
  dur = 0;
  t = 0;
  ease: EaseFn = Ease.linear;
  active = false;
  /** for pulse-style eases the value returns to `from` */
  next: (() => void) | null = null;

  update(dt: number): void {
    this.t += dt;
    const k = this.dur <= 0 ? 1 : Math.min(1, this.t / this.dur);
    this.target[this.key] = this.from + (this.to - this.from) * this.ease(k);
    if (k >= 1) {
      this.active = false;
      const n = this.next;
      this.next = null;
      if (n) n();
    }
  }

  then(fn: () => void): this {
    this.next = fn;
    return this;
  }
}

export class TweenManager {
  private pool: Tween[] = [];

  /** Tween `obj[key]` from its current value to `to`. Replaces an existing tween on the same obj/key. */
  to<T extends object>(obj: T, key: keyof T & string, to: number, dur: number, ease: EaseFn = Ease.outQuad): Tween {
    const target = obj as unknown as Target;
    return this.fromTo(obj, key, Number(target[key]), to, dur, ease);
  }

  fromTo<T extends object>(obj: T, key: keyof T & string, from: number, to: number, dur: number, ease: EaseFn = Ease.outQuad): Tween {
    const target = obj as unknown as Target;
    let tw: Tween | undefined;
    for (const t of this.pool) {
      if (t.active && t.target === target && t.key === key) {
        tw = t;
        break;
      }
    }
    if (!tw) tw = this.pool.find((t) => !t.active);
    if (!tw) {
      tw = new Tween();
      this.pool.push(tw);
    }
    tw.target = target;
    tw.key = key;
    tw.from = from;
    tw.to = to;
    tw.dur = dur;
    tw.t = 0;
    tw.ease = ease;
    tw.active = true;
    tw.next = null;
    target[key] = from;
    return tw;
  }

  update(dt: number): void {
    for (const t of this.pool) if (t.active) t.update(dt);
  }

  clear(): void {
    for (const t of this.pool) t.active = false;
  }
}
