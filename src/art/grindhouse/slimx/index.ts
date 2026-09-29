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
import { drawSmear, speedLines } from '../../rig/smear';
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

function swingSmear(g: Ctx, r: Rig, look: Look): void {
  const sm = r.smear;
  if (!sm || sm.alpha < 0.01) return;
  const L = r.b.cueLen;
  const uNow = Math.max(1, strikeU(Math.min(sm.t, 0.2), 2, 0.09, 0.2, 0.42, 1.8));
  const u0 = Math.max(0.45, uNow - 0.95 - sm.t * 2);
  const at = (u: number): [number, number, number, number] => {
    const h = swingHands(u < 1 ? 1 : u);
    const hp = tAt(r, h[0], h[1]);
    const a = swingAng(u);
    const reach = L - 12;
    return [hp[0] + Math.cos(a) * reach, hp[1] + Math.sin(a) * reach, hp[0] + Math.cos(a) * reach * 0.62, hp[1] + Math.sin(a) * reach * 0.62];
  };
  const S = look.smear;
  if (S.edge) drawSmear(g, at, u0, uNow, { color: S.edge, alpha: sm.alpha * 0.7, taper: 0.95 }, 18);
  g.save();
  if (S.edge) g.translate(0, 0);
  drawSmear(g, at, u0 + 0.05, uNow, { color: S.body, core: S.core, alpha: sm.alpha * 0.85, taper: S.hard ? 1 : 0.95, coreWidth: S.hard ? 3 : 3.5 }, 18);
  g.restore();
  if (S.ghosts) {
    // rubber-hose multiples: three ghost cues fanned behind the real one
    for (let i = 1; i <= 3; i++) {
      const u = uNow - i * 0.13;
      if (u < u0) break;
      const [ox, oy, ix, iy] = at(u);
      g.globalAlpha = sm.alpha * (0.55 - i * 0.12);
      g.strokeStyle = '#1A1410';
      g.lineWidth = 6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(ix, iy);
      g.lineTo(ox, oy);
      g.stroke();
      g.strokeStyle = CF.cueMaple;
      g.lineWidth = 3;
      g.stroke();
    }
    g.globalAlpha = 1;
  }
}

function thrustSmear(g: Ctx, r: Rig, look: Look): void {
  const sm = r.smear;
  if (!sm) return;
  const { tip, dir } = r.cue;
  const n: V = [-dir[1], dir[0]];
  const k = sm.t / 0.25;
  g.save();
  g.globalAlpha = sm.alpha;
  const wedge = (w: number, len: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(tip[0] + n[0] * 2, tip[1] + n[1] * 2);
    g.lineTo(tip[0] - dir[0] * len + n[0] * w, tip[1] - dir[1] * len + n[1] * w);
    g.lineTo(tip[0] - dir[0] * len - n[0] * w, tip[1] - dir[1] * len - n[1] * w);
    g.lineTo(tip[0] - n[0] * 2, tip[1] - n[1] * 2);
    g.closePath();
    g.fill();
  };
  if (look.smear.edge) wedge(15, 150, look.smear.edge);
  wedge(12, 146, look.smear.body);
  wedge(4, 120, look.smear.core);
  g.strokeStyle = look.smear.core;
  g.lineWidth = 5 * (1 - k);
  g.beginPath();
  g.ellipse(tip[0] + dir[0] * 12, tip[1] + dir[1] * 12, 14 + 50 * easeOut(k), 22 + 70 * easeOut(k), Math.atan2(dir[1], dir[0]), 0, TAU);
  g.stroke();
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
  look.paint(g, r);
  if (r.smear && r.smear.kind === 'thrust') thrustSmear(g, r, look);
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
    for (let i = 0; i < 3; i++) {
      const a = s.time * 7 + (i * TAU) / 3;
      star4(g, Math.cos(a) * 26, -150 + Math.sin(a) * 7, 7, a, CF.cream);
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
