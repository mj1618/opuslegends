/**
 * Herring — the collectible ("lums"). Leaping silver fish with a gold glint (sacred reward colours).
 * ~44 px long at scale 1. Body cached; tail flap + glint + halo live.
 */
import { type Ctx, drawSprite, sprite } from '../core/canvas';
import { drawGlow, inkFill, sparkle } from '../core/draw';
import { TAU, clamp01, easeOut, fract, hash } from '../core/math';
import { PAL } from '../palette';

export interface HerringState {
  time: number;
  /** travel direction in radians (0 = swimming right). Leaping fish follow their arc tangent. */
  angle?: number;
  /** per-fish seed (varies flap phase + glint timing) */
  seed?: number;
  scale?: number;
  /** seconds since collected (undefined = not collected). The pickup pop lasts 0.4 s. */
  collected?: number;
  /** 0..1 extra highlight (e.g. piano-run shimmer from BeatInfo.since.piano) */
  shimmer?: number;
}

function bodyPath(g: Ctx) {
  g.beginPath();
  g.moveTo(22, 1);
  g.bezierCurveTo(18, -8, 4, -11, -8, -8);
  g.bezierCurveTo(-14, -6, -18, -3, -20, 0);
  g.bezierCurveTo(-18, 3, -14, 6, -8, 8);
  g.bezierCurveTo(4, 11, 18, 8, 22, 1);
  g.closePath();
}

function herringBody() {
  return sprite('herring:body', 60, 34, 26, 17, (g) => {
    // dorsal fin
    g.beginPath();
    g.moveTo(-4, -8);
    g.quadraticCurveTo(0, -15, 6, -9);
    g.closePath();
    inkFill(g, PAL.herringBack, 1.4);
    // ventral fin
    g.beginPath();
    g.moveTo(-2, 8);
    g.quadraticCurveTo(2, 13, 6, 8.5);
    g.closePath();
    inkFill(g, PAL.herringBack, 1.4);
    bodyPath(g);
    const gr = g.createLinearGradient(0, -10, 0, 10);
    gr.addColorStop(0, '#5E7590');
    gr.addColorStop(0.32, PAL.herringBack);
    gr.addColorStop(0.45, PAL.herring);
    gr.addColorStop(0.8, '#FFFFFF');
    gr.addColorStop(1, '#C9D6E0');
    inkFill(g, gr, 1.5);
    g.save();
    bodyPath(g);
    g.clip();
    // gold lateral stripe
    g.strokeStyle = PAL.gold;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-19, 0.5);
    g.quadraticCurveTo(0, -3.5, 20, -0.5);
    g.stroke();
    // scale shimmer ticks
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(-12 + i * 5, 3, 3, -1.2, 0.3);
      g.stroke();
    }
    g.restore();
    // gill
    g.strokeStyle = 'rgba(40,50,80,0.55)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(10, -6);
    g.quadraticCurveTo(7, 0, 10, 6);
    g.stroke();
    // eye
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(14.5, -2, 3.6, 0, TAU);
    g.fill();
    g.strokeStyle = PAL.outline;
    g.lineWidth = 1.2;
    g.stroke();
    g.fillStyle = '#10131c';
    g.beginPath();
    g.arc(15.5, -2, 1.9, 0, TAU);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(15, -2.8, 0.7, 0, TAU);
    g.fill();
    // smile
    g.strokeStyle = PAL.outline;
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(18.5, 3);
    g.quadraticCurveTo(20, 3.6, 21.2, 2.2);
    g.stroke();
  });
}

export function drawHerring(g: Ctx, x: number, y: number, s: HerringState): void {
  const seed = s.seed ?? 0;
  const sc = s.scale ?? 1;
  let k = 1;
  let yy = y;
  let rot = s.angle ?? 0;
  let alpha = 1;
  const c = s.collected;
  if (c !== undefined && c >= 0) {
    if (c > 0.4) return;
    const u = c / 0.4;
    // pop: flip up, grow then vanish into a gold ring + sparkles
    yy -= 36 * easeOut(u);
    rot += u * TAU;
    k = u < 0.3 ? 1 + u : 1.3 * (1 - (u - 0.3) / 0.7);
    alpha = 1 - clamp01((u - 0.6) / 0.4);
    g.save();
    g.globalAlpha = 1 - u;
    g.strokeStyle = PAL.gold;
    g.lineWidth = 3 * (1 - u);
    g.beginPath();
    g.arc(x, y, 12 + 40 * easeOut(u), 0, TAU);
    g.stroke();
    g.restore();
    for (let i = 0; i < 4; i++) {
      const a = i * (TAU / 4) + seed + u * 2;
      const d = 16 + 34 * easeOut(u);
      sparkle(g, x + Math.cos(a) * d, y + Math.sin(a) * d, 7 * (1 - u), a, 1 - u);
    }
  }
  const t = s.time;
  // halo (reward readability)
  drawGlow(g, x, yy, 'rgba(255,236,170,1)', 34 * sc * k, 0.28 + (s.shimmer ?? 0) * 0.4);
  g.save();
  g.translate(x, yy);
  g.rotate(rot);
  g.scale(sc * k, sc * k);
  if (alpha < 1) g.globalAlpha *= alpha;
  // tail flap
  const flap = Math.sin(t * 16 + seed * 5.1) * 0.45;
  g.save();
  g.translate(-18, 0);
  g.rotate(flap);
  g.beginPath();
  g.moveTo(2, 0);
  g.quadraticCurveTo(-8, -4, -12, -10);
  g.quadraticCurveTo(-8, 0, -12, 10);
  g.quadraticCurveTo(-8, 4, 2, 0);
  g.closePath();
  inkFill(g, PAL.herringBack, 1.4);
  g.restore();
  // body wiggle via a slight skew
  g.transform(1, Math.sin(t * 16 + seed * 5.1 + 1) * 0.05, 0, 1, 0, 0);
  drawSprite(g, herringBody(), 0, 0);
  g.restore();
  // gold glint twinkle (staggered per fish)
  const gp = fract(t * 0.9 + hash(seed * 13 + 1));
  if (gp < 0.18) {
    const u = gp / 0.18;
    const gx = x + Math.cos(rot) * 6 * sc;
    const gy = yy + Math.sin(rot) * 6 * sc - 4 * sc;
    sparkle(g, gx, gy, 9 * sc * Math.sin(u * Math.PI), u * 1.5, 1);
  }
}
