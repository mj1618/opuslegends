/**
 * Conductor — THE master clock for everything music-synced.
 *
 * Song position is derived from the AUDIO clock, never from accumulated frame deltas:
 *
 *   audibleCtxTime(perf) = perf/1000 + offsetEst            (offsetEst: filtered map from
 *                                                            AudioContext.getOutputTimestamp,
 *                                                            i.e. what is leaving the speakers)
 *   songTime(perf)       = (audibleCtxTime - startCtx) * rate + startSong - latency
 *
 * - `latency` is the user-adjustable offset (seconds; + = "I hear the audio later than the game
 *   thinks", which delays gameplay/visual time to match what the player hears).
 * - Supports a tempo map (TempoMap) for beat <-> time conversions.
 * - Beat / bar / cue callbacks fire during `update()` (once per render frame) — use them for
 *   presentation; gameplay should read the fixed-step sim time instead.
 * - `play(from)` (re)starts the song at any song time (negative = count-in before the audio),
 *   which is how checkpoints rewind the music in sync.
 */
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

  /** user latency offset, seconds */
  latency = 0;

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
    return this.audibleCtxTimeAt(perfMs) - this.startCtx + this.startSong - this.latency;
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
    return this.ctx.currentTime - this.startCtx + this.startSong - this.latency;
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
   * source start, so count-ins work. Returns the song time at this instant (from - lead).
   */
  play(from: number, lead = 0.06): void {
    this.stopSource(0.01);
    this.sampleClock(performance.now());
    const ctx = this.ctx;
    const nowAudible = this.audibleCtxTimeAt(performance.now());
    // Schedule relative to currentTime (the scheduling timeline); the audible mapping above
    // tells us when that is heard.
    const when = ctx.currentTime + lead;
    const bufOffset = from + this.song.audioOffset;
    const start = (buffer: AudioBuffer, dest: AudioNode) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = 1;
      src.connect(g).connect(dest);
      if (bufOffset >= 0) {
        if (bufOffset < buffer.duration) src.start(when, bufOffset);
      } else {
        src.start(when - bufOffset, 0);
      }
      this.sources.push({ src, gain: g });
    };
    if (this.buffer) start(this.buffer, this.out);
    for (const [name, buf] of Object.entries(this.stems)) start(buf, this.bus(name));
    // Song time `from` is at scheduled ctx time `when`; in the audible timeline that is the
    // same ctx time (getOutputTimestamp contextTime is on the same timeline).
    this.startCtx = when;
    this.startSong = from;
    this.playing = true;
    if (this.segments.length > 64) this.segments.shift();
    this.segments.push({ startCtx: when, startSong: from, stopCtx: Infinity });
    this.time = nowAudible - this.startCtx + this.startSong - this.latency;
    this.beat = this.tempo.timeToBeat(this.time);
    this.lastBeatFired = Math.floor(this.tempo.timeToBeat(from) - 1e-6);
    this.cueIndex = this.cues.findIndex((c) => c.beat >= this.tempo.timeToBeat(from) - 1e-6);
    if (this.cueIndex < 0) this.cueIndex = this.cues.length;
  }

  /** Stop the music. 'tape' = tape-stop effect (pitch dives), used on death. */
  stop(mode: 'cut' | 'tape' | 'fade' = 'cut'): void {
    if (!this.playing) return;
    this.playing = false;
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
      b = this.ctx.createGain();
      b.gain.value = this.song.stemGains?.[name] ?? 1;
      b.connect(this.out);
      this.stemBus[name] = b;
    }
    return b;
  }

  /** Set a stem's gain (linear), ramped over `rampSec` (the crowd drives 'shouts' / 'bonus'). */
  setStemGain(name: string, gain: number, rampSec = 0.25): void {
    const b = this.bus(name);
    const t = this.ctx.currentTime;
    b.gain.cancelScheduledValues(t);
    b.gain.setValueAtTime(b.gain.value, t);
    b.gain.linearRampToValueAtTime(gain, t + Math.max(0.005, rampSec));
  }

  /**
   * Reward overlays follow the crowd meter (audio/mix.ts OVERLAY_RULES): sets every overlay stem
   * this song has. `instant` = a short 50 ms ramp (spawns / rewinds), else each rule's musical ramp.
   */
  setCrowdLevel(crowd: number, instant = false): void {
    const spb = this.tempo.secondsPerBeatAt(this.beat);
    for (const name of Object.keys(this.song.stems ?? {})) {
      const g = overlayGain(name, crowd);
      if (g === undefined) continue;
      if (!instant && Math.abs(this.stemGain(name) - g) < 1e-3) continue;
      this.setStemGain(name, g, instant ? 0.05 : OVERLAY_RULES[name].rampBeats * spb);
    }
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
    return this.startCtx + (t - this.startSong);
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
