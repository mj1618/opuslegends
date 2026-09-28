/**
 * Placeholder sound effects, synthesized live with Web Audio nodes (no assets).
 * All pitched SFX that should sound musical take a MIDI note chosen by the caller from the
 * song's key/harmony (see collectibleNote in song.ts).
 */
import { mtof } from './song';

export class Sfx {
  private ctx: AudioContext;
  private out: AudioNode;
  private noise: AudioBuffer;
  enabled = true;

  constructor(ctx: AudioContext, out: AudioNode) {
    this.ctx = ctx;
    this.out = out;
    const n = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = n;
  }

  private get t(): number {
    return this.ctx.currentTime;
  }

  /** a valid scheduling time: `when` if it's in the future, else now */
  private at(when?: number): number {
    return when !== undefined && Number.isFinite(when) && when > this.ctx.currentTime ? when : this.ctx.currentTime;
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, when = this.ctx.currentTime, attack = 0.004): void {
    if (!this.enabled) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, when);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), when + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(this.out);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  private burst(type: BiquadFilterType, f0: number, f1: number, dur: number, vol: number, q = 1, when = this.ctx.currentTime): void {
    if (!this.enabled) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, when);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, when + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f).connect(g).connect(this.out);
    s.start(when, Math.random() * 0.5);
    s.stop(when + dur + 0.02);
  }

  jump(): void {
    this.tone('square', 280, 620, 0.09, 0.07);
    this.burst('highpass', 3000, 6000, 0.05, 0.05);
  }

  private hopFlip = 0;
  /** Hop = woodblock "tok", low in the mix, alternating 2 pitches (DESIGN §2). `when` quantises early presses. */
  hop(when?: number, big = false): void {
    if (!this.enabled) return;
    const t = this.at(when);
    this.hopFlip ^= 1;
    const f = this.hopFlip ? 880 : 1175;
    this.tone('sine', f * 1.02, f, 0.07, big ? 0.16 : 0.12, t, 0.001);
    this.tone('triangle', f * 2.4, f * 2.3, 0.03, 0.04, t, 0.001);
    this.burst('bandpass', f * 1.5, f * 1.2, 0.02, 0.08, 6, t);
  }

  /** Cue Sweep = foley whoosh-thwack + Kid Cue's "HEY!" (formant blip); the audience doubles it when 4+ stand. */
  strike(when?: number, crowd = false, heave = false): void {
    if (!this.enabled) return;
    const t = this.at(when);
    this.burst('bandpass', 700, 2600, 0.09, 0.22, 1.2, t); // whoosh
    this.burst('highpass', 2500, 5000, 0.03, 0.25, 1, t + 0.02); // thwack
    this.hey(t, crowd ? 4 : 1, heave ? 1.6 : 1);
  }

  /** synthesized gang "HEY!" (formants of /e/) */
  hey(when?: number, voices = 1, vol = 1): void {
    if (!this.enabled) return;
    const t = this.at(when);
    const dur = 0.16 + 0.04 * Math.min(voices, 4);
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.18 * vol, t + 0.006);
    out.gain.setValueAtTime(0.18 * vol, t + dur * 0.6);
    out.gain.linearRampToValueAtTime(0, t + dur);
    out.connect(this.out);
    const src = this.ctx.createGain();
    [[530, 1], [1840, 0.55], [2480, 0.3]].forEach(([fq, k]) => {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = fq;
      bp.Q.value = 7;
      const g = this.ctx.createGain();
      g.gain.value = k;
      src.connect(bp).connect(g).connect(out);
    });
    const f0s = [262, 233, 294, 208, 311, 196].slice(0, Math.max(1, voices + 1));
    for (const f0 of f0s) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * 1.05, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.93, t + dur);
      o.detune.value = (Math.random() - 0.5) * 20;
      o.connect(src);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    this.burst('bandpass', 1600, 1600, 0.03, 0.12 * vol, 1, t);
  }

  /** pendulum targets chime, pitched to the chord */
  chime(midi: number, big = false): void {
    if (!this.enabled) return;
    const f = mtof(midi);
    const t = this.t;
    this.tone('sine', f, f, big ? 1.4 : 0.9, 0.14, t, 0.001);
    this.tone('sine', f * 2.76, f * 2.76, 0.5, 0.05, t, 0.001);
    this.tone('sine', f * 5.4, f * 5.4, 0.25, 0.025, t, 0.001);
    this.burst('highpass', 5000, 9000, 0.12, 0.08, 1, t);
  }

  /** wooden rim clack: slam platform telegraph, 1 beat before each slam */
  clack(when?: number): void {
    if (!this.enabled) return;
    const t = this.at(when);
    this.tone('sine', 1250, 900, 0.04, 0.05, t, 0.001);
    this.burst('bandpass', 1800, 1200, 0.03, 0.06, 4, t);
  }

  /** jabber wind-up squawk (rising), 1 beat before the jab */
  windup(when?: number): void {
    if (!this.enabled) return;
    const t = this.at(when);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(1500, t + 0.16);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 38;
    const lg = this.ctx.createGain();
    lg.gain.value = 120;
    lfo.connect(lg).connect(o.frequency);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(bp).connect(g).connect(this.out);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.22);
    lfo.stop(t + 0.22);
  }

  /** strike connects with a jabber */
  thwack(heave = false): void {
    this.tone('square', 240, 60, 0.14, 0.16);
    this.burst('bandpass', 2000, 600, 0.12, heave ? 0.45 : 0.3, 0.8);
    if (heave) this.tone('sawtooth', 110, 40, 0.4, 0.12);
  }

  /** stumble: bonk + lums spill */
  stumble(): void {
    this.tone('triangle', 330, 110, 0.18, 0.2);
    this.burst('lowpass', 1500, 300, 0.1, 0.2);
    for (let i = 0; i < 4; i++) this.tone('triangle', 1400 - i * 180, 1200 - i * 180, 0.06, 0.04, this.t + 0.05 + i * 0.04);
  }

  fall(): void {
    this.burst('lowpass', 2500, 300, 0.5, 0.4, 0.7);
    this.burst('bandpass', 900, 400, 0.3, 0.2, 1);
  }

  /** the crowd roars a completed Hup-Hup-HEY */
  roar(): void {
    if (!this.enabled) return;
    this.hey(this.t, 5, 1.8);
    this.burst('bandpass', 700, 1500, 0.6, 0.12, 0.6);
  }

  /** timing feedback: Perfect = pitched chime, Great = soft tick */
  perfect(midi: number): void {
    const f = mtof(midi);
    this.tone('sine', f, f, 0.25, 0.06, this.t, 0.001);
    this.tone('sine', f * 2, f * 2, 0.15, 0.03, this.t, 0.001);
  }

  great(): void {
    this.tone('sine', 2640, 2640, 0.05, 0.025, this.t, 0.001);
  }

  /** the crowd wakes up (cold open) */
  crowdWake(): void {
    [0, 4, 7].forEach((iv, i) => this.tone('triangle', mtof(76 + iv), mtof(76 + iv), 0.12, 0.05, this.t + i * 0.07));
  }

  private ambSrc: AudioBufferSourceNode | null = null;
  private ambGain: GainNode | null = null;
  /** cold-open ambience: wash (filtered noise with a slow swell) */
  ambience(on: boolean): void {
    const t = this.t;
    if (on && !this.ambSrc && this.enabled) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.18;
      const lg = this.ctx.createGain();
      lg.gain.value = 450;
      lfo.connect(lg).connect(f.frequency);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 1.2);
      s.connect(f).connect(g).connect(this.out);
      s.start(t);
      lfo.start(t);
      this.ambSrc = s;
      this.ambGain = g;
    } else if (!on && this.ambSrc && this.ambGain) {
      const s = this.ambSrc;
      this.ambGain.gain.cancelScheduledValues(t);
      this.ambGain.gain.setValueAtTime(this.ambGain.gain.value, t);
      this.ambGain.gain.linearRampToValueAtTime(0, t + 0.8);
      s.stop(t + 0.85);
      this.ambSrc = null;
      this.ambGain = null;
    }
  }
  land(strength = 1): void {
    this.tone('sine', 140, 55, 0.08, 0.25 * strength);
    this.burst('lowpass', 900, 200, 0.07, 0.12 * strength);
  }
  punch(): void {
    this.burst('bandpass', 700, 2500, 0.1, 0.25, 1.5);
  }
  hit(): void {
    this.tone('square', 220, 55, 0.14, 0.18);
    this.tone('sine', 900, 300, 0.05, 0.2);
    this.burst('bandpass', 1800, 600, 0.12, 0.35, 0.8);
  }
  stomp(): void {
    this.tone('triangle', 420, 90, 0.12, 0.25);
    this.burst('lowpass', 2000, 300, 0.08, 0.2);
  }
  slide(): void {
    this.burst('bandpass', 1200, 500, 0.25, 0.12, 2);
  }
  /** lums pickup: the next note of the honky-tonk piano ladder (two detuned strings) */
  lum(midi: number): void {
    if (!this.enabled) return;
    const f = mtof(midi);
    this.tone('triangle', f * 0.996, f * 0.996, 0.3, 0.1, this.t, 0.002);
    this.tone('triangle', f * 1.004, f * 1.004, 0.3, 0.1, this.t, 0.002);
    this.tone('sine', f * 2, f * 2, 0.18, 0.05, this.t, 0.002);
  }
  checkpoint(rootMidi: number): void {
    [0, 7, 12, 19].forEach((iv, i) => this.tone('triangle', mtof(rootMidi + iv), mtof(rootMidi + iv), 0.3, 0.12, this.t + i * 0.06));
  }
  death(): void {
    this.tone('sawtooth', 520, 70, 0.55, 0.14);
    this.burst('lowpass', 3000, 200, 0.4, 0.25);
  }
  finish(rootMidi: number): void {
    [0, 4, 7, 12, 16, 19, 24].forEach((iv, i) => this.tone('square', mtof(rootMidi + iv), mtof(rootMidi + iv), 0.4, 0.06, this.t + i * 0.05));
  }
  /**
   * Count-in: a drummer's stick click (two wooden sticks: resonant bands at ~2.3 and ~4.6 kHz + a
   * short woody body), scheduled on the recording's own beat grid. `accent` = the "one".
   */
  sticks(when?: number, accent = false): void {
    if (!this.enabled) return;
    const t = this.at(when);
    const v = accent ? 1 : 0.7;
    this.burst('bandpass', 2300, 2100, 0.035, 0.5 * v, 9, t);
    this.burst('bandpass', 4600, 4300, 0.025, 0.3 * v, 7, t);
    this.tone('sine', accent ? 1950 : 1700, accent ? 1850 : 1600, 0.03, 0.05 * v, t, 0.0008);
  }

  tick(high = false): void {
    this.tone('sine', high ? 1760 : 1320, high ? 1760 : 1320, 0.05, 0.12);
  }
  ui(): void {
    this.tone('triangle', 660, 990, 0.08, 0.1);
  }
}
