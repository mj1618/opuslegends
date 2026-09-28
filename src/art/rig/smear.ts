/**
 * Smear frames: ribbons swept by a moving point, speed lines, and onion-skin ghosts.
 * Because rigs are pure functions of time, a smear is just the rig re-sampled at earlier times.
 */
import type { Ctx } from '../core/canvas';
import { lerp } from '../core/math';

export interface SmearStyle {
  /** ribbon fill */
  color: string;
  /** hot core line along the leading edge */
  core?: string;
  /** trailing speed lines colour */
  lines?: string;
  alpha?: number;
  /** 0..1: how much the ribbon narrows toward its tail */
  taper?: number;
  coreWidth?: number;
}

/**
 * Ribbon between an outer path (e.g. weapon tip) and an inner path (e.g. hand), sampled by `at(u)`
 * for u in [u0, u1] (u1 = now). `at` returns [outerX, outerY, innerX, innerY].
 */
export function drawSmear(g: Ctx, at: (u: number) => [number, number, number, number], u0: number, u1: number, s: SmearStyle, n = 14): void {
  const a = s.alpha ?? 1;
  if (a <= 0.01 || u1 - u0 < 1e-3) return;
  const out: number[] = [];
  const inn: number[] = [];
  for (let i = 0; i <= n; i++) {
    const p = at(lerp(u0, u1, i / n));
    out.push(p[0], p[1]);
    inn.push(p[2], p[3]);
  }
  const taper = s.taper ?? 0.75;
  g.save();
  g.globalAlpha *= a * 0.85;
  g.fillStyle = s.color;
  g.beginPath();
  g.moveTo(out[0], out[1]);
  for (let i = 2; i < out.length; i += 2) g.lineTo(out[i], out[i + 1]);
  for (let i = inn.length - 2; i >= 0; i -= 2) {
    const k = i / (inn.length - 2);
    const w = 1 - taper + taper * k;
    g.lineTo(lerp(out[i], inn[i], w), lerp(out[i + 1], inn[i + 1], w));
  }
  g.closePath();
  g.fill();
  g.globalAlpha /= 0.85;
  if (s.core) {
    g.strokeStyle = s.core;
    g.lineWidth = s.coreWidth ?? 5;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(out[0], out[1]);
    for (let i = 2; i < out.length; i += 2) g.lineTo(out[i], out[i + 1]);
    g.stroke();
  }
  if (s.lines) {
    g.strokeStyle = s.lines;
    g.lineWidth = 2;
    for (let j = 1; j <= 3; j++) {
      const base = g.globalAlpha;
      g.globalAlpha = base * (0.8 - j * 0.2);
      g.beginPath();
      for (let i = 0; i < out.length; i += 2) {
        const k = 0.3 + j * 0.13;
        const x = lerp(out[i], inn[i], k);
        const y = lerp(out[i + 1], inn[i + 1], k);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      g.globalAlpha = base;
    }
  }
  g.restore();
}

/** Straight speed lines behind a moving body (dir = travel angle). */
export function speedLines(g: Ctx, x: number, y: number, dir: number, count: number, len: number, spread: number, color: string, alpha = 1, seed = 0): void {
  if (alpha <= 0.01) return;
  const c = Math.cos(dir);
  const s = Math.sin(dir);
  g.save();
  g.globalAlpha *= alpha;
  g.strokeStyle = color;
  g.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const o = ((i + 0.5) / count - 0.5) * spread + Math.sin(i * 12.9898 + seed) * 4;
    const l = len * (0.6 + 0.4 * Math.abs(Math.sin(i * 78.233 + seed)));
    const bx = x - s * o;
    const by = y + c * o;
    g.lineWidth = 2 + (i % 2);
    g.beginPath();
    g.moveTo(bx - c * 10, by - s * 10);
    g.lineTo(bx - c * (10 + l), by - s * (10 + l));
    g.stroke();
  }
  g.restore();
}

/** Onion-skin smear: redraw the character at earlier times with fading alpha. */
export function ghosts(g: Ctx, draw: (dt: number) => void, count = 3, spacing = 0.025, alpha = 0.35): void {
  for (let i = count; i >= 1; i--) {
    g.save();
    g.globalAlpha *= alpha * (1 - (i - 1) / count);
    draw(-i * spacing);
    g.restore();
  }
}
