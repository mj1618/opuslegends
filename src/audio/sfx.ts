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

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, when = this.t, attack = 0.004): void {
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

  private burst(type: BiquadFilterType, f0: number, f1: number, dur: number, vol: number, q = 1, when = this.t): void {
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
  /** musical collectible "ding" */
  lum(midi: number): void {
    if (!this.enabled) return;
    const f = mtof(midi);
    this.tone('triangle', f, f, 0.35, 0.16, this.t, 0.002);
    this.tone('sine', f * 2, f * 2, 0.22, 0.07, this.t, 0.002);
    this.tone('sine', f * 3.01, f * 3.01, 0.12, 0.03, this.t, 0.002);
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
  tick(high = false): void {
    this.tone('sine', high ? 1760 : 1320, high ? 1760 : 1320, 0.05, 0.12);
  }
  ui(): void {
    this.tone('triangle', 660, 990, 0.08, 0.1);
  }
}
