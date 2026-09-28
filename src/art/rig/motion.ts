/**
 * Motion primitives: squash & stretch, secondary motion (springs), strike timing.
 * Pure functions of time for stateless drawing, plus `SpringValue` for engine-side state.
 */
import { TAU, clamp01, easeOut, smooth } from '../core/math';

/** Volume-preserving squash: a > 0 squashes (wide+short), a < 0 stretches (thin+tall). */
export function squash(a: number): { sx: number; sy: number } {
  const sx = 1 + a;
  return { sx, sy: 1 / Math.max(0.2, sx) };
}

/** Stretch from vertical speed (px/s, y down): rising/falling fast -> tall+thin. */
export function velocityStretch(vy: number, k = 1 / 2600, max = 0.28): { sx: number; sy: number } {
  return squash(-Math.min(max, Math.abs(vy) * k));
}

/** Landing squash that springs back (t = seconds since touchdown). */
export function landSquash(t: number, power = 0.34, dur = 0.22): { sx: number; sy: number } {
  if (t < 0 || t > dur * 2) return { sx: 1, sy: 1 };
  const k = (1 - easeOut(t / dur)) * (1 + Math.exp(-9 * t) * Math.sin(TAU * 4 * t) * 0.3);
  return squash(power * Math.max(-0.3, k));
}

/** Damped spring step response 0 -> 1 with overshoot (secondary motion / follow-through). */
export function springStep(t: number, freq = 3, damp = 6): number {
  if (t <= 0) return 0;
  return 1 - Math.exp(-damp * t) * Math.cos(TAU * freq * t);
}

/** Decaying wobble for follow-through (0 at t=0). */
export function followThrough(t: number, amp = 1, freq = 3, damp = 7): number {
  return t <= 0 ? 0 : amp * Math.exp(-damp * t) * Math.sin(TAU * freq * t);
}

/**
 * Anticipation-free strike progress (DESIGN: "short backswing, big follow-through"):
 * u = 1 at t = 0 (the CONTACT frame is the input frame), overshoots to `over` by `peakT`,
 * settles back to `settle`, then returns to 0 (rest) by `endT`. Smear start = strikeSmearStart.
 */
export function strikeU(t: number, over = 2, peakT = 0.09, settleT = 0.2, endT = 0.42, settle = 1.75): number {
  if (t < 0) return 0;
  if (t < peakT) return 1 + (over - 1) * easeOut(t / peakT);
  if (t < settleT) return over - (over - settle) * smooth((t - peakT) / (settleT - peakT));
  return settle * (1 - smooth((t - settleT) / (endT - settleT)));
}
/** where the smear ribbon starts (it sweeps from the wind-up position, then collapses) */
export function strikeSmearStart(t: number, u: number, dur = 0.13): number {
  return Math.min(u, u * smooth(t / dur));
}
export function strikeSmearAlpha(t: number, dur = 0.15): number {
  return 1 - clamp01(t / dur);
}

/** Stateful critically-damped spring (engine side: eyes, capes, antennae, cameras...). */
export class SpringValue {
  v = 0;
  vel = 0;
  constructor(
    public target = 0,
    public stiffness = 180,
    public damping = 18,
  ) {
    this.v = target;
  }
  update(dt: number): number {
    const a = this.stiffness * (this.target - this.v) - this.damping * this.vel;
    this.vel += a * dt;
    this.v += this.vel * dt;
    return this.v;
  }
  kick(impulse: number): void {
    this.vel += impulse;
  }
}

/** Beat bob: 1 on the beat decaying (idle bounce that lands ON the beat). */
export function beatBob(beatPhase: number, sharp = 6): number {
  return Math.exp(-beatPhase * sharp);
}
