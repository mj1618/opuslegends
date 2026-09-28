/**
 * Glass fishing float in rope netting (Glass-Float Snip, DESIGN §5.1). Sea-glass green = reward.
 * Hangs from (ax, ay) on a rope of `rope` px, swinging by `angle` (radians, 0 = straight down).
 * The engine owns the pendulum; this just draws it. `floatBob(beat)` gives the 1-bar pendulum.
 */
import { type Ctx, drawSprite, sprite } from '../core/canvas';
import { drawGlow, sparkle } from '../core/draw';
import { TAU, clamp01, easeOut, hash } from '../core/math';
import { PAL } from '../palette';
import { drawHerring } from './herring';

export interface FloatState {
  time: number;
  /** pendulum angle, radians (0 = hanging straight down) */
  angle: number;
  /** rope length px */
  rope: number;
  size?: 'small' | 'big';
  /** 0..1 telegraph glint (1 beat before the bottom of the swing) */
  glint?: number;
  /** 0..1 lantern glow (carried by the choir / beat glow) */
  glow?: number;
  /** seconds since snipped (undefined = intact). Burst lasts ~0.6 s. */
  burst?: number;
  seed?: number;
}

/** Pendulum angle with a 1-bar period: bottom of the swing (angle 0) on beats phase+0 and phase+2. */
export function floatSwing(beat: number, amp = 0.55, phaseBeats = 0): number {
  return amp * Math.sin(((beat - phaseBeats) / 4) * TAU);
}

function ballSprite(R: number) {
  const P = R + 10;
  return sprite(`float:${R}`, P * 2, P * 2, P, P, (g) => {
    // glass body
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.lineWidth = 6;
    g.strokeStyle = PAL.outline;
    g.stroke();
    const gr = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R);
    gr.addColorStop(0, '#E4FFF2');
    gr.addColorStop(0.35, PAL.seaGlass);
    gr.addColorStop(0.8, '#3FB58A');
    gr.addColorStop(1, '#2A8F72');
    g.fillStyle = gr;
    g.fill();
    // inner refraction crescent
    g.save();
    g.beginPath();
    g.arc(0, 0, R - 1, 0, TAU);
    g.clip();
    g.fillStyle = 'rgba(200,255,230,0.55)';
    g.beginPath();
    g.ellipse(R * 0.18, R * 0.55, R * 0.62, R * 0.28, -0.25, 0, TAU);
    g.fill();
    // rope netting (curved diamonds)
    g.strokeStyle = '#6B4F38';
    g.lineWidth = 2.2;
    for (let i = -3; i <= 3; i++) {
      const o = (i / 3.2) * R;
      g.beginPath();
      g.moveTo(o - R, -R);
      g.bezierCurveTo(o - R * 0.2, -R * 0.4, o + R * 0.2, R * 0.4, o + R, R);
      g.stroke();
      g.beginPath();
      g.moveTo(o + R, -R);
      g.bezierCurveTo(o + R * 0.2, -R * 0.4, o - R * 0.2, R * 0.4, o - R, R);
      g.stroke();
    }
    // knots
    g.fillStyle = '#8A6A4F';
    for (let i = 0; i < 9; i++) {
      const a = hash(i * 5) * TAU;
      const d = hash(i * 9 + 2) * R * 0.8;
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, 1.8, 0, TAU);
      g.fill();
    }
    g.restore();
    // specular
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.ellipse(-R * 0.38, -R * 0.42, R * 0.26, R * 0.14, -0.7, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(-R * 0.08, -R * 0.62, R * 0.06, 0, TAU);
    g.fill();
    // rim light
    g.strokeStyle = 'rgba(220,255,240,0.8)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, R - 3, 0.2, 1.3);
    g.stroke();
    // collar
    g.beginPath();
    g.ellipse(0, -R + 1, R * 0.3, 5, 0, 0, TAU);
    g.lineWidth = 4;
    g.strokeStyle = PAL.outline;
    g.stroke();
    g.fillStyle = PAL.wood;
    g.fill();
  });
}

/** Just the glass ball (for choir lanterns etc.): centre (x,y), radius 25 (small) or 38 (big). */
export function drawFloatBall(g: Ctx, x: number, y: number, big = false, glow = 0.5, rot = 0): void {
  const R = big ? 38 : 25;
  drawGlow(g, x, y, PAL.seaGlass, R * 2.8, 0.25 + glow * 0.65);
  drawSprite(g, ballSprite(R), x, y, rot);
}

export function drawGlassFloat(g: Ctx, ax: number, ay: number, s: FloatState): void {
  const R = s.size === 'big' ? 38 : 25;
  const bx = ax + Math.sin(s.angle) * s.rope;
  const by = ay + Math.cos(s.angle) * s.rope;
  const cx = bx + Math.sin(s.angle) * R;
  const cy = by + Math.cos(s.angle) * R;
  const burst = s.burst;
  // rope
  g.lineCap = 'round';
  if (burst === undefined || burst < 0) {
    g.strokeStyle = PAL.outline;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.stroke();
    g.strokeStyle = '#A9865F';
    g.lineWidth = 2.6;
    g.stroke();
    const glow = s.glow ?? 0;
    drawGlow(g, cx, cy, PAL.seaGlass, R * 2.6, 0.25 + glow * 0.6);
    drawSprite(g, ballSprite(R), cx, cy, -s.angle);
    const gl = s.glint ?? 0;
    if (gl > 0.01) sparkle(g, cx - R * 0.4, cy - R * 0.45, R * 0.9 * gl, s.time * 3, gl);
    return;
  }
  // snipped: rope end recoils, glass shards + herring burst, chime ring
  const t = burst;
  const k = clamp01(t / 0.6);
  const rl = s.rope * (1 - easeOut(clamp01(t / 0.25)) * 0.6);
  g.strokeStyle = '#A9865F';
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(ax, ay);
  g.quadraticCurveTo(ax + Math.sin(t * 30) * 10 * (1 - k), ay + rl * 0.5, ax + Math.sin(s.angle) * rl * 0.4, ay + rl);
  g.stroke();
  if (t < 0.35) {
    g.save();
    g.globalAlpha = 1 - t / 0.35;
    g.strokeStyle = '#FFFFFF';
    g.lineWidth = 4 * (1 - t / 0.35);
    g.beginPath();
    g.arc(cx, cy, R + 60 * easeOut(t / 0.35), 0, TAU);
    g.stroke();
    g.restore();
    drawGlow(g, cx, cy, PAL.seaGlass, R * 4, 1 - t / 0.35);
  }
  const seed = s.seed ?? 1;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + hash(i + seed) * 0.5;
    const v = 240 + hash(i * 3 + seed) * 220;
    const px = cx + Math.cos(a) * v * t;
    const py = cy + Math.sin(a) * v * t + 900 * t * t;
    const sz = (4 + hash(i * 7) * 6) * (1 - k);
    if (sz < 0.3) continue;
    g.save();
    g.translate(px, py);
    g.rotate(t * 14 + i);
    g.beginPath();
    g.moveTo(-sz, -sz * 0.6);
    g.lineTo(sz, -sz * 0.2);
    g.lineTo(-sz * 0.2, sz);
    g.closePath();
    g.fillStyle = i % 3 ? PAL.seaGlass : '#E4FFF2';
    g.fill();
    g.strokeStyle = PAL.outline;
    g.lineWidth = 1.2;
    g.stroke();
    g.restore();
  }
  for (let i = 0; i < 3; i++) {
    const vx = (i - 1) * 160;
    const vy = -420 + i * 30;
    drawHerring(g, cx + vx * t, cy + vy * t + 1000 * t * t, {
      time: s.time,
      angle: Math.atan2(vy + 2000 * t, vx) ,
      seed: i + seed,
      scale: 0.8,
    });
  }
}
