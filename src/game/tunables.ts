/**
 * ALL game-feel constants live here. Units: pixels (logical 1920x1080 space), seconds.
 * World y grows DOWNWARD (canvas convention); ground top is y = 0 and heights above it are negative y.
 *
 * Tempo coupling: the level is authored in beats (x = beat * pixelsPerBeat) and the player's
 * max run speed is DERIVED from the song's TEMPO MAP every sim step (runSpeed = pixelsPerBeat *
 * BPM(beat) / 60; Player.setTempo) so that holding right keeps the hero exactly on the music even
 * on a live recording whose tempo drifts. Everything musical is in BEATS (jump airtime, i-frames,
 * lum hover, chaser distance, slam/jabber phases, count-in) and converted through the tempo map;
 * the judge windows are in ms. Per-second values below (accel, coyote, buffers) are feel constants.
 * The jump constants give a full (held) jump of ~2 beats and a tap-hop of ~0.93 beat at any tempo —
 * check the debug overlay's "jump airtime" readout after changing them.
 */
export const Tun = {
  sim: {
    /** fixed simulation rate */
    hz: 120,
    /** max sim steps per rendered frame before we drop time (spiral-of-death guard) */
    maxStepsPerFrame: 30,
  },

  /** Slim (the pool shark): hitbox 56x100, slide 56x40 [tune]; drawn ~130 px tall with the cue. */
  player: {
    width: 56,
    height: 100,
    slideHeight: 40,
    /** hurtbox used against hazards/enemies is narrowed by this many px per side (fairness) */
    hurtInset: 6,
  },

  run: {
    /** fraction of the beat-derived run speed that is the max speed (1 = exactly on tempo) */
    speedScale: 1.0,
    accelGround: 6500,
    decelGround: 8000,
    /** accel when reversing direction on the ground */
    turnAccel: 16000,
    accelAir: 4500,
    decelAir: 1400,
    /** when released at a spawn/checkpoint while holding right, start at full speed (Rayman-style launch) */
    launchOnRelease: true,
    /** legs cycle: footfalls per beat at max speed (2 = eighth notes) */
    footfallsPerBeat: 2,
  },

  /**
   * Groove lock: while holding forward and BEHIND the music line (x the song says the hero
   * should be at), max speed is raised a little so the hero drifts back onto the beat grid
   * (e.g. after a slow start or bumping into something). Never pushes the hero ahead.
   */
  grooveLock: {
    enabled: true,
    /** extra speed per px of lag (1/s): boost = min(gain * lagPx, maxBoost * runSpeed) */
    gain: 3,
    maxBoost: 0.2,
    /** ignore lags bigger than this (player deliberately stopped/went back) — in beats */
    maxLagBeats: 4,
  },

  /**
   * Jump physics are defined in BEATS (DESIGN §4 / reference §3.2) so hops land on beats at any
   * tempo: gravity = 2*height / (timeToApexBeats * secondsPerBeat)^2.
   * Result (see debug overlay / report.jumpAirtimes): tap (hold <= minHoldBeats) = ~0.93 beat hop,
   * ~92 px apex (lands just before the next beat, so a hop-per-beat chain always has the next press
   * inside the jump buffer); hold 1 beat = ~1.96 beat jump, ~250 px apex.
   */
  jump: {
    /** apex height of a fully held jump without apex hang (px) */
    height: 260,
    /** time to apex of a full jump, in beats */
    timeToApexBeats: 1.18,
    /** vy multiplier when jump is released while rising (variable jump height) */
    cutMultiplier: 0.15,
    /** the cut never happens before this (beats): every tap shorter than this is the SAME 1-beat hop */
    minHoldBeats: 0.22,
    /** grace period after running off a ledge during which a jump still works */
    coyoteTime: 0.1,
    /**
     * a jump pressed this long before landing still fires on landing. 0.17 (iteration 2, was 0.13): on
     * slam lifts a late hop lands late, and an early next press used to fall outside the buffer
     * (the #1 cause of sloppy-bot deaths in iteration 1)
     */
    bufferTime: 0.17,
    /** |vy| below this counts as "apex" (px/s) */
    apexThreshold: 170,
    /** gravity multiplier near the apex while jump is held (hang time) */
    apexGravityMul: 0.5,
    /** gravity multiplier while falling */
    fallGravityMul: 1.6,
    maxFallSpeed: 1900,
    /** holding down in the air */
    fastFallGravityMul: 2.4,
    fastFallMaxSpeed: 2700,
    /** max upward correction when a jump clips a ceiling corner (px) */
    cornerCorrection: 14,
    /** step up small ledges when running into them (px) — 26 lets the hero walk out of a 24 px pool */
    ledgeAssist: 26,
  },

  /** wall slide / wall jump: OFF for this level (DESIGN §2) */
  wall: {
    enabled: false,
    slideMaxSpeed: 300,
    jumpVX: 820,
    /** vertical speed as fraction of normal jump velocity */
    jumpVYMul: 0.92,
    /** time after a wall jump during which air control is reduced */
    lockTime: 0.14,
  },

  /**
   * THE STRIKE (DESIGN's "Claw"): an up-forward strike that hits things ahead AND above (DESIGN §2).
   * Hitbox (facing right, relative to the feet centre): x in [-backReach, width/2 + reach],
   * y in [-height, 0].
   */
  strike: {
    /** seconds from press to active hitbox */
    startup: 0.016,
    /** duration of the active hitbox */
    active: 0.17,
    /** total duration of the strike animation */
    duration: 0.28,
    cooldown: 0.04,
    /** a new press may cut the previous strike's recovery once its active window is over (strikes on consecutive beats) */
    cancelRecovery: true,
    bufferTime: 0.1,
    /** reach beyond the body's front edge (px) */
    reach: 170,
    /** reach behind the body centre (overhead part of the arc) */
    backReach: 24,
    /** hitbox height above the feet (px): pendulums swing down to ~150 px */
    height: 250,
    /** hitstop on contact (s) — cosmetic, the lost time is repaid (see game.ts) */
    hitstop: 0.055,
    /** hitstop for a Heave (completed Hup-Hup-HEY) */
    heaveHitstop: 0.09,
    /** hitstop for a GIANT breakable (the walkdown kegs) */
    giantHitstop: 0.08,
    /** after hitstop, the sim runs this much faster until the lost time is repaid (keeps the hero on the beat) */
    catchUpRate: 0.35,
    /** upward pop when striking in the air — 0: a pop would delay the landing and push the next hop off the beat */
    airPop: 0,
  },

  /** Stumble (spikes, jabber jabs): DESIGN §4 fail state */
  stumble: {
    /** knockback velocity (DESIGN: ~0.5 beat lost; with the +15% surge that's back on the grid in ~4 beats) */
    vx: -140,
    vy: -420,
    /** controls locked (s) */
    lockTime: 0.12,
    /** invulnerability, in beats */
    iframesBeats: 1,
    /** lums dropped (they hover 1 bar to re-grab) */
    dropLums: 5,
    dropHoverBeats: 4,
  },

  /**
   * Timing grades (ms, symmetric) — early side gets +earlyBonusMs. Score/feedback/crowd only, never physics.
   * Iteration 3: Perfect ±45 → ±33 (+10 early) so a ±40 ms player earns Greats sometimes (a skill ceiling).
   */
  judge: {
    perfectMs: 33,
    greatMs: 85,
    goodMs: 135,
    earlyBonusMs: 10,
    /** early presses within this window sound on the target beat (SFX quantisation) */
    quantizeEarlyMs: 150,
  },

  /**
   * The crowd = the SKILL meter + music reward (iteration 3, review iter2 fix 2): weighted by grade, it
   * decays, and misses hurt. FULL HOUSE (bigCatchAt) needs a near-clean chorus (≥ ~80% Perfect/Great).
   */
  crowd: {
    /**
     * 14 (iteration 6, review iter5 fix 1; was 8): the record plays FULL from beat 0 — the booth (crowd < boothBelow) is the
     * COST of misses, not the default. The meter rests here (`restAt`): above it the house cools back down to it, below it
     * the house comes back on its own (`recoverPerBeat`) on top of your hits
     */
    start: 14,
    /** where the meter rests: decays DOWN to it from above, recovers UP to it from below (iteration 6) */
    restAt: 14,
    /** below `restAt` the house drifts back up this many members per beat (a ±130 player doing OK is never stuck thin) */
    recoverPerBeat: 0.12,
    min: 3,
    max: 24,
    perPerfect: 1,
    perGreat: 0.5,
    /** a Good still nudges the house (iteration 4: a Good/Great player climbs slowly instead of sitting at the floor) */
    perGood: 0.25,
    /** a completed on-grid Hup-Hup-HEY */
    perPhrase: 3,
    /** members lost per missed target (judge expiry) */
    perMiss: 2,
    /** members lost per stumble */
    stumbleLoss: 4,
    /** members lost on a death (from the checkpoint's value; iteration 8: a respawn never starts below `restAt`) */
    deathLoss: 6,
    /** the meter cools by this many members per beat while above `restAt` (iteration 6: was `min`) */
    /** iteration 6: 0.3 (was 0.4) with the slope 0.04 — a ±85 player holds FULL HOUSE through most of a chorus */
    decayPerBeat: 0.3,
    /**
     * ...plus `decaySlope` per member above `decayKnee` (iteration 4): a leaky meter whose resting level follows your
     * grade mix, so FULL HOUSE stays a SKILL state even with the drop and Good +0.25. Chorus equilibria (≈1 action/
     * beat): ±40 (~0.95/beat of gains) ≈ 23+ (holds FULL HOUSE), sloppy ±85 (~0.7) ≈ 18, ±130 (~0.6) ≈ 16 — a
     * dropped FULL HOUSE lasts them ~1-3 bars: the moment, not the state.
     */
    decaySlope: 0.04,
    /** iteration 6: 14 (was 12) = the rest level — chorus equilibria (decay 0.3 + 0.04/member over 14): ±40 caps at 24,
     * ±85 ≈ 21 (FULL HOUSE, lost for a bar or two on a miss), ±130 ≈ 18 (full record, FULL HOUSE in its best stretches) */
    decayKnee: 14,
    /**
     * A section cap BELOW the meter doesn't clamp it (the act-2 seam used to drop FULL HOUSE 24 → 16 in one step):
     * the excess glides down at this many members per beat on top of the decay (24 → 16 over ~6 beats), and
     * gains can't push it higher meanwhile.
     */
    capGlidePerBeat: 1,
    /**
     * THE DROP: a clean (all Great+) Hup-Hup-HEY in the 8 beats before a chorus (a cap rising to ≥ bigCatchAt; or a
     * crowd item's `earn` beats graded Great+) lifts the meter to bigCatchAt + dropBonus `dropLeadBeats` before the
     * chorus downbeat, so StageAudio's next-beat quantisation lands FULL HOUSE (and its cheer) ON the downbeat.
     */
    dropWindowBeats: 8,
    dropLeadBeats: 0.5,
    dropBonus: 1,
    /** shouts stem: -6 dB at 0 members -> 0 dB at `fullAt` */
    fullAt: 12,
    /** BIG CATCH / FULL HOUSE mode (bonus stem) at >= this */
    bigCatchAt: 20,
    /** the projection booth opens fully at this crowd (audio/mix.ts BOOTH): below it the record plays thin (report: boothBeats) */
    boothBelow: 14,
    /**
     * THE FORGIVING HOUSE (iteration 7, review iter6 fix 1: one stumble used to cost a whole chorus's FULL HOUSE). In a
     * FORGIVING stretch (a chorus section of the song under a cap ≥ bigCatchAt, or a `crowd { forgive }` item such as the
     * roof's stop-time):
     *   - HOLD: once the house has been full in the stretch, the decay rests at bigCatchAt instead of restAt — FULL HOUSE
     *     doesn't evaporate; only a miss / stumble / death knocks it out (the moment is heard, then…)
     *   - RALLY: `rallyHits` consecutive Great+ presses (or a Heave) inside the stretch refill the house to
     *     bigCatchAt + dropBonus ("the crowd forgives"); the run count restarts after each rally
     */
    rallyHits: 4,
    holdFull: true,
  },

  /**
   * The Chaser (the Burn): DESIGN §4, iteration 3 "the Burn remembers". Its front sits `gap` beats behind the
   * music line; `gap` rests at `restGap`, every stumble PULLS it `stumblePull` closer, every missed reward feeds
   * it `missPull`, and it backs off `relaxPerBeat` (+ `relaxPerHit` per graded press) toward rest. On every
   * drum fill it LUNGES `lungeBeats` for a beat. It moves toward its target at `closeRate` beats per beat.
   * One stumble = it's on screen and hungry; two stumbles close together (or a stumble into a fill) = caught.
   */
  chaser: {
    /** resting distance behind the music line (beats) */
    restGap: 1.75,
    stumblePull: 0.75,
    missPull: 0.2,
    relaxPerBeat: 0.04,
    relaxPerHit: 0.06,
    /**
     * after a death the Burn restarts at max(checkpoint gap, this). 1.75 = rest (iteration 4, was 1.1: you respawned
     * CLOSER to it than it rests, so one stumble after a Burn death was a second death — the bars 40-41 loop)
     */
    respawnMinGap: 1.75,
    /** after a respawn the first stumble doesn't pull the Burn (it flares, nothing more): no catch-twice loops */
    respawnGraceStumbles: 1,
    /** after the Burn CAUGHT you, it rests this much further back (beats) until the next checkpoint */
    caughtBonus: 0.5,
    /**
     * iteration 5 (review iter4 fix 3): it only KILLS once pulled below this gap (beats). One stumble from rest
     * (1.75 − 0.75 = 1.0) never catches, even into a fill lunge: the Burn scorches your heels (danger 1, flare) but you
     * live. Two stumbles close together, or a stumble after a run of misses (already pulled), still catch.
     */
    catchBelowGap: 0.95,
    /** …and when only ONE stumble pulled it in the last `stumbleMemoryBeats` (2 bars), that stumble's pull doesn't count
     * toward the catch (misses + a single stumble ≠ caught; two stumbles within 2 bars still are) */
    stumbleMemoryBeats: 8,
    /**
     * the ASSIST, per checkpoint segment (resets at the next checkpoint): after `missFeedOffAfter` catches, missed
     * rewards stop feeding it; after `restAfter` catches it rests at `assistRest` beats and stops lunging; after
     * `spentAfter` catches it can't kill at all (a struggling player always gets through; no catch loops)
     */
    missFeedOffAfter: 2,
    restAfter: 2,
    assistRest: 2.5,
    spentAfter: 3,
    /** …but a hero STUCK (no forward progress for this many beats: a wall he can't pass) is caught anyway (no softlock) */
    stuckBeats: 2,
    /** drum-fill lunge: extra reach (beats) and envelope (rise, fall) in beats */
    lungeBeats: 0.3,
    lungeRise: 0.25,
    lungeFall: 0.9,
    /** how fast the front closes on / backs off from its target (beats of distance per beat) */
    closeRate: 0.8,
    /** rise animation (beats) */
    riseBeats: 4,
    /**
     * THREAT (iteration 6, review iter5 cut list: the Burn cried wolf): `threat` = how far it is pulled in from its rest,
     * 0 at rest → 1 at `threatSpan` beats closer. Its drum-fill LUNGE scales with it (at rest it only pulses: a lunge
     * there could never reach you anyway), 'lunge' events fire only when threat > 0, and a pull only FLARES it when the
     * threat is ≥ `flareAt` (one missed reward = no flare; a stumble or two misses = it flares)
     */
    threatSpan: 0.5,
    flareAt: 0.5,
  },

  /**
   * LATENCY (iteration 4, review iter3 fix 3). `calib`: the cold open's projector sync — `clicks` stick clicks at the
   * song's tempo, the player taps STRIKE on each; the offset = the median error of the last `use` taps (≥ `minTaps`
   * of them within half a beat), clamped to [minMs, maxMs]. `auto`: while running, the median press error of the
   * last `window` graded presses nudges the offset by `gain` × median (≤ `maxStepMs` per step, only when
   * |median| ≥ `deadMs`), never more than `rangeMs` from the calibrated value.
   */
  calib: {
    clicks: 8,
    use: 6,
    minTaps: 4,
    leadSec: 0.9,
    minMs: -120,
    maxMs: 300,
  },
  autoLatency: {
    enabled: true,
    window: 16,
    deadMs: 18,
    gain: 0.35,
    maxStepMs: 8,
    rangeMs: 40,
    /**
     * iteration 5 (review iter4 fix 6): the projector sync is RE-OFFERED — a prompt at the next checkpoint / count-in
     * (never mid-action) and in the pause screen (`Game.resyncOffer`), at most `offerTimes` times — when 16 graded
     * presses average ≥ 45 ms off (the first bars of an uncalibrated Bluetooth player), or when the drift wants to go
     * past its clamp `pinnedSteps` steps in a row
     */
    pinnedSteps: 2,
    offerTimes: 3,
  },

  /**
   * NEAR-MISS "WHEW" (iteration 6, review iter5 fix 5): a landing / takeoff inside the last `ms` of a lethal window, or a
   * spike passed within `grazePx`, emits a `whew` event (+ a 'whew' stamp): a gasp and a cream puff, no score change.
   * At most one per `gapBeats`.
   */
  whew: {
    ms: 40,
    grazePx: 12,
    gapBeats: 0.75,
  },

  /**
   * NOTABLE STAMPS (iteration 6, review iter5 cut list): only these moments raise a `stamp` event (the art's stamp);
   * per-press grades stay in `grade` (bells) without a stamp. `phraseBeats` = the musical phrase for 'firstPerfect'.
   */
  stamps: {
    phraseBeats: 16,
    streaks: [10, 25, 50, 100] as readonly number[],
    /** after the last listed streak, every this many */
    streakEvery: 50,
  },

  /** failure hints: after the player fails the same thing `after` times, show a short tip once */
  hints: {
    after: 2,
    beats: 5,
    /** iteration 7 (review iter6 fix 7): no failure hint from this beat on (◆304: the boss fight is no place for a tip) */
    until: 304,
  },

  /**
   * THE JUDGE FOLLOWS THE HERO (iteration 7, review iter6 fix 1): while the hero is BEHIND the music line (a ledge
   * scramble, a stumble's knockback, a respawn run-up) the world arrives late, so a press made when the hero reaches the
   * thing is graded against the grid shifted by that lag (the better of the two), and targets expire that much later —
   * a scramble no longer turns the next 3-5 on-the-spot presses into phantom misses. Lag capped at `maxLagBeats`.
   */
  judgeLag: {
    enabled: true,
    maxLagBeats: 0.75,
    /** ignore lags below this (px): the surge's normal ripple */
    minLagPx: 6,
  },

  slide: {
    /** minimum slide duration once started */
    minTime: 0.18,
    /** friction when no direction is held */
    friction: 1400,
    /** speed below which the slide is just a duck */
    minSpeed: 250,
  },

  stomp: {
    bounceVY: -1050,
  },

  /** jabber truce flag: a soft bounce platform on the offbeat */
  jabberFlag: {
    bounceVY: -1250,
  },

  juice: {
    jumpStretch: [0.78, 1.28] as const,
    landSquashMax: [1.38, 0.62] as const,
    slideSquash: [1.35, 0.55] as const,
    strikeStretch: [0.9, 1.22] as const,
    /** squash spring */
    springK: 520,
    springDamp: 22,
    shakeOnHit: 0.32,
    shakeOnDeath: 0.7,
    shakeOnLandHard: 0.12,
    zoomPunchHit: 0.03,
    zoomPunchHeave: 0.07,
    runDustEvery: 1,
  },

  camera: {
    /** where the player sits horizontally when running right (0..1 of screen width).
     *  0.30 at zoom 0.95 = ~3.6 beats of runway (DESIGN §4) */
    leadFraction: 0.3,
    /** default zoom (level 'camera' items can change it on a beat) */
    zoom: 0.95,
    followX: 9,
    followY: 3.5,
    /** player screen-y fraction when grounded */
    /** 0.66 (was 0.72, review iter2 fix 7): the play band sits higher, less dead strip below the ground */
    groundFraction: 0.66,
    /** keep the player within these screen-y fractions */
    topMargin: 0.2,
    bottomMargin: 0.88,
    /** shake */
    maxShakeOffset: 34,
    maxShakeAngle: 0.035,
    traumaDecay: 1.6,
    /** subtle zoom pulse on every bar (presentation hook) */
    barZoomPulse: 0.008,
  },

  flow: {
    /** beats of music played before the player is released at spawn / respawn */
    countInBeats: 4,
    /** death animation before the respawn (DESIGN: <= 0.6 s, respawn < 1 s) */
    deathTime: 0.6,
    respawnFade: 0.2,
    finishEndScreenDelay: 2.4,
    /** world y below which the player dies (the pit surface is drawn at Tun.flow.pitY) */
    killY: 240,
    pitY: 150,
  },
};

export type Tunables = typeof Tun;
