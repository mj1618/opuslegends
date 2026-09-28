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

export type FxKind = 'flash' | 'shake' | 'zoom' | 'bgPulse' | 'shot';
/** lighting presets (act 1: 42nd Street golden hour -> neon dusk/night -> the honky-tonk bar's lamplight) */
export type SkyPreset = 'golden' | 'neon' | 'honkytonk' | 'facade' | 'lanes';
/** walkable-surface look per reel */
export type GroundStyle = 'street' | 'timber' | 'facade' | 'lanes';
/** skin hint for breakables (the renderer / art may ignore it) */
export type BreakableLook = 'bottle' | 'glass' | 'crate' | 'neon' | 'jug' | 'window' | 'pin';
/**
 * Act 2 (iteration 3, docs/level/act2_plan.md). Presentation-only set-piece cues read by the renderer from
 * `level.def.items` / `game.mech.setPieces` (the builder ignores them):
 *   climb        the Jimperial's facade starts (fire escapes, lit windows, the street dropping away)
 *   bigJimGlint  Big Jim's aviators flash in a high window (`h` px above the hero's floor, `ahead` beats ahead)
 *   windowCrash  Slim's Heave smashes THROUGH a window into the building (the pre-chorus HEY)
 *   lanes        inside: the Blacklight Lanes (bowling alley)
 */
export type SetPieceName = 'climb' | 'bigJimGlint' | 'windowCrash' | 'lanes' | ActOneSetPiece;
/**
 * Act 1 set-pieces (iteration 3 wow moments; Game also emits every setPiece item as a `setPiece` event and
 * exposes `game.setPiece` while it lasts): 'bigLaunch' (bar 9: the launch onto the neon roofs, apex on the
 * sky-flip), 'chorusShot' (bar 23: the chorus is a different SHOT), 'walkdown' (bar 29: the giant keg smash).
 */
export type ActOneSetPiece = 'bigLaunch' | 'chorusShot' | 'walkdown';
/** thrown-bottle styles: 'bottle' = strike it ON the beat (bat it back), 'firebomb' = hop its flames ON the beat */
export type ThrowStyle = 'bottle' | 'firebomb';

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
  /**
   * slam platform that SLAMS (solid) on `beat` (and every 2 beats), lifts on the swung offbeat; set by parity.
   * `from`/`to` = press-top extent in beats relative to `beat` (default SLAM.from/to; narrower = tighter timing).
   * `h` = press-top height above the street when down (default 0; act 2's lifts run high up the building)
   */
  | { type: 'slam'; beat: number; from?: number; to?: number; h?: number }
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
  | { type: 'hint'; beat: number; text: string; beats?: number; icon?: string }
  /**
   * Breakable target (bottle / glass / crate / neon letter) standing `h` px above the ground-level
   * surface, placed so a strike pressed ON `beat` smashes it (±~200 ms). Pure reward: it bursts into
   * `tokens` tokens; a miss costs nothing but the tokens. `high` = hangs so high it can only be hit
   * mid-jump / mid-launch. `beat` may sit on the swung "and" (x.66).
   */
  | { type: 'breakable'; beat: number; h?: number; high?: boolean; big?: boolean; giant?: boolean; look?: BreakableLook; tokens?: number; action?: IntendedAction }
  /**
   * Bounce pad (LAUNCH): when the hero reaches it (running over it or landing on it) he is flung up
   * so that he lands on a surface `land` px above base ground (default: the pad's own surface)
   * exactly on beat `beat + beats`. Automatic: no button, no failure. Tokens trace the arc.
   */
  | { type: 'bounce'; beat: number; beats: number; land?: number; tokens?: boolean }
  /**
   * Low sign hanging across [from, to]: its bottom edge is too low to run or hop under, and it's too
   * tall to jump over — knee-slide (hold ↓) under it. Stumble if touched.
   */
  | { type: 'lowSign'; from: number; to: number; action?: IntendedAction }
  /**
   * crowd (streak meter) cap from `beat` on — keeps FULL HOUSE for the chorus.
   * THE DROP (game.ts chorusDrop): a cap rising to FULL HOUSE (≥ Tun.crowd.bigCatchAt) is EARNED by a clean Hup-Hup-HEY
   * ending in the 8 beats before it, or by every action on the `earn` beats graded Great+ (e.g. act 3's break shot):
   * earned → FULL HOUSE lands ON `beat`
   */
  | { type: 'crowd'; beat: number; cap: number; earn?: number[] }
  /** design tag: traversal mode from `beat` (street, rooftops, launch, lifts, bar-top, …) — rubric B6 */
  | { type: 'mode'; beat: number; mode: string }
  /** design tag: the lane the level follows from `beat` (kick, vocal, fills, shouts, …) — rubric B7 */
  | { type: 'follows'; beat: number; lane: string }
  /** free-standing intended action (e.g. a lums arc hop) */
  | { type: 'action'; action: IntendedAction }
  /** debug label drawn in the world (section names etc.) */
  | { type: 'label'; beat: number; text: string }
  /**
   * THROWN BOTTLE (act 2's moving threat, src/game/mech/thrownBottle.ts): tossed from a window at `from`
   * (default beat - 2), arriving ON `beat`. 'bottle': at the bat point just ahead of the hero -> strike ON
   * `beat` (bats it back through the window: reward; a miss = it hits you, stumble). 'firebomb': shatters on the
   * floor ON `beat` a hop ahead of the hero -> hop ON `beat` over the flames (stumble). `dx`/`h` = the window
   * relative to the arrival point (px right / px above the floor).
   */
  | { type: 'thrown'; beat: number; style: ThrowStyle; from?: number; dx?: number; h?: number; action?: IntendedAction }
  /**
   * ROLLING BALL (the Lanes, src/game/mech/rollingBall.ts): rolls in from the right along the floor from `from`
   * (default beat - 3) and passes under the hero's hop pressed ON `beat` (stumble if it hits you). `speed` px/beat.
   */
  | { type: 'ball'; beat: number; from?: number; speed?: number; action?: IntendedAction }
  /** a hop UP onto a higher ledge (the climb) — design tag carrying the hop action; geometry = `floor` items */
  | { type: 'ledge'; beat: number; action?: IntendedAction }
  /** presentation-only set-piece cue (see SetPieceName) */
  | { type: 'setPiece'; beat: number; name: SetPieceName; beats?: number; h?: number; ahead?: number };

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
