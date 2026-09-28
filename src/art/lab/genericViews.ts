/** Theme-agnostic lab views: Rig (mannequin), FX gallery, Lighting keyframe board, Greybox world. */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { type RGB, css, mix } from '../core/color';
import { drawGlow, puff, sparkle, star4 } from '../core/draw';
import { TAU, fract, lerp, smooth } from '../core/math';
import { BeatTrigger, Fx } from '../fx/particles';
import { strikeU } from '../rig/motion';
import { HERO_POSES, HERO_POSE_LEN, type HeroPose, drawMannequin } from '../rig/mannequin';
import { drawSmear, ghosts, speedLines } from '../rig/smear';
import { type ArtCamera, layerView, pushLayer } from '../world/camera';
import { drawGreyBlock, makeGreybox } from '../world/greybox';
import { LIGHTS, LIGHT_KEYS, type Lighting, lit } from '../world/lighting';
import type { ParallaxScene } from '../world/parallax';
import { beatDots, type LabCtx } from './views';


function studio(g: Ctx, top: string, bottom: string) {
  const gr = g.createLinearGradient(0, 0, 0, 1080);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fillRect(0, 0, 1920, 1080);
}

function label(g: Ctx, text: string, x: number, y: number, size = 18, col = 'rgba(30,28,40,0.75)', align: CanvasTextAlign = 'center') {
  g.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = align;
  g.fillStyle = col;
  g.fillText(text, x, y);
}

// ------------------------------------------------------------------------------ HERO (rig) views

/** common state any hero adapter receives */
export interface HeroCommon {
  pose: string;
  poseTime: number;
  time: number;
  beatPhase: number;
  beat: number;
  runPhase: number;
  speed: number;
  vy: number;
  scale: number;
  lookX?: number;
  lookY?: number;
  bones?: boolean;
  perfect?: number;
}

export interface HeroDesc {
  name: string;
  poses: readonly string[];
  lens: Partial<Record<string, number>>;
  moving: readonly string[];
  /** pose used for the smear filmstrip */
  strike: string;
  draw(g: Ctx, x: number, y: number, s: HeroCommon): void;
  studio: [string, string];
}

export const MANNEQUIN_DESC: HeroDesc = {
  name: 'Mannequin (rig test)',
  poses: HERO_POSES,
  lens: HERO_POSE_LEN,
  moving: ['run', 'slide'],
  strike: 'strike',
  studio: ['#C9DCE6', '#EFE6D6'],
  draw: (g, x, y, s) => drawMannequin(g, x, y, { ...s, pose: s.pose as HeroPose }),
};

export function loopTime(lens: Partial<Record<string, number>>, pose: string, t: number): number {
  const len = lens[pose];
  if (!len) return t;
  return t % (len + 0.7);
}

export function heroLoopTime(pose: HeroPose, t: number): number {
  return loopTime(HERO_POSE_LEN, pose, t);
}

export function drawHeroView(l: LabCtx, H: HeroDesc): void {
  const g = l.g;
  const t = l.time;
  const b = l.sim.at(t);
  studio(g, H.studio[0], H.studio[1]);
  beatDots(g, b, 60, 50);
  const pose = H.poses.includes(l.pose) ? l.pose : 'idle';
  const pt = loopTime(H.lens, pose, t - l.poseStart);
  const moving = H.moving.includes(pose);
  const vyOf = (p: string) => (p === 'hop' || p === 'jump' ? -700 : p === 'fall' ? 800 : 0);
  const st = (dt: number): HeroCommon => ({
    pose,
    poseTime: Math.max(0, pt + dt),
    time: t + dt,
    beatPhase: b.beatPhase,
    beat: b.beat,
    runPhase: ((t + dt) * 1024) / 192,
    speed: moving ? 1024 : 0,
    vy: vyOf(pose),
    scale: 3,
    lookX: 300 * Math.cos(t * 0.6),
    lookY: -60 + 60 * Math.sin(t * 0.9),
    bones: l.debug,
  });
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.beginPath();
  g.ellipse(440, 800, 380, 40, 0, 0, TAU);
  g.fill();
  if (l.onion) ghosts(g, (dt) => H.draw(g, 440, 800, st(dt)), 3, 0.03, 0.3);
  H.draw(g, 440, 800, st(0));
  label(g, pose.toUpperCase(), 440, 880, 34);
  label(g, `${H.name} · Debug = bones · Onion = ghost frames`, 440, 918, 15);
  const cols = 4;
  H.poses.forEach((p, i) => {
    const cx = 1010 + (i % cols) * 230;
    const cy = 260 + Math.floor(i / cols) * 255;
    g.fillStyle = 'rgba(60,50,40,0.12)';
    g.fillRect(cx - 100, cy, 200, 5);
    const mv = H.moving.includes(p);
    H.draw(g, cx, cy, {
      pose: p,
      poseTime: loopTime(H.lens, p, t + i * 0.13),
      time: t,
      beatPhase: b.beatPhase,
      beat: b.beat,
      runPhase: (t * 1024) / 192,
      speed: mv ? 1024 : 0,
      vy: vyOf(p),
      scale: 1.05,
    });
    label(g, p, cx, cy + 30, 17);
  });
  // strike filmstrip (smear review)
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(40, 950, 1840, 120);
  label(g, `${H.strike} filmstrip (s)`, 110, 1010, 15);
  const times = [0, 0.02, 0.04, 0.07, 0.1, 0.14, 0.2, 0.28, 0.4];
  times.forEach((tt, i) => {
    H.draw(g, 270 + i * 112, 1045, { pose: H.strike, poseTime: tt, time: t, beatPhase: 0.5, beat: 0, runPhase: 0, speed: 0, vy: 0, scale: 0.62 });
    label(g, tt.toFixed(2), 270 + i * 112, 1068, 12);
  });
  label(g, '25%', 1330, 1010, 15);
  for (let i = 0; i < 6; i++)
    H.draw(g, 1390 + i * 52, 1045, { pose: H.poses[i], poseTime: 0.05, time: t, beatPhase: b.beatPhase, beat: b.beat, runPhase: t * 5, speed: 0, vy: 0, scale: 0.25 });
}

export function drawRigView(l: LabCtx): void {
  drawHeroView(l, MANNEQUIN_DESC);
}

// ------------------------------------------------------------------------------ FX

const fx = new Fx(4000);
const trig = new BeatTrigger();
let lastFxT = -1;

export function drawFxView(l: LabCtx): void {
  const g = l.g;
  const t = l.time;
  const b = l.sim.at(t);
  const dt = lastFxT < 0 ? 1 / 60 : Math.max(0, Math.min(0.05, t - lastFxT));
  lastFxT = t;
  studio(g, '#1A1C2A', '#2C2A3A');
  g.fillStyle = '#EFE6D6';
  g.fillRect(0, 700, 1920, 380);
  beatDots(g, b, 60, 40);
  const cells: [string, number, number][] = [
    ['kick → land dust', 200, 620],
    ['snare → ring + sparks', 560, 450],
    ['hat → sparkles', 920, 450],
    ['crash → confetti + flash', 1280, 450],
    ['cowbell → shards', 1640, 450],
    ['bass → smoke', 200, 300],
  ];
  // beat-driven emitters (edge-triggered once per event)
  trig.on(b, 'kick', () => fx.land(200, 620, { power: 1.2 }));
  trig.on(b, 'snare', () => {
    fx.ring(560, 450, { radius: 110, color: '#8FF5EA' });
    fx.sparks(560, 450, { angle: -Math.PI / 2, spread: 2.4, n: 14, color: '#FFE9A8' });
  });
  trig.on(b, 'hat', () => fx.sparkle(920 + (fx.rand() - 0.5) * 60, 450 + (fx.rand() - 0.5) * 40, { n: 3, radius: 30 }));
  trig.on(b, 'crash', () => {
    fx.confetti(1280, 520, { n: 40 });
    fx.flash(1280, 450, { radius: 260, color: '#FFE9C0' });
  });
  trig.on(b, 'cowbell', () => fx.shards(1640, 450, { n: 10, color: '#9FE8FF' }));
  trig.on(b, 'bass', () => fx.smoke(200, 320, { n: 1 }));
  if (fract(t * 4) < dt * 4) fx.streaks(560, 820, { dir: 1, n: 3, color: '#FF9A5A' });
  fx.update(dt);
  // labels + dark-side emitters
  for (const [txt, x, y] of cells) label(g, txt, x, y + (y < 700 ? 120 : 80), 16, 'rgba(240,236,230,0.8)');
  fx.draw(g);
  label(g, `${fx.stats().count} live particles (pool ${fx.stats().max}) · edge-triggered by BeatInfo lanes`, 960, 680, 15, 'rgba(240,236,230,0.6)');
  // stateless helpers on the light side
  label(g, 'stateless helpers:', 110, 740, 16, 'rgba(30,28,40,0.8)', 'left');
  const k = fract(t / 1.2);
  sparkle(g, 200, 850, 22 * Math.sin(Math.PI * k), k * 3, 1);
  label(g, 'sparkle()', 200, 930, 14);
  drawGlow(g, 380, 850, '#FFC060', 70, 0.5 + 0.5 * hit(b, 'kick', 0.15), false);
  label(g, 'drawGlow()', 380, 930, 14);
  for (let i = 0; i < 4; i++) puff(g, 520 + i * 18, 860 - fract(t + i * 0.25) * 30, 6 + fract(t + i * 0.25) * 12, 1 - fract(t + i * 0.25), '#C8C0B0');
  label(g, 'puff()', 560, 930, 14);
  star4(g, 720, 850, 26, t, '#FF7F66');
  label(g, 'star4()', 720, 930, 14);
  // smear ribbon on a rotating arm (strikeU timing)
  const st = fract(t / 0.9) * 0.9;
  const u = strikeU(st);
  const at = (uu: number): [number, number, number, number] => {
    const a = lerp(1.2, -1.9, uu / 2);
    return [960 + Math.cos(a) * 120, 900 + Math.sin(a) * 120, 960 + Math.cos(a) * 30, 900 + Math.sin(a) * 30];
  };
  drawSmear(g, at, Math.min(u, u * smooth(st / 0.13)), u, { color: '#FFD08A', core: '#FFFBF0', lines: '#FFB060', alpha: 1 - Math.min(1, st / 0.15) });
  const [ax, ay] = at(u);
  g.strokeStyle = '#1B1726';
  g.lineWidth = 8;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(960, 900);
  g.lineTo(ax, ay);
  g.stroke();
  label(g, 'drawSmear() + strikeU()', 960, 1050, 14);
  speedLines(g, 1300, 880, 0, 6, 120, 90, '#6A6070', 0.8, Math.floor(t * 12));
  g.fillStyle = '#6A6070';
  g.beginPath();
  g.arc(1330, 880, 22, 0, TAU);
  g.fill();
  label(g, 'speedLines()', 1260, 960, 14);
  label(g, 'ghosts(): see Rig view (Onion)', 1640, 880, 14);
}

// ------------------------------------------------------------------------------ LIGHTING

function litSphere(g: Ctx, x: number, y: number, r: number, L: Lighting, mat: RGB) {
  const lx = x - L.lightDir * r * 0.45;
  const gr = g.createRadialGradient(lx, y - r * 0.4, r * 0.1, x, y, r * 1.05);
  gr.addColorStop(0, css(lit(L, mat, 1.05)));
  gr.addColorStop(0.6, css(lit(L, mat, 0.55)));
  gr.addColorStop(1, css(lit(L, mat, 0)));
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.strokeStyle = css(mix(lit(L, mat, 1), L.rim, 0.6), 0.9 * L.rimAmt);
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(x, y, r - 1.5, L.lightDir > 0 ? -1.2 : Math.PI + 0.2, L.lightDir > 0 ? 0.3 : Math.PI + 1.7);
  g.stroke();
}

export function drawLightingView(l: LabCtx): void {
  const g = l.g;
  studio(g, '#20222C', '#20222C');
  const keys = LIGHT_KEYS;
  const n = keys.length;
  const cols = Math.min(4, n);
  const cw = 1920 / cols;
  const ch = 1080 / Math.ceil(n / cols);
  const mats: [string, RGB][] = [
    ['stone', [201, 195, 180]],
    ['wood', [138, 106, 79]],
    ['cloth', [45, 111, 176]],
    ['skin', [240, 200, 160]],
  ];
  keys.forEach((k, i) => {
    const L = LIGHTS[k];
    const x0 = (i % cols) * cw;
    const y0 = Math.floor(i / cols) * ch;
    const gr = g.createLinearGradient(0, y0, 0, y0 + ch * 0.62);
    gr.addColorStop(0, css(L.skyTop));
    gr.addColorStop(0.55, css(L.skyMid));
    gr.addColorStop(1, css(L.skyLow));
    g.fillStyle = gr;
    g.fillRect(x0 + 6, y0 + 6, cw - 12, ch * 0.62);
    if (L.sunAmt > 0.05) drawGlow(g, x0 + cw * L.sunX, y0 + ch * 0.62 * (L.sunY + 0.2), css(L.sun), 90, 0.8 * L.sunAmt);
    // ground band lit by key/amb
    g.fillStyle = css(lit(L, [150, 140, 125], 0.7));
    g.fillRect(x0 + 6, y0 + 6 + ch * 0.62, cw - 12, ch * 0.38 - 12);
    mats.forEach(([name, m], j) => {
      const sx = x0 + 70 + j * ((cw - 100) / 4);
      litSphere(g, sx, y0 + ch * 0.47, 32, L, m);
      label(g, name, sx, y0 + ch * 0.47 + 50, 12, 'rgba(255,255,255,0.8)');
    });
    if (L.lamps > 0.1) drawGlow(g, x0 + cw - 50, y0 + 60, '#FFD890', 50, L.lamps * 0.8);
    if (L.accentAmt > 0.05) drawGlow(g, x0 + 50, y0 + 60, css(L.accent), 50, L.accentAmt * 0.8);
    // swatches
    const sw: [string, RGB][] = [
      ['top', L.skyTop],
      ['mid', L.skyMid],
      ['low', L.skyLow],
      ['key', L.key],
      ['amb', L.amb],
      ['rim', L.rim],
      ['haze', L.haze],
      ['sea', L.seaTop],
    ];
    sw.forEach(([nm, c], j) => {
      const sx = x0 + 16 + j * ((cw - 32) / sw.length);
      const sy = y0 + ch * 0.62 + 30;
      g.fillStyle = css(c);
      g.fillRect(sx, sy, (cw - 32) / sw.length - 6, 34);
      label(g, nm, sx + ((cw - 32) / sw.length - 6) / 2, sy + 52, 11, 'rgba(255,255,255,0.75)');
    });
    label(g, k + (k === l.light.key ? '  (current)' : ''), x0 + 20, y0 + 34, 20, 'rgba(255,255,255,0.95)', 'left');
  });
}

// ------------------------------------------------------------------------------ GREYBOX WORLD

let greybox: ParallaxScene | null = null;
const worldFx = new Fx(1500);
let lastWT = -1;
let lastStep = 0;

export function drawGreyboxWorld(l: LabCtx): void {
  const g = l.g;
  if (!greybox) greybox = makeGreybox(l.light);
  const t = l.time;
  const b: BeatInfo = l.sim.at(t);
  const dt = lastWT < 0 ? 1 / 60 : Math.max(0, Math.min(0.05, t - lastWT));
  lastWT = t;
  const speed = (384 * l.sim.bpm) / 60;
  const x = t * speed * l.scroll;
  // hop over every 8th beat block gap
  const beat = x / 384;
  const hopPh = fract(beat / 4);
  const hopping = hopPh > 0.75;
  const u = hopping ? (hopPh - 0.75) / 0.25 : 0;
  const y = hopping ? -4 * 150 * u * (1 - u) : 0;
  const cam: ArtCamera = { x: x + 380, y: -250, zoom: 0.95 };
  greybox.drawBack(g, cam, b);
  const v = layerView(cam, 1);
  pushLayer(g, v);
  const L = greybox.L;
  // blocks: 4-beat platforms with 1-beat gaps
  for (let k = Math.floor(v.x0 / 1536) - 1; k <= Math.floor(v.x1 / 1536) + 1; k++) drawGreyBlock(g, k * 1536 - 1536 * 0.0 + 0, 0, 1536 * 0.78, 400, L);
  // footfall dust + beat sparkles
  const step = Math.floor((x / 192) * 2);
  if (!hopping && step !== lastStep) worldFx.dust(x - 10, 0, { dir: -1, n: 2 });
  if (hopping && u < 0.05) worldFx.dust(x, 0, { dir: -1, n: 5, power: 1.4 });
  lastStep = step;
  worldFx.update(dt);
  worldFx.draw(g);
  drawMannequin(g, x, y, {
    pose: l.scroll === 0 ? ((HERO_POSES as string[]).includes(l.pose) ? (l.pose as HeroPose) : 'idle') : hopping ? (u < 0.5 ? 'jump' : 'fall') : 'run',
    poseTime: l.scroll === 0 ? heroLoopTime(l.pose as HeroPose, t - l.poseStart) : hopping ? u * 0.4 : t,
    time: t,
    beatPhase: b.beatPhase,
    runPhase: x / 192,
    speed: l.scroll === 0 ? 0 : speed,
    vy: hopping ? (u < 0.5 ? -600 : 600) : 0,
  });
  g.restore();
  greybox.drawFront(g, cam, b);
  beatDots(g, b, 60, 1042);
  label(g, `GREYBOX (generic framework) · light: ${l.light.key}`, 300, 1049, 16, 'rgba(255,255,255,0.85)', 'left');
}
