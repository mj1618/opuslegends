/** Runtime entity records produced by the level builder (level/build.ts). Plain data. */
import type { Rect } from '../engine/math';
import type { BeatReactSpec, BreakableLook, FailKind, FxKind, IntendedAction, SkyPreset } from '../level/types';
import type { Solid } from './physics';

/** jabber (the only enemy in the slice). */
export interface Enemy {
  id: number;
  kind: 'jabber';
  /** jab beat = the beat to strike on */
  beat: number;
  /** spawn/home position (feet center) */
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  /** landed a jab on the hero -> flies off laughing (never hits twice) */
  retired: boolean;
  /** flung by a Heave (bigger arc into the background) */
  heaved: boolean;
  /** knockback flight after death */
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  deadTime: number;
  hitFlash: number;
  /** presentation: >0 while the jab animation plays (s) */
  jabT: number;
  react: BeatReactSpec;
}

export interface Lum {
  id: number;
  beat: number;
  x: number;
  y: number;
  /** chord-tone index override */
  note?: number;
  collected: boolean;
  /** time since collection (presentation) */
  collectT: number;
  /** skipped because the run started past it (?start=) */
  skipped: boolean;
  /** heading of the arc at this lums (radians, presentation) */
  angle: number;
}

/** Lums dropped by a stumble: hovers for a bar, re-collectable. */
export interface LooseLum {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** song time it expires */
  expires: number;
  collected: boolean;
  t: number;
}

export interface Hazard {
  id: number;
  kind: 'spike';
  /** hurt rect (slightly smaller than the visual for fairness) */
  rect: Rect;
  /** visual rect */
  vis: Rect;
  beat: number;
  /** knocked away after it stumbled the hero */
  alive: boolean;
  vx: number;
  vy: number;
  rot: number;
  offX: number;
  offY: number;
}

export interface PendulumTarget {
  id: number;
  beat: number;
  big: boolean;
  /** pendulum pivot (world) */
  pivotX: number;
  pivotY: number;
  /** rope length */
  len: number;
  /** amplitude (radians) */
  amp: number;
  /** current bob position (updated each step) */
  x: number;
  y: number;
  r: number;
  struck: boolean;
  struckT: number;
  /** presentation: glint pulse 1 beat before the bottom */
  glint: number;
}

export interface SlamPlatform {
  id: number;
  /** slam beat this slam was authored for (parity = set A/B) */
  beat: number;
  set: 'A' | 'B';
  solid: Solid;
  /** 0 = down (slammed, solid), 1 = fully lifted — presentation */
  lift: number;
  /** was solid last step (for slam fx) */
  wasDown: boolean;
}

export interface Checkpoint {
  beat: number;
  x: number;
  y: number;
  reached: boolean;
  flash: number;
}

export interface FxCue {
  beat: number;
  fx: FxKind;
  amount: number;
}

export interface ActionMarker extends IntendedAction {
  x: number;
  /** what declared it (for debug labels) */
  source: string;
  /** resolved fail kind (what a deliberate miss costs) */
  failKind: FailKind;
  /** index into RuntimeLevel.phrases if this action is part of a Hup-Hup-HEY */
  phrase: number;
  /** scansion glyph */
  glyph: 'short' | 'long' | 'none';
  /** ground y under the action x (for scansion marks) */
  groundY: number;
}

export interface Phrase {
  beats: [number, number, number];
}

export interface Label {
  beat: number;
  x: number;
  text: string;
}

export interface CameraCue {
  beat: number;
  zoom: number;
  beats: number;
}

export interface SkyCue {
  beat: number;
  preset: SkyPreset;
}

export interface Hint {
  beat: number;
  beats: number;
  text: string;
}

/** Breakable target (bottle/crate/neon letter): strike it on its beat -> token burst. Plain data. */
export interface Breakable {
  id: number;
  beat: number;
  /** centre (world) */
  x: number;
  y: number;
  /** hit radius */
  r: number;
  /** surface it stands on (world y) — `high` ones hang from above instead */
  baseY: number;
  high: boolean;
  big: boolean;
  look: BreakableLook;
  /** tokens it bursts into (counted in lumsTotal) */
  tokens: number;
  broken: boolean;
  /** seconds since it broke (presentation) */
  brokenT: number;
}

/** Bounce pad (launch). Plain data; Game does the launch, the renderer squashes it. */
export interface BouncePad {
  id: number;
  /** beat the hero reaches the pad centre */
  beat: number;
  /** beat he should land */
  landBeat: number;
  /** landing surface (world y) */
  landY: number;
  x: number;
  /** pad top (world y) */
  y: number;
  w: number;
  /** presentation: 1 on launch, decays */
  kick: number;
  /** already fired this attempt */
  used: boolean;
}

/** A low hanging sign: knee-slide under it (stumble on contact). */
export interface LowSign {
  id: number;
  beat: number;
  /** hurt rect (world) */
  rect: Rect;
  /** knocked loose after it stumbled the hero */
  hit: boolean;
  swing: number;
}

export interface CrowdCap {
  beat: number;
  cap: number;
}
