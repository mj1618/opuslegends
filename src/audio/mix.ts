/**
 * Music mix levels: how the music itself follows the crowd (streak) meter. The MUSIC is the reward:
 *
 *   crowd low   "projection booth": the record plays like a worn 16 mm optical soundtrack heard from the
 *               booth: band-limited (HP 320 Hz / LP 3.4 kHz, 24 dB/oct), a horn-speaker honk at 1.7 kHz,
 *               nearly mono, -3 dB, a touch of wow + flutter, projector clatter + crackle under it
 *   crowd up    the booth opens (beat-quantized, ~1-beat glides): full range, full width, unity
 *   FULL HOUSE  (>= 20) wider than the record (x1.15), the overlays come UP to sit in the record: the
 *               cowbell / claps / shouts within ~4-6 dB of the record in their own bands, stomps at it,
 *               and the audience cheers into the vocal gaps
 *
 * The record plays at unity (0 dB) on the music bus. Each overlay stem's gain is a piecewise-linear curve in
 * dB over the crowd count (0..24; the cold open wakes 3, FULL HOUSE at 20). Every overlay bus can carry an EQ
 * and a zero-latency soft clip (`clip`: its peak ceiling in dBFS before the master trim) so it can come up
 * in LOUDNESS without its transients hitting the master limiter (the cowbell's stick click is ~20 dB over
 * its body; the clip shaves ~8 dB of that, which the ear reads as a driven, "mixed" cowbell).
 *
 *   shouts   the HIT accents in the vocal gaps (iteration 9b: were gang HEY!/HUP!s; the stem keeps its name): -9 dB
 *            at 3 -> -3 dB at 12 -> 0 dB at FULL HOUSE
 *   stomps   stomps + hand claps join once the crowd is on its feet: silent <= 5, -14 dB at 6 -> 0 dB at 20
 *   cowbell  the hot streak: silent < 12, -12 dB at 12 -> +5 dB at FULL HOUSE (with presence EQ + clip)
 *   bonus    placeholder song only: organ + harmony lead at FULL HOUSE
 *
 * Measured (offline render of the real graph, `node src/audio/lab/mixlab.mjs`, see CLAUDE.md): numbers in
 * the comments on OVERLAY_RULES / BOOTH / GRADE_SFX.
 * Stems not in the table stay at their SongDef.stemGains value.
 */
import type { SampleId } from './samples';

/** [crowd count, gain dB] points; -Infinity = silent. Below the first / above the last point: clamped. */
type Curve = [number, number][];

export interface OverlayRule {
  curve: Curve;
  /** gain ramp time in beats (slow for layers that should swell in) */
  rampBeats: number;
  /** static EQ on the stem's bus (BiquadFilter types; zero latency) */
  eq?: { type: BiquadFilterType; freq: number; gainDb?: number; q?: number }[];
  /** zero-latency soft clip on the stem's bus: peak ceiling (dBFS, pre master trim) */
  clip?: number;
}

/** the crowd count at which the house is full (Tun.crowd.bigCatchAt; the HUD's "FULL HOUSE!") */
export const FULL_HOUSE = 20;

export const OVERLAY_RULES: Record<string, OverlayRule> = {
  shouts: { curve: [[3, -9], [12, -3], [FULL_HOUSE, 0]], rampBeats: 0.75 },
  stomps: { curve: [[5, -Infinity], [6, -14], [FULL_HOUSE, 0]], rampBeats: 1, eq: [{ type: 'peaking', freq: 2200, gainDb: 3, q: 0.9 }], clip: -3 },
  cowbell: {
    curve: [[11, -Infinity], [12, -12], [FULL_HOUSE, 5]],
    rampBeats: 2,
    // presence: the record is dense at the bell's 670 Hz fundamental, thinner at its 2-5 kHz clank
    eq: [{ type: 'highshelf', freq: 2400, gainDb: 5 }],
    clip: -7,
  },
  bonus: { curve: [[FULL_HOUSE - 1, -Infinity], [FULL_HOUSE, 0]], rampBeats: 4 },
};

export const dbToGain = (db: number): number => (db === -Infinity ? 0 : Math.pow(10, db / 20));

function curveDb(c: Curve, x: number): number {
  if (x <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) {
    const [x1, y1] = c[i];
    if (x <= x1) {
      const [x0, y0] = c[i - 1];
      if (y0 === -Infinity) return x >= x1 ? y1 : -Infinity;
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return c[c.length - 1][1];
}

/** Linear gain of an overlay stem at a crowd count (undefined = not an overlay stem). */
export function overlayGain(stem: string, crowd: number): number | undefined {
  const r = OVERLAY_RULES[stem];
  return r ? dbToGain(curveDb(r.curve, crowd)) : undefined;
}

/**
 * Master bus levels (measured, see the audio notes in CLAUDE.md):
 *   - the record (edit) is mastered hot: -10.5 LUFS, 100 ms RMS median -14 dBFS, true peaks +0.75 dBFS
 *     (it clips on its own). Record + overlays + SFX used to ride the limiter ~40 % of the time at FULL
 *     HOUSE, so everything now goes through a -4 dB HEADROOM trim before the limiter: the record alone
 *     peaks -3.3 dBFS (under the threshold), and the overlays / grade sounds add on top of it;
 *   - synth SFX at unity: strike/lum/land/thwack ~-26 dBFS RMS(100 ms), hop -34, peaks -9..-18 dBFS.
 *     At +6 dB the gameplay SFX sit ~6 dB under the record (strike/lum ~-20, hop ~-28 "low in the
 *     mix"), reward sounds (chime, roar) come up close to it (the headroom trim applies to both buses);
 *   - limiter: threshold just under 0 dBFS so it only catches peaks; its makeup gain is trimmed
 *     away (AudioSystem.calibrate), so below the threshold everything is at unity.
 */
export const MIX = {
  /** music bus (record + overlay stems), linear */
  music: 1.0,
  /** SFX bus, linear (+6 dB) */
  sfx: 2.0,
  /** pre-limiter trim on music + SFX (dB): room for the overlays and SFX on top of the hot record */
  headroomDb: -4,
  /** soft limiter on the master (DynamicsCompressorNode): threshold/knee dB, ratio, attack/release s */
  limiter: { threshold: -2.5, knee: 2, ratio: 20, attack: 0.002, release: 0.1 },
} as const;

/**
 * THE CHORUS LIFT (audio/lift.ts): the music bus after the booth, louder and bigger in every chorus (sections `chorus*`),
 * a hair under the old level between them. Ramps: in over the beat before the chorus downbeat, out over the beat after
 * its end (a chorus starting on a hush's release steps in ON the drop). `clipDb` = the lift's zero-latency soft clip
 * ceiling (dBFS on the music bus, before the -4 dB master trim): identity up to 3 dB under it, so between choruses
 * only the record's hottest peaks graze it; in a chorus it shaves the lifted drum peaks so the master limiter doesn't
 * pump. Measured: see the `chorus_*` mix-lab scenes (tools/music/chorus_report.py) and CLAUDE.md.
 */
export const CHORUS_LIFT = {
  /** which sections lift */
  sections: /^chorus/,
  /** music bus level between choruses / in a chorus (dB, re the old unity) */
  restDb: -1,
  chorusDb: 1.5,
  /** shelves at full lift (dB): a touch of air + weight */
  low: { freq: 110, db: 1 },
  high: { freq: 5000, db: 1.5 },
  /** stereo width at full lift (x the booth's) */
  width: 1.12,
  clipDb: 1.5,
  rampInBeats: 1,
  rampOutBeats: 1,
} as const;

/**
 * The projection booth (audio/booth.ts) as a function of the crowd: `open` 0 (booth) .. 1 (the record as
 * mastered), `house` 0..1 (FULL HOUSE extras: width). Moves are quantized to the next beat and glide over
 * `rampBeats` (setTargetAtTime, tau = ramp/4: 98 % there after the ramp; no zipper, no pumping).
 */
export const BOOTH = {
  /** crowd count where the booth is fully closed / fully open (the crowd is 3 right after the cold open) */
  closedAt: 3,
  openAt: 14,
  /** 4th-order Butterworth high-pass / low-pass corners (Hz), closed -> open (swept in cents via detune) */
  hp: { closed: 320, open: 16 },
  lp: { closed: 3400, open: 20000 },
  /** horn-speaker honk (peaking EQ) when closed */
  honk: { freq: 1700, q: 1.1, db: 4 },
  /** stereo width (M/S; 0 = mono, 1 = as recorded) */
  width: { closed: 0.2, open: 1, house: 1.15 },
  /** booth level (dB) when closed; open = 0 dB */
  levelDb: -3,
  /** projector wow (0.9 Hz) + flutter (5.7 Hz) delay-line depths (s) when closed; scaled by (1 - open)^2 */
  wow: 0.00035,
  flutter: 0.00012,
  /** projector clatter + optical crackle bed (dB re the sample) when closed; gone at open >= bedGoneAt */
  bedDb: -4,
  bedGoneAt: 0.55,
  /** the film delay line's resting delay (s): every music sample is this late, the clocks know it */
  baseDelay: 0.006,
  rampBeats: 1,
  /**
   * THE HUSH (booth.ts Squeeze, StageAudio.hush): the record (+ the stomps/claps stem) forced into the horn band for
   * the beat before act 3's drop, so only the dry cowbell overlay and the player's KRAK come through. Corners (Hz),
   * the squeezed level (dB), the squeeze-in time and the release crossfade (s, centred on the release beat).
   */
  hush: { hp: 320, lp: 3400, db: -12, inSec: 0.03, outSec: 0.01 },
} as const;

export interface BoothState {
  open: number;
  house: number;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Booth state for a crowd count (floats fine: the skill crowd moves in halves). */
export function boothState(crowd: number): BoothState {
  // linear in the crowd: the filters sweep in cents and the level in dB, so equal steps sound equal
  const open = clamp01((crowd - BOOTH.closedAt) / (BOOTH.openAt - BOOTH.closedAt));
  const house = clamp01((crowd - (FULL_HOUSE - 4)) / 4);
  return { open, house };
}

/**
 * Grade / event SFX levels (dB on the SFX bus, which is itself +6 dB): sampled one-shots from
 * assets/audio/sfx (tools/music/sfx.py). Tuned against the record in the offline render.
 */
export const GRADE_SFX = {
  /** Perfect: jukebox bell on a chord tone, climbing with the combo (E5..E6+) */
  perfectDb: -16,
  /** Great: the same bell, softer and duller (low-passed) */
  greatDb: -24,
  greatLp: 2200,
  /** Miss: a dull thunk (low-passed wood) + the film snags in the gate (music low-pass dip) */
  missDb: -13,
  missLp: 700,
  /** stumble: the audience's "ooh" (the film warbles) */
  oohDb: -14,
  /** death: the audience groans (the ooh, pitched down + low-passed) under the tape-stop */
  groanDb: -10,
  /** the groan's playback rate (0.94 = -1 st; iteration 8: was 0.78, -4.3 st, a slowed-down "demon" groan) */
  groanRate: 0.94,
  /** checkpoint: projector changeover click + cue-dot flare */
  clickDb: -6,
  flareDb: -17,
  /** FULL HOUSE reached: a cheer swell on the next downbeat; cheers into vocal gaps while full */
  cheerDb: -15,
  gapCheerDb: -19,
} as const;

/**
 * The hero's strike HIT (Sfx.hit; iteration 9b, the user: "just change the 'heys' to more of a hitting sound effect"):
 * a pool-cue CRACK into a body-punch THUMP + a short room tail, round-robin (hit_1..4, tools/music/sfx.py --set=hits,
 * instruments/fx_hits.py); the audience's stomp-clap hit (hit_crowd) joins it when the crowd is up (every strike at a
 * crowd >= 4); a Heave, a giant, the break shot and the final hit play a HEAVY hit (hit_big_1..2) instead. dB on the
 * SFX bus (+6 dB). Measured: the `hit_*` mix-lab scenes (tools/music/hit_report.py).
 */
export const HIT_SFX = {
  heroDb: -8,
  crowdDb: -15,
  /** a heavy hit (a Heave / a giant / the break shot / the final hit): the big variant + the whole house */
  bigDb: -6.5,
  bigCrowdDb: -11,
  /** a Heave graded after its strike already sounded: the heavy layer joins if the strike is at most this old (s) */
  lateBigSec: 0.12,
} as const;

/**
 * Stage sounds (iteration 4): named one-shot stacks the level's audio cues (audio/cues.ts) and the act-2 mechanics
 * play through StageAudio. Each layer: a sample (assets/audio/sfx, tools/music/sfx.py --set=stage), its level (dB on
 * the SFX bus, which is +6 dB, then the -4 dB headroom trim), an offset in BEATS from the cue beat (tempo-mapped), and
 * `align` = land the sample's attack (manifest onsetSec) exactly on that beat (off = the file STARTS there: swells and
 * telegraphs). Levels measured in the mix lab (the `act3_*` / `act2_*` scenarios; CLAUDE.md audio notes).
 */
export interface StageLayer {
  id: SampleId;
  db: number;
  beats?: number;
  rate?: number;
  lp?: number;
  align?: boolean;
}

const letter = (i: number): StageLayer[] => [
  // the steel legs groan through the pivot beat (starts ON the downbeat), the letter slams ON the backbeat
  { id: `letter_creak_${i}` as SampleId, db: -5 },
  { id: `letter_slam_${i}` as SampleId, db: -12, beats: 1, align: true },
];

/**
 * The stage sounds' bus (StageAudio): a zero-latency soft clip (peak ceiling, dBFS before the SFX bus's +6 dB and the
 * -4 dB trim) so the big impacts (the KRAK, the iris, Big Jim's fists, giant pins) can be LOUD without their
 * transients stacking on the record's peaks into the master limiter: shaving ~3 dB of attack reads as a driven,
 * bigger hit (the cowbell trick), and the limiter stays a safety net.
 */
export const STAGE_BUS = { clipDb: -10 } as const;

export const STAGE_SFX = {
  // ---- act 3
  /** THE BREAK SHOT (the hush's strike target smashed): the only full-range sound in the hush */
  breakKrak: [{ id: 'break_krak', db: -6, align: true }],
  /** the break missed: the rack caves in on its own */
  rackCollapse: [{ id: 'rack_collapse', db: -8, align: true }],
  /** the drop (the hush releases): the house comes down */
  dropCheer: [{ id: 'crowd_mega_cheer', db: -11, align: true }],
  letter1: letter(1),
  letter2: letter(2),
  letter3: letter(3),
  letter4: letter(4),
  letter5: letter(5),
  letter6: letter(6),
  bigJimBluff: [{ id: 'bigjim_bluff', db: -10, align: true }],
  bigJimFist1: [{ id: 'bigjim_fist_1', db: -11, align: true }],
  bigJimFist2: [{ id: 'bigjim_fist_2', db: -10, align: true }],
  bigJimFist3: [{ id: 'bigjim_fist_3', db: -9, align: true }],
  lensCrack1: [{ id: 'lens_crack_1', db: -4, align: true }],
  lensCrack2: [{ id: 'lens_crack_2', db: 2, align: true }],
  lensCrack3: [{ id: 'lens_crack_3', db: -8, align: true }],
  lensCrack4: [{ id: 'lens_crack_4', db: -9, align: true }],
  skylight: [{ id: 'glass_skylight', db: -13, align: true }],
  glassWall: [{ id: 'glass_wall', db: -9, align: true }],
  /** the usher hangs the marquee letters: three clanks up the E triad */
  marquee: [
    { id: 'marquee_clank', db: -15, align: true },
    { id: 'marquee_clank', db: -16, beats: 0.66, rate: 2 ** (4 / 12), align: true },
    { id: 'marquee_clank', db: -14, beats: 1, rate: 2 ** (7 / 12), align: true },
  ],
  /**
   * THE FINAL HIT (the edit's 340: the heavy hit stack + crash + stomps, baked in; iteration 9b: no gang HEY): the iris slams ON it with the mega cheer,
   * the film snaps and runs out on the next beat (THE END burns in), the curtain-call applause carries the ring-out
   * into the results poster (the SFX bus outlives the music's fade).
   */
  finale: [
    { id: 'iris_slam_big', db: -9.5, align: true },
    // the house ERUPTS half a beat after the hit (a reaction, not a second hit on the beat)
    { id: 'crowd_mega_cheer', db: -8, beats: 0.5, align: true },
    { id: 'film_runout', db: -4, beats: 1 },
    { id: 'crowd_applause_long', db: -11, beats: 2, align: true },
  ],
  // ---- act 2 mechanics
  /** thrown bottle: the whistle STARTS 1 beat before the arrival (the telegraph) */
  bottleWhistle: [{ id: 'bottle_whistle', db: -13 }],
  firebombWhoosh: [{ id: 'firebomb_whoosh', db: -6 }],
  firebombBurst: [{ id: 'firebomb_burst', db: -12, align: true }],
  bottleSmash: [{ id: 'bottle_smash', db: -8, align: true }],
  /** bowling ball: the rumble STARTS 1 beat before the arrival; the file swells to it 0.36 s in */
  ballRumble: [{ id: 'ball_rumble', db: -9 }],
  ballHit: [{ id: 'ball_hit', db: -6, align: true }],
  pinScatter: [{ id: 'pin_scatter', db: -11, align: true }],
  pinStrike: [{ id: 'pin_scatter_big', db: -8, align: true }],
  windowCrash: [{ id: 'window_crash', db: -9, align: true }],
  // ---- iteration 6 (tools/music/sfx.py --set=feel)
  /** near-miss WHEW: the audience's quick inhale on the event (now), then — if you live — the rising 'ooOOH' swelling
   *  into a cheer, started on the next beat (called off by a death) */
  whewGasp: [{ id: 'whew_gasp', db: -10 }],
  whewRelief: [{ id: 'whew_relief', db: -13 }],
  /** a FILM CANISTER found: lid clank + reel spin-up + a glass arpeggio up the band's chord (E / A / B), on the beat */
  canisterE: [{ id: 'canister_E', db: -9, align: true }],
  canisterA: [{ id: 'canister_A', db: -9, align: true }],
  canisterB: [{ id: 'canister_B', db: -9, align: true }],
  /** a smashed goon's stinger, ON its part's next hit (the part's overlay flares with it: Conductor.flareStem) */
  goonStomps: [{ id: 'jukebox_boom', db: -10, align: true }],
  goonClaps: [{ id: 'unison_clack', db: -12, align: true }],
  goonCowbell: [
    { id: 'tonk_lo', db: -6, align: true },
    { id: 'tonk_hi', db: -8, beats: 0.659, align: true },
  ],
  goonPiano: [{ id: 'piano_gliss', db: -10, align: true }],
  // (iteration 9b: the HEY goon's gang shout is a HIT: the house's stomp-clap + a heavy cue whack, on the shouts part's
  //  next hit; -26 LUFS momentary like the old gang HEY at -15.5)
  goonShouts: [
    { id: 'hit_crowd', db: -9, align: true },
    { id: 'hit_big_2', db: -15, align: true },
  ],
  // ---- iteration 7 (tools/music/sfx.py --set=polish, instruments/fx_polish.py)
  /** THE COLOUR REEL (setPiece colorBurst, the overlay's first HIT accent on 15): the air rises for 1.43 beats (the file PEAKS at
   *  its end, ~0.53 s) and the bloom (air + glass bells up the E chord + the house's delighted 'aaah') opens ON the beat —
   *  subtle: the overlay's accent and the player's strike are the hit */
  colorBurst: [
    { id: 'color_whoosh', db: -17, beats: -1.43 },
    { id: 'color_bloom', db: -15, align: true },
  ],
  /** a hidden canister's tease: a tiny glass star-glint on each of the 4 beats before its takeoff (the art winks on
   *  every beat of its tease window), rising up the chord to E7, pitched by the cue (audio/cues.ts) */
  canisterGlint: [{ id: 'canister_glint', db: -21, align: true }],
  /** the hero passed UNDER a canister (game 'tease'): the glint answers twice, falling ("up there...") */
  canisterTease: [
    { id: 'canister_glint', db: -18, align: true },
    { id: 'canister_glint', db: -21, beats: 0.5, rate: 2 ** (-5 / 12), align: true },
  ],
} satisfies Record<string, StageLayer[]>;

/**
 * THE ROOF SIGN (iteration 7, game 'sign'): each stop-time strike rewrites one neon letter of BIG JIM's to SLIM — the
 * letter FLICKERS ON: a relay clunk + the tube striking and buzzing AT PITCH. Letter `index` 0..3 plays the chord's
 * tones upward from its root (A7 on the roof: A3 C#4 E4 G4, the sampled pitches), so the four hits spell an arpeggio.
 * On the strike's beat when the press was early (<= 150 ms), else at once, like the bells.
 */
export const SIGN_SFX = { db: -11 } as const;

export type StageSound = keyof typeof STAGE_SFX;

/**
 * TOKENS SING THE MELODY (iteration 6, audio/tokenMelody.ts): the token voice's level (dB on the SFX bus, like
 * GRADE_SFX) and timing. `lateSec`: a late / loose token waits for the next grid point only if it is this close;
 * `snapBeats`: a token laid this close to a triplet / swung-8th grid point sings on it; `fuseSec` (iteration 7): picked up
 * up to this long AFTER its own beat it sings at once as if on it (identical attacks <= ~30-40 ms apart fuse; measured in
 * the real game, 7 % (autoplay) / 15-19 % (sloppy, ±130) of pickups land 0-40 ms late, 0.4 / 2-3 % later:
 * src/audio/lab/tokenprobe.mjs). Measured (mix lab, the real
 * level's tokens): -9..-11 dB under the music at each token (the Great bell's level), ~-4 dB in its own band.
 */
export const TOKEN_SFX = { db: -16, lateSec: 0.07, earlySec: 0.15, snapBeats: 0.17, fuseSec: 0.04 } as const;

/** a smashed goon's part FLARES (Conductor.flareStem): +db over its crowd level (>= -10 dB absolute) for holdBeats,
 *  gliding back over as long; the overlay bus's soft clip caps the transients, so it reads as ~+4 dB louder */
export const GOON_FLARE = { db: 9, holdBeats: 1 } as const;

/**
 * THE ENDING (iteration 7, review iter6 fix 4: the stings land WITH the picture). The renderer owns the ending's clock and
 * tells the audio when its two picture beats land (game events emitted by render/renderer.ts endingCues, `inS` ahead):
 *   'theEnd'      the iris has shut and THE END burns in  -> THE_END_SFX: the projector runs the leader out under the
 *                 pianist's flourish (the same for every finisher: the film ended, the billing is not out yet)
 *   'posterStamp' the rank stamp SLAMS onto the one-sheet -> POSTER_SFX[letter]: the stamp's thump + the pianist's tier
 *                 stab ON the slam + the house's reaction, and the finale's curtain-call applause (still ringing from the
 *                 final hit) re-levelled to the billing (`applauseDb`): S roars, C claps warmly.
 * A FINISHER is never billed D (game/rank.ts floors a finished run at C; StageAudio floors it again): C is WARM — a soft
 * rolled E6/9 and real applause, a good night out, never a joke. D (the deflating "wah wah waaah") is only for a run
 * that walked out.
 */
export interface PosterLayer {
  id: SampleId;
  db: number;
  /** seconds after the cue's moment (the iris shut / the stamp's slam) */
  at: number;
  /** land the sample's attack ON that moment (manifest onsetSec) */
  align?: boolean;
}
export const THE_END_SFX: PosterLayer[] = [{ id: 'theend', db: -9, at: 0 }];
export const POSTER_SFX: Record<'S' | 'A' | 'B' | 'C' | 'D', { layers: PosterLayer[]; applauseDb: number }> = {
  S: {
    layers: [
      { id: 'rank_stamp', db: -8, at: 0, align: true },
      { id: 'rank_S', db: -8, at: 0, align: true },
      { id: 'crowd_mega_cheer', db: -12, at: 0.08, align: true },
    ],
    applauseDb: 2,
  },
  A: {
    layers: [
      { id: 'rank_stamp', db: -9, at: 0, align: true },
      { id: 'rank_A', db: -9, at: 0, align: true },
      { id: 'crowd_cheer_swell', db: -13, at: 0.06, align: true },
    ],
    applauseDb: -1,
  },
  B: {
    layers: [
      { id: 'rank_stamp', db: -10, at: 0, align: true },
      { id: 'rank_B', db: -10, at: 0, align: true },
      { id: 'crowd_applause', db: -15, at: 0.1, align: true },
    ],
    applauseDb: -4,
  },
  C: {
    layers: [
      { id: 'rank_stamp', db: -11, at: 0, align: true },
      { id: 'rank_C', db: -11.5, at: 0, align: true },
      { id: 'crowd_applause', db: -15, at: 0.15, align: true },
    ],
    applauseDb: -7,
  },
  /** walked out (never a finisher): the pianist's deflating "wah wah wah waaah" and the house goes quiet */
  D: { layers: [{ id: 'rank_flop', db: -11, at: 0 }, { id: 'claps_sparse', db: -14, at: 1.8 }], applauseDb: -40 },
};
