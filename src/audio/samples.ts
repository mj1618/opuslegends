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
  // iteration 4 (tools/music/sfx.py --set=stage, instruments/fx_stage.py): act 3 + act 2's mechanics
  break_krak: 0.0041,
  rack_collapse: 0.0626,
  letter_creak_1: 0.0977,
  letter_slam_1: 0.002,
  letter_creak_2: 0.1294,
  letter_slam_2: 0.0016,
  letter_creak_3: 0.1022,
  letter_slam_3: 0.0005,
  letter_creak_4: 0.1416,
  letter_slam_4: 0.0009,
  letter_creak_5: 0.1423,
  letter_slam_5: 0.0027,
  letter_creak_6: 0.1291,
  letter_slam_6: 0.0018,
  bigjim_bluff: 0.1284,
  bigjim_fist_1: 0.0008,
  bigjim_fist_2: 0.0009,
  bigjim_fist_3: 0.0009,
  lens_crack_1: 0.0,
  lens_crack_2: 0.0,
  lens_crack_3: 0.0,
  lens_crack_4: 0.0,
  glass_skylight: 0.0001,
  glass_wall: 0.0001,
  iris_slam_big: 0.0702,
  film_runout: 0.0,
  crowd_mega_cheer: 0.1224,
  crowd_applause_long: 0.1339,
  marquee_clank: 0.0006,
  bottle_whistle: 0.023,
  firebomb_whoosh: 0.1191,
  firebomb_burst: 0.0306,
  bottle_smash: 0.0001,
  ball_rumble: 0.1901,
  ball_hit: 0.0006,
  pin_scatter: 0.0022,
  pin_scatter_big: 0.0016,
  window_crash: 0.0001,
  // iteration 6 (tools/music/sfx.py --set=feel, instruments/fx_feel.py): the token voice, the near-miss WHEW, the film
  // canister, the poster's rank stings, the goon stingers (+ the core set's cowbell tonks and jukebox boom)
  crowd_applause: 0.104,
  unison_clack: 0.0001,
  tonk_lo: 0.0038,
  tonk_hi: 0.0034,
  jukebox_boom: 0.0055,
  token_C5: 0.0135,
  token_Cs5: 0.0081,
  token_D5: 0.017,
  token_Ds5: 0.0083,
  token_E5: 0.0107,
  token_F5: 0.0103,
  token_Fs5: 0.0131,
  token_G5: 0.0108,
  token_Gs5: 0.0076,
  token_A5: 0.0083,
  token_As5: 0.0078,
  token_B5: 0.0096,
  token_C6: 0.0078,
  token_Cs6: 0.0076,
  token_D6: 0.0116,
  token_Ds6: 0.0115,
  token_E6: 0.0199,
  token_F6: 0.0084,
  token_Fs6: 0.0099,
  token_G6: 0.0111,
  token_Gs6: 0.0076,
  token_A6: 0.0072,
  whew_gasp: 0.0316,
  whew_relief: 0.0914,
  canister_E: 0.0004,
  canister_A: 0.0016,
  canister_B: 0.0006,
  theend_big: 0.0408,
  theend: 0.1539,
  theend_small: 0.0081,
  rank_flop: 0.0008,
  claps_sparse: 0.0005,
  piano_gliss: 0.1362,
  // iteration 7 (tools/music/sfx.py --set=polish, instruments/fx_polish.py): the poster's billing stamp + tier stabs, the
  // roof's neon letters (SLIM), the intro colour burst, the canister's tease glint
  rank_stamp: 0.0013,
  rank_S: 0.0025,
  rank_A: 0.0016,
  rank_B: 0.0015,
  rank_C: 0.0029,
  neon_on_A3: 0.0015,
  neon_on_Cs4: 0.0011,
  neon_on_E4: 0.0014,
  neon_on_G4: 0.001,
  color_whoosh: 0.1658,
  color_bloom: 0.0064,
  canister_glint: 0.0005,
  // iteration 9b (tools/music/sfx.py --set=hits, instruments/fx_hits.py): every shouted HEY is a HIT now — the hero's
  // strike (a pool-cue crack into a body-punch thump, round-robin), the heavy hits, the audience's stomp-clap hit
  hit_1: 0.0024,
  hit_2: 0.0021,
  hit_3: 0.002,
  hit_4: 0.0021,
  hit_big_1: 0.0022,
  hit_big_2: 0.0021,
  hit_crowd: 0.0051,
} as const;

/** the hero's strike hits (round-robin; Sfx.hit) */
export const HERO_HITS: SampleId[] = ['hit_1', 'hit_2', 'hit_3', 'hit_4'];
/** the heavy strike hits (a heave, a giant, the break shot, the final hit; round-robin) */
export const BIG_HITS: SampleId[] = ['hit_big_1', 'hit_big_2'];

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

/** the token voice by MIDI note (C5 = 72 .. A6 = 93, chromatic): audio/tokenMelody.ts */
export const TOKEN_NOTES: [number, SampleId][] = [
  [72, 'token_C5'],
  [73, 'token_Cs5'],
  [74, 'token_D5'],
  [75, 'token_Ds5'],
  [76, 'token_E5'],
  [77, 'token_F5'],
  [78, 'token_Fs5'],
  [79, 'token_G5'],
  [80, 'token_Gs5'],
  [81, 'token_A5'],
  [82, 'token_As5'],
  [83, 'token_B5'],
  [84, 'token_C6'],
  [85, 'token_Cs6'],
  [86, 'token_D6'],
  [87, 'token_Ds6'],
  [88, 'token_E6'],
  [89, 'token_F6'],
  [90, 'token_Fs6'],
  [91, 'token_G6'],
  [92, 'token_Gs6'],
  [93, 'token_A6'],
];

/** the roof sign's neon letters by MIDI note (iteration 7): the A7 chord, A3 C#4 E4 G4 */
export const NEON_NOTES: [number, SampleId][] = [
  [57, 'neon_on_A3'],
  [61, 'neon_on_Cs4'],
  [64, 'neon_on_E4'],
  [67, 'neon_on_G4'],
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
  /**
   * with `align`: when the aligned start is already past (a sound fired with no lead time), start INTO the file's
   * pre-roll so its attack lands as close to `when` as it can, keeping at least this many seconds before the attack
   * (a 3 ms fade-in): a shout's breathy /h/ is skipped instead of making the vowel late
   */
  catchUp?: number;
}

/** a playing (or scheduled) one-shot */
export interface SampleVoice {
  src: AudioBufferSourceNode;
  gain: GainNode;
  /** ctx times it starts / ends */
  start: number;
  end: number;
}

const BANKS = new WeakMap<BaseAudioContext, SampleBank>();

export class SampleBank {
  readonly ctx: BaseAudioContext;
  private bufs = new Map<SampleId, AudioBuffer>();

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    // the first bank on a context (StageAudio's) is the one the synth Sfx borrows for its sampled voices
    if (!BANKS.has(ctx)) BANKS.set(ctx, this);
  }

  /** the (first) sample bank created on `ctx`, if any (Sfx plays the hero's HEYs from it) */
  static forContext(ctx: BaseAudioContext): SampleBank | undefined {
    return BANKS.get(ctx);
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
    return this.playNode(id, dest, when, o) !== null;
  }

  /** play(), returning the voice (so a scheduled sound can be called off or faded), or null if not loaded */
  playNode(id: SampleId, dest: AudioNode, when: number, o: PlayOpts = {}): SampleVoice | null {
    const buf = this.bufs.get(id);
    if (!buf) return null;
    const ctx = this.ctx;
    const rate = o.rate ?? 1;
    const now = ctx.currentTime;
    const onset = o.align ? SAMPLE_ONSETS[id] / rate : 0;
    const t = Math.max(when - onset, now);
    // catch-up: skip into the pre-roll (in output seconds) when the aligned start is past
    const skip = o.align && o.catchUp !== undefined && when - onset < now ? Math.min(now - (when - onset), Math.max(0, onset - o.catchUp)) : 0;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = o.gain ?? 1;
    if (skip > 0) {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(o.gain ?? 1, t + 0.003);
    }
    let tail: AudioNode = s;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      f.Q.value = -3.0103; // Butterworth (lowpass Q is in dB)
      tail = tail.connect(f);
    }
    tail.connect(g).connect(dest);
    s.start(t, skip * rate);
    if (o.cut !== undefined) {
      g.gain.setValueAtTime(o.gain ?? 1, t + o.cut);
      g.gain.linearRampToValueAtTime(0, t + o.cut + 0.06);
      s.stop(t + o.cut + 0.08);
    }
    s.onended = () => {
      s.disconnect();
      g.disconnect();
    };
    return { src: s, gain: g, start: t, end: t + buf.duration / rate - skip };
  }
}
