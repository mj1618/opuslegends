/**
 * Play-layer terrain (world coords, caller has applied the camera transform).
 *
 *   drawChalkGround(ctx, rect, style)  chalk (or wet cave rock) ground with turf, flint edge line
 *   drawBoardwalk(ctx, rect, style)    plank deck on posts
 *   drawPlatform(ctx, rect, style)     floating chalk ledge / crate stack
 *
 * rect.y is the WALKABLE SURFACE; rect.h extends downward (usually below the sea surface).
 * Everything is built from cached, relightable TintBake tiles (a 512-px repeating top segment,
 * two end caps and a live gradient for the deep face), so any width is cheap and the lighting
 * recolours it smoothly. The top always carries a dark ink/flint edge line (never merges with foam).
 */
import { TintBake } from '../core/bake';
import type { Ctx } from '../core/canvas';
import { type RGB, css, hex, mix } from '../core/color';
import { TAU, hash, rng } from '../core/math';
import { PAL, RGBP } from '../palette';
import { type Lighting, lit } from './lighting';
import { flintBands, streaks } from './paint';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GroundStyle {
  light: Lighting;
  /** bumps when the lighting changes (LightingDirector.version) */
  version?: number;
  kind?: 'chalk' | 'cave';
  seed?: number;
  /** draw the crumbly end caps (default both) */
  capL?: boolean;
  capR?: boolean;
}

const SEG_W = 512;
const SEG_H = 200;
const CAP_W = 72;
const INK = '#17161E';

// ------------------------------------------------------------------------------ chalk ground

type Bakes = { seg: TintBake[]; capL: TintBake; capR: TintBake };
const groundBakes = new Map<string, Bakes>();

function turfTop(g: Ctx, x0: number, x1: number, seed: number, wrapW = 0) {
  // turf band: surface at y=0, blades above, scalloped drips below
  g.beginPath();
  g.moveTo(x0, -3);
  for (let x = x0; x <= x1; x += 8) g.lineTo(x, -3 - (Math.sin(x * 0.21 + seed) * 0.5 + 0.5) * 2.5);
  for (let x = x1; x >= x0; x -= 6) {
    const px = wrapW ? ((x % wrapW) + wrapW) % wrapW : x;
    const drip = Math.max(0, Math.sin(px * 0.09 + seed) * Math.sin(px * 0.023 + seed * 2)) * 14;
    g.lineTo(x, 11 + drip + (Math.sin(px * 0.5) * 0.5 + 0.5) * 3);
  }
  g.closePath();
  g.fill();
}

function blades(g: Ctx, x0: number, x1: number, seed: number) {
  for (let x = x0; x < x1; x += 5) {
    const k = hash(Math.floor(x) * 7 + seed);
    if (k < 0.35) continue;
    const h = 5 + k * 10;
    g.beginPath();
    g.moveTo(x - 2.2, -1);
    g.quadraticCurveTo(x + (k - 0.5) * 6, -h * 0.6, x + (k - 0.5) * 8, -h);
    g.lineTo(x + 2.2, -1);
    g.fill();
  }
}

function paintSegment(b: TintBake, seed: number, kind: 'chalk' | 'cave') {
  const W = SEG_W;
  const body = b.ch(0);
  const shade = b.ch(1);
  const ink = b.ch(2);
  const turf = b.ch(3);
  const tl = b.ch(4);
  const hl = b.ch(5);
  // everything in tile coords shifted so the surface is at y = 24
  for (const c of [body, shade, ink, turf, tl, hl]) c.translate(0, 24);
  body.fillRect(0, -2, W, SEG_H);
  // face shading: darker with depth + erosion streaks + shadow under the turf
  const gr = shade.createLinearGradient(0, 0, 0, SEG_H - 24);
  gr.addColorStop(0, 'rgba(255,255,255,0.05)');
  gr.addColorStop(1, 'rgba(255,255,255,0.75)');
  shade.fillStyle = gr;
  shade.fillRect(0, 0, W, SEG_H);
  shade.fillStyle = '#fff';
  streaks(shade, 0, W, 16, SEG_H - 24, seed, 0.45);
  const ug = shade.createLinearGradient(0, 8, 0, 40);
  ug.addColorStop(0, 'rgba(255,255,255,0.9)');
  ug.addColorStop(1, 'rgba(255,255,255,0)');
  shade.fillStyle = ug;
  shade.fillRect(0, 8, W, 32);
  // flint: nodule bands + cracks (wrap-safe by drawing at +-W)
  for (const dx of [0, -W, W]) {
    ink.save();
    ink.translate(dx, 0);
    flintBands(ink, 0, W, 34, SEG_H - 24, 46, seed, kind === 'cave' ? 2.6 : 3.6);
    ink.restore();
  }
  const r = rng(seed * 31 + 7);
  ink.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    let x = r() * W;
    let y = 24 + r() * 40;
    ink.beginPath();
    ink.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (r() - 0.5) * 14;
      y += 10 + r() * 14;
      ink.lineTo(x, y);
    }
    ink.stroke();
  }
  // the dark flint EDGE LINE right under the turf (readability rule)
  ink.fillRect(0, 9, W, 5);
  // chalk highlights: lit specks + pale rim under the edge line
  hl.globalAlpha = 0.8;
  hl.fillRect(0, 14, W, 3);
  hl.globalAlpha = 0.6;
  for (let i = 0; i < 40; i++) {
    hl.beginPath();
    hl.arc(r() * W, 30 + r() * 140, 1 + r() * 2, 0, TAU);
    hl.fill();
  }
  hl.globalAlpha = 1;
  // turf (or moss for cave rock)
  turfTop(turf, -10, W + 10, seed, W);
  blades(turf, -4, W + 4, seed);
  // ink outline on the very top so the walkable edge reads against anything
  ink.fillRect(0, -5, W, 3);
  // turf highlight
  tl.globalAlpha = 0.9;
  for (let x = 0; x < W; x += 3) {
    const k = hash(x * 5 + seed);
    if (k < 0.5) continue;
    tl.fillRect(x, -2 - k * 2, 2, 3);
  }
  tl.globalAlpha = 1;
}

function paintCap(b: TintBake, seed: number, right: boolean) {
  const body = b.ch(0);
  const shade = b.ch(1);
  const ink = b.ch(2);
  const turf = b.ch(3);
  const tl = b.ch(4);
  for (const c of [body, shade, ink, turf, tl, b.ch(5)]) {
    c.translate(0, 24);
    if (right) {
      c.translate(CAP_W, 0);
      c.scale(-1, 1);
    }
  }
  // the cap covers x in [0, CAP_W]; the block's outer edge is at x = 8 (crumbly profile)
  const edge: number[] = [];
  const r = rng(seed * 13 + (right ? 5 : 1));
  for (let y = -4; y <= SEG_H; y += 12) edge.push(8 + (r() - 0.5) * 7 + (y < 20 ? -2 : 0), y);
  const path = new Path2D();
  path.moveTo(CAP_W, -4);
  for (let i = 0; i < edge.length; i += 2) path.lineTo(edge[i], edge[i + 1]);
  path.lineTo(CAP_W, SEG_H);
  path.closePath();
  // clear what's outside the edge for the segment underneath is handled by drawing the cap
  // over a segment that starts at the same x; the cap paints a solid block + its outline
  body.fill(path);
  shade.save();
  shade.clip(path);
  const gr = shade.createLinearGradient(0, 0, 40, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0.8)');
  gr.addColorStop(1, 'rgba(255,255,255,0.15)');
  shade.fillStyle = gr;
  shade.fillRect(0, -10, CAP_W, SEG_H + 20);
  shade.restore();
  ink.lineWidth = 5;
  ink.beginPath();
  for (let i = 0; i < edge.length; i += 2) {
    if (i === 0) ink.moveTo(edge[i], edge[i + 1]);
    else ink.lineTo(edge[i], edge[i + 1]);
  }
  ink.stroke();
  ink.fillRect(edge[0], 9, CAP_W, 5);
  ink.fillRect(edge[0], -5, CAP_W, 3);
  // turf curls over the corner
  turf.beginPath();
  turf.moveTo(CAP_W, -5);
  turf.lineTo(edge[0] + 6, -5);
  turf.quadraticCurveTo(edge[0] - 8, -4, edge[0] - 6, 10);
  turf.quadraticCurveTo(edge[0] - 2, 22, edge[0] + 4, 16);
  turf.lineTo(CAP_W, 14);
  turf.closePath();
  turf.fill();
  blades(turf, edge[0], CAP_W, seed);
  tl.fillRect(edge[0], -4, CAP_W - edge[0], 2);
  // ink outline of the curl
  ink.lineWidth = 3;
  ink.beginPath();
  ink.moveTo(edge[0] + 6, -6);
  ink.quadraticCurveTo(edge[0] - 10, -5, edge[0] - 8, 10);
  ink.quadraticCurveTo(edge[0] - 3, 24, edge[0] + 6, 17);
  ink.stroke();
}

function bakesFor(kind: 'chalk' | 'cave', seed: number): Bakes {
  const key = `${kind}:${seed % 3}`;
  let b = groundBakes.get(key);
  if (b) return b;
  const seg: TintBake[] = [];
  for (let i = 0; i < 3; i++) {
    const t = new TintBake(SEG_W, SEG_H + 24, 6);
    paintSegment(t, (seed % 3) * 10 + i + 1, kind);
    seg.push(t);
  }
  const capL = new TintBake(CAP_W, SEG_H + 24, 6);
  paintCap(capL, seed + 1, false);
  const capR = new TintBake(CAP_W, SEG_H + 24, 6);
  paintCap(capR, seed + 2, true);
  b = { seg, capL, capR };
  groundBakes.set(key, b);
  return b;
}

const colourMemo = new Map<string, { v: number; L: Lighting; cols: string[]; face: [string, string] }>();

function groundColours(kind: 'chalk' | 'cave', L: Lighting, version?: number) {
  const key = kind;
  const m = colourMemo.get(key);
  if (m && ((version !== undefined && m.v === version) || m.L === L)) return m;
  const base: RGB = kind === 'chalk' ? RGBP.chalkBone : hex('#5E7078');
  const shadeM: RGB = kind === 'chalk' ? RGBP.chalkDeep : hex('#24343A');
  const turfM: RGB = kind === 'chalk' ? RGBP.turf : hex('#2F5A4E');
  const turfL: RGB = kind === 'chalk' ? RGBP.turfLight : hex('#6FD6C8');
  const cols = [
    css(lit(L, base, 0.95)),
    css(lit(L, shadeM, 0.35), 0.85),
    css(mix(lit(L, RGBP.flint, 0.5), hex(INK), 0.5)),
    css(lit(L, turfM, 0.95)),
    css(lit(L, turfL, 1.0)),
    css(mix(lit(L, base, 1.12), L.rim, 0.3 * L.rimAmt), 0.9),
  ];
  const face: [string, string] = [css(mix(lit(L, base, 0.95), lit(L, shadeM, 0.35), 0.72)), css(lit(L, shadeM, 0.1))];
  const out = { v: version ?? -1, L, cols, face };
  colourMemo.set(key, out);
  return out;
}

export function drawChalkGround(g: Ctx, rect: Rect, style: GroundStyle): void {
  const kind = style.kind ?? 'chalk';
  const seed = style.seed ?? 0;
  const bk = bakesFor(kind, seed);
  const C = groundColours(kind, style.light, style.version);
  const top = rect.y - 24;
  const hTop = Math.min(rect.h + 24, SEG_H + 24);
  // repeating top segments (world-aligned so neighbouring blocks match)
  const x0 = rect.x;
  const x1 = rect.x + rect.w;
  let x = x0;
  while (x < x1) {
    const segIdx = Math.floor(x / SEG_W);
    const t = bk.seg[Math.floor(hash(segIdx * 7 + seed) * 3)];
    t.compose(C.cols);
    const sx = x - segIdx * SEG_W;
    const w = Math.min(SEG_W - sx, x1 - x);
    const r = t.res;
    g.drawImage(t.out, sx * r, 0, w * r, hTop * r, x, top, w, hTop);
    x += w;
  }
  // deep face below the top tile: live gradient + side ink lines
  if (rect.h > SEG_H) {
    const fy = rect.y + SEG_H;
    const fh = rect.h - SEG_H;
    const gr = g.createLinearGradient(0, fy, 0, fy + Math.min(fh, 260));
    gr.addColorStop(0, C.face[0]);
    gr.addColorStop(1, C.face[1]);
    g.fillStyle = gr;
    g.fillRect(x0, fy - 1, rect.w, fh + 1);
  }
  // caps
  if (style.capL !== false) {
    bk.capL.compose(C.cols);
    g.drawImage(bk.capL.out, 0, 0, bk.capL.out.width, hTop * bk.capL.res, x0 - 8, top, CAP_W, hTop);
    if (rect.h > SEG_H) {
      g.fillStyle = INK;
      g.fillRect(x0 - 2, rect.y + SEG_H - 2, 5, rect.h - SEG_H + 2);
    }
  }
  if (style.capR !== false) {
    bk.capR.compose(C.cols);
    g.drawImage(bk.capR.out, 0, 0, bk.capR.out.width, hTop * bk.capR.res, x1 - CAP_W + 8, top, CAP_W, hTop);
    if (rect.h > SEG_H) {
      g.fillStyle = INK;
      g.fillRect(x1 - 3, rect.y + SEG_H - 2, 5, rect.h - SEG_H + 2);
    }
  }
}

// ------------------------------------------------------------------------------ boardwalk

const BW_W = 256;
const BW_H = 64;
let bwBake: TintBake | null = null;

function boardwalkBake(): TintBake {
  if (bwBake) return bwBake;
  const b = new TintBake(BW_W, BW_H, 5);
  const body = b.ch(0);
  const dark = b.ch(1);
  const ink = b.ch(2);
  const hi = b.ch(3);
  const iron = b.ch(4);
  // deck planks (end grain facing us): y 0..18, stringer beam 18..30
  body.fillRect(0, 0, BW_W, 30);
  const r = rng(99);
  for (let x = 0; x < BW_W; x += 32) {
    dark.globalAlpha = 0.35 + r() * 0.3;
    dark.fillRect(x + 1, 2, 30, 14);
    dark.globalAlpha = 1;
    ink.fillRect(x, 0, 2, 18);
    iron.beginPath();
    iron.arc(x + 8, 9, 1.6, 0, TAU);
    iron.arc(x + 24, 9, 1.6, 0, TAU);
    iron.fill();
    hi.globalAlpha = 0.7;
    hi.fillRect(x + 2, 1, 28, 2);
    hi.globalAlpha = 1;
  }
  dark.globalAlpha = 0.7;
  dark.fillRect(0, 18, BW_W, 12);
  dark.globalAlpha = 1;
  // grain on the beam
  dark.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const y = 20 + r() * 8;
    dark.beginPath();
    dark.moveTo(0, y);
    dark.bezierCurveTo(80, y + 2, 170, y - 2, BW_W, y);
    dark.stroke();
  }
  ink.fillRect(0, -2, BW_W, 4);
  ink.fillRect(0, 17, BW_W, 2);
  ink.fillRect(0, 29, BW_W, 3);
  // post tops (posts continue live below)
  for (const px of [40, 168]) {
    body.fillRect(px, 30, 22, 34);
    dark.globalAlpha = 0.5;
    dark.fillRect(px + 13, 30, 9, 34);
    dark.globalAlpha = 1;
    ink.fillRect(px - 2, 30, 3, 34);
    ink.fillRect(px + 21, 30, 3, 34);
  }
  bwBake = b;
  return b;
}

export function drawBoardwalk(g: Ctx, rect: Rect, style: GroundStyle): void {
  const L = style.light;
  const b = boardwalkBake();
  const wood = RGBP.wood;
  const cols = [
    css(lit(L, wood, 0.95)),
    css(lit(L, RGBP.woodDark, 0.4)),
    INK,
    css(mix(lit(L, hex(PAL.woodLight), 1.05), L.rim, 0.25 * L.rimAmt)),
    css(lit(L, hex('#9AA0A6'), 0.9)),
  ];
  b.compose(cols);
  // posts + braces below the tile (live)
  const postCol = css(lit(L, RGBP.woodDark, 0.55));
  const postTop = rect.y + BW_H;
  const postBot = rect.y + rect.h;
  for (let x = Math.floor(rect.x / 128) * 128; x < rect.x + rect.w; x += 128) {
    const px = x + (Math.floor(x / 128) % 2 === 0 ? 40 : 168 - 128);
    if (px < rect.x - 10 || px + 22 > rect.x + rect.w + 10) continue;
    g.fillStyle = INK;
    g.fillRect(px - 2, postTop - 2, 26, postBot - postTop + 2);
    g.fillStyle = postCol;
    g.fillRect(px + 1, postTop - 2, 20, postBot - postTop + 2);
  }
  // cross braces
  g.strokeStyle = postCol;
  g.lineWidth = 7;
  g.beginPath();
  for (let x = Math.floor(rect.x / 128) * 128; x < rect.x + rect.w - 128; x += 128) {
    if (x < rect.x) continue;
    g.moveTo(x + 50, postTop + 10);
    g.lineTo(x + 170, postTop + 90);
  }
  g.stroke();
  let x = rect.x;
  while (x < rect.x + rect.w) {
    const idx = Math.floor(x / BW_W);
    const sx = x - idx * BW_W;
    const w = Math.min(BW_W - sx, rect.x + rect.w - x);
    g.drawImage(b.out, sx * b.res, 0, w * b.res, BW_H * b.res, x, rect.y, w, BW_H);
    x += w;
  }
  // end caps (ink)
  g.fillStyle = INK;
  g.fillRect(rect.x - 2, rect.y - 2, 4, 32);
  g.fillRect(rect.x + rect.w - 2, rect.y - 2, 4, 32);
}

// ------------------------------------------------------------------------------ platforms

const platBakes = new Map<string, TintBake>();

export interface PlatformStyle extends GroundStyle {
  type?: 'ledge' | 'crate';
}

function ledgeBake(w: number, seed: number): TintBake {
  const key = `ledge:${Math.round(w)}:${seed}`;
  let b = platBakes.get(key);
  if (b) return b;
  const H = 150;
  b = new TintBake(w + 40, H, 6);
  const body = b.ch(0);
  const shade = b.ch(1);
  const ink = b.ch(2);
  const turf = b.ch(3);
  const tl = b.ch(4);
  const hl = b.ch(5);
  for (const c of [body, shade, ink, turf, tl, hl]) c.translate(20, 24);
  // floating chunk: flat top, tapering craggy underside
  const r = rng(seed + 3);
  const p = new Path2D();
  p.moveTo(-4, -2);
  p.lineTo(w + 4, -2);
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = w + 4 - t * (w + 8);
    const depth = Math.sin(Math.PI * (0.15 + t * 0.7)) * (70 + w * 0.08) + (r() - 0.5) * 14;
    p.lineTo(x, 10 + depth);
  }
  p.closePath();
  body.fill(p);
  shade.save();
  shade.clip(p);
  const gr = shade.createLinearGradient(0, 0, 0, 110);
  gr.addColorStop(0, 'rgba(255,255,255,0.1)');
  gr.addColorStop(1, 'rgba(255,255,255,0.95)');
  shade.fillStyle = gr;
  shade.fillRect(-10, -5, w + 20, 130);
  shade.restore();
  ink.lineWidth = 5;
  ink.stroke(p);
  ink.fillRect(0, 9, w, 5);
  ink.save();
  ink.clip(p);
  flintBands(ink, 0, w, 30, 100, 30, seed, 3);
  ink.restore();
  hl.globalAlpha = 0.8;
  hl.fillRect(0, 14, w, 3);
  turfTop(turf, -8, w + 8, seed);
  blades(turf, -4, w + 4, seed);
  ink.fillRect(-6, -5, w + 12, 3);
  tl.fillRect(0, -3, w, 2);
  platBakes.set(key, b);
  return b;
}

function crateBake(w: number, h: number): TintBake {
  const key = `crate:${Math.round(w)}x${Math.round(h)}`;
  let b = platBakes.get(key);
  if (b) return b;
  b = new TintBake(w + 8, h + 8, 5);
  const body = b.ch(0);
  const dark = b.ch(1);
  const ink = b.ch(2);
  const hi = b.ch(3);
  const iron = b.ch(4);
  for (const c of [body, dark, ink, hi, iron]) c.translate(4, 4);
  const cw = Math.min(w, h, 110);
  for (let y = h - cw; y > -cw / 2; y -= cw) {
    for (let x = 0; x < w - 1; x += cw) {
      const bw = Math.min(cw, w - x);
      const bh = Math.min(cw, y + cw);
      const yy = Math.max(0, y);
      body.fillRect(x, yy, bw, bh);
      dark.globalAlpha = 0.5;
      dark.fillRect(x + 8, yy + 8, bw - 16, bh - 16);
      dark.globalAlpha = 1;
      // cross plank
      body.save();
      body.beginPath();
      body.rect(x, yy, bw, bh);
      body.clip();
      body.lineWidth = 12;
      body.beginPath();
      body.moveTo(x + 6, yy + bh - 6);
      body.lineTo(x + bw - 6, yy + 6);
      body.stroke();
      body.restore();
      ink.lineWidth = 4;
      ink.strokeRect(x, yy, bw, bh);
      ink.lineWidth = 2;
      ink.strokeRect(x + 8, yy + 8, bw - 16, bh - 16);
      hi.globalAlpha = 0.8;
      hi.fillRect(x + 2, yy + 2, bw - 4, 3);
      hi.globalAlpha = 1;
      iron.beginPath();
      for (const [ix, iy] of [
        [x + 4, yy + 4],
        [x + bw - 4, yy + 4],
        [x + 4, yy + bh - 4],
        [x + bw - 4, yy + bh - 4],
      ])
        iron.rect(ix - 2.5, iy - 2.5, 5, 5);
      iron.fill();
    }
  }
  platBakes.set(key, b);
  return b;
}

export function drawPlatform(g: Ctx, rect: Rect, style: PlatformStyle): void {
  const L = style.light;
  if ((style.type ?? 'ledge') === 'crate') {
    const b = crateBake(rect.w, rect.h);
    b.compose([
      css(lit(L, RGBP.wood, 0.95)),
      css(lit(L, RGBP.woodDark, 0.45)),
      INK,
      css(mix(lit(L, hex(PAL.woodLight), 1.05), L.rim, 0.25 * L.rimAmt)),
      css(lit(L, hex('#6E6A66'), 0.8)),
    ]);
    g.drawImage(b.out, rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8);
    return;
  }
  const b = ledgeBake(rect.w, style.seed ?? 0);
  b.compose(groundColours('chalk', L, style.version).cols);
  g.drawImage(b.out, rect.x - 20, rect.y - 24, rect.w + 40, 150);
}

/** Pre-build ground/boardwalk bakes (avoid first-use hitches). */
export function warmTerrain(): void {
  bakesFor('chalk', 0);
  bakesFor('cave', 0);
  boardwalkBake();
}
