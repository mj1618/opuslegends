/** CUE-FU lab views: hero descriptor + Reel 1 (42nd Street) world preview with film pass + theatre. */
import { hit } from '../core/beat';
import { fract } from '../core/math';
import { SLIM_POSES, SLIM_POSE_LEN, type SlimPose, drawSlim } from '../grindhouse/slim';
import { type StreetScene, drawStreetGround, makeStreet } from '../grindhouse/street';
import { drawBarFloor, makeBar } from '../grindhouse/bar';
import { LifeLayer } from '../life/life';
import { PEDESTRIAN, SEDAN, TAXI } from '../grindhouse/actors';
import { drawTheatre } from '../grindhouse/theatre';
import { FilmPass, drawSubtitle } from '../fx/film';
import { type ArtCamera, layerView, pushLayer, screenX } from '../world/camera';
import { type HeroDesc, loopTime } from './genericViews';
import { type LabCtx, beatDots } from './views';

export const SLIM_DESC: HeroDesc = {
  name: 'Slim (hero)',
  poses: SLIM_POSES,
  lens: SLIM_POSE_LEN,
  moving: ['run', 'slide'],
  strike: 'strike',
  studio: ['#E9D8B4', '#CDB690'],
  draw: (g, x, y, s) => drawSlim(g, x, y, { ...s, pose: s.pose as SlimPose }),
};

let street: StreetScene | null = null;
const film = new FilmPass();
const BLOCK = 1536;

/** Kid Cue on a looping street course: 4-beat blocks with 1-beat gaps; sweep on beat 3 of odd bars */
function heroOnCourse(x: number, speed: number, t: number) {
  const beat = x / 384;
  const inBlock = fract(beat / 4) * 4;
  if (inBlock >= 3) {
    const u = (inBlock - 3) / 1;
    return { y: -4 * 160 * u * (1 - u), pose: (u < 0.5 ? 'hop' : 'fall') as SlimPose, pt: u * 0.36, vy: (u < 0.5 ? -1 : 1) * 700 };
  }
  if (inBlock < 0.25) return { y: 0, pose: 'land' as SlimPose, pt: (inBlock * 384) / speed, vy: 0 };
  const bar = Math.floor(beat / 4);
  if (bar % 2 === 1 && inBlock >= 1.5 && inBlock < 2.7) return { y: 0, pose: 'strike' as SlimPose, pt: ((inBlock - 1.5) * 384) / speed, vy: 0 };
  return { y: 0, pose: 'run' as SlimPose, pt: t, vy: 0 };
}

export function drawStreetView(l: LabCtx): void {
  drawAct(l, 'street');
}

export function drawBarView(l: LabCtx): void {
  drawAct(l, 'bar');
}

export function drawStressView(l: LabCtx): void {
  drawAct(l, 'stress');
}

let bar: import('../world/parallax').ParallaxScene | null = null;
let stressed = false;

function drawAct(l: LabCtx, act: 'street' | 'bar' | 'stress'): void {
  const g = l.g;
  if (!street) street = makeStreet(l.light);
  if (!bar) bar = makeBar(l.light);
  if (act === 'stress' && !stressed) {
    stressed = true;
    // stress: triple the ambient life on the street
    street.add(
      new LifeLayer({ id: 'stress-crowd', factor: 0.72, depth: 0.36, rules: [{ kind: PEDESTRIAN, every: 0.15, y: -26, speed: 80, scale: 0.66, max: 30, prefill: 24 }] }),
      new LifeLayer({ id: 'stress-cars', factor: 0.82, depth: 0.28, rules: [{ kind: TAXI, every: 0.5, y: -4, speed: 500, scale: 0.8, max: 6 }, { kind: SEDAN, every: 0.7, y: -4, speed: 420, scale: 0.8, max: 5 }] }),
    );
  }
  const scene = act === 'bar' ? bar : street;
  const t = l.time;
  const b = l.sim.at(t);
  const speed = (384 * l.sim.bpm) / 60;
  const x = t * speed * l.scroll;
  const k = l.scroll === 0 ? { y: 0, pose: (SLIM_POSES.includes(l.pose as SlimPose) ? l.pose : 'idle') as SlimPose, pt: loopTime(SLIM_POSE_LEN, l.pose, t - l.poseStart), vy: 0 } : heroOnCourse(x, speed, t);
  const cam: ArtCamera = { x: x + 380, y: -250 - 30, zoom: 0.95 * (1 + hit(b, 'crash', 0.2) * 0.01) };
  const w = film.weave(b);
  g.save();
  g.translate(w.x, w.y);
  scene.drawBack(g, cam, b);
  const v = layerView(cam, 1);
  pushLayer(g, v);
  const L = scene.L;
  for (let kk = Math.floor(v.x0 / BLOCK) - 1; kk <= Math.floor(v.x1 / BLOCK) + 1; kk++) {
    const r = { x: kk * BLOCK - 40, y: 0, w: BLOCK * 0.78 + 40, h: 500 };
    if (act === 'bar') drawBarFloor(g, r, { light: L });
    else drawStreetGround(g, r, { light: L, version: scene.light.version });
  }
  drawSlim(g, x, k.y, {
    pose: k.pose,
    poseTime: k.pt,
    time: t,
    beatPhase: b.beatPhase,
    beat: b.beat,
    runPhase: x / 192,
    speed: l.scroll === 0 ? 0 : speed,
    vy: k.vy,
    bones: l.debug,
    perfect: k.pose === 'strike' ? Math.max(0, 1 - k.pt / 0.12) : 0,
  });
  g.restore();
  scene.drawFront(g, cam, b);
  g.restore();
  film.draw(g, b);
  // theatre (outside the film): audience cycles 0 -> FULL HOUSE so the meter can be reviewed
  const standing = act === 'stress' ? 24 : Math.floor((fract(t / 24) * 26) % 25);
  drawTheatre(g, b, { standing, heroX: screenX(v, x), perfectT: k.pose === 'strike' ? k.pt : undefined, enforcers: Math.floor(t / 6) % 5, light: L });
  const hey = b.since.hey;
  if (hey < b.spb * 0.9) drawSubtitle(g, 'HEY!', { alpha: 1 - hey / (b.spb * 0.9), pop: Math.max(0, 1 - hey / 0.1), y: 880, size: 64 });
  beatDots(g, b, 70, 40);
}
