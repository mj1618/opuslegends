/**
 * The projection booth: the music bus's "film sound" processor. The MUSIC is the crowd reward
 * (audio/mix.ts BOOTH): at a low crowd the record sounds like a worn 16 mm optical soundtrack heard
 * from the projection booth; as the crowd climbs it blooms to the record as mastered, and at FULL HOUSE
 * wider than it.
 *
 *   input ─ delay (wow/flutter/warble/snag slip) ─ HP x2 ─ honk ─ LP x2 ─ snag LP ─ M/S width ─ level ─┬─ output
 *   projector clatter + optical crackle bed ───────────────────────────────────────────────────────────┘
 *
 * Every node is zero-latency except the delay line, which rests at BOOTH.baseDelay (6 ms): the whole
 * music bus is that much late, and AudioSystem.outputDelay / Conductor.filmDelay account for it (the
 * clock, and SFX scheduled on the music grid). Modulating the delay time is a pitch wobble that always
 * returns to the resting delay, so warbles never drift the music off the clock.
 * Filters sweep via `detune` (cents), so a setTargetAtTime glide is even in pitch (musical), not in Hz.
 * All parameter moves are setTargetAtTime events: they stack without cancel, so beat-quantized moves
 * scheduled a beat ahead can never click or jump.
 */
import { BOOTH, type BoothState, type OverlayRule, dbToGain } from './mix';

/**
 * 4th-order Butterworth as two biquads (linear Q 0.5412 / 1.3066). NB: Web Audio's lowpass/highpass Q is
 * in dB (the resonance peak), not linear Q.
 */
const BUTTER4_Q_DB = [0.5412, 1.3066].map((q) => 20 * Math.log10(q));
/** Butterworth 2nd order (Q 0.7071) in dB */
const BUTTER2_Q_DB = -3.0103;
const cents = (ratio: number): number => 1200 * Math.log2(ratio);

export class Booth {
  readonly ctx: BaseAudioContext;
  readonly input: GainNode;
  readonly output: GainNode;
  private delay: DelayNode;
  private hp: BiquadFilterNode[];
  private lp: BiquadFilterNode[];
  private honk: BiquadFilterNode;
  private snagLp: BiquadFilterNode;
  private width: { direct: GainNode[]; cross: GainNode[] };
  private level: GainNode;
  private wowDepth: GainNode;
  private flutterDepth: GainNode;
  private warbleSrc: ConstantSourceNode;
  private slipSrc: ConstantSourceNode;
  private bed: GainNode;
  private bedClatter: GainNode;
  private warbleUntil = -Infinity;
  private lpOpen: number;
  /** the state the booth is heading to (last setState) */
  target: BoothState = { open: 1, house: 0 };

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    const t0 = ctx.currentTime;
    this.input = ctx.createGain();
    // up-mix anything mono to stereo before the channel splitter (discrete splitting would drop R)
    this.input.channelCount = 2;
    this.input.channelCountMode = 'explicit';
    this.input.channelInterpretation = 'speakers';
    this.output = ctx.createGain();

    this.delay = ctx.createDelay(0.05);
    this.delay.delayTime.value = BOOTH.baseDelay;
    const osc = (hz: number, depth: GainNode) => {
      const o = ctx.createOscillator();
      o.frequency.value = hz;
      o.connect(depth).connect(this.delay.delayTime);
      o.start(t0);
    };
    this.wowDepth = ctx.createGain();
    this.wowDepth.gain.value = 0;
    this.flutterDepth = ctx.createGain();
    this.flutterDepth.gain.value = 0;
    osc(0.9, this.wowDepth);
    osc(5.7, this.flutterDepth);
    const cs = () => {
      const c = ctx.createConstantSource();
      c.offset.value = 0;
      c.connect(this.delay.delayTime);
      c.start(t0);
      return c;
    };
    this.warbleSrc = cs();
    this.slipSrc = cs();

    const nyq = ctx.sampleRate / 2;
    this.lpOpen = Math.min(BOOTH.lp.open, nyq * 0.9);
    this.hp = BUTTER4_Q_DB.map((q) => {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = BOOTH.hp.open;
      f.Q.value = q;
      return f;
    });
    this.lp = BUTTER4_Q_DB.map((q) => {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = this.lpOpen;
      f.Q.value = q;
      return f;
    });
    this.honk = ctx.createBiquadFilter();
    this.honk.type = 'peaking';
    this.honk.frequency.value = BOOTH.honk.freq;
    this.honk.Q.value = BOOTH.honk.q;
    this.honk.gain.value = 0;
    this.snagLp = ctx.createBiquadFilter();
    this.snagLp.type = 'lowpass';
    this.snagLp.frequency.value = this.lpOpen;
    this.snagLp.Q.value = BUTTER2_Q_DB;

    // M/S width as a 2x2 matrix: L' = a L + b R, R' = b L + a R, a = (1 + w) / 2, b = (1 - w) / 2
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    const g = (v: number) => {
      const n = ctx.createGain();
      n.gain.value = v;
      return n;
    };
    this.width = { direct: [g(1), g(1)], cross: [g(0), g(0)] };
    split.connect(this.width.direct[0], 0).connect(merge, 0, 0);
    split.connect(this.width.cross[0], 0).connect(merge, 0, 1);
    split.connect(this.width.direct[1], 1).connect(merge, 0, 1);
    split.connect(this.width.cross[1], 1).connect(merge, 0, 0);
    this.level = ctx.createGain();

    let tail: AudioNode = this.input.connect(this.delay);
    for (const f of [...this.hp, this.honk, ...this.lp, this.snagLp]) tail = tail.connect(f);
    tail.connect(split);
    merge.connect(this.level).connect(this.output);

    // the booth bed: optical-soundtrack crackle (synthesized) + projector clatter (setClatter)
    this.bed = ctx.createGain();
    this.bed.gain.value = 0;
    this.bed.connect(this.output);
    this.bedClatter = ctx.createGain();
    this.bedClatter.gain.value = 0.55;
    this.bedClatter.connect(this.bed);
    const crackle = ctx.createBufferSource();
    crackle.buffer = Booth.crackleBuffer(ctx);
    crackle.loop = true;
    const hpC = ctx.createBiquadFilter();
    hpC.type = 'highpass';
    hpC.frequency.value = 900;
    crackle.connect(hpC).connect(this.bed);
    crackle.start(t0);
    this.setState({ open: 1, house: 0 }, t0, 0.001);
  }

  /** 16 mm projector clatter loop (assets/audio/sfx/projector_loop.ogg), band-passed under the bed */
  setClatter(buf: AudioBuffer): void {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.5;
    s.connect(bp).connect(this.bedClatter);
    s.start(this.ctx.currentTime);
  }

  /** 4 s of sparse optical-track crackle: ~7 pops/s, 0.3-2 ms decaying noise, random level */
  private static crackleBuffer(ctx: BaseAudioContext): AudioBuffer {
    const sr = ctx.sampleRate;
    const n = sr * 4;
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    let seed = 0x2f6e2b1;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let k = 0; k < 28; k++) {
      const at = Math.floor(rnd() * (n - sr * 0.01));
      const len = Math.floor(sr * (0.0003 + rnd() * 0.0017));
      const amp = 0.04 + 0.25 * rnd() * rnd();
      for (let i = 0; i < len; i++) d[at + i] += amp * (rnd() * 2 - 1) * Math.exp((-5 * i) / len);
    }
    return buf;
  }

  /**
   * Glide to a state: every parameter starts moving at `when` (ctx time) with time constant `tau`
   * (≈ 98 % there after 4 tau).
   */
  setState(s: BoothState, when: number, tau: number): void {
    this.target = { ...s };
    const c = 1 - s.open;
    const set = (p: AudioParam, v: number) => p.setTargetAtTime(v, when, tau);
    for (const f of this.hp) set(f.detune, c * cents(BOOTH.hp.closed / BOOTH.hp.open));
    for (const f of this.lp) set(f.detune, c * cents(BOOTH.lp.closed / this.lpOpen));
    set(this.honk.gain, c * BOOTH.honk.db);
    const w = BOOTH.width.closed + (BOOTH.width.open - BOOTH.width.closed) * s.open + (BOOTH.width.house - BOOTH.width.open) * s.house;
    for (const n of this.width.direct) set(n.gain, (1 + w) / 2);
    for (const n of this.width.cross) set(n.gain, (1 - w) / 2);
    set(this.level.gain, dbToGain(c * BOOTH.levelDb));
    set(this.wowDepth.gain, c * c * BOOTH.wow);
    set(this.flutterDepth.gain, c * c * BOOTH.flutter);
    const bed = Math.max(0, 1 - s.open / BOOTH.bedGoneAt);
    set(this.bed.gain, bed * bed * dbToGain(BOOTH.bedDb));
  }

  /**
   * Miss: the film snags in the gate — the music ducks behind a low-pass (down to ~1.6 kHz in 25 ms)
   * and slips a hair flat (+1.2 ms delay = a 3 % pitch sag), then recovers over ~half a beat.
   */
  snag(when: number, spb: number): void {
    const dip = cents(1600 / this.lpOpen);
    this.snagLp.detune.setTargetAtTime(dip, when, 0.008);
    this.snagLp.detune.setTargetAtTime(0, when + 0.07, spb * 0.14);
    this.slipSrc.offset.setTargetAtTime(0.0012, when, 0.012);
    this.slipSrc.offset.setTargetAtTime(0, when + 0.05, spb * 0.12);
  }

  /**
   * Stumble: record-scratch warble — a decaying 6 Hz wobble of the delay line (±3 ms: a ~2-semitone
   * drag-then-rush that dies in half a second). The delay returns to rest, so the music stays on the clock.
   */
  warble(when: number): void {
    if (when < this.warbleUntil) return;
    const dur = 0.6;
    const n = 96;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * dur;
      curve[i] = 0.003 * Math.sin(2 * Math.PI * 6 * t) * Math.exp(-t / 0.17);
    }
    curve[n - 1] = 0;
    try {
      this.warbleSrc.offset.setValueCurveAtTime(curve, when, dur);
      this.warbleUntil = when + dur + 0.01;
    } catch {
      /* overlapping curve (shouldn't happen): skip this warble */
    }
  }

  /** Silence the clatter/crackle bed for good (the mix lab's click test). */
  muteBed(): void {
    this.bed.disconnect();
  }

  /** Drop every pending move and hold the current values (rewinds / respawns). */
  cancel(when: number): void {
    const params = [
      ...this.hp.map((f) => f.detune),
      ...this.lp.map((f) => f.detune),
      this.honk.gain,
      ...this.width.direct.map((n) => n.gain),
      ...this.width.cross.map((n) => n.gain),
      this.level.gain,
      this.wowDepth.gain,
      this.flutterDepth.gain,
      this.bed.gain,
    ];
    for (const p of params) p.cancelScheduledValues(when);
  }
}

/**
 * THE HUSH (act 3's break shot): a "booth squeeze" on the RECORD (and the stems routed through it), independent of
 * the crowd booth. Two parallel paths, both always running, crossfaded with sample-accurate gain ramps:
 *
 *   input ─┬─ dry (1) ──────────────────────────────────────────────────────┬─ output
 *          └─ mono ─ HP x2 (320 Hz) ─ horn honk (1.7 kHz) ─ LP x2 (3.4 kHz) ─ wet (0) ─┘
 *
 * The filters never move (no zipper, no filter-sweep thump on the release); only the two gains ramp. The squeeze
 * goes in over `BOOTH.hush.inSec` from `from`, and the release is a `BOOTH.hush.outSec` crossfade CENTRED on `to`,
 * so the drop's downbeat transient is already at full range. Zero latency (biquads + gains): the stems stay
 * sample-aligned with the record.
 */
export class Squeeze {
  readonly ctx: BaseAudioContext;
  readonly input: GainNode;
  readonly output: GainNode;
  private dry: GainNode;
  private wet: GainNode;
  /** ctx time the last scheduled squeeze releases (for cancel) */
  private until = -Infinity;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.wet.gain.value = 0;
    const mono = ctx.createGain();
    mono.channelCount = 1;
    mono.channelCountMode = 'explicit';
    mono.channelInterpretation = 'speakers';
    const H = BOOTH.hush;
    let tail: AudioNode = this.input.connect(mono);
    for (const [type, f, q] of [
      ...BUTTER4_Q_DB.map((q) => ['highpass', H.hp, q] as const),
      ['peaking', BOOTH.honk.freq, BOOTH.honk.q] as const,
      ...BUTTER4_Q_DB.map((q) => ['lowpass', H.lp, q] as const),
    ]) {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      if (type === 'peaking') b.gain.value = BOOTH.honk.db;
      tail = tail.connect(b);
    }
    tail.connect(this.wet).connect(this.output);
    this.input.connect(this.dry).connect(this.output);
  }

  /** Squeeze the record into the horn from ctx time `from`, slam back to full range centred on `to`. */
  schedule(from: number, to: number, db: number = BOOTH.hush.db): void {
    const H = BOOTH.hush;
    const now = this.ctx.currentTime;
    if (!(to > from) || to - H.outSec / 2 <= now) return;
    const a = Math.max(from, now);
    const r0 = Math.max(a + H.inSec, to - H.outSec / 2);
    const g = dbToGain(db);
    for (const [p, v] of [[this.dry.gain, 0], [this.wet.gain, g]] as const) {
      p.setValueAtTime(p === this.dry.gain ? 1 : 0, a);
      p.linearRampToValueAtTime(v, a + H.inSec);
      p.setValueAtTime(v, r0);
      p.linearRampToValueAtTime(p === this.dry.gain ? 1 : 0, r0 + H.outSec);
    }
    this.until = Math.max(this.until, r0 + H.outSec);
  }

  /** Drop every pending squeeze; if one is sounding, release it over 20 ms (deaths, rewinds). */
  cancel(): void {
    const now = this.ctx.currentTime;
    if (this.until < now) return;
    for (const [p, v] of [[this.dry.gain, 1], [this.wet.gain, 0]] as const) {
      if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(now);
      else {
        const cur = p.value;
        p.cancelScheduledValues(now);
        p.setValueAtTime(cur, now);
      }
      p.linearRampToValueAtTime(v, now + 0.02);
    }
    this.until = -Infinity;
  }
}

/**
 * Zero-latency soft clip (WaveShaper, no oversampling) with a peak `ceilingDb` (dBFS): identity up to 3 dB
 * under the ceiling, then a tanh knee. Accepts inputs up to +12 dBFS (pre-scaled by 1/4 into [-1, 1]).
 */
export function makeSoftClip(ctx: BaseAudioContext, ceilingDb: number): { input: AudioNode; output: AudioNode } {
  const pre = ctx.createGain();
  pre.gain.value = 0.25;
  const ws = ctx.createWaveShaper();
  const N = 8193;
  const curve = new Float32Array(N);
  const ceil = dbToGain(ceilingDb);
  const knee = dbToGain(ceilingDb - 3);
  for (let i = 0; i < N; i++) {
    const x = ((i / (N - 1)) * 2 - 1) * 4;
    const a = Math.abs(x);
    const y = a <= knee ? a : knee + (ceil - knee) * Math.tanh((a - knee) / (ceil - knee));
    curve[i] = Math.sign(x) * y;
  }
  ws.curve = curve;
  ws.oversample = 'none';
  pre.connect(ws);
  return { input: pre, output: ws };
}

/**
 * An overlay stem's bus: the crowd-driven gain, then the rule's EQ and soft clip (all zero-latency, so
 * the stem stays sample-aligned with the record). Returns the gain node (its input) — the chain's tail is
 * connected to `dest`.
 */
export function makeOverlayBus(ctx: BaseAudioContext, rule: OverlayRule | undefined, dest: AudioNode, initialGain: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = initialGain;
  let tail: AudioNode = g;
  for (const e of rule?.eq ?? []) {
    const f = ctx.createBiquadFilter();
    f.type = e.type;
    f.frequency.value = e.freq;
    if (e.gainDb !== undefined) f.gain.value = e.gainDb;
    if (e.q !== undefined) f.Q.value = e.q;
    tail = tail.connect(f);
  }
  if (rule?.clip !== undefined) {
    const c = makeSoftClip(ctx, rule.clip);
    tail.connect(c.input);
    tail = c.output;
  }
  tail.connect(dest);
  return g;
}
