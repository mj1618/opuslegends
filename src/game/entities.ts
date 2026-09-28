/** Runtime entity records produced by the level builder (level/build.ts). Plain data. */
import type { Rect } from '../engine/math';
import type { BeatReactSpec, EnemyKind, FxKind, IntendedAction } from '../level/types';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  beat: number;
  /** spawn/home position (feet center) */
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  /** knockback flight after death */
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  deadTime: number;
  hitFlash: number;
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
}

export interface Hazard {
  id: number;
  kind: 'spikes' | 'beam';
  /** deadly rect (slightly smaller than the visual for fairness) */
  rect: Rect;
  /** visual rect */
  vis: Rect;
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
}

export interface Label {
  beat: number;
  x: number;
  text: string;
}
