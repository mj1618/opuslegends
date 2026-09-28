/**
 * Live audio-sync probe (enabled with ?autoplay=1 or ?probe=1).
 *
 * An AudioWorklet listens to the MUSIC bus and timestamps transients with sample accuracy on
 * the AudioContext graph clock. Each onset is converted to song time using the Conductor's own
 * play-segment mapping and compared with the nearest (swung) eighth-note of the tempo map. This proves
 * that the music actually plays where the Conductor says it is (scheduling + offsets + tempo map).
 * (The remaining link — graph time -> speaker — is the device output latency, which only a
 * microphone could measure; that's what the user latency offset is for.)
 */
import type { Conductor } from './conductor';

const WORKLET = `
class OnsetProbe extends AudioWorkletProcessor {
  constructor() {
    super();
    this.prev = 0; this.fast = 0; this.slow = 1e-6; this.hold = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    const refractory = sampleRate * 0.09;
    for (let i = 0; i < ch.length; i++) {
      const d = ch[i] - this.prev; this.prev = ch[i];
      const e = d * d;
      // ~1 ms energy window: short enough for attacks, long enough to ignore the per-period
      // edges of low buzzy tones (fuzz saws), which re-triggered a sharper detector continuously
      this.fast += (e - this.fast) * 0.02;
      this.slow += (e - this.slow) * 0.0015;
      if (this.hold > 0) { this.hold--; continue; }
      if (this.fast > this.slow * 6 && this.fast > 1e-6) {
        this.port.postMessage(currentFrame + i);
        this.hold = refractory;
      }
    }
    return true;
  }
}
registerProcessor('onset-probe', OnsetProbe);
`;

export class SyncProbe {
  /** song-time errors (ms) of detected onsets vs the nearest eighth note */
  errorsMs: number[] = [];
  /** beat of each accepted onset (parallel to errorsMs; for debugging which instrument is off) */
  beats: number[] = [];
  onsets = 0;

  static async create(ctx: AudioContext, source: AudioNode, conductor: Conductor): Promise<SyncProbe | null> {
    if (!ctx.audioWorklet) return null;
    try {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(url);
      const node = new AudioWorkletNode(ctx, 'onset-probe', { numberOfInputs: 1, numberOfOutputs: 1 });
      const sink = ctx.createGain();
      sink.gain.value = 0;
      source.connect(node).connect(sink).connect(ctx.destination);
      const probe = new SyncProbe();
      node.port.onmessage = (ev: MessageEvent<number>) => probe.onOnset(ev.data / ctx.sampleRate, conductor);
      return probe;
    } catch (e) {
      console.warn('sync probe unavailable', e);
      return null;
    }
  }

  private onOnset(ctxTime: number, c: Conductor): void {
    const song = c.songTimeAtGraphTime(ctxTime);
    if (song === null) return;
    const beat = c.tempo.timeToBeat(song);
    // nearest point of the (swung) eighth grid: k, k + swing, k + 1
    const k = Math.floor(beat);
    const cands = [k, k + c.song.swing, k + 1];
    let grid = k;
    for (const g of cands) if (Math.abs(g - beat) < Math.abs(grid - beat)) grid = g;
    const err = (song - c.tempo.beatToTime(grid)) * 1000;
    this.onsets++;
    // ignore onsets far off the eighth grid (reverb tails, tape-stop) — they aren't beat events
    if (Math.abs(err) < 40) {
      this.errorsMs.push(err);
      this.beats.push(Math.round(beat * 100) / 100);
    }
  }
}
