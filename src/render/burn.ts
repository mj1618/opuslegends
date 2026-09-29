/**
 * THE BURN on screen (review iter2 fix 4/6, visual half; iteration 9: a CALM LOWER BOUNDARY).
 *
 * The print is melting in the projector gate from the LEFT edge of the frame. Iteration 9 (user playtest: "the fire
 * shouldn't be stressful … it's all you can focus on"): in normal play the real Burn rests ~3.5 beats behind the music
 * line — off screen — and all you see is a soft warm glow breathing at the frame's left edge. The fire itself (below)
 * fades in only when the REAL front enters the frame (a hero who stopped / stalled), drawn where it really is:
 *
 *   - curling, bubbling melt edge (film blisters that swell, pop and merge), char band, lacquer-red + hot-edge
 *     rims (LETHAL danger language), blinding projector light where the film has burnt through
 *   - crackles: sparks and curling char flakes spit off the edge
 *   - FLARES when the hero is stalled within reach, and eats the frame on a chaser death
 *   (no drum-fill lunges, no stumble flares any more)
 *
 * Screen space, drawn after the film pass (it IS the film burning) and before the theatre strip.
 */
import { type BeatInfo, hit } from '../art/core/beat';
import { drawGlow } from '../art/core/draw';
import { TAU, hash } from '../art/core/math';
import { CF } from '../art/palette';
import { VIEW_H, VIEW_W } from '../engine/display';
import { DANGER } from './entityDraw';

export interface BurnView {
  /** screen x of the REAL burn front (may be < 0 = off-screen left) */
  realX: number;
  /** screen x of the hero */
  heroX: number;
  /** 0..1 rise-in animation */
  rise: number;
  /** 0..1 drum-fill lunge envelope */
  lunge: number;
  /** 0..1 stumble flare (decaying) */
  flare: number;
  /** 0..1 chaser death: the burn eats the frame */
  eat: number;
  /** presentation clock (s) */
  t: number;
}

const N = 40;
const ys = new Float32Array(N + 1);
const xs = new Float32Array(N + 1);

export class Burn {
  /** last drawn front (screen x) — for other effects */
  front = -999;

  draw(g: CanvasRenderingContext2D, v: BurnView, b: BeatInfo): void {
    if (v.rise <= 0.001) return;
    const kick = hit(b, 'kick', 0.14);
    // iteration 9 (user: "the fire shouldn't be stressful"): a CALM LOWER BOUNDARY. While the real front is off screen
    // (always, in normal play: it rests ~3.5 beats behind the music line) only a soft warm glow breathes at the frame's
    // left edge — no melt edge, no lethal rim, no sparks. The fire itself fades in only as the REAL front enters the
    // frame (a stalled hero), and it is drawn where it really is.
    const inK = v.eat > 0 ? 1 : Math.max(0, Math.min(1, (v.realX + 160) / 220));
    this.drawGlowEdge(g, v, kick, 1 - inK);
    if (inK <= 0.001) {
      this.front = -999;
      return;
    }
    let front = Math.max(v.realX, -60);
    if (v.eat > 0) front = front + (VIEW_W + 300 - front) * v.eat * v.eat;
    this.front = front;
    g.save();
    g.globalAlpha = inK;
    this.drawFire(g, v, kick, front);
    g.restore();
  }

  /** the resting boundary: a warm film-heat glow at the left edge, breathing gently on the kick (screen space) */
  private drawGlowEdge(g: CanvasRenderingContext2D, v: BurnView, kick: number, k: number): void {
    if (k <= 0.001) return;
    const w = 90 + 18 * kick;
    const gr = g.createLinearGradient(0, 0, w, 0);
    const a = (0.2 + 0.06 * kick) * v.rise * k;
    gr.addColorStop(0, `rgba(255,170,90,${a})`);
    gr.addColorStop(0.45, `rgba(230,110,60,${a * 0.45})`);
    gr.addColorStop(1, 'rgba(200,80,50,0)');
    g.save();
    g.fillStyle = gr;
    g.fillRect(0, 0, w, VIEW_H);
    g.restore();
  }

  private drawFire(g: CanvasRenderingContext2D, v: BurnView, kick: number, front: number): void {
    const t = v.t;
    // danger: how close to the hero (0 far .. 1 on him)
    const danger = Math.max(0, Math.min(1, 1 - (v.heroX - front) / Math.max(1, v.heroX)));
    const amp = 18 + 14 * v.lunge + 20 * v.flare;
    for (let i = 0; i <= N; i++) {
      const y = -40 + (i / N) * (VIEW_H + 80);
      ys[i] = y;
      // slow crawl + fast crackle: the melt front
      xs[i] = front + Math.sin(y * 0.013 + t * 2.1) * amp + Math.sin(y * 0.041 - t * 5.3) * amp * 0.45 + (hash(i + Math.floor(t * 12) * 57) - 0.5) * 6;
    }
    g.save();
    // --- burnt-through: blinding projector light (flickers on the film rate)
    const flick = 0.9 + 0.1 * hash(Math.floor(t * 24));
    g.fillStyle = `rgba(248,241,220,${0.97 * flick})`;
    g.beginPath();
    g.moveTo(-10, -40);
    for (let i = 0; i <= N; i++) g.lineTo(xs[i] - 34, ys[i]);
    g.lineTo(-10, VIEW_H + 40);
    g.closePath();
    g.fill();
    // --- the heat bleeding into the picture
    const glowA = 0.28 + 0.2 * kick + 0.3 * danger + 0.35 * v.flare;
    for (let i = 2; i < N; i += 7) drawGlow(g, xs[i] + 30, ys[i], DANGER.hot, 150 + 90 * v.flare + 60 * v.lunge, glowA);
    // --- bands along the edge: amber-white -> hot edge -> lacquer -> char
    const bands: [number, string, number][] = [
      [-22, 'rgba(255,236,190,0.95)', 22],
      [-6, DANGER.hot, 14 + 6 * v.flare],
      [7, DANGER.red, 12],
      [19, 'rgba(42,20,16,0.95)', 14],
    ];
    g.lineJoin = 'round';
    for (const [off, col, wd] of bands) {
      g.strokeStyle = col;
      g.lineWidth = wd;
      g.beginPath();
      for (let i = 0; i <= N; i++) {
        if (i === 0) g.moveTo(xs[i] + off, ys[i]);
        else g.lineTo(xs[i] + off, ys[i]);
      }
      g.stroke();
    }
    // --- blisters: bubbles swell ahead of the edge and pop into it (the classic gate melt)
    const nb = 13;
    for (let k = 0; k < nb; k++) {
      const life = 0.7 + hash(k + 3) * 0.8;
      const ph = ((t + hash(k) * 9) / life) % 1;
      const y = ((k + 0.5) / nb) * VIEW_H + Math.sin(k * 3.1) * 30;
      const i = Math.max(0, Math.min(N, Math.round(((y + 40) / (VIEW_H + 80)) * N)));
      const r = (5 + 20 * hash(k + 11)) * Math.sin(ph * Math.PI) * (1 + 0.6 * v.flare);
      if (r < 1.5) continue;
      const bx = xs[i] + 4 + (1 - ph) * (10 + 36 * hash(k + 5));
      g.beginPath();
      g.arc(bx, y, r + 5, 0, TAU);
      g.fillStyle = 'rgba(42,20,16,0.9)';
      g.fill();
      g.beginPath();
      g.arc(bx, y, r, 0, TAU);
      g.fillStyle = ph > 0.55 ? 'rgba(255,244,214,0.95)' : DANGER.red;
      g.fill();
      g.strokeStyle = DANGER.hot;
      g.lineWidth = 3;
      g.stroke();
    }
    // --- curling char flakes peeling off the edge (dark crescents)
    g.fillStyle = 'rgba(26,14,10,0.92)';
    for (let k = 0; k < 7; k++) {
      const ph = (t * (0.35 + hash(k + 20) * 0.3) + hash(k + 21)) % 1;
      const i = Math.floor(hash(k + 22) * N);
      const fx = xs[i] + 30 + ph * 140;
      const fy = ys[i] - ph * 90;
      const s = 10 + 8 * hash(k + 23);
      const rot = ph * 6 + k;
      g.globalAlpha = 1 - ph;
      g.beginPath();
      g.arc(fx, fy, s, rot, rot + 2.4);
      g.arc(fx + Math.cos(rot + 1.2) * s * 0.4, fy + Math.sin(rot + 1.2) * s * 0.4, s * 0.7, rot + 2.4, rot, true);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;
    // --- crackles: sparks spat off the edge (more on the kick / flare)
    const ns = 10 + Math.round(10 * kick + 18 * v.flare + 8 * v.lunge);
    g.fillStyle = CF.bulb;
    for (let k = 0; k < ns; k++) {
      const ph = (t * (1.4 + hash(k + 40)) + hash(k + 41)) % 1;
      const i = Math.floor(hash(k + 42) * N);
      const sx = xs[i] + 10 + ph * (80 + 160 * hash(k + 43)) * (1 + v.flare);
      const sy = ys[i] - ph * 60 * hash(k + 44) + ph * ph * 50;
      g.globalAlpha = (1 - ph) * 0.95;
      g.fillRect(sx, sy, 4, 3);
    }
    g.globalAlpha = 1;
    // --- stumble flare: a hot wash over the whole left third
    if (v.flare > 0.02) {
      const gr = g.createLinearGradient(front - 40, 0, front + 520, 0);
      gr.addColorStop(0, `rgba(255,74,61,${0.35 * v.flare})`);
      gr.addColorStop(1, 'rgba(255,74,61,0)');
      g.fillStyle = gr;
      g.fillRect(front - 40, 0, 560, VIEW_H);
    }
    g.restore();
  }
}
