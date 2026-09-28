/**
 * Owns the AudioContext and the mixer:
 *
 *   music (record + overlay stems, MIX.music) ─┐
 *   sfx   (synth SFX, MIX.sfx)                 ─┴─> trim ─> LIMITER ─> master (mute) ─> destination
 *
 * The limiter is a DynamicsCompressorNode set up as a soft limiter (audio/mix.ts MIX.limiter): the
 * original record alone peaks above 0 dBFS, and record + overlays + SFX add up. Two properties of
 * the node are MEASURED at startup (calibrate(), an offline impulse), not assumed:
 *   - its look-ahead delay (~6 ms in Chromium/WebKit/Gecko): everything audible is that much later
 *     than the graph clock, so the Conductor subtracts it (conductor.outputDelay);
 *   - its automatic makeup gain: `trim` cancels it, so below the threshold the mix is at unity.
 * The context is created eagerly but can only start running after a user gesture
 * (the title screen's "press to start"), unless the browser's autoplay policy allows it
 * (headless playtests launch chromium with --autoplay-policy=no-user-gesture-required).
 */
import { MIX } from './mix';

export class AudioSystem {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly music: GainNode;
  readonly sfx: GainNode;
  /** pre-limiter trim (cancels the compressor's makeup gain) */
  readonly trim: GainNode;
  readonly limiter: DynamicsCompressorNode;
  /** safety soft clip after the limiter (linear below -1 dBFS): catches the compressor's residual overs */
  readonly clip: { input: AudioNode; output: AudioNode };
  /** measured look-ahead delay of the limiter (s) — see calibrate() */
  limiterDelay = 0.006;
  /** measured small-signal gain of the limiter (its makeup gain, linear) */
  limiterMakeup = 1;
  private muted: boolean;

  constructor(muted: boolean) {
    const AC: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.trim = this.ctx.createGain();
    this.limiter = AudioSystem.makeLimiter(this.ctx);
    this.music.gain.value = MIX.music;
    this.sfx.gain.value = MIX.sfx;
    this.music.connect(this.trim);
    this.sfx.connect(this.trim);
    this.clip = AudioSystem.makeSoftClip(this.ctx);
    this.trim.connect(this.limiter);
    this.limiter.connect(this.clip.input);
    this.clip.output.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.muted = muted;
    this.master.gain.value = muted ? 0 : 1;
  }

  static makeLimiter(ctx: BaseAudioContext): DynamicsCompressorNode {
    const L = MIX.limiter;
    const c = ctx.createDynamicsCompressor();
    c.threshold.value = L.threshold;
    c.knee.value = L.knee;
    c.ratio.value = L.ratio;
    c.attack.value = L.attack;
    c.release.value = L.release;
    return c;
  }

  /**
   * Zero-latency safety soft clip (WaveShaper, no oversampling): identity below -1 dBFS, tanh knee up
   * to a -0.2 dBFS ceiling, for inputs up to +6 dBFS (pre-scaled by 1/2 into the shaper's [-1, 1]).
   * After the limiter it only ever touches the rare few-sample overs a compressor lets through.
   */
  static makeSoftClip(ctx: BaseAudioContext): { input: AudioNode; output: AudioNode } {
    const pre = ctx.createGain();
    pre.gain.value = 0.5;
    const ws = ctx.createWaveShaper();
    const N = 4097;
    const curve = new Float32Array(N);
    const knee = Math.pow(10, -1 / 20);
    const ceil = Math.pow(10, -0.2 / 20);
    for (let i = 0; i < N; i++) {
      const x = ((i / (N - 1)) * 2 - 1) * 2; // shaper input u in [-1, 1] = signal in [-2, 2]
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
   * Measure the limiter's delay and makeup gain through an identical node (OfflineAudioContext,
   * 0.5 s of audio), then trim the makeup away. Delay: where a quiet click comes out. Makeup: the
   * settled gain on a quiet (-40 dBFS) tone — the node's gain isn't settled at t = 0, so an impulse
   * alone under-reads it. Call once at load.
   */
  async calibrate(): Promise<void> {
    try {
      const sr = this.ctx.sampleRate;
      const n = Math.round(sr * 0.5);
      const off = new OfflineAudioContext(2, n, sr);
      const amp = 0.01; // -40 dBFS: far below the threshold
      const at = 128;
      const sig = off.createBuffer(2, n, sr);
      sig.getChannelData(0)[at] = amp; // ch 0: click (delay)
      const tone = sig.getChannelData(1); // ch 1: 1 kHz tone (settled gain)
      for (let i = 0; i < n; i++) tone[i] = amp * Math.sin((2 * Math.PI * 1000 * i) / sr);
      const src = off.createBufferSource();
      src.buffer = sig;
      src.connect(AudioSystem.makeLimiter(off)).connect(off.destination);
      src.start(0);
      const out = await off.startRendering();
      const click = out.getChannelData(0);
      let idx = at;
      let peak = 0;
      for (let i = 0; i < sr * 0.05; i++) {
        if (Math.abs(click[i]) > peak) {
          peak = Math.abs(click[i]);
          idx = i;
        }
      }
      const settled = out.getChannelData(1);
      let tp = 0;
      for (let i = Math.round(n * 0.7); i < n; i++) tp = Math.max(tp, Math.abs(settled[i]));
      if (peak > 0) this.limiterDelay = Math.max(0, idx - at) / sr;
      if (tp > 0) {
        this.limiterMakeup = tp / amp;
        this.trim.gain.value = 1 / this.limiterMakeup;
      }
    } catch (e) {
      console.warn('limiter calibration failed; assuming 6 ms / no makeup', e);
    }
  }

  get running(): boolean {
    return this.ctx.state === 'running';
  }

  /** Call from inside a user-gesture handler. Safe to call repeatedly. */
  unlock(): Promise<void> {
    if (this.ctx.state === 'running') return Promise.resolve();
    return this.ctx.resume().catch(() => undefined);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.01);
  }

  get isMuted(): boolean {
    return this.muted;
  }
}
