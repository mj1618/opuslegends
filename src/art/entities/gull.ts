/**
 * Cue Gull — Big Jim's enforcer (DESIGN §6.1). Stout black-backed gull in a flat cap holding a
 * pool cue with a white truce flag tied on. Magenta cue tip = danger.
 *
 * Poses:
 *   'idle'   — offbeat flag billow (friendly; the flag is a soft bounce platform). Driven by beatPhase.
 *   'windup' — chalking the cue + chest puff (the beat before a jab). poseTime 0..1 beat.
 *   'jab'    — cue thrust on the beat, squawk. poseTime from the jab.
 *   'flung'  — clawed: tumbles into the background, cap flies off. poseTime from the hit.
 *   'chorus' — background chorus member: waves the truce flag on the offbeat (after being flung).
 * Origin = feet on the perch; ~150 px tall incl. the cue. `facing` -1 (default) looks left.
 */
import { type Ctx } from '../core/canvas';
import { inkFill, puff, star4 } from '../core/draw';
import { TAU, clamp01, easeOut, hash, lerp, smooth } from '../core/math';
import { PAL } from '../palette';

export type GullPose = 'idle' | 'windup' | 'jab' | 'flung' | 'chorus';

export interface GullState {
  pose: GullPose;
  poseTime: number;
  time: number;
  /** 0..1 within the beat */
  beatPhase: number;
  facing?: 1 | -1;
  scale?: number;
  seed?: number;
  /** flag colour override (finale: the gulls wave ORANGE flags) */
  flag?: string;
}

interface GullRig {
  puff: number;
  beak: number;
  eye: 'angry' | 'happy' | 'x' | 'shock';
  bob: number;
  lean: number;
  cueA: number;
  gx: number;
  gy: number;
  flagB: number;
  flagMode: 'billow' | 'trail';
  wing: number;
  lines: number;
}

function rig(s: GullState): GullRig {
  const t = s.poseTime;
  const bp = s.beatPhase;
  const billow = Math.sin(Math.PI * bp) ** 2; // peaks on the offbeat
  const r: GullRig = {
    puff: 0,
    beak: 0,
    eye: 'angry',
    bob: 0,
    lean: 0,
    cueA: -1.32,
    gx: 20,
    gy: -52,
    flagB: billow,
    flagMode: 'billow',
    wing: 0,
    lines: 0,
  };
  switch (s.pose) {
    case 'idle':
    case 'chorus':
      r.bob = Math.exp(-bp * 6) * 3;
      r.eye = billow > 0.55 ? 'happy' : 'angry';
      r.cueA = -1.32 + billow * 0.12;
      r.lean = billow * 0.05;
      r.beak = s.pose === 'chorus' ? billow * 0.6 : 0;
      break;
    case 'windup': {
      const k = clamp01(t / 0.35);
      r.puff = smooth(k) * 1 + Math.sin(s.time * 30) * 0.03 * k;
      r.cueA = lerp(-1.32, 0.12, easeOut(clamp01(t / 0.12)));
      r.gx = lerp(20, -4, easeOut(clamp01(t / 0.12)));
      r.gy = -50;
      r.beak = 0.25 + k * 0.45;
      r.eye = 'angry';
      r.lean = -0.1 * k;
      r.flagMode = 'trail';
      r.flagB = 0.2;
      r.lines = k;
      break;
    }
    case 'jab': {
      const thrust = t < 0.06 ? easeOut(t / 0.06) : 1 - smooth((t - 0.14) / 0.2);
      r.cueA = 0.06;
      r.gx = lerp(-4, 48, thrust);
      r.gy = -48;
      r.lean = 0.16 * thrust;
      r.beak = 1 - smooth((t - 0.2) / 0.15);
      r.eye = 'angry';
      r.puff = 0.6 * (1 - smooth(t / 0.3));
      r.flagMode = 'trail';
      r.flagB = 0.1;
      r.lines = thrust;
      break;
    }
    case 'flung':
      r.eye = 'x';
      r.beak = 0.8;
      r.cueA = -0.4 + t * 6;
      r.wing = 1;
      r.flagMode = 'trail';
      break;
  }
  return r;
}

function drawFlag(g: Ctx, tipX: number, tipY: number, a: number, r: GullRig, time: number, col: string) {
  // cloth tied just below the tip, hanging from the cue
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const ax = tipX - ca * 14;
  const ay = tipY - sa * 14;
  const bx = tipX - ca * 44;
  const by = tipY - sa * 44;
  g.beginPath();
  if (r.flagMode === 'billow') {
    // billows forward (+x) - soft platform on the offbeat
    const L = 30 + 34 * r.flagB;
    const w1 = Math.sin(time * 9) * 3;
    const w2 = Math.sin(time * 9 + 1.3) * 4;
    const droop = 22 * (1 - r.flagB);
    g.moveTo(ax, ay);
    g.bezierCurveTo(ax + L * 0.4, ay - 6 + w1, ax + L * 0.8, ay + 2 + droop * 0.5 - w1, ax + L, ay + 4 + droop + w2);
    g.bezierCurveTo(ax + L * 0.9, ay + 16 + droop, ax + L * 0.6, ay + 24 + droop * 0.6 + w1, bx + L * 0.55, by + 12 + droop * 0.6);
    g.quadraticCurveTo(bx + 10, by + 6, bx, by);
  } else {
    // trails behind along the cue
    const w = Math.sin(time * 14) * 5;
    g.moveTo(ax, ay);
    g.quadraticCurveTo(ax - ca * 20 + sa * 10, ay - sa * 20 - 14 + w, bx - ca * 20, by - sa * 20 - 16 - w);
    g.quadraticCurveTo(bx - ca * 6, by + 6 - sa * 6 + w, bx, by);
  }
  g.closePath();
  inkFill(g, col, 2.4);
  // cloth folds
  g.strokeStyle = 'rgba(40,40,60,0.2)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(ax + 4, ay + 4);
  g.quadraticCurveTo((ax + bx) / 2 + 16, (ay + by) / 2 + 6, bx + 10, by + 4);
  g.stroke();
  // tie knot
  g.fillStyle = col;
  g.beginPath();
  g.arc(ax, ay, 3.4, 0, TAU);
  g.fill();
  g.strokeStyle = PAL.outline;
  g.lineWidth = 1.6;
  g.stroke();
}

function drawCue(g: Ctx, r: GullRig, time: number, flagCol: string) {
  const a = r.cueA;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const buttX = r.gx - ca * 64;
  const buttY = r.gy - sa * 64;
  const tipX = r.gx + ca * 96;
  const tipY = r.gy + sa * 96;
  // outline
  g.lineCap = 'round';
  g.strokeStyle = PAL.outline;
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(buttX, buttY);
  g.lineTo(tipX, tipY);
  g.stroke();
  // butt (dark) -> shaft (light)
  const midX = buttX + ca * 58;
  const midY = buttY + sa * 58;
  g.strokeStyle = '#5A3A24';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(buttX, buttY);
  g.lineTo(midX, midY);
  g.stroke();
  g.strokeStyle = PAL.cueWood;
  g.lineWidth = 4.2;
  g.beginPath();
  g.moveTo(midX, midY);
  g.lineTo(tipX - ca * 8, tipY - sa * 8);
  g.stroke();
  // white ferrule + magenta tip
  g.strokeStyle = '#FFFFFF';
  g.lineWidth = 4.4;
  g.beginPath();
  g.moveTo(tipX - ca * 8, tipY - sa * 8);
  g.lineTo(tipX - ca * 3, tipY - sa * 3);
  g.stroke();
  g.strokeStyle = PAL.magenta;
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(tipX - ca * 3, tipY - sa * 3);
  g.lineTo(tipX + ca * 2, tipY + sa * 2);
  g.stroke();
  drawFlag(g, tipX, tipY, a, r, time, flagCol);
  return { tipX, tipY };
}

function drawBodyParts(g: Ctx, r: GullRig, s: GullState) {
  const P = 1 + r.puff * 0.14;
  // legs + webbed feet
  g.lineCap = 'round';
  for (const lx of [-9, 7]) {
    g.strokeStyle = PAL.outline;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(lx, -22);
    g.lineTo(lx, -2);
    g.stroke();
    g.strokeStyle = '#E4B64A';
    g.lineWidth = 3;
    g.stroke();
    g.beginPath();
    g.moveTo(lx - 7, 0);
    g.lineTo(lx + 9, 0);
    g.lineTo(lx + 1, -5);
    g.closePath();
    inkFill(g, '#E4B64A', 1.6);
  }
  g.save();
  g.translate(0, -46 + r.bob);
  g.rotate(r.lean);
  g.scale(P, P);
  // tail
  g.beginPath();
  g.moveTo(-24, -4);
  g.lineTo(-48, 6);
  g.lineTo(-44, 12);
  g.lineTo(-22, 12);
  g.closePath();
  inkFill(g, PAL.gullBack, 2.6);
  // body
  g.beginPath();
  g.ellipse(0, 2, 31, 28, 0, 0, TAU);
  inkFill(g, PAL.gullWhite, 3);
  g.save();
  g.clip();
  g.fillStyle = '#CDD1D8';
  g.beginPath();
  g.ellipse(-6, 26, 34, 14, 0, 0, TAU);
  g.fill();
  g.restore();
  // chest puff highlight
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath();
  g.ellipse(12, -4, 9 + r.puff * 4, 12 + r.puff * 4, 0.3, 0, TAU);
  g.fill();
  // folded wing (dark mantle) with white-spotted tips
  g.save();
  g.rotate(-r.wing * 0.9);
  g.beginPath();
  g.moveTo(10, -18);
  g.bezierCurveTo(-8, -26, -30, -18, -40, 4);
  g.lineTo(-54, 16);
  g.bezierCurveTo(-34, 20, -8, 18, 6, 6);
  g.bezierCurveTo(12, -2, 14, -12, 10, -18);
  g.closePath();
  inkFill(g, PAL.gullBack, 2.6);
  g.fillStyle = '#FFFFFF';
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(-44 + i * 6, 12 - i, 1.6, 0, TAU);
    g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-4, -12);
  g.quadraticCurveTo(-24, -10, -34, 6);
  g.stroke();
  g.restore();
  g.restore();

  // head (on top, with its own bob)
  g.save();
  g.translate(16, -80 + r.bob * 1.4 - r.puff * 4);
  g.rotate(r.lean * 1.4);
  // beak: upper + lower mandible (open by r.beak)
  const open = r.beak * 0.5;
  g.save();
  g.translate(12, 3);
  g.rotate(open * 0.5);
  g.beginPath();
  g.moveTo(-2, 5);
  g.lineTo(18, 5);
  g.quadraticCurveTo(22, 5, 20, 9);
  g.lineTo(-2, 9);
  g.closePath();
  inkFill(g, PAL.gullBeak, 1.8);
  g.fillStyle = '#D23A34';
  g.beginPath();
  g.arc(14, 7.5, 2, 0, TAU);
  g.fill();
  g.restore();
  g.save();
  g.translate(12, 3);
  g.rotate(-open * 0.6);
  g.beginPath();
  g.moveTo(-3, -4);
  g.bezierCurveTo(8, -6, 20, -4, 26, 2);
  g.quadraticCurveTo(27, 7, 22, 6);
  g.lineTo(-3, 5);
  g.closePath();
  inkFill(g, PAL.gullBeak, 1.8);
  g.restore();
  // head
  g.beginPath();
  g.arc(0, 0, 18, 0, TAU);
  inkFill(g, PAL.gullWhite, 3);
  // cheek shade
  g.fillStyle = 'rgba(160,168,180,0.35)';
  g.beginPath();
  g.ellipse(-6, 8, 10, 6, 0, 0, TAU);
  g.fill();
  // eye
  const ex = 7;
  const ey = -3;
  g.strokeStyle = PAL.outline;
  g.lineCap = 'round';
  if (r.eye === 'happy') {
    g.lineWidth = 2.6;
    g.beginPath();
    g.arc(ex, ey + 2, 4, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
  } else if (r.eye === 'x') {
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(ex - 4, ey - 4);
    g.lineTo(ex + 4, ey + 4);
    g.moveTo(ex + 4, ey - 4);
    g.lineTo(ex - 4, ey + 4);
    g.stroke();
  } else {
    g.fillStyle = '#FFF6D0';
    g.beginPath();
    g.arc(ex, ey, 4.6, 0, TAU);
    g.fill();
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = '#111';
    g.beginPath();
    g.arc(ex + 1.2, ey + 0.5, 2.2, 0, TAU);
    g.fill();
    // angry brow
    g.lineWidth = 3.2;
    g.beginPath();
    g.moveTo(ex - 7, ey - 9);
    g.lineTo(ex + 6, ey - 4.5);
    g.stroke();
  }
  // flat cap (tweed)
  g.beginPath();
  g.moveTo(-17, -6);
  g.bezierCurveTo(-18, -22, 6, -26, 18, -15);
  g.lineTo(28, -12);
  g.quadraticCurveTo(30, -8, 24, -8);
  g.lineTo(14, -9);
  g.quadraticCurveTo(-2, -10, -17, -6);
  g.closePath();
  inkFill(g, PAL.capTweed, 2.4);
  g.save();
  g.clip();
  g.strokeStyle = 'rgba(255,240,210,0.18)';
  g.lineWidth = 1.2;
  for (let i = -20; i < 30; i += 5) {
    g.beginPath();
    g.moveTo(i, -30);
    g.lineTo(i + 6, 0);
    g.stroke();
  }
  g.restore();
  g.fillStyle = '#3E3630';
  g.beginPath();
  g.arc(-2, -21, 2.2, 0, TAU);
  g.fill();
  g.restore();
  void s;
}

export function drawCueGull(g: Ctx, x: number, y: number, s: GullState): void {
  const r = rig(s);
  const facing = s.facing ?? -1;
  const sc = s.scale ?? 1;
  const flagCol = s.flag ?? '#FFFFFF';
  g.save();
  g.translate(x, y);
  if (s.pose === 'flung') {
    const t = s.poseTime;
    const k = clamp01(t / 0.9);
    // knocked up and back into the background
    g.translate(-facing * 520 * easeOut(k), -460 * t + 520 * t * t);
    g.scale(1 - 0.55 * k, 1 - 0.55 * k);
    g.rotate(t * 11 * -facing);
    g.globalAlpha = 1 - smooth((t - 0.7) / 0.3);
  }
  g.scale(sc * facing, sc);
  if (s.pose === 'windup' || s.pose === 'jab') {
    // squawk lines
    const k = r.lines;
    if (k > 0.05) {
      g.strokeStyle = PAL.outline;
      g.lineWidth = 3;
      g.globalAlpha *= k;
      for (let i = 0; i < 3; i++) {
        const a = -0.7 + i * 0.35;
        g.beginPath();
        g.moveTo(58 + Math.cos(a) * 10, -80 + Math.sin(a) * 10);
        g.lineTo(58 + Math.cos(a) * 24, -80 + Math.sin(a) * 24);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
  }
  drawBodyParts(g, r, s);
  const tip = drawCue(g, r, s.time, flagCol);
  // gripping wing-hand over the cue
  g.beginPath();
  g.ellipse(r.gx, r.gy, 8, 6, r.cueA, 0, TAU);
  inkFill(g, PAL.gullBack, 2);
  if (s.pose === 'windup') {
    // magenta chalk cube twisting on the tip + dust
    const tt = s.time * 20;
    g.save();
    g.translate(tip.tipX + 4, tip.tipY - 2);
    g.rotate(Math.sin(tt) * 0.4);
    g.beginPath();
    g.rect(-5, -5, 10, 10);
    inkFill(g, PAL.magenta, 1.5);
    g.restore();
    for (let i = 0; i < 3; i++) {
      const u = (s.time * 3 + i / 3) % 1;
      puff(g, tip.tipX + 8 + u * 18, tip.tipY - 8 - u * 16, 2 + u * 4, (1 - u) * 0.7, '#FF8CC0');
    }
  }
  if (s.pose === 'jab') {
    const t = s.poseTime;
    const f = 1 - clamp01(t / 0.18);
    if (f > 0) {
      star4(g, tip.tipX + 8, tip.tipY, 16 * f + 6, 0.3, PAL.magenta);
      star4(g, tip.tipX + 8, tip.tipY, 8 * f + 3, 0.7, '#FFFFFF');
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(tip.tipX - 40 - i * 16, tip.tipY - 12 + i * 12);
        g.lineTo(tip.tipX - 80 - i * 20, tip.tipY - 12 + i * 12);
        g.stroke();
      }
    }
  }
  g.restore();
  if (s.pose === 'flung') {
    // loose feathers + the cap flying off (world space, not spun)
    const t = s.poseTime;
    for (let i = 0; i < 5; i++) {
      const vx = (hash(i + (s.seed ?? 0)) - 0.5) * 300;
      const vy = -200 - hash(i * 3) * 200;
      const px = x + vx * t;
      const py = y - 60 + vy * t + 300 * t * t;
      const a = 1 - clamp01(t / 1.1);
      if (a <= 0) continue;
      g.save();
      g.globalAlpha = a;
      g.translate(px, py);
      g.rotate(Math.sin(t * 8 + i) * 1.2);
      g.beginPath();
      g.ellipse(0, 0, 9, 3.5, 0, 0, TAU);
      inkFill(g, i % 2 ? PAL.gullWhite : '#C9CCD2', 1.4);
      g.restore();
    }
    const cx = x + facing * -1 * 140 * t;
    const cy = y - 90 - 380 * t + 700 * t * t;
    if (t < 1.2) {
      g.save();
      g.translate(cx, cy);
      g.rotate(t * 9);
      g.beginPath();
      g.moveTo(-17, 4);
      g.bezierCurveTo(-18, -12, 6, -16, 18, -5);
      g.lineTo(28, -2);
      g.quadraticCurveTo(30, 2, 24, 2);
      g.lineTo(-17, 4);
      g.closePath();
      inkFill(g, PAL.capTweed, 2.4);
      g.restore();
    }
  }
}
