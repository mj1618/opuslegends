/**
 * LATENCY CALIBRATION (iteration 4, review iter3 fix 3): "sync the projector".
 *
 * Before the film rolls the projectionist threads the reel: the projector CLICKS `Tun.calib.clicks` times at the
 * song's opening tempo and the player taps STRIKE on each click. Every tap is measured against the moment its
 * click left the speakers (the Conductor's audible-clock mapping; SFX are late by the limiter look-ahead only),
 * so the result is everything the game can't see — Bluetooth / TV / OS output delay the device doesn't report,
 * plus the player's own habit of hitting early or late. The offset = the MEDIAN error of the last `use` taps; it
 * becomes `conductor.latency` (the same offset `[` / `]` nudge), stored in localStorage by the Game.
 *
 * Runs on wall-clock / AudioContext time, independent of the sim — so it works in the cold open (no music yet)
 * and from the pause screen (music stopped). The Game feeds it raw input edges (perf ms) while it is active.
 *
 *   start(now)     schedule the clicks (returns false if the audio isn't running)
 *   tap(perfMs)    a STRIKE press (the Game maps it with the conductor clock)
 *   update()       call every frame; returns 'done' once the last click has had its window
 *   result         the offset in ms (null: too few taps — keep the old offset)
 */
import type { Conductor } from '../audio/conductor';
import type { Sfx } from '../audio/sfx';
import { Tun } from './tunables';

export type CalibOrigin = 'coldOpen' | 'pause';

export class Calibrator {
  active = false;
  origin: CalibOrigin = 'coldOpen';
  /** audible ctx time of each click (s) */
  clicks: number[] = [];
  /** tap error per click (ms; NaN = no tap) */
  errs: number[] = [];
  /** seconds between clicks */
  interval = 0.37;
  /** offset result (ms) or null (not enough taps) */
  result: number | null = null;
  /** the offset before this test (ms) — restored on skip */
  before = 0;
  /** audible ctx time now (updated every frame, for the presentation) */
  now = 0;
  private readonly conductor: Conductor;
  private readonly sfx: Sfx;
  /** SFX bus delay to the speakers' input (the limiter look-ahead): conductor.outputDelay - filmDelay */
  private sfxDelay = 0;

  constructor(conductor: Conductor, sfx: Sfx) {
    this.conductor = conductor;
    this.sfx = sfx;
  }

  /** 0..1 progress through the clicks (presentation) */
  get progress(): number {
    if (!this.clicks.length) return 0;
    const first = this.clicks[0];
    const last = this.clicks[this.clicks.length - 1];
    return Math.max(0, Math.min(1, (this.now - first + this.interval) / (last - first + this.interval)));
  }

  /** index of the click currently sounding (-1 before the first) */
  get current(): number {
    let k = -1;
    for (let i = 0; i < this.clicks.length; i++) if (this.now >= this.clicks[i] - 0.03) k = i;
    return k;
  }

  start(origin: CalibOrigin, secondsPerBeat: number, beforeMs: number): boolean {
    const ctx = this.conductor.ctx;
    if (ctx.state !== 'running') return false;
    const C = Tun.calib;
    this.origin = origin;
    this.before = beforeMs;
    this.interval = secondsPerBeat;
    this.sfxDelay = Math.max(0, this.conductor.outputDelay - this.conductor.filmDelay);
    this.clicks = [];
    this.errs = [];
    this.result = null;
    // schedule on the graph clock: the audible timeline (getOutputTimestamp's contextTime) is the same ctx clock, so a
    // click scheduled at `when` leaves the speakers when audibleCtxTime reaches when + the limiter look-ahead
    const t0 = ctx.currentTime + C.leadSec;
    for (let i = 0; i < C.clicks; i++) {
      const when = t0 + i * secondsPerBeat;
      this.sfx.sticks(when, i === 0 || i === C.clicks - C.use);
      this.clicks.push(when + this.sfxDelay);
      this.errs.push(NaN);
    }
    this.active = true;
    this.now = this.audibleNow();
    return true;
  }

  private audibleNow(): number {
    return this.conductor.audibleCtxTimeAt(performance.now());
  }

  /** a tap at perf time `perfMs`: graded against the nearest click within half an interval (first tap wins) */
  tap(perfMs: number): void {
    if (!this.active) return;
    this.tapAudible(this.conductor.audibleCtxTimeAt(perfMs));
  }

  /** a tap at an audible ctx time (the bot taps this way) */
  tapAudible(t: number): void {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < this.clicks.length; i++) {
      const d = t - this.clicks[i];
      if (Math.abs(d) < Math.abs(bestD)) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0 || Math.abs(bestD) > this.interval * 0.5 || Number.isFinite(this.errs[best])) return;
    this.errs[best] = bestD * 1000;
  }

  /** every frame: returns true when the test just finished (result set) */
  update(): boolean {
    if (!this.active) return false;
    this.now = this.audibleNow();
    const last = this.clicks[this.clicks.length - 1];
    if (this.now < last + this.interval * 0.6) return false;
    this.active = false;
    const C = Tun.calib;
    const used = this.errs.slice(-C.use).filter((e) => Number.isFinite(e));
    this.result = used.length >= C.minTaps ? clampMs(median(used)) : null;
    return true;
  }

  cancel(): void {
    this.active = false;
    this.result = null;
  }
}

export function median(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function clampMs(ms: number): number {
  return Math.round(Math.max(Tun.calib.minMs, Math.min(Tun.calib.maxMs, ms)));
}
