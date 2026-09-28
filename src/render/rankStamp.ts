/**
 * THE RANK on the poster (iteration 6, review iter5 fix 10 — the replay hook; the letter + tier come from game/rank.ts):
 * each billing tier gets its OWN stamp, so an S looks like a different movie from a D.
 *
 *   S  BOX-OFFICE SMASH   a gold marquee badge with chasing bulbs, sunburst rays behind, a white-hot extruded S
 *   A  CRITICS' PICK      a laurel wreath around a cream/gold letter, four stars
 *   B  CULT CLASSIC       a midnight-movie NEON sign: rose tubes on a dark plate, buzzing
 *   C  B-MOVIE            a pulp rubber stamp, crooked, slime-green drips
 *   D  STRAIGHT TO VIDEO  a VHS cassette with a handwritten label and tracking lines
 *
 *   drawRankStamp(ctx, x, y, letter, tier, sk, t)   centre of the tier plate; sk 0..1 = the slam-in; t = seconds
 */
import { drawGlow, star4 } from '../art/core/draw';
import { TAU, hash } from '../art/core/math';
import { CF } from '../art/palette';
import { REWARD } from './entityDraw';
import { MARQUEE } from './screens';

const INK = CF.filmBlack;

export function drawRankStamp(ctx: CanvasRenderingContext2D, x: number, y: number, letter: string, tier: string, sk: number, t: number): void {
  if (sk <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const L = letter.toUpperCase();
  if (L === 'S') smash(ctx, tier, sk, t);
  else if (L === 'A') critics(ctx, tier, sk, t);
  else if (L === 'B') cult(ctx, tier, sk, t);
  else if (L === 'C') bmovie(ctx, tier, sk, t);
  else video(ctx, L, tier, sk, t);
  ctx.restore();
}

function slam(ctx: CanvasRenderingContext2D, sk: number, rot: number, over = 0.6): void {
  ctx.rotate(rot);
  const s = 1 + over * (1 - sk);
  ctx.scale(s, s);
  ctx.globalAlpha *= sk;
}

function tierText(ctx: CanvasRenderingContext2D, tier: string, x: number, y: number, fill: string, stroke: string | null, max: number): void {
  ctx.font = `${tier.length > 14 ? 44 : 50}px ${MARQUEE}`;
  if (stroke) {
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke;
    ctx.strokeText(tier, x, y, max);
  }
  ctx.fillStyle = fill;
  ctx.fillText(tier, x, y, max);
}

/** S — BOX-OFFICE SMASH: marquee badge + chasing bulbs + sunburst, a white-hot S */
function smash(ctx: CanvasRenderingContext2D, tier: string, sk: number, t: number): void {
  ctx.save();
  // sunburst behind everything
  ctx.save();
  ctx.translate(-262, 0);
  ctx.globalAlpha = sk * 0.9;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU + t * 0.4;
    ctx.fillStyle = i % 2 ? 'rgba(255,226,74,0.55)' : 'rgba(255,246,220,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 190, a, a + TAU / 36);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  slam(ctx, sk, -0.14, 0.9);
  // the marquee plate
  ctx.fillStyle = '#2A1810';
  roundRectPath(ctx, -220, -62, 440, 124, 14);
  ctx.fill();
  ctx.strokeStyle = REWARD.gold;
  ctx.lineWidth = 6;
  ctx.stroke();
  // chasing bulbs around the rim
  const n = 26;
  const ch = Math.floor(t * 10);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const per = 2 * (440 + 124);
    let d = u * per;
    let bx: number;
    let by: number;
    if (d < 440) [bx, by] = [-220 + d, -62];
    else if ((d -= 440) < 124) [bx, by] = [220, -62 + d];
    else if ((d -= 124) < 440) [bx, by] = [220 - d, 62];
    else [bx, by] = [-220, 62 - (d - 440)];
    const on = (i + ch) % 3 === 0;
    ctx.fillStyle = on ? '#FFF6D8' : '#8A6A2A';
    ctx.beginPath();
    ctx.arc(bx, by, on ? 6 : 4.5, 0, TAU);
    ctx.fill();
  }
  tierText(ctx, tier, 0, 6, '#FFE24A', INK, 400);
  // the letter: white-hot, gold extrude, a halo
  ctx.save();
  ctx.translate(-262, 0);
  drawGlow(ctx, 0, 0, '#FFE9A0', 150, 0.8);
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, TAU);
  ctx.fillStyle = '#2A1810';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = REWARD.gold;
  ctx.stroke();
  ctx.font = `110px ${MARQUEE}`;
  ctx.fillStyle = '#B8923A';
  for (let d = 7; d > 0; d--) ctx.fillText('S', d * 0.8, 8 + d);
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.strokeText('S', 0, 8);
  ctx.fillStyle = '#FFFBEA';
  ctx.fillText('S', 0, 8);
  ctx.restore();
  ctx.restore();
  for (let i = 0; i < 5; i++) {
    const a = t * 1.3 + i * 1.26;
    star4(ctx, -262 + Math.cos(a) * 110, Math.sin(a) * 90, 14 + 8 * Math.sin(t * 5 + i), t + i, 'rgba(255,246,220,0.9)');
  }
}

/** A — CRITICS' PICK: a laurel wreath around the letter, four stars on the plate */
function critics(ctx: CanvasRenderingContext2D, tier: string, sk: number, t: number): void {
  slam(ctx, sk, -0.1);
  ctx.fillStyle = CF.cream;
  roundRectPath(ctx, -210, -56, 420, 112, 8);
  ctx.fill();
  ctx.strokeStyle = REWARD.dark;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = REWARD.gold;
  ctx.lineWidth = 2;
  roundRectPath(ctx, -200, -46, 400, 92, 6);
  ctx.stroke();
  tierText(ctx, tier, 0, -6, REWARD.dark, null, 380);
  for (let i = 0; i < 4; i++) star4(ctx, -60 + i * 40, 30, 12, 0, REWARD.gold);
  // the wreath
  ctx.save();
  ctx.translate(-262, 0);
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI / 2 + sd * (0.35 + i * 0.28);
      const r = 72;
      const lx = Math.cos(a) * r;
      const ly = Math.sin(a) * r;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(a + (sd > 0 ? 0.6 : -0.6) + Math.PI / 2);
      ctx.fillStyle = i % 2 ? '#6A7A3A' : '#8A9A4A';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 17, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.beginPath();
  ctx.arc(0, 0, 56, 0, TAU);
  ctx.fillStyle = REWARD.dark;
  ctx.fill();
  ctx.font = `96px ${MARQUEE}`;
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.strokeText('A', 0, 6);
  ctx.fillStyle = CF.cream;
  ctx.fillText('A', 0, 6);
  ctx.restore();
  void t;
}

/** B — CULT CLASSIC: a midnight-movie neon sign (rose tubes on a dark plate), buzzing */
function cult(ctx: CanvasRenderingContext2D, tier: string, sk: number, t: number): void {
  slam(ctx, sk, -0.06, 0.4);
  const buzz = hash(Math.floor(t * 20)) < 0.06 ? 0.35 : 1;
  ctx.fillStyle = '#1A0E1C';
  roundRectPath(ctx, -214, -58, 428, 116, 10);
  ctx.fill();
  ctx.strokeStyle = '#3A2A40';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha *= buzz;
  drawGlow(ctx, 0, 0, CF.neonRose, 260, 0.35);
  ctx.font = `${tier.length > 14 ? 44 : 50}px ${MARQUEE}`;
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(224,86,155,0.45)';
  ctx.strokeText(tier, 0, 6, 390);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFD0E8';
  ctx.strokeText(tier, 0, 6, 390);
  ctx.restore();
  ctx.save();
  ctx.translate(-262, 0);
  ctx.beginPath();
  ctx.arc(0, 0, 60, 0, TAU);
  ctx.fillStyle = '#1A0E1C';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = CF.neonJade;
  ctx.stroke();
  drawGlow(ctx, 0, 0, CF.neonJade, 120, 0.35 * buzz);
  ctx.font = `92px ${MARQUEE}`;
  ctx.lineWidth = 12;
  ctx.strokeStyle = `rgba(63,240,224,${0.4 * buzz})`;
  ctx.strokeText('B', 0, 6);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#D8FFF8';
  ctx.strokeText('B', 0, 6);
  ctx.restore();
}

/** C — B-MOVIE: a crooked pulp rubber stamp with slime-green drips */
function bmovie(ctx: CanvasRenderingContext2D, tier: string, sk: number, t: number): void {
  slam(ctx, sk, -0.22, 0.7);
  const green = '#6A9A4A';
  ctx.strokeStyle = green;
  ctx.lineWidth = 7;
  roundRectPath(ctx, -206, -50, 412, 100, 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(106,154,74,0.14)';
  ctx.fill();
  tierText(ctx, tier, 0, 2, green, null, 380);
  // drips off the plate's bottom edge, sliding down slowly
  ctx.fillStyle = green;
  for (let i = 0; i < 7; i++) {
    const dx = -180 + hash(i + 3) * 360;
    const len = 12 + hash(i + 7) * 30 + Math.min(20, t * 4 * hash(i + 11));
    ctx.fillRect(dx - 3, 48, 6, len);
    ctx.beginPath();
    ctx.arc(dx, 48 + len, 5, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(-262, 0);
  ctx.rotate(0.12);
  ctx.strokeStyle = green;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, TAU);
  ctx.stroke();
  ctx.font = `92px ${MARQUEE}`;
  ctx.fillStyle = green;
  ctx.fillText('C', 0, 6);
  ctx.restore();
  // worn stamp: specks of the poster paper showing through the ink
  ctx.fillStyle = 'rgb(233,222,196)';
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.arc(-300 + hash(i * 3) * 520, -50 + hash(i * 5) * 100, 1 + hash(i + 9) * 2.2, 0, TAU);
    ctx.fill();
  }
}

/** D — STRAIGHT TO VIDEO: a VHS cassette with a handwritten label, tracking lines rolling over it */
function video(ctx: CanvasRenderingContext2D, letter: string, tier: string, sk: number, t: number): void {
  ctx.translate(60, 16);
  ctx.scale(0.86, 0.86);
  slam(ctx, sk, 0.05, 0.3);
  ctx.fillStyle = '#1A1818';
  roundRectPath(ctx, -300, -62, 520, 124, 8);
  ctx.fill();
  // the reels' windows
  ctx.fillStyle = '#3A3838';
  for (const rx of [-190, 110]) {
    ctx.beginPath();
    ctx.arc(rx, 34, 18, 0, TAU);
    ctx.fill();
  }
  // the label, handwritten
  ctx.fillStyle = '#F4EFE2';
  ctx.fillRect(-250, -50, 420, 60);
  ctx.fillStyle = '#2A2A6A';
  ctx.font = `italic 36px "Marker Felt", "Comic Sans MS", sans-serif`;
  ctx.fillText(`${tier.toLowerCase()}  (${letter})`, -40, -18, 400);
  // tracking lines
  ctx.fillStyle = 'rgba(244,239,226,0.18)';
  const ty = ((t * 60) % 150) - 70;
  ctx.fillRect(-300, ty, 520, 6);
  ctx.fillRect(-300, ty + 14, 520, 2);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
