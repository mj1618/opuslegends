/**
 * THE GOONS PLAY THE SONG (iteration 6, review iter5 fix 6): which instrument part a goon plays and exactly when that
 * part hits — so the art animates a goon ON the sounds you hear, and the audio flares a smashed goon's part.
 *
 *   partHits(song, 'cowbell', from, to)   the part's hits in [from, to): { beat, vel } (tempo-mapped song beats)
 *   nextPartHit(song, part, beat)         the first hit at/after `beat` (hit anticipation: wind up 1/4 beat before it)
 *   partPulse(song, part, beat)           per frame: { pulse 1 -> 0 after each hit, since, next, vel } (read game.groove.beat)
 *   goonPartAt(song, beat)                the part a goon standing at `beat` plays (what is loudest around it)
 *   partAudible(part, crowd)              is that part in the mix at this crowd (the overlays follow the crowd)
 *   PART_STEM[part]                       the overlay stem a part lives in (null: the record's own part)
 *
 * Parts (lanes of the beat map; the overlays are OUR reward stems, the piano is the record's own):
 *   stomps   the stomp goon / drummer: the stomps overlay's hits (kick-drum stomps with the record's kick)
 *   claps    the clapper: the claps (same stem as the stomps: backbeats)
 *   cowbell  the cowbell goon: the cowbell overlay (the hot streak: silent under crowd 12, choruses/turnarounds)
 *   piano    the bar pianist: the record's piano hits (demucs onsets; from edit bar 32, e.g. the turnaround stabs 124-127)
 *   shouts   the HEY goons: the gang HEY!/HUP! overlay
 * StageAudio flares a part when its goon is smashed (stage.goonHit): the overlay stem jumps +6 dB for a beat (at least
 * -10 dB absolute, so a low crowd still hears it) and the goon's stinger lands on the part's next hit.
 */
import type { LaneEventBase } from './lanes';
import { OVERLAY_RULES, overlayGain } from './mix';
import type { SongDef } from './song';

export type GoonPart = 'stomps' | 'claps' | 'cowbell' | 'piano' | 'shouts';
export const GOON_PARTS: readonly GoonPart[] = ['stomps', 'claps', 'cowbell', 'piano', 'shouts'];

/** the overlay stem each part lives in (null = the record's own part: always audible) */
export const PART_STEM: Record<GoonPart, string | null> = { stomps: 'stomps', claps: 'stomps', cowbell: 'cowbell', piano: null, shouts: 'shouts' };

export interface PartHit {
  beat: number;
  vel: number;
}

/** the part's hits in [from, to) */
export function partHits(song: SongDef, part: GoonPart, from: number, to: number): PartHit[] {
  return song.lane(part).between(from, to).map((e: LaneEventBase) => ({ beat: e.beat, vel: typeof e.vel === 'number' ? e.vel : 1 }));
}

/** the first hit of `part` at or after `beat` (within `maxAhead` beats) */
export function nextPartHit(song: SongDef, part: GoonPart, beat: number, maxAhead = 4): PartHit | undefined {
  const h = partHits(song, part, beat - 1e-6, beat + maxAhead);
  return h[0];
}

/**
 * Animation helper: where `beat` sits between the part's hits. `pulse` = 1 ON a hit, decaying linearly to 0 over
 * `decayBeats` (a strike / stomp pose); `since` / `next` = beats since the last hit / until the next (a wind-up can
 * start `next` < 0.25 before it). Cheap enough per goon per frame (binary search).
 */
export function partPulse(song: SongDef, part: GoonPart, beat: number, decayBeats = 0.3): { pulse: number; since: number; next: number; vel: number } {
  const lane = song.lane(part);
  const prev = lane.prev(beat + 1e-6);
  const nxt = lane.next(beat);
  const since = prev ? beat - prev.beat : Infinity;
  const vel = prev && typeof prev.vel === 'number' ? prev.vel : 1;
  return { pulse: since < decayBeats ? (1 - since / decayBeats) * vel : 0, since, next: nxt ? nxt.beat - beat : Infinity, vel };
}

/** is `part` in the mix at this crowd (overlay gain above -24 dB; the record's own parts always are) */
export function partAudible(part: GoonPart, crowd: number): boolean {
  const stem = PART_STEM[part];
  if (!stem || !OVERLAY_RULES[stem]) return true;
  return (overlayGain(stem, crowd) ?? 1) > 0.063;
}

/**
 * The part a goon standing at `beat` plays: the busiest of the parts that sound in the 2 bars around it (weights: the
 * piano and cowbell are the rarer, more visible parts, so they win where they play at all; stomps otherwise). A goon ON
 * a gang shout (within 1/4 beat) is a HEY goon. Deterministic: the art and the audio call the same function.
 */
export function goonPartAt(song: SongDef, beat: number): GoonPart {
  if (song.lane('shouts').at(beat, 0.25)) return 'shouts';
  const a = beat - 4;
  const b = beat + 4;
  const score = (p: GoonPart, w: number) => partHits(song, p, a, b).length * w;
  const cands: [GoonPart, number][] = [
    ['piano', score('piano', 3)],
    ['cowbell', score('cowbell', 1.5)],
    ['stomps', score('stomps', 1)],
    ['claps', score('claps', 0.9)],
  ];
  cands.sort((x, y) => y[1] - x[1]);
  return cands[0][1] > 0 ? cands[0][0] : 'stomps';
}
