/**
 * Run statistics + rhythm timing analysis (player actions vs intended beats) + frame timing.
 * Everything here feeds the end screen, the debug overlay and the playtest JSON report.
 */
import type { TempoMap } from '../audio/tempoMap';
import type { ActionType } from '../level/types';
import type { ActionMarker } from './entities';

export interface ExecutedAction {
  type: ActionType;
  /** song time when the action executed in the simulation (step start) */
  simTime: number;
  /** song time of the button press that caused it (NaN if unknown) */
  pressTime: number;
  /** player x at execution */
  x: number;
}

export interface ActionTiming {
  type: ActionType;
  beat: number;
  matched: boolean;
  /** execution time - beat time (ms) */
  execErrMs: number;
  /** press time - beat time (ms) */
  pressErrMs: number;
  /** where the hero physically was vs where the level expects on that beat, in ms of running */
  posErrMs: number;
}

export interface Summary {
  n: number;
  meanMs: number;
  meanAbsMs: number;
  maxAbsMs: number;
  p50AbsMs: number;
  p95AbsMs: number;
}

export function summarize(vals: number[]): Summary {
  const v = vals.filter((x) => Number.isFinite(x));
  if (v.length === 0) return { n: 0, meanMs: NaN, meanAbsMs: NaN, maxAbsMs: NaN, p50AbsMs: NaN, p95AbsMs: NaN };
  const abs = v.map(Math.abs).sort((a, b) => a - b);
  return {
    n: v.length,
    meanMs: round(v.reduce((s, x) => s + x, 0) / v.length),
    meanAbsMs: round(abs.reduce((s, x) => s + x, 0) / abs.length),
    maxAbsMs: round(abs[abs.length - 1]),
    p50AbsMs: round(abs[Math.floor(abs.length * 0.5)]),
    p95AbsMs: round(abs[Math.min(abs.length - 1, Math.floor(abs.length * 0.95))]),
  };
}

const round = (x: number) => Math.round(x * 100) / 100;

export class RunStats {
  deaths = 0;
  lums = 0;
  lumsTotal = 0;
  startedAt = 0;
  finishedAt = NaN;
  finished = false;
  executed: ExecutedAction[] = [];
  deathLog: { beat: number; cause: string }[] = [];
  stumbles = 0;
  stumbleLog: { beat: number; cause: string; lagBeats?: number }[] = [];
  /** pendulum targets struck / total in play */
  pendulums = 0;
  pendulumsTotal = 0;
  /** completed Hup-Hup-HEY phrases (strike landed as a Heave) */
  heaves = 0;
  /** beats needed to get back on the grid after each stumble (surge recovery) */
  recoveries: number[] = [];
  /** sim-vs-audio drift samples (ms) */
  maxDriftMs = 0;
  hitstops = 0;
  /** breakables smashed + thrown bottles batted back (restored to the checkpoint's count on a rewind) */
  breakables = 0;
  /** breakables + bat-able thrown bottles in play from the run's start beat */
  breakablesTotal = 0;
  /** Hup-Hup-HEY phrases in play from the run's start beat */
  phrasesTotal = 0;
  /** hidden film canisters picked up (restored to the checkpoint's on a rewind) / in play (iteration 6) */
  canisters = 0;
  canistersTotal = 0;
  /** near-misses survived this run (iteration 6, the WHEW) */
  whews = 0;

  reset(): void {
    this.deaths = 0;
    this.lums = 0;
    this.startedAt = performance.now();
    this.finishedAt = NaN;
    this.finished = false;
    this.executed = [];
    this.deathLog = [];
    this.stumbles = 0;
    this.stumbleLog = [];
    this.pendulums = 0;
    this.heaves = 0;
    this.recoveries = [];
    this.maxDriftMs = 0;
    this.hitstops = 0;
    this.breakables = 0;
    this.canisters = 0;
    this.whews = 0;
  }

  /**
   * Match intended actions to executed actions (same type, nearest within half a beat).
   * Only the LAST attempt at each action counts (after deaths, earlier attempts are superseded).
   */
  timings(actions: readonly ActionMarker[], tempo: TempoMap, ppb: number, fromBeat: number, toBeat: number): ActionTiming[] {
    const out: ActionTiming[] = [];
    for (const a of actions) {
      if (a.beat < fromBeat || a.beat > toBeat) continue;
      const bt = tempo.beatToTime(a.beat);
      const win = tempo.secondsPerBeatAt(a.beat) * 0.5;
      // most recent execution within the window (song time repeats after a checkpoint rewind)
      let best: ExecutedAction | null = null;
      for (let i = this.executed.length - 1; i >= 0; i--) {
        const e = this.executed[i];
        if (e.type === a.type && Math.abs(e.simTime - bt) <= win) {
          best = e;
          break;
        }
      }
      if (!best) {
        out.push({ type: a.type, beat: a.beat, matched: false, execErrMs: NaN, pressErrMs: NaN, posErrMs: NaN });
        continue;
      }
      const spb = tempo.secondsPerBeatAt(a.beat);
      out.push({
        type: a.type,
        beat: a.beat,
        matched: true,
        execErrMs: (best.simTime - bt) * 1000,
        pressErrMs: (best.pressTime - bt) * 1000,
        posErrMs: (best.x / ppb - a.beat) * spb * 1000,
      });
    }
    return out;
  }
}

/** Frame-time recorder (ms between rendered frames). */
export class FrameStats {
  private samples: number[] = [];
  private last = NaN;
  fps = 0;
  private fpsAcc = 0;
  private fpsN = 0;

  tick(now: number): number {
    const dt = Number.isNaN(this.last) ? 16.7 : now - this.last;
    this.last = now;
    if (this.samples.length < 200000) this.samples.push(dt);
    this.fpsAcc += dt;
    this.fpsN++;
    if (this.fpsAcc >= 500) {
      this.fps = (1000 * this.fpsN) / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsN = 0;
    }
    return dt;
  }

  reset(): void {
    this.samples = [];
  }

  summary(): { frames: number; meanMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number; over25ms: number; avgFps: number } {
    // ignore the first few frames (startup)
    const s = this.samples.slice(5).sort((a, b) => a - b);
    if (s.length === 0) return { frames: 0, meanMs: NaN, p50Ms: NaN, p95Ms: NaN, p99Ms: NaN, maxMs: NaN, over25ms: 0, avgFps: NaN };
    const q = (p: number) => round(s[Math.min(s.length - 1, Math.floor(s.length * p))]);
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    return {
      frames: s.length,
      meanMs: round(mean),
      p50Ms: q(0.5),
      p95Ms: q(0.95),
      p99Ms: q(0.99),
      maxMs: round(s[s.length - 1]),
      over25ms: s.filter((x) => x > 25).length,
      avgFps: round(1000 / mean),
    };
  }
}
