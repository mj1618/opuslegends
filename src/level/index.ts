/**
 * THE LEVEL the game plays: act 1 (level/slice.ts, bars 1-33) + act 2 (level/act2.ts, bars 34-60) + act 3
 * (level/act3.ts, bars 61-86) on one continuous world x (x = beat × ppb). The SEAMS (the only place acts are joined):
 *   - act 1's `finish` item is dropped (its final flash/shake on 132 stays: it is the moment Slim bursts out of the
 *     honky-tonk's front door onto the street at the foot of the Jimperial; act 1's last launch lands ON 133 outside),
 *   - act 2's `finish` item is dropped (its flash/shake on 240 stays: the breakdown downbeat = the Pool Room's reveal);
 *     act 3 starts on act 2's last floor height (`endHeight`), so act 2 can change its climb without breaking the seam,
 *   - the level ends at act 3's finish (340.5: half a beat after the final hit on 340, so the strike ON it connects).
 * Each act stays a standalone LevelDef for focused tools (`npm run rubric -- --level=src/level/act3.ts#act3Level`).
 */
import { act2Items } from './act2';
import { act3Items, act3Level } from './act3';
import { sliceLevel } from './slice';
import type { LevelDef, LevelItem } from './types';

/** floor height (px above the street) the items leave at `beat` (later floor items win, like the builder) */
function endHeight(items: LevelItem[], beat: number): number {
  let h = 0;
  for (const it of items) if (it.type === 'floor' && beat > it.from && beat < it.to) h = it.h;
  return h;
}

/** act 3 overrides act 2's run-out floors (act 2's terrain runs on past 240) */
const act2 = act2Items.filter((it) => it.type !== 'finish');

export const gameLevel: LevelDef = {
  id: 'acts-1-3-bars-1-86',
  name: 'Acts 1-3 — cold open to the final hit (original recording)',
  songId: sliceLevel.songId,
  pixelsPerBeat: sliceLevel.pixelsPerBeat,
  startBeat: sliceLevel.startBeat,
  endBeat: act3Level.endBeat,
  coldOpen: sliceLevel.coldOpen,
  // the act seams: act 1 = bars 1-33, act 2 = 34-60, act 3 = 61-86 (the rubric judges the joined level in the same
  // phrase-aligned blocks as its acts)
  acts: [1, 34, 61],
  items: [...sliceLevel.items.filter((it) => it.type !== 'finish'), ...act2, ...act3Items(endHeight(act2Items, act3Level.startBeat - 0.05))],
};
