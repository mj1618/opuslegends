/**
 * Autoplay bot (?autoplay=1): plays the level by pressing each intended action's button on its
 * beat, through the same Controls the human uses (no physics cheating). Holds right throughout.
 * Doubles as validation that the authored intended path is actually playable.
 */
import type { TempoMap } from '../audio/tempoMap';
import type { Button, Controls } from '../engine/input';
import type { ActionMarker } from './entities';

const BUTTON: Record<ActionMarker['type'], Button> = { jump: 'jump', punch: 'punch', slide: 'down' };
const DEFAULT_HOLD: Record<ActionMarker['type'], number> = { jump: 1, punch: 0.1, slide: 1 };

export class AutoPlayer {
  private idx = 0;
  private releases: { button: Button; time: number }[] = [];
  /** log of presses: intended beat vs the song time we pressed at */
  presses: { type: ActionMarker['type']; beat: number; songTime: number }[] = [];
  private actions: readonly ActionMarker[];
  private tempo: TempoMap;
  /** beats to deliberately skip once (death/respawn testing) */
  private misses: Set<number>;

  constructor(actions: readonly ActionMarker[], tempo: TempoMap, misses: number[] = []) {
    this.actions = actions;
    this.tempo = tempo;
    this.misses = new Set(misses);
  }

  reset(fromBeat: number, controls: Controls): void {
    this.idx = this.actions.findIndex((a) => a.beat >= fromBeat - 1e-6);
    if (this.idx < 0) this.idx = this.actions.length;
    this.releases = [];
    controls.reset();
  }

  /**
   * Called at the start of every sim step. `stepEnd` is the song time at the end of the step
   * (the step spans (stepEnd - dt, stepEnd]); presses land on the step closest to the beat.
   */
  update(stepEnd: number, dt: number, c: Controls): void {
    if (!c.right) c.apply('right', true, stepEnd);
    for (let i = this.releases.length - 1; i >= 0; i--) {
      const r = this.releases[i];
      if (r.time <= stepEnd - dt / 2) {
        c.apply(r.button, false, stepEnd);
        this.releases.splice(i, 1);
      }
    }
    while (this.idx < this.actions.length) {
      const a = this.actions[this.idx];
      const t = this.tempo.beatToTime(a.beat);
      if (t > stepEnd - dt / 2) break;
      this.idx++;
      if (this.misses.delete(a.beat)) continue; // sabotage: skip this one once
      const b = BUTTON[a.type];
      if (b === 'jump' ? c.jump : b === 'punch' ? c.punch : c.down) c.apply(b, false, stepEnd);
      c.apply(b, true, stepEnd - dt);
      this.presses.push({ type: a.type, beat: a.beat, songTime: stepEnd - dt });
      // replace any pending release of the same button
      this.releases = this.releases.filter((r) => r.button !== b);
      this.releases.push({ button: b, time: this.tempo.beatToTime(a.beat + (a.hold ?? DEFAULT_HOLD[a.type])) });
    }
  }
}
