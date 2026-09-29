/**
 * SLIM REDESIGN candidates (art lab: tab "Slim ×3"). One shared rig (`rig.ts`), three painters:
 *   A  ink   — inked comic (Streets of Rage 4 / Final Fight): 3 line weights, 3-tone hard cel, anatomy
 *   B  hose  — 1930s rubber-hose cartoon (Cuphead / Fleischer Popeye) meets 1973: noodle limbs, ham forearms,
 *              pie-cut eyes, bold even line, soft vintage airbrush shading
 *   C  flat  — clean flat vector (Hi-Fi Rush 2D / Sayonara Wild Hearts): no interior ink, angular shapes,
 *              2-tone cel in hue-shifted shadows, a neon rim light, a thin coloured silhouette line
 *
 *   drawSlimX('ink', ctx, x, y, slimState)   // same contract as drawSlim (origin = feet centre, ~134 px tall)
 */
import type { Ctx } from '../../core/canvas';
import { drawGlow, puff, star4 } from '../../core/draw';
import { TAU, clamp01, easeOut, fract, hash } from '../../core/math';
import { strikeU } from '../../rig/motion';
import { speedLines } from '../../rig/smear';
import { CF } from '../../palette';
import type { SlimState } from '../slim';
import { type Rig, type V, solveSlim, swingAng, swingHands, tAt } from './rig';
import { paintInk } from './styleInk';
import { paintHose } from './styleHose';
import { paintFlat } from './styleFlat';

export type SlimStyle = 'ink' | 'hose' | 'flat';
export const SLIM_STYLES: SlimStyle[] = ['ink', 'hose', 'flat'];
export const SLIM_STYLE_NAMES: Record<SlimStyle, string> = {
  ink: 'A · Inked comic (SoR4)',
  hose: 'B · Rubber-hose cartoon (Cuphead × 1973)',
  flat: 'C · Flat vector cel (Hi-Fi Rush / Sayonara)',
};

interface Look {
  paint: (g: Ctx, r: Rig) => void;
  smear: { body: string; core: string; edge?: string; ghosts?: boolean; hard?: boolean };
  dust: string;
}

const LOOKS: Record<SlimStyle, Look> = {
  ink: { paint: paintInk, smear: { body: CF.tangerine, core: CF.cream, edge: '#1A1410' }, dust: CF.filmHi },
  hose: { paint: paintHose, smear: { body: '#FFF6E8', core: '#FFFFFF', edge: '#1A1410', ghosts: true }, dust: '#F4EFE2' },
  flat: { paint: paintFlat, smear: { body: CF.tangerine, core: '#FFF6E8', hard: true }, dust: '#F4E6D0' },
};

/**
 * The strike crescent: a FAN swept by the cue (hands -> tip) over the last part of the swing, cel-stepped (three
 * nested fans, the newest the most opaque) with a hot cream leading edge and a thin ink rim — a hard anime smear, not a
 * soft blur, drawn behind the body so the figure stays readable.
 */
function swingSmear(g: Ctx, r: Rig, look: Look): void {
  const sm = r.smear;
  if (!sm || sm.alpha < 0.01) return;
  const L = r.b.cueLen;
  const uNow = Math.max(1, strikeU(Math.min(sm.t, 0.2), 2, 0.09, 0.2, 0.42, 1.8));
  const u0 = Math.max(0.55, uNow - 0.8 - sm.t * 3);
  const N = 16;
  const at = (u: number, k: number): V => {
    const h = swingHands(u < 1 ? 1 : u);
    const hp = tAt(r, h[0], h[1]);
    const a = swingAng(u);
    return [hp[0] + Math.cos(a) * L * k, hp[1] + Math.sin(a) * L * k];
  };
  const fan = (ua: number, k0: number, k1: number): Path2D => {
    const p = new Path2D();
    for (let i = 0; i <= N; i++) {
      const q = at(ua + ((uNow - ua) * i) / N, k1);
      if (i === 0) p.moveTo(q[0], q[1]);
      else p.lineTo(q[0], q[1]);
    }
    for (let i = N; i >= 0; i--) {
      // the inner edge tapers toward the trailing end: a crescent, not a band
      const f = i / N;
      const q = at(ua + ((uNow - ua) * i) / N, k1 - (k1 - k0) * (0.25 + 0.75 * f));
      p.lineTo(q[0], q[1]);
    }
    p.closePath();
    return p;
  };
  const S = look.smear;
  const A = sm.alpha;
  g.save();
  g.lineJoin = 'round';
  const span = uNow - u0;
  const full = fan(u0, 0.4, 1.02);
  if (S.edge) {
    g.globalAlpha = A * 0.8;
    g.strokeStyle = S.edge;
    g.lineWidth = 3;
    g.stroke(full);
  }
  g.globalAlpha = A * 0.3;
  g.fillStyle = S.body;
  g.fill(full);
  g.globalAlpha = A * 0.55;
  g.fill(fan(u0 + span * 0.4, 0.46, 1.02));
  g.globalAlpha = A * 0.9;
  g.fill(fan(u0 + span * 0.72, 0.52, 1.02));
  // hot leading edge along the tip path
  g.globalAlpha = A;
  g.strokeStyle = S.core;
  g.lineCap = 'round';
  g.lineWidth = S.hard ? 3 : 4;
  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const q = at(u0 + span * (0.45 + 0.55 * (i / 10)), 1);
    if (i === 0) g.moveTo(q[0], q[1]);
    else g.lineTo(q[0], q[1]);
  }
  g.stroke();
  g.restore();
  if (S.ghosts) {
    for (let i = 1; i <= 3; i++) {
      const u = uNow - i * 0.13;
      if (u < u0) break;
      const o = at(u, 0.92);
      const n = at(u, 0.55);
      g.globalAlpha = A * (0.55 - i * 0.12);
      g.strokeStyle = '#1A1410';
      g.lineWidth = 6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(n[0], n[1]);
      g.lineTo(o[0], o[1]);
      g.stroke();
      g.strokeStyle = CF.cueMaple;
      g.lineWidth = 3;
      g.stroke();
    }
    g.globalAlpha = 1;
  }
}

/** the BREAK SHOT: a hard speed streak along the cue (behind the body), speed lines and a ring burst off the tip */
function thrustSmear(g: Ctx, r: Rig, look: Look, front: boolean): void {
  const sm = r.smear;
  if (!sm) return;
  const { tip, dir } = r.cue;
  const n: V = [-dir[1], dir[0]];
  const k = sm.t / 0.25;
  g.save();
  g.globalAlpha = sm.alpha;
  if (!front) {
    const streak = (w: number, len: number, col: string) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(tip[0] + dir[0] * 6, tip[1] + dir[1] * 6);
      g.lineTo(tip[0] - dir[0] * len + n[0] * w, tip[1] - dir[1] * len + n[1] * w);
      g.lineTo(tip[0] - dir[0] * len * 1.08, tip[1] - dir[1] * len * 1.08);
      g.lineTo(tip[0] - dir[0] * len - n[0] * w, tip[1] - dir[1] * len - n[1] * w);
      g.closePath();
      g.fill();
    };
    if (look.smear.edge) streak(13, 230, look.smear.edge);
    streak(10, 222, look.smear.body);
    streak(3.5, 200, look.smear.core);
    g.strokeStyle = look.smear.core;
    g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const off = (i - 2) * 11 + (i % 2 ? 3 : -3);
      const l0 = 40 + hash(i + 3) * 70 + k * 90;
      const l1 = l0 + 50 + hash(i + 9) * 60;
      g.lineWidth = 2.2 - Math.abs(i - 2) * 0.4;
      g.beginPath();
      g.moveTo(tip[0] - dir[0] * l0 + n[0] * off * 2.2, tip[1] - dir[1] * l0 + n[1] * off * 2.2);
      g.lineTo(tip[0] - dir[0] * l1 + n[0] * off * 2.2, tip[1] - dir[1] * l1 + n[1] * off * 2.2);
      g.stroke();
    }
  } else {
    // the shock ring: an ink + cream ellipse opening forward off the tip
    const e = easeOut(k);
    const cx = tip[0] + dir[0] * (10 + 30 * e);
    const cy = tip[1] + dir[1] * (10 + 30 * e);
    const a = Math.atan2(dir[1], dir[0]);
    for (const [col, w] of [[look.smear.edge ?? '#1A1410', 7], [look.smear.core, 4]] as [string, number][]) {
      g.strokeStyle = col;
      g.lineWidth = w * (1 - k);
      g.beginPath();
      g.ellipse(cx, cy, 8 + 20 * e, 20 + 56 * e, a, 0, TAU);
      g.stroke();
    }
  }
  g.restore();
}

/** Draw a Slim candidate at (x, y) = feet centre on the ground. */
export function drawSlimX(style: SlimStyle, g: Ctx, x: number, y: number, s: SlimState): void {
  const look = LOOKS[style];
  const r = solveSlim(s);
  const facing = s.facing ?? 1;
  const sc = s.scale ?? 1;
  const t = Math.max(0, s.poseTime);
  const speed = Math.abs(s.speed ?? 0);
  g.save();
  g.translate(x, y);
  g.scale(sc * facing, sc);
  const pf = s.perfect ?? 0;
  if (pf > 0.01) {
    g.save();
    g.globalAlpha = pf;
    g.strokeStyle = CF.filmHi;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU + 0.1;
      const r0 = 80 + hash(i) * 30;
      const r1 = r0 + 60 + hash(i + 5) * 70;
      g.lineWidth = 2 + (i % 3);
      g.beginPath();
      g.moveTo(Math.cos(a) * r0, -66 + Math.sin(a) * r0);
      g.lineTo(Math.cos(a) * r1, -66 + Math.sin(a) * r1);
      g.stroke();
    }
    g.restore();
  }
  if (s.pose === 'run' && speed > 60) {
    const ph = (s.runPhase ?? 0) * 2;
    for (let j = 0; j < 3; j++) {
      const age = fract(ph) + j;
      puff(g, -18 - age * 86, -4 - age * 3, 4 + age * 3.4, 0.55 * (1 - age / 3), look.dust);
    }
    speedLines(g, -46, -78, 0, 4, 50 + speed * 0.04, 90, look.dust, 0.5, Math.floor(s.time * 10));
  }
  // root transform (squash & stretch about the pivot, tumble rotation)
  const R = r.pose.root;
  g.save();
  g.translate(R.x, R.y + R.py);
  if (R.rot) g.rotate(R.rot);
  g.scale(R.sx * (s.squashX ?? 1), R.sy * (s.squashY ?? 1));
  g.translate(0, -R.py);
  // smears sit BEHIND the body: the figure stays readable, the crescent frames it
  if (r.smear && r.smear.kind === 'swing') swingSmear(g, r, look);
  if (r.smear && r.smear.kind === 'thrust') thrustSmear(g, r, look, false);
  look.paint(g, r);
  if (r.smear && r.smear.kind === 'thrust') thrustSmear(g, r, look, true);
  if (r.smear && r.smear.t < 0.14) {
    const k = r.smear.t / 0.14;
    const tp = r.cue.tip;
    star4(g, tp[0], tp[1], 12 + 26 * easeOut(k), k * 2, `rgba(255,246,232,${1 - k})`);
    drawGlow(g, tp[0], tp[1], CF.tangerineHi, 70, (1 - k) * 0.7);
  }
  if (r.sparks) {
    const kx = (r.kneeN[0] + r.ankN[0]) / 2;
    const ky = Math.min(-1, Math.max(r.kneeN[1], r.ankN[1]) + 2);
    g.strokeStyle = CF.bulb;
    g.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const u = fract(s.time * 5 + i / 8);
      g.globalAlpha = 1 - u;
      g.beginPath();
      g.moveTo(kx - u * 20, ky - u * 8);
      g.lineTo(kx - u * 60 - hash(i) * 20, ky - u * 30 - hash(i + 2) * 14);
      g.stroke();
    }
    g.globalAlpha = 1;
    drawGlow(g, kx, ky, CF.bulb, 30, 0.6);
  }
  g.restore();
  if (s.pose === 'land') {
    const k = clamp01(t / 0.35);
    for (const d of [-1, 1]) puff(g, d * (26 + 70 * easeOut(k)), -6 - 12 * k, 6 + 13 * easeOut(k), (1 - k) * 0.85, look.dust);
  }
  if (s.pose === 'respawn' && t < 0.12) {
    g.fillStyle = `rgba(255,246,232,${0.75 * (1 - t / 0.12)})`;
    g.fillRect(-90, -175, 180, 180);
    g.fillStyle = `rgba(26,20,16,${0.8 * (1 - t / 0.12)})`;
    g.fillRect(-130, -95, 260, 3);
  }
  if (s.pose === 'stumble') {
    // little 8-balls orbiting his head (DESIGN §2)
    for (let i = 0; i < 3; i++) {
      const a = s.time * 7 + (i * TAU) / 3;
      const bx = Math.cos(a) * 28;
      const by = -156 + Math.sin(a) * 8;
      g.fillStyle = '#1A1410';
      g.beginPath();
      g.arc(bx, by, 5.5, 0, TAU);
      g.fill();
      g.fillStyle = CF.cream;
      g.beginPath();
      g.arc(bx + 1, by - 1, 2.3, 0, TAU);
      g.fill();
      g.strokeStyle = CF.cream;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(bx, by, 5.5, -2.4, -1.2);
      g.stroke();
    }
  }
  if (pf > 0.01) drawGlow(g, 0, -66, CF.filmHi, 120, pf * 0.35);
  if (s.bones) debugBones(g, r);
  g.restore();
}

function debugBones(g: Ctx, r: Rig): void {
  g.save();
  g.strokeStyle = 'rgba(255,40,120,0.9)';
  g.lineWidth = 1.5;
  const line = (...pts: V[]) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.stroke();
  };
  line(r.hip, r.neck, r.head);
  line(r.shN, r.elN, r.wrN);
  line(r.shF, r.elF, r.wrF);
  line(r.hipN, r.kneeN, r.ankN);
  line(r.hipF, r.kneeF, r.ankF);
  g.restore();
}
