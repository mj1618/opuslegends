/**
 * The PROJECTOR SYNC card (game/calibrate.ts): the latency tap test, dressed as the head of a reel — an ACADEMY
 * FILM LEADER. Each click is one leader frame: the big number counts down, the sweep wedge wipes round the circle in
 * one click interval and the projector clatters; your tap drops a pip on the rim (12 o'clock = dead on, left = early,
 * right = late) and a mark on the sprocket strip underneath. Screen space, drawn over the cold open / pause.
 */
import { CF } from '../art/palette';
import { hash } from '../art/core/math';
import { drawGlow } from '../art/core/draw';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import { Tun } from '../game/tunables';
import { REWARD } from './entityDraw';
import { FONT, MARQUEE, outlineText, roundRect } from './screens';

const LEADER = '#8A8478';
const LEADER_DK = '#4A4640';
const TAU = Math.PI * 2;

export function drawCalibration(ctx: CanvasRenderingContext2D, g: Game): void {
  const c = g.calib;
  if (!c.active) return;
  const n = c.clicks.length;
  const cur = c.current;
  const firstUsed = n - Tun.calib.use;
  const u = cur >= 0 ? Math.max(0, Math.min(1, (c.now - c.clicks[cur]) / c.interval)) : 0;
  const flick = 0.93 + 0.07 * hash(Math.floor(c.now * 24));
  ctx.save();
  // the leader frame: grey film, a gate border, sprocket holes down both sides
  ctx.fillStyle = `rgba(14,12,10,${0.9})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const fx = 300;
  const fy = 60;
  const fw = VIEW_W - 600;
  const fh = VIEW_H - 250;
  ctx.globalAlpha = flick;
  ctx.fillStyle = LEADER;
  roundRect(ctx, fx, fy, fw, fh, 26);
  ctx.fill();
  ctx.fillStyle = '#0E0C0A';
  const off = (c.now * 240) % 150;
  for (let y = fy - 150 + off; y < fy + fh; y += 150) {
    if (y < fy - 60) continue;
    roundRect(ctx, fx - 170, y, 90, 70, 12);
    ctx.fill();
    roundRect(ctx, fx + fw + 80, y, 90, 70, 12);
    ctx.fill();
  }
  const cx = VIEW_W / 2;
  const cy = fy + fh / 2 + 10;
  const R = 245;
  // the sweep wedge (one click interval per turn), darker behind it — inside the frame
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 26);
  ctx.clip();
  ctx.fillStyle = LEADER_DK;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R * 1.6, -Math.PI / 2, -Math.PI / 2 + u * TAU);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // crosshair + rings
  ctx.strokeStyle = '#1A1410';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(fx + 20, cy);
  ctx.lineTo(fx + fw - 20, cy);
  ctx.moveTo(cx, fy + 20);
  ctx.lineTo(cx, fy + fh - 20);
  ctx.stroke();
  ctx.strokeStyle = '#F4EFE2';
  ctx.lineWidth = 10;
  for (const r of [R, R * 0.82]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }
  // the countdown number (clicks left)
  const num = Math.max(1, n - Math.max(0, cur));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 290px ${FONT}`;
  ctx.fillStyle = '#1A1410';
  ctx.fillText(String(num), cx, cy + 16);
  // the flash on each click
  const hitK = cur >= 0 ? Math.max(0, 1 - (c.now - c.clicks[cur]) / (c.interval * 0.35)) : 0;
  if (hitK > 0) drawGlow(ctx, cx, cy, '#FFF6E8', 520, 0.35 * hitK);
  // tap pips on the rim: angle = error (a full half-turn = half a click)
  for (let i = 0; i < n; i++) {
    const e = c.errs[i];
    if (!Number.isFinite(e)) continue;
    const k = Math.max(-1, Math.min(1, e / 1000 / (c.interval * 0.5)));
    const a = -Math.PI / 2 + k * Math.PI * 0.9;
    const good = Math.abs(e) < 60;
    const warm = i < firstUsed;
    ctx.fillStyle = warm ? 'rgba(244,239,226,0.45)' : good ? REWARD.gold : '#F4EFE2';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (R + 40), cy + Math.sin(a) * (R + 40), warm ? 10 : 16, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#1A1410';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  // dead-on mark at 12 o'clock
  ctx.fillStyle = CF.filmBlack;
  ctx.beginPath();
  ctx.moveTo(cx, cy - R - 12);
  ctx.lineTo(cx - 16, cy - R - 44);
  ctx.lineTo(cx + 16, cy - R - 44);
  ctx.closePath();
  ctx.fill();
  // scratches + dust on the leader
  ctx.strokeStyle = 'rgba(244,239,226,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const sx = fx + hash(i + Math.floor(c.now * 12)) * fw;
    ctx.beginPath();
    ctx.moveTo(sx, fy);
    ctx.lineTo(sx + 6, fy + fh);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // title strip + instructions (the HUD layer)
  ctx.font = `64px ${MARQUEE}`;
  outlineText(ctx, 'SYNC THE PROJECTOR', cx, fy + 58, CF.tangerine, 9);
  ctx.font = `bold 34px ${FONT}`;
  outlineText(ctx, 'tap  X  on every click', cx, fy + 104, CF.cream, 5);
  // the sprocket strip: one hole per click, lit as it sounds, your tap marked early/late above it
  const step = 96;
  const x0 = cx - ((n - 1) * step) / 2;
  const sy = VIEW_H - 130;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step;
    const lit = i === cur ? Math.max(0, 1 - (c.now - c.clicks[i]) / (c.interval * 0.8)) : 0;
    ctx.fillStyle = i < firstUsed ? 'rgba(233,216,180,0.18)' : 'rgba(233,216,180,0.32)';
    roundRect(ctx, x - 26, sy - 18, 52, 36, 8);
    ctx.fill();
    if (i <= cur) {
      ctx.globalAlpha = 0.35 + 0.65 * lit;
      ctx.fillStyle = i >= firstUsed ? REWARD.gold : CF.bulb;
      roundRect(ctx, x - 26, sy - 18, 52, 36, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const e = c.errs[i];
    if (Number.isFinite(e)) {
      const dx = Math.max(-1, Math.min(1, e / 1000 / (c.interval * 0.5))) * 40;
      ctx.fillStyle = Math.abs(e) < 60 ? '#2FA37A' : '#E9D8B4';
      ctx.beginPath();
      ctx.moveTo(x + dx, sy - 24);
      ctx.lineTo(x + dx - 9, sy - 40);
      ctx.lineTo(x + dx + 9, sy - 40);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.font = `24px ${FONT}`;
  outlineText(ctx, 'the first two are a warm-up  ·  SPACE skips', cx, VIEW_H - 60, 'rgba(233,216,180,0.75)', 4);
  ctx.restore();
}
