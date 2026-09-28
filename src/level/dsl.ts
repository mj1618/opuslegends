/**
 * Authoring helpers for LevelDef items. Each helper encodes a timing convention so the level
 * can be written as "press X on beat N" (DESIGN: the object tells you WHAT, the scansion mark
 * tells you WHEN). Tolerances below were measured with the real controller at 164 BPM
 * (see the autoplay --jitter playtests):
 *
 *   spikeHop(38)    tap-hop ON 38 over a spike at 38.45           (stumble if missed) ~±110 ms
 *   gapHop(52)      tap-hop ON 52 over a gap 52.22..52.68         (death if missed)   ~-120/+200 ms
 *   gapJump(56)     held jump ON 56 over a gap 56.3..57.6 (lands ~58)                  ~-160/+230 ms
 *   jabber(106)     strike ON 106 (the jabber's jab beat)         (stumble if missed) ~-220/+135 ms
 *   pendulum(23)    strike ON 23 (bottom of the swing)            (pure bonus)
 *   slamRun(72,2)   hop from the ledge ON 71, then ON every beat; platforms slam on 72, 73;
 *                   far ledge at 74. Holds up with ~±90 ms of press jitter  (death if missed)
 *   hupHupHey(124)  hop 124 (spike), hop 125 (spike), STRIKE 126 (jabber/float) = Heave
 */
import type { IntendedAction, LevelItem } from './types';

const TAP = 0.15;
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

export function gapHop(beat: number): LevelItem[] {
  return [{ type: 'gap', from: beat + 0.22, to: beat + 0.68, action: { type: 'jump', beat, hold: TAP } }, lumArcHop(beat)];
}

export function gapJump(beat: number): LevelItem[] {
  return [{ type: 'gap', from: beat + 0.3, to: beat + 1.6, action: { type: 'jump', beat, hold: 1 } }, lumArcJump(beat)];
}

/** Safe version of a gap: a shallow rock pool (falling in costs time, not a life). */
export function poolHop(beat: number): LevelItem[] {
  return [{ type: 'floor', from: beat + 0.22, to: beat + 0.68, h: -70 }, { type: 'action', action: { type: 'jump', beat, hold: TAP, fail: 'none' } }, lumArcHop(beat)];
}

export function poolJump(beat: number): LevelItem[] {
  return [{ type: 'floor', from: beat + 0.3, to: beat + 1.6, h: -70 }, { type: 'action', action: { type: 'jump', beat, hold: 1, fail: 'none' } }, lumArcJump(beat)];
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
export function slamRun(first: number, n: number): LevelItem[] {
  const out: LevelItem[] = [{ type: 'gap', from: first - 0.72, to: first + n - 0.3 }];
  for (let i = 0; i < n; i++) out.push({ type: 'slam', beat: first + i });
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
export function jumpStrike(beat: number): LevelItem[] {
  return [...gapJump(beat), { type: 'pendulum', beat: beat + 1, high: true, action: { type: 'strike', beat: beat + 1 } }];
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
