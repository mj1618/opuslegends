/**
 * FILM CANISTER placeholder draw (iteration 6, gameplay agent; the art may replace it — SKINS.canister is 'reward').
 * A gold film tin (reel spokes, a strip of film curling out) hanging on the high route, with a steady glow and the
 * CLUE: a star glint that flashes on each beat around its takeoff (the tease, below), so a player running under it
 * sees it wink on the count. Picked up: it spins up and fades.
 */
import { drawGlow } from '../art/core/draw';
import type { FilmCanister } from '../game/entities';

/**
 * THE TEASE (iteration 7, review iter6 fix 9: the bots — and first-timers — never noticed them): from 4 beats before the
 * takeoff to 3 after the pass, the canister GLINTS ON EVERY BEAT — a light shaft down to the takeoff spot, a gold ring
 * breathing out, a 4-point star — and when it sits above the frame, a glinting reel silhouette hangs at the top edge
 * over it, pointing up. Drawn before the tin (world space).
 */
function drawTease(ctx: CanvasRenderingContext2D, c: FilmCanister, beat: number, y: number, viewTop: number, floorY: number): void {
  const d = beat - c.from;
  if (c.collected || d < -4 || d > c.beat - c.from + 3) return;
  const env = Math.min(1, (d + 4) / 1, (c.beat - c.from + 3 - d) / 1);
  const ph = ((beat % 1) + 1) % 1;
  const on = Math.exp(-ph * 5) * env;
  ctx.save();
  // the shaft: a soft gold beam from the canister down to where the held jump takes off
  const fy = Number.isNaN(floorY) ? y + 500 : floorY;
  const gr = ctx.createLinearGradient(0, y, 0, fy);
  gr.addColorStop(0, `rgba(255,226,140,${0.22 * env + 0.18 * on})`);
  gr.addColorStop(1, 'rgba(255,226,140,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(c.x - 26, y);
  ctx.lineTo(c.x + 26, y);
  ctx.lineTo(c.x + 90, fy);
  ctx.lineTo(c.x - 90, fy);
  ctx.closePath();
  ctx.fill();
  // the ring breathing out on each beat
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = `rgba(255,224,138,${0.8 * on})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c.x, y, 40 + 70 * ph, 0, Math.PI * 2);
  ctx.stroke();
  // above the frame? a glinting reel silhouette hangs at the top edge, pointing up
  if (y < viewTop + 40) {
    const ty = viewTop + 70;
    drawGlow(ctx, c.x, ty, '#FFE9A0', 110, 0.35 * env + 0.45 * on);
    ctx.fillStyle = '#20150F';
    ctx.beginPath();
    ctx.arc(c.x, ty, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E0B64A';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#E0B64A';
    ctx.beginPath();
    ctx.moveTo(c.x - 14, ty - 30);
    ctx.lineTo(c.x, ty - 50);
    ctx.lineTo(c.x + 14, ty - 30);
    ctx.fill();
    star(ctx, c.x + 18, ty - 18, 30 * on);
  }
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  if (r < 2) return;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 ? r * 0.18 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
}

export function drawCanister(ctx: CanvasRenderingContext2D, c: FilmCanister, beat: number, time: number, viewTop = -Infinity, floorY = NaN): void {
  let y = c.y + 6 * Math.sin(time * 2.4 + c.id);
  let alpha = 1;
  let spin = 0.25 * Math.sin(time * 1.7 + c.id);
  let s = 1;
  if (c.collected) {
    const k = c.collectT / 0.6;
    if (k >= 1) return;
    y -= 160 * k;
    alpha = 1 - k;
    spin += 6 * k;
    s = 1 + 0.6 * k;
  }
  drawTease(ctx, c, beat, y, viewTop, floorY);
  ctx.save();
  ctx.globalAlpha = alpha;
  // the glow + the clue: a wink on each beat of the tease window (4 before the takeoff … 3 after the pass)
  const d = c.from - beat;
  const wink = d > -(c.beat - c.from + 3) && d < 4.2 ? Math.max(0, 1 - (beat - Math.floor(beat)) / 0.35) : 0;
  drawGlow(ctx, c.x, y, '#FFE9A0', 120 + 60 * wink, 0.35 + 0.4 * wink);
  ctx.translate(c.x, y);
  ctx.rotate(spin);
  ctx.scale(s, s);
  // a strip of film curling out
  ctx.strokeStyle = '#20150F';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(22, 10);
  ctx.quadraticCurveTo(52, 30, 40, 58);
  ctx.stroke();
  ctx.strokeStyle = '#E9D8B4';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  // the tin
  ctx.fillStyle = '#E0B64A';
  ctx.strokeStyle = '#20150F';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFE9A0';
  ctx.beginPath();
  ctx.arc(-6, -8, 12, 0, Math.PI * 2);
  ctx.fill();
  // reel spokes
  ctx.fillStyle = '#20150F';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 17, Math.sin(a) * 17, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // the wink: a 4-point star
  if (wink > 0.05 && !c.collected) {
    ctx.save();
    ctx.globalAlpha = wink;
    ctx.fillStyle = '#FFFFFF';
    ctx.translate(c.x + 22, y - 22);
    const r = 34 * wink;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 ? r * 0.18 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.fill();
    ctx.restore();
  }
}
