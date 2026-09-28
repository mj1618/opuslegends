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
