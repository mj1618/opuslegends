/**
 * FILM CANISTER placeholder draw (iteration 6, gameplay agent; the art may replace it — SKINS.canister is 'reward').
 * A gold film tin (reel spokes, a strip of film curling out) hanging on the high route, with a steady glow and the
 * CLUE: a star glint that flashes on each beat of the two before its takeoff beat (`from − 2 … from`), so a player
 * running under it sees it wink on the count. Picked up: it spins up and fades.
 */
import { drawGlow } from '../art/core/draw';
import type { FilmCanister } from '../game/entities';

export function drawCanister(ctx: CanvasRenderingContext2D, c: FilmCanister, beat: number, time: number): void {
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
  ctx.save();
  ctx.globalAlpha = alpha;
  // the glow + the clue: a wink on each of the 2 beats before the takeoff beat
  const d = c.from - beat;
  const wink = d > -0.2 && d < 2.2 ? Math.max(0, 1 - (beat - Math.floor(beat)) / 0.35) : 0;
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
