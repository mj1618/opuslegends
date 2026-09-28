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
export type SkyPreset = 'golden' | 'neon' | 'honkytonk' | 'facade' | 'lanes' | ActThreeSky;
/** act 3 (docs/level/act3_plan.md "Lighting keyframes"): the Pool Room's felt lamps, the Velvet Casino's chandeliers, the
 * roof at SUNSET (cream sun, coral sky: the level's first warm palette since bar 17), dusk rising, Big Jim's dark
 * penthouse (one skylight shaft), the theatre (house lights up, the pull-out) */
export type ActThreeSky = 'poolroom' | 'casino' | 'sunset' | 'dusk' | 'penthouse' | 'theatre';
/** walkable-surface look per reel */
export type GroundStyle = 'street' | 'timber' | 'facade' | 'lanes' | 'felt' | 'rack' | 'roof' | 'penthouse' | 'filmstrip';
/** skin hint for breakables (the renderer / art may ignore it) */
export type BreakableLook = 'bottle' | 'glass' | 'crate' | 'neon' | 'jug' | 'window' | 'pin' | ActThreeLook;
/**
 * act 3 looks: balls (a racked triangle of pool balls) · bell (brass bar bell) · chips (casino chip tower) · headGoon (the
 * rack's gold head goon: THE BREAK) · letterNeon (a BIG JIM letter's neon tubes) · fist / lapel / jaw (the
 * walkdown's four blows ON Big Jim) · lens (his aviators: the gauntlet's two cracks) · decanter · chain (his gold chain
 * snaps) · popcorn (a bucket thrown from the front row) · finalHit (the power shot as the iris slams)
 */
export type ActThreeLook = 'balls' | 'bell' | 'chips' | 'headGoon' | 'letterNeon' | 'fist' | 'lapel' | 'jaw' | 'lens' | 'decanter' | 'chain' | 'popcorn' | 'finalHit';
/**
 * Act 2 (iteration 3, docs/level/act2_plan.md). Presentation-only set-piece cues read by the renderer from
 * `level.def.items` / `game.mech.setPieces` (the builder ignores them):
 *   climb        the Jimperial's facade starts (fire escapes, lit windows, the street dropping away)
 *   bigJimGlint  Big Jim's aviators flash in a high window (`h` px above the hero's floor, `ahead` beats ahead)
 *   windowCrash  Slim's Heave smashes THROUGH a window into the building (the pre-chorus HEY)
 *   lanes        inside: the Blacklight Lanes (bowling alley)
 *   facadeReveal (iteration 4) the act seam: out of the honky-tonk's door, the camera tilts UP the Jimperial to Big Jim's
 *                penthouse glinting at the top (`h` px above the street = the top, `ahead` beats ahead), then back down
 *   zipDrop      (iteration 4) the chorus drop: Slim hooks the cable on the chorus downbeat and zips DOWN into the Lanes'
 *                big window (`h` = the drop in px); the camera rides with him
 */
export type SetPieceName = 'climb' | 'bigJimGlint' | 'windowCrash' | 'lanes' | 'facadeReveal' | 'zipDrop' | ActOneSetPiece | ActThreeSetPiece | MidActBeat;
/**
 * MID-ACT VISUAL BEATS (iteration 5, review iter4 fix 4): presentation-only cues that break the two 26-second
 * single-room stretches (the honky-tonk, bars 16-33, and the facade, bars 34-51) WITHOUT new mechanics. Each is a
 * `setPiece` item (beat, beats; `h` / `ahead` where noted); Game emits it as a `setPiece` event and exposes
 * `game.setPiece` while it lasts; the renderer can also read the windows from `level.setPieces` (a pure function of the
 * beat: rewinds replay them). Nothing here touches collision or timing.
 *   honky-tonk (act 1):
 *   doorKick      64 (bar 17, 2 beats): Slim KICKS the honky-tonk's swinging doors open on the versePeak downbeat; the
 *                 room's lamps flare, dust off the doors (the level adds a zoom punch + flash on it)
 *   signDrop      78 (bar 20 b3, the fill's 3, 1.5 beats): a neon beer sign snaps its chain and CRASHES down behind Slim
 *                 (background; the level has a shake on it)
 *   spotlights    84 (bar 22, the walk-up, 36 beats → 120): HOUSE LIGHTS DOWN, three follow-spots swing onto the bar top
 *                 and track Slim; on the chorus downbeat (88) the audience STANDS UP (silhouettes rise into the spots)
 *   brawl         92 (bar 24, the chorus peak, 20 beats → 112): a BAR BRAWL breaks out behind the counter — goons trading
 *                 punches, chairs + bottles flying on the record's HEYs (93, 94, 98, 102), a handheld "brawl-cam" feel;
 *                 it freezes when the walkdown (112) starts
 *   houseLights  120 (bar 31, the tag, 4 beats): the house lights come back up (the spots swing off), the brawl's aftermath
 *   facade (act 2):
 *   lightChase   136 (bar 35, 16 beats → 152): the Jimperial's windows light up ONE PER BEAT just ahead of Slim as he
 *                 climbs (a window at each beat's x, snapping on ON that beat, `ahead` = how many beats ahead of the hero)
 *   streetReveal 152 (bar 39, 4 beats): the camera TILTS to show the street far below (the level lowers the camera's
 *                 ground line for the bar): traffic streaks, the honky-tonk's sign tiny down there, a siren flash
 *   searchlights 164 (bar 42, the roof, 16 beats → 180): the sky shifts — the MOON comes out from behind the water
 *                 tower, two searchlights from the street sweep the sky on the half-notes
 *   tenants      172 (bar 44, the stop-time, 8 beats → 180): window TENANTS lean out and react to Slim's stop-time hits
 *                 (a head pops out ON each hit, a "SHHH!" / a thrown slipper in the rests), until the glint takes over
 */
export type MidActBeat = 'doorKick' | 'signDrop' | 'spotlights' | 'brawl' | 'houseLights' | 'lightChase' | 'streetReveal' | 'searchlights' | 'tenants';
/**
 * Act 3 set-pieces (docs/level/act3_plan.md; runtime state in game/mech/act3.ts = `game.mech.act3`):
 *   poolRoom      the breakdown valley: felt lamps, jukeboxes, goons at the tables
 *   callResponse  the goons STOMP a 1-bar call (the Black Betty stomp 1 · &2 · 3) — you answer it the next bar
 *   rack          the Velvet Casino: the goon heap piles up one tier per downbeat ahead of you
 *   hush          the record drops into the projection booth for one beat under the break (StageAudio may duck it)
 *   rackBreak     THE BREAK SHOT (the fill's &4 tom): KRAK — the goons scatter like balls into the pockets
 *   drop          chorus 4's downbeat: the rack's recoil flings Slim through the skylight onto the roof at sunset
 *   signFalls     the BIG JIM sign topples, one letter per downbeat (`topple` items carry the letters)
 *   bigJimRise    Big Jim rises behind the letters
 *   walkdownJim   the hook-A walkdown = four blows ON Big Jim (fist, fist, lapel, jaw)
 *   penthouse     crash in through his glass wall
 *   bigJimReveal  the BLUFF DISPLAY on the held B (tag 4): arms flung wide, lenses blazing, the roar
 *   gauntlet      the final exam: climb Big Jim himself (fists = lifts, sleeve = slide, lapels = ledges, lenses)
 *   lensCrack     a lens cracks on a HEY answer (`h` = 0 left / 1 right)
 *   pullOut       the camera leaves the film: screen, curtains, the audience; the Burn eats Big Jim's frame
 *   marqueeSwap   the usher hangs SLIM CHANCE in the big letters
 *   irisOut       the iris closes blade by blade and SLAMS shut on Big Jim's face on the final hit (340)
 *   theEnd        THE END burns in; a second iris opens on Slim's victory pose on the throne
 */
export type ActThreeSetPiece =
  | 'poolRoom'
  | 'callResponse'
  | 'rack'
  | 'hush'
  | 'rackBreak'
  | 'drop'
  | 'signFalls'
  | 'bigJimRise'
  | 'walkdownJim'
  | 'penthouse'
  | 'bigJimReveal'
  | 'gauntlet'
  | 'lensCrack'
  | 'pullOut'
  | 'marqueeSwap'
  | 'irisOut'
  | 'theEnd';
/** Big Jim's pose keys (act 3's boss rig, game/mech/bigJim.ts interpolates between `bigJim` items) */
export type BigJimPose = 'hidden' | 'rise' | 'brace' | 'reeling' | 'knockedBack' | 'throne' | 'bluff' | 'fight' | 'reel' | 'swing' | 'defeated' | 'framed';
/**
 * Act 1 set-pieces (iteration 3 wow moments; Game also emits every setPiece item as a `setPiece` event and
 * exposes `game.setPiece` while it lasts): 'bigLaunch' (bar 9: the launch onto the neon roofs, apex on the
 * sky-flip), 'chorusShot' (bar 23: the chorus is a different SHOT), 'walkdown' (bar 29: the giant keg smash).
 */
export type ActOneSetPiece = 'bigLaunch' | 'chorusShot' | 'walkdown';
/** thrown-bottle styles: 'bottle' = strike it ON the beat (bat it back), 'firebomb' = hop its flames ON the beat */
export type ThrowStyle = 'bottle' | 'firebomb';
/** hook-ride skins (act 2, src/game/mech/hook.ts): 'rope' hoists you up, 'line' = a laundry line / cable, 'cradle' = a
 *  window-washer's cradle you ride standing */
export type HookStyle = 'rope' | 'line' | 'cradle';

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
  /**
   * `ground` (iteration 4, act 2's climb): the hero's ground line as a screen-y fraction from this cue on (default
   * Tun.camera.groundFraction 0.66; eased like the zoom). Lower = the ground sits higher on screen and more of the
   * world BELOW shows (the street dropping away on the climb, the zip's plunge); a cue without it keeps the last one
   */
  | { type: 'camera'; beat: number; zoom: number; beats?: number; ground?: number }
  /** lighting preset from `beat` (cross-fades over 2 bars) */
  | { type: 'sky'; beat: number; preset: SkyPreset }
  /** ground look from `beat` on (by world x) */
  | { type: 'ground'; beat: number; style: GroundStyle }
  /** the chaser (the Burn) rises on this beat; `off` = it RETIRES on this beat instead (act 3: 332, the finale can't kill) */
  | { type: 'chaser'; beat: number; off?: boolean }
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
   * crowd (streak meter) cap from `beat` on — keeps FULL HOUSE for the chorus. `floor` (act 3's finale): from `beat`
   * on the crowd can't drop below it (the whole house on its feet for the final hit, whatever happened before).
   * THE DROP (game.ts chorusDrop): a cap rising to FULL HOUSE (≥ Tun.crowd.bigCatchAt) is EARNED by a clean Hup-Hup-HEY
   * ending in the 8 beats before it, or by every action on the `earn` beats graded Great+ (e.g. act 3's break shot):
   * earned → FULL HOUSE lands ON `beat`
   */
  | { type: 'crowd'; beat: number; cap: number; floor?: number; earn?: number[] }
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
  /**
   * HOOK RIDE (act 2's new verb, src/game/mech/hook.ts): strike ON `beat` to hook the cue over a rope / line and ride
   * it. `path` = the hero's FEET height (px above the street) by x in beats: [[beat, h], ...], the first point at the
   * grab, the last where he lets go. The terrain under the path decides what a miss costs (stairs = nothing, a pit =
   * death). Strikes still work while riding.
   */
  | { type: 'hook'; beat: number; style: HookStyle; path: [number, number][]; action?: IntendedAction }
  /** presentation-only set-piece cue (see SetPieceName) */
  | { type: 'setPiece'; beat: number; name: SetPieceName; beats?: number; h?: number; ahead?: number }
  /**
   * TOPPLING LETTER (act 3, Sign Falls; runtime game/mech/letters.ts): one of the BIG JIM sign's letters, `tall` px of
   * rose neon on steel legs standing on the roof at `from` (the pivot). It pivots forward ON `beat` (a downbeat), falls
   * over one beat and lands as a BRIDGE over [from, to] at `h` px above the street ON beat + 1 (the backbeat: SLAM).
   * Presentation only: the bridge's collision is an ordinary `floor` item over the same span (the letter always lands
   * ≥ 1 beat before the hero's grid position reaches it). `by`: what knocks it over ('frame' = the rack's flying frame,
   * 'shot' = your strike on `beat`, else it just goes). `index` = the letter's position in the sign (0..5).
   */
  | { type: 'topple'; beat: number; letter: string; index: number; from: number; to: number; h: number; by?: 'frame' | 'shot' }
  /**
   * BIG JIM pose key (act 3's boss, game/mech/bigJim.ts): from `beat` he blends into `pose` over `beats` (default 1).
   * `x` = the beat his seat is centred on (world x = x × ppb) — or `ahead`: he TRACKS the hero, his seat `ahead` beats in
   * front of the music line (the gauntlet: you climb him for 24 beats) — `h` = his seat's height above the street,
   * `scale` 1 = ~1150 px from seat to pompadour (each field carries over from the previous key when omitted). Everything he does to the play band is ordinary level items (fists = slam lifts,
   * sleeve = low sign, medallions = pendulums, lapels = ledges, lenses = giant breakables).
   */
  | { type: 'bigJim'; beat: number; pose: BigJimPose; beats?: number; x?: number; ahead?: number; h?: number; scale?: number };

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
  /** first edit bar (1-based) of each act of a joined level (design tag: the rubric's block grid restarts on them) */
  acts?: number[];
  items: LevelItem[];
}
