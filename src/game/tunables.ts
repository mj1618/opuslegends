/**
 * ALL game-feel constants live here. Units: pixels (logical 1920x1080 space), seconds.
 * World y grows DOWNWARD (canvas convention); ground top is y = 0 and heights above it are negative y.
 *
 * Tempo coupling: the level is authored in beats (x = beat * pixelsPerBeat) and the player's
 * max run speed is DERIVED from the song (runSpeed = pixelsPerBeat * BPM / 60) so that holding
 * right keeps the hero exactly on the music. The jump constants were tuned so that at 150 BPM
 * a full jump (held) lasts ~2 beats and a tap-hop ~1 beat — check the debug overlay's
 * "jump airtime" readout after changing them.
 */
export const Tun = {
  sim: {
    /** fixed simulation rate */
    hz: 120,
    /** max sim steps per rendered frame before we drop time (spiral-of-death guard) */
    maxStepsPerFrame: 30,
  },

  player: {
    width: 56,
    height: 104,
    slideHeight: 50,
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

  jump: {
    /** apex height of a fully held jump without apex hang (px) */
    height: 250,
    /** seconds to reach apex of a full jump */
    timeToApex: 0.455,
    /** vy multiplier when jump is released while rising (variable jump height) */
    cutMultiplier: 0.42,
    /** grace period after running off a ledge during which a jump still works */
    coyoteTime: 0.1,
    /** a jump pressed this long before landing still fires on landing */
    bufferTime: 0.13,
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
    /** step up small ledges when running into them (px) */
    ledgeAssist: 18,
  },

  wall: {
    enabled: true,
    slideMaxSpeed: 300,
    jumpVX: 820,
    /** vertical speed as fraction of normal jump velocity */
    jumpVYMul: 0.92,
    /** time after a wall jump during which air control is reduced */
    lockTime: 0.14,
  },

  punch: {
    /** seconds from press to active hitbox */
    startup: 0.016,
    /** duration of the active hitbox */
    active: 0.17,
    /** total duration of the punch animation */
    duration: 0.26,
    cooldown: 0.05,
    bufferTime: 0.1,
    /** hitbox reach beyond the body's front edge (px) */
    reach: 118,
    hitboxHeight: 96,
    /** hitstop on contact (s) */
    hitstop: 0.065,
    /** after hitstop, the sim runs this much faster until the lost time is repaid (keeps the hero on the beat) */
    catchUpRate: 0.35,
    /** small upward pop when punching in the air */
    airPop: 140,
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

  juice: {
    jumpStretch: [0.78, 1.28] as const,
    landSquashMax: [1.38, 0.62] as const,
    slideSquash: [1.35, 0.55] as const,
    punchStretch: [1.18, 0.9] as const,
    /** squash spring */
    springK: 520,
    springDamp: 22,
    shakeOnHit: 0.32,
    shakeOnDeath: 0.7,
    shakeOnLandHard: 0.12,
    zoomPunchHit: 0.035,
    runDustEvery: 1,
  },

  camera: {
    /** where the player sits horizontally when running right (0..1 of screen width) */
    leadFraction: 0.32,
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
    deathTime: 0.9,
    respawnFade: 0.25,
    finishEndScreenDelay: 2.4,
    /** world y below which the player dies */
    killY: 700,
  },
};

export type Tunables = typeof Tun;
