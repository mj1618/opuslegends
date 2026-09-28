/**
 * LEVEL DATA SCHEMA — authored in MUSICAL TIME.
 *
 * Horizontal positions are beats: x = beat * pixelsPerBeat, and the hero's run speed equals
 * pixelsPerBeat * BPM / 60, so "at beat 32.5 there's a gap" literally means the hero reaches it
 * when the song reaches beat 32.5. Heights (`h`) are pixels ABOVE the base ground line
 * (positive = up) for geometry (floor/platform/block); for entities (lums, enemies) `h` is
 * relative to the topmost surface under them (platform, raised floor, or the nearest floor
 * to the left when over a pit). Everything is plain JSON-able data; see dsl.ts for authoring helpers.
 *
 * Obstacles may declare their INTENDED ACTION (what the player should do and on which beat).
 * These drive: the debug overlay's action markers, the ?autoplay=1 bot, the playtest's timing
 * report, and the player's groove/accuracy stats.
 */

export type ActionType = 'jump' | 'punch' | 'slide';

export interface IntendedAction {
  type: ActionType;
  /** beat at which the button should be pressed */
  beat: number;
  /** how long to hold the button, in beats (jump: 1 = full jump, 0.15 = short hop; slide: duration) */
  hold?: number;
}

/** Visual beat reaction for any decoration/entity (see render/groove.ts). */
export interface BeatReactSpec {
  /** grid in beats: 1 = every beat, 4 = every bar, 0.5 = eighths */
  every: number;
  kind: 'scale' | 'bob' | 'flash' | 'squash';
  amount: number;
  /** decay of the pulse in beats */
  decay?: number;
  /** offset in beats (e.g. 1 = backbeat) */
  phase?: number;
}

export type EnemyKind = 'grunt' | 'flyer';
export type FxKind = 'flash' | 'shake' | 'zoom' | 'bgPulse';

export type LevelItem =
  /** override the ground height over a beat range (later items win) */
  | { type: 'floor'; from: number; to: number; h: number }
  /** hole in the ground */
  | { type: 'gap'; from: number; to: number; action?: IntendedAction }
  /** floating platform; one-way (jump-through) by default */
  | { type: 'platform'; from: number; to: number; h: number; oneWay?: boolean; thickness?: number; action?: IntendedAction }
  /** solid block from `bottom` (default 0) up to `h` */
  | { type: 'block'; from: number; to: number; h: number; bottom?: number; action?: IntendedAction }
  /** enemy placed so that punching exactly on `beat` connects. `h` = height above the floor (flyers) */
  | { type: 'enemy'; beat: number; kind?: EnemyKind; h?: number; action?: IntendedAction | null; react?: BeatReactSpec }
  /** deadly spikes on the floor */
  | { type: 'spikes'; from: number; to: number; action?: IntendedAction }
  /** deadly low beam/crusher: slide under it. `h` = clearance above the floor (default 66) */
  | { type: 'beam'; from: number; to: number; h?: number; action?: IntendedAction }
  /** collectible "lum" at beat, `h` px above the floor. `note` = explicit chord-tone index */
  | { type: 'lum'; beat: number; h?: number; note?: number }
  /** lums following the REAL trajectory of a jump pressed at `beat` (held `hold` beats), every `every` beats */
  | { type: 'lumJump'; beat: number; hold?: number; every?: number; skipFirst?: boolean }
  /** row of lums */
  | { type: 'lumRow'; from: number; to: number; every?: number; h?: number }
  | { type: 'checkpoint'; beat: number }
  | { type: 'finish'; beat: number }
  /** presentation cue fired when the song reaches `beat` */
  | { type: 'fx'; beat: number; fx: FxKind; amount?: number }
  /** free-standing intended action (e.g. jump up a ledge) */
  | { type: 'action'; action: IntendedAction }
  /** debug label drawn in the world (section names etc.) */
  | { type: 'label'; beat: number; text: string };

export interface LevelDef {
  id: string;
  name: string;
  /** SongDef id this level is authored against */
  songId: string;
  /** horizontal pixels per beat — defines run speed together with the song BPM */
  pixelsPerBeat: number;
  /** the player is released here (after `countInBeats` of music) */
  startBeat: number;
  /** last beat of authored content (ground continues a bit beyond) */
  endBeat: number;
  items: LevelItem[];
}
