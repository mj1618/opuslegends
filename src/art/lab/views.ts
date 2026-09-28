/** Art-lab view registry + shared lab types. Each view draws one 1920x1080 frame from the LabCtx. */
import type { BeatInfo, BeatSim } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { TAU } from '../core/math';
import { SLIM_POSES } from '../grindhouse/slim';
import { HERO_POSES } from '../rig/mannequin';
import type { LightingDirector } from '../world/lighting';
import { drawFxView, drawGreyboxWorld, drawHeroView, drawLightingView, drawRigView } from './genericViews';
import { SLIM_DESC, drawBarView, drawStreetView, drawStressView } from './grindhouseViews';
import { drawSkinsView } from './skinsView';

export interface LabCtx {
  g: Ctx;
  sim: BeatSim;
  light: LightingDirector;
  /** current pose name (depends on the view's hero) */
  pose: string;
  poseStart: number;
  time: number;
  dt: number;
  paused: boolean;
  scroll: number;
  thumb: boolean;
  debug: boolean;
  onion: boolean;
}

export type ViewId = 'slim' | 'street' | 'bar' | 'stress' | 'skins' | 'rig' | 'fx' | 'lighting' | 'world';

export interface LabView {
  label: string;
  help: string;
  /** lighting keyframe set this view uses */
  lights: string;
  /** pose list for the pose buttons */
  poses: readonly string[];
  draw: (l: LabCtx) => void;
}

export const VIEWS: Record<ViewId, LabView> = {
  slim: { label: 'Slim', help: 'The hero (hulking tattooed pool shark) on the rig framework: every pose, big-swing filmstrip (crescent smear), 25% check. Debug = bones, Onion = ghosts.', lights: 'grindhouse', poses: SLIM_POSES, draw: (l) => drawHeroView(l, SLIM_DESC) },
  bar: { label: 'Bar', help: 'Act 1b: honky-tonk interior — bottle shelves, neon beer signs, jukebox, pool tables under swinging lamps, brawlers on the beat, bottles on the snare, pool balls on piano runs.', lights: 'grindhouse', poses: SLIM_POSES, draw: drawBarView },
  stress: { label: 'Stress', help: 'Street with ~3x ambient life (30 pedestrians, 11 cars) + full-house audience + Slim. Watch the perf readout.', lights: 'grindhouse', poses: SLIM_POSES, draw: drawStressView },
  street: { label: '42nd St', help: 'Act 1: matte sky, rooftops, grindhouse facades (marquees chase on 8ths), ambient life, festoon bulbs + steam, film pass, theatre audience (cycles 0 -> FULL HOUSE). Hold camera to pose Slim.', lights: 'grindhouse', poses: SLIM_POSES, draw: drawStreetView },
  skins: { label: 'Skins', help: 'Every gameplay entity skin (src/render/entityDraw.ts) grouped by danger class: LETHAL red+hot edge, STUMBLE ink+red points, REWARD gold, TERRAIN cream lip. Bluffer beat cycle incl. the wind-up tell. G = greyscale+blur test.', lights: 'grindhouse', poses: SLIM_POSES, draw: drawSkinsView },
  rig: { label: 'Rig', help: 'Generic rig framework on a theme-neutral mannequin: every pose, strike filmstrip (smears), 25% check. Debug = bones, Onion = ghosts.', lights: 'neutral', poses: HERO_POSES, draw: drawRigView },
  fx: { label: 'FX', help: 'Pooled particle presets fired by BeatInfo lanes (kick/snare/hat/crash/cowbell/bass) + stateless helpers.', lights: 'neutral', poses: HERO_POSES, draw: drawFxView },
  lighting: { label: 'Lighting', help: 'Every keyframe of the active light set: sky, lit spheres (key/amb/rim), swatches. Switch set via the World/Coast views.', lights: 'neutral', poses: HERO_POSES, draw: drawLightingView },
  world: { label: 'World', help: 'Greybox scene built only from the generic ParallaxScene/stripLayer API; lamps + windows follow L.lamps; kick bumps.', lights: 'neutral', poses: HERO_POSES, draw: drawGreyboxWorld },
};

export function beatDots(g: Ctx, b: BeatInfo, x: number, y: number): void {
  for (let i = 0; i < 4; i++) {
    const on = b.beatInBar === i;
    g.fillStyle = on ? `rgba(255,138,31,${0.4 + 0.6 * Math.exp(-b.beatPhase * 4)})` : 'rgba(40,40,60,0.25)';
    g.beginPath();
    g.arc(x + i * 22, y, on ? 8 : 6, 0, TAU);
    g.fill();
  }
  g.font = '600 16px ui-sans-serif, system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(30,28,40,0.75)';
  g.fillText(`${b.bpm} BPM · bar ${Math.floor(b.bar) + 1}`, x + 140, y + 7);
}
