/**
 * JAMMING GOONS (review iter2 fix 8, Rayman's "jamming band"): harmless goons who DANCE on the backbeat.
 * They are pure scenery — never danger red, never gold — so the world grooves with you: bounce on every
 * beat, and the BIG move lands on the backbeat (2 & 4). Five moves, picked per goon:
 *
 *   0 clap      hands overhead, CLAP on 2 & 4
 *   1 point     disco point to the sky on 2 & 4, down on 1 & 3, hips sway on the swung "and"
 *   2 twist     twist-squat on every beat, arms pump, deepest on the backbeat
 *   3 guitar    air-guitar on a pool cue, headbang on the 8ths, windmill on the backbeat
 *   4 shimmy    shoulder shimmy + a hat tip on the backbeat
 *
 *   drawJammer(g, x, y, s, move, beat, beatPhase, snareHit, colours)   origin = feet centre, ~150 px tall at s=1
 *   JAMMER  (ActorKind for LifeLayer: pinned in the scenes, lit + hazed by depth)
 */
import type { BeatInfo } from '../core/beat';
import { hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex, mix } from '../core/color';
import { TAU } from '../core/math';
import type { ActorKind } from '../life/life';
import { lit } from '../world/lighting';

export interface JammerColours {
  body: string;
  vest: string;
  skin: string;
  rim: string;
}

const VESTS = ['#5E2B4E', '#3E5A5E', '#6B4A34', '#4A4A5A', '#2F5A3A'];

/**
 * One dancing goon. `b` drives the groove: the move peaks on the backbeat (beats 2 & 4 of the bar).
 * Cheap: ~12 path ops.
 */
export function drawJammer(g: Ctx, x: number, y: number, s: number, move: number, b: BeatInfo, C: JammerColours, dir = 1): void {
  const ph = b.beatPhase;
  const beatN = Math.floor(b.beat);
  const back = beatN % 2 === 1; // 2 & 4 (0-based 1 & 3)
  const e = Math.exp(-ph * 5); // snap on the beat
  const big = back ? e : 0;
  const bounce = Math.abs(Math.sin(Math.PI * b.beat)) * 6 + (back ? 4 * e : 0);
  const snare = hit(b, 'snare', 0.1);
  g.save();
  g.translate(x, y);
  g.scale(s * dir, s);
  const m = move % 5;
  const squat = m === 2 ? 10 * e + (back ? 8 * e : 0) : 0;
  const bodyY = -bounce * 0.4 + squat;
  const twist = m === 2 ? (beatN % 2 ? 1 : -1) * 0.25 * (1 - ph) : m === 1 ? Math.sin(b.beat * Math.PI) * 0.12 : 0;
  // legs
  g.strokeStyle = C.body;
  g.lineCap = 'round';
  g.lineWidth = 13;
  g.beginPath();
  g.moveTo(-12, 0);
  g.lineTo(-10 - squat * 0.6, -36 + squat);
  g.lineTo(-8, -62 + bodyY);
  g.moveTo(12, 0);
  g.lineTo(10 + squat * 0.6, -36 + squat);
  g.lineTo(8, -62 + bodyY);
  g.stroke();
  // torso (round-shouldered goon), rotated for the twist
  g.save();
  g.translate(0, -62 + bodyY);
  g.rotate(twist);
  g.fillStyle = C.body;
  g.beginPath();
  g.moveTo(-20, 0);
  g.lineTo(20, 0);
  g.quadraticCurveTo(34, -52, 18, -66);
  g.quadraticCurveTo(0, -74, -18, -66);
  g.quadraticCurveTo(-34, -52, -20, 0);
  g.closePath();
  g.fill();
  g.fillStyle = C.vest;
  g.beginPath();
  g.moveTo(-17, -4);
  g.lineTo(-4, -4);
  g.lineTo(-6, -60);
  g.lineTo(-16, -58);
  g.closePath();
  g.moveTo(17, -4);
  g.lineTo(4, -4);
  g.lineTo(6, -60);
  g.lineTo(16, -58);
  g.closePath();
  g.fill();
  // head: bobs (headbang for the guitarist on the 8ths)
  const hb = m === 3 ? Math.abs(Math.sin(b.beat * Math.PI * 2)) * 7 : bounce * 0.3;
  g.fillStyle = C.skin;
  g.beginPath();
  g.arc(2, -82 + hb, 13, 0, TAU);
  g.fill();
  // flat cap (tipped on the backbeat by the shimmy goon)
  g.fillStyle = C.body;
  g.save();
  g.translate(2, -92 + hb);
  if (m === 4) g.rotate(-0.6 * big);
  g.beginPath();
  g.ellipse(0, 0, 15, 6, 0, Math.PI, 0);
  g.fill();
  g.fillRect(2, -2, 16, 4);
  g.restore();
  // arms
  g.strokeStyle = C.body;
  g.lineWidth = 10;
  g.beginPath();
  const sh = (sx: number) => [sx * 18, -56] as const;
  const arm = (sx: number, hx: number, hy: number, ex?: number, ey?: number) => {
    const [ax, ay] = sh(sx);
    g.moveTo(ax, ay);
    if (ex !== undefined && ey !== undefined) g.lineTo(ex, ey);
    g.lineTo(hx, hy);
  };
  if (m === 0) {
    // clap overhead on the backbeat, hands apart between
    const open = back ? 12 * (1 - e) + 2 : 22;
    arm(-1, -open, -120, -26, -86);
    arm(1, open, -120, 26, -86);
  } else if (m === 1) {
    // disco point: up on 2 & 4, down-across on 1 & 3
    if (back) arm(1, 34, -124, 26, -88);
    else arm(1, -26, -10, 24, -32);
    arm(-1, -26, -30, -30, -44);
  } else if (m === 2) {
    const pump = (beatN % 2 ? 1 : -1) * 16;
    arm(-1, -34, -46 + pump, -28, -40);
    arm(1, 34, -46 - pump, 28, -40);
  } else if (m === 3) {
    // air guitar on a cue: strum hand windmills on the backbeat
    const wa = back ? -Math.PI / 2 + (1 - e) * TAU * 0.75 : 0.9;
    arm(-1, -30, -40, -34, -50);
    arm(1, 22 + Math.cos(wa) * 26, -48 + Math.sin(wa) * 26);
  } else {
    // shimmy: shoulders pop alternately, hands low
    const pop = Math.sin(b.beat * Math.PI * 4) * 5;
    arm(-1, -26, -18 + pop, -28, -34);
    arm(1, 26, -18 - pop, 28, -34);
  }
  g.stroke();
  if (m === 3) {
    // the cue "guitar"
    g.strokeStyle = C.vest;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(-40, -52);
    g.lineTo(34, -28);
    g.stroke();
  }
  // a rim of scene light on the head + shoulders
  g.strokeStyle = C.rim;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(2, -82 + hb, 13, Math.PI * 1.05, Math.PI * 1.65);
  g.stroke();
  g.restore();
  g.restore();
  // clap spark on the backbeat
  if (m === 0 && back && e > 0.5 && snare > 0.3) {
    g.fillStyle = C.rim;
    g.globalAlpha *= e;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 3 : 11;
      g.lineTo(x + Math.cos((i / 8) * TAU) * r * s, y - (182 - bounce) * s + Math.sin((i / 8) * TAU) * r * s);
    }
    g.fill();
    g.globalAlpha = 1;
  }
}

/** LifeLayer kind: pinned jamming goons, lit and hazed by the scene */
export const JAMMER: ActorKind = {
  id: 'jammer',
  spawn(a, r) {
    a.a = Math.floor(r() * 1000);
  },
  draw(g, a, c) {
    const d = c.depth;
    const body = lit(c.L, hex('#2A2024'), 0.45, d);
    const C: JammerColours = {
      body: css(body),
      vest: css(lit(c.L, hex(VESTS[a.a % VESTS.length]), 0.6, d)),
      skin: css(lit(c.L, hex('#9A7462'), 0.6, d)),
      rim: css(mix(body, c.L.rim, 0.6), 0.85),
    };
    drawJammer(g, a.x, a.y, a.s, a.a, c.b, C, a.dir);
  },
};

// ============================================================================ THE GOON BAND (iteration 6)

/**
 * GOONS PLAY THE SONG (review iter5 fix 4, Castle Rock's enemy band): a goon ON an instrument, in sync with the record's
 * own lane for that part — the renderer feeds each one its lane's timing:
 *
 *   'cowbell'  bell held up in the left fist, a drumstick CLANKS it on every `cowbell` event (a spark + ring lines)
 *   'stomp'    the knee rises over the beat before, the boot SLAMS on every `stomps` event (dust + a shock ring)
 *   'piano'    at an upright honky-tonk piano: both hands high, then POUNDING the keys on every `piano` accent; the lid
 *              jumps and a note flies out
 *   'sax'      leans back and BLOWS through the song's `hooks` (bell up, puffs + notes on the phrase), sways otherwise
 *
 *   drawMusician(g, x, y, s, kind, m, b, C, dir)   feet centre, ~150 px tall at s = 1
 *   m = { hit: 1 on the event → 0 (seconds-decayed), since: beats since the last event (Infinity = none yet),
 *         gap: typical beats between events (the stomp's knee-lift anticipates it), active: 0..1 (sax: inside a hook) }
 * Pure scenery: never danger red, never reward gold (instruments are dusty brass / iron / walnut, lit by the scene).
 */
export type MusicianKind = 'cowbell' | 'stomp' | 'piano' | 'sax';

export interface MusicianTiming {
  hit: number;
  since: number;
  gap: number;
  active: number;
}

/** legs + torso + head + cap of a goon (no arms). Returns the shoulder y (local). */
function goonTrunk(g: Ctx, C: JammerColours, bodyY: number, lean: number, knee = 0, stance = 12): number {
  g.strokeStyle = C.body;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 13;
  g.beginPath();
  g.moveTo(-stance, 0);
  g.lineTo(-stance + 2, -36);
  g.lineTo(-8, -62 + bodyY);
  // the (maybe raised) right leg: knee up to `knee` (0..1)
  g.moveTo(stance + 6 * knee, -54 * knee);
  g.lineTo(stance + 20 * knee, -36 - 30 * knee);
  g.lineTo(8, -62 + bodyY);
  g.stroke();
  // boots
  g.fillStyle = C.body;
  g.fillRect(-stance - 10, -7, 22, 9);
  g.fillRect(stance - 4 + 6 * knee, -8 - 54 * knee, 24, 9);
  g.save();
  g.translate(0, -62 + bodyY);
  g.rotate(lean);
  g.fillStyle = C.body;
  g.beginPath();
  g.moveTo(-20, 0);
  g.lineTo(20, 0);
  g.quadraticCurveTo(34, -52, 18, -66);
  g.quadraticCurveTo(0, -74, -18, -66);
  g.quadraticCurveTo(-34, -52, -20, 0);
  g.closePath();
  g.fill();
  g.fillStyle = C.vest;
  g.beginPath();
  g.moveTo(-17, -4);
  g.lineTo(-4, -4);
  g.lineTo(-6, -60);
  g.lineTo(-16, -58);
  g.closePath();
  g.moveTo(17, -4);
  g.lineTo(4, -4);
  g.lineTo(6, -60);
  g.lineTo(16, -58);
  g.closePath();
  g.fill();
  g.fillStyle = C.skin;
  g.beginPath();
  g.arc(2, -82, 13, 0, TAU);
  g.fill();
  g.fillStyle = C.body;
  g.beginPath();
  g.ellipse(2, -92, 15, 6, 0, Math.PI, 0);
  g.fill();
  g.fillRect(4, -94, 16, 4);
  g.strokeStyle = C.rim;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(2, -82, 13, Math.PI * 1.05, Math.PI * 1.65);
  g.stroke();
  g.restore();
  return -62 + bodyY - 56;
}

export function drawMusician(g: Ctx, x: number, y: number, s: number, kind: MusicianKind, m: MusicianTiming, b: BeatInfo, C: JammerColours, dir = 1): void {
  const h = Math.max(0, Math.min(1, m.hit));
  g.save();
  g.translate(x, y);
  g.scale(s * dir, s);
  const bob = Math.abs(Math.sin(Math.PI * b.beat)) * 3;
  const iron = C.body;
  const brass = C.vest;
  if (kind === 'cowbell') {
    const sy = goonTrunk(g, C, -bob * 0.5 + 3 * h, -0.05 - 0.08 * h);
    // left arm up holding the bell out front, right arm with the stick: cocked up between hits, DOWN on the clank
    const bx = 30;
    const by = sy - 22;
    g.strokeStyle = C.body;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(-16, sy + 4);
    g.lineTo(6, sy - 6);
    g.lineTo(bx - 6, by + 4);
    g.stroke();
    // the bell (iron, a dull rim)
    g.fillStyle = iron;
    g.beginPath();
    g.moveTo(bx - 8, by - 12);
    g.lineTo(bx + 8, by - 12);
    g.lineTo(bx + 16, by + 16);
    g.lineTo(bx - 16, by + 16);
    g.closePath();
    g.fill();
    g.strokeStyle = C.rim;
    g.lineWidth = 2;
    g.stroke();
    // stick arm: angle from cocked (-1.9 rad) to striking (-0.2) — snaps down on the hit, winds back up after
    const up = Math.min(1, (m.since * 1.7) ** 0.7);
    const ang = -0.25 - 1.5 * (Number.isFinite(m.since) ? up : 0.6);
    const shx = 16;
    const shy = sy + 2;
    const ex = shx + Math.cos(ang) * 26;
    const ey = shy + Math.sin(ang) * 26;
    g.strokeStyle = C.body;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(shx, shy);
    g.lineTo(ex, ey);
    g.stroke();
    g.strokeStyle = C.rim;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(ex, ey);
    g.lineTo(ex + Math.cos(ang + 0.9) * 34, ey + Math.sin(ang + 0.9) * 34);
    g.stroke();
    if (h > 0.2) {
      // the CLANK: ring lines off the bell
      g.strokeStyle = C.rim;
      g.lineWidth = 3;
      g.globalAlpha *= h;
      for (let i = 0; i < 5; i++) {
        const a = -0.9 + i * 0.45;
        g.beginPath();
        g.moveTo(bx + 20 + Math.cos(a) * 8, by + Math.sin(a) * 8);
        g.lineTo(bx + 20 + Math.cos(a) * (18 + 16 * h), by + Math.sin(a) * (18 + 16 * h));
        g.stroke();
      }
    }
  } else if (kind === 'stomp') {
    // the knee rises through the last ~0.8 of the gap, the boot SLAMS on the event
    const gap = Math.max(0.5, m.gap);
    const u = Number.isFinite(m.since) ? Math.max(0, Math.min(1, (m.since - gap * 0.25) / (gap * 0.7))) : 0.3;
    const knee = h > 0.3 ? 0 : u * u * (3 - 2 * u);
    const sy = goonTrunk(g, C, 6 * h - knee * 6, -0.1 + 0.18 * knee - 0.1 * h, knee, 14);
    // arms: pumped up with the knee, thrown down on the stomp
    g.strokeStyle = C.body;
    g.lineWidth = 10;
    g.beginPath();
    for (const sd of [-1, 1]) {
      g.moveTo(sd * 18, sy + 6);
      g.lineTo(sd * 32, sy + 26 - 30 * knee + 12 * h);
      g.lineTo(sd * (30 + 6 * knee), sy - 4 - 36 * knee + 40 * h);
    }
    g.stroke();
    if (h > 0.05) {
      g.strokeStyle = C.rim;
      g.lineWidth = 3;
      g.globalAlpha *= h;
      g.beginPath();
      g.ellipse(14, 2, 30 + 40 * (1 - h), 7 + 4 * (1 - h), 0, 0, TAU);
      g.stroke();
      g.fillStyle = C.rim;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc(14 + (i - 1.5) * 18 * (1.4 - h), -8 - (1 - h) * 18, 5 + 5 * (1 - h), 0, TAU);
        g.fill();
      }
    }
  } else if (kind === 'piano') {
    // the upright piano (walnut, a dull cream key strip), the goon on a stool facing it (his back three-quarter to us)
    const lid = h * 8;
    g.fillStyle = C.body;
    g.fillRect(8, -118 - lid * 0.3, 96, 118 + lid * 0.3);
    g.fillStyle = brass;
    g.fillRect(14, -110, 84, 40);
    g.fillStyle = C.rim;
    g.fillRect(2, -62, 108, 7);
    g.fillStyle = C.body;
    g.fillRect(4, -128 - lid, 104, 10);
    g.fillRect(12, -20, 8, 20);
    g.fillRect(92, -20, 8, 20);
    // stool
    g.fillRect(-40, -44, 34, 6);
    g.fillRect(-26, -40, 6, 40);
    // the goon, seated: torso leaning into the keys, pounding on the accent
    g.save();
    g.translate(-22, 18);
    const sy = goonTrunk(g, C, 18 + 4 * h, 0.22 + 0.12 * h, 0, 10);
    g.restore();
    const hy = h > 0.15 ? -62 : -62 - 30 * Math.min(1, Number.isFinite(m.since) ? m.since * 2 : 0.4);
    g.strokeStyle = C.body;
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(-14, sy + 26);
    g.lineTo(0, hy - 14);
    g.lineTo(18, hy - 2);
    g.moveTo(-26, sy + 28);
    g.lineTo(-6, hy - 8);
    g.lineTo(30, hy + 2);
    g.stroke();
    if (h > 0.1) {
      // a note flies out of the top
      g.globalAlpha *= h;
      g.fillStyle = C.rim;
      const nx = 70 + (1 - h) * 30;
      const ny = -150 - (1 - h) * 50;
      g.beginPath();
      g.ellipse(nx, ny, 8, 6, -0.4, 0, TAU);
      g.fill();
      g.fillRect(nx + 6, ny - 30, 3, 30);
      g.fillRect(nx + 6, ny - 30, 12, 4);
    }
  } else {
    // SAX: leans back and blows through the hook; sways on the half-bar between
    const a = Math.max(0, Math.min(1, m.active));
    const sway = Math.sin(b.beat * Math.PI * 0.5) * 0.08 * (1 - a);
    const sy = goonTrunk(g, C, -bob * 0.4, -0.16 * a + sway + 0.04 * h);
    g.save();
    g.translate(4, sy + 30);
    g.rotate(-0.5 * a + sway);
    // the horn: a curved dusty-brass body, the bell forward/up
    g.strokeStyle = brass;
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, -40);
    g.quadraticCurveTo(10, 10, 26, 16);
    g.quadraticCurveTo(38, 18, 40, 0);
    g.stroke();
    g.fillStyle = brass;
    g.beginPath();
    g.ellipse(42, -6, 9, 13, 0.3, 0, TAU);
    g.fill();
    g.strokeStyle = C.rim;
    g.lineWidth = 2;
    g.stroke();
    // hands on the keys
    g.strokeStyle = C.body;
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(-14, -26);
    g.lineTo(8, -4 + 4 * Math.sin(b.beat * TAU * 2) * a);
    g.moveTo(16, -30);
    g.lineTo(18, 8 - 4 * Math.sin(b.beat * TAU * 2) * a);
    g.stroke();
    if (a > 0.05) {
      // puffs + notes out of the bell on the 8ths
      g.globalAlpha *= a;
      g.fillStyle = C.rim;
      for (let i = 0; i < 3; i++) {
        const u = (b.beat * 2 + i / 3) % 1;
        g.beginPath();
        g.arc(52 + u * 50, -14 - u * 40 + Math.sin(u * 9 + i) * 6, 4 + 3 * u, 0, TAU);
        g.fill();
      }
    }
    g.restore();
  }
  g.restore();
}
