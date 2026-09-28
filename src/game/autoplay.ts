/**
 * Autoplay bot (?autoplay=1): plays the level by pressing each intended action's button on its
 * beat, through the same Controls the human uses (no physics cheating). Holds right throughout.
 * Doubles as validation that the authored intended path is actually playable.
 *
 *   - cold open: presses STRIKE once to start the band
 *   - ?jitter=<ms>: each press lands at a random (seeded) offset in [-ms, +ms], re-rolled on every
 *     attempt; ?late=<p> adds an extra 60-110 ms delay to a fraction p of presses. `?sloppy=1` =
 *     jitter 85 + late 0.1: a "sloppy human" to check the level is hard but fair (report deaths)
 *   - ?miss=<beats>: skips the action at those beats once (stumble / death tests)
 *   - after a stumble the hero is BEHIND the grid (surging to catch up); the bot then presses when
 *     the hero physically reaches the action's position, like a human reacting to the world
 */
import type { TempoMap } from '../audio/tempoMap';
import type { Button, Controls } from '../engine/input';
import { makeRng } from '../engine/math';
import type { ActionMarker } from './entities';

const BUTTON: Record<ActionMarker['type'], Button> = { jump: 'jump', strike: 'strike', slide: 'down' };
const DEFAULT_HOLD: Record<ActionMarker['type'], number> = { jump: 1, strike: 0.1, slide: 1 };

export interface HeroView {
  phase: string;
  x: number;
  /** where the music says the hero should be (NaN if unknown) */
  musicX: number;
  ppb: number;
}

export class AutoPlayer {
  private idx = 0;
  private releases: { button: Button; time: number }[] = [];
  /** log of presses: intended beat vs the song time we pressed at */
  presses: { type: ActionMarker['type']; beat: number; songTime: number }[] = [];
  private actions: readonly ActionMarker[];
  private tempo: TempoMap;
  /** beats to deliberately skip once (death/respawn testing) */
  private misses: Set<number>;
  private jitterSec: number;
  private offsets: number[];
  private rng: () => number;
  /** probability of an extra late press (sloppy human) */
  private lateProb: number;
  private coldOpenT = 0;
  private coldOpenDone = false;

  constructor(actions: readonly ActionMarker[], tempo: TempoMap, misses: number[] = [], jitterMs = 0, seed = 1, lateProb = 0) {
    this.actions = actions;
    this.tempo = tempo;
    this.misses = new Set(misses);
    this.jitterSec = jitterMs / 1000;
    this.lateProb = lateProb;
    this.rng = makeRng(seed * 977 + 13);
    this.offsets = [];
    this.rollOffsets();
  }

  /** new random press offsets (re-rolled every attempt, like a human who doesn't repeat mistakes exactly) */
  private rollOffsets(): void {
    this.offsets = this.actions.map(() => {
      let o = (this.rng() * 2 - 1) * this.jitterSec;
      if (this.lateProb > 0 && this.rng() < this.lateProb) o += 0.06 + this.rng() * 0.05; // an occasional late press
      return o;
    });
  }

  reset(fromBeat: number, controls: Controls): void {
    if (this.jitterSec > 0 || this.lateProb > 0) this.rollOffsets();
    this.idx = this.actions.findIndex((a) => a.beat >= fromBeat - 1e-6);
    if (this.idx < 0) this.idx = this.actions.length;
    this.releases = [];
    controls.reset();
  }

  /**
   * Called at the start of every sim step. `stepEnd` is the song time at the end of the step
   * (the step spans (stepEnd - dt, stepEnd]); presses land on the step closest to the beat.
   */
  update(stepEnd: number, dt: number, c: Controls, hero?: HeroView): void {
    if (hero?.phase === 'coldOpen') {
      // wave the strike after a short beat of silence
      this.coldOpenT += dt;
      if (!this.coldOpenDone && this.coldOpenT > 0.35) {
        this.coldOpenDone = true;
        c.apply('strike', true, stepEnd);
      } else if (c.strike && this.coldOpenT > 0.45) c.apply('strike', false, stepEnd);
      return;
    }
    if (!c.right) c.apply('right', true, stepEnd);
    for (let i = this.releases.length - 1; i >= 0; i--) {
      const r = this.releases[i];
      if (r.time <= stepEnd - dt / 2) {
        c.apply(r.button, false, stepEnd);
        this.releases.splice(i, 1);
      }
    }
    const behind = hero && Number.isFinite(hero.musicX) && hero.phase === 'run' ? hero.musicX - hero.x > hero.ppb * 0.06 : false;
    while (this.idx < this.actions.length) {
      const a = this.actions[this.idx];
      const t = this.tempo.beatToTime(a.beat) + this.offsets[this.idx];
      if (t > stepEnd - dt / 2) break;
      // behind the grid: wait until the hero reaches the spot (plus the same jitter, in space)
      if (behind && hero && hero.x < a.x + this.offsets[this.idx] * (hero.ppb / this.tempo.secondsPerBeatAt(a.beat)) - 2) break;
      this.idx++;
      if (this.misses.delete(a.beat)) continue; // sabotage: skip this one once
      const b = BUTTON[a.type];
      if (b === 'jump' ? c.jump : b === 'strike' ? c.strike : c.down) c.apply(b, false, stepEnd);
      c.apply(b, true, stepEnd - dt);
      this.presses.push({ type: a.type, beat: a.beat, songTime: stepEnd - dt });
      // replace any pending release of the same button
      this.releases = this.releases.filter((r) => r.button !== b);
      const holdSec = this.tempo.beatToTime(a.beat + (a.hold ?? DEFAULT_HOLD[a.type])) - this.tempo.beatToTime(a.beat);
      this.releases.push({ button: b, time: stepEnd - dt + holdSec });
    }
  }
}
