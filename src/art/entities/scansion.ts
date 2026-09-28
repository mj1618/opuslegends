/**
 * Scansion marks (DESIGN §6.4): ∪ short (1 beat), – long (2 beats), | bar line — set into the
 * world as black flint nodules (chalk ground) or glossy tar (boat hulls).
 * State: 'idle' (dark), 'glow' (teal, on its beat), 'perfect' (gold fill + sparkles).
 * Origin = centre of the mark.
 */
import { type Ctx, drawSprite, sprite } from '../core/canvas';
import { drawGlow, sparkle } from '../core/draw';
import { TAU, clamp01, easeOut, hash } from '../core/math';
import { PAL } from '../palette';

export type ScanMark = 'short' | 'long' | 'bar';
export type ScanState = 'idle' | 'glow' | 'perfect';

export interface ScansionState {
  mark: ScanMark;
  state: ScanState;
  /** seconds since entering the state */
  t?: number;
  material?: 'flint' | 'tar';
  time: number;
  scale?: number;
}

/** polyline of the mark's spine */
function spine(mark: ScanMark): number[] {
  if (mark === 'bar') return [0, -30, 0, 30];
  if (mark === 'long') return [-34, 0, 34, 0];
  const pts: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (i / 12);
    pts.push(-Math.cos(a) * 22, -8 + Math.sin(a) * 18);
  }
  return pts;
}

function walk(pts: number[], step: number, fn: (x: number, y: number, i: number) => void) {
  let n = 0;
  for (let i = 0; i < pts.length - 2; i += 2) {
    const x0 = pts[i];
    const y0 = pts[i + 1];
    const dx = pts[i + 2] - x0;
    const dy = pts[i + 3] - y0;
    const d = Math.hypot(dx, dy);
    const k = Math.max(1, Math.round(d / step));
    for (let j = 0; j < k; j++) fn(x0 + (dx * j) / k, y0 + (dy * j) / k, n++);
  }
  fn(pts[pts.length - 2], pts[pts.length - 1], n);
}

function markSprite(mark: ScanMark, material: 'flint' | 'tar') {
  return sprite(`scan:${mark}:${material}`, 110, 90, 55, 45, (g) => {
    const pts = spine(mark);
    const knobs: number[] = [];
    walk(pts, 7, (x, y, i) => knobs.push(x + (hash(i * 3) - 0.5) * 2, y + (hash(i * 5) - 0.5) * 2, 6.5 + hash(i * 7) * 2.5));
    // chalk-bed rim (the mark is set INTO the chalk: a pale bevel)
    if (material === 'flint') {
      g.fillStyle = 'rgba(255,252,240,0.55)';
      for (let i = 0; i < knobs.length; i += 3) {
        g.beginPath();
        g.arc(knobs[i] + 1.5, knobs[i + 1] + 2, knobs[i + 2] + 3, 0, TAU);
        g.fill();
      }
    }
    // outline pass
    g.fillStyle = '#0B0B10';
    for (let i = 0; i < knobs.length; i += 3) {
      g.beginPath();
      g.arc(knobs[i], knobs[i + 1], knobs[i + 2] + 2, 0, TAU);
      g.fill();
    }
    // body
    for (let i = 0; i < knobs.length; i += 3) {
      const gr = g.createRadialGradient(knobs[i] - 2, knobs[i + 1] - 3, 1, knobs[i], knobs[i + 1], knobs[i + 2]);
      if (material === 'flint') {
        gr.addColorStop(0, '#5B6070');
        gr.addColorStop(0.5, PAL.flint);
        gr.addColorStop(1, '#16171D');
      } else {
        gr.addColorStop(0, '#3A3440');
        gr.addColorStop(0.6, '#141216');
        gr.addColorStop(1, '#070608');
      }
      g.fillStyle = gr;
      g.beginPath();
      g.arc(knobs[i], knobs[i + 1], knobs[i + 2], 0, TAU);
      g.fill();
    }
    // glints
    g.fillStyle = material === 'flint' ? 'rgba(190,205,230,0.75)' : 'rgba(255,255,255,0.8)';
    for (let i = 0; i < knobs.length; i += 6) {
      g.beginPath();
      g.ellipse(knobs[i] - 2.5, knobs[i + 1] - 3, 2.2, 1.2, -0.6, 0, TAU);
      g.fill();
    }
    if (material === 'tar') {
      g.fillStyle = '#0B0A0D';
      for (let i = 3; i < knobs.length; i += 12) {
        g.beginPath();
        g.ellipse(knobs[i], knobs[i + 1] + 10, 2.5, 6, 0, 0, TAU);
        g.fill();
      }
    }
  });
}

export function drawScansion(g: Ctx, x: number, y: number, s: ScansionState): void {
  const sc = s.scale ?? 1;
  const mat = s.material ?? 'flint';
  const t = s.t ?? 0;
  if (s.state === 'glow') {
    const k = Math.exp(-t * 3);
    drawGlow(g, x, y, PAL.seaTeal, 70 * sc, 0.55 + 0.4 * k);
  } else if (s.state === 'perfect') {
    drawGlow(g, x, y, PAL.gold, 80 * sc, 0.5 + 0.5 * Math.exp(-t * 3));
  }
  drawSprite(g, markSprite(s.mark, mat), x, y, 0, sc, sc);
  if (s.state === 'idle') return;
  // inner line (teal glow / gold fill grows along the mark)
  const pts = spine(s.mark);
  const grow = s.state === 'perfect' ? easeOut(clamp01(t / 0.12)) : 1;
  g.save();
  g.translate(x, y);
  g.scale(sc, sc);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const n = pts.length / 2;
  const upto = Math.max(1, Math.round((n - 1) * grow));
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 1; i <= upto; i++) g.lineTo(pts[i * 2], pts[i * 2 + 1]);
  if (s.state === 'glow') {
    g.strokeStyle = '#7FF5EA';
    g.lineWidth = 5;
    g.stroke();
    g.strokeStyle = '#E8FFFC';
    g.lineWidth = 2;
    g.stroke();
  } else {
    g.strokeStyle = '#B8860B';
    g.lineWidth = 10;
    g.stroke();
    g.strokeStyle = PAL.gold;
    g.lineWidth = 7;
    g.stroke();
    g.strokeStyle = '#FFF4C0';
    g.lineWidth = 2.5;
    g.stroke();
  }
  g.restore();
  if (s.state === 'perfect' && t < 0.6) {
    const k = t / 0.6;
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + 0.4;
      sparkle(g, x + Math.cos(a) * (20 + 30 * k) * sc, y + Math.sin(a) * (12 + 26 * k) * sc - 10 * k, 9 * (1 - k) * sc, a + k * 2, 1 - k);
    }
  }
}
