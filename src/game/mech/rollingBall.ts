/**
 * ROLLING BALLS — the Blacklight Lanes' moving threat (DESIGN §4 rule 4 / §5.3; docs/level/act2_plan.md).
 *
 * A bowling ball rolls in from the right along the lane (leftward, `speed` px per beat) and passes exactly under
 * the middle of a tap hop pressed ON its beat: it is where a spike would be (`BALL.at` beats ahead) when the hero
 * gets there. Stumble if it hits you. Telegraph: it is on screen for ~2 beats before (it rolls in from `from`,
 * default 3 beats before), a floor rumble plays 1 beat before (game.ts → Mechanics.beat).
 * Like the thrown bottles, its position is a pure function of the world beat (rewinds/hitstop safe).
 */
export const BALL = {
  /** beats after its hop beat when the ball is under the hero (= spikeHop's spike) */
  at: 0.45,
  /** radius (px) — drawn a bit bigger; the hurt circle is this */
  r: 21,
  /** default roll speed (px per beat, leftward) */
  speed: 230,
  /** default beats of roll before the hop beat */
  lead: 3,
} as const;

export type BallState = 'idle' | 'rolling' | 'hit' | 'gone';

export interface RollingBall {
  id: number;
  beat: number;
  from: number;
  speed: number;
  r: number;
  /** world x of the ball on beat + BALL.at (the hero's position then) */
  meetX: number;
  /** lane (floor top) the ball rolls on */
  floorY: number;
  // ---- runtime
  state: BallState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** rolling angle (presentation) */
  rot: number;
  t: number;
}

/** ball x at world beat `wb` while rolling */
export function ballX(b: RollingBall, wb: number): number {
  return b.meetX - (wb - (b.beat + BALL.at)) * b.speed;
}
