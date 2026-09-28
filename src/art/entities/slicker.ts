/**
 * Echo Slicker (DESIGN §6.1): an EMPTY yellow oilskin + sou'wester drifting with sleeves flapping;
 * the only face is a pale wax-sheened mask with MAGENTA pupils (danger).
 *
 * action: 'drift' (idle hover) · 'hop' (echoes your hop) · 'claw' (echoes your claw: right sleeve
 * punches up-forward) · 'clash' (unison CLACK: the coat collapses, the mask spins away) ·
 * 'reflection' (harmless pool reflection, drawn upside-down + rippled below the origin).
 * Origin = hem centre at hover height. ~120 px tall.
 */
import { type Ctx } from '../core/canvas';
import { inkFill, star4 } from '../core/draw';
import { TAU, bump, clamp01, easeOut, smooth } from '../core/math';
import { PAL } from '../palette';

export type SlickerAction = 'drift' | 'hop' | 'claw' | 'clash' | 'reflection';

export interface SlickerState {
  action: SlickerAction;
  poseTime: number;
  time: number;
  beatPhase?: number;
  facing?: 1 | -1;
  alpha?: number;
  scale?: number;
}

function sleeve(g: Ctx, sx: number, sy: number, ex: number, ey: number, time: number, ph: number) {
  const mx = (sx + ex) / 2 + Math.sin(time * 7 + ph) * 5;
  const my = (sy + ey) / 2 + Math.cos(time * 6 + ph) * 4;
  g.lineCap = 'round';
  g.strokeStyle = PAL.outline;
  g.lineWidth = 22;
  g.beginPath();
  g.moveTo(sx, sy);
  g.quadraticCurveTo(mx, my, ex, ey);
  g.stroke();
  g.strokeStyle = PAL.slicker;
  g.lineWidth = 16;
  g.stroke();
  g.strokeStyle = 'rgba(255,240,170,0.6)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(sx, sy - 4);
  g.quadraticCurveTo(mx, my - 5, ex, ey - 4);
  g.stroke();
  // empty cuff (dark opening)
  const a = Math.atan2(ey - my, ex - mx);
  g.save();
  g.translate(ex, ey);
  g.rotate(a);
  g.beginPath();
  g.ellipse(2, 0, 4, 8.5, 0, 0, TAU);
  inkFill(g, '#2A2016', 2);
  g.restore();
}

function coat(g: Ctx, s: SlickerState) {
  const t = s.poseTime;
  const time = s.time;
  const bp = s.beatPhase ?? 0;
  let sy = 1;
  let lift = Math.sin(time * 2.2) * 4 + Math.exp(-bp * 5) * 2;
  let punch = 0;
  let collapse = 0;
  if (s.action === 'hop') {
    const h = bump(t, 0.45);
    lift += h * 60;
    sy = 1 + (t < 0.1 ? 0.15 * (1 - t / 0.1) : 0) - 0.1 * bump(t - 0.4, 0.15);
  } else if (s.action === 'claw') {
    punch = t < 0.08 ? easeOut(t / 0.08) : 1 - smooth((t - 0.15) / 0.25);
  } else if (s.action === 'clash') {
    collapse = easeOut(clamp01(t / 0.35));
  }
  const flap = Math.sin(time * 5) * 3;
  g.save();
  g.translate(0, -lift);
  g.scale(1 + collapse * 0.25, sy * (1 - collapse * 0.75));
  // hem flutter points
  const hem = (i: number) => Math.sin(time * 6 + i * 1.3) * 4;
  // back sleeve (behind coat)
  sleeve(g, -18, -70, -34 - flap, -32 + flap, time, 0);
  // coat body
  g.beginPath();
  g.moveTo(-20, -86);
  g.bezierCurveTo(-26, -60, -34, -30, -36, 2 + hem(0));
  g.lineTo(-18, -2 + hem(1));
  g.lineTo(0, 3 + hem(2));
  g.lineTo(18, -2 + hem(3));
  g.lineTo(36, 2 + hem(4));
  g.bezierCurveTo(34, -30, 26, -60, 20, -86);
  g.closePath();
  const gr = g.createLinearGradient(-36, 0, 36, 0);
  gr.addColorStop(0, PAL.slickerShade);
  gr.addColorStop(0.35, PAL.slicker);
  gr.addColorStop(0.7, '#FFD84A');
  gr.addColorStop(1, PAL.slickerShade);
  inkFill(g, gr, 3);
  // front placket + toggles
  g.strokeStyle = PAL.slickerShade;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(3, -84);
  g.lineTo(5, 0);
  g.stroke();
  g.fillStyle = PAL.woodDark;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.ellipse(9, -70 + i * 17, 3.6, 1.8, 0, 0, TAU);
    g.fill();
  }
  // oilskin sheen
  g.strokeStyle = 'rgba(255,250,200,0.75)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-14, -78);
  g.quadraticCurveTo(-22, -40, -24, -10);
  g.stroke();
  // collar opening (hollow inside)
  g.beginPath();
  g.ellipse(0, -86, 21, 8, 0, 0, TAU);
  inkFill(g, '#1C140C', 2.5);
  // front sleeve (the claw echo punches up-forward)
  const ex = 34 + punch * 24 - flap * (1 - punch);
  const ey = -30 - punch * 60 + flap * (1 - punch);
  sleeve(g, 18, -70, ex, ey, time, 1.7);
  if (punch > 0.6) star4(g, ex + 10, ey - 8, 14 * punch, 0.4, '#FFFFFF');
  g.restore();
  return { lift, collapse };
}

function mask(g: Ctx, x: number, y: number, rot: number, time: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.ellipse(0, 0, 15, 18, 0, 0, TAU);
  const gr = g.createRadialGradient(-5, -6, 1, 0, 0, 18);
  gr.addColorStop(0, '#FFFFFF');
  gr.addColorStop(0.4, PAL.wax);
  gr.addColorStop(1, '#C9BFA8');
  inkFill(g, gr, 2.4);
  // eye holes with magenta pupils
  for (const ex of [-6, 6]) {
    g.fillStyle = '#20161C';
    g.beginPath();
    g.ellipse(ex, -3, 4.2, 5, 0, 0, TAU);
    g.fill();
    g.fillStyle = PAL.magenta;
    g.beginPath();
    g.arc(ex + Math.sin(time * 1.3) * 0.8, -2.5, 2.1, 0, TAU);
    g.fill();
  }
  // thin sad mouth + wax drip + sheen
  g.strokeStyle = '#6E6252';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-5, 9);
  g.quadraticCurveTo(0, 6.5, 5, 9);
  g.stroke();
  g.fillStyle = '#E4DAC4';
  g.beginPath();
  g.ellipse(9, 13, 2, 4, 0.2, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath();
  g.ellipse(-7, -11, 4, 1.8, -0.5, 0, TAU);
  g.fill();
  g.restore();
}

function hat(g: Ctx, x: number, y: number, rot: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  // sou'wester: domed crown + brim sloping down at the back
  g.moveTo(-30, 4);
  g.quadraticCurveTo(-10, -2, 0, -2);
  g.bezierCurveTo(-2, -24, 20, -26, 20, -4);
  g.quadraticCurveTo(28, -2, 32, 6);
  g.quadraticCurveTo(0, 8, -30, 4);
  g.closePath();
  const gr = g.createLinearGradient(0, -24, 0, 8);
  gr.addColorStop(0, '#FFE070');
  gr.addColorStop(1, PAL.slickerShade);
  inkFill(g, gr, 2.6);
  g.strokeStyle = PAL.slickerShade;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-26, 4);
  g.quadraticCurveTo(0, 5, 28, 5);
  g.stroke();
  g.restore();
}

export function drawEchoSlicker(g: Ctx, x: number, y: number, s: SlickerState): void {
  const sc = s.scale ?? 1;
  const f = s.facing ?? -1;
  g.save();
  g.translate(x, y);
  if (s.action === 'reflection') {
    // upside-down, faded, rippled: drawn below the origin (the pool surface)
    g.globalAlpha = (s.alpha ?? 1) * 0.45;
    g.scale(sc * f, -sc * 0.85);
    g.transform(1, 0, Math.sin(s.time * 3) * 0.06, 1, 0, 0);
  } else {
    if (s.alpha !== undefined) g.globalAlpha = s.alpha;
    g.scale(sc * f, sc);
  }
  const { lift, collapse } = coat(g, s);
  const bob = Math.sin(s.time * 2.6) * 3;
  if (s.action === 'clash') {
    const t = s.poseTime;
    // mask spins up and away, hat drops
    const mx = 60 * t;
    const my = -104 - 300 * t + 500 * t * t;
    mask(g, mx, my, t * 14, s.time);
    hat(g, -10 * t, -126 + 200 * t * t * (1 + collapse), -t * 4);
    if (t < 0.25) star4(g, 0, -60, 40 * (1 - t / 0.25) + 10, 0.2, '#FFFFFF');
  } else {
    mask(g, 0, -100 - lift + bob, Math.sin(s.time * 1.7) * 0.08, s.time);
    hat(g, -2, -122 - lift + bob * 1.4, -0.08 + Math.sin(s.time * 2) * 0.05);
  }
  g.restore();
}
