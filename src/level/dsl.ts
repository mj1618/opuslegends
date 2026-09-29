/**
 * Authoring helpers for LevelDef items. Each helper encodes a timing convention so the level
 * can be written as "press X on beat N" (DESIGN: the object tells you WHAT, the scansion mark
 * tells you WHEN). Tolerances below were measured with the real controller at 164 BPM
 * (see the autoplay --jitter playtests):
 *
 *   spikeHop(38)    tap-hop ON 38 over a spike at 38.45           (stumble if missed) ~±110 ms
 *   gapHop(52)      tap-hop ON 52 over a pit; timing presets (GAP_FIT, measured by playtest/slack.mjs):
 *                     'std'   52.09..52.75  ~-110/+150 ms  (iteration 3 default)
 *                     'teach' 52.22..52.72  ~-125/+200 ms  (bars 1-16: a sloppy ±85 ms player never dies here, a ±130 one rarely)
 *                     'tight' 52.09..52.84  ~-85/+150 ms   (the chorus body: jump too EARLY and you land short)
 *                     'peak'  52.09..52.88  ~-75/+150 ms   (the lethal combination at a block's peak bar)
 *                   The LATE side stays generous everywhere (+150 ms: an uncalibrated-latency player still clears);
 *                   the teeth are on the early side, so a tight pit must not follow a hop within ~0.5 beat (the jump
 *                   buffer would save an early press and hide the teeth)
 *   gapJump(56)     held jump ON 56 over a long pit (lands ~58): 'std' 56.3..57.6 ~-165/+230 ms,
 *                     'teach' 56.3..57.7 ~-130/+230 ms, 'tightDrop' (off a raised floor) ~-85/+235 ms
 *   jabber(106)     strike ON 106 (the jabber's jab beat)         (stumble if missed) ~-220/+135 ms
 *   pendulum(23)    strike ON 23 (bottom of the swing)            (pure bonus)
 *   slamRun(72,2)   hop from the ledge ON 71, then ON every beat; platforms slam on 72, 73;
 *                   far ledge at 74. Holds up with ~±90 ms of press jitter  (death if missed)
 *   hupHupHey(124)  hop 124 (spike), hop 125 (spike), STRIKE 126 (jabber/float) = Heave
 *
 * Iteration 2 (reward-first economy, docs/level/act1_plan.md):
 *   bottle(9)       strike ON 9: a bottle/crate bursts into tokens      (reward, ~±210 ms)
 *   bottleHigh(35)  same, hung high: only reachable mid-jump / mid-launch
 *   launch(34, 2, 150)  bounce pad: reach it ON 34, land ON 36 on a 150 px roof (automatic)
 *   slideUnder(70.66, 1)  hold ↓ from 70.66 for 1 beat under a low sign  (stumble if standing)
 *   poolHop / poolJump    the safe gap: a shallow puddle (splash, no tokens) — teaches the pit
 *   slamRunPool(73, 2)    lifts over a pool (safe) — teaches the lift rhythm
 *   and(b)          the swung "and" after beat b (the record's swing ≈ 0.66)
 */
import type { BreakableLook, IntendedAction, LevelItem } from './types';

const TAP = 0.15;
/** the swung "and" (the recording measures 0.659; the placeholder 0.67) */
export const SWING_AND = 0.66;
/** beat of the swung "and" after beat b */
export const and = (b: number): number => b + SWING_AND;
/** pools are shallow puddles you can walk out of (Tun.jump.ledgeAssist) — a miss is a splash, not a wall */
const POOL_DEPTH = 24;
/** spikes sit under the centre of the tap-hop arc (~0.93 beat airtime): ~±110 ms of timing slack */
const SPIKE_AT = 0.45;

export function hop(beat: number): LevelItem {
  return { type: 'action', action: { type: 'jump', beat, hold: TAP } };
}

export function jump(beat: number): LevelItem {
  return { type: 'action', action: { type: 'jump', beat, hold: 1 } };
}

export function spikeHop(beat: number): LevelItem[] {
  return [{ type: 'spike', beat: beat + SPIKE_AT, action: { type: 'jump', beat, hold: TAP } }, lumArcHop(beat)];
}

/** an spike with no declared action (e.g. inside a phrase, declared by the phrase helper) */
export function spike(beat: number): LevelItem {
  return { type: 'spike', beat };
}

/**
 * Pit timing presets [from, to] in beats after the press beat (iteration 3; windows measured with the real
 * controller by `node playtest/slack.mjs`). The late side is set by where the pit starts (+ coyote time), the
 * early side by where it ends (an early hop lands short).
 */
export const GAP_FIT = {
  /** iteration 5: ends 0.05 sooner (was 0.77: −105 ms) — the tutorial bars 1-16 forgive a ±130 press too */
  teach: [0.22, 0.72],
  std: [0.09, 0.75],
  tight: [0.09, 0.86],
  peak: [0.09, 0.88],
} as const;
export const GAP_JUMP_FIT = {
  teach: [0.3, 1.7],
  std: [0.3, 1.6],
  /** off a raised surface onto the floor below (the bar top): the landing comes later, so the pit is longer */
  tightDrop: [0.3, 2.06],
} as const;
export type GapFit = keyof typeof GAP_FIT | readonly [number, number];

export function gapHop(beat: number, fit: GapFit = 'std'): LevelItem[] {
  const [f, t] = typeof fit === 'string' ? GAP_FIT[fit] : fit;
  return [{ type: 'gap', from: beat + f, to: beat + t, action: { type: 'jump', beat, hold: TAP } }, lumArcHop(beat)];
}

export function gapJump(beat: number, fit: keyof typeof GAP_JUMP_FIT | readonly [number, number] = 'std'): LevelItem[] {
  const [f, t] = typeof fit === 'string' ? GAP_JUMP_FIT[fit] : fit;
  return [{ type: 'gap', from: beat + f, to: beat + t, action: { type: 'jump', beat, hold: 1 } }, lumArcJump(beat)];
}

/** Safe version of a gap: a shallow rock pool (falling in costs time, not a life). */
export function poolHop(beat: number): LevelItem[] {
  return [{ type: 'floor', from: beat + 0.22, to: beat + 0.68, h: -POOL_DEPTH }, { type: 'action', action: { type: 'jump', beat, hold: TAP, fail: 'none' } }, lumArcHop(beat)];
}

export function poolJump(beat: number): LevelItem[] {
  return [{ type: 'floor', from: beat + 0.3, to: beat + 1.6, h: -POOL_DEPTH }, { type: 'action', action: { type: 'jump', beat, hold: 1, fail: 'none' } }, lumArcJump(beat)];
}

export function jabber(beat: number): LevelItem {
  return { type: 'jabber', beat, action: { type: 'strike', beat } };
}

export function pendulum(beat: number, big = false): LevelItem {
  return { type: 'pendulum', beat, big, action: { type: 'strike', beat } };
}

/**
 * Slam platforms: a pit from just after the ledge to just before the far ledge, one platform per beat
 * `first`..`first+n-1`, hop actions on `first-1` .. `first+n-1` (each hop lands on the next
 * beat's platform, the last one on the far ledge at `first+n`). Lums arc over every hop.
 */
export function slamRun(first: number, n: number, top?: readonly [number, number]): LevelItem[] {
  const out: LevelItem[] = [{ type: 'gap', from: first - 0.72, to: first + n - 0.3 }];
  for (let i = 0; i < n; i++) out.push(top ? { type: 'slam', beat: first + i, from: top[0], to: top[1] } : { type: 'slam', beat: first + i });
  for (let b = first - 1; b <= first + n - 1; b++) {
    out.push({ type: 'action', action: { type: 'jump', beat: b, hold: TAP, fail: 'death' } });
    out.push(lumArcHop(b));
  }
  return out;
}

/**
 * Hup-Hup-HEY: hop, hop, STRIKE on beats b, b+1, b+2. `hazards` picks what each hop clears
 * (a spike = stumble, a gap = lethal); the strike target is a jabber or a big pendulum.
 */
export function hupHupHey(beat: number, target: 'jabber' | 'pendulum' = 'jabber', hazards: ['spike' | 'gap', 'spike' | 'gap'] = ['spike', 'spike']): LevelItem[] {
  const strike: IntendedAction = { type: 'strike', beat: beat + 2 };
  const hop = (b: number, h: 'spike' | 'gap'): LevelItem =>
    h === 'spike'
      ? { type: 'spike', beat: b + SPIKE_AT, action: { type: 'jump', beat: b, hold: TAP } }
      : { type: 'gap', from: b + 0.22, to: b + 0.68, action: { type: 'jump', beat: b, hold: TAP } };
  return [
    hop(beat, hazards[0]),
    hop(beat + 1, hazards[1]),
    target === 'jabber' ? { type: 'jabber', beat: beat + 2, action: strike } : { type: 'pendulum', beat: beat + 2, big: true, action: strike },
    { type: 'phrase', beats: [beat, beat + 1, beat + 2] },
    lumArcHop(beat),
    lumArcHop(beat + 1),
  ];
}

/**
 * Air strike: a held jump over a gap ON `beat` and a high pendulum struck mid-air ON `beat + 1`
 * (it hangs too high to reach from the ground).
 */
export function jumpStrike(beat: number, fit: keyof typeof GAP_JUMP_FIT | readonly [number, number] = 'std', big = false): LevelItem[] {
  return [...gapJump(beat, fit), { type: 'pendulum', beat: beat + 1, high: true, big, action: { type: 'strike', beat: beat + 1 } }];
}

/**
 * Optional high route: a one-way awning `h` px up over [from, to] with a lum line on it. The low
 * route passes under it (hops never reach it); a HELD jump from before `from` lands on it.
 * No intended action (the autoplay bot stays low) — pure risk/reward.
 */
export function awning(from: number, to: number, h = 180): LevelItem[] {
  return [
    { type: 'platform', from, to, h, thickness: 24 },
    { type: 'lumRow', from: from + 0.5, to: to - 0.3, every: 0.5, h: 60 },
  ];
}

/** lums on the arc of a tap hop from `beat` (triplet spacing: 2 lums) */
export function lumArcHop(beat: number): LevelItem {
  return { type: 'lumJump', beat, hold: TAP, every: 1 / 3, skipFirst: true };
}

/** lums on the arc of a full jump from `beat` (5 lums) */
export function lumArcJump(beat: number): LevelItem {
  return { type: 'lumJump', beat, hold: 1, every: 1 / 3, skipFirst: true };
}

/** lums row on swung 8ths */
export function lumRowSwung(from: number, to: number, h = 60): LevelItem {
  return { type: 'lumRow', from, to, every: 0.5, h };
}

/** a free hop through a token arc (reward) */
export function tokenHop(beat: number): LevelItem[] {
  return [hop(beat), lumArcHop(beat)];
}

/** a free held jump through a big token arc (reward) — the held-note verb */
export function tokenJump(beat: number): LevelItem[] {
  return [jump(beat), lumArcJump(beat)];
}

/** breakable on the ground-level surface: strike ON `beat` (reward) */
export function bottle(beat: number, look?: BreakableLook, big = false): LevelItem {
  return { type: 'breakable', beat, look, big, action: { type: 'strike', beat } };
}

/** a big crate / jug (6 tokens) — for HEYs and stabs */
export function crate(beat: number, look: BreakableLook = 'crate'): LevelItem {
  return bottle(beat, look, true);
}

/** a GIANT keg (2x, 8 tokens, a real hitstop): the walkdown's money shot — strike ON `beat` */
export function giantKeg(beat: number, look: BreakableLook = 'crate'): LevelItem {
  return { type: 'breakable', beat, look, giant: true, action: { type: 'strike', beat } };
}

/** a breakable hung high: only reachable in the air (mid-jump, mid-launch); `h` overrides the height */
export function bottleHigh(beat: number, look?: BreakableLook, h?: number, big = false): LevelItem {
  return { type: 'breakable', beat, high: true, h, big, look, action: { type: 'strike', beat } };
}

/** held jump ON `beat` with a high bottle struck mid-air ON `beat + 1` (over safe ground) */
export function jumpBottle(beat: number): LevelItem[] {
  return [...tokenJump(beat), bottleHigh(beat + 1)];
}

/** bounce pad reached ON `beat`: automatic launch landing ON `beat + beats` on a surface `land` px high */
export function launch(beat: number, beats = 2, land?: number, tokens = true): LevelItem {
  return { type: 'bounce', beat, beats, land, tokens };
}

/** raised floor (rooftop, bar top, stage) `h` px above the street over [from, to] */
export function raised(from: number, to: number, h: number): LevelItem {
  return { type: 'floor', from, to, h };
}

/**
 * Knee-slide: hold ↓ from `beat` for `beats` (a held note) under a low sign that hangs from
 * beat + SIGN.lead to just before the release (stumble if you're standing).
 */
export function slideUnder(beat: number, beats: number): LevelItem[] {
  // iteration 3: the sign ends 0.25 beat before the release (was 0.12) and the hero auto-crouches while under
  // it (Player.lowCeilings), so letting go of ↓ a little early never stands him up into its tail
  const out: LevelItem[] = [{ type: 'lowSign', from: beat + 0.5, to: beat + beats - 0.25, action: { type: 'slide', beat, hold: beats } }];
  // a low token line under the sign (the slide's pay; also grabbed when you run it standing and get hit)
  for (let b = beat + 1 / 3; b < beat + beats - 0.1; b += 1 / 3) out.push({ type: 'lum', beat: b, h: 26 });
  return out;
}

/** Slam lifts over a shallow POOL (safe: a miss is a splash) — same rhythm as slamRun. */
export function slamRunPool(first: number, n: number): LevelItem[] {
  const out: LevelItem[] = [{ type: 'floor', from: first - 0.72, to: first + n - 0.3, h: -POOL_DEPTH }];
  for (let i = 0; i < n; i++) out.push({ type: 'slam', beat: first + i });
  for (let b = first - 1; b <= first + n - 1; b++) {
    out.push({ type: 'action', action: { type: 'jump', beat: b, hold: TAP, fail: 'none' } });
    out.push(lumArcHop(b));
  }
  return out;
}

/**
 * THE CHORUS SPEED-UP (iteration 9, user playtest: "the game speeds up just during the chorus"): the hero covers
 * CHORUS_SPEED × more ground per beat from the chorus downbeat `from` to `to` (level/beatx.ts), ramping in over the
 * beat before the downbeat and out over the beat after `to`. The music can't change (the original recording): the
 * GAME speeds up. Jumps keep their airtime in beats, so they fly CHORUS_SPEED × further.
 */
export const CHORUS_SPEED = 1.25;
export function chorusSpeed(from: number, to: number, mul = CHORUS_SPEED): LevelItem {
  return { type: 'speed', from, to, mul, rampIn: 1, rampOut: 1 };
}

/** tokens tracing a vocal line: [beat, midi pitch] pairs, height follows the pitch */
export function melodyTokens(notes: [number, number][], base = 62, perSemitone = 7, ref = 55): LevelItem[] {
  return notes.map(([beat, pitch]) => ({ type: 'lum', beat, h: base + (pitch - ref) * perSemitone }) as LevelItem);
}
