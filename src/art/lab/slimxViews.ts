/**
 * Art lab: SLIM REDESIGN candidates (src/art/grindhouse/slimx). Tab "Slim ×3".
 *   URL: view=slimx&style=ink|hose|flat&layout=poses|world&bg=street|bar   keys: A / B / C switch the style
 *   poses  — studio: the current pose big (x3), every pose at IN-GAME scale (x1.32), strike filmstrip, 25% check
 *   world  — the real 42nd St / honky-tonk scene at the game's framing (zoom 1.2, Slim scale 1.1 -> ~177 px), all
 *            three candidates side by side through the game's hero pass (ink shadow + cream rim) and the film pass
 */
import type { Ctx } from '../core/canvas';
import { TAU, fract } from '../core/math';
import { FilmPass } from '../fx/film';
import { drawBarFloor, makeBar } from '../grindhouse/bar';
import { SLIM_POSES, SLIM_POSE_LEN, type SlimPose, type SlimState } from '../grindhouse/slim';
import { type StreetScene, drawStreetGround, makeStreet } from '../grindhouse/street';
import { SLIM_STYLES, SLIM_STYLE_NAMES, type SlimStyle, drawSlimX } from '../grindhouse/slimx';
import { type ArtCamera, layerView, pushLayer } from '../world/camera';
import type { ParallaxScene } from '../world/parallax';
import { loopTime } from './genericViews';
import { type LabCtx, beatDots } from './views';

const q = new URLSearchParams(location.search);
let style: SlimStyle = (SLIM_STYLES as string[]).includes(q.get('style') ?? '') ? (q.get('style') as SlimStyle) : 'ink';
window.addEventListener('keydown', (e) => {
  const i = ['a', 'b', 'c'].indexOf(e.key.toLowerCase());
  if (i >= 0 && !e.metaKey && !e.ctrlKey) style = SLIM_STYLES[i];
});

function studio(g: Ctx) {
  const gr = g.createLinearGradient(0, 0, 0, 1080);
  gr.addColorStop(0, '#E9D8B4');
  gr.addColorStop(1, '#CDB690');
  g.fillStyle = gr;
  g.fillRect(0, 0, 1920, 1080);
}

function label(g: Ctx, text: string, x: number, y: number, size = 18, col = 'rgba(30,28,40,0.8)', align: CanvasTextAlign = 'center') {
  g.font = `700 ${size}px ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = align;
  g.fillStyle = col;
  g.fillText(text, x, y);
}

const vyOf = (p: string) => (p === 'hop' ? -700 : p === 'fall' ? 800 : 0);
const MOVING = ['run', 'slide'];

function stateFor(pose: string, t: number, pt: number, b: { beatPhase: number; beat: number }, scale: number, extra: Partial<SlimState> = {}): SlimState {
  return {
    pose: pose as SlimPose,
    poseTime: pt,
    time: t,
    beatPhase: b.beatPhase,
    beat: b.beat,
    runPhase: (t * 1024) / 192,
    speed: MOVING.includes(pose) ? 1024 : 0,
    vy: vyOf(pose),
    scale,
    ...extra,
  };
}

// ------------------------------------------------------------------------------ rim pass (mirrors render/heroPass.ts)

class RimPass {
  private cv = document.createElement('canvas');
  private tint = document.createElement('canvas');
  private ink = document.createElement('canvas');
  rim = 'rgb(255,238,204)';
  rimA = 0.85;
  draw(ctx: CanvasRenderingContext2D, px: number, py: number, paint: (g: CanvasRenderingContext2D) => void): void {
    const m = ctx.getTransform();
    const sc = Math.hypot(m.a, m.b);
    const W = 300;
    const UP = 330;
    const DN = 90;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [wx, wy] of [
      [px - W, py - UP],
      [px + W, py - UP],
      [px - W, py + DN],
      [px + W, py + DN],
    ]) {
      const dx = m.a * wx + m.c * wy + m.e;
      const dy = m.b * wx + m.d * wy + m.f;
      x0 = Math.min(x0, dx);
      y0 = Math.min(y0, dy);
      x1 = Math.max(x1, dx);
      y1 = Math.max(y1, dy);
    }
    const w = Math.ceil(x1 - x0) + 8;
    const h = Math.ceil(y1 - y0) + 8;
    for (const c of [this.cv, this.tint, this.ink]) {
      if (c.width < w) c.width = w;
      if (c.height < h) c.height = h;
    }
    const g = this.cv.getContext('2d')!;
    const ox = Math.floor(x0) - 4;
    const oy = Math.floor(y0) - 4;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.setTransform(m.a, m.b, m.c, m.d, m.e - ox, m.f - oy);
    paint(g);
    for (const [c, col] of [
      [this.tint, this.rim],
      [this.ink, 'rgb(13,8,10)'],
    ] as [HTMLCanvasElement, string][]) {
      const k = c.getContext('2d')!;
      k.setTransform(1, 0, 0, 1, 0, 0);
      k.globalCompositeOperation = 'source-over';
      k.clearRect(0, 0, w, h);
      k.drawImage(this.cv, 0, 0, w, h, 0, 0, w, h);
      k.globalCompositeOperation = 'source-in';
      k.fillStyle = col;
      k.fillRect(0, 0, w, h);
      k.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const d = Math.max(1.5, 2.6 * sc);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(this.ink, 0, 0, w, h, ox + d * 1.3, oy + d * 1.5, w, h);
    ctx.globalAlpha = this.rimA;
    ctx.drawImage(this.tint, 0, 0, w, h, ox - d, oy - d, w, h);
    ctx.globalAlpha = 0.45 * this.rimA;
    ctx.drawImage(this.tint, 0, 0, w, h, ox + d * 0.6, oy - d * 1.3, w, h);
    ctx.globalAlpha = 1;
    ctx.drawImage(this.cv, 0, 0, w, h, ox, oy, w, h);
    ctx.restore();
  }
}
const rimPass = new RimPass();

// ------------------------------------------------------------------------------ poses layout

function drawPoses(l: LabCtx, st: SlimStyle): void {
  const g = l.g;
  const t = l.time;
  const b = l.sim.at(t);
  studio(g);
  beatDots(g, b, 60, 50);
  label(g, SLIM_STYLE_NAMES[st], 60, 110, 30, 'rgba(30,28,40,0.9)', 'left');
  label(g, 'keys A / B / C switch candidate · pose buttons drive the big one · grid = IN-GAME scale (x1.32)', 60, 140, 15, 'rgba(30,28,40,0.6)', 'left');
  const pose = SLIM_POSES.includes(l.pose as SlimPose) ? l.pose : 'idle';
  const pt = loopTime(SLIM_POSE_LEN, pose, t - l.poseStart);
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.beginPath();
  g.ellipse(420, 820, 360, 36, 0, 0, TAU);
  g.fill();
  drawSlimX(st, g, 420, 820, stateFor(pose, t, pt, b, 3, { bones: l.debug, lookX: 300, lookY: -40 }));
  label(g, pose.toUpperCase(), 420, 900, 34);
  const cols = 4;
  SLIM_POSES.forEach((p, i) => {
    const cx = 1010 + (i % cols) * 235;
    const cy = 330 + Math.floor(i / cols) * 265;
    g.fillStyle = 'rgba(60,50,40,0.14)';
    g.fillRect(cx - 105, cy, 210, 4);
    const air = p === 'hop' || p === 'fall' || p === 'dead' ? -30 : 0;
    drawSlimX(st, g, cx, cy + air, stateFor(p, t, loopTime(SLIM_POSE_LEN, p, t + i * 0.13), b, 1.32));
    label(g, p, cx, cy + 28, 16);
  });
  // strike filmstrip (smear review)
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fillRect(40, 950, 1840, 120);
  label(g, 'strike (s)', 90, 1010, 15);
  [0, 0.02, 0.04, 0.07, 0.1, 0.14, 0.2, 0.28, 0.4].forEach((tt, i) => {
    drawSlimX(st, g, 250 + i * 118, 1045, stateFor('strike', t, tt, { beatPhase: 0.5, beat: 0 }, 0.62, { speed: 0 }));
    label(g, tt.toFixed(2), 250 + i * 118, 1068, 12);
  });
  label(g, '25%', 1370, 1010, 15);
  ['idle', 'run', 'hop', 'strike', 'heave', 'slide'].forEach((p, i) =>
    drawSlimX(st, g, 1430 + i * 72, 1045, stateFor(p, t, p === 'strike' || p === 'heave' ? 0.05 : t, b, 0.33)),
  );
}

// ------------------------------------------------------------------------------ world layout

let street: StreetScene | null = null;
let bar: ParallaxScene | null = null;
const film = new FilmPass();
const BLOCK = 1536;

function drawWorld(l: LabCtx, bg: 'street' | 'bar'): void {
  const g = l.g;
  if (!street) street = makeStreet(l.light);
  if (!bar) bar = makeBar(l.light);
  const scene = bg === 'bar' ? bar : street;
  const t = l.time;
  const b = l.sim.at(t);
  // the game's framing: FRAMING zoom 1.2, ground at ~0.66 of the screen
  const cam: ArtCamera = { x: 2400, y: -205, zoom: 1.2 };
  const w = film.weave(b);
  g.save();
  g.translate(w.x, w.y);
  scene.drawBack(g, cam, b);
  const v = layerView(cam, 1);
  pushLayer(g, v);
  const L = scene.L;
  for (let kk = Math.floor(v.x0 / BLOCK) - 1; kk <= Math.floor(v.x1 / BLOCK) + 1; kk++) {
    const r = { x: kk * BLOCK - 40, y: 0, w: BLOCK - 20, h: 500 };
    if (bg === 'bar') drawBarFloor(g, r, { light: L });
    else drawStreetGround(g, r, { light: L, version: scene.light.version });
  }
  const poses: [string, number, number][] = [
    ['idle', 0, 0],
    ['run', 0, -1],
    ['strike', 0, 0.045],
    ['hop', -70, 0.1],
  ];
  const rim = L.rim ?? [1, 0.93, 0.8];
  rimPass.rim = `rgb(${Math.round(255 * 0.55 + rim[0] * 0.45)},${Math.round(240 * 0.55 + rim[1] * 0.45)},${Math.round(214 * 0.55 + rim[2] * 0.45)})`;
  SLIM_STYLES.forEach((st, si) => {
    const gx = cam.x - 660 + si * 540;
    poses.forEach(([p, y, pt], i) => {
      const x = gx + i * 118 - 170;
      const s = stateFor(p, t, pt < 0 ? t : pt, b, 1.1, { speed: p === 'run' ? 1024 : 0 });
      const lift = -y;
      g.fillStyle = `rgba(13,10,8,${0.4 * (1 - lift / 400)})`;
      g.beginPath();
      g.ellipse(x, 2, 46 * (1 - lift / 800), 9, 0, 0, TAU);
      g.fill();
      rimPass.draw(g as CanvasRenderingContext2D, x, y, (k) => drawSlimX(st, k, x, y, s));
    });
  });
  g.restore();
  scene.drawFront(g, cam, b);
  g.restore();
  film.draw(g, b);
  SLIM_STYLES.forEach((st, si) => {
    const sx = 960 + (-660 + si * 540) * 1.2;
    g.fillStyle = 'rgba(20,14,10,0.7)';
    g.fillRect(sx - 230, 1010, 460, 44);
    label(g, SLIM_STYLE_NAMES[st], sx, 1040, 20, '#F4EFE2');
  });
  label(g, `IN-GAME SCALE · ${bg === 'bar' ? 'honky-tonk' : '42nd St'} · hero pass + film pass`, 40, 60, 22, '#F4EFE2', 'left');
}

export function drawSlimxView(l: LabCtx): void {
  const layout = q.get('layout') ?? 'poses';
  if (layout === 'world') drawWorld(l, q.get('bg') === 'bar' ? 'bar' : 'street');
  else drawPoses(l, style);
  void fract;
}
