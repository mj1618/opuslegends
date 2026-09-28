/**
 * THE THEATRE (parallax layer 0, fixed, screen space, OUTSIDE the film pass) — DESIGN §3/§4:
 *   - a ~70 px strip of audience silhouettes along the bottom = the streak meter: `standing` people
 *     (0..24) are up; at >= 20 it's FULL HOUSE (everyone up, arms waving). Everyone stomps (2 px) on
 *     the kick, popcorn bursts on the snare, arms go up on "HEY!", and a Perfect sends a ripple of
 *     seats leaping outward from the hero's x (one seat per 32nd). Knocked-out enforcers sit in the
 *     front row in flat caps and cheer.
 *   - the projector beam haze across the top (dust motes, smoke curls)
 *   - velvet curtain edges at the far sides
 *
 *   drawTheatre(ctx, beat, { standing, heroX, perfectT, enforcers, light })
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex, mix } from '../core/color';
import { drawGlow } from '../core/draw';
import { TAU, clamp01, easeOut, fract, hash } from '../core/math';
import { CF } from '../palette';
import type { Lighting } from '../world/lighting';

const W = 1920;
const H = 1080;
const STRIP = 70;
const SEATS = 48;

export interface TheatreState {
  /** people standing (0..24); >= 20 = FULL HOUSE */
  standing: number;
  /** hero screen x (ripple origin) */
  heroX?: number;
  /** seconds since the last Perfect (ripple), undefined = none */
  perfectT?: number;
  /** knocked-out enforcers now sitting in the front row */
  enforcers?: number;
  /** current world lighting (rim light from the screen) */
  light?: Lighting;
  /** 0..1 house lights (finale) */
  house?: number;
  /** hide the beam / curtains */
  beam?: boolean;
  curtains?: boolean;
}

interface Seat {
  x: number;
  row: number;
  hat: number;
  size: number;
  order: number;
}

const seats: Seat[] = [];
for (let i = 0; i < SEATS; i++) {
  const row = i % 2;
  seats.push({
    x: (i / SEATS) * W + (row ? 20 : 0) + (hash(i * 3) - 0.5) * 14,
    row,
    hat: hash(i * 7) < 0.22 ? 1 : hash(i * 7) > 0.9 ? 2 : 0,
    size: 0.85 + hash(i * 11) * 0.3,
    order: hash(i * 13 + 5),
  });
}
// standing order: deterministic shuffle, front row first
const standOrder = [...seats.keys()].sort((a, b) => seats[b].row - seats[a].row || seats[a].order - seats[b].order);

function person(g: Ctx, x: number, baseY: number, s: number, up: number, arms: number, hat: number, time: number, i: number) {
  const headY = baseY - 30 * s - up * 24;
  // shoulders / torso
  g.beginPath();
  g.moveTo(x - 20 * s, baseY + 10);
  g.quadraticCurveTo(x - 20 * s, headY + 16 * s, x - 8 * s, headY + 12 * s);
  g.lineTo(x + 8 * s, headY + 12 * s);
  g.quadraticCurveTo(x + 20 * s, headY + 16 * s, x + 20 * s, baseY + 10);
  g.closePath();
  g.fill();
  // arms up (cheer) — wave with time
  if (arms > 0.05) {
    const wv = Math.sin(time * 10 + i) * 0.25;
    for (const sd of [-1, 1]) {
      const a = -Math.PI / 2 + sd * (0.45 + wv * sd) * arms;
      g.lineWidth = 7 * s;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x + sd * 12 * s, headY + 16 * s);
      g.lineTo(x + sd * 12 * s + Math.cos(a) * 34 * s * arms, headY + 16 * s + Math.sin(a) * 34 * s * arms);
      g.stroke();
    }
  }
  // head
  g.beginPath();
  g.ellipse(x, headY, 10 * s, 12 * s, 0, 0, TAU);
  g.fill();
  if (hat === 1) {
    // flat cap / fedora brim
    g.fillRect(x - 14 * s, headY - 8 * s, 28 * s, 4 * s);
    g.beginPath();
    g.ellipse(x, headY - 9 * s, 10 * s, 6 * s, 0, Math.PI, TAU);
    g.fill();
  } else if (hat === 2) {
    g.beginPath();
    g.ellipse(x, headY - 4 * s, 14 * s, 13 * s, 0, 0, TAU);
    g.fill();
  }
}

export function drawTheatre(g: Ctx, b: BeatInfo, s: TheatreState): void {
  const L = s.light;
  const time = b.time;
  const house = s.house ?? 0;
  // ------------------------------------------------ projector beam haze (top)
  if (s.beam !== false) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    const flick = 0.9 + hash(Math.floor(time * 24)) * 0.1;
    // soft cone from the booth behind the audience: layered wide glows, no hard edges
    for (let i = 0; i < 5; i++) {
      const x = W * (0.5 + (i - 2) * 0.2);
      drawGlow(g, x, -60, '#F8F1DC', 520, 0.05 * flick, true);
    }
    drawGlow(g, W * 0.5, -160, '#F8F1DC', 900, 0.06 * flick, true);
    // dust motes drifting in the beam
    g.fillStyle = 'rgba(248,241,220,0.5)';
    for (let i = 0; i < 40; i++) {
      const u = fract(hash(i) + time * 0.02 * (0.5 + hash(i + 3)));
      const x = hash(i * 7) * W + Math.sin(time * 0.5 + i) * 20;
      const y = u * H * 0.3;
      g.globalAlpha = (1 - y / (H * 0.3)) * 0.7;
      g.fillRect(x, y, 2, 2);
    }
    // cigarette smoke curls
    g.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const x = ((hash(i * 5) * W + time * 12 * (i + 1)) % (W + 400)) - 200;
      drawGlow(g, x, H * (0.12 + i * 0.05), '#F8F1DC', 260, 0.06, true);
    }
    g.restore();
  }
  // ------------------------------------------------ curtains
  if (s.curtains !== false) {
    const cur = hex(CF.curtain);
    for (const sd of [0, 1]) {
      const x0 = sd ? W - 46 : 0;
      const gr = g.createLinearGradient(x0, 0, x0 + 46, 0);
      const dark = css(mix(cur, [0, 0, 0], 0.55));
      const mid = css(mix(cur, hex(CF.houseAmber), house * 0.4));
      gr.addColorStop(0, sd ? mid : dark);
      gr.addColorStop(0.5, css(cur));
      gr.addColorStop(1, sd ? dark : mid);
      g.fillStyle = gr;
      g.fillRect(x0, 0, 46, H);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      for (let k = 0; k < 3; k++) g.fillRect(x0 + 8 + k * 14, 0, 3, H);
    }
  }
  // ------------------------------------------------ audience strip
  const standing = Math.max(0, Math.min(24, s.standing));
  const full = standing >= 20;
  const kick = hit(b, 'kick', 0.08);
  const hey = hit(b, 'hey', 0.25);
  const bounce = kick * 2;
  const rim = L ? css(mix(mix(L.key, hex(CF.filmHi), 0.5), hex(CF.houseAmber), house), 0.55) : 'rgba(233,216,180,0.5)';
  const seatCol = css(mix(hex(CF.seats), hex(CF.houseAmber), house * 0.25));
  const standSet = new Set(standOrder.slice(0, Math.round(full ? SEATS : standing * 2)));
  const base = H - 6 + bounce;
  // back row then front row
  for (const row of [0, 1]) {
    for (let i = 0; i < SEATS; i++) {
      const st = seats[i];
      if (st.row !== row) continue;
      let up = standSet.has(i) ? 1 : 0;
      // Perfect ripple: one seat later per 32nd (b.spb / 8), outward from the hero
      if (s.perfectT !== undefined && s.heroX !== undefined) {
        const delay = (Math.abs(st.x - s.heroX) / (W / SEATS)) * (b.spb / 8);
        const tt = s.perfectT - delay;
        if (tt > 0 && tt < 0.35) up = Math.max(up, Math.sin((tt / 0.35) * Math.PI) * 1.3);
      }
      const arms = Math.max(full ? 0.8 : 0, up > 0.5 ? hey * 1.1 + (full ? 0.2 : 0) : hey * 0.25);
      const y = base - (row ? 0 : 18);
      g.fillStyle = seatCol;
      g.strokeStyle = seatCol;
      person(g, st.x, y - Math.abs(Math.sin(time * 9 + i)) * up * (full ? 4 : 1.5), st.size * (row ? 1.08 : 0.92), up, arms, st.hat, time, i);
      // rim light from the screen on the head
      if (up > 0.2 || row === 0) {
        g.strokeStyle = rim;
        g.lineWidth = 2;
        const hy = y - 30 * st.size - up * 24;
        g.beginPath();
        g.arc(st.x, hy, 10 * st.size * (row ? 1.08 : 0.92), Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
      }
    }
  }
  // front-row enforcers (knocked into the audience): flat caps + fig shoulders, cheering on HEY
  const nE = Math.min(8, s.enforcers ?? 0);
  for (let k = 0; k < nE; k++) {
    const x = 180 + k * 210 + (hash(k) - 0.5) * 40;
    g.fillStyle = css(mix(hex(CF.fig), hex(CF.seats), 0.5));
    g.strokeStyle = g.fillStyle;
    person(g, x, base + 8, 1.2, 0.3 + hey * 0.6, hey, 1, time, k + 99);
  }
  // popcorn bursts on the snare (FULL HOUSE: bigger, constant)
  const sn = b.since.snare;
  const bursts = full ? 5 : 1 + Math.floor(standing / 6);
  if (sn < 0.9) {
    const n = b.count.snare;
    for (let k = 0; k < bursts; k++) {
      const ox = hash(n * 17 + k) * (W - 200) + 100;
      for (let i = 0; i < 9; i++) {
        const vx = (hash(n + i * 3 + k) - 0.5) * 240;
        const vy = -280 - hash(i + k * 7 + n) * 260;
        const px = ox + vx * sn;
        const py = base - 50 + vy * sn + 900 * sn * sn;
        if (py > H + 10) continue;
        g.fillStyle = i % 3 ? CF.cream : '#F2D89A';
        g.beginPath();
        g.arc(px, py, 3 + (i % 3), 0, TAU);
        g.arc(px + 2.5, py - 1.5, 2.5, 0, TAU);
        g.fill();
      }
    }
  }
  void clamp01;
  void easeOut;
  void STRIP;
}

/** the theatre strip height (the camera keeps the ground above it) */
export const THEATRE_STRIP = STRIP;
