/**
 * THE CHORUS LIFT: during every chorus the music (record + overlays, after the booth) is LOUDER and BIGGER — a
 * gain lift, a touch of air + low end (shelves), a little wider — and it sits a hair UNDER the old level between
 * choruses, so the chorus has somewhere to go without the hot record (−10.5 LUFS, true peaks +0.75 dBFS, as
 * loud in its choruses as in its verses) riding the master limiter. A zero-latency soft clip on the lift's
 * output shaves the lifted choruses' drum peaks (the mastering "clip, then limit" trick) so the master limiter
 * doesn't pump on them.
 *
 *   music bus ─ booth ─ LIFT: gain ─ low shelf ─ high shelf ─ M/S width ─ soft clip ─> master trim ─ limiter
 *
 * Levels: audio/mix.ts CHORUS_LIFT. Spans: `chorusSpans(song)` = the song's `chorus*` sections (the gameplay's
 * chorus flag uses the same spans). The lift ramps in over the beat BEFORE the chorus downbeat (full ON it) and out
 * over the beat after the chorus's last beat; a chorus that starts on a hush's release (act 3's drop) steps in
 * ON the downbeat instead (the hush holds the record at rest). Scheduled on the AUDIO clock (StageAudio.armLift,
 * re-armed on every Conductor.play: checkpoint rewinds, count-ins, un-pause), never from frame time.
 * Every node is zero-latency: the music stays sample-aligned with the clock.
 */
import { makeSoftClip } from './booth';
import { CHORUS_LIFT, dbToGain } from './mix';
import type { SongDef } from './song';

export interface LiftSpan {
  /** first beat of the chorus (full lift ON it) */
  from: number;
  /** first beat after the chorus (the lift starts easing out here) */
  to: number;
  /** beats of ramp before `from` (0 = a step ON the downbeat) */
  rampIn: number;
  /** beats of ramp after `to` */
  rampOut: number;
  name?: string;
}

/** The song's chorus spans (sections named `chorus*`), sorted. */
export function chorusSpans(song: Pick<SongDef, 'map'>): LiftSpan[] {
  return (song.map?.sections ?? [])
    .filter((s) => CHORUS_LIFT.sections.test(s.name))
    .map((s) => ({ from: s.startBeat, to: s.endBeat, rampIn: CHORUS_LIFT.rampInBeats, rampOut: CHORUS_LIFT.rampOutBeats, name: s.name }))
    .sort((a, b) => a.from - b.from);
}

/** 0 (rest) .. 1 (full chorus lift) at `beat` for these spans (linear ramps in beats) */
export function liftAmount(spans: readonly LiftSpan[], beat: number): number {
  for (const s of spans) {
    if (beat < s.from - s.rampIn || beat >= s.to + s.rampOut) continue;
    if (beat < s.from) return s.rampIn > 0 ? (beat - (s.from - s.rampIn)) / s.rampIn : 0;
    if (beat < s.to) return 1;
    return s.rampOut > 0 ? 1 - (beat - s.to) / s.rampOut : 0;
  }
  return 0;
}

/** true while `beat` is inside a chorus span (no ramps) */
export function inChorus(spans: readonly LiftSpan[], beat: number): boolean {
  return spans.some((s) => beat >= s.from && beat < s.to);
}

export class ChorusLift {
  readonly ctx: BaseAudioContext;
  readonly input: GainNode;
  readonly output: AudioNode;
  private gain: GainNode;
  private low: BiquadFilterNode;
  private high: BiquadFilterNode;
  private width: { direct: GainNode[]; cross: GainNode[] };
  /** the amount (0..1) the lift is heading to / sits at, for tests (`__game.game.audio.lift.amountAt(t)`) */
  private plan: { t: number; a: number }[] = [];

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    const L = CHORUS_LIFT;
    this.input = ctx.createGain();
    this.input.channelCount = 2;
    this.input.channelCountMode = 'explicit';
    this.input.channelInterpretation = 'speakers';
    this.gain = ctx.createGain();
    this.gain.gain.value = dbToGain(L.restDb);
    this.low = ctx.createBiquadFilter();
    this.low.type = 'lowshelf';
    this.low.frequency.value = L.low.freq;
    this.low.gain.value = 0;
    this.high = ctx.createBiquadFilter();
    this.high.type = 'highshelf';
    this.high.frequency.value = L.high.freq;
    this.high.gain.value = 0;
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    const g = (v: number) => {
      const n = ctx.createGain();
      n.gain.value = v;
      return n;
    };
    // M/S width as a 2x2 matrix (as the booth): L' = a L + b R, R' = b L + a R, a = (1 + w) / 2, b = (1 - w) / 2
    this.width = { direct: [g(1), g(1)], cross: [g(0), g(0)] };
    split.connect(this.width.direct[0], 0).connect(merge, 0, 0);
    split.connect(this.width.cross[0], 0).connect(merge, 0, 1);
    split.connect(this.width.direct[1], 1).connect(merge, 0, 1);
    split.connect(this.width.cross[1], 1).connect(merge, 0, 0);
    this.input.connect(this.gain).connect(this.low).connect(this.high).connect(split);
    const clip = makeSoftClip(ctx, L.clipDb);
    merge.connect(clip.input);
    this.output = clip.output;
  }

  /** parameter values for a lift amount (0 rest .. 1 chorus); dB params interpolate in dB */
  private values(a: number): [AudioParam, number][] {
    const L = CHORUS_LIFT;
    const w = 1 + (L.width - 1) * a;
    return [
      [this.gain.gain, dbToGain(L.restDb + (L.chorusDb - L.restDb) * a)],
      [this.low.gain, L.low.db * a],
      [this.high.gain, L.high.db * a],
      ...this.width.direct.map((n) => [n.gain, (1 + w) / 2] as [AudioParam, number]),
      ...this.width.cross.map((n) => [n.gain, (1 - w) / 2] as [AudioParam, number]),
    ];
  }

  /** Set the lift amount now (no music / tests). */
  set(a: number, when = this.ctx.currentTime): void {
    for (const [p, v] of this.values(a)) {
      p.cancelScheduledValues(when);
      p.setValueAtTime(v, when);
    }
    this.plan = [{ t: when, a }];
  }

  /**
   * (Re)schedule the whole envelope: `at(beat)` = the ctx time the music plays `beat` (NaN = not playing), `fromBeat` =
   * the beat playing now. Cancels everything pending, holds the current amount from now, and puts every ramp still
   * ahead on the clock. Ramps are sampled in 8 linear pieces so the dB params and the gain both move evenly in dB.
   */
  schedule(spans: readonly LiftSpan[], fromBeat: number, at: (beat: number) => number): void {
    const now = this.ctx.currentTime;
    const a0 = liftAmount(spans, fromBeat);
    this.set(a0, now);
    // each ramp: its first point is a hold (setValueAtTime), the rest linear ramps (a ramp already under way when the
    // music (re)starts continues from the amount set now)
    const pts: { beat: number; a: number; hold: boolean }[] = [];
    const seg = (b0: number, b1: number, x0: number, x1: number) => {
      if (b1 - b0 < 0.02) {
        // a step (the drop): a ~10 ms ramp centred on the downbeat (the hush release's crossfade)
        pts.push({ beat: b1 - 0.014, a: x0, hold: true }, { beat: b1 + 0.014, a: x1, hold: false });
        return;
      }
      for (let k = 0; k <= 8; k++) pts.push({ beat: b0 + ((b1 - b0) * k) / 8, a: x0 + ((x1 - x0) * k) / 8, hold: k === 0 });
    };
    for (const s of spans) {
      if (s.to + s.rampOut <= fromBeat) continue;
      seg(s.from - s.rampIn, s.from, 0, 1);
      seg(s.to, s.to + s.rampOut, 1, 0);
    }
    for (const p of pts) {
      if (p.beat <= fromBeat) continue;
      const t = at(p.beat);
      if (!Number.isFinite(t) || t <= now) continue;
      for (const [param, v] of this.values(p.a)) {
        if (p.hold) param.setValueAtTime(v, t);
        else param.linearRampToValueAtTime(v, t);
      }
      this.plan.push({ t, a: p.a });
    }
  }

  /** the scheduled amount at ctx time `t` (step-wise; diagnostics) */
  amountAt(t: number): number {
    let a = this.plan[0]?.a ?? 0;
    for (const p of this.plan) if (p.t <= t) a = p.a;
    return a;
  }
}
