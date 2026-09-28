/**
 * Urchin — the basic spike hazard (sacred danger colours: urchin black + hot magenta tips).
 * Radius ~22 px (+spines to ~38). Cached sprite; breathes on the kick, spines shiver.
 */
import { type Ctx, drawSprite, sprite } from '../core/canvas';
import { drawGlow } from '../core/draw';
import { TAU, hash } from '../core/math';
import { PAL } from '../palette';

export interface UrchinState {
  time: number;
  /** body radius (default 22) */
  r?: number;
  /** 0..1 beat pulse (e.g. hit(beat,'kick')) — spines flare */
  pulse?: number;
  seed?: number;
  /** hanging in a net (draws a rope net bag + line up to `hangY`) */
  hangLen?: number;
}

function urchinSprite(variant: number) {
  const R = 22;
  return sprite(`urchin:${variant}`, 100, 100, 50, 50, (g) => {
    const N = 26;
    // back spines (darker, between the front ones)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < N; i++) {
        const a = ((i + (pass ? 0 : 0.5)) / N) * TAU + variant * 0.37;
        const len = R + (pass ? 17 : 13) + hash(i * 7 + variant * 31 + pass) * 8;
        const w = pass ? 4.2 : 3.6;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const bx = ca * (R - 4);
        const by = sa * (R - 4);
        const tx = ca * len;
        const ty = sa * len;
        const px = -sa * w;
        const py = ca * w;
        g.beginPath();
        g.moveTo(bx + px, by + py);
        g.lineTo(tx, ty);
        g.lineTo(bx - px, by - py);
        g.closePath();
        g.fillStyle = pass ? PAL.urchin : '#0E0A12';
        g.fill();
        g.strokeStyle = pass ? '#000' : '#000';
        g.lineWidth = 1.2;
        g.stroke();
        // magenta tip (outer 38%)
        const k = 0.62;
        const mx = bx + (tx - bx) * k;
        const my = by + (ty - by) * k;
        g.beginPath();
        g.moveTo(mx + px * (1 - k), my + py * (1 - k));
        g.lineTo(tx, ty);
        g.lineTo(mx - px * (1 - k), my - py * (1 - k));
        g.closePath();
        g.fillStyle = pass ? PAL.magenta : '#C21E68';
        g.fill();
      }
    }
    // body
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.lineWidth = 5;
    g.strokeStyle = '#000';
    g.stroke();
    const gr = g.createRadialGradient(-7, -8, 2, 0, 0, R);
    gr.addColorStop(0, '#4A3656');
    gr.addColorStop(0.5, '#241A2C');
    gr.addColorStop(1, PAL.urchin);
    g.fillStyle = gr;
    g.fill();
    // tubercle dots
    g.fillStyle = 'rgba(255,46,136,0.35)';
    for (let i = 0; i < 14; i++) {
      const a = hash(i + variant * 13) * TAU;
      const d = hash(i * 3 + 1) * (R - 6);
      g.beginPath();
      g.arc(Math.cos(a) * d, Math.sin(a) * d, 1.4, 0, TAU);
      g.fill();
    }
    // specular
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.ellipse(-8, -10, 6, 3, -0.6, 0, TAU);
    g.fill();
  });
}

export function drawUrchin(g: Ctx, x: number, y: number, s: UrchinState): void {
  const r = s.r ?? 22;
  const seed = s.seed ?? 0;
  const p = s.pulse ?? 0;
  const k = (r / 22) * (1 + p * 0.12);
  if (s.hangLen) {
    g.strokeStyle = PAL.woodDark;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, y - s.hangLen);
    g.lineTo(x, y - r - 6);
    g.stroke();
  }
  drawGlow(g, x, y, PAL.magenta, 46 * k, 0.18 + p * 0.25);
  const wob = Math.sin(s.time * 2.3 + seed) * 0.08 + Math.sin(s.time * 31 + seed) * 0.01 * (1 + p * 4);
  drawSprite(g, urchinSprite(seed % 3), x, y, wob, k, k * (1 - p * 0.04));
  if (s.hangLen) {
    // rope net bag over the urchin
    g.strokeStyle = PAL.wood;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = -2; i <= 2; i++) {
      g.moveTo(x, y - r - 8);
      g.quadraticCurveTo(x + i * r * 0.5, y, x + i * r * 0.25, y + r * 0.9);
    }
    g.stroke();
  }
}
