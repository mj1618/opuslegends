/**
 * Lab world preview: a looping 32-beat test course on the Stack Coast. Crabbe scuttles at run
 * speed (384 px/beat), hops gaps / urchins / wave flats, claws a Cue Gull; the choir trails him.
 * Also the Stress view (same course, 30+ entities + 24 choir crabs).
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { clamp01, fract, hash } from '../core/math';
import { type CrabbePose, drawCrabbe } from '../crabbe';
import { drawBeacon } from '../entities/beacon';
import { drawChoirCrab, warmChoir } from '../entities/choir';
import { drawGlassFloat, floatSwing } from '../entities/float';
import { drawCueGull } from '../entities/gull';
import { drawHerring } from '../entities/herring';
import { drawScansion } from '../entities/scansion';
import { drawEchoSlicker } from '../entities/slicker';
import { drawUrchin } from '../entities/urchin';
import { drawWaveFlat, waveFlatTiming } from '../entities/waveFlat';
import { type ArtCamera, SEA_Y, layerView, pushLayer } from '../world/camera';
import { StackCoast } from '../world/stackCoast';
import { type Rect, drawBoardwalk, drawChalkGround, drawPlatform } from '../world/terrain';
import { beatDots, type LabCtx } from './views';

const PPB = 384;
const COURSE = 32 * PPB; // 12288
const DEEP = SEA_Y + 260;

interface Solid {
  kind: 'chalk' | 'board' | 'ledge' | 'crate' | 'flat';
  r: Rect;
  capL?: boolean;
  capR?: boolean;
  set?: 'A' | 'B';
  seed?: number;
}

const solids: Solid[] = [
  { kind: 'chalk', r: { x: -300, y: 0, w: 2900, h: DEEP }, capL: false, seed: 0 },
  { kind: 'flat', r: { x: 2830, y: 0, w: 200, h: 0 }, set: 'A' },
  { kind: 'flat', r: { x: 3230, y: 0, w: 200, h: 0 }, set: 'B' },
  { kind: 'chalk', r: { x: 3500, y: 0, w: 1900, h: DEEP }, seed: 1 },
  { kind: 'board', r: { x: 5400, y: 0, w: 1800, h: DEEP } },
  { kind: 'crate', r: { x: 6360, y: -110, w: 220, h: 110 } },
  { kind: 'ledge', r: { x: 7330, y: -130, w: 280, h: 40 }, seed: 2 },
  { kind: 'chalk', r: { x: 7800, y: 0, w: 1000, h: DEEP }, seed: 2 },
  { kind: 'chalk', r: { x: 8800, y: -110, w: 1400, h: DEEP + 110 }, seed: 3 },
  { kind: 'chalk', r: { x: 10700, y: 0, w: 1900, h: DEEP }, capR: false, seed: 4 },
];
// sea-level surf edges
const edges = [2600, 3500, 7200, 7800, 10200, 10700];

/** jumps: [takeoffX, landX, peakHeight] (course coords) */
const jumps: [number, number, number][] = [
  [1080, 1480, 130],
  [2480, 2930, 170],
  [2930, 3330, 150],
  [3330, 3640, 140],
  [7080, 7470, 210],
  [7470, 7920, 150],
  [8600, 8930, 190],
  [10080, 10820, 220],
];
const clawAt = [4520, 6160, 9280];

function groundAt(x: number): number | null {
  let best: number | null = null;
  for (const s of solids) {
    if (s.kind === 'flat') continue;
    if (x >= s.r.x && x <= s.r.x + s.r.w) best = best === null ? s.r.y : Math.min(best, s.r.y);
  }
  return best;
}

function crabState(x: number, speed: number): { y: number; pose: CrabbePose; pt: number; vy: number } {
  for (const [a, bb, h] of jumps) {
    if (x >= a && x < bb) {
      const u = (x - a) / (bb - a);
      const y0 = groundAt(a) ?? 0;
      const y1 = groundAt(bb) ?? 0;
      const y = y0 + (y1 - y0) * u - 4 * h * u * (1 - u);
      const vy = (-4 * h * (1 - 2 * u) * speed) / (bb - a);
      return { y, pose: u < 0.5 ? 'hop' : 'fall', pt: ((x - a) / speed) % 10, vy };
    }
    if (x >= bb && x < bb + 180) return { y: groundAt(bb) ?? 0, pose: 'land', pt: (x - bb) / speed, vy: 0 };
  }
  for (const c of clawAt) if (x >= c && x < c + 430) return { y: groundAt(x) ?? 0, pose: 'claw', pt: (x - c) / speed, vy: 0 };
  return { y: groundAt(x) ?? 0, pose: 'run', pt: 0, vy: 0 };
}

let coast: StackCoast | null = null;

function drawCourse(g: Ctx, cam: ArtCamera, b: BeatInfo, t: number, lap: number, crabX: number, stress: boolean) {
  const L = coast!.L;
  const ver = coast!.light.version;
  const off = lap * COURSE;
  const style = { light: L, version: ver };
  // terrain
  for (const s of solids) {
    const r = { ...s.r, x: s.r.x + off };
    if (r.x > cam.x + 1400 || r.x + r.w < cam.x - 1400) continue;
    if (s.kind === 'chalk') drawChalkGround(g, r, { ...style, seed: s.seed, capL: s.capL, capR: s.capR });
    else if (s.kind === 'board') drawBoardwalk(g, r, style);
    else if (s.kind === 'ledge') drawPlatform(g, r, { ...style, type: 'ledge', seed: s.seed });
    else if (s.kind === 'crate') drawPlatform(g, r, { ...style, type: 'crate' });
    else if (s.kind === 'flat') drawWaveFlat(g, r.x + r.w / 2, r.y, { time: t, width: r.w, ...waveFlatTiming(b.beat, s.set!) });
  }
  const X = (x: number) => x + off;
  const vis = (x: number) => X(x) > cam.x - 1300 && X(x) < cam.x + 1300;
  // scansion: bar lines on every downbeat + marks before hazards
  for (let bar = 0; bar < 8; bar++) {
    const x = bar * 4 * PPB + 200;
    const gy = groundAt(x);
    if (gy === null || !vis(x)) continue;
    const near = Math.abs(X(x) - crabX) < 60;
    drawScansion(g, X(x), gy + 42, { mark: 'bar', state: near ? 'glow' : 'idle', t: 0, time: t, scale: 0.7 });
  }
  const marks: [number, 'short' | 'long'][] = [
    [1080, 'short'],
    [2480, 'short'],
    [2930, 'short'],
    [3330, 'long'],
    [4520, 'long'],
  ];
  for (const [mx, m] of marks) {
    const gy = groundAt(mx) ?? 0;
    if (!vis(mx) || groundAt(mx) === null) continue;
    const d = crabX - X(mx);
    drawScansion(g, X(mx), gy + 60, { mark: m, state: d > 0 && d < 400 ? 'perfect' : Math.abs(d) < 80 ? 'glow' : 'idle', t: clamp01(d / 1024), time: t, scale: 0.8 });
  }
  // urchins
  for (const ux of [1280]) if (vis(ux)) drawUrchin(g, X(ux), -22, { time: t, pulse: hit(b, 'kick', 0.1), seed: 1 });
  if (vis(10450)) drawUrchin(g, X(10450), -120, { time: t, pulse: hit(b, 'kick', 0.1), seed: 2, hangLen: 300 });
  // herring arcs along the jumps
  for (const [a, bb, h] of jumps) {
    if (!vis(a) && !vis(bb)) continue;
    for (let i = 1; i < 6; i++) {
      const u = i / 6;
      const hx = a + (bb - a) * u;
      const y0 = groundAt(a) ?? 0;
      const y1 = groundAt(bb) ?? 0;
      const hy = y0 + (y1 - y0) * u - 4 * h * u * (1 - u) - 70;
      const d = crabX - X(hx);
      drawHerring(g, X(hx), hy + Math.sin(t * 5 + i) * 4, {
        time: t,
        angle: Math.atan2(-4 * h * (1 - 2 * u), bb - a) * 0.6,
        seed: i + a,
        collected: d > 0 && d < 400 ? d / 1024 : undefined,
      });
    }
  }
  // float line on a mast (small floats on the backbeats)
  if (vis(4100)) {
    const mx = X(4000);
    g.fillStyle = '#2A211B';
    g.fillRect(mx - 7, -330, 14, 330);
    g.fillRect(mx + 460 - 7, -330, 14, 330);
    g.strokeStyle = '#4E3A2C';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(mx, -320);
    g.quadraticCurveTo(mx + 230, -290, mx + 460, -320);
    g.stroke();
    for (let i = 0; i < 3; i++)
      drawGlassFloat(g, mx + 110 + i * 120, -306 + (i === 1 ? 8 : 4), {
        time: t,
        angle: floatSwing(b.beat, 0.5, 1 + i),
        rope: 150,
        size: i === 1 ? 'big' : 'small',
        glint: Math.max(0, 1 - Math.abs(fract((b.beat - i) / 2) - 0.5) * 8),
      });
  }
  // beacon
  if (vis(3720)) drawBeacon(g, X(3720), 0, { time: t, beatPhase: b.beatPhase, barPhase: b.barPhase, lit: crabX > X(3720) ? 1 : 0, litTime: (crabX - X(3720)) / 1024 });
  // gulls (on ground / crates), flung when clawed
  for (const [gx, gy, c] of [
    [4800, 0, 4520],
    [6470, -110, 6160],
    [9560, -110, 9280],
  ] as [number, number, number][]) {
    if (!vis(gx) && !vis(gx + 800)) continue;
    const d = crabX - X(c);
    const pose = d > 0 ? 'flung' : d > -384 ? 'windup' : 'idle';
    drawCueGull(g, X(gx), gy, { pose, poseTime: pose === 'flung' ? d / 1024 : pose === 'windup' ? (d + 384) / 1024 : t, time: t, beatPhase: b.beatPhase, seed: gx });
  }
  // echo slicker
  if (vis(9900)) drawEchoSlicker(g, X(9900), -130, { action: b.beatInBar === 2 ? 'hop' : 'drift', poseTime: b.beatPhase * b.spb, time: t, beatPhase: b.beatPhase });
  if (stress) {
    // extra entity load: herring rows + urchins + floats + gulls across the whole course
    for (let i = 0; i < 40; i++) {
      const hx = i * 300 + 150;
      if (!vis(hx)) continue;
      drawHerring(g, X(hx), -260 - Math.sin(i) * 60, { time: t, seed: i, angle: Math.sin(t + i) * 0.4 });
    }
    for (let i = 0; i < 10; i++) {
      const ux = 1700 + i * 1000;
      if (!vis(ux) || groundAt(ux) === null) continue;
      drawUrchin(g, X(ux), (groundAt(ux) ?? 0) - 22, { time: t, pulse: hit(b, 'kick', 0.1), seed: i });
    }
    for (let i = 0; i < 12; i++) {
      const fx = 600 + i * 1000;
      if (!vis(fx)) continue;
      drawGlassFloat(g, X(fx), -520, { time: t, angle: floatSwing(b.beat, 0.5, i), rope: 120, glint: 0 });
      if (groundAt(fx + 300) !== null) drawCueGull(g, X(fx + 300), groundAt(fx + 300) ?? 0, { pose: 'idle', poseTime: t, time: t, beatPhase: b.beatPhase, seed: i });
    }
  }
}

function frame(l: LabCtx, stress: boolean) {
  const g = l.g;
  if (!coast) {
    coast = new StackCoast(l.light);
    warmChoir();
  }
  const t = l.time;
  const b = l.sim.at(t);
  const speed = (PPB * l.sim.bpm) / 60;
  const crabCourseX = (t * speed * l.scroll) % COURSE;
  const lap = Math.floor((t * speed * l.scroll) / COURSE);
  const cs = crabState(crabCourseX, speed);
  const crabX = crabCourseX + lap * COURSE;
  const cam: ArtCamera = { x: crabX + 380, y: -250 + Math.min(0, cs.y * 0.3), zoom: 0.95 + hit(b, 'kick', 0.1) * 0.004 };
  TintBakeFrame();
  coast.drawBackground(g, cam, b);
  coast.drawSeaBack(g, cam, b, { edges: [] });
  const v = layerView(cam, 1);
  pushLayer(g, v);
  for (const lp of [lap - 1, lap, lap + 1]) drawCourse(g, cam, b, t, lp, crabX, stress);
  // choir trails Crabbe on the ground
  const nChoir = stress ? 24 : 12;
  for (let i = nChoir - 1; i >= 0; i--) {
    const cx = crabX - 90 - i * 30 - (i % 3) * 6;
    const gy = groundAt(((cx % COURSE) + COURSE) % COURSE);
    if (gy === null) continue;
    const act = b.beatInBar === 3 && b.beatPhase < 0.5 ? 'hey' : 'run';
    drawChoirCrab(g, cx, gy + (i % 2) * 3, { variant: i, action: act, phase: act === 'run' ? (crabX / 192 + i * 0.3) : b.beatPhase, lantern: i % 5 === 2 ? 0.6 : 0, time: t });
  }
  drawCrabbe(g, crabX, cs.y, {
    pose: l.scroll === 0 ? l.pose : cs.pose,
    poseTime: l.scroll === 0 ? t - l.poseStart : cs.pt,
    time: t,
    beatPhase: b.beatPhase,
    runPhase: crabX / 192,
    speed: l.scroll === 0 ? 0 : speed,
    vy: cs.vy,
    flash: cs.pose === 'claw' ? Math.max(0, 1 - cs.pt / 0.1) : 0,
  });
  g.restore();
  coast.drawSeaFront(g, cam, b, { edges: edges.flatMap((e) => [e + lap * COURSE, e + (lap + 1) * COURSE, e + (lap - 1) * COURSE]) });
  coast.drawForeground(g, cam, b);
  // HUD-ish labels
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(24, 1020, 520, 44);
  g.fillStyle = '#fff';
  g.font = '600 18px ui-sans-serif, system-ui, sans-serif';
  g.textAlign = 'left';
  g.fillText(`${stress ? 'STRESS · ' : ''}light: ${coast.light.key} · ${cs.pose}`, 40, 1049);
  g.restore();
  beatDots(g, b, 600, 1042);
  void hash;
}

function TintBakeFrame() {
  /* lab main resets the relight budget each frame */
}

export function drawWorldView(l: LabCtx): void {
  frame(l, false);
}

export function drawStress(l: LabCtx): void {
  frame(l, true);
}
