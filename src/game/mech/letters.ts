/**
 * TOPPLING LETTERS — act 3's Sign Falls (docs/level/act3_plan.md "New mechanics" 1; level `topple` items).
 *
 * The Jimperial's roof sign spells B-I-G J-I-M: six letters, each `tall` px of rose neon on steel legs. Letter i stands
 * upright at `from` (its pivot, the foot on the hero's side) and pivots FORWARD (away from the hero) ON its downbeat,
 * falls under gravity for one beat and SLAMS down flat ON the backbeat as a bridge over [from, to]: the next stretch
 * of roof you run on. Collision is ordinary level geometry (the bridge's `floor` item), so this module is pure
 * presentation state — a function of the WORLD beat, rewind- and hitstop-safe:
 *
 *   angle  0 = upright … 1 = flat (π/2 about the pivot); an accelerating fall (gravity), a small bounce after the slam
 *   state  'standing' → 'falling' (beat … beat+1) → 'landed' (the bridge) — `slam` 1 → 0 over half a beat after landing
 *
 * `by` says what knocks it over: 'frame' (the rack's flying frame on the drop), 'shot' (the hero's strike ON its beat:
 * the role reversal on 288 — it falls anyway if the shot is missed, just a beat of wobble later), else it simply goes.
 * Letters always land ≥ 1 beat before the hero's grid position reaches `from` (the level guarantees it), so the
 * bridge is always down when a player — however late — arrives.
 */
import type { RuntimeLevel } from '../../level/build';

export type LetterState = 'standing' | 'falling' | 'landed';

export interface ToppleLetter {
  index: number;
  letter: string;
  /** pivot beat (a downbeat): it lands ON beat + FALL_BEATS */
  beat: number;
  by: 'frame' | 'shot' | 'self';
  /** bridge span in world px (from = the pivot) and its top (world y) */
  x0: number;
  x1: number;
  y: number;
  /** the letter's height when upright (= the bridge length) */
  tall: number;
  // ---- runtime (pure functions of the world beat)
  state: LetterState;
  /** 0 upright … 1 flat */
  angle: number;
  /** 1 on the slam → 0 (presentation: dust, tube pops, shake) */
  slam: number;
  /** 0..1 wobble before a 'shot' letter goes (it shivers while the hero lines up) */
  wobble: number;
  /** beats since it landed (NaN while standing / falling) — use this, not a separately computed beat */
  landedBeats: number;
}

/** beats a letter takes to fall */
export const FALL_BEATS = 1;

export function makeLetters(L: RuntimeLevel): ToppleLetter[] {
  const out: ToppleLetter[] = [];
  for (const it of L.def.items) {
    if (it.type !== 'topple') continue;
    const x0 = L.xAt(it.from);
    const x1 = L.xAt(it.to);
    out.push({ index: it.index, letter: it.letter, beat: it.beat, by: it.by ?? 'self', x0, x1, y: -it.h, tall: x1 - x0, state: 'standing', angle: 0, slam: 0, wobble: 0, landedBeats: NaN });
  }
  return out.sort((a, b) => a.beat - b.beat);
}

/** letter pose at world beat `wb` (in place) */
export function stepLetter(l: ToppleLetter, wb: number): void {
  const d = wb - l.beat;
  l.wobble = l.by === 'shot' && d > -1.5 && d < 0 ? 1 + d / 1.5 : 0;
  l.landedBeats = d >= FALL_BEATS ? d - FALL_BEATS : NaN;
  if (d < 0) {
    l.state = 'standing';
    l.angle = 0;
    l.slam = 0;
    return;
  }
  if (d < FALL_BEATS) {
    l.state = 'falling';
    // a rigid body pivoting on its foot: slow to start, fast at the end (≈ an ease-in on the angle)
    const k = d / FALL_BEATS;
    l.angle = k * k * (0.35 + 0.65 * k);
    l.slam = 0;
    return;
  }
  l.state = 'landed';
  const a = d - FALL_BEATS;
  // one small bounce after the slam (the bridge settles), then flat
  l.angle = a < 0.3 ? 1 - 0.06 * Math.sin((a / 0.3) * Math.PI) : 1;
  l.slam = Math.max(0, 1 - a * 2);
}
