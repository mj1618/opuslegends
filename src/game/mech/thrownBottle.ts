/**
 * THROWN BOTTLES — act 2's first MOVING threat (DESIGN §4 rule 4; docs/level/act2_plan.md).
 *
 * A goon leans out of a window above and tosses a bottle on a visible arc that ARRIVES ON ITS BEAT:
 *   'bottle'    arrives at the BAT POINT (chest height, `BAT.ahead` px in front of the hero's beat position) on
 *               `beat`: strike ON the beat and Slim bats it back up through the window (token burst). Miss, and it
 *               clocks him ~95 ms later (stumble) — unless the swing lands within `BAT.grace` of the clip (iteration 4).
 *               Window ≈ −210/+140 ms (measured with the real strike box, playtest/slack.mjs --stumbles).
 *   'firebomb'  shatters on the floor ON `beat`, `FIRE.at` beats ahead of the hero (exactly where a spike sits),
 *               and burns for `FIRE.beats`: hop ON the beat over the flames (stumble if you run into them).
 * Telegraph (DESIGN: 1 beat audible + visual): the arc is visible from `from` (default 2 beats before), a target
 * mark sits on the arrival spot, and a whistle plays 1 beat before (game.ts → Mechanics.beat).
 *
 * Positions are a pure function of the WORLD beat (like pendulums and slams), so checkpoint rewinds and hitstop
 * just work: x/y follow a parabola from the window (u = 0 at `from`) to the arrival point (u = 1 on `beat`), and
 * keep going on the same curve if nothing stops them.
 */
import type { Rect } from '../../engine/math';
import type { ThrowStyle } from '../../level/types';

export const BAT = {
  /** arrival point: px ahead of the hero's beat position / px above the floor */
  ahead: 175,
  h: 125,
  r: 24,
  /**
   * default window offset from the arrival point (px right, px above the floor) and toss loft (px). Tuned so the
   * bottle is still flying AT Slim after the beat (an unbatted bottle hits him ~95 ms late, it never just drops at
   * his feet) and the window is on screen when it throws (~1240 px ahead of Slim, 2 beats before). A bottle is a stumble, so its late side
   * (+70 ms) is tighter than a pit's: it comes AT you, bat it on the beat.
   */
  dx: 300,
  wh: 600,
  loft: 60,
  /** flight time (beats) when the level doesn't say */
  beats: 2,
  /**
   * iteration 4 (review iter3 fix 2: the late side was +70 ms, the stingiest window in the game): once the bottle clips
   * him, a swing that goes active within this many seconds still bats it off his shoulder. Late window ≈ +140 ms.
   */
  grace: 0.07,
} as const;

export const FIRE = {
  /**
   * beats ahead of the hero's beat position where the firebomb lands. Iteration 4: 0.45 → 0.5 and the hurt box 34 → 16×18
   * px (the flames are DRAWN big; this is their fair core): window −100/+145 ms (was ≈ ±100), the act-2 rule ≥ +130 late
   */
  at: 0.5,
  /** flame hurt box (px) — a spike is 28×28 */
  w: 16,
  h: 18,
  /** how long it burns after landing (beats) */
  beats: 1.6,
} as const;

export type BottleState = 'idle' | 'air' | 'batted' | 'smashed' | 'burning' | 'out';

export interface ThrownBottle {
  id: number;
  beat: number;
  from: number;
  style: ThrowStyle;
  /** throw origin (the window), world */
  wx: number;
  wy: number;
  /** arrival point on `beat` (bat point / where the firebomb lands), world */
  tx: number;
  ty: number;
  loft: number;
  /** floor top under the arrival point */
  floorY: number;
  r: number;
  /** tokens for batting it back */
  tokens: number;
  // ---- runtime (reset by Mechanics.reset)
  state: BottleState;
  /** seconds since it first clipped the hero (−1 = not yet): the bat grace */
  graze: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  /** seconds in the current state (presentation) */
  t: number;
  /** firebomb flames (world): valid while burning */
  fire: Rect;
}

/** arc position at world beat `wb` (u may exceed 1: the bottle keeps falling on the same curve) */
export function bottleArc(b: ThrownBottle, wb: number, out: { x: number; y: number }): { x: number; y: number } {
  const u = (wb - b.from) / Math.max(0.25, b.beat - b.from);
  out.x = b.wx + (b.tx - b.wx) * u;
  out.y = b.wy + (b.ty - b.wy) * u - 4 * b.loft * u * (1 - u);
  return out;
}

/** 0..1 progress of the throw (presentation: the target mark sharpens as it comes) */
export function bottleProgress(b: ThrownBottle, wb: number): number {
  return Math.max(0, Math.min(1, (wb - b.from) / Math.max(0.25, b.beat - b.from)));
}
