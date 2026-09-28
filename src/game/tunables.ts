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

  /** Timing grades (ms, symmetric) — early side gets +earlyBonusMs. Score/feedback/crowd only, never physics. */
  judge: {
    perfectMs: 45,
    greatMs: 90,
    goodMs: 135,
    earlyBonusMs: 12,
    /** early presses within this window sound on the target beat (SFX quantisation) */
    quantizeEarlyMs: 150,
  },

  /** The crowd (streak meter + music reward; DESIGN's "crab choir") */
  crowd: {
    start: 3,
    min: 3,
    max: 24,
    perGood: 1,
    perPhrase: 3,
    stumbleLoss: 0.25,
    /** members lost per missed target (judge expiry) — the meter moves for real players */
    perMiss: 1,
    /** shouts stem: -6 dB at 0 members -> 0 dB at `fullAt` */
    fullAt: 12,
    /** BIG CATCH mode (bonus stem) at >= this */
    bigCatchAt: 20,
  },

  /** The Chaser (chaser): DESIGN §4 */
  chaser: {
    /** beats behind the music grid */
    behindBeats: 2,
    /** when behind its target it advances at this multiple of run speed (hero surge is 1.15) */
    catchUpMul: 1.1,
    /** rise animation (beats) */
    riseBeats: 4,
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
    groundFraction: 0.72,
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
