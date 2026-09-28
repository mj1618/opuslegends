/**
 * Weather: rain streaks (storm) and lightning BOLT SHAPES on crashes (never full-screen strobes:
 * the flash is a local glow around the bolt).
 */
import { type BeatInfo } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { drawGlow } from '../core/draw';
import { hash, rng } from '../core/math';
import { VIEW_H, VIEW_W } from './camera';
import type { Lighting } from './lighting';

export class Weather {
  /** bolts: draw in the sky pass (behind the horizon / stacks) */
  drawBolts(g: Ctx, L: Lighting, b: BeatInfo, horizonY: number): void {
    if (L.lightning < 0.05) return;
    const s = b.since.crash;
    if (s > 0.35) return;
    const n = b.count.crash;
    const flick = s < 0.06 || (s > 0.1 && s < 0.16) || (s > 0.22 && s < 0.26) ? 1 : 0.35;
    const a = L.lightning * flick * (1 - s / 0.35);
    const r = rng(n * 977 + 1);
    const x0 = 300 + hash(n * 13) * (VIEW_W - 600);
    const pts: number[] = [x0, -20];
    let x = x0;
    let y = -20;
    while (y < horizonY) {
      x += (r() - 0.5) * 90;
      y += 30 + r() * 50;
      pts.push(x, Math.min(y, horizonY));
    }
    drawGlow(g, x0, horizonY * 0.4, '#C9C8FF', 420, a * 0.45);
    const branch = (i0: number) => {
      let bx = pts[i0];
      let by = pts[i0 + 1];
      g.moveTo(bx, by);
      for (let k = 0; k < 4; k++) {
        bx += (r() - 0.3) * 60;
        by += 25 + r() * 30;
        g.lineTo(bx, by);
      }
    };
    for (const [w, col] of [
      [14, `rgba(170,160,255,${a * 0.35})`],
      [6, `rgba(220,215,255,${a * 0.8})`],
      [2.5, `rgba(255,255,255,${a})`],
    ] as [number, string][]) {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.lineJoin = 'miter';
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      branch(4);
      branch(Math.min(pts.length - 4, 10));
      g.stroke();
    }
    g.lineJoin = 'round';
  }

  drawRain(g: Ctx, L: Lighting, b: BeatInfo): void {
    if (L.rain < 0.02) return;
    g.strokeStyle = `rgba(210,220,240,${0.28 * L.rain})`;
    g.lineWidth = 1.6;
    g.beginPath();
    const t = b.time;
    for (let i = 0; i < 180; i++) {
      const sp = 1300 + hash(i) * 700;
      const x = (hash(i * 3) * (VIEW_W + 400) - t * 380 * (0.8 + hash(i) * 0.4)) % (VIEW_W + 400);
      const xx = x < 0 ? x + VIEW_W + 400 : x;
      const y = (hash(i * 7) * VIEW_H + t * sp) % (VIEW_H + 60);
      g.moveTo(xx, y - 30);
      g.lineTo(xx - 10, y);
    }
    g.stroke();
  }
}
