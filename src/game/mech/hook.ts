/**
 * HOOK RIDES — act 2's new verb (iteration 4, docs/level/act2_plan.md): swing the cue ON the beat to HOOK it over a
 * line or rope and ride it. The strike becomes a way to TRAVEL (across an alley, up a storey, down into the Lanes).
 *
 *   'rope'    a counterweight rope: it yanks Slim UP (the climb's hoist; a missed hook = take the fire-escape stairs)
 *   'line'    a laundry line / cable: Slim hangs from the cue and slides along it (across a light well, or DOWN the
 *             chorus zip into the Blacklight Lanes). Over an alley a missed hook is a fall (lethal)
 *   'cradle'  a window-washer's cradle: strike its rope and it hoists Slim, standing, up the facade on the bass
 *
 * The ride's `path` is the hero's FEET height (px above the street) as a function of his x in beats ([beat, h] points,
 * piecewise linear, the first point = the grab beat, the last = where he lets go). A line / rope is drawn `HOOK.hang`
 * px above the feet (where his hands hold the cue). While riding, physics still moves him horizontally (he keeps
 * running on the music; the surge works), Mechanics pins his feet to the path after every step, and he can STRIKE
 * (smash windows / bat bottles on the way). Jumps are ignored until he lets go.
 *
 * Grab rule (timing, not geometry: the art makes the line reachable): the strike's PRESS (its active edge minus the
 * startup) falls in [beat − early, beat + late] beats while he is still before the path's end. The windows are
 * generous on the late side (+0.5 beat ≈ +180 ms) like every lethal in the level.
 */
import type { HookStyle } from '../../level/types';

export const HOOK = {
  /** grab window around the hook's beat (beats): press up to `early` before / `late` after */
  early: 0.3,
  late: 0.5,
  /** hands (the line) above the feet while hanging (px) — presentation */
  hang: 150,
} as const;

export type HookState = 'idle' | 'riding' | 'done';

export interface HookRide {
  id: number;
  beat: number;
  style: HookStyle;
  /** feet path in world units: [x, y] (y down), sorted by x */
  pts: [number, number][];
  x0: number;
  x1: number;
  state: HookState;
  /** 0..1 progress along the path (presentation) */
  k: number;
  /** seconds in the current state (presentation) */
  t: number;
}

/** feet y on the path at world x (clamped to its ends) */
export function hookY(h: HookRide, x: number): number {
  const p = h.pts;
  if (x <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (x <= p[i][0]) {
      const [xa, ya] = p[i - 1];
      const [xb, yb] = p[i];
      return ya + ((yb - ya) * (x - xa)) / Math.max(1e-6, xb - xa);
    }
  }
  return p[p.length - 1][1];
}
