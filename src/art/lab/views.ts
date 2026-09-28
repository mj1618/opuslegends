/** Art-lab views. Each draws one 1920x1080 frame from the shared LabCtx. */
import { type BeatInfo, type BeatSim, hit } from '../core/beat';
import { type Ctx } from '../core/canvas';
import { TAU, fract } from '../core/math';
import { CRABBE_POSES, CRABBE_POSE_LEN, type CrabbePose, drawCrabbe } from '../crabbe';
import { drawBeacon } from '../entities/beacon';
import { drawBigJim } from '../entities/bigJim';
import { type ChoirAction, drawChoirCrab } from '../entities/choir';
import { drawGlassFloat, floatSwing } from '../entities/float';
import { type GullPose, drawCueGull } from '../entities/gull';
import { drawHerring } from '../entities/herring';
import { type ScanMark, type ScanState, drawScansion } from '../entities/scansion';
import { type SlickerAction, drawEchoSlicker } from '../entities/slicker';
import { drawUrchin } from '../entities/urchin';
import { drawWaveFlat, waveFlatTiming } from '../entities/waveFlat';
import type { LightingDirector } from '../world/lighting';
import { drawStress, drawWorldView } from './worldView';

export interface LabCtx {
  g: Ctx;
  sim: BeatSim;
  light: LightingDirector;
  pose: CrabbePose;
  poseStart: number;
  time: number;
  dt: number;
  paused: boolean;
  scroll: number;
  thumb: boolean;
  debug: boolean;
}

export type ViewId = 'crabbe' | 'entities' | 'world' | 'stress';

export const VIEWS: Record<ViewId, { label: string; help: string; draw: (l: LabCtx) => void }> = {
  crabbe: { label: 'Crabbe', help: 'Hero pose on the left (loops one-shots); every pose on the right; 25% silhouettes bottom.', draw: drawCrabbeView },
  entities: { label: 'Entities', help: 'Every entity in its states, animated on the simulated beat.', draw: drawEntitiesView },
  world: { label: 'World', help: 'Scrolling Stack Coast with Crabbe running on the beat. Pick lighting on the right.', draw: drawWorldView },
  stress: { label: 'Stress', help: 'Full world + 30 entities + 24 choir crabs. Watch the perf readout (top right).', draw: drawStress },
};

export function poseLoopTime(pose: CrabbePose, t: number): number {
  const len = CRABBE_POSE_LEN[pose];
  if (!len) return t;
  return t % (len + 0.7);
}

function studio(g: Ctx, top: string, bottom: string) {
  const gr = g.createLinearGradient(0, 0, 0, 1080);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fillRect(0, 0, 1920, 1080);
}

function label(g: Ctx, text: string, x: number, y: number, size = 20, col = 'rgba(30,28,40,0.75)') {
  g.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.fillStyle = col;
  g.fillText(text, x, y);
}

export function beatDots(g: Ctx, b: BeatInfo, x: number, y: number) {
  for (let i = 0; i < 4; i++) {
    const on = b.beatInBar === i;
    g.fillStyle = on ? `rgba(255,122,26,${0.4 + 0.6 * Math.exp(-b.beatPhase * 4)})` : 'rgba(40,40,60,0.25)';
    g.beginPath();
    g.arc(x + i * 22, y, on ? 8 : 6, 0, TAU);
    g.fill();
  }
  label(g, `${b.bpm} BPM · bar ${Math.floor(b.bar) + 1}`, x + 140, y + 7, 16);
}

function ground(g: Ctx, x0: number, x1: number, y: number) {
  g.fillStyle = 'rgba(60,50,40,0.1)';
  g.fillRect(x0, y, x1 - x0, 5);
}

function drawCrabbeView(l: LabCtx) {
  const g = l.g;
  const t = l.time;
  const b = l.sim.at(t);
  studio(g, '#BFE3F0', '#F6EBD9');
  // hero stage
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(440, 800, 380, 40, 0, 0, TAU);
  g.fill();
  const pt = poseLoopTime(l.pose, t - l.poseStart);
  const moving = l.pose === 'run' || l.pose === 'skim';
  drawCrabbe(g, 440, 800, {
    pose: l.pose,
    poseTime: pt,
    time: t,
    beatPhase: b.beatPhase,
    runPhase: (t * 1024) / 192,
    speed: moving ? 1024 : 0,
    vy: l.pose === 'hop' ? -500 + fract(t) * 1000 : l.pose === 'fall' ? 800 : 0,
    scale: 3,
    lookX: 300 * Math.cos(t * 0.6),
    lookY: -80 + 80 * Math.sin(t * 0.9),
    flash: l.pose === 'claw' ? Math.max(0, 1 - pt / 0.1) : 0,
  });
  label(g, l.pose.toUpperCase(), 440, 880, 34, 'rgba(30,28,40,0.8)');
  beatDots(g, b, 60, 50);
  // grid of every pose
  const cols = 4;
  CRABBE_POSES.forEach((pose, i) => {
    const cx = 1010 + (i % cols) * 230;
    const cy = 250 + Math.floor(i / cols) * 270;
    ground(g, cx - 100, cx + 100, cy);
    const mv = pose === 'run' || pose === 'skim';
    drawCrabbe(g, cx, cy, {
      pose,
      poseTime: poseLoopTime(pose, t + i * 0.13),
      time: t,
      beatPhase: b.beatPhase,
      runPhase: (t * 1024) / 192,
      speed: mv ? 1024 : 0,
      vy: pose === 'hop' ? -600 : pose === 'fall' ? 700 : 0,
      scale: 1.15,
    });
    label(g, pose, cx, cy + 34, 18);
  });
  // 25% readability strip: colour + pure silhouette
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(40, 960, 1840, 100);
  label(g, '25% scale', 110, 1016, 16);
  for (let i = 0; i < CRABBE_POSES.length; i++) {
    const pose = CRABBE_POSES[i];
    const st = { pose, poseTime: 0.05, time: t, beatPhase: b.beatPhase, runPhase: t * 5, speed: 0, scale: 0.25 };
    drawCrabbe(g, 220 + i * 70, 1030, st);
  }
  // pure black silhouettes via an offscreen + source-in (ctx.filter is unreliable on some GPUs)
  const sil = silCanvas();
  const sg = sil.getContext('2d')!;
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.clearRect(0, 0, sil.width, sil.height);
  for (let i = 0; i < 6; i++) {
    const pose = CRABBE_POSES[i];
    drawCrabbe(sg, 40 + i * 70, 60, { pose, poseTime: 0.05, time: t, beatPhase: b.beatPhase, runPhase: t * 5, scale: 0.25 });
  }
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = '#000';
  sg.fillRect(0, 0, sil.width, sil.height);
  sg.globalCompositeOperation = 'source-over';
  g.drawImage(sil, 1080, 970);
  label(g, 'silhouettes', 1560, 1016, 16);
}

let silC: HTMLCanvasElement | null = null;
function silCanvas(): HTMLCanvasElement {
  if (!silC) {
    silC = document.createElement('canvas');
    silC.width = 460;
    silC.height = 80;
  }
  return silC;
}

function drawEntitiesView(l: LabCtx) {
  const g = l.g;
  const t = l.time;
  const b = l.sim.at(t);
  studio(g, '#CFE8EE', '#EFE6D2');
  beatDots(g, b, 60, 1050);
  // --- row 1: rewards + hazard
  const y1 = 250;
  label(g, 'Herring (leap arc · collected)', 250, 60, 18);
  for (let i = 0; i < 5; i++) {
    const u = fract(t * 0.5 + i * 0.08);
    const x = 90 + u * 320;
    const y = y1 - Math.sin(u * Math.PI) * 150;
    const ang = Math.atan2(-Math.cos(u * Math.PI) * 150 * Math.PI, 320);
    drawHerring(g, x, y, { time: t, angle: ang, seed: i, shimmer: hit(b, 'piano', 0.2) });
  }
  const ct = fract(t / 1.2) * 1.2;
  drawHerring(g, 460, y1 - 30, { time: t, seed: 9, collected: ct < 0.6 ? undefined : ct - 0.6 });

  label(g, 'Glass floats (1-bar pendulum · glint · snip)', 740, 60, 18);
  const sw = floatSwing(b.beat, 0.55, 0);
  const glint = Math.max(0, 1 - Math.abs(fract((b.beat + 1) / 2) - 0) * 6);
  g.strokeStyle = '#4E3A2C';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(560, 90);
  g.lineTo(940, 90);
  g.stroke();
  drawGlassFloat(g, 620, 90, { time: t, angle: sw, rope: 110, glint });
  drawGlassFloat(g, 760, 90, { time: t, angle: floatSwing(b.beat, 0.4, 1), rope: 130, size: 'big', glow: Math.exp(-b.beatPhase * 4) });
  const bt = fract(t / 1.6) * 1.6;
  drawGlassFloat(g, 890, 90, { time: t, angle: 0, rope: 110, burst: bt > 0.8 ? bt - 0.8 : undefined, seed: 3 });

  label(g, 'Urchins (ground · netted)', 1130, 60, 18);
  ground(g, 1020, 1240, y1 + 40);
  drawUrchin(g, 1070, y1 + 18, { time: t, pulse: hit(b, 'kick', 0.1), seed: 0 });
  drawUrchin(g, 1150, y1 + 26, { time: t, pulse: hit(b, 'kick', 0.1), seed: 1, r: 16 });
  drawUrchin(g, 1210, y1 - 60, { time: t, pulse: hit(b, 'kick', 0.1), seed: 2, hangLen: 150 });

  label(g, 'Scansion marks (idle · glow · perfect)', 1560, 60, 18);
  g.fillStyle = '#F2EEE3';
  g.fillRect(1300, 90, 560, 250);
  g.fillStyle = '#2A2B33';
  g.fillRect(1300, 86, 560, 6);
  const marks: ScanMark[] = ['short', 'long', 'bar'];
  const states: ScanState[] = ['idle', 'glow', 'perfect'];
  marks.forEach((m, i) =>
    states.forEach((s, j) =>
      drawScansion(g, 1390 + j * 180, 150 + i * 80, { mark: m, state: s, t: fract(t / 1.5) * 1.5, time: t, material: i === 2 && j === 0 ? 'tar' : 'flint' }),
    ),
  );

  // --- row 2: cue gulls
  const y2 = 610;
  label(g, 'Cue Gull (idle/offbeat billow · windup · jab · flung · chorus)', 620, 380, 18);
  const poses: GullPose[] = ['idle', 'windup', 'jab', 'flung', 'chorus'];
  poses.forEach((p, i) => {
    const x = 140 + i * 235;
    ground(g, x - 80, x + 80, y2);
    const pt = p === 'windup' ? fract(t / 0.75) * 0.375 : p === 'jab' ? fract(t / 0.8) * 0.5 : p === 'flung' ? fract(t / 1.4) * 1.2 : t;
    drawCueGull(g, x, y2, { pose: p, poseTime: pt, time: t, beatPhase: b.beatPhase, seed: i, flag: p === 'chorus' ? '#FF7A1A' : undefined });
  });

  // echo slickers
  label(g, 'Echo Slicker (drift · hop · claw · clash · reflection)', 1500, 380, 18);
  const acts: SlickerAction[] = ['drift', 'hop', 'claw', 'clash', 'reflection'];
  acts.forEach((a, i) => {
    const x = 1250 + i * 135;
    const y = y2 - 20;
    const pt = a === 'hop' ? fract(t / 0.9) * 0.9 : a === 'claw' ? fract(t / 0.8) * 0.8 : a === 'clash' ? fract(t / 1.4) * 1.4 : t;
    if (a === 'reflection') {
      g.fillStyle = 'rgba(31,163,176,0.35)';
      g.fillRect(x - 60, y + 10, 120, 110);
      drawEchoSlicker(g, x, y + 14, { action: a, poseTime: pt, time: t, beatPhase: b.beatPhase, scale: 0.85 });
    } else drawEchoSlicker(g, x, y, { action: a, poseTime: pt, time: t, beatPhase: b.beatPhase, scale: 0.85 });
  });

  // --- row 3: wave flats, choir, beacon, big jim
  const y3 = 850;
  label(g, 'Wave Flats (A on 1&3 · B on 2&4 · clack telegraph)', 280, 690, 18);
  g.fillStyle = '#1FA3B0';
  g.fillRect(20, y3 + 40, 520, 200);
  g.fillStyle = '#E8FBF7';
  g.fillRect(20, y3 + 36, 520, 6);
  const A = waveFlatTiming(b.beat, 'A');
  const B = waveFlatTiming(b.beat, 'B');
  drawWaveFlat(g, 150, y3, { time: t, ...A, width: 190 });
  drawWaveFlat(g, 400, y3, { time: t, ...B, width: 190 });

  label(g, 'Choir crabs (idle · run · wave · HEY · pull · lantern)', 900, 690, 18);
  const acts2: ChoirAction[] = ['idle', 'run', 'wave', 'hey', 'pull'];
  ground(g, 600, 1180, y3 + 40);
  for (let i = 0; i < 12; i++) {
    const a = acts2[i % 5];
    const ph = a === 'idle' || a === 'hey' ? b.beatPhase : a === 'run' ? t * 5.3 : Math.abs(Math.sin(t * 3 + i * 0.4));
    drawChoirCrab(g, 630 + i * 46, y3 + 40 - (i % 2) * 6, { variant: i, action: a, phase: ph, facing: 1, lantern: i % 4 === 3 ? 0.8 : 0, time: t });
  }
  label(g, 'x1', 610, y3 + 70, 14);
  for (let i = 0; i < 4; i++)
    drawChoirCrab(g, 700 + i * 110, y3 + 150, { variant: i, action: 'wave', phase: fract(t * 0.8 + i * 0.2), scale: 1.8, time: t });

  label(g, 'Checkpoint beacon (unlit · lit)', 1300, 690, 18);
  ground(g, 1200, 1420, y3 + 160);
  drawBeacon(g, 1240, y3 + 160, { time: t, beatPhase: b.beatPhase, barPhase: b.barPhase, lit: 0 });
  const lt = fract(t / 3) * 3;
  drawBeacon(g, 1370, y3 + 160, { time: t, beatPhase: b.beatPhase, barPhase: b.barPhase, lit: Math.min(1, lt * 2), litTime: lt });

  label(g, 'BIG JIM (sketch) · wakes', 1680, 690, 18);
  const wake = Math.max(0, Math.min(1, Math.sin(t * 0.5) * 1.2 + 0.5));
  drawBigJim(g, 1690, y3 + 200, { time: t, beatPhase: b.beatPhase, wake, scale: 0.2 });
}
