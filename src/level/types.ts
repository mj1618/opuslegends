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
 * Obstacles declare their INTENDED ACTION (what the player should do and on which beat).
 * These drive: the debug overlay's action markers, the ?autoplay=1 bot, the playtest's timing
 * report, the timing JUDGE (Perfect/Great/Good targets), the scansion marks drawn on the world,
 * and the expected outcome of a deliberate miss (`fail`).
 *
 * Swing: musical "and"s are NOT at x.5 — the song is a shuffle. Items that sit on 8ths
 * (lumRow every 0.5, wave-slam lifts, jabber flag billows) are placed at the song's swung offbeat
 * (SongDef.swing, e.g. 0.67) by the builder / runtime, so only the song data knows the ratio.
 */

export type ActionType = 'jump' | 'strike' | 'slide';

/** what happens if the player skips this action (used by --miss tests) */
export type FailKind = 'death' | 'stumble' | 'none';

export interface IntendedAction {
  type: ActionType;
  /** beat at which the button should be pressed */
  beat: number;
  /** how long to hold the button, in beats (jump: 1 = full jump, 0.15 = tap hop; slide: duration) */
  hold?: number;
  /** override the automatic fail kind */
  fail?: FailKind;
  /** scansion glyph override: 'short' (∪) / 'long' (–) / 'none'. Default: jump hold >= 0.5 or heave = long */
  mark?: 'short' | 'long' | 'none';
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

export type FxKind = 'flash' | 'shake' | 'zoom' | 'bgPulse';
/** lighting presets (act 1: 42nd Street golden hour -> neon dusk/night -> the honky-tonk bar's lamplight) */
export type SkyPreset = 'golden' | 'neon' | 'honkytonk';
/** walkable-surface look per reel */
export type GroundStyle = 'street' | 'timber';

export type LevelItem =
  /** override the ground height over a beat range (later items win) */
  | { type: 'floor'; from: number; to: number; h: number }
  /** hole in the ground (a pit below: lethal) */
  | { type: 'gap'; from: number; to: number; action?: IntendedAction }
  /** floating platform; one-way (jump-through) by default */
  | { type: 'platform'; from: number; to: number; h: number; oneWay?: boolean; thickness?: number; action?: IntendedAction }
  /** solid block from `bottom` (default 0) up to `h` */
  | { type: 'block'; from: number; to: number; h: number; bottom?: number; action?: IntendedAction }
  /** spike (stumble hazard) centred at `beat` */
  /** spike hazard (stumble) centred at `beat` */
  | { type: 'spike'; beat: number; h?: number; action?: IntendedAction }
  /** jabber, placed so a strike pressed ON `beat` flings it (jab beat) */
  | { type: 'jabber'; beat: number; action?: IntendedAction; react?: BeatReactSpec }
  /** Pendulum target (1-bar period); bottom of the swing (strike height) on `beat` */
  /** `high`: hangs so high it can only be struck mid-jump (full jump on beat-1, strike on `beat`) */
  | { type: 'pendulum'; beat: number; big?: boolean; high?: boolean; action?: IntendedAction }
  /** slam platform that SLAMS (solid) on `beat` (and every 2 beats), lifts on the swung offbeat; set by parity */
  | { type: 'slam'; beat: number }
  /** a Hup-Hup-HEY phrase: the three action beats (hop, hop, STRIKE) — the strike becomes a Heave */
  | { type: 'phrase'; beats: [number, number, number] }
  /** collectible lums ("lum") at beat, `h` px above the floor. `note` = explicit chord-tone index */
  | { type: 'lum'; beat: number; h?: number; note?: number }
  /** lums along the REAL trajectory of a jump pressed at `beat` (held `hold` beats), every `every` beats */
  | { type: 'lumJump'; beat: number; hold?: number; every?: number; skipFirst?: boolean }
  /** row of lums; every 0.5 = swung 8ths */
  | { type: 'lumRow'; from: number; to: number; every?: number; h?: number }
  | { type: 'checkpoint'; beat: number }
  | { type: 'finish'; beat: number }
  /** presentation cue fired when the song reaches `beat` */
  | { type: 'fx'; beat: number; fx: FxKind; amount?: number }
  /** camera zoom change, eased over `beats` starting at `beat` */
  | { type: 'camera'; beat: number; zoom: number; beats?: number }
  /** lighting preset from `beat` (cross-fades over 2 bars) */
  | { type: 'sky'; beat: number; preset: SkyPreset }
  /** ground look from `beat` on (by world x) */
  | { type: 'ground'; beat: number; style: GroundStyle }
  /** the chaser (the Burn) rises on this beat */
  | { type: 'chaser'; beat: number }
  /** scansion marks (∪ – on the ground) on/off from `beat`; bar lines stay on */
  | { type: 'marks'; beat: number; on: boolean }
  /** HUD hint shown from `beat` for `beats` (first-appearance tutorial text) */
  | { type: 'hint'; beat: number; text: string; beats?: number }
  /** free-standing intended action (e.g. a lums arc hop) */
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
  /** cold open before the music: the hero waits at startBeat until Strike is pressed */
  coldOpen?: boolean;
  items: LevelItem[];
}
