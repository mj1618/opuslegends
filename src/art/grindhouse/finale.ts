/**
 * ACT 3d — THE FINALE (bars 84-86 + the ring-out): the end of a movie.
 *
 *   drawAuditorium(g, screen, b, st)   the PULL-OUT: the camera leaves the film — the picture becomes a screen in the
 *                                      Jimperial theatre (proscenium, gold arch, red curtains, house lights coming up
 *                                      amber) and the audience below does a standing WAVE on the beat. `screen` = the
 *                                      screen rect the renderer squeezed the film into.
 *   drawMarqueeCutIn(g, k, b, t)       a comic cut-in panel: outside the theatre an USHER on a ladder takes down BIG JIM
 *                                      and hangs SLIM CHANCE in the big letters (k 0..1 over ~3 beats)
 *   drawIris(g, cx, cy, r, rot, a)     the projector IRIS: black with a 9-blade polygonal aperture of radius r
 *   drawTheEnd(g, t, b)                black -> the film SNAPS and flaps -> THE END burns in (cigarette-burn edges)
 *   drawVictory(g, t, b, slim)         a second iris opens on Slim's victory pose on the throne of pool tables, the
 *                                      ex-goons applauding (the renderer passes a Slim drawer)
 *   drawFilmstripFloor(g, rect, style) the finale's floor: the level flattened into a FILM STRIP (sprocket holes,
 *                                      frame lines, tiny frames of the reels you played)
 *   drawIrisBlade(g, x, y, w, ang, L)  one iris blade as a tilted platform (blackened steel, a cream lip)
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex } from '../core/color';
import { drawGlow, star4 } from '../core/draw';
import { TAU, clamp01, easeOut, hash } from '../core/math';
import { CF } from '../palette';
import { VIEW_H, VIEW_W } from '../world/camera';
import { type Lighting, type LightingDirector, lit } from '../world/lighting';
import { ParallaxScene } from '../world/parallax';
import { drawThrone } from './bigjim';

const H = hex;
const INK = CF.filmBlack;
const SIGN_FONT = '"Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
const SERIF = '"Playfair Display", "Didot", "Bodoni 72", Georgia, serif';

export interface AuditoriumState {
  /** 0..1 the pull-out (0 = the film fills the frame) */
  k: number;
  /** 0..1 house lights (amber) */
  house: number;
  /** crowd 0..24 standing */
  standing: number;
  /** presentation seconds */
  t: number;
}

/** the screen rect for a pull-out amount k (the renderer squeezes the film into it) */
export function screenRect(k: number): { x: number; y: number; w: number; h: number; s: number } {
  const e = easeOut(clamp01(k));
  const s = 1 - 0.42 * e;
  const w = VIEW_W * s;
  const h = VIEW_H * s;
  return { x: (VIEW_W - w) / 2, y: (VIEW_H - h) / 2 - 90 * e, w, h, s };
}

export function drawAuditorium(g: Ctx, sr: { x: number; y: number; w: number; h: number }, b: BeatInfo, st: AuditoriumState): void {
  const k = clamp01(st.k);
  if (k <= 0.001) return;
  const house = clamp01(st.house);
  // the hall around the screen (even-odd: leave the screen open)
  g.save();
  g.beginPath();
  g.rect(0, 0, VIEW_W, VIEW_H);
  g.rect(sr.x, sr.y, sr.w, sr.h);
  g.clip('evenodd');
  const wall = g.createLinearGradient(0, 0, 0, VIEW_H);
  wall.addColorStop(0, css([Math.round(26 + 70 * house), Math.round(12 + 40 * house), Math.round(14 + 18 * house)]));
  wall.addColorStop(1, css([Math.round(10 + 30 * house), Math.round(6 + 16 * house), Math.round(6 + 8 * house)]));
  g.fillStyle = wall;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  // gilded proscenium arch
  g.strokeStyle = '#8C7440';
  g.lineWidth = 36;
  g.beginPath();
  g.moveTo(sr.x - 120, VIEW_H);
  g.lineTo(sr.x - 120, sr.y + 40);
  g.quadraticCurveTo(VIEW_W / 2, sr.y - 260, sr.x + sr.w + 120, sr.y + 40);
  g.lineTo(sr.x + sr.w + 120, VIEW_H);
  g.stroke();
  g.strokeStyle = '#E0B64A';
  g.lineWidth = 8;
  g.stroke();
  // house lights: amber sconces
  for (const sx of [sr.x - 260, sr.x + sr.w + 260]) {
    for (const sy of [sr.y + 160, sr.y + 460]) {
      g.fillStyle = '#8C7440';
      g.fillRect(sx - 10, sy - 30, 20, 50);
      drawGlow(g, sx, sy - 30, CF.houseAmber, 220, 0.2 + 0.6 * house);
    }
  }
  // red velvet curtains, swagged, swaying on the beat
  const sway = Math.sin(b.beat * Math.PI * 0.5) * 6;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 0 : sr.x + sr.w + 30;
    const x1 = side < 0 ? sr.x - 30 : VIEW_W;
    const w = x1 - x0;
    for (let i = 0; i < 9; i++) {
      const fx = x0 + (i / 9) * w;
      const fw = w / 9;
      const gr = g.createLinearGradient(fx, 0, fx + fw, 0);
      gr.addColorStop(0, '#2A0C10');
      gr.addColorStop(0.5, house > 0.3 ? '#8A2A30' : '#6A1A20');
      gr.addColorStop(1, '#2A0C10');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(fx, 0);
      g.lineTo(fx + fw, 0);
      g.lineTo(fx + fw + sway * (i / 9), VIEW_H);
      g.lineTo(fx + sway * (i / 9), VIEW_H);
      g.closePath();
      g.fill();
    }
  }
  // the valance across the top
  g.fillStyle = '#5A1A20';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(VIEW_W, 0);
  g.lineTo(VIEW_W, Math.max(40, sr.y - 40));
  for (let i = 12; i >= 0; i--) {
    const x = (i / 12) * VIEW_W;
    g.quadraticCurveTo(x + VIEW_W / 24, Math.max(40, sr.y - 40) + 50, x, Math.max(40, sr.y - 40));
  }
  g.closePath();
  g.fill();
  g.strokeStyle = '#E0B64A';
  g.lineWidth = 5;
  g.stroke();
  g.restore();
  // the frame of the screen itself (a black border + a faint projector bloom spilling on the hall)
  g.strokeStyle = INK;
  g.lineWidth = 14;
  g.strokeRect(sr.x - 7, sr.y - 7, sr.w + 14, sr.h + 14);
  drawGlow(g, VIEW_W / 2, sr.y + sr.h / 2, '#F8F1DC', Math.max(sr.w, sr.h) * 0.8, 0.08 * k);
  // the audience: rows of heads below the screen, the WAVE travelling across on the beat
  const rows = 3;
  const wave = b.beat * 0.5;
  for (let r = 0; r < rows; r++) {
    const baseY = VIEW_H - 20 - (rows - 1 - r) * 55 + (1 - k) * 260;
    const n = 26 + r * 4;
    const sc = 0.9 + r * 0.25;
    g.fillStyle = r === rows - 1 ? '#0D0A08' : css([Math.round(20 + 30 * house), Math.round(14 + 18 * house), Math.round(12 + 10 * house)]);
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5 + (r % 2) * 0.5) / n) * VIEW_W;
      const ph = (x / VIEW_W - (wave % 2) / 2 + 1) % 1;
      const up = Math.max(0, Math.cos(ph * TAU * 2)) ** 3 * clamp01(st.standing / 20);
      const y = baseY - up * 46 * sc;
      g.beginPath();
      g.ellipse(x, y - 30 * sc, 16 * sc, 19 * sc, 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.moveTo(x - 30 * sc, baseY + 30);
      g.quadraticCurveTo(x - 28 * sc, y - 8 * sc, x, y - 10 * sc);
      g.quadraticCurveTo(x + 28 * sc, y - 8 * sc, x + 30 * sc, baseY + 30);
      g.fill();
      if (up > 0.3) {
        g.lineWidth = 9 * sc;
        g.lineCap = 'round';
        g.strokeStyle = g.fillStyle as string;
        for (const sd of [-1, 1]) {
          g.beginPath();
          g.moveTo(x + sd * 14 * sc, y - 10 * sc);
          g.lineTo(x + sd * 34 * sc, y - (40 + 40 * up) * sc);
          g.stroke();
        }
      }
    }
  }
  // popcorn in the air on the snare
  const sn = hit(b, 'snare', 0.25);
  if (sn > 0.05) {
    g.fillStyle = '#FFF6E8';
    for (let i = 0; i < 30; i++) {
      const x = hash(i + Math.floor(b.beat)) * VIEW_W;
      const y = VIEW_H - 140 - (1 - sn) * 200 * hash(i + 5) - sn * 40;
      g.fillRect(x, y, 5, 5);
    }
  }
}

/**
 * THE MARQUEE SWAP (a comic cut-in, top right): outside at night, the Jimperial's marquee. An usher on a ladder pulls
 * down B-I-G J-I-M letter by letter; SLIM CHANCE goes up in the big letters (k 0..1).
 */
export function drawMarqueeCutIn(g: Ctx, k: number, b: BeatInfo, t: number): void {
  if (k <= 0 || k >= 1.4) return;
  const inK = easeOut(clamp01(k * 4));
  const outK = clamp01((k - 1.1) / 0.3);
  const w = 760;
  const h = 420;
  const x = VIEW_W - w - 70 + outK * 900;
  const y = 70 - (1 - inK) * 520;
  g.save();
  g.translate(x + w / 2, y + h / 2);
  g.rotate(0.03);
  g.translate(-w / 2, -h / 2);
  // panel
  g.fillStyle = INK;
  g.fillRect(-12, -12, w + 24, h + 24);
  g.fillStyle = '#FFF6E8';
  g.fillRect(-6, -6, w + 12, h + 12);
  g.save();
  g.beginPath();
  g.rect(0, 0, w, h);
  g.clip();
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0B0714');
  sky.addColorStop(1, '#2A1E3A');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // the marquee board
  const mx = 60;
  const my = 90;
  const mw = w - 120;
  const mh = 230;
  g.fillStyle = '#2A1A14';
  g.fillRect(mx - 16, my - 16, mw + 32, mh + 32);
  g.fillStyle = '#F4EFE2';
  g.fillRect(mx, my, mw, mh);
  const chase = Math.floor(b.beat * 4);
  for (let i = 0; i < 44; i++) {
    const u = i / 44;
    const bx = mx - 8 + (u < 0.5 ? u * 2 * (mw + 16) : (1 - u) * 2 * (mw + 16));
    const by = u < 0.5 ? my - 8 : my + mh + 8;
    g.fillStyle = (i + chase) % 3 ? CF.bulb : '#5A4A3A';
    g.beginPath();
    g.arc(bx, by, 6, 0, TAU);
    g.fill();
  }
  // the swap: BIG JIM letters come down (from the right), SLIM CHANCE goes up
  const swap = clamp01((k - 0.15) / 0.75);
  const big = 'BIG JIM';
  const small = 'SLIM CHANCE';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `bold 92px ${SIGN_FONT}`;
  const nBig = big.length;
  for (let i = 0; i < nBig; i++) {
    const gone = clamp01(swap * (nBig + 2) - (nBig - 1 - i));
    if (gone >= 1) continue;
    g.save();
    g.translate(mx + mw * ((i + 0.5) / nBig), my + 80 + gone * gone * 400);
    g.rotate(gone * (i % 2 ? 0.8 : -0.8));
    g.fillStyle = INK;
    g.fillText(big[i], 0, 0);
    g.restore();
  }
  // the small billing -> becomes the big billing
  const up = clamp01((swap - 0.45) / 0.55);
  g.fillStyle = INK;
  g.font = `bold ${Math.round(24 + 62 * up)}px ${SIGN_FONT}`;
  g.fillText(small.slice(0, Math.max(0, Math.round(small.length * (up > 0 ? Math.min(1, up * 1.6) : 1)))), mx + mw / 2, my + (up > 0 ? 80 + 0 * up : 190));
  g.font = `bold ${Math.round(24 - 6 * up)}px ${SIGN_FONT}`;
  if (up > 0.5) g.fillText('with BIG JIM', mx + mw / 2, my + 190);
  // the usher on a ladder (maroon uniform, pillbox hat) holding a letter
  const ux = mx + mw * (0.85 - swap * 0.6);
  const uy = my + mh + 110;
  g.strokeStyle = '#6A4428';
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(ux - 40, h + 10);
  g.lineTo(ux - 10, my + 40);
  g.moveTo(ux + 40, h + 10);
  g.lineTo(ux + 10, my + 40);
  for (let r = 0; r < 6; r++) {
    const ry = my + 60 + r * 50;
    const hw = 12 + (r / 6) * 28;
    g.moveTo(ux - hw, ry);
    g.lineTo(ux + hw, ry);
  }
  g.stroke();
  g.fillStyle = '#7A1E2A';
  g.beginPath();
  g.roundRect(ux - 22, uy - 150, 44, 70, 10);
  g.fill();
  g.fillStyle = '#C98E68';
  g.beginPath();
  g.arc(ux, uy - 168, 16, 0, TAU);
  g.fill();
  g.fillStyle = '#7A1E2A';
  g.fillRect(ux - 12, uy - 192, 24, 10);
  g.fillStyle = '#E0B64A';
  g.fillRect(ux - 12, uy - 184, 24, 3);
  // arm up, holding a letter from SLIM (bobbing on the beat)
  const bob = Math.sin(b.beat * Math.PI) * 6;
  g.strokeStyle = '#7A1E2A';
  g.lineWidth = 10;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(ux + 14, uy - 140);
  g.lineTo(ux + 46, uy - 200 + bob);
  g.stroke();
  g.fillStyle = '#F4EFE2';
  g.fillRect(ux + 30, uy - 250 + bob, 46, 56);
  g.fillStyle = INK;
  g.font = `bold 44px ${SIGN_FONT}`;
  g.fillText('S', ux + 53, uy - 222 + bob);
  g.restore();
  // comic caption
  g.fillStyle = '#FFE08A';
  g.fillRect(16, h - 64, 330, 48);
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.strokeRect(16, h - 64, 330, 48);
  g.fillStyle = INK;
  g.font = `italic bold 30px ${SIGN_FONT}`;
  g.textAlign = 'left';
  g.fillText('MEANWHILE, OUT FRONT...', 28, h - 40);
  g.restore();
  void t;
}

/**
 * The projector IRIS: black everywhere outside a 9-blade polygonal aperture of radius r at (cx, cy); the blades'
 * edges catch a steel rim. rot turns the blades (they rotate as they close).
 */
export function drawIris(g: Ctx, cx: number, cy: number, r: number, rot: number, alpha = 1): void {
  if (alpha <= 0) return;
  const n = 9;
  g.save();
  g.globalAlpha = alpha;
  g.beginPath();
  g.rect(-50, -50, VIEW_W + 100, VIEW_H + 100);
  if (r > 0.5) {
    g.moveTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    for (let i = n; i >= 0; i--) {
      const a = rot + (i / n) * TAU;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  }
  g.fillStyle = '#050403';
  g.fill('evenodd');
  if (r > 0.5) {
    // blade seams radiating out (the leaves of the iris)
    g.strokeStyle = 'rgba(120,110,100,0.45)';
    g.lineWidth = 3;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      const a2 = a + 1.1;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(a2) * 2400, py + Math.sin(a2) * 2400);
      g.stroke();
    }
    // steel rim on the aperture edge
    g.strokeStyle = 'rgba(200,190,170,0.6)';
    g.lineWidth = 4;
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = rot + (i / n) * TAU;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.stroke();
  }
  g.restore();
}

/**
 * THE END: t = seconds since the final hit. 0-0.35 black; the film SNAPS (a white flash + the tail flapping through the
 * gate: flickering white frames, a scratch storm); ~1.2 s THE END burns in from its centre with cigarette-burn edges.
 */
export function drawTheEnd(g: Ctx, t: number, b: BeatInfo): void {
  g.fillStyle = '#050403';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  if (t < 0.35) return;
  // the film tail flapping in the gate: stuttering light + sprocket holes whipping past
  const flap = clamp01((t - 0.35) / 0.9);
  if (flap < 1) {
    const on = Math.floor(t * 24) % 3 === 0 ? 1 : 0;
    g.fillStyle = `rgba(248,241,220,${0.12 * on * (1 - flap)})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    const off = (t * 3000) % 220;
    g.fillStyle = `rgba(248,241,220,${0.35 * (1 - flap)})`;
    for (let y = -220 + off; y < VIEW_H; y += 220) {
      g.fillRect(60, y, 60, 90);
      g.fillRect(VIEW_W - 120, y, 60, 90);
    }
    g.strokeStyle = `rgba(248,241,220,${0.4 * (1 - flap)})`;
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const x = hash(i + Math.floor(t * 24)) * VIEW_W;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 8, VIEW_H);
      g.stroke();
    }
  }
  // THE END burns in: a growing burn hole revealing cream lettering, charred edge
  const burn = clamp01((t - 1.0) / 1.2);
  if (burn > 0) {
    const R = easeOut(burn) * 900;
    g.save();
    g.beginPath();
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const rr = R * (0.86 + 0.14 * Math.sin(a * 7 + t * 2) * Math.sin(a * 3));
      g.lineTo(VIEW_W / 2 + Math.cos(a) * rr * 1.3, VIEW_H / 2 + Math.sin(a) * rr * 0.8);
    }
    g.closePath();
    g.clip();
    const bg = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 40, VIEW_W / 2, VIEW_H / 2, 1100);
    bg.addColorStop(0, '#2A1A14');
    bg.addColorStop(1, '#0D0A08');
    g.fillStyle = bg;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `italic 700 190px ${SERIF}`;
    g.fillStyle = '#F4EFE2';
    g.fillText('The End', VIEW_W / 2, VIEW_H / 2 - 30);
    g.font = `600 36px ${SERIF}`;
    g.fillStyle = 'rgba(233,216,180,0.9)';
    g.fillText('A  SLIM  CHANCE  PICTURE', VIEW_W / 2, VIEW_H / 2 + 110);
    g.restore();
    // the charred rim of the burn
    g.strokeStyle = `rgba(255,74,61,${0.5 * (1 - burn)})`;
    g.lineWidth = 10;
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * TAU;
      const rr = R * (0.86 + 0.14 * Math.sin(a * 7 + t * 2) * Math.sin(a * 3));
      g.lineTo(VIEW_W / 2 + Math.cos(a) * rr * 1.3, VIEW_H / 2 + Math.sin(a) * rr * 0.8);
    }
    g.stroke();
  }
  void b;
}

/**
 * VICTORY: a second iris opens (t = seconds since it starts opening) on SLIM'S VICTORY POSE on the throne of pool tables,
 * a spotlight, the ex-goons applauding on the beat. `slim(x, y, scale)` draws the hero (the renderer owns the rig state).
 */
export function drawVictory(g: Ctx, t: number, b: BeatInfo, slim: (x: number, y: number, s: number) => void, L?: Lighting): void {
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2 + 60;
  // the stage behind: fig dark, a cream spotlight cone
  const bg = g.createRadialGradient(cx, cy - 100, 60, cx, cy, 1100);
  bg.addColorStop(0, '#4A2440');
  bg.addColorStop(1, '#0B0508');
  g.fillStyle = bg;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const cone = g.createLinearGradient(0, 0, 0, VIEW_H);
  cone.addColorStop(0, 'rgba(248,241,220,0.35)');
  cone.addColorStop(1, 'rgba(248,241,220,0.05)');
  g.fillStyle = cone;
  g.beginPath();
  g.moveTo(cx - 80, -20);
  g.lineTo(cx + 80, -20);
  g.lineTo(cx + 420, VIEW_H);
  g.lineTo(cx - 420, VIEW_H);
  g.closePath();
  g.fill();
  g.restore();
  // the throne (smaller: Slim on top of it)
  drawThrone(g, cx, cy + 300, 0.55, L);
  // ex-goons applauding on either side (clap on the beat)
  const clap = Math.exp(-b.beatPhase * 5);
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const j = i % 4;
    const x = cx + side * (420 + j * 120);
    const y = VIEW_H - 40 - (j % 2) * 30;
    g.fillStyle = '#2A1026';
    g.beginPath();
    g.ellipse(x, y - 60, 46, 70, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#A8664F';
    g.beginPath();
    g.arc(x, y - 140, 24, 0, TAU);
    g.fill();
    g.fillStyle = '#2A1A14';
    g.beginPath();
    g.ellipse(x + 3, y - 156, 26, 10, 0, Math.PI, TAU);
    g.fill();
    g.fillRect(x - 24, y - 158, 50, 5);
    // hands meeting on the beat
    const hx = 10 + (1 - clap) * 18;
    g.fillStyle = '#A8664F';
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.arc(x - side * 30 + sd * hx, y - 110, 11, 0, TAU);
      g.fill();
    }
    if (clap > 0.7) star4(g, x - side * 30, y - 124, 16 * clap, 0.3, 'rgba(255,246,232,0.9)');
  }
  // SLIM on the throne
  slim(cx, cy + 300 - 0.55 * 40, 2.3);
  // confetti in gold + cream
  for (let i = 0; i < 70; i++) {
    const u = (t * (0.18 + hash(i) * 0.12) + hash(i + 3)) % 1;
    const x = hash(i + 9) * VIEW_W + Math.sin(t * 2 + i) * 30;
    const y = -20 + u * (VIEW_H + 40);
    g.fillStyle = i % 3 ? '#E0B64A' : '#FFF6E8';
    g.save();
    g.translate(x, y);
    g.rotate(t * 3 + i);
    g.fillRect(-5, -3, 10, 6);
    g.restore();
  }
  // the opening iris over it all
  const open = easeOut(clamp01(t / 1.1));
  drawIris(g, cx, cy - 80, open * 1400, 1.2 - open * 1.2, 1);
}

/**
 * The world INSIDE the film for the finale (bars 84-86): the picture flattening into celluloid — a warm projector-lit
 * void with giant sprocket columns scrolling past and frame lines sliding down (the film running through the gate).
 */
export function makeFilmVoid(light: LightingDirector): ParallaxScene {
  const scene = new ParallaxScene(light);
  scene.add({
    id: 'film-void',
    pass: 'back',
    draw: (g, cam, f) => {
      const L = f.L;
      const gr = g.createRadialGradient(VIEW_W / 2, VIEW_H * 0.45, 100, VIEW_W / 2, VIEW_H / 2, 1200);
      gr.addColorStop(0, css(lit(L, H('#4A2E24'), 1, 0)));
      gr.addColorStop(1, '#0D0806');
      g.fillStyle = gr;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      // giant sprocket columns + frame lines, scrolling with the camera and the beat
      const off = ((cam.x * 0.3) % 240 + 240) % 240;
      const run = (f.b.beat * 60) % 300;
      g.fillStyle = 'rgba(248,241,220,0.07)';
      for (let x = -off; x < VIEW_W + 240; x += 240) g.fillRect(x, 0, 6, VIEW_H);
      g.fillStyle = 'rgba(248,241,220,0.12)';
      for (let y = -300 + run; y < VIEW_H; y += 300) {
        g.fillRect(40, y, 70, 110);
        g.fillRect(VIEW_W - 110, y, 70, 110);
      }
      drawGlow(g, VIEW_W / 2, VIEW_H * 0.35, '#F8F1DC', 700, 0.12);
    },
  });
  return scene;
}

// ------------------------------------------------------------------ play layer

/** the finale's floor: a FILM STRIP (celluloid, sprocket holes, frame lines, tiny frames of the reels you played) */
export function drawFilmstripFloor(g: Ctx, rect: { x: number; y: number; w: number; h: number }, style: { light: Lighting; capL?: boolean; capR?: boolean }, b?: BeatInfo): void {
  const L = style.light;
  const { x, y, w } = rect;
  const band = 150;
  g.fillStyle = '#16100C';
  g.fillRect(x, y, w, band);
  // sprockets top + bottom, ticking on the beat
  const tick = b ? hit(b, 'kick', 0.12) : 0;
  g.fillStyle = `rgba(244,239,226,${0.75 + 0.25 * tick})`;
  for (let px = Math.floor(x / 48) * 48; px < x + w; px += 48) {
    if (px < x) continue;
    g.fillRect(px + 12, y + 10, 22, 16);
    g.fillRect(px + 12, y + band - 26, 22, 16);
  }
  // frames: little scenes of every reel, tinted
  const FW = 180;
  const tints = ['#DCC7A0', '#2A1E3A', '#4A2E1E', '#2A1650', '#1F3A2A', '#5E2B4E', '#E8577A'];
  for (let px = Math.floor(x / FW) * FW; px < x + w; px += FW) {
    const a = Math.max(x, px + 8);
    const z = Math.min(x + w, px + FW - 8);
    if (z <= a) continue;
    const i = Math.abs(Math.floor(px / FW)) % tints.length;
    g.fillStyle = css(lit(L, H(tints[i]), 1, 0.1));
    g.fillRect(a, y + 34, z - a, band - 68);
    // a tiny silhouette: skyline / bottles / pins / letters
    g.fillStyle = 'rgba(13,10,8,0.55)';
    for (let k = 0; k < 4; k++) {
      const bx = px + 20 + k * 38;
      if (bx < a || bx + 24 > z) continue;
      g.fillRect(bx, y + band - 34 - 20 - (hash(i * 7 + k) * 40), 24, 20 + hash(i * 7 + k) * 40);
    }
  }
  // below the strip: the dark theatre
  g.fillStyle = '#050403';
  g.fillRect(x, y + band, w, Math.min(rect.h, 1600) - band);
  g.fillStyle = CF.filmBlack;
  g.fillRect(x, y - 1, w, 5);
  g.fillStyle = '#F4EFE2';
  g.fillRect(x, y - 3, w, 3);
}

/** one IRIS BLADE as a tilted platform: blackened steel leaf, a riveted pivot, a cream lip on its walkable edge */
export function drawIrisBlade(g: Ctx, x: number, y: number, w: number, ang: number, L?: Lighting): void {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(-w / 2, 0);
  g.quadraticCurveTo(0, -10, w / 2, 0);
  g.quadraticCurveTo(w * 0.3, 70, -w / 2 + 20, 90);
  g.closePath();
  const gr = g.createLinearGradient(0, 0, 0, 90);
  gr.addColorStop(0, '#4A4448');
  gr.addColorStop(1, '#14100E');
  g.fillStyle = gr;
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = '#8A8478';
  g.beginPath();
  g.arc(-w / 2 + 30, 40, 9, 0, TAU);
  g.fill();
  g.fillStyle = INK;
  g.fillRect(-w / 2, -3, w, 5);
  g.fillStyle = '#F4EFE2';
  g.fillRect(-w / 2, -5, w, 3);
  g.restore();
  void L;
}
