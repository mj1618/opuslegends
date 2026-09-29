/**
 * SPEED (iteration 6, review iter5 fix 7): the run is ~1,000 px/s and now it LOOKS it.
 *
 *   FOREGROUND WHIP  one prop type per scene at parallax 1.6 (bar stools, lamp-post bases + hydrants, fire-escape rails,
 *                    ball returns, velvet-rope stanchions, parapet railings, chair backs ...), dark silhouettes with a
 *                    trailing smear, spaced 2 beats apart in layer space so one whips past about every kick. They live in
 *                    two bands only — rising from the bottom edge to just under the floor line, or hanging from the top
 *                    edge to well above the hero — so they NEVER cover the lane.
 *   SPEED LINES      at full running speed: faint cream streaks racing left in the top and bottom margins, thicker in a
 *                    chorus and during the catch-up surge.
 *
 * Screen space, drawn after the scenes' own front layers, inside the film. Deterministic in the camera position.
 */
import type { BeatInfo } from '../art/core/beat';
import { hash } from '../art/core/math';
import type { Lighting } from '../art/world/lighting';
import { drawGlow } from '../art/core/draw';
import { type JammerColours, type MusicianKind, type MusicianTiming, drawMusician } from '../art/grindhouse/jammers';
import { VIEW_H, VIEW_W } from '../engine/display';
import { LANE, kindFor } from './band';
import type { MusicFeed } from './music';

const F = 1.6;

type PropKind = 'stool' | 'post' | 'rail' | 'stanchion' | 'chair' | 'lamp' | 'hanger' | 'girder' | 'frame' | 'swag' | 'pinsetter';

/** per environment: bottom props, top props (empty = none: act 2's climb has threats from above) */
const PROPS: Record<string, { bottom: PropKind[]; top: PropKind[] }> = {
  street: { bottom: ['post', 'post', 'rail'], top: ['frame'] },
  bar: { bottom: ['stool', 'stool', 'chair'], top: ['lamp', 'girder'] },
  facade: { bottom: ['rail'], top: [] },
  lanes: { bottom: ['stanchion', 'chair'], top: ['hanger'] },
  poolroom: { bottom: ['chair', 'stool'], top: ['lamp'] },
  casino: { bottom: ['stanchion', 'chair'], top: ['swag'] },
  roof: { bottom: ['rail', 'post'], top: [] },
  penthouse: { bottom: ['stanchion'], top: ['swag'] },
  theatre: { bottom: [], top: [] },
};

export interface SpeedView {
  /** camera world x (render), zoom */
  camX: number;
  zoom: number;
  /** the play band on screen: the floor line under the hero, the hero's head */
  groundSy: number;
  heroSy: number;
  env: string;
  L: Lighting;
  /** world px per beat (spacing: one prop per 2 beats) */
  ppb: number;
  /** 0..1 how fast the hero runs (1 = full music speed) */
  speedK: number;
  /** 0..1 the catch-up surge / chorus boost for the lines */
  boost: number;
}

export function drawSpeedLayer(g: CanvasRenderingContext2D, v: SpeedView, b: BeatInfo, fg?: ForegroundBand): void {
  const P = PROPS[v.env];
  const botTop = Math.max(v.groundSy + 46 * v.zoom, VIEW_H * 0.72);
  const topBot = Math.min(v.heroSy - 330 * v.zoom, VIEW_H * 0.2);
  // (iteration 7, review iter6 fix 8: the whip was too timid to register) — the layer is laid out one slot per BEAT;
  // at a cruise about a third of the slots hold a prop, in a sprint (chorus / surge / launch: `boost`) up to 80 %, and
  // the props come CLOSER (bigger) — slots fade in and out with the boost, so nothing pops
  const boost = Math.max(0, Math.min(1, v.boost));
  if (P && (P.bottom.length || P.top.length)) {
    const SP = v.ppb * F;
    const cx = v.camX * F;
    const z = v.zoom;
    const hw = VIEW_W / 2 / z + 400;
    const ink = `rgb(${Math.round(8 + v.L.haze[0] * 0.05)},${Math.round(6 + v.L.haze[1] * 0.04)},${Math.round(8 + v.L.haze[2] * 0.05)})`;
    // (a dark prop on the dark apron under the floor vanished: a hot rim on its top edge + rim-lit motion streaks)
    const rim = `rgba(${Math.round(120 + v.L.rim[0] * 0.53)},${Math.round(110 + v.L.rim[1] * 0.53)},${Math.round(90 + v.L.rim[2] * 0.55)},0.85)`;
    const rimSoft = `rgba(${v.L.rim[0]},${v.L.rim[1]},${v.L.rim[2]},0.28)`;
    const keep = 0.66 - 0.46 * boost;
    // one unit streak gradient per frame (scaled per prop)
    const streak = g.createLinearGradient(0, 0, 1, 0);
    streak.addColorStop(0, rimSoft);
    streak.addColorStop(1, 'rgba(8,6,8,0)');
    const near = 1.3 + 0.3 * boost;
    for (let k = Math.floor((cx - hw) / SP); k <= Math.floor((cx + hw) / SP); k++) {
      const r = hash(k * 7 + 3);
      if (r < keep - 0.12) continue;
      const fade = Math.min(1, (r - (keep - 0.12)) / 0.12);
      const lx = k * SP + hash(k) * SP * 0.3;
      const sx = VIEW_W / 2 + (lx - cx) * z;
      if (sx < -320 || sx > VIEW_W + 320) continue;
      // a foreground musician owns its slot's neighbourhood
      if (fg && Math.abs(sx - fg.sx) < 260) continue;
      const topSide = P.top.length > 0 && (P.bottom.length === 0 || hash(k * 3 + 1) < 0.35);
      const list = topSide ? P.top : P.bottom;
      const kind = list[Math.floor(hash(k * 5 + 2) * list.length)];
      const sc = z * near * (0.9 + 0.25 * hash(k * 11 + 4));
      const y = topSide ? topBot : botTop + 20 * (1 - hash(k * 13));
      // MOTION BLUR: a smear streak trailing to the right (the prop moves left) + two ghosts
      const smear = (34 + 40 * boost) * v.speedK * z;
      if (v.speedK > 0.3) {
        const sl = smear * 7;
        const gy0 = topSide ? Math.max(0, y - 90 * sc) : y;
        const gy1 = topSide ? y : Math.min(VIEW_H, y + 150 * sc);
        g.globalAlpha = 0.5 * fade * v.speedK;
        g.fillStyle = streak;
        g.save();
        g.translate(sx, gy0);
        g.scale(sl, gy1 - gy0);
        g.fillRect(0, 0, 1, 1);
        g.restore();
      }
      for (let gh = 2; gh >= 0; gh--) {
        g.globalAlpha = fade * (gh === 0 ? 1 : 0.34 / gh);
        drawProp(g, kind, sx + gh * smear, y, sc, ink, gh === 0 ? rim : null, topSide);
      }
    }
    g.globalAlpha = 1;
  }
  if (fg) drawForegroundMusician(g, fg, botTop, v.zoom, b);
  // speed lines in the margins at full speed (and always in a sprint)
  const lk = Math.max(0, (v.speedK - 0.85) / 0.15) * (0.55 + 0.45 * boost);
  if (lk > 0.02) {
    g.save();
    g.fillStyle = 'rgba(255,246,232,1)';
    const t = b.time;
    const n = 14 + Math.round(10 * boost);
    for (let i = 0; i < n; i++) {
      const band = i % 2 ? VIEW_H * (0.04 + 0.16 * hash(i + 1)) : VIEW_H * (0.8 + 0.14 * hash(i + 2));
      const sp = 2600 + hash(i + 3) * 2200;
      const len = 220 + hash(i + 4) * 420;
      const x = VIEW_W + 300 - ((t * sp + hash(i + 5) * 4000) % (VIEW_W + 1000));
      const w = 2 + hash(i + 6) * 4;
      g.globalAlpha = lk * (0.12 + 0.16 * hash(i + 7));
      g.beginPath();
      g.moveTo(x, band);
      g.lineTo(x + len, band - w / 2);
      g.lineTo(x + len, band + w / 2);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
}

/**
 * THE FOREGROUND MUSICIAN (iteration 7, review iter6 fix 8 — "enemies you can SEE play"): one big goon per scene stretch
 * in the bottom foreground band (parallax 1.25, rising from the frame's bottom edge to just under the floor line: never
 * over the lane), playing the part you hear on its own lane — the cowbell clanks on every cowbell hit, the stomper's
 * boot slams on the stomps, the sax blows through the hooks, the pianist pounds the piano accents. A dark silhouette with
 * a hot rim and a cream pop behind the instrument on each hit. Positioned by `foregroundMusician()`.
 */
export interface ForegroundBand {
  sx: number;
  kind: MusicianKind;
  dir: 1 | -1;
  timing: MusicianTiming;
  /** the scene's rim light */
  rim: readonly [number, number, number];
  alpha: number;
}

const FG = 1.25;
const VEST_FG: Record<MusicianKind, string> = { cowbell: '#2F5A60', stomp: '#6A2E58', piano: '#6E4A30', sax: '#7A6A40' };
/** beats of layer space between foreground musicians (≈ one per 6 bars of run) */
const FG_EVERY = 24;
const NO_FG = new Set(['theatre', 'penthouse']);

/** the foreground musician in view (or null): slot per FG_EVERY beats of layer space, kind from the part that plays there */
export function foregroundMusician(
  camX: number,
  zoom: number,
  ppb: number,
  env: string,
  feed: MusicFeed,
  b: BeatInfo,
  L: Lighting,
  playing: boolean,
  /** world x → is there floor (not a pit) there? He fades back where a lethal pit passes behind him */
  solidAt: (x: number) => boolean = () => true,
): ForegroundBand | null {
  if (NO_FG.has(env)) return null;
  const SP = FG_EVERY * ppb * FG;
  const cx = camX * FG;
  const k = Math.round(cx / SP);
  const lx = k * SP + SP * 0.1;
  const sx = VIEW_W / 2 + (lx - cx) * zoom;
  if (sx < -300 || sx > VIEW_W + 300) return null;
  // the beat the hero passes him (the camera centre crosses him, lead ~0.28 screen)
  const pass = (lx / FG - (0.28 * VIEW_W) / zoom) / ppb;
  const kind: MusicianKind = kindFor(feed, pass, k * 5 + 1) ?? 'stomp';
  const t = feed.lane(LANE[kind]);
  const timing: MusicianTiming = playing
    ? { hit: Number.isFinite(t.since) ? Math.exp(-(t.since * b.spb) / 0.12) : 0, since: t.since, gap: t.gap, active: t.active }
    : { hit: 0, since: 99, gap: 99, active: 0 };
  // never hide a pit's danger read: fade toward 0.3 as a gap passes behind his head (sampled across his width)
  const wx = camX + (sx - VIEW_W / 2) / zoom;
  let open = 0;
  for (let i = -3; i <= 3; i++) if (!solidAt(wx + (i * 90) / zoom)) open++;
  return { sx, kind, dir: sx > VIEW_W / 2 ? -1 : 1, timing, rim: L.rim, alpha: 1 - 0.7 * Math.min(1, open / 2) };
}

function drawForegroundMusician(g: CanvasRenderingContext2D, f: ForegroundBand, botTop: number, zoom: number, b: BeatInfo): void {
  const s = 1.85 * Math.max(0.8, zoom);
  // his head sits just under the floor line; the feet are far below the frame
  const headTop = botTop + 10;
  const feet = headTop + 205 * s;
  if (VIEW_H - headTop < 110) return;
  const m = f.timing;
  g.save();
  g.globalAlpha = f.alpha;
  const pop = f.kind === 'sax' ? m.active * (0.5 + 0.5 * Math.exp(-(((b.beatPhase * 2) % 1) * 4))) : m.hit;
  const ix = f.kind === 'piano' ? 60 : f.kind === 'stomp' ? 14 : 36;
  const iy = f.kind === 'stomp' ? -10 : f.kind === 'piano' ? -110 : -150;
  // the pop behind the instrument (cream: the part lights up when it plays)
  if (pop > 0.03) drawGlow(g, f.sx + ix * f.dir * s, feet + iy * s, '#FFE9C4', 170 * s, 0.55 * pop);
  const [r, gg, bb] = f.rim;
  // a footlight from below the frame: he reads as a lit player on the dark apron, not a hole in the picture
  drawGlow(g, f.sx, headTop + 120 * s, `rgb(${Math.round(150 + r * 0.4)},${Math.round(110 + gg * 0.4)},${Math.round(80 + bb * 0.4)})`, 240 * s, 0.22 + 0.2 * pop);
  const C: JammerColours = {
    body: '#2E2228',
    skin: '#7A5646',
    vest: VEST_FG[f.kind],
    rim: `rgb(${Math.round(170 + r * 0.33)},${Math.round(150 + gg * 0.36)},${Math.round(120 + bb * 0.4)})`,
  };
  drawMusician(g, f.sx, feet, s, f.kind, m, b, C, f.dir);
  g.restore();
}

/** one foreground silhouette. (x, y) = the band edge it grows from (bottom props: y = its top line; top: its bottom) */
function drawProp(g: CanvasRenderingContext2D, kind: PropKind, x: number, y: number, s: number, ink: string, rim: string | null, top: boolean): void {
  g.fillStyle = ink;
  g.strokeStyle = ink;
  g.lineCap = 'round';
  const B = VIEW_H + 20;
  switch (kind) {
    case 'stool': {
      // a bar stool: round seat at y, a pole, a foot ring, a flared base below the frame
      g.beginPath();
      g.ellipse(x, y + 14 * s, 46 * s, 14 * s, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x - 7 * s, y + 14 * s, 14 * s, B - y);
      g.lineWidth = 7 * s;
      g.beginPath();
      g.ellipse(x, y + 110 * s, 34 * s, 8 * s, 0, 0, Math.PI * 2);
      g.stroke();
      if (rim) {
        g.strokeStyle = rim;
        g.lineWidth = 6;
        g.beginPath();
        g.ellipse(x, y + 10 * s, 44 * s, 11 * s, 0, Math.PI * 1.05, Math.PI * 1.7);
        g.stroke();
      }
      break;
    }
    case 'chair': {
      // a chair back (spindles) rising into view
      g.fillRect(x - 40 * s, y + 10 * s, 80 * s, 16 * s);
      g.lineWidth = 9 * s;
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        const cx = x - 30 * s + i * 20 * s;
        g.moveTo(cx, y + 20 * s);
        g.lineTo(cx, B);
      }
      g.stroke();
      if (rim) {
        g.fillStyle = rim;
        g.fillRect(x - 40 * s, y + 10 * s, 80 * s, 5);
      }
      break;
    }
    case 'post': {
      // a lamp-post base / hydrant: a fluted column foot
      g.beginPath();
      g.moveTo(x - 30 * s, B);
      g.lineTo(x - 20 * s, y + 60 * s);
      g.lineTo(x - 14 * s, y);
      g.lineTo(x + 14 * s, y);
      g.lineTo(x + 20 * s, y + 60 * s);
      g.lineTo(x + 30 * s, B);
      g.closePath();
      g.fill();
      g.fillRect(x - 26 * s, y + 50 * s, 52 * s, 12 * s);
      if (rim) {
        g.fillStyle = rim;
        g.fillRect(x - 14 * s, y, 5, 60 * s);
        g.fillRect(x - 26 * s, y + 50 * s, 52 * s, 4);
      }
      break;
    }
    case 'rail': {
      // an iron railing panel: top rail + balusters
      g.fillRect(x - 110 * s, y + 8 * s, 220 * s, 10 * s);
      g.lineWidth = 5 * s;
      g.beginPath();
      for (let i = 0; i <= 8; i++) {
        const cx = x - 110 * s + i * 27.5 * s;
        g.moveTo(cx, y + 12 * s);
        g.lineTo(cx, B);
      }
      g.stroke();
      if (rim) {
        g.fillStyle = rim;
        g.fillRect(x - 110 * s, y + 8 * s, 220 * s, 5);
      }
      break;
    }
    case 'stanchion': {
      // velvet-rope stanchion: a ball-topped post with a drooping rope
      g.beginPath();
      g.arc(x, y + 8 * s, 12 * s, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x - 6 * s, y + 14 * s, 12 * s, B - y);
      g.lineWidth = 11 * s;
      g.beginPath();
      g.moveTo(x, y + 30 * s);
      g.quadraticCurveTo(x - 120 * s, y + 110 * s, x - 240 * s, y + 30 * s);
      g.stroke();
      if (rim) {
        g.strokeStyle = rim;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(x, y + 8 * s, 12 * s, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
      break;
    }
    case 'pinsetter': {
      // a ball-return hood
      g.beginPath();
      g.moveTo(x - 90 * s, B);
      g.lineTo(x - 80 * s, y + 30 * s);
      g.quadraticCurveTo(x, y - 10 * s, x + 80 * s, y + 30 * s);
      g.lineTo(x + 90 * s, B);
      g.closePath();
      g.fill();
      if (rim) {
        g.strokeStyle = rim;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x - 80 * s, y + 30 * s);
        g.quadraticCurveTo(x, y - 10 * s, x + 80 * s, y + 30 * s);
        g.stroke();
      }
      break;
    }
    case 'lamp': {
      // a hanging lamp: cord from the top edge, a wide shade
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, -20);
      g.lineTo(x, y - 40 * s);
      g.stroke();
      g.beginPath();
      g.moveTo(x - 70 * s, y);
      g.quadraticCurveTo(x, y - 60 * s, x + 70 * s, y);
      g.closePath();
      g.fill();
      break;
    }
    case 'hanger': {
      // a lane monitor on a bracket
      g.fillRect(x - 4 * s, -20, 8 * s, y - 60 * s + 20);
      g.fillRect(x - 70 * s, y - 64 * s, 140 * s, 64 * s);
      if (rim) {
        g.fillStyle = rim;
        g.fillRect(x - 70 * s, y - 3, 140 * s, 4);
      }
      break;
    }
    case 'girder': {
      // a ceiling beam end
      g.fillRect(x - 60 * s, -20, 120 * s, y + 20);
      g.fillRect(x - 80 * s, y - 16 * s, 160 * s, 16 * s);
      break;
    }
    case 'frame': {
      // a shop sign bracket / awning edge hanging from the top
      g.fillRect(x - 6 * s, -20, 12 * s, y + 20);
      g.beginPath();
      g.moveTo(x - 140 * s, y - 50 * s);
      g.lineTo(x + 140 * s, y - 50 * s);
      g.lineTo(x + 120 * s, y);
      g.lineTo(x - 120 * s, y);
      g.closePath();
      g.fill();
      break;
    }
    case 'swag': {
      // a velvet valance swag from the top edge
      g.beginPath();
      g.moveTo(x - 220 * s, -20);
      g.lineTo(x + 220 * s, -20);
      g.lineTo(x + 220 * s, y - 60 * s);
      g.quadraticCurveTo(x, y + 20 * s, x - 220 * s, y - 60 * s);
      g.closePath();
      g.fill();
      break;
    }
  }
  void top;
}
