/**
 * ENTITY SKINS — the swap point between game mechanics and art (grindhouse theme, docs/DESIGN.md).
 * Every gameplay thing is drawn by one function here in the art lab's style (inked shapes, film-black
 * outlines, procedural, cached where heavy). Mechanics stay neutral; this file decides the look.
 *
 * DANGER LANGUAGE (review fix 7) — one rule per class, the same on every entity, readable in greyscale:
 *   LETHAL  (death)    lacquer red #B3201B + hot edge #FF4A3D rim/glow, black void, jagged teeth / chevrons
 *                      -> pits, the Burn. Anything new that kills: `drawLethalFrame` / DANGER colours.
 *   STUMBLE (knock)    film-black ink silhouette with RED POINTS only (cue tips, shards), no glow
 *                      -> snapped cues, Bluffer cue tips.
 *   REWARD             gold #E0B64A + shine, glints, never red -> tokens, pendulum targets (gold rim), splices.
 *   HERO               tangerine: Slim only (src/art/grindhouse/slim.ts).
 *   TERRAIN            4 px film-black edge + cream lip on every walkable top (floors, awnings, keg lifts).
 *
 * DATA-DRIVEN: `SKINS[kind]` maps an entity kind (Enemy.kind, Hazard.kind, ... or any new kind the level
 * adds) to a skin with a danger class; `skinFor(kind, danger)` falls back to a generic silhouette in the
 * right danger language, so a new entity type is readable the moment it exists, then gets proper art here.
 *
 * Mechanic -> skin: lum = brass 8-ball token · pendulum = swinging bar sign (street) / green pool lamp
 * (bar) / giant 8-ball (big) · spike = snapped cues in a spittoon (stumble) · gap = lethal furnace pit
 * (stage.ts) · slam = cellar keg lift on a hydraulic ram · jabber = Bluffer (flex on the "and", cue-jab on
 * the beat, wind-up tell the beat before its jab) · phrase = chalked HUP·HUP·HEY! · chaser = the Burn ·
 * checkpoint = film splice · scansion = cue-chalk marks · platform = awning / bar shelf · block = crates.
 */
import { type BeatInfo, hit } from '../art/core/beat';
import { type Ctx, drawSprite, sprite } from '../art/core/canvas';
import { drawGlow, star4 } from '../art/core/draw';
import { TAU, clamp01, easeOut, hash } from '../art/core/math';
import { CF } from '../art/palette';
import { blobPath, cartoonEye, type Ink } from '../art/rig/parts';

export const DANGER = { red: '#B3201B', hot: '#FF4A3D', void: '#0B0706', ink: '#1A1410' } as const;
export const REWARD = { gold: '#E0B64A', shine: '#FFE08A', dark: '#8A6A1E', glow: '#FFD878' } as const;
const INK = CF.filmBlack;
const LIP = '#F4EFE2';
const K: Ink = { line: INK, w: 3 };

/** legacy palette names still used by the HUD / screens */
export const PAL = {
  heroAccent: CF.tangerine,
  gold: REWARD.gold,
  goldDark: REWARD.dark,
  lacquer: DANGER.red,
  filmBlack: INK,
  film: CF.filmHi,
  beam: CF.beamHaze,
  jade: CF.jade,
  fig: CF.fig,
  lip: LIP,
  shine: REWARD.shine,
  cream: CF.cream,
} as const;

export type DangerClass = 'lethal' | 'stumble' | 'reward' | 'neutral';
export type EnvKind = 'street' | 'bar';

/** per-frame context every skin gets */
export interface SkinCtx {
  b: BeatInfo;
  env: EnvKind;
  /** presentation clock (s) */
  time: number;
  /** world beat (song beat minus hitstop debt) */
  wb: number;
  swing: number;
}

// ============================================================================ helpers

function fillInk(g: Ctx, fill: string, w = 3): void {
  g.lineJoin = 'round';
  g.lineWidth = w * 2;
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = fill;
  g.fill();
}

function roundRectPath(g: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

/** walkable-top rule: 4 px film-black edge + 2-3 px cream lip */
export function walkTop(g: Ctx, x: number, y: number, w: number, alpha = 1): void {
  g.fillStyle = INK;
  g.fillRect(x, y - 1, w, 5);
  g.globalAlpha *= alpha;
  g.fillStyle = LIP;
  g.fillRect(x, y - 3, w, 3);
  g.globalAlpha = 1;
}

// ============================================================================ REWARD: brass tokens (lums)

function tokenSprite() {
  return sprite('skin-token', 52, 52, 26, 26, (g) => {
    g.beginPath();
    g.arc(0, 0, 18, 0, TAU);
    fillInk(g, REWARD.gold, 2.5);
    g.strokeStyle = REWARD.dark;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, 14, 0, TAU);
    g.stroke();
    // 8-ball stamp
    g.fillStyle = INK;
    g.beginPath();
    g.arc(0, 0, 9.5, 0, TAU);
    g.fill();
    g.fillStyle = CF.cream;
    g.beginPath();
    g.arc(0, -0.5, 4.6, 0, TAU);
    g.fill();
    g.fillStyle = INK;
    g.font = 'bold 8px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('8', 0, 0);
    g.fillStyle = 'rgba(255,240,190,0.9)';
    g.beginPath();
    g.ellipse(-8, -9, 4, 2.4, -0.7, 0, TAU);
    g.fill();
  });
}

/** brass pool-hall token: spins (x-scale) as it bobs, flares gold on its beat */
export function drawToken(g: Ctx, x: number, y: number, angle: number, scale: number, glint: number, alpha = 1): void {
  const spin = 0.3 + 0.7 * Math.abs(Math.cos(angle * 2 + glint * 0.5));
  if (glint > 0.05) drawGlow(g, x, y, REWARD.glow, 34 * scale, 0.35 * glint * alpha);
  const a0 = g.globalAlpha;
  g.globalAlpha = a0 * alpha;
  drawSprite(g, tokenSprite(), x, y, 0, scale * spin, scale);
  if (glint > 0.6) star4(g, x + 9 * scale, y - 11 * scale, 7 * glint * scale, 0.3, `rgba(255,240,190,${(glint - 0.6) * 2.2 * alpha})`);
  g.globalAlpha = a0;
}
/** @deprecated name kept for the HUD */
export const drawLum = drawToken;

// ============================================================================ REWARD: pendulum targets

export interface PendulumView {
  pivotX: number;
  pivotY: number;
  x: number;
  y: number;
  r: number;
  big: boolean;
  /** 0..1 star glint (1 beat before the bottom of the swing) */
  glint: number;
  /** 0..1 at the bottom of the swing (strike now) */
  bottom: number;
  /** struck: seconds since (NaN = intact) */
  struckT: number;
  /** stable per-target seed */
  seed: number;
  /** top of the view (world y) for the hanging cable */
  viewTop: number;
}

const SIGN_WORDS = ['POOL', 'BAR', 'EATS', 'CUES', 'HOTEL', '8-BALL', 'LIQUOR', 'DINER'];

/** Swinging target: bar blade sign (street) / green-shade pool lamp (bar) / giant 8-ball (big ones). Gold = reward. */
export function drawPendulum(g: Ctx, p: PendulumView, c: SkinCtx): void {
  const { pivotX, pivotY, x, y, r } = p;
  // cable to the top of the frame + an iron bracket at the pivot
  g.strokeStyle = 'rgba(26,20,16,0.85)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(pivotX, p.viewTop);
  g.lineTo(pivotX, pivotY);
  g.stroke();
  g.fillStyle = INK;
  g.fillRect(pivotX - 14, pivotY - 6, 28, 8);
  g.beginPath();
  g.arc(pivotX, pivotY, 6, 0, TAU);
  g.fill();
  const ang = -Math.atan2(x - pivotX, y - pivotY);
  if (!Number.isNaN(p.struckT)) {
    // smashed: gold ring + tumbling halves
    const k = clamp01(p.struckT / 0.5);
    g.globalAlpha = 1 - k;
    g.strokeStyle = REWARD.gold;
    g.lineWidth = 7 * (1 - k);
    g.beginPath();
    g.arc(x, y, r + 90 * easeOut(k), 0, TAU);
    g.stroke();
    star4(g, x, y, r * (1 + 2 * k), k * 2, REWARD.shine);
    g.globalAlpha = 1;
    return;
  }
  // rope
  g.strokeStyle = '#3A2E26';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(pivotX, pivotY);
  g.lineTo(x - Math.sin(ang) * -r * 1.2, y - Math.cos(ang) * r * 1.2);
  g.stroke();
  if (p.bottom > 0.02) drawGlow(g, x, y, REWARD.glow, r * 3.2, 0.5 * p.bottom);
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  const goldRim = 0.5 + 0.5 * Math.max(p.glint, p.bottom);
  if (p.big) {
    // giant 8-ball chandelier
    const R = r * 1.25;
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    fillInk(g, '#15110F', 3);
    g.strokeStyle = REWARD.gold;
    g.lineWidth = 4;
    g.globalAlpha = goldRim;
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = CF.cream;
    g.beginPath();
    g.arc(R * 0.18, -R * 0.1, R * 0.42, 0, TAU);
    g.fill();
    g.fillStyle = INK;
    g.font = `bold ${Math.round(R * 0.62)}px "Arial Black", Impact, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('8', R * 0.18, -R * 0.07);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.ellipse(-R * 0.45, -R * 0.5, R * 0.28, R * 0.14, -0.7, 0, TAU);
    g.fill();
    g.fillStyle = REWARD.dark;
    g.fillRect(-6, -R - 10, 12, 12);
  } else if (c.env === 'bar') {
    // green-shade pool-hall lamp: the bulb under the shade is the target
    const w = r * 2.6;
    g.beginPath();
    g.moveTo(-w * 0.22, -r * 1.2);
    g.lineTo(w * 0.22, -r * 1.2);
    g.lineTo(w * 0.5, r * 0.2);
    g.lineTo(-w * 0.5, r * 0.2);
    g.closePath();
    fillInk(g, CF.felt, 3);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(-w * 0.18, -r * 1.1, w * 0.1, r * 1.2);
    g.fillStyle = REWARD.gold;
    g.globalAlpha = goldRim;
    g.fillRect(-w * 0.5, r * 0.12, w, 5);
    g.globalAlpha = 1;
    g.fillStyle = CF.lampPool;
    g.beginPath();
    g.ellipse(0, r * 0.38, r * 0.5, r * 0.28, 0, 0, TAU);
    g.fill();
    drawGlow(g, 0, r * 0.5, CF.lampPool, r * 2.2, 0.35 + 0.3 * hit(c.b, 'hat', 0.06));
  } else {
    // blade sign on two chains: cream face, marquee lettering, gold rim
    const w = r * 2.9;
    const h = r * 1.9;
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-w * 0.35, -h * 0.5);
    g.lineTo(0, -r * 1.2);
    g.lineTo(w * 0.35, -h * 0.5);
    g.stroke();
    roundRectPath(g, -w / 2, -h / 2, w, h, 6);
    fillInk(g, '#2A2230', 3);
    roundRectPath(g, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 4);
    g.fillStyle = CF.cream;
    g.fill();
    g.strokeStyle = REWARD.gold;
    g.lineWidth = 3;
    g.globalAlpha = goldRim;
    roundRectPath(g, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 6);
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = CF.fig;
    g.font = `italic ${Math.round(h * 0.46)}px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(SIGN_WORDS[p.seed % SIGN_WORDS.length], 0, 2);
    // bulbs on the rim chase on the 8ths
    const ch = Math.floor(c.b.beat * 2);
    for (let i = 0; i < 6; i++) {
      const on = (i + ch) % 3 === 0;
      g.fillStyle = on ? CF.bulb : '#6A5A48';
      g.beginPath();
      g.arc(-w / 2 + 8 + i * ((w - 16) / 5), -h / 2 + 1, 3, 0, TAU);
      g.fill();
    }
  }
  g.restore();
  if (p.glint > 0.01) {
    const s = r * (0.7 + p.glint * 0.9);
    star4(g, x - r * 0.4, y - r * 0.8, s, 0, `rgba(255,232,150,${p.glint})`);
  }
}

// ============================================================================ STUMBLE: snapped cues

const SHAFTS: [number, number][] = [
  [-0.62, 34],
  [-0.3, 44],
  [-0.02, 40],
  [0.26, 46],
  [0.55, 36],
];

function spikeSprite() {
  return sprite('skin-spike', 110, 100, 55, 92, (g) => {
    g.lineCap = 'round';
    for (const [a, len] of SHAFTS) {
      const tx = Math.sin(a) * len;
      const ty = -18 - Math.cos(a) * len;
      g.strokeStyle = INK;
      g.lineWidth = 11;
      g.beginPath();
      g.moveTo(0, -12);
      g.lineTo(tx, ty);
      g.stroke();
      g.strokeStyle = CF.cueMaple;
      g.lineWidth = 5.5;
      g.stroke();
      // splintered red point (the ONLY red on a stumble hazard)
      g.beginPath();
      g.moveTo(tx - Math.cos(a) * 6, ty - Math.sin(a) * 6);
      g.lineTo(tx + Math.sin(a) * 18, ty - Math.cos(a) * 18);
      g.lineTo(tx + Math.cos(a) * 6, ty + Math.sin(a) * 6);
      g.closePath();
      fillInk(g, DANGER.red, 2);
    }
    // dented brass spittoon
    g.beginPath();
    g.moveTo(-26, -24);
    g.quadraticCurveTo(-34, -6, -22, 0);
    g.lineTo(22, 0);
    g.quadraticCurveTo(34, -6, 26, -24);
    g.closePath();
    fillInk(g, '#4A3E36', 3);
    g.fillStyle = '#6E5E4E';
    g.fillRect(-28, -28, 56, 8);
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.strokeRect(-28, -28, 56, 8);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(-18, -18, 6, 14);
  });
}

/** snapped cues bristling out of a spittoon (stumble hazard). (x, y) = feet on the floor. */
export function drawSpike(g: Ctx, x: number, y: number, pulse: number, rot: number): void {
  drawSprite(g, spikeSprite(), x, y, rot, 1 + 0.06 * pulse, 1 + 0.1 * pulse);
}

// ============================================================================ STUMBLE enemy: the Bluffer (jabber)

export interface JabberPose {
  /** 0..1 flex on the swung "and" (double-biceps bluff; shoulders = bounce platform) */
  flex: number;
  /** 0..1 cue jab on the beat */
  jab: number;
  /** 0..1 wind-up tell during the beat before ITS jab beat (leans back, cue cocked, tip glows red) */
  windup: number;
  flying: boolean;
  dead: boolean;
  rot: number;
  scale: number;
  squash: number;
  /** presentation clock */
  time: number;
  seed: number;
}

const FIG = CF.fig;
const FIG_HI = '#8A4A76';
const SKIN = '#B98262';
const PANTS = '#2A2230';

/** Bluffer at feet-centre (x, y), facing LEFT toward the hero: round-shouldered bruiser, fig vest, flat cap, red-tipped cue. */
export function drawJabber(g: Ctx, x: number, y: number, P: JabberPose): void {
  g.save();
  g.translate(x, y);
  g.scale(P.scale * (1 + P.squash), P.scale * (1 - P.squash));
  if (P.rot) {
    g.translate(0, -60);
    g.rotate(P.rot);
    g.translate(0, 60);
  }
  const dead = P.dead || P.flying;
  const wind = dead ? 0 : P.windup;
  const flex = dead || wind > 0.05 ? 0 : P.flex;
  const jab = dead ? 0 : P.jab;
  // lean: back on the wind-up, forward on the jab
  const lean = wind * 0.2 - jab * 0.16;
  // legs (planted, wide)
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.strokeStyle = INK;
    g.lineWidth = 19;
    g.beginPath();
    g.moveTo(s * 12, -44);
    g.lineTo(s * 17, -6);
    g.stroke();
    g.strokeStyle = PANTS;
    g.lineWidth = 13;
    g.stroke();
    g.beginPath();
    g.ellipse(s * 17 - 5, -4, 13, 7, 0, 0, TAU);
    fillInk(g, '#1E1614', 2);
  }
  g.save();
  g.translate(0, -44);
  g.rotate(lean);
  // cue behind the body on the flex (tucked under an arm), in hand otherwise
  const shoulderY = -56;
  const tipGlow = wind;
  // torso: barrel in a fig vest over a cream undershirt
  blobPath(g, 0, -30, 31, 34, 0.45);
  fillInk(g, '#E9DCC4', 3);
  g.beginPath();
  g.moveTo(-31, -28);
  g.quadraticCurveTo(-30, -62, -6, -64);
  g.lineTo(-10, -20);
  g.lineTo(-6, 4);
  g.quadraticCurveTo(-28, 2, -31, -28);
  g.closePath();
  fillInk(g, FIG, 2.5);
  g.beginPath();
  g.moveTo(31, -28);
  g.quadraticCurveTo(30, -62, 6, -64);
  g.lineTo(10, -20);
  g.lineTo(6, 4);
  g.quadraticCurveTo(28, 2, 31, -28);
  g.closePath();
  fillInk(g, FIG, 2.5);
  g.fillStyle = FIG_HI;
  g.fillRect(14, -52, 5, 40);
  // belt
  g.fillStyle = INK;
  g.fillRect(-28, -2, 56, 7);
  g.fillStyle = REWARD.dark;
  g.fillRect(-5, -2, 10, 7);
  // arms
  const arm = (sx: number, ex: number, ey: number, hx: number, hy: number) => {
    g.strokeStyle = INK;
    g.lineWidth = 21;
    g.beginPath();
    g.moveTo(sx, shoulderY);
    g.lineTo(ex, ey);
    g.lineTo(hx, hy);
    g.stroke();
    g.strokeStyle = SKIN;
    g.lineWidth = 15;
    g.stroke();
    g.beginPath();
    g.arc(hx, hy, 9, 0, TAU);
    fillInk(g, SKIN, 2.5);
  };
  let tip: [number, number];
  let butt: [number, number];
  if (flex > 0.05) {
    // DOUBLE-BICEPS "W": upper arms level, fists up, cue tucked vertical behind
    const k = easeOut(flex);
    butt = [30, 10];
    tip = [30 - 10 * k, -130];
    drawCue(g, butt, tip, 0);
    arm(-24, -52, shoulderY - 4 * k, -50 + 4 * k, shoulderY - 40 * k);
    arm(24, 52, shoulderY - 4 * k, 50 - 4 * k, shoulderY - 40 * k);
    // biceps bulge
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(s * 40, shoulderY - 8 * k, 11 * k + 4, 8 * k + 3, 0, 0, TAU);
      fillInk(g, SKIN, 2);
    }
    // flat shoulders = bounce platform (cream lip)
    g.fillStyle = INK;
    g.fillRect(-46, shoulderY - 16, 92, 5);
    g.fillStyle = LIP;
    g.globalAlpha = k;
    g.fillRect(-46, shoulderY - 18, 92, 3);
    g.globalAlpha = 1;
  } else {
    // cue held two-handed, tip toward the hero (left); jab thrusts it, wind-up cocks it back + up
    const reach = jab * 46 - wind * 26;
    const cy = shoulderY + 24 - wind * 18;
    butt = [44 - reach * 0.4, cy + 22 + wind * 10];
    tip = [-96 - reach, cy - 6 - wind * 30];
    drawCue(g, butt, tip, tipGlow);
    arm(24, 30, shoulderY + 18, butt[0] - 10 + (tip[0] - butt[0]) * 0.06, butt[1] + (tip[1] - butt[1]) * 0.06);
    arm(-24, -34 - reach * 0.3, shoulderY + 14, -44 - reach * 0.8, cy + 4 - wind * 12);
  }
  // shoulders (deltoid caps)
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(s * 26, shoulderY + 2, 13, 0, TAU);
    fillInk(g, SKIN, 2.5);
  }
  // head: small, thick neck, flat cap, mutton chops, scowl
  const hx = -4;
  const hy = shoulderY - 22 + (wind > 0 ? -2 : 0);
  g.fillStyle = SKIN;
  g.fillRect(hx - 8, hy + 4, 16, 14);
  g.beginPath();
  g.ellipse(hx, hy, 14, 15, 0, 0, TAU);
  fillInk(g, SKIN, 2.5);
  g.fillStyle = '#3A2418';
  g.fillRect(hx - 14, hy - 2, 5, 12);
  g.fillRect(hx + 9, hy - 2, 5, 12);
  if (P.flying && !P.dead) {
    // landed his jab: off he goes, laughing
    cartoonEye(g, hx - 7, hy - 1, { r: 4, style: 'happy', ink: K });
    cartoonEye(g, hx + 3, hy - 1, { r: 3.6, style: 'happy', ink: K });
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(hx - 3, hy + 9, 6, 5, 0, 0, TAU);
    g.fill();
  } else if (dead) {
    // X eyes
    g.strokeStyle = INK;
    g.lineWidth = 2.5;
    for (const ex of [hx - 8, hx + 2]) {
      g.beginPath();
      g.moveTo(ex - 3, hy - 4);
      g.lineTo(ex + 3, hy + 2);
      g.moveTo(ex + 3, hy - 4);
      g.lineTo(ex - 3, hy + 2);
      g.stroke();
    }
  } else {
    cartoonEye(g, hx - 7, hy - 1, { r: 4, style: wind > 0.3 ? 'wide' : 'angry', lookX: -1, ink: K });
    cartoonEye(g, hx + 3, hy - 1, { r: 3.6, style: wind > 0.3 ? 'wide' : 'angry', lookX: -1, ink: K });
  }
  g.strokeStyle = INK;
  g.lineWidth = 2.5;
  g.beginPath();
  if (P.flying && !P.dead) {
    // (laugh drawn above)
  } else if (flex > 0.3 || jab > 0.3) {
    g.moveTo(hx - 9, hy + 8);
    g.lineTo(hx + 3, hy + 7);
  } else g.arc(hx - 3, hy + 11, 5, 1.1 * Math.PI, 1.9 * Math.PI);
  g.stroke();
  // flat cap, brim toward the hero
  g.beginPath();
  g.ellipse(hx + 1, hy - 11, 16, 8, -0.08, Math.PI, TAU);
  g.lineTo(hx - 22, hy - 9);
  g.lineTo(hx - 22, hy - 6);
  g.lineTo(hx + 16, hy - 8);
  g.closePath();
  fillInk(g, '#3A3A42', 2.5);
  g.restore();
  // wind-up tell: strain marks + "!" over the head
  if (wind > 0.05 && !dead) {
    const a = clamp01(wind * 1.6);
    g.strokeStyle = `rgba(26,20,16,${a})`;
    g.lineWidth = 4;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(-4 + i * 16, -150 - Math.abs(i) * 4);
      g.lineTo(-4 + i * 22, -164 - Math.abs(i) * 6);
      g.stroke();
    }
    g.font = 'bold 40px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center';
    g.lineWidth = 7;
    g.strokeStyle = `rgba(26,20,16,${a})`;
    g.strokeText('!', -4, -168);
    g.fillStyle = `rgba(255,74,61,${a})`;
    g.fillText('!', -4, -168);
  }
  g.restore();
}

function drawCue(g: Ctx, butt: [number, number], tip: [number, number], glow: number): void {
  g.lineCap = 'round';
  g.strokeStyle = INK;
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(butt[0], butt[1]);
  g.lineTo(tip[0], tip[1]);
  g.stroke();
  g.strokeStyle = CF.cueMaple;
  g.lineWidth = 4.5;
  g.stroke();
  const mx = butt[0] + (tip[0] - butt[0]) * 0.3;
  const my = butt[1] + (tip[1] - butt[1]) * 0.3;
  g.strokeStyle = CF.cueButt;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(butt[0], butt[1]);
  g.lineTo(mx, my);
  g.stroke();
  // red chalked tip (stumble language: red POINT)
  if (glow > 0.05) drawGlow(g, tip[0], tip[1], DANGER.hot, 28 + 30 * glow, 0.5 * glow);
  g.beginPath();
  g.arc(tip[0], tip[1], 6.5 + glow * 2, 0, TAU);
  fillInk(g, glow > 0.5 ? DANGER.hot : DANGER.red, 2);
}

// ============================================================================ TERRAIN: cellar keg lift (slam platform)

export const SLAM_LIFT_PX = 150;

/** Cellar keg lift on a hydraulic ram: heavy oak deck, brass-hooped kegs slung under it. `lift` 0 = slammed (solid). */
export function drawSlamPlatform(g: Ctx, x: number, y: number, w: number, h: number, lift: number, pitY: number, slam: number, b: BeatInfo): void {
  const oy = -lift * SLAM_LIFT_PX;
  const cx = x + w / 2;
  // guide rails (fixed) + the ram (extends with the lift)
  g.fillStyle = '#2A262C';
  g.fillRect(x + 4, y - 900, 7, 900 + h + 400);
  g.fillRect(x + w - 11, y - 900, 7, 900 + h + 400);
  g.fillStyle = '#6E7078';
  g.fillRect(cx - 9, y + oy + h, 18, pitY + 400 - (y + oy + h));
  g.fillStyle = CF.chrome;
  g.fillRect(cx - 4, y + oy + h, 5, pitY + 400 - (y + oy + h));
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.strokeRect(cx - 9, y + oy + h, 18, pitY + 400 - (y + oy + h));
  g.save();
  const up = lift > 0.02;
  if (up) g.globalAlpha = 0.72;
  g.translate(0, oy);
  // keg slung under the deck
  const kw = Math.min(w * 0.55, 70);
  roundRectPath(g, cx - kw / 2, y + h - 2, kw, 40, 12);
  fillInk(g, '#6A4A30', 3);
  g.fillStyle = '#B8923A';
  g.fillRect(cx - kw / 2, y + h + 6, kw, 5);
  g.fillRect(cx - kw / 2, y + h + 26, kw, 5);
  // oak deck + iron straps
  g.beginPath();
  g.rect(x, y, w, h);
  fillInk(g, '#8A5A36', 3);
  g.fillStyle = '#6A4428';
  for (let px = x + 18; px < x + w - 6; px += 26) g.fillRect(px, y + 4, 3, h - 6);
  g.fillStyle = '#3A3A42';
  g.fillRect(x, y + h - 9, w, 9);
  g.fillRect(x + w * 0.2 - 4, y, 8, h);
  g.fillRect(x + w * 0.8 - 4, y, 8, h);
  // walkable top: bright cream lip when down (solid), dim + dashed when up (not solid)
  g.fillStyle = INK;
  g.fillRect(x, y - 2, w, 5);
  if (!up) {
    g.fillStyle = LIP;
    g.fillRect(x, y - 4, w, 3);
    if (slam > 0.05) {
      g.fillStyle = `rgba(255,246,232,${0.8 * slam})`;
      g.fillRect(x - 4, y - 8, w + 8, 5);
    }
  } else {
    g.fillStyle = 'rgba(244,239,226,0.5)';
    for (let px = x; px < x + w; px += 18) g.fillRect(px, y - 4, 9, 3);
  }
  g.restore();
  // shadow on the deck's landing spot sharpens as it comes down
  g.fillStyle = `rgba(0,0,0,${0.35 * (1 - lift)})`;
  g.fillRect(x + 6, y + h + 44, w - 12, 6);
  void b;
}

// ============================================================================ LETHAL: the Burn (chaser)

/** The film burning through from the left: blinding projector light, bubbling hot-red blister edge. World space. */
export function drawChaser(g: Ctx, frontX: number, top: number, t: number, yBottom: number): void {
  const left = frontX - 4200;
  const seg = 24;
  const edge = (yy: number, off: number) => frontX + off + Math.sin(yy * 0.021 + t * 7) * 14 + Math.sin(yy * 0.093 - t * 11) * 8;
  // burnt-through: blinding light
  g.fillStyle = CF.beamHaze;
  g.beginPath();
  g.moveTo(left, top);
  for (let yy = top; yy <= yBottom + seg; yy += seg) g.lineTo(edge(yy, -40), yy);
  g.lineTo(left, yBottom + seg);
  g.closePath();
  g.fill();
  // hot glow bleeding past the edge
  for (let yy = top + 60; yy < yBottom; yy += 220) drawGlow(g, edge(yy, 10), yy, DANGER.hot, 170, 0.4);
  // bands: amber-white -> hot red -> lacquer -> char
  const bands: [number, string, number][] = [
    [-26, 'rgba(255,236,190,0.95)', 26],
    [-6, DANGER.hot, 16],
    [8, DANGER.red, 14],
    [22, 'rgba(42,20,16,0.95)', 16],
  ];
  for (const [off, col, wd] of bands) {
    g.strokeStyle = col;
    g.lineWidth = wd;
    g.beginPath();
    for (let yy = top; yy <= yBottom + seg; yy += seg) {
      const ex = edge(yy, off);
      if (yy === top) g.moveTo(ex, yy);
      else g.lineTo(ex, yy);
    }
    g.stroke();
  }
  // blisters: bubbles swell and pop along the edge
  for (let i = 0; i < 16; i++) {
    const yy = top + ((i + 0.5) / 16) * (yBottom - top);
    const ph = (t * (0.9 + hash(i) * 0.8) + hash(i + 4)) % 1;
    const r = 6 + 22 * Math.sin(ph * Math.PI);
    const ex = edge(yy, 30) + r * 0.3;
    g.beginPath();
    g.arc(ex, yy, r, 0, TAU);
    g.fillStyle = 'rgba(42,20,16,0.92)';
    g.fill();
    g.strokeStyle = DANGER.hot;
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = 'rgba(255,236,190,0.8)';
    g.beginPath();
    g.arc(ex - r * 0.3, yy - r * 0.3, r * 0.3, 0, TAU);
    g.fill();
  }
}

// ============================================================================ REWARD-ish: film splice (checkpoint)

/** splice across the frame: a diagonal cut, cream tape with sprockets, "SC. n" in grease pencil. */
export function drawSplice(g: Ctx, x: number, y0: number, y1: number, reached: boolean, flash: number, scene: string, groundY: number): void {
  const a = reached ? 0.14 + 0.5 * flash : 0.16;
  g.fillStyle = `rgba(244,239,226,${a})`;
  g.beginPath();
  g.moveTo(x - 34, y0);
  g.lineTo(x + 26, y0);
  g.lineTo(x + 34, y1);
  g.lineTo(x - 26, y1);
  g.closePath();
  g.fill();
  // the cut
  g.strokeStyle = `rgba(26,20,16,${reached ? 0.5 : 0.7})`;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x - 6, y0);
  g.lineTo(x + 8, y1);
  g.stroke();
  g.fillStyle = 'rgba(26,20,16,0.35)';
  for (let yy = y0 - (((y0 % 44) + 44) % 44); yy < y1; yy += 44) {
    const k = (yy - y0) / Math.max(1, y1 - y0);
    g.fillRect(x - 30 + k * 8, yy, 9, 16);
    g.fillRect(x + 20 + k * 8, yy, 9, 16);
  }
  if (flash > 0.02) drawGlow(g, x, groundY - 200, CF.beamHaze, 260, 0.5 * flash);
  // slate on a stand at the ground: "SC. n"
  g.save();
  g.translate(x - 60, groundY - 110);
  g.rotate(-0.06);
  roundRectPath(g, -58, -40, 116, 76, 6);
  fillInk(g, '#1E1A1A', 3);
  g.fillStyle = reached ? REWARD.gold : CF.cream;
  g.font = 'bold 34px "Marker Felt", "Comic Sans MS", "Trebuchet MS", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(scene, 0, 0);
  // clapper stripes
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i % 2 ? CF.cream : INK;
    g.fillRect(-58 + i * 23.2, -52, 23.2, 12);
  }
  g.restore();
  g.fillStyle = INK;
  g.fillRect(x - 64, groundY - 74, 8, 74);
}

/** cigarette-burn changeover dot, top-right of the frame (screen space) */
export function drawCueDot(g: Ctx, a: number): void {
  if (a <= 0.01) return;
  g.fillStyle = `rgba(248,241,220,${a})`;
  g.beginPath();
  g.arc(1920 - 150, 190, 30, 0, TAU);
  g.fill();
  g.strokeStyle = `rgba(26,20,16,${a * 0.6})`;
  g.lineWidth = 4;
  g.stroke();
}

// ============================================================================ chalk: scansion marks, bar lines, phrases

const CHALK = '#E4EEF2';

/** cue-chalk mark on the floor: ∪ short / – long. Lit jade on its beat, gold after a Perfect. */
export function drawScansion(g: Ctx, glyph: 'short' | 'long', x: number, y: number, lit: number, gold: boolean): void {
  const col = gold ? REWARD.gold : lit > 0.02 ? `rgba(70,214,160,${0.65 + 0.35 * lit})` : 'rgba(228,238,242,0.78)';
  g.lineCap = 'round';
  if (lit > 0.02 || gold) {
    g.strokeStyle = gold ? 'rgba(224,182,74,0.35)' : `rgba(70,214,160,${0.35 * lit})`;
    g.lineWidth = 20;
    chalkGlyph(g, glyph, x, y);
  }
  g.strokeStyle = 'rgba(26,20,16,0.55)';
  g.lineWidth = 12 + 2 * lit;
  chalkGlyph(g, glyph, x, y);
  g.strokeStyle = col;
  g.lineWidth = 7 + 2 * lit;
  chalkGlyph(g, glyph, x, y);
  // chalk grain
  g.fillStyle = 'rgba(26,20,16,0.35)';
  for (let i = 0; i < 4; i++) g.fillRect(x - 14 + hash(i + x) * 28, y - 8 + hash(i * 3 + x) * 10, 2, 2);
}

function chalkGlyph(g: Ctx, glyph: 'short' | 'long', x: number, y: number): void {
  g.beginPath();
  if (glyph === 'short') g.arc(x, y - 8, 16, 0.2, Math.PI - 0.2);
  else {
    g.moveTo(x - 28, y + 2);
    g.lineTo(x + 28, y);
  }
  g.stroke();
}

/** bar line: a chalk stroke on the curb at every downbeat (quiet metronome) */
export function drawBarLine(g: Ctx, x: number, y: number, pulse: number): void {
  g.fillStyle = `rgba(228,238,242,${0.45 + 0.45 * pulse})`;
  g.save();
  g.translate(x, y + 6);
  g.rotate(0.08);
  g.fillRect(-4, 0, 8, 20 + 6 * pulse);
  g.restore();
}

/** Hup-Hup-HEY! phrase: chalk words over its three marks + a bracket (drawn where marks are on) */
export function drawPhrase(g: Ctx, xs: [number, number, number], y: number, lit: number[], done: boolean): void {
  const words = ['HUP', 'HUP', 'HEY!'];
  g.save();
  g.font = 'bold 30px "Marker Felt", "Comic Sans MS", "Trebuchet MS", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const big = i === 2;
    g.font = `bold ${big ? 40 : 30}px "Marker Felt", "Comic Sans MS", "Trebuchet MS", sans-serif`;
    g.lineWidth = 7;
    g.strokeStyle = 'rgba(26,20,16,0.7)';
    g.strokeText(words[i], xs[i], y + 36);
    g.fillStyle = done ? REWARD.gold : lit[i] > 0.05 ? `rgba(70,214,160,${0.7 + 0.3 * lit[i]})` : CHALK;
    g.fillText(words[i], xs[i], y + 36);
  }
  g.strokeStyle = 'rgba(228,238,242,0.55)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(xs[0] - 30, y + 58);
  g.lineTo(xs[0] - 30, y + 64);
  g.lineTo(xs[2] + 34, y + 64);
  g.lineTo(xs[2] + 34, y + 58);
  g.stroke();
  g.restore();
}

// ============================================================================ TERRAIN: awnings / shelves / crates

/** one-way platform: striped canvas awning (street) or a bar shelf on brass brackets (bar) */
export function drawPlatform(g: Ctx, x: number, y: number, w: number, h: number, env: EnvKind, b: BeatInfo): void {
  if (env === 'bar') {
    g.beginPath();
    g.rect(x, y, w, Math.max(16, h));
    fillInk(g, '#5A3A26', 3);
    g.fillStyle = '#B8923A';
    for (const bx of [x + 20, x + w - 34]) {
      g.beginPath();
      g.moveTo(bx, y + h);
      g.lineTo(bx + 14, y + h);
      g.lineTo(bx + 14, y + h + 40);
      g.closePath();
      g.fill();
    }
  } else {
    // scalloped awning, dusty teal + cream stripes (never a sacred colour), sways a hair on the hats
    const sway = 2 * hit(b, 'hat', 0.08);
    const d = 34;
    g.save();
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w, y);
    g.lineTo(x + w + 10, y + d);
    for (let sx = x + w + 10; sx > x - 10; sx -= 26) g.quadraticCurveTo(sx - 13, y + d + 14 + sway, sx - 26, y + d);
    g.lineTo(x - 10, y + d);
    g.closePath();
    g.lineWidth = 6;
    g.strokeStyle = INK;
    g.stroke();
    g.clip();
    for (let sx = x - 10, i = 0; sx < x + w + 20; sx += 26, i++) {
      g.fillStyle = i % 2 ? '#3E8C84' : '#E9DCC4';
      g.fillRect(sx, y, 26, d + 20);
    }
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(x - 10, y + d - 8, w + 30, 30);
    g.restore();
    g.fillStyle = INK;
    g.fillRect(x + 10, y + d, 5, 60);
    g.fillRect(x + w - 15, y + d, 5, 60);
  }
  walkTop(g, x, y, w);
}

/** solid block: a stack of beer crates */
export function drawBlock(g: Ctx, x: number, y: number, w: number, h: number): void {
  const rows = Math.max(1, Math.round(h / 44));
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    const cy = y + r * ch;
    g.beginPath();
    g.rect(x, cy, w, ch);
    fillInk(g, r % 2 ? '#7A5A3A' : '#8A6A48', 2.5);
    g.fillStyle = '#4E3A2C';
    g.fillRect(x + 6, cy + ch * 0.35, w - 12, 4);
    g.fillStyle = '#2F5A3A';
    for (let bx = x + 10; bx < x + w - 10; bx += 16) g.fillRect(bx, cy + 5, 8, ch * 0.3);
  }
  walkTop(g, x, y, w);
}

// ============================================================================ finish: end of reel

/** "END OF REEL 1" marquee on two poles; bulbs chase on the 8ths */
export function drawFinish(g: Ctx, x: number, y: number, b: BeatInfo, label = 'END OF REEL 1'): void {
  const pulse = 1 + 0.04 * hit(b, 'kick', 0.1);
  g.save();
  g.translate(x, y);
  g.scale(pulse, pulse);
  g.fillStyle = INK;
  g.fillRect(-150, -330, 10, 330);
  g.fillRect(140, -330, 10, 330);
  roundRectPath(g, -190, -470, 380, 150, 10);
  fillInk(g, '#2A1E2A', 4);
  roundRectPath(g, -176, -456, 352, 122, 6);
  g.fillStyle = CF.cream;
  g.fill();
  g.fillStyle = CF.fig;
  g.font = 'italic 50px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, 0, -395);
  const ch = Math.floor(b.beat * 2);
  for (let i = 0; i < 24; i++) {
    const u = i / 24;
    const px = u < 0.5 ? -186 + u * 2 * 372 : 186 - (u - 0.5) * 2 * 372;
    const py = u < 0.5 ? -466 : -324;
    const on = (i + ch) % 3 === 0;
    g.fillStyle = on ? CF.bulb : '#6A5A48';
    g.beginPath();
    g.arc(px, py, 5, 0, TAU);
    g.fill();
    if (on) drawGlow(g, px, py, CF.bulb, 18, 0.5);
  }
  g.restore();
}

// ============================================================================ REWARD: breakable targets

export interface BreakableView {
  x: number;
  y: number;
  r: number;
  baseY: number;
  high: boolean;
  big: boolean;
  look: string;
  /** 0..1 glint the beat before its strike beat */
  glint: number;
  /** 0..1 on its strike beat */
  now: number;
  /** seconds since it broke (NaN = intact) */
  brokenT: number;
  seed: number;
  viewTop: number;
}

const NEON_LETTERS = 'JIMBIG8';

/** Breakable target (reward): bottle / beer glass / crate / neon letter / moonshine jug on a stool or hanging. Gold rim = pays. */
export function drawBreakable(g: Ctx, p: BreakableView, c: SkinCtx): void {
  const { x, y, r } = p;
  if (!Number.isNaN(p.brokenT)) {
    const k = clamp01(p.brokenT / 0.45);
    if (k >= 1) return;
    g.globalAlpha = 1 - k;
    g.strokeStyle = REWARD.gold;
    g.lineWidth = 6 * (1 - k);
    g.beginPath();
    g.arc(x, y, r + 80 * easeOut(k), 0, TAU);
    g.stroke();
    g.fillStyle = p.look === 'crate' ? '#8A6A48' : p.look === 'neon' ? CF.neonRose : '#5A8A6A';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + p.seed;
      g.fillRect(x + Math.cos(a) * 90 * k, y + Math.sin(a) * 70 * k + 120 * k * k, 7, 5);
    }
    g.globalAlpha = 1;
    return;
  }
  // support: a hanging cable (high) or a bar stool / crate stand (low)
  if (p.high) {
    g.strokeStyle = 'rgba(26,20,16,0.85)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, p.viewTop);
    g.lineTo(x, y - r);
    g.stroke();
  } else if (p.baseY - (y + r) > 8) {
    const top = y + r * (p.look === 'crate' ? 1 : 0.95);
    g.strokeStyle = INK;
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(x - 20, p.baseY);
    g.lineTo(x - 12, top);
    g.moveTo(x + 20, p.baseY);
    g.lineTo(x + 12, top);
    g.stroke();
    g.strokeStyle = '#6A5A4A';
    g.lineWidth = 4;
    g.stroke();
    g.beginPath();
    g.ellipse(x, top, 26, 7, 0, 0, TAU);
    fillInk(g, '#8A2E3E', 2.5);
  }
  const hot = Math.max(p.glint, p.now);
  if (hot > 0.02) drawGlow(g, x, y, REWARD.glow, r * 2.8, 0.45 * hot);
  const bob = p.high ? Math.sin(c.time * 2 + p.seed) * 0.08 : 0;
  g.save();
  g.translate(x, y);
  g.rotate(bob);
  const s = r / 30;
  g.scale(s, s);
  switch (p.look) {
    case 'crate': {
      g.beginPath();
      g.rect(-32, -30, 64, 60);
      fillInk(g, '#8A6A48', 3);
      g.fillStyle = '#5A4230';
      g.fillRect(-32, -6, 64, 6);
      g.strokeStyle = '#5A4230';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(-28, -26);
      g.lineTo(28, 26);
      g.stroke();
      g.fillStyle = INK;
      g.font = 'bold 13px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center';
      g.fillText('XXX', 0, 20);
      break;
    }
    case 'neon': {
      const ch = NEON_LETTERS[p.seed % NEON_LETTERS.length];
      g.font = 'italic 76px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 12;
      g.strokeStyle = INK;
      g.strokeText(ch, 0, 2);
      g.fillStyle = CF.neonRose;
      g.fillText(ch, 0, 2);
      drawGlow(g, 0, 0, CF.neonRose, 60, 0.35 + 0.3 * hit(c.b, 'hat', 0.06));
      break;
    }
    case 'glass': {
      g.beginPath();
      g.moveTo(-18, -26);
      g.lineTo(18, -26);
      g.lineTo(15, 28);
      g.lineTo(-15, 28);
      g.closePath();
      fillInk(g, 'rgba(232,200,106,0.95)', 3);
      g.fillStyle = CF.cream;
      g.beginPath();
      g.ellipse(0, -26, 20, 9, 0, 0, TAU);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 5;
      g.beginPath();
      g.arc(20, 0, 11, -1.2, 1.2);
      g.stroke();
      break;
    }
    case 'jug': {
      blobPath(g, 0, 6, 24, 24, 0.3);
      fillInk(g, '#C8B89A', 3);
      g.beginPath();
      g.rect(-7, -30, 14, 14);
      fillInk(g, '#8A7A60', 2.5);
      g.fillStyle = INK;
      g.font = 'bold 14px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center';
      g.fillText('XXX', 0, 12);
      break;
    }
    default: {
      // bottle
      g.beginPath();
      g.moveTo(-6, -40);
      g.lineTo(6, -40);
      g.lineTo(7, -16);
      g.quadraticCurveTo(16, -10, 16, 2);
      g.lineTo(16, 32);
      g.lineTo(-16, 32);
      g.lineTo(-16, 2);
      g.quadraticCurveTo(-16, -10, -7, -16);
      g.closePath();
      fillInk(g, '#3E7A5A', 3);
      g.fillStyle = CF.cream;
      g.fillRect(-13, 2, 26, 16);
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.fillRect(-11, -8, 4, 36);
    }
  }
  // the gold rim: it PAYS (brightens into its beat)
  g.strokeStyle = REWARD.gold;
  g.lineWidth = 3;
  g.globalAlpha = 0.45 + 0.55 * hot;
  g.beginPath();
  g.arc(0, 0, 44, -2.4, -0.7);
  g.stroke();
  g.globalAlpha = 1;
  g.restore();
  if (p.glint > 0.05) star4(g, x + r * 0.6, y - r * 0.9, r * (0.6 + p.glint * 0.8), 0, `rgba(255,232,150,${p.glint})`);
}

// ============================================================================ TERRAIN: bounce pads (launch)

/** Bounce pad: striped mattresses on the curb (street) / a pool table's rail cushion (bar). Chalk up-chevrons. */
export function drawBouncePad(g: Ctx, cx: number, y: number, w: number, kick: number, env: EnvKind, b: BeatInfo): void {
  const sq = kick; // 1 on launch
  const h = 34 * (1 - 0.45 * sq);
  const x = cx - w / 2;
  if (env === 'bar') {
    // a pool-table top on the floor: felt bed (the pad) in a walnut rail
    g.beginPath();
    g.rect(x - 6, y - h + 12, w + 12, h - 10);
    fillInk(g, CF.walnut, 3);
    g.beginPath();
    g.rect(x, y - h, w, 16);
    fillInk(g, CF.felt, 3);
  } else {
    // stack of ticking-striped mattresses
    for (let i = 0; i < 2; i++) {
      const my = y - h + i * (h / 2);
      roundRectPath(g, x - i * 6, my, w + i * 12, h / 2 + 2, 8);
      fillInk(g, i ? '#B8AE9A' : '#E4DCC8', 2.5);
      g.save();
      roundRectPath(g, x - i * 6, my, w + i * 12, h / 2 + 2, 8);
      g.clip();
      g.fillStyle = 'rgba(62,90,134,0.55)';
      for (let sx = x - 10; sx < x + w + 10; sx += 14) g.fillRect(sx, my, 4, h);
      g.restore();
    }
  }
  walkTop(g, x, y - h, w, 0.8);
  // chalk up-chevrons pulsing on the beat
  const p = Math.exp(-b.beatPhase * 4);
  g.strokeStyle = `rgba(228,238,242,${0.5 + 0.4 * p})`;
  g.lineWidth = 5;
  g.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const cy = y - h - 26 - i * 18 - sq * 30;
    g.beginPath();
    g.moveTo(cx - 20, cy + 10);
    g.lineTo(cx, cy - 4);
    g.lineTo(cx + 20, cy + 10);
    g.stroke();
  }
}

// ============================================================================ STUMBLE: low hanging sign (slide under)

/** Low sign across the lane: a heavy marquee panel on chains, broken-bulb RED POINTS along its bottom edge (stumble). */
export function drawLowSign(g: Ctx, x: number, y: number, w: number, h: number, swing: number, hitK: boolean, b: BeatInfo, viewTop: number): void {
  const rot = swing * 0.12;
  // chains to the top of the frame
  g.strokeStyle = 'rgba(26,20,16,0.9)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x + 16, viewTop);
  g.lineTo(x + 16, y);
  g.moveTo(x + w - 16, viewTop);
  g.lineTo(x + w - 16, y);
  g.stroke();
  g.save();
  g.translate(x + w / 2, y);
  g.rotate(rot);
  const hw = w / 2;
  roundRectPath(g, -hw, 0, w, h, 8);
  fillInk(g, '#2A2230', 4);
  roundRectPath(g, -hw + 8, 8, w - 16, h - 16, 5);
  g.fillStyle = '#E9DCC4';
  g.fill();
  g.fillStyle = CF.fig;
  const fs = Math.min(h * 0.42, w * 0.28);
  g.font = `italic ${Math.round(fs)}px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // lettering sits low, where the eye is when you run at it; tall panels get a striped header
  const ty = Math.max(h * 0.42, h - fs * 1.35);
  g.fillText('DUCK!', 0, ty);
  g.font = `bold ${Math.round(Math.max(16, fs * 0.3))}px "Trebuchet MS", sans-serif`;
  g.fillText('▼ SLIDE ▼', 0, Math.min(h - 22, ty + fs * 0.75));
  if (ty > h * 0.5) {
    g.save();
    roundRectPath(g, -hw + 8, 8, w - 16, ty - fs * 0.75 - 8, 5);
    g.clip();
    for (let yy = -w; yy < ty; yy += 34) {
      g.fillStyle = CF.fig;
      g.beginPath();
      g.moveTo(-hw, yy);
      g.lineTo(hw, yy + w * 0.6);
      g.lineTo(hw, yy + w * 0.6 + 14);
      g.lineTo(-hw, yy + 14);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  // bulbs chase along the top edge
  const ch = Math.floor(b.beat * 2);
  for (let i = 0, n = Math.max(3, Math.round(w / 36)); i < n; i++) {
    const on = (i + ch) % 3 === 0;
    g.fillStyle = on ? CF.bulb : '#6A5A48';
    g.beginPath();
    g.arc(-hw + 18 + (i / (n - 1)) * (w - 36), 5, 4, 0, TAU);
    g.fill();
  }
  // bottom edge: smashed bulbs = red points (stumble language)
  for (let i = 0, n = Math.max(3, Math.round(w / 30)); i < n; i++) {
    const sx = -hw + 14 + (i / (n - 1)) * (w - 28);
    g.beginPath();
    g.moveTo(sx - 7, h - 2);
    g.lineTo(sx, h + 16);
    g.lineTo(sx + 7, h - 2);
    g.closePath();
    fillInk(g, hitK ? '#6A5A48' : DANGER.red, 2);
  }
  g.restore();
}

// ============================================================================ generic fallback + registry

/**
 * Generic silhouette for an entity kind without bespoke art yet — already in the right danger language.
 * (x, y) = feet centre, (w, h) = hitbox size.
 */
export function drawGeneric(g: Ctx, danger: DangerClass, x: number, y: number, w: number, h: number, b: BeatInfo): void {
  const p = hit(b, 'kick', 0.12);
  if (danger === 'lethal') {
    drawGlow(g, x, y - h / 2, DANGER.hot, Math.max(w, h) * 1.2, 0.35 + 0.2 * p);
    g.beginPath();
    const n = 7;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * TAU;
      const r = (i % 2 ? 0.42 : 0.6) * Math.max(w, h);
      g.lineTo(x + Math.cos(a) * r * (w / Math.max(w, h)), y - h / 2 + Math.sin(a) * r * (h / Math.max(w, h)));
    }
    g.closePath();
    fillInk(g, DANGER.red, 3);
    g.strokeStyle = DANGER.hot;
    g.lineWidth = 3;
    g.stroke();
  } else if (danger === 'stumble') {
    g.beginPath();
    g.rect(x - w / 2, y - h * 0.6, w, h * 0.6);
    fillInk(g, '#3A302A', 3);
    for (let i = 0; i < 4; i++) {
      const sx = x - w / 2 + ((i + 0.5) / 4) * w;
      g.beginPath();
      g.moveTo(sx - 7, y - h * 0.6);
      g.lineTo(sx, y - h);
      g.lineTo(sx + 7, y - h * 0.6);
      g.closePath();
      fillInk(g, DANGER.red, 2);
    }
  } else if (danger === 'reward') {
    drawToken(g, x, y - h / 2, b.beat, Math.max(w, h) / 36, p);
  } else {
    g.beginPath();
    g.rect(x - w / 2, y - h, w, h);
    fillInk(g, '#6A5A48', 3);
    walkTop(g, x - w / 2, y - h, w);
  }
}

export interface Skin {
  danger: DangerClass;
  /** optional bespoke draw; the renderer uses the typed functions above for the built-in kinds */
  draw?: (g: Ctx, e: { x: number; y: number; w: number; h: number }, c: SkinCtx) => void;
}

/** kind -> skin. New entity kinds: add an entry (danger class first; bespoke draw when the art exists). */
export const SKINS: Record<string, Skin> = {
  jabber: { danger: 'stumble' },
  spike: { danger: 'stumble' },
  gap: { danger: 'lethal' },
  chaser: { danger: 'lethal' },
  pendulum: { danger: 'reward' },
  lum: { danger: 'reward' },
  slam: { danger: 'neutral' },
  breakable: { danger: 'reward' },
  bounce: { danger: 'neutral' },
  lowSign: { danger: 'stumble' },
  platform: { danger: 'neutral' },
  block: { danger: 'neutral' },
};

/** the skin for a kind, or a generic one in the given danger class */
export function skinFor(kind: string, fallback: DangerClass = 'stumble'): Skin {
  return SKINS[kind] ?? { danger: fallback };
}

/** draw any entity of `kind` with its skin (bespoke or generic) */
export function drawKind(g: Ctx, kind: string, e: { x: number; y: number; w: number; h: number }, c: SkinCtx, fallback: DangerClass = 'stumble'): void {
  const s = skinFor(kind, fallback);
  if (s.draw) s.draw(g, e, c);
  else drawGeneric(g, s.danger, e.x, e.y, e.w, e.h, c.b);
}
