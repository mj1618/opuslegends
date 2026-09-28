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
 * THE MARQUEE SWAP (a comic cut-in, top left: clear of Big Jim's frame on the right): outside at night, the Jimperial's marquee. An usher on a ladder pulls
 * down B-I-G J-I-M letter by letter; SLIM CHANCE goes up in the big letters (k 0..1).
 */
export function drawMarqueeCutIn(g: Ctx, k: number, b: BeatInfo, t: number): void {
  if (k <= 0 || k >= 1.4) return;
  const inK = easeOut(clamp01(k * 4));
  const outK = clamp01((k - 1.1) / 0.3);
  const w = 760;
  const h = 420;
  const x = 150 - (1 - inK) * 1000 - outK * 1000;
  const y = 90;
  g.save();
  g.translate(x + w / 2, y + h / 2);
  g.rotate(-0.03);
  g.scale(0.82, 0.82);
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
 * THE END: t = seconds since the iris shut. 0-0.1 black; the film SNAPS (the tail flapping through the gate: flickering
 * white frames, a scratch storm); 0.35-1.25 s THE END burns in from its centre with cigarette-burn edges.
 */
export function drawTheEnd(g: Ctx, t: number, b: BeatInfo): void {
  g.fillStyle = '#050403';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  if (t < 0.1) return;
  // the film tail flapping in the gate: stuttering light + sprocket holes whipping past
  const flap = clamp01((t - 0.1) / 0.75);
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
  const burn = clamp01((t - 0.35) / 0.9);
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
 * VICTORY (the last shot of the trailer): a second iris opens (t = seconds since it starts opening) on SLIM'S VICTORY
 * POSE on Big Jim's throne of pool tables — a slow push-in, a gold sunburst behind him, a follow-spot, the theatre's
 * marquee lit over the throne with HIS name now (SLIM CHANCE, bulbs chasing: the marquee swap paid off), the ex-goons
 * applauding on the beat, confetti. `slim(x, y, scale)` draws the hero (the renderer owns the rig state).
 */
export function drawVictory(g: Ctx, t: number, b: BeatInfo, slim: (x: number, y: number, s: number) => void, L?: Lighting): void {
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2 + 60;
  const kick = hit(b, 'kick', 0.12);
  // the stage behind: a warm fig room, brighter than the film's night (a triumphant key)
  const bg = g.createRadialGradient(cx, cy - 160, 60, cx, cy, 1200);
  bg.addColorStop(0, '#8A3E6A');
  bg.addColorStop(0.45, '#4A2040');
  bg.addColorStop(1, '#0E0610');
  g.fillStyle = bg;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  // slow push-in on the hero
  const push = 1 + 0.07 * easeOut(clamp01(t / 5));
  g.save();
  g.translate(cx, cy + 200);
  g.scale(push, push);
  g.translate(-cx, -(cy + 200));
  // SUNBURST: gold + fig rays turning slowly behind the throne, flaring on the kick
  const sx = cx;
  const sy = cy - 40;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 24; i++) {
    const a = t * 0.12 + (i / 24) * TAU;
    g.fillStyle = i % 2 ? `rgba(224,182,74,${0.13 + 0.05 * kick})` : `rgba(232,86,155,${0.06 + 0.03 * kick})`;
    g.beginPath();
    g.moveTo(sx, sy);
    g.arc(sx, sy, 1500, a - 0.07, a + 0.07);
    g.closePath();
    g.fill();
  }
  drawGlow(g, sx, sy, '#FFE9C2', 620, 0.45 + 0.15 * kick);
  // the follow-spot from the booth
  const cone = g.createLinearGradient(0, 0, 0, VIEW_H);
  cone.addColorStop(0, 'rgba(248,241,220,0.4)');
  cone.addColorStop(1, 'rgba(248,241,220,0.08)');
  g.fillStyle = cone;
  g.beginPath();
  g.moveTo(cx - 70, -20);
  g.lineTo(cx + 70, -20);
  g.lineTo(cx + 380, VIEW_H);
  g.lineTo(cx - 380, VIEW_H);
  g.closePath();
  g.fill();
  g.restore();
  // the throne (his now), the ex-goons applauding on either side (clap on the beat)
  drawThrone(g, cx, cy + 300, 0.55, L);
  const clap = Math.exp(-b.beatPhase * 5);
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const j = i % 4;
    const x = cx + side * (440 + j * 125);
    const y = VIEW_H - 150 - (j % 2) * 26;
    g.fillStyle = '#3A1634';
    g.beginPath();
    g.ellipse(x, y - 60, 48, 72, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#B87458';
    g.beginPath();
    g.arc(x, y - 142, 24, 0, TAU);
    g.fill();
    g.fillStyle = '#2A1A14';
    g.beginPath();
    g.ellipse(x + 3, y - 158, 26, 10, 0, Math.PI, TAU);
    g.fill();
    g.fillRect(x - 24, y - 160, 50, 5);
    const hx = 10 + (1 - clap) * 18;
    g.fillStyle = '#B87458';
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.arc(x - side * 30 + sd * hx, y - 112, 11, 0, TAU);
      g.fill();
    }
    if (clap > 0.7) star4(g, x - side * 30, y - 126, 16 * clap, 0.3, 'rgba(255,246,232,0.9)');
  }
  // SLIM on the throne: big, lit, the only tangerine in the frame
  drawGlow(g, cx, cy + 120, '#FFF1D6', 330, 0.35);
  slim(cx, cy + 300 - 0.55 * 40, 2.7);
  // the marquee over the throne: SLIM CHANCE in the big letters (it covers Big Jim's monogram)
  drawVictoryMarquee(g, cx, 96, b, kick);
  g.restore();
  // the opening iris over it all
  const open = easeOut(clamp01(t / 1.1));
  if (open < 1) drawIris(g, cx, cy - 80, open * 1400, 1.2 - open * 1.2, 1);
}

/** the Jimperial marquee with the hero's name in chasing bulbs (the victory's title card) */
function drawVictoryMarquee(g: Ctx, cx: number, y: number, b: BeatInfo, kick: number): void {
  const w = 1000;
  const h = 196;
  const x = cx - w / 2;
  g.fillStyle = '#1A1016';
  g.fillRect(x - 22, y - 16, w + 44, h + 32);
  g.fillStyle = '#F2E6CC';
  g.fillRect(x + 14, y + 14, w - 28, h - 28);
  const chase = Math.floor(b.beat * 4);
  const per = 52;
  for (let i = 0; i < per; i++) {
    let d = (i / per) * 2 * (w + h);
    let px: number;
    let py: number;
    if (d < w) (px = x + d), (py = y);
    else if ((d -= w) < h) (px = x + w), (py = y + d);
    else if ((d -= h) < w) (px = x + w - d), (py = y + h);
    else (d -= w), (px = x), (py = y + h - d);
    const on = (i + chase) % 3 === 0 || kick > 0.6;
    g.fillStyle = on ? CF.bulb : '#5A4A3A';
    g.beginPath();
    g.arc(px, py, 7, 0, TAU);
    g.fill();
    if (on) drawGlow(g, px, py, CF.bulb, 26, 0.5);
  }
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = CF.fig;
  g.font = `bold 20px ${SIGN_FONT}`;
  g.fillText('NOW  PLAYING  ·  HELD  OVER', cx, y + 44);
  const pop = 1 + 0.03 * kick;
  g.save();
  g.translate(cx, y + 150);
  g.scale(pop, pop);
  g.font = `118px ${SIGN_FONT}`;
  g.lineJoin = 'round';
  g.lineWidth = 12;
  g.strokeStyle = INK;
  g.strokeText('SLIM CHANCE', 0, 0);
  g.fillStyle = CF.tangerine;
  g.fillText('SLIM CHANCE', 0, 0);
  g.restore();
  g.fillStyle = INK;
  g.font = `italic bold 18px ${SIGN_FONT}`;
  g.fillText('with BIG JIM (briefly)', cx, y + h - 14);
}

/**
 * THE THEATRE FRAME (the finale, k 0..1): the film stays FULL-FRAME; red velvet swags tied back at the sides and a
 * gold-fringed valance creep in over its edges, the house lights glow amber in the corners — we're watching the last
 * reel with the audience (their strip is drawn by the renderer below it).
 */
export function drawCurtainFrame(g: Ctx, k: number, b: BeatInfo): void {
  const e = easeOut(clamp01(k));
  if (e <= 0.001) return;
  const sway = Math.sin(b.beat * Math.PI * 0.5) * 5 * e;
  const W0 = 118 * e;
  for (const side of [-1, 1]) {
    const ox = side < 0 ? 0 : VIEW_W;
    const at = (w: number) => ox - side * w;
    const gr = g.createLinearGradient(ox, 0, at(W0 * 1.3), 0);
    gr.addColorStop(0, '#24090D');
    gr.addColorStop(0.55, '#8A2A30');
    gr.addColorStop(0.85, '#6A1A20');
    gr.addColorStop(1, '#3A0E12');
    g.fillStyle = gr;
    const tieY = VIEW_H * 0.6;
    g.beginPath();
    g.moveTo(ox, -10);
    g.lineTo(at(W0 * 1.35), -10);
    g.quadraticCurveTo(at(W0 * 1.05 + sway), tieY * 0.55, at(W0 * 0.5), tieY);
    g.quadraticCurveTo(at(W0 * 0.95 + sway), VIEW_H * 0.85, at(W0 * 1.15), VIEW_H + 10);
    g.lineTo(ox, VIEW_H + 10);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(20,4,6,0.45)';
    g.lineWidth = 4;
    for (let f = 1; f <= 3; f++) {
      const w = (W0 * f) / 4;
      g.beginPath();
      g.moveTo(at(w * 1.3), -10);
      g.quadraticCurveTo(at(w * 1.05 + sway), tieY * 0.55, at(w * 0.5), tieY);
      g.quadraticCurveTo(at(w * 0.95), VIEW_H * 0.85, at(w * 1.15), VIEW_H + 10);
      g.stroke();
    }
    // the gold tie-back + tassel
    g.fillStyle = CF.gold;
    g.fillRect(Math.min(ox, at(W0 * 0.62)), tieY - 7, W0 * 0.62, 14);
    g.beginPath();
    g.arc(at(W0 * 0.55), tieY + 16, 9 * e, 0, TAU);
    g.fill();
    drawGlow(g, at(W0 * 0.9), 70, CF.houseAmber, 180 * e, 0.4 * e);
  }
  // the valance: scalloped velvet with a gold fringe
  const vh = 54 * e;
  g.fillStyle = '#5A1A20';
  g.beginPath();
  g.moveTo(0, -10);
  g.lineTo(VIEW_W, -10);
  g.lineTo(VIEW_W, vh);
  for (let i = 12; i >= 0; i--) {
    const x = (i / 12) * VIEW_W;
    g.quadraticCurveTo(x + VIEW_W / 24, vh + 34 * e, x, vh);
  }
  g.closePath();
  g.fill();
  g.strokeStyle = CF.gold;
  g.lineWidth = 5;
  g.stroke();
}

/**
 * THE FINAL HIT's light burst (T = seconds since the hit, at the strike point x, y): a white-out that snaps back, a
 * gold + cream starburst of rays, a shock ring racing out, a hot core.
 */
export function drawFinalBurst(g: Ctx, T: number, x: number, y: number): void {
  if (T < 0 || T > 0.9) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const f = Math.max(0, 1 - T / 0.12);
  if (f > 0) {
    g.fillStyle = `rgba(255,248,230,${0.75 * f * f})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  const a = Math.max(0, 1 - T / 0.9);
  const R = 300 + 2400 * easeOut(clamp01(T / 0.45));
  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * TAU + hash(i) * 0.12 + T * 0.4;
    const w = 0.025 + hash(i + 5) * 0.035;
    g.fillStyle = i % 2 ? `rgba(255,224,138,${0.2 * a})` : `rgba(255,246,232,${0.12 * a})`;
    g.beginPath();
    g.moveTo(x, y);
    g.arc(x, y, R * (0.7 + 0.3 * hash(i + 9)), ang - w, ang + w);
    g.closePath();
    g.fill();
  }
  drawGlow(g, x, y, '#FFF1D6', 150 + 200 * T, 0.5 * a);
  g.strokeStyle = `rgba(255,246,232,${0.85 * a})`;
  g.lineWidth = 4 + 16 * a;
  g.beginPath();
  g.arc(x, y, 60 + 1500 * easeOut(clamp01(T / 0.6)), 0, TAU);
  g.stroke();
  g.restore();
}

/**
 * THE HOUSE ERUPTS (T = seconds since the final hit, a = alpha): the front rows jump up in silhouette in front of the
 * screen, arms up and bouncing on the beat, popcorn fountains out of their buckets and confetti cannons fire from both
 * corners (drifting down for seconds). Deterministic in T (no state).
 */
export function drawEruption(g: Ctx, T: number, b: BeatInfo, a = 1): void {
  if (T < 0 || a <= 0) return;
  g.save();
  g.globalAlpha = a;
  const rise = easeOut(clamp01(T / 0.3));
  const bounce = Math.exp(-b.beatPhase * 4);
  // the front rows (big dark silhouettes, amber rim from the house lights)
  for (let r = 0; r < 2; r++) {
    const n = r ? 11 : 13;
    const s = r ? 2.3 : 1.8;
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5 + (r ? 0 : 0.5)) / n) * VIEW_W + (hash(i + r * 31) - 0.5) * 50;
      const jump = (0.5 + 0.5 * hash(i * 3 + r)) * bounce * 26 * s;
      const base = VIEW_H + 60 - (r ? 0 : 60) + (1 - rise) * 200 * s - jump;
      const head = base - 70 * s;
      g.fillStyle = r ? '#0A0706' : '#1A100C';
      g.strokeStyle = g.fillStyle;
      g.beginPath();
      g.moveTo(x - 30 * s, base + 60);
      g.quadraticCurveTo(x - 30 * s, head + 22 * s, x - 10 * s, head + 16 * s);
      g.lineTo(x + 10 * s, head + 16 * s);
      g.quadraticCurveTo(x + 30 * s, head + 22 * s, x + 30 * s, base + 60);
      g.closePath();
      g.fill();
      g.beginPath();
      g.ellipse(x, head, 14 * s, 17 * s, 0, 0, TAU);
      g.fill();
      g.lineWidth = 10 * s;
      g.lineCap = 'round';
      const wv = Math.sin(T * 9 + i * 1.7) * 0.22;
      for (const sd of [-1, 1]) {
        const ang = -Math.PI / 2 + sd * (0.38 + wv * sd);
        g.beginPath();
        g.moveTo(x + sd * 18 * s, head + 22 * s);
        g.lineTo(x + sd * 18 * s + Math.cos(ang) * 58 * s, head + 22 * s + Math.sin(ang) * 58 * s);
        g.stroke();
      }
      if (r === 0) {
        g.strokeStyle = 'rgba(255,190,110,0.5)';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x, head, 15 * s, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
    }
  }
  // popcorn fountains
  for (let i = 0; i < 110; i++) {
    const t0 = hash(i + 200) * 1.4;
    const tt = T - t0;
    if (tt < 0 || tt > 1.6) continue;
    const bx = (0.08 + 0.84 * ((i % 7) / 6)) * VIEW_W;
    const px = bx + (hash(i + 3) - 0.5) * 520 * tt;
    const py = VIEW_H - 150 + (-900 - hash(i + 4) * 700) * tt + 1500 * tt * tt;
    if (py > VIEW_H + 20) continue;
    g.fillStyle = i % 3 ? CF.cream : '#F2D89A';
    g.beginPath();
    g.arc(px, py, 5, 0, TAU);
    g.arc(px + 4, py - 3, 4, 0, TAU);
    g.fill();
  }
  // confetti cannons from both bottom corners: burst, drag, then flutter down
  const COLS = [CF.gold, CF.cream, CF.neonRose, CF.neonJade, CF.goldHi];
  for (let i = 0; i < 160; i++) {
    const t0 = hash(i + 400) * 0.35 + (i % 2 ? 0 : 0.05);
    const tt = T - t0;
    if (tt < 0) continue;
    const side = i % 2 ? 1 : -1;
    const vx = -side * (500 + hash(i + 1) * 1300);
    const vy = -(1300 + hash(i + 2) * 1000);
    const tau = (1 - Math.exp(-tt * 2.4)) / 2.4;
    const x = (side < 0 ? 60 : VIEW_W - 60) + vx * tau + Math.sin(tt * 5 + i) * 24 * Math.min(1, tt);
    const y = VIEW_H - 60 + vy * tau + 140 * tt;
    if (y > VIEW_H + 20) continue;
    g.save();
    g.translate(x, y);
    g.rotate(tt * (4 + hash(i + 7) * 6) + i);
    g.scale(1, Math.cos(tt * 8 + i));
    g.fillStyle = COLS[i % COLS.length];
    g.fillRect(-7, -4, 14, 8);
    g.restore();
  }
  g.restore();
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
