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
import { VIEW_H, VIEW_W } from '../engine/display';

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

export function drawSpeedLayer(g: CanvasRenderingContext2D, v: SpeedView, b: BeatInfo): void {
  const P = PROPS[v.env];
  if (P && (P.bottom.length || P.top.length)) {
    const SP = 2 * v.ppb * F;
    const cx = v.camX * F;
    const z = v.zoom;
    const hw = VIEW_W / 2 / z + 400;
    const ink = `rgb(${Math.round(8 + v.L.haze[0] * 0.05)},${Math.round(6 + v.L.haze[1] * 0.04)},${Math.round(8 + v.L.haze[2] * 0.05)})`;
    const rim = `rgba(${v.L.rim[0]},${v.L.rim[1]},${v.L.rim[2]},0.35)`;
    const botTop = Math.max(v.groundSy + 46 * z, VIEW_H * 0.72);
    const topBot = Math.min(v.heroSy - 330 * z, VIEW_H * 0.2);
    for (let k = Math.floor((cx - hw) / SP); k <= Math.floor((cx + hw) / SP); k++) {
      const r = hash(k * 7 + 3);
      if (r < 0.3) continue;
      const lx = k * SP + hash(k) * SP * 0.35;
      const sx = VIEW_W / 2 + (lx - cx) * z;
      if (sx < -300 || sx > VIEW_W + 300) continue;
      const topSide = P.top.length > 0 && (P.bottom.length === 0 || hash(k * 3 + 1) < 0.35);
      const list = topSide ? P.top : P.bottom;
      const kind = list[Math.floor(hash(k * 5 + 2) * list.length)];
      // the smear: ghosts trailing to the right (the prop moves left), fading
      const smear = 26 * v.speedK * z;
      for (let gh = 2; gh >= 0; gh--) {
        g.globalAlpha = gh === 0 ? 0.94 : 0.22 / gh;
        drawProp(g, kind, sx + gh * smear, topSide ? topBot : botTop, z * 1.25, ink, gh === 0 ? rim : null, topSide);
      }
    }
    g.globalAlpha = 1;
  }
  // speed lines in the margins at full speed
  const lk = Math.max(0, (v.speedK - 0.9) / 0.1) * (0.5 + 0.5 * v.boost);
  if (lk > 0.02) {
    g.save();
    g.fillStyle = 'rgba(255,246,232,1)';
    const t = b.time;
    for (let i = 0; i < 14; i++) {
      const band = i % 2 ? VIEW_H * (0.04 + 0.16 * hash(i + 1)) : VIEW_H * (0.8 + 0.14 * hash(i + 2));
      const sp = 2600 + hash(i + 3) * 2200;
      const len = 180 + hash(i + 4) * 320;
      const x = VIEW_W + 300 - ((t * sp + hash(i + 5) * 4000) % (VIEW_W + 900));
      const w = 2 + hash(i + 6) * 3;
      g.globalAlpha = lk * (0.07 + 0.1 * hash(i + 7));
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
        g.lineWidth = 3;
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
        g.fillRect(x - 40 * s, y + 10 * s, 80 * s, 3);
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
        g.fillRect(x - 14 * s, y, 3, 60 * s);
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
        g.fillRect(x - 110 * s, y + 8 * s, 220 * s, 2);
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
        g.fillRect(x - 70 * s, y - 2, 140 * s, 2);
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
