/**
 * Sampled one-shots from assets/audio/sfx (rendered by tools/music/sfx.py, served at `audio/sfx/`).
 * Loading is best-effort: a missing file is skipped (the caller falls back to a synth sound).
 * `onset` = the file's perceptual attack (manifest onsetSec): play(…, { align: true }) starts the file
 * that much early so the attack lands exactly at `when`.
 */
import { AUDIO_BASE } from './songs';

/** the one-shots the game uses, with their manifest onsets (s) */
export const SAMPLE_ONSETS = {
  chime_E5: 0.0007,
  chime_Fs5: 0.0004,
  chime_Gs5: 0.0004,
  chime_A5: 0.0002,
  chime_B5: 0.0002,
  chime_Cs6: 0.0002,
  chime_D6: 0.0002,
  chime_E6: 0.0002,
  bench_thunk: 0.0003,
  crowd_ooh: 0.1,
  crowd_cheer_swell: 0.194,
  crowd_swell_1: 0.1873,
  crowd_swell_2: 0.1321,
  crowd_swell_3: 0.1843,
  film_snap: 0,
  burn_flare: 0.0068,
  projector_loop: 0.0002,
} as const;

export type SampleId = keyof typeof SAMPLE_ONSETS;

/** chime samples by MIDI note (E5 = 76) */
export const CHIME_NOTES: [number, SampleId][] = [
  [76, 'chime_E5'],
  [78, 'chime_Fs5'],
  [80, 'chime_Gs5'],
  [81, 'chime_A5'],
  [83, 'chime_B5'],
  [85, 'chime_Cs6'],
  [86, 'chime_D6'],
  [88, 'chime_E6'],
];

export interface PlayOpts {
  /** linear gain */
  gain?: number;
  /** playback rate (pitch) */
  rate?: number;
  /** low-pass corner (Hz) */
  lp?: number;
  /** start the file `onset` early so its attack lands at `when` */
  align?: boolean;
  /** fade out over 60 ms starting this many seconds after the start */
  cut?: number;
}

export class SampleBank {
  readonly ctx: BaseAudioContext;
  private bufs = new Map<SampleId, AudioBuffer>();

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
  }

  has(id: SampleId): boolean {
    return this.bufs.has(id);
  }

  get(id: SampleId): AudioBuffer | undefined {
    return this.bufs.get(id);
  }

  /** Load every sample in SAMPLE_ONSETS (in parallel; failures are skipped). */
  async load(base = AUDIO_BASE + 'sfx/', fetchFn: typeof fetch = fetch): Promise<number> {
    const ids = Object.keys(SAMPLE_ONSETS) as SampleId[];
    await Promise.all(
      ids.map(async (id) => {
        try {
          const r = await fetchFn(`${base}${id}.ogg`);
          if (!r.ok) return;
          this.bufs.set(id, await this.ctx.decodeAudioData(await r.arrayBuffer()));
        } catch {
          /* optional: synth fallback */
        }
      }),
    );
    return this.bufs.size;
  }

  /** Play a one-shot at ctx time `when` into `dest`. Returns false if the sample isn't loaded. */
  play(id: SampleId, dest: AudioNode, when: number, o: PlayOpts = {}): boolean {
    const buf = this.bufs.get(id);
    if (!buf) return false;
    const ctx = this.ctx;
    const rate = o.rate ?? 1;
    const t = Math.max(when - (o.align ? SAMPLE_ONSETS[id] / rate : 0), ctx.currentTime);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = o.gain ?? 1;
    let tail: AudioNode = s;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      f.Q.value = -3.0103; // Butterworth (lowpass Q is in dB)
      tail = tail.connect(f);
    }
    tail.connect(g).connect(dest);
    s.start(t);
    if (o.cut !== undefined) {
      g.gain.setValueAtTime(o.gain ?? 1, t + o.cut);
      g.gain.linearRampToValueAtTime(0, t + o.cut + 0.06);
      s.stop(t + o.cut + 0.08);
    }
    s.onended = () => {
      s.disconnect();
      g.disconnect();
    };
    return true;
  }
}
