/**
 * ACT-2 MECHANIC SKINS (src/game/mech): thrown bottles + their windows, firebombs, rolling bowling balls, Big Jim's
 * first glint, the pre-chorus window crash. World space, a pure function of the world beat (rewind-safe).
 * DANGER LANGUAGE (entityDraw.ts header): the thrown bottle is LACQUER RED glass (a threat) until you bat it —
 * then it turns GOLD (reward); flames and bowling balls are stumble threats (ink + red points, no big glow).
 *
 * Telegraphs (DESIGN §4 rule 4: 1 beat audible + visual):
 *   bottle     1 beat before the throw a window lights and a goon leans out, arm cocked (art/grindhouse/facade
 *              drawThrowWindow); the flight shows a dashed red arc to the BAT POINT and a red crosshair that
 *              tightens onto its beat
 *   firebomb   same window + arc, a red ring on the floor where it bursts; then flames until they burn out
 *   ball       visible rolling in for ~2-3 beats: UV rumble trail, dust puffs (art/grindhouse/lanes drawRollingBall)
 */
import type { BeatInfo } from '../art/core/beat';
import { drawGlow, star4 } from '../art/core/draw';
import { TAU, hash } from '../art/core/math';
import { drawBigJimGlint, drawThrowWindow } from '../art/grindhouse/facade';
import { drawRollingBall } from '../art/grindhouse/lanes';
import { CF } from '../art/palette';
import type { Lighting } from '../art/world/lighting';
import { BALL, FIRE, type Mechanics } from '../game/mech';
import { bottleArc, bottleProgress } from '../game/mech/thrownBottle';
import { DANGER, REWARD } from './entityDraw';

const INK = '#1A1410';
const pt = { x: 0, y: 0 };

export function drawMech(g: CanvasRenderingContext2D, m: Mechanics, wb: number, x0: number, x1: number, clock: number, L?: Lighting, b?: BeatInfo): void {
  // ------------------------------------------------------------ the pre-chorus window crash (behind the entities)
  if (L && b) for (const c of m.setPieces) if (c.name === 'windowCrash' && wb > c.beat - 6 && wb < c.beat + 3) drawCrashWindow(g, c.x + 160, c.floorY, wb - c.beat, L, b, clock);
  // ------------------------------------------------------------ Big Jim's glint
  const glint = m.active('bigJimGlint', wb);
  if (glint && L && b) drawBigJimGlint(g, glint.cue.x, glint.cue.y, glint.k, L, b);
  // ------------------------------------------------------------ thrown bottles
  for (const bt of m.bottles) {
    if (bt.state === 'out' || bt.wx < x0 - 400 || Math.min(bt.tx, bt.x) > x1 + 500) continue;
    const k = bottleProgress(bt, wb);
    // the thrower's window: lights 1 beat before the throw (the tell), stays until the bottle lands
    if (wb > bt.from - 1 && wb < bt.beat + 0.6 && L && b) {
      const a = Math.min(1, (wb - (bt.from - 1)) * 3) * (wb > bt.beat ? Math.max(0, 1 - (wb - bt.beat) / 0.6) : 1);
      g.globalAlpha = a;
      drawThrowWindow(g, bt.wx, bt.wy, Math.max(0, Math.min(1, (wb - bt.from + 1) / 1.35)), L, b);
      g.globalAlpha = 1;
    }
    if (bt.state === 'idle' || bt.state === 'air') {
      if (wb < bt.from - 1) continue;
      const fire = bt.style === 'firebomb';
      // dashed red arc from the bottle (or the window) to the arrival point
      g.strokeStyle = DANGER.hot;
      g.lineWidth = 4;
      g.lineCap = 'round';
      for (let u = Math.max(0, k) + 0.04; u < 1; u += 0.07) {
        bottleArc(bt, bt.from + u * (bt.beat - bt.from), pt);
        const x = pt.x;
        const y = pt.y;
        bottleArc(bt, bt.from + Math.min(1, u + 0.03) * (bt.beat - bt.from), pt);
        g.globalAlpha = 0.25 + 0.55 * u;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(pt.x, pt.y);
        g.stroke();
      }
      g.globalAlpha = 1;
      // the target: a crosshair tightening on the bat point / a ring on the floor where it bursts
      const s = 1 - 0.7 * k;
      const onBeat = Math.max(0, 1 - Math.abs(wb - bt.beat) / 0.3);
      g.strokeStyle = DANGER.red;
      g.lineWidth = 4 + 2 * onBeat;
      if (!fire) {
        const r = 40 * s + 16;
        g.beginPath();
        g.arc(bt.tx, bt.ty, r, 0, TAU);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          g.moveTo(bt.tx + dx * (r - 10), bt.ty + dy * (r - 10));
          g.lineTo(bt.tx + dx * (r + 14), bt.ty + dy * (r + 14));
        }
        g.stroke();
        if (onBeat > 0.05) drawGlow(g, bt.tx, bt.ty, DANGER.hot, 60, 0.3 * onBeat);
      } else {
        g.beginPath();
        g.ellipse(bt.tx, bt.floorY - 3, FIRE.w * 1.6 * s + 20, 9, 0, 0, TAU);
        g.stroke();
      }
      if (bt.state === 'air') drawBottle(g, bt.x, bt.y, bt.rot, fire, clock, false);
      continue;
    }
    if (bt.state === 'batted') {
      // batted back up through the window: GOLD (it pays)
      const a = Math.max(0, 1 - bt.t / 0.9);
      g.globalAlpha = a;
      g.strokeStyle = REWARD.gold;
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(bt.x - bt.vx * 0.08, bt.y - bt.vy * 0.08);
      g.lineTo(bt.x, bt.y);
      g.stroke();
      drawBottle(g, bt.x, bt.y, bt.rot, false, clock, true);
      if (bt.t < 0.2) star4(g, bt.x, bt.y, 50 * (1 - bt.t / 0.2), 0, REWARD.shine);
      g.globalAlpha = 1;
      continue;
    }
    if (bt.state === 'smashed') {
      g.globalAlpha = Math.max(0, 1 - bt.t / 0.6);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI - Math.PI;
        const d = 20 + bt.t * 280;
        g.fillStyle = i % 2 ? DANGER.red : '#7A1A16';
        g.fillRect(bt.x + Math.cos(a) * d, bt.y + Math.sin(a) * d * 0.6 + bt.t * bt.t * 600, 9, 5);
      }
      g.globalAlpha = 1;
      continue;
    }
    if (bt.state === 'burning') drawFlames(g, bt.fire, Math.max(0, 1 - (wb - bt.beat) / FIRE.beats), clock);
  }
  // ------------------------------------------------------------ rolling bowling balls
  for (const bl of m.balls) {
    if (bl.state === 'idle' || bl.state === 'gone' || bl.x < x0 - 100 || bl.x > x1 + 100) continue;
    const r = BALL.r + 7;
    if (b) drawRollingBall(g, bl.x, bl.y, r, bl.rot, b);
    if (bl.state === 'rolling') {
      // dust puffs kicked up on the floor
      g.fillStyle = 'rgba(185,160,224,0.35)';
      for (let i = 0; i < 3; i++) {
        const ph = (clock * 3 + i / 3) % 1;
        g.beginPath();
        g.arc(bl.x + r + ph * 50, bl.y + r - 6 - ph * 12, 6 + ph * 8, 0, TAU);
        g.fill();
      }
    }
  }
}

function drawBottle(g: CanvasRenderingContext2D, x: number, y: number, rot: number, fire: boolean, clock: number, gold: boolean): void {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const body = gold ? REWARD.gold : DANGER.red;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(-5, -30);
  g.lineTo(5, -30);
  g.lineTo(6, -12);
  g.quadraticCurveTo(14, -8, 14, 2);
  g.lineTo(14, 24);
  g.lineTo(-14, 24);
  g.lineTo(-14, 2);
  g.quadraticCurveTo(-14, -8, -6, -12);
  g.closePath();
  g.lineWidth = 7;
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = body;
  g.fill();
  g.fillStyle = gold ? REWARD.shine : DANGER.hot;
  g.fillRect(-10, -6, 4, 26);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(-9, -4, 2, 20);
  if (fire) {
    // a burning rag in the neck
    const f = Math.sin(clock * 30) * 3;
    g.fillStyle = CF.cream;
    g.fillRect(-4, -38, 8, 9);
    g.beginPath();
    g.moveTo(-9, -36);
    g.quadraticCurveTo(-4 + f, -62, 0, -70);
    g.quadraticCurveTo(6 - f, -56, 9, -36);
    g.closePath();
    g.fillStyle = DANGER.hot;
    g.fill();
    g.beginPath();
    g.moveTo(-4, -37);
    g.quadraticCurveTo(0, -54, 4, -37);
    g.fillStyle = CF.bulb;
    g.fill();
  }
  g.restore();
  if (fire) drawGlow(g, x, y - 30, DANGER.hot, 50, 0.3);
}

function drawFlames(g: CanvasRenderingContext2D, f: { x: number; y: number; w: number; h: number }, life: number, clock: number): void {
  if (life <= 0) return;
  // stumble class: an ink puddle of broken glass + red flame POINTS licking up
  g.fillStyle = INK;
  g.beginPath();
  g.ellipse(f.x + f.w / 2, f.y + f.h - 2, f.w * 0.9, 7, 0, 0, TAU);
  g.fill();
  for (let i = 0; i < 5; i++) {
    const fx = f.x - 6 + (i + 0.5) * ((f.w + 12) / 5);
    const h = (f.h + 26) * life * (0.65 + 0.35 * Math.sin(clock * 22 + i * 1.7));
    const lean = Math.sin(clock * 9 + i) * 5;
    g.beginPath();
    g.moveTo(fx - 9, f.y + f.h - 4);
    g.quadraticCurveTo(fx - 6 + lean, f.y + f.h - h * 0.6, fx + lean, f.y + f.h - 4 - h);
    g.quadraticCurveTo(fx + 6 + lean, f.y + f.h - h * 0.6, fx + 9, f.y + f.h - 4);
    g.closePath();
    g.fillStyle = i % 2 ? DANGER.red : DANGER.hot;
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = INK;
    g.stroke();
  }
  drawGlow(g, f.x + f.w / 2, f.y + f.h / 2, DANGER.hot, 70, 0.25 * life);
  // embers
  g.fillStyle = CF.bulb;
  for (let i = 0; i < 5; i++) {
    const ph = (clock * 1.3 + hash(i)) % 1;
    g.globalAlpha = (1 - ph) * life;
    g.fillRect(f.x + hash(i + 3) * f.w, f.y + f.h - ph * 90, 3, 3);
  }
  g.globalAlpha = 1;
}

/**
 * The pre-chorus WINDOW CRASH: a tall lit window into the Blacklight Lanes stands on the ledge ahead; on the HEY
 * (d = 0) Slim's Heave smashes through it — the pane bursts into glass shards and UV light floods out.
 * d = beats since the cue.
 */
function drawCrashWindow(g: CanvasRenderingContext2D, x: number, floorY: number, d: number, L: Lighting, b: BeatInfo, clock: number): void {
  const w = 240;
  const h = 330;
  const top = floorY - h - 10;
  // frame (stone + dark sash)
  g.fillStyle = '#B8A890';
  g.fillRect(x - w / 2 - 18, top - 22, w + 36, 22);
  g.fillRect(x - w / 2 - 14, floorY - 10, w + 28, 12);
  g.fillStyle = '#2A1E16';
  g.fillRect(x - w / 2 - 8, top - 8, w + 16, h + 8);
  // inside: the Lanes' UV glow
  const gr = g.createLinearGradient(0, top, 0, top + h);
  gr.addColorStop(0, '#2A1650');
  gr.addColorStop(1, '#120C1E');
  g.fillStyle = gr;
  g.fillRect(x - w / 2, top, w, h);
  const pulse = 0.6 + 0.4 * Math.exp(-b.beatPhase * 4);
  drawGlow(g, x, top + h * 0.6, '#E04BD0', 220, 0.35 * pulse);
  drawGlow(g, x + 40, top + h * 0.3, '#3FF0E0', 160, 0.3 * pulse);
  if (d < 0) {
    // intact glass: reflections + mullions + a painted sign
    g.fillStyle = 'rgba(190,220,240,0.25)';
    g.beginPath();
    g.moveTo(x - w / 2 + 20, top + h);
    g.lineTo(x - 10, top);
    g.lineTo(x + 30, top);
    g.lineTo(x - w / 2 + 60, top + h);
    g.fill();
    g.fillStyle = '#2A1E16';
    g.fillRect(x - 4, top, 8, h);
    g.fillRect(x - w / 2, top + h * 0.45, w, 8);
    g.font = 'italic 40px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(63,240,224,0.8)';
    g.fillText('LANES', x, top + h * 0.28);
    return;
  }
  // SMASHED: shards flying out and down, UV light pouring through
  const k = Math.min(1, d / 1.5);
  drawGlow(g, x, top + h / 2, '#E04BD0', 320 * (1 + k), 0.45 * (1 - k * 0.5));
  for (let i = 0; i < 26; i++) {
    const a = hash(i) * TAU;
    const sp = 200 + hash(i + 9) * 500;
    const t = d * 0.4;
    const sx = x + Math.cos(a) * sp * t + 180 * t;
    const sy = top + h * (0.2 + hash(i + 2) * 0.6) + Math.sin(a) * sp * t + 900 * t * t;
    g.save();
    g.translate(sx, sy);
    g.rotate(clock * 6 + i);
    g.globalAlpha = Math.max(0, 1 - k);
    g.fillStyle = i % 3 ? 'rgba(190,220,240,0.85)' : '#3FF0E0';
    g.beginPath();
    g.moveTo(-10, -6);
    g.lineTo(12, -2);
    g.lineTo(-2, 10);
    g.closePath();
    g.fill();
    g.restore();
  }
  g.globalAlpha = 1;
  // jagged remains of the pane in the frame
  g.fillStyle = 'rgba(190,220,240,0.35)';
  g.beginPath();
  g.moveTo(x - w / 2, top);
  g.lineTo(x - w / 2 + 50, top);
  g.lineTo(x - w / 2 + 16, top + 70);
  g.closePath();
  g.moveTo(x + w / 2, top + h);
  g.lineTo(x + w / 2 - 60, top + h);
  g.lineTo(x + w / 2 - 10, top + h - 90);
  g.closePath();
  g.fill();
  void L;
}
