/**
 * THE LEVEL the game plays: act 1 (level/slice.ts, bars 1-33) + act 2 (level/act2.ts, bars 34-60) on one continuous
 * world x (x = beat × ppb). The SEAM (the only place acts are joined):
 *   - act 1's `finish` item is dropped (its final flash/shake on 132 stays: it is the moment Slim bursts out of the
 *     honky-tonk's front door onto the street at the foot of the Jimperial; act 1's last launch lands ON 133 outside),
 *   - the level ends at act 2's finish (bar 61 = the breakdown downbeat, where act 3 will continue).
 * Each act stays a standalone LevelDef for focused tools (`npm run rubric -- --level=src/level/act2.ts#act2Level`).
 */
import { act2Items, act2Level } from './act2';
import { sliceLevel } from './slice';
import type { LevelDef } from './types';

export const gameLevel: LevelDef = {
  id: 'acts-1-2-bars-1-60',
  name: 'Acts 1-2 — cold open to the chorus-3 tag (original recording)',
  songId: sliceLevel.songId,
  pixelsPerBeat: sliceLevel.pixelsPerBeat,
  startBeat: sliceLevel.startBeat,
  endBeat: act2Level.endBeat,
  coldOpen: sliceLevel.coldOpen,
  items: [...sliceLevel.items.filter((it) => it.type !== 'finish'), ...act2Items],
};
