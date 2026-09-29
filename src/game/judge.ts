/**
 * Timing judge (DESIGN §4): grades every hop/strike PRESS against the level's intended actions.
 * Perfect ±45 / Great ±90 / Good ±135 ms (early side +12 ms). Each press resolves to the nearest
 * unconsumed target of the same verb. Grades feed score, feedback, the crowd and the Hup-Hup-HEY
 * phrase check — NEVER physics (the controller doesn't know this module exists).
 */
import type { TempoMap } from '../audio/tempoMap';
import type { ActionMarker } from './entities';
import { Tun } from './tunables';

export type Grade = 'perfect' | 'great' | 'good' | 'miss';

export interface Target {
  action: ActionMarker;
  /** song time of the beat */
  time: number;
  consumed: boolean;
  grade: Grade | null;
  errMs: number;
}

export interface JudgeResult {
  target: Target;
  grade: Grade;
  errMs: number;
}

export class Judge {
  readonly targets: Target[];
  counts = { perfect: 0, great: 0, good: 0, miss: 0 };
  /** most recent result per verb (for SFX quantisation / popups) */
  last: Record<'jump' | 'strike', JudgeResult | null> = { jump: null, strike: null };

  constructor(actions: readonly ActionMarker[], tempo: TempoMap) {
    this.targets = actions
      .filter((a) => a.type === 'jump' || a.type === 'strike')
      .map((a) => ({ action: a, time: tempo.beatToTime(a.beat), consumed: false, grade: null, errMs: NaN }));
  }

  /** (Re)arm targets from `fromBeat` on; earlier ones are out of play. Counts are kept (run totals). */
  reset(fromBeat: number): void {
    for (const t of this.targets) {
      const live = t.action.beat >= fromBeat - 1e-6;
      if (live && t.grade) this.uncount(t.grade);
      t.consumed = !live;
      if (live) {
        t.grade = null;
        t.errMs = NaN;
      }
    }
    this.last = { jump: null, strike: null };
  }

  clearCounts(): void {
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
  }

  private uncount(g: Grade): void {
    this.counts[g] = Math.max(0, this.counts[g] - 1);
  }

  static gradeFor(errMs: number): Grade | null {
    const J = Tun.judge;
    const e = Math.abs(errMs) - (errMs < 0 ? J.earlyBonusMs : 0);
    if (e <= J.perfectMs) return 'perfect';
    if (e <= J.greatMs) return 'great';
    if (e <= J.goodMs) return 'good';
    return null;
  }

  /**
   * Grade a press of `verb` at song time `t` (s). Returns null if no target is in range. `lag` (s, ≥ 0; iteration 7):
   * the hero is that far BEHIND the music line (a scramble, a knockback): the press is graded against the grid shifted
   * by the lag when that fits better (a press ON the spot the hero reaches late is on time for the world he is in).
   */
  press(verb: 'jump' | 'strike', t: number, lag = 0): JudgeResult | null {
    if (!Number.isFinite(t)) return null;
    let best: Target | null = null;
    let bestErr = Infinity;
    const lagMs = Math.max(0, lag) * 1000;
    for (const tg of this.targets) {
      if (tg.consumed || tg.action.type !== verb) continue;
      const raw = (t - tg.time) * 1000;
      if (raw > 400 + lagMs) continue;
      if (raw < -400) break;
      const err = lagMs > 0 && Math.abs(raw - lagMs) < Math.abs(raw) ? raw - lagMs : raw;
      if (Judge.gradeFor(err) && Math.abs(err) < Math.abs(bestErr)) {
        best = tg;
        bestErr = err;
      }
    }
    if (!best) return null;
    const grade = Judge.gradeFor(bestErr) as Grade;
    best.consumed = true;
    best.grade = grade;
    best.errMs = bestErr;
    this.counts[grade]++;
    const r = { target: best, grade, errMs: bestErr };
    this.last[verb] = r;
    return r;
  }

  /** Targets whose window has passed without a press become misses. Returns the new misses. `lag` (s): see press() */
  expire(t: number, lag = 0): Target[] {
    const late = (Tun.judge.goodMs + 5) / 1000 + Math.max(0, lag);
    const out: Target[] = [];
    for (const tg of this.targets) {
      if (tg.consumed) continue;
      if (tg.time > t) break;
      if (t - tg.time > late) {
        tg.consumed = true;
        tg.grade = 'miss';
        this.counts.miss++;
        out.push(tg);
      }
    }
    return out;
  }

  /** Did every action of phrase `idx` grade Good or better? */
  phraseComplete(idx: number): boolean {
    const ts = this.targets.filter((t) => t.action.phrase === idx);
    return ts.length === 3 && ts.every((t) => t.grade === 'perfect' || t.grade === 'great' || t.grade === 'good');
  }

  /** target for an action at `beat` of verb (for scansion-mark highlights) */
  gradeAt(beat: number, verb: string): Grade | null {
    for (const t of this.targets) if (t.action.type === verb && Math.abs(t.action.beat - beat) < 1e-6) return t.grade;
    return null;
  }
}
