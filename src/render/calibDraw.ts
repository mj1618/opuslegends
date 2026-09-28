/**
 * The projector sync card (game/calibrate.ts): shown while the latency tap test runs (cold open / pause).
 * A row of film sprockets = the clicks: each lights as its click sounds; a tap drops a mark above its sprocket,
 * shifted left/right by how early/late it was (±1 sprocket half-width = ±half a beat). Screen space.
 */
import { CF } from '../art/palette';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import { Tun } from '../game/tunables';
import { REWARD } from './entityDraw';
import { FONT, MARQUEE, outlineText, roundRect } from './screens';

export function drawCalibration(ctx: CanvasRenderingContext2D, g: Game): void {
  const c = g.calib;
  if (!c.active) return;
  const n = c.clicks.length;
  const cx = VIEW_W / 2;
  const cy = VIEW_H * 0.3;
  const w = 1100;
  const h = 330;
  ctx.save();
  ctx.fillStyle = 'rgba(13,10,8,0.82)';
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(233,216,180,0.45)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `64px ${MARQUEE}`;
  outlineText(ctx, 'SYNC THE PROJECTOR', cx, cy - 88, CF.tangerine, 9);
  ctx.font = `bold 32px ${FONT}`;
  outlineText(ctx, 'tap  X  on every click', cx, cy - 38, CF.cream, 5);
  // sprockets
  const step = 104;
  const x0 = cx - ((n - 1) * step) / 2;
  const cur = c.current;
  const firstUsed = n - Tun.calib.use;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step;
    const y = cy + 42;
    const lit = i === cur ? Math.max(0, 1 - (c.now - c.clicks[i]) / (c.interval * 0.8)) : 0;
    ctx.fillStyle = i < firstUsed ? 'rgba(233,216,180,0.18)' : 'rgba(233,216,180,0.3)';
    roundRect(ctx, x - 30, y - 22, 60, 44, 8);
    ctx.fill();
    if (i <= cur) {
      ctx.globalAlpha = 0.35 + 0.65 * lit;
      ctx.fillStyle = i === 0 || i === firstUsed ? REWARD.gold : CF.bulb;
      roundRect(ctx, x - 30, y - 22, 60, 44, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const e = c.errs[i];
    if (Number.isFinite(e)) {
      const dx = Math.max(-1, Math.min(1, e / 1000 / (c.interval * 0.5))) * 46;
      const good = Math.abs(e) < 60;
      ctx.fillStyle = good ? '#2FA37A' : '#E9D8B4';
      ctx.beginPath();
      ctx.moveTo(x + dx, y - 30);
      ctx.lineTo(x + dx - 10, y - 48);
      ctx.lineTo(x + dx + 10, y - 48);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.font = `24px ${FONT}`;
  outlineText(ctx, 'the first two are a warm-up  ·  SPACE skips', cx, cy + 120, 'rgba(233,216,180,0.75)', 4);
  ctx.restore();
}
