/**
 * Conductor — THE master clock for everything music-synced.
 *
 * Song position is derived from the AUDIO clock, never from accumulated frame deltas:
 *
 *   audibleCtxTime(perf) = perf/1000 + offsetEst            (offsetEst: filtered map from
 *                                                            AudioContext.getOutputTimestamp,
 *                                                            i.e. what is leaving the speakers)
 *   songTime(perf)       = audibleCtxTime - outputDelay - startCtx + startSong - latency
 *                          (outputDelay: our master limiter's look-ahead)
 *
 * - `latency` is the user-adjustable offset (seconds; + = "I hear the audio later than the game
 *   thinks", which delays gameplay/visual time to match what the player hears).
 * - Supports a tempo map (TempoMap) for beat <-> time conversions.
 * - Beat / bar / cue callbacks fire during `update()` (once per render frame) — use them for
 *   presentation; gameplay should read the fixed-step sim time instead.
 * - `play(from)` (re)starts the song at any song time (negative = count-in before the audio),
 *   which is how checkpoints rewind the music in sync.
 */
import { makeOverlayBus } from './booth';
import { OVERLAY_RULES, overlayGain } from './mix';
import type { SongDef } from './song';
import type { TempoMap } from './tempoMap';

export type BeatListener = (beat: number) => void;

interface Cue {
  beat: number;
  fn: (beat: number) => void;
}

export class Conductor {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
  readonly song: SongDef;
  readonly tempo: TempoMap;
  buffer: AudioBuffer | null = null;
  /** extra stems, played sample-aligned with `buffer` through per-stem gain buses */
  stems: Record<string, AudioBuffer> = {};
  private stemBus: Record<string, GainNode> = {};
  /** per-stem FLARE path (iteration 6: a smashed goon's part flares): stem -> flare gain (0 at rest) -> the bus's EQ/clip */
  private stemFlare: Record<string, GainNode> = {};
  /** unity taps of individual stems BEFORE their (crowd-driven) bus gain — for the sync probe */
  private taps: Record<string, GainNode> = {};
  /**
   * Per-source destinations instead of `out` ('record' = the recording; a stem name = that stem's bus output), e.g.
   * the hush's Squeeze (StageAudio.forGame routes the record + the stomps stem through it). Set before the first play().
   */
  inserts: Record<string, AudioNode> = {};

  /** user latency offset, seconds */
  latency = 0;
  /**
   * Extra delay between this conductor's sources and the speakers inside our own graph (the master
   * limiter's look-ahead, measured by AudioSystem.calibrate). getOutputTimestamp covers the device.
   */
  outputDelay = 0;
  /**
   * Delay of the music bus alone (the booth's film delay line, BOOTH.baseDelay) that the SFX bus doesn't
   * have: SFX scheduled on the music grid (ctxTimeAtSongTime) are shifted by it so they land ON the music.
   */
  filmDelay = 0;

  playing = false;
  /** song time (s) for the current frame, latency-compensated */
  time = 0;
  /** beat (float) for the current frame */
  beat = 0;

  private sources: { src: AudioBufferSourceNode; gain: GainNode }[] = [];
  private startCtx = 0;
  private startSong = 0;
  private offsetEst = NaN;
  private lastBeatFired = -Infinity;
  private beatListeners: BeatListener[] = [];
  private barListeners: BeatListener[] = [];
  private cues: Cue[] = [];
  private cueIndex = 0;
  /** history of playback segments on the graph clock (for the sync probe) */
  private segments: { startCtx: number; startSong: number; stopCtx: number }[] = [];
  /** diagnostics */
  clockSource: 'outputTimestamp' | 'currentTime' = 'currentTime';
  clockJitterMs = 0;

  /** fade-in pre-roll when (re)starting mid-recording (s) — see play() */
  static readonly FADE_IN = 0.035;

  constructor(ctx: AudioContext, out: AudioNode, song: SongDef, tempo: TempoMap) {
    this.ctx = ctx;
    this.out = out;
    this.song = song;
    this.tempo = tempo;
  }

  // ---------------------------------------------------------------- clock

  /** Sample the audio clock and refresh the ctx<->performance mapping. */
  private sampleClock(perfMs: number): void {
    const ctx = this.ctx;
    let raw: number;
    const ts = typeof ctx.getOutputTimestamp === 'function' ? ctx.getOutputTimestamp() : null;
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.contextTime > 0 && ts.performanceTime > 0) {
      // contextTime = ctx time of the sample currently leaving the output device at performanceTime
      raw = ts.contextTime - ts.performanceTime / 1000;
      this.clockSource = 'outputTimestamp';
    } else {
      const lat = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
      raw = ctx.currentTime - lat - perfMs / 1000;
      this.clockSource = 'currentTime';
    }
    if (!Number.isFinite(this.offsetEst)) {
      this.offsetEst = raw;
      return;
    }
    const diff = raw - this.offsetEst;
    this.clockJitterMs = this.clockJitterMs * 0.95 + Math.abs(diff) * 1000 * 0.05;
    // Big jump (context suspended/resumed, device change): resync. Otherwise low-pass filter,
    // which removes currentTime quantization jitter while tracking slow clock drift.
    if (Math.abs(diff) > 0.03) this.offsetEst = raw;
    else this.offsetEst += diff * 0.05;
  }

  /** Audible AudioContext time at a performance.now() timestamp. */
  audibleCtxTimeAt(perfMs: number): number {
    return perfMs / 1000 + this.offsetEst;
  }

  /** Song time (s) at a performance.now() timestamp (e.g. an input event's timeStamp). */
  songTimeAtPerf(perfMs: number): number {
    if (!this.playing) return this.time;
    return this.audibleCtxTimeAt(perfMs) - this.outputDelay - this.startCtx + this.startSong - this.latency;
  }

  /**
   * Song time of a sample on the audio GRAPH clock (no output latency / user offset), using the
   * playback segment that was active then. null if no music was playing at that graph time.
   */
  songTimeAtGraphTime(ctxTime: number): number | null {
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const s = this.segments[i];
      if (ctxTime >= s.startCtx - 0.001) return ctxTime < s.stopCtx ? ctxTime - s.startCtx + s.startSong : null;
    }
    return null;
  }

  /** Raw (unfiltered) song time from ctx.currentTime, for diagnostics only. */
  rawSongTime(): number {
    return this.ctx.currentTime - this.outputDelay - this.startCtx + this.startSong - this.latency;
  }

  /** Call once per render frame, before anything reads `time`/`beat`. */
  update(perfNow: number): void {
    this.sampleClock(perfNow);
    if (!this.playing) return;
    const t = this.songTimeAtPerf(perfNow);
    // Keep the clock monotonic across small filter corrections.
    if (t >= this.time || this.time - t > 0.05) this.time = t;
    this.beat = this.tempo.timeToBeat(this.time);
    this.fireEvents();
  }

  // ---------------------------------------------------------------- transport

  /**
   * Start playback so that song time `from` is audible `lead` seconds from now.
   * Song times before the audio's beat 0 (negative buffer offset) are handled by delaying the
   * source start, so count-ins work.
   * Restarting mid-recording (checkpoint rewinds, un-pause) never cuts in on a waveform: the sources
   * start `fadeIn` s EARLY and fade in over that pre-roll, so the gain is exactly 1 at `from`
   * (the count-in bar's downbeat keeps its full attack) and there is no click.
   */
  play(from: number, lead = 0.06, fadeIn = Conductor.FADE_IN): void {
    this.stopSource(0.01);
    this.sampleClock(performance.now());
    const ctx = this.ctx;
    const nowAudible = this.audibleCtxTimeAt(performance.now());
    const bufOffset = from + this.song.audioOffset;
    const pre = bufOffset > 0 ? Math.min(fadeIn, bufOffset) : 0;
    // Schedule relative to currentTime (the scheduling timeline); the audible mapping above
    // tells us when that is heard. The pre-roll must be schedulable too.
    const when = ctx.currentTime + Math.max(lead, pre + 0.02);
    const start = (buffer: AudioBuffer, dest: AudioNode, tap?: AudioNode, also?: AudioNode) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = 1;
      src.connect(g).connect(dest);
      if (tap) g.connect(tap);
      if (also) g.connect(also);
      if (bufOffset >= 0) {
        if (bufOffset < buffer.duration) {
          if (pre > 0) {
            g.gain.setValueAtTime(0, when - pre);
            g.gain.linearRampToValueAtTime(1, when);
          }
          src.start(when - pre, bufOffset - pre);
        }
      } else {
        src.start(when - bufOffset, 0);
      }
      this.sources.push({ src, gain: g });
    };
    if (this.buffer) start(this.buffer, this.inserts.record ?? this.out);
    for (const [name, buf] of Object.entries(this.stems)) start(buf, this.bus(name), this.taps[name], this.stemFlare[name]);
    // Song time `from` is at scheduled ctx time `when`; in the audible timeline that is the
    // same ctx time (getOutputTimestamp contextTime is on the same timeline).
    this.startCtx = when;
    this.startSong = from;
    this.playing = true;
    if (this.segments.length > 64) this.segments.shift();
    this.segments.push({ startCtx: when, startSong: from, stopCtx: Infinity });
    this.time = nowAudible - this.outputDelay - this.startCtx + this.startSong - this.latency;
    this.beat = this.tempo.timeToBeat(this.time);
    this.lastBeatFired = Math.floor(this.tempo.timeToBeat(from) - 1e-6);
    this.cueIndex = this.cues.findIndex((c) => c.beat >= this.tempo.timeToBeat(from) - 1e-6);
    if (this.cueIndex < 0) this.cueIndex = this.cues.length;
    const fromBeat = this.tempo.timeToBeat(from);
    for (const fn of this.playListeners) fn(fromBeat);
  }

  private stopListeners: ((mode: 'cut' | 'tape' | 'fade') => void)[] = [];
  private playListeners: ((fromBeat: number) => void)[] = [];

  /** Called at the end of every play() (the music (re)starts at song beat `fromBeat`: rewinds, count-ins, un-pause). */
  onPlay(fn: (fromBeat: number) => void): void {
    this.playListeners.push(fn);
  }

  /** Called whenever the music stops (pause / quit = 'cut', death = 'tape', the end screen = 'fade'). */
  onStop(fn: (mode: 'cut' | 'tape' | 'fade') => void): void {
    this.stopListeners.push(fn);
  }

  /** Stop the music. 'tape' = tape-stop effect (pitch dives), used on death. */
  stop(mode: 'cut' | 'tape' | 'fade' = 'cut'): void {
    if (!this.playing) return;
    this.playing = false;
    for (const fn of this.stopListeners) fn(mode);
    const seg = this.segments[this.segments.length - 1];
    if (seg) seg.stopCtx = this.ctx.currentTime;
    const dur = mode === 'tape' ? 0.55 : mode === 'fade' ? 0.8 : 0.015;
    if (mode === 'tape') {
      const t = this.ctx.currentTime;
      for (const { src } of this.sources) {
        src.playbackRate.cancelScheduledValues(t);
        src.playbackRate.setValueAtTime(1, t);
        src.playbackRate.exponentialRampToValueAtTime(0.08, t + dur);
      }
    }
    this.stopSource(dur);
  }

  private stopSource(fade: number): void {
    const list = this.sources;
    this.sources = [];
    const t = this.ctx.currentTime;
    for (const { src, gain: g } of list) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + fade);
      try {
        src.stop(t + fade + 0.02);
      } catch {
        /* not started */
      }
      src.onended = () => {
        src.disconnect();
        g.disconnect();
      };
    }
  }

  private bus(name: string): GainNode {
    let b = this.stemBus[name];
    if (!b) {
      // the crowd-driven gain + the rule's zero-latency EQ / soft clip (audio/mix.ts OVERLAY_RULES)
      const bus = makeOverlayBus(this.ctx, OVERLAY_RULES[name], this.inserts[name] ?? this.out, this.song.stemGains?.[name] ?? 1);
      b = bus.gain;
      this.stemBus[name] = b;
      const flare = this.ctx.createGain();
      flare.gain.value = 0;
      flare.connect(bus.sum);
      this.stemFlare[name] = flare;
    }
    return b;
  }

  /**
   * A unity-gain node carrying stem `name` before its bus gain (connected on every play()). Not
   * routed to the output — for analysis (the sync probe listens to an overlay stem this way, so the
   * crowd-driven gain doesn't matter).
   */
  tap(name: string): AudioNode {
    return (this.taps[name] ??= this.ctx.createGain());
  }

  /** target gain per stem bus (the last value asked for; the bus may still be gliding there) */
  private stemTarget: Record<string, number> = {};

  /**
   * Set a stem's gain (linear): glides from ctx time `when` (default now) with time constant rampSec / 4
   * (setTargetAtTime: ~98 % there after rampSec). Events stack, so a move scheduled for the next beat
   * never cancels one in flight (no clicks). `instant`: drop pending moves first (rewinds / spawns).
   */
  setStemGain(name: string, gain: number, rampSec = 0.25, when?: number, instant = false): void {
    const b = this.bus(name);
    const now = this.ctx.currentTime;
    const t = when !== undefined && Number.isFinite(when) && when > now ? when : now;
    if (instant) b.gain.cancelScheduledValues(now);
    b.gain.setTargetAtTime(gain, t, Math.max(0.004, rampSec / 4));
    this.stemTarget[name] = gain;
  }

  /**
   * Reward overlays follow the crowd meter (audio/mix.ts OVERLAY_RULES): sets every overlay stem
   * this song has, gliding from ctx time `when` (StageAudio passes the next beat) over each rule's
   * musical ramp. `instant` = a short 50 ms glide from now (spawns / rewinds).
   */
  setCrowdLevel(crowd: number, instant = false, when?: number): void {
    const spb = this.tempo.secondsPerBeatAt(this.beat);
    for (const name of Object.keys(this.song.stems ?? {})) {
      const g = overlayGain(name, crowd);
      if (g === undefined) continue;
      if (!instant && Math.abs((this.stemTarget[name] ?? -1) - g) < 1e-4) continue;
      this.setStemGain(name, g, instant ? 0.05 : OVERLAY_RULES[name].rampBeats * spb, instant ? undefined : when, instant);
    }
  }

  /**
   * FLARE a stem (a smashed goon's part: its overlay jumps out of the mix): from ctx time `when` the stem plays at
   * `db` over its crowd level (at least `floorDb` absolute, so it is heard even where the crowd has it silent), holds
   * `holdSec`, then glides back over `releaseSec`. A parallel path: the crowd glides are untouched.
   */
  flareStem(name: string, when: number, db = 6, holdSec = 0.37, releaseSec = 0.37, floorDb = -10): boolean {
    if (!(name in this.stems)) return false;
    this.bus(name);
    const f = this.stemFlare[name];
    const now = this.ctx.currentTime;
    const t = Number.isFinite(when) && when > now ? when : now;
    const c = this.stemTarget[name] ?? this.stemBus[name].gain.value;
    const total = Math.max(c * Math.pow(10, db / 20), Math.pow(10, floorDb / 20));
    const add = Math.max(0, total - c);
    f.gain.cancelScheduledValues(t);
    f.gain.setTargetAtTime(add, t, 0.004);
    f.gain.setTargetAtTime(0, t + holdSec, Math.max(0.01, releaseSec / 4));
    return true;
  }

  stemGain(name: string): number {
    return this.stemBus[name]?.gain.value ?? 1;
  }

  /**
   * AudioContext (graph) time at which song time `t` is played by the current segment — schedule
   * SFX there to land exactly on the music (e.g. an early input's sound quantised to the beat).
   * NaN when not playing.
   */
  ctxTimeAtSongTime(t: number): number {
    if (!this.playing) return NaN;
    return this.startCtx + (t - this.startSong) + this.filmDelay;
  }

  /**
   * The beat the audio GRAPH is rendering right now (ctx.currentTime; ahead of the audible `beat` by the
   * output latency). Quantize scheduled sounds against this: the next grid point after it is still
   * schedulable. NaN when not playing.
   */
  graphBeat(): number {
    if (!this.playing) return NaN;
    return this.tempo.timeToBeat(this.ctx.currentTime - this.filmDelay - this.startCtx + this.startSong);
  }

  // ---------------------------------------------------------------- events

  onBeat(fn: BeatListener): () => void {
    this.beatListeners.push(fn);
    return () => (this.beatListeners = this.beatListeners.filter((f) => f !== fn));
  }

  onBar(fn: BeatListener): () => void {
    this.barListeners.push(fn);
    return () => (this.barListeners = this.barListeners.filter((f) => f !== fn));
  }

  /** One-shot cue at a specific beat (re-fires after a rewind past it). */
  at(beat: number, fn: (beat: number) => void): void {
    this.cues.push({ beat, fn });
    this.cues.sort((a, b) => a.beat - b.beat);
    this.cueIndex = 0;
    while (this.cueIndex < this.cues.length && this.cues[this.cueIndex].beat <= this.beat) this.cueIndex++;
  }

  clearCues(): void {
    this.cues = [];
    this.cueIndex = 0;
  }

  private fireEvents(): void {
    const cur = Math.floor(this.beat);
    if (cur > this.lastBeatFired) {
      // cap the burst if we jumped far (tab switch) — only fire the latest beat
      const first = cur - this.lastBeatFired > 8 ? cur : this.lastBeatFired + 1;
      for (let b = first; b <= cur; b++) {
        for (const fn of this.beatListeners) fn(b);
        if (b % this.tempo.beatsPerBar === 0) for (const fn of this.barListeners) fn(b);
      }
      this.lastBeatFired = cur;
    }
    while (this.cueIndex < this.cues.length && this.cues[this.cueIndex].beat <= this.beat) {
      const c = this.cues[this.cueIndex++];
      c.fn(c.beat);
    }
  }

  // ---------------------------------------------------------------- helpers

  beatToTime(beat: number): number {
    return this.tempo.beatToTime(beat);
  }

  timeToBeat(time: number): number {
    return this.tempo.timeToBeat(time);
  }

  get bpm(): number {
    return this.tempo.bpmAtTime(this.time);
  }
}
