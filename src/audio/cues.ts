/**
 * LEVEL AUDIO CUES — how level data asks the audio for musical-time moments (iteration 4, act 3).
 *
 *   hush(from, to)          the booth squeeze: the record (+ the stomps/claps stem) is forced into the horn band
 *                           (BOOTH.hush: 320 Hz-3.4 kHz, -12 dB, mono) from beat `from`, and slams back to full range
 *                           on `to` (a 10 ms crossfade centred on it). The overlays (cowbell, shouts) and the SFX stay
 *                           dry, so they are the only full-range sounds. A strike target inside the window is THE
 *                           BREAK: smashing it plays `breakKrak`, missing it `rackCollapse`.
 *   at(beat, sound)         a world sound ON the music (letters toppling, Big Jim's roar, the finale): always plays.
 *   onSmash(beat, sound)    plays when the breakable at `beat` bursts (on the beat if the hit was early).
 *   onMiss(beat, sound)     plays when the strike target at `beat` passes unhit.
 *
 * `sound` names a stack in audio/mix.ts STAGE_SFX. Every beat is tempo-mapped. StageAudio schedules `at`/`hush`
 * cues ~2.5 beats ahead on the audio clock, and re-arms them after every rewind / respawn (a checkpoint retry
 * replays the hush and the drop), cancelling anything pending on a death.
 *
 * Level data: `levelAudioCues(def, song)` collects a level's cues:
 *   - `def.audio` (optional AudioCue[] on the LevelDef, duck-typed) — explicit cues, e.g. `audio: [hush(270.95, 271.95)]`;
 *   - derived from ordinary items (no audio authoring needed):
 *       setPiece 'hush' → THE HUSH over its `beats` · 'drop' → the drop's cheer · 'windowCrash' → the window crash ·
 *       'bigJimReveal' → the bluff roar · 'marqueeSwap' → the usher's clanks · `topple` items (by `index`) → the six
 *       BIG JIM letters (creak on the item beat, slam 1 beat later, on the descending E line) · `slam` items inside
 *       304-332 → Big Jim's fists (escalating) · breakables: look 'pin' → pins (giant = a STRIKE), 'lens' → lens
 *       cracks escalating to 4 over however many lenses, 'skylight' → the skylight, 'glass' giant or the 'window' at
 *       bar 76 → the penthouse glass wall (hit or missed) · the `finish` item within 1.5 beats of the song's
 *       `final_hit` cue → the finale stack ON the final hit;
 *   - the EDIT's break-shot hush (if `def.audio` has no hush): when the level has a strike action on the last tom of
 *     the fill before the song's `chorus4` cue (271.65), the hush runs from 0.7 beat before it to 0.05 before the
 *     drop, and the drop gets its cheer.
 */
import type { StageSound } from './mix';
import type { SongDef } from './song';

export type AudioCue =
  | { type: 'hush'; from: number; to: number; db?: number }
  | { type: 'at'; beat: number; sound: StageSound }
  | { type: 'onSmash'; beat: number; sound: StageSound }
  | { type: 'onMiss'; beat: number; sound: StageSound };

export const hush = (from: number, to: number, db?: number): AudioCue => ({ type: 'hush', from, to, db });
export const at = (beat: number, sound: StageSound): AudioCue => ({ type: 'at', beat, sound });
export const onSmash = (beat: number, sound: StageSound): AudioCue => ({ type: 'onSmash', beat, sound });
export const onMiss = (beat: number, sound: StageSound): AudioCue => ({ type: 'onMiss', beat, sound });

/** the six letters in order (B-I-G-J-I-M): creak on `beat`, slam on `beat + 1` */
export const letterTopple = (beat: number, index: number): AudioCue => at(beat, `letter${(index % 6) + 1}` as StageSound);

/** the minimal shape levelAudioCues reads (a LevelDef; unknown item types are fine) */
export interface LevelLike {
  endBeat?: number;
  audio?: AudioCue[];
  items: readonly unknown[];
}
type AnyItem = {
  type?: string;
  beat?: number;
  name?: string;
  look?: string;
  beats?: number;
  index?: number;
  giant?: boolean;
  high?: boolean;
  action?: { type?: string; beat?: number };
};

const near = (a: number, b: number, tol = 0.06): boolean => Math.abs(a - b) <= tol;

export function levelAudioCues(def: LevelLike, song?: SongDef): AudioCue[] {
  const items = def.items as AnyItem[];
  const out: AudioCue[] = [...(def.audio ?? [])];
  const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
  // ---- set-pieces
  for (const it of items) {
    if (it.type !== 'setPiece' || !num(it.beat)) continue;
    if (it.name === 'windowCrash') out.push(at(it.beat, 'windowCrash'));
    else if (it.name === 'bigJimReveal') out.push(at(it.beat, 'bigJimBluff'));
    else if (it.name === 'marqueeSwap') out.push(at(it.beat, 'marquee'));
    else if (it.name === 'drop') out.push(at(it.beat, 'dropCheer'));
    else if (it.name === 'hush') out.push(hush(it.beat, it.beat + (num(it.beats) ? it.beats : 1)));
  }
  // ---- the BIG JIM letters (the item's `index` if it has one, else the order)
  const topples = items.filter((it) => it.type === 'topple' && num(it.beat)).sort((a, b) => a.beat! - b.beat!);
  topples.forEach((it, i) => out.push(letterTopple(it.beat!, num(it.index) ? it.index : i)));
  // ---- Big Jim's fists (the gauntlet's slam lifts)
  const fists = items.filter((it) => it.type === 'slam' && num(it.beat) && it.beat! >= 304 && it.beat! < 332).sort((a, b) => a.beat! - b.beat!);
  fists.forEach((it, i) => out.push(at(it.beat!, `bigJimFist${Math.min(3, i + 1)}` as StageSound)));
  // ---- breakables
  const lenses = items.filter((it) => it.type === 'breakable' && it.look === 'lens' && num(it.beat)).sort((a, b) => a.beat! - b.beat!);
  lenses.forEach((it, i) => out.push(onSmash(it.beat!, `lensCrack${Math.max(1, Math.min(4, Math.round(((i + 1) * 4) / lenses.length)))}` as StageSound)));
  for (const it of items) {
    if (it.type !== 'breakable' || !num(it.beat)) continue;
    if (it.look === 'pin') out.push(onSmash(it.beat, it.giant ? 'pinStrike' : 'pinScatter'));
    else if ((it.look === 'glass' && it.giant) || (it.look === 'window' && it.beat >= 296 && it.beat < 304)) {
      // the penthouse glass wall: you crash in whether you hit it or not
      out.push(onSmash(it.beat, 'glassWall'), onMiss(it.beat, 'glassWall'));
    } else if (it.look === 'skylight' || (it.look === 'glass' && it.high && it.beat >= 240)) out.push(onSmash(it.beat, 'skylight'));
  }
  if (!song?.map) return dedupe(out);
  const cue = (name: string): number | undefined => song.map!.lanes.cue?.find((c) => c.name === name)?.beat;
  // ---- the finale (the finish on the edit's final hit)
  const fin = cue('final_hit');
  const finish = items.find((it) => it.type === 'finish' && num(it.beat));
  if (fin !== undefined && finish && near(finish.beat!, fin, 1.5)) out.push(at(fin, 'finale'));
  // ---- the break-shot hush before chorus 4's drop
  const drop = cue('chorus4');
  if (drop !== undefined && !out.some((c) => c.type === 'hush')) {
    const tom = (song.map.lanes.tom ?? []).filter((e) => e.beat < drop && e.beat > drop - 1).pop()?.beat;
    const strikes = items.filter((it) => (it.type === 'breakable' || it.action?.type === 'strike') && num(it.action?.beat ?? it.beat));
    const target = tom !== undefined ? strikes.find((it) => near(it.action?.beat ?? it.beat!, tom)) : undefined;
    if (tom !== undefined && target) {
      out.push(hush(tom - 0.7, drop - 0.05), at(drop, 'dropCheer'));
    }
  }
  // the break target: any strike target inside a hush window
  for (const h of out.filter((c): c is Extract<AudioCue, { type: 'hush' }> => c.type === 'hush')) {
    for (const it of items) {
      const b = it.action?.type === 'strike' ? it.action.beat : it.type === 'breakable' ? it.beat : undefined;
      if (!num(b) || b < h.from || b > h.to) continue;
      out.push(onSmash(b, 'breakKrak'), onMiss(b, 'rackCollapse'));
    }
  }
  return dedupe(out);
}

/** arrival beats of the level's thrown FIREBOMBS (their telegraph is the whoosh, not the bottle whistle) */
export function levelFirebombs(def: LevelLike): number[] {
  return (def.items as (AnyItem & { style?: string })[]).filter((it) => it.type === 'thrown' && it.style === 'firebomb' && typeof it.beat === 'number').map((it) => it.beat!);
}

function dedupe(cues: AudioCue[]): AudioCue[] {
  const seen = new Set<string>();
  const out: AudioCue[] = [];
  for (const c of cues) {
    const k = JSON.stringify(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out.sort((a, b) => ('beat' in a ? a.beat : a.from) - ('beat' in b ? b.beat : b.from));
}
