/**
 * Screens + HUD in the grindhouse style: the title marquee ("BIG JIM" over a tiny "SLIM CHANCE"), the
 * cold-open prompt, the count-in leader, the HUD (tokens, targets, the audience meter, metronome), hints,
 * subtitles, and the end-of-reel one-sheet poster. Screen space (1920x1080 logical).
 */
import { drawRankStamp } from './rankStamp';
import type { BeatInfo } from '../art/core/beat';
import { hit } from '../art/core/beat';
import { drawGlow, star4 } from '../art/core/draw';
import { TAU, clamp01, easeOut, hash } from '../art/core/math';
import { drawBigJim } from '../art/grindhouse/bigjim';
import { drawSlim, type SlimState } from '../art/grindhouse/slim';
import { drawStreetGround } from '../art/grindhouse/street';
import { drawTheatre } from '../art/grindhouse/theatre';
import { CF } from '../art/palette';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import { Tun } from '../game/tunables';
import { DANGER, PAL, REWARD, drawToken } from './entityDraw';
import type { Stage } from './stage';

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const MARQUEE = '"Impact", "Haettenschweiler", "Arial Narrow Bold", "Helvetica Neue", sans-serif';
export const HAND = '"Marker Felt", "Comic Sans MS", "Trebuchet MS", sans-serif';
const INK = CF.filmBlack;

export function outlineText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, outline = 6): void {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = outline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** marquee bulbs around a rectangle, chasing on the 8ths (screen or world space) */
export function bulbFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, step: number, beat: number, r = 6, kick = 0): void {
  const per = Math.max(4, Math.round((2 * (w + h)) / step));
  const ch = Math.floor(beat * 2);
  for (let i = 0; i < per; i++) {
    let d = (i / per) * 2 * (w + h);
    let px: number;
    let py: number;
    if (d < w) (px = x + d), (py = y);
    else if ((d -= w) < h) (px = x + w), (py = y + d);
    else if ((d -= h) < w) (px = x + w - d), (py = y + h);
    else (d -= w), (px = x), (py = y + h - d);
    const on = (i + ch) % 3 === 0 || kick > 0.6;
    ctx.fillStyle = on ? CF.bulb : '#5A4A3A';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, TAU);
    ctx.fill();
    if (on) drawGlow(ctx, px, py, CF.bulb, r * 4, 0.45);
  }
}

// ------------------------------------------------------------------------------ title

/** Title: the Jimperial's marquee at night — "BIG JIM" in huge bulbs, "SLIM CHANCE" in the smallest type. */
export function drawTitleScreen(ctx: CanvasRenderingContext2D, g: Game, b: BeatInfo, stage: Stage, slim: SlimState, t: number): void {
  const cam = { x: 900 + t * 40, y: -250, zoom: 0.92 };
  stage.street.drawBack(ctx, cam, b);
  ctx.fillStyle = 'rgba(12,8,14,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // sidewalk + Slim swaggering in front of the theatre
  ctx.save();
  ctx.translate(VIEW_W / 2, VIEW_H / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  const x0 = cam.x - VIEW_W;
  drawStreetGround(ctx, { x: x0, y: 0, w: VIEW_W * 2.4, h: 400 }, { light: stage.streetLight.current, version: stage.streetLight.version, capL: false, capR: false });
  drawSlim(ctx, cam.x - 520, 0, { ...slim, pose: 'idle', scale: 1.9 });
  ctx.restore();
  stage.street.drawFront(ctx, cam, b);
  const kick = hit(b, 'kick', 0.12);
  // the marquee
  const mx = VIEW_W / 2 + 170;
  const my = 130;
  const mw = 1060;
  const mh = 460;
  ctx.fillStyle = '#1A1016';
  roundRect(ctx, mx - mw / 2 - 20, my - 20, mw + 40, mh + 40, 18);
  ctx.fill();
  ctx.strokeStyle = CF.fig;
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = '#F2E6CC';
  roundRect(ctx, mx - mw / 2 + 18, my + 18, mw - 36, mh - 36, 8);
  ctx.fill();
  bulbFrame(ctx, mx - mw / 2, my, mw, mh, 44, b.beat, 8, kick);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = CF.fig;
  ctx.font = `20px ${FONT}`;
  ctx.fillText('EIGHTBALL PICTURES PRESENTS', mx, my + 58);
  const pop = 1 + 0.025 * kick;
  ctx.save();
  ctx.translate(mx, my + 282);
  ctx.scale(pop, pop);
  ctx.font = `215px ${MARQUEE}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 16;
  ctx.strokeStyle = INK;
  ctx.strokeText('BIG JIM', 0, 0);
  ctx.fillStyle = '#8A2E5E';
  ctx.fillText('BIG JIM', 0, 0);
  ctx.restore();
  // the joke: the hero in the smallest type on the bill
  ctx.fillStyle = INK;
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillText('with', mx, my + 330);
  ctx.fillStyle = CF.tangerineShade;
  ctx.font = `bold 30px ${MARQUEE}`;
  ctx.fillText('SLIM CHANCE', mx, my + 364);
  ctx.fillStyle = CF.fig;
  ctx.font = `italic 22px ${FONT}`;
  ctx.fillText('— you don’t mess around with him —', mx, my + 410);
  // prompt: on a dark lobby-card plate so it reads over the street
  ctx.fillStyle = 'rgba(13,10,8,0.62)';
  roundRect(ctx, mx - 560, VIEW_H * 0.66 - 50, 1120, 200, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,182,74,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `46px ${MARQUEE}`;
  if (g.loadError) outlineText(ctx, 'Failed to load audio: ' + g.loadError, VIEW_W / 2, VIEW_H * 0.66, '#ff9080');
  else if (g.scene === 'loading') outlineText(ctx, 'THREADING THE PROJECTOR…', VIEW_W / 2 + 170, VIEW_H * 0.66, CF.cream);
  else {
    ctx.globalAlpha = 0.6 + 0.4 * b.energy * Math.exp(-b.beatPhase * 3);
    outlineText(ctx, 'PRESS ANY KEY TO ROLL THE FILM', VIEW_W / 2 + 170, VIEW_H * 0.66, CF.cream, 8);
    ctx.globalAlpha = 1;
  }
  ctx.font = `26px ${FONT}`;
  outlineText(ctx, 'Hold → run · Space/Z: tap = HOP, hold = JUMP · X/J: CUE SWING · Pad: A hop, X/B swing', VIEW_W / 2 + 170, VIEW_H * 0.74, '#EDE2C8', 5);
  outlineText(ctx, '[ / ] audio latency · Esc pause · ` debug overlay', VIEW_W / 2 + 170, VIEW_H * 0.78, '#BFB09A', 5);
  stage.film.draw(ctx, b);
  drawTheatre(ctx, b, { standing: 4 + Math.floor(4 * (0.5 + 0.5 * Math.sin(t * 0.5))), light: stage.streetLight.current });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ------------------------------------------------------------------------------ HUD

/**
 * The HUD, two quiet clusters in the top corners, clear of the play band: LEFT = what you've earned (tokens big, then
 * targets · the audience meter + FULL HOUSE!), RIGHT = the groove (the 4-bulb metronome, the combo title right under
 * it). `A` fades it all (the finale hides it). "BAR n" only with the debug overlay.
 */
export function drawHud(ctx: CanvasRenderingContext2D, g: Game, b: BeatInfo, A = 1): void {
  const gr = g.groove;
  ctx.globalAlpha = A;
  const pop = 1 + 0.12 * gr.pulse(1, 0.2);
  // soft dark backing so the counters stay legible over neon signs
  hudPlate(ctx, 28, 26, g.crowd.awake && g.crowd.bigCatch ? 620 : 420, 220, 1);
  hudPlate(ctx, VIEW_W - 330, 26, 302, 180, -1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // tokens
  drawToken(ctx, 76, 70, -0.25, 1.4 * pop, gr.pulse(1, 0.3));
  ctx.font = `54px ${MARQUEE}`;
  const wN = ctx.measureText(`${g.stats.lums}`).width;
  outlineText(ctx, `${g.stats.lums}`, 118, 74, REWARD.gold, 7);
  ctx.font = `30px ${MARQUEE}`;
  outlineText(ctx, `/ ${g.stats.lumsTotal}`, 118 + wN + 12, 82, CF.filmHi, 6);
  // targets cracked (an 8-ball)
  ctx.fillStyle = '#15110F';
  ctx.beginPath();
  ctx.arc(76, 138, 17, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = REWARD.gold;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = CF.cream;
  ctx.beginPath();
  ctx.arc(79, 135, 7, 0, TAU);
  ctx.fill();
  ctx.font = `32px ${MARQUEE}`;
  outlineText(ctx, `${g.stats.pendulums} / ${g.stats.pendulumsTotal}`, 104, 140, CF.filmHi, 6);
  // the audience meter
  if (g.crowd.awake) {
    const cy = 200;
    const cp = 1 + 0.35 * g.crowd.flash;
    const full = g.crowd.bigCatch;
    ctx.fillStyle = '#0D0A08';
    ctx.beginPath();
    ctx.arc(76, cy - 4, 10, 0, TAU);
    ctx.moveTo(60, cy + 16);
    ctx.quadraticCurveTo(76, cy + 2, 92, cy + 16);
    ctx.fill();
    ctx.strokeStyle = CF.filmHi;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `${Math.round(40 * cp)}px ${MARQUEE}`;
    outlineText(ctx, `${g.crowd.count}`, 104, cy, full ? REWARD.gold : CF.filmHi, 6);
    const w = 230;
    ctx.fillStyle = 'rgba(13,10,8,0.6)';
    roundRect(ctx, 168, cy - 10, w, 20, 10);
    ctx.fill();
    ctx.fillStyle = full ? REWARD.gold : CF.filmHi;
    roundRect(ctx, 170, cy - 8, Math.max(8, ((w - 4) * g.crowd.count) / Tun.crowd.max), 16, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(170 + ((w - 4) * Tun.crowd.bigCatchAt) / Tun.crowd.max - 1, cy - 13, 3, 26);
    if (full) {
      ctx.font = `${Math.round(38 + 6 * gr.pulse(1, 0.3))}px ${MARQUEE}`;
      outlineText(ctx, 'FULL HOUSE!', 414, cy, REWARD.gold, 7);
    }
  }
  // (iteration 6, review iter5 cut list: no in-run falls/stumbles counter — the poster has it)
  // metronome: 4 bulbs, the downbeat gold
  if (g.scene === 'play' && g.phase !== 'coldOpen') {
    const bib = Math.floor(gr.beatInBar);
    for (let i = 0; i < 4; i++) {
      const on = i === bib && g.conductor.playing;
      const r = on ? 12 + 8 * gr.pulse(1, 0.2) : 9;
      ctx.fillStyle = on ? (i === 0 ? REWARD.gold : CF.bulb) : 'rgba(233,216,180,0.25)';
      ctx.beginPath();
      ctx.arc(VIEW_W - 250 + i * 40, 60, r, 0, TAU);
      ctx.fill();
    }
    if (g.debug.enabled && g.conductor.playing) {
      ctx.textAlign = 'right';
      ctx.font = `22px ${MARQUEE}`;
      outlineText(ctx, `BAR ${Math.floor(gr.beat / 4) + 1}`, VIEW_W - 110, 96, 'rgba(233,216,180,0.7)', 4);
      ctx.textAlign = 'left';
    }
  }
  // cold open prompt: the house is dark, the projector waits
  if (g.phase === 'coldOpen' && !g.calib.active) {
    const k = 0.6 + 0.4 * gr.pulse(1, 0.4);
    const a = Math.min(1, g.coldOpenT * 2);
    ctx.textAlign = 'center';
    ctx.globalAlpha = (a) * A;
    ctx.font = `120px ${MARQUEE}`;
    outlineText(ctx, 'SLIM CHANCE', VIEW_W / 2, VIEW_H * 0.2, CF.tangerine, 12);
    ctx.font = `italic 28px ${FONT}`;
    outlineText(ctx, 'reel one · 42nd Street', VIEW_W / 2, VIEW_H * 0.27, CF.filmHi, 5);
    ctx.globalAlpha = (a * k) * A;
    ctx.font = `44px ${MARQUEE}`;
    outlineText(ctx, 'PRESS  X  (CUE SWING)  TO ROLL THE FILM', VIEW_W / 2, VIEW_H * 0.35, CF.cream, 8);
    ctx.font = `26px ${FONT}`;
    outlineText(ctx, '↓  sync the projector first (audio lag test)', VIEW_W / 2, VIEW_H * 0.35 + 50, 'rgba(233,216,180,0.8)', 4);
    ctx.globalAlpha = 1 * A;
  }
  // count-in: the film's countdown leader
  if (g.phase === 'countIn' && g.scene === 'play' && g.conductor.playing) {
    const beatsLeft = g.spawnBeat - g.conductor.beat;
    if (beatsLeft > 0 && beatsLeft <= Tun.flow.countInBeats) drawLeader(ctx, beatsLeft, gr.pulse(1, 0.3));
  }
  // first-appearance hint (a title card)
  const beat = g.conductor.playing ? g.conductor.beat : -1;
  for (const h of g.level.hints) {
    const d = beat - h.beat;
    if (d < -0.5 || d > h.beats) continue;
    const a = Math.min(1, (d + 0.5) / 0.5, (h.beats - d) / 1);
    ctx.globalAlpha = (Math.max(0, a)) * A;
    ctx.font = `bold 36px ${FONT}`;
    ctx.textAlign = 'center';
    const w = ctx.measureText(h.text).width + 70;
    ctx.fillStyle = 'rgba(13,10,8,0.72)';
    roundRect(ctx, VIEW_W / 2 - w / 2, VIEW_H * 0.12 - 34, w, 68, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(233,216,180,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    outlineText(ctx, h.text, VIEW_W / 2, VIEW_H * 0.12, CF.cream, 5);
    ctx.globalAlpha = 1 * A;
    break;
  }
  // dubbed subtitle on the song's shouts (cream, never yellow: yellow reads as reward)
  if (g.subtitle.t > 0 && g.scene === 'play') {
    const k = g.subtitle.t;
    ctx.globalAlpha = (Math.min(1, k * 5)) * A;
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(VIEW_W / 2, VIEW_H - 130);
    const s = 1 + 0.25 * Math.max(0, (k - 0.35) / 0.1);
    ctx.scale(s, s);
    ctx.font = `bold 58px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    outlineText(ctx, g.subtitle.text, 0, 0, CF.subtitle, 9);
    ctx.restore();
    ctx.globalAlpha = 1 * A;
  }
  if (g.toast.t > 0) {
    ctx.globalAlpha = (Math.min(1, g.toast.t * 2)) * A;
    ctx.font = `bold 34px ${FONT}`;
    ctx.textAlign = 'center';
    outlineText(ctx, g.toast.text, VIEW_W / 2, VIEW_H - 190, CF.cream);
    ctx.globalAlpha = 1 * A;
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  void b;
}

/** a soft dark plate behind a HUD cluster (fades out toward the play field: `dir` 1 = fades right, -1 = fades left) */
function hudPlate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: 1 | -1): void {
  const gr = ctx.createLinearGradient(dir > 0 ? x : x + w, 0, dir > 0 ? x + w : x, 0);
  gr.addColorStop(0, 'rgba(13,10,8,0.5)');
  gr.addColorStop(0.7, 'rgba(13,10,8,0.38)');
  gr.addColorStop(1, 'rgba(13,10,8,0)');
  ctx.fillStyle = gr;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
}

/** Academy countdown leader: a circle, a sweeping wedge, the number; "HEY!" on 1 */
function drawLeader(ctx: CanvasRenderingContext2D, beatsLeft: number, k: number): void {
  const n = Math.ceil(beatsLeft);
  const frac = beatsLeft - Math.floor(beatsLeft);
  const cx = VIEW_W / 2;
  const cy = VIEW_H * 0.32;
  const R = 120;
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(26,20,16,0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(233,216,180,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (1 - frac) * TAU);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = CF.filmHi;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.moveTo(cx + R * 0.82, cy);
  ctx.arc(cx, cy, R * 0.82, 0, TAU);
  ctx.moveTo(cx - R - 30, cy);
  ctx.lineTo(cx + R + 30, cy);
  ctx.moveTo(cx, cy - R - 30);
  ctx.lineTo(cx, cy + R + 30);
  ctx.stroke();
  ctx.font = `${130 + 30 * k}px ${MARQUEE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  outlineText(ctx, n === 1 ? 'HEY!' : String(n), cx, cy + 6, n === 1 ? CF.tangerine : CF.filmHi, 10);
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------------------ overlays

/** Perfect: the movie's slow-mo replay (radial speed lines from the hero) */
export function drawFreeze(ctx: CanvasRenderingContext2D, k: number, hx: number, hy: number): void {
  if (k <= 0) return;
  // few, short, fading outward: a replay flourish, not a curtain over the play band
  ctx.strokeStyle = `rgba(248,241,220,${0.32 * k})`;
  ctx.lineWidth = 3;
  const grow = 1 - k;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + i * 0.37;
    const r0 = 170 + ((i * 97) % 90) + grow * 120;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0);
    ctx.lineTo(hx + Math.cos(a) * (r0 + 150), hy + Math.sin(a) * (r0 + 150));
    ctx.stroke();
  }
}

/** death: the film visibly rewinds (reverse scrub) back to the splice */
export function drawRewind(ctx: CanvasRenderingContext2D, k: number, t: number): void {
  if (k <= 0) return;
  ctx.fillStyle = `rgba(248,241,220,${0.1 * k})`;
  for (let i = 0; i < 9; i++) {
    const y = ((t * 2400 + i * 131) % VIEW_H) | 0;
    ctx.fillRect(0, y, VIEW_W, 6);
  }
  ctx.fillStyle = `rgba(26,20,16,${0.25 * k})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = k;
  ctx.font = `150px ${MARQUEE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  outlineText(ctx, '◀◀', VIEW_W / 2, VIEW_H * 0.42, CF.filmHi, 12);
  ctx.font = `36px ${MARQUEE}`;
  outlineText(ctx, 'REWIND TO THE SPLICE', VIEW_W / 2, VIEW_H * 0.52, CF.filmHi, 6);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawCenterText(ctx: CanvasRenderingContext2D, title: string, sub: string): void {
  ctx.fillStyle = 'rgba(13,10,8,0.65)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `110px ${MARQUEE}`;
  outlineText(ctx, title, VIEW_W / 2, VIEW_H * 0.45, CF.cream, 10);
  ctx.font = `bold 34px ${FONT}`;
  outlineText(ctx, sub, VIEW_W / 2, VIEW_H * 0.56, CF.filmHi);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ------------------------------------------------------------------------------ end: the one-sheet

/** End of reel: a lurid one-sheet printed from your run — Slim in his victory flex, the stats as billing, a rating stamp. */
export function drawEndScreen(ctx: CanvasRenderingContext2D, g: Game, b: BeatInfo, slim: SlimState, t: number, appear: number): void {
  const k = easeOut(clamp01(appear / 0.6));
  ctx.fillStyle = `rgba(13,10,8,${0.82 * k})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // poster sheet
  const px = 250;
  const py = 70 + (1 - k) * 80;
  const pw = 1420;
  const ph = 880;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = '#EADBBE';
  ctx.fillRect(px, py, pw, ph);
  // fold lines + wear (seeded by the run)
  ctx.fillStyle = 'rgba(90,60,40,0.12)';
  ctx.fillRect(px + pw / 2 - 1, py, 2, ph);
  ctx.fillRect(px, py + ph / 2 - 1, pw, 2);
  for (let i = 0; i < 40; i++) ctx.fillRect(px + hash(i + g.runId) * pw, py + hash(i * 3 + g.runId) * ph, 3 + hash(i * 7) * 6, 2);
  // key art panel: fig sunburst behind Slim
  const ax = px + 40;
  const ay = py + 40;
  const aw = 620;
  const ah = ph - 80;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ax, ay, aw, ah);
  ctx.clip();
  ctx.fillStyle = CF.fig;
  ctx.fillRect(ax, ay, aw, ah);
  ctx.fillStyle = '#7A3A66';
  const cx = ax + aw / 2;
  const cy = ay + ah * 0.55;
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * TAU + t * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 900, a0, a0 + TAU / 32);
    ctx.closePath();
    ctx.fill();
  }
  drawGlow(ctx, cx, cy - 60, '#FFE9C2', 380, 0.5);
  // tiny Big Jim, shrunk, sulking at Slim's feet (the real rig: cracked lenses if you cracked them)
  const J = g.mech.act3?.bigJim.state;
  drawBigJim(ctx, cx + 190, ay + ah - 30, 0.17, { time: t, beat: b.beat, panic: 1, crack: J ? J.crack : [0, 0], reflect: 1, lod: 0, lift: [0.1, 0.1] });
  drawSlim(ctx, cx - 30, ay + ah - 40, { ...slim, pose: 'victory', scale: 3.0 });
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(ax, ay, aw, ah);
  // billing
  const tx = ax + aw + 50;
  const tw = px + pw - 40 - tx;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = CF.fig;
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText(g.mech.act3?.bigJim.present ? 'EIGHTBALL PICTURES  ·  THE COMPLETE PICTURE' : 'EIGHTBALL PICTURES  ·  END OF REEL ONE', tx, py + 86);
  ctx.font = `92px ${MARQUEE}`;
  ctx.fillStyle = '#8A2E5E';
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.strokeText('DON’T MESS', tx, py + 190);
  ctx.fillText('DON’T MESS', tx, py + 190);
  ctx.fillStyle = CF.tangerine;
  ctx.strokeText('WITH SLIM!', tx, py + 285);
  ctx.fillText('WITH SLIM!', tx, py + 285);
  const r = g.report();
  const gr = r.grades;
  const total = gr.perfect + gr.great + gr.good + gr.miss;
  const lines: [string, string][] = [
    ['brass tokens', `${g.stats.lums} / ${g.stats.lumsTotal}`],
    // (iteration 6: targets + bottles share a line; the hidden FILM CANISTERS get theirs — the replay hook)
    ['targets · bottles', `${g.stats.pendulums}/${g.stats.pendulumsTotal} · ${r.breakables}/${r.breakablesTotal}`],
    ...(r.canistersTotal > 0 ? ([['film canisters found', `${r.canisters} / ${r.canistersTotal}`]] as [string, string][]) : []),
    ['audience on its feet', `${g.crowd.peak}`],
    ['on the beat', `${gr.perfect + gr.great + gr.good} / ${total}  (${gr.perfect} perfect)`],
    ['best combo · heaves', `${g.comboPeak} · ${g.stats.heaves} / ${r.phrases}`],
    ['falls · stumbles', `${g.stats.deaths} · ${g.stats.stumbles}`],
  ];
  lines.forEach(([kk, v], i) => {
    const y = py + 350 + i * 52;
    ctx.fillStyle = '#5A4A3A';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(kk.toUpperCase(), tx, y);
    ctx.fillStyle = INK;
    ctx.font = `40px ${MARQUEE}`;
    ctx.textAlign = 'right';
    ctx.fillText(v, tx + tw - 10, y + 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(90,60,40,0.25)';
    ctx.fillRect(tx, y + 14, tw - 10, 2);
  });
  ctx.fillStyle = '#5A4A3A';
  ctx.font = `italic 22px ${FONT}`;
  ctx.fillText('also starring BIG JIM (briefly)', tx, py + ph - 150);
  // rating stamp (gold = reward): the RANK (iteration 6, game/rank.ts — crowd time, timing, tokens, deaths, canisters)
  const rank = r.rank;
  const cup = rank.tier;
  const sk = easeOut(clamp01((appear - 0.5) / 0.25));
  if (sk > 0) {
    // (iteration 6, art: each billing tier has its own stamp — render/rankStamp.ts)
    ctx.save();
    ctx.globalAlpha = k;
    drawRankStamp(ctx, px + pw - 250, py + ph - 88, rank.letter, cup, sk, t);
    ctx.restore();
    if (sk < 1) star4(ctx, px + pw - 250, py + ph - 88, 80 * (1 - sk), sk * 3, REWARD.shine);
  }
  // act 3 SNIPES pasted across the key art (earned, not given)
  const A = g.mech.act3;
  const snipes: string[] = [];
  if (A) {
    if (g.crowd.peak >= 20 && g.stats.finished) snipes.push('HELD OVER!');
    if (A.state.rack.broken === true) snipes.push('BROKE THE RACK!');
    const L2 = A.bigJim.state.crack.filter((c) => c >= 2).length;
    if (A.bigJim.present) snipes.push(`LENSES CRACKED ${L2}/2`);
  }
  snipes.forEach((sn, i) => {
    const sk2 = easeOut(clamp01((appear - 0.8 - i * 0.18) / 0.2));
    if (sk2 <= 0) return;
    ctx.save();
    ctx.translate(ax + aw * 0.5, ay + 70 + i * 86);
    ctx.rotate(-0.12 + i * 0.07);
    ctx.scale(1.4 - 0.4 * sk2, 1.4 - 0.4 * sk2);
    ctx.globalAlpha = k * sk2;
    ctx.fillStyle = i === 0 ? '#E0B64A' : '#F4EFE2';
    ctx.fillRect(-250, -34, 500, 68);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.strokeRect(-250, -34, 500, 68);
    ctx.fillStyle = INK;
    ctx.font = `44px ${MARQUEE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sn, 0, 3);
    ctx.restore();
  });
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `34px ${MARQUEE}`;
  ctx.globalAlpha = k * (0.6 + 0.4 * Math.exp(-b.beatPhase * 3));
  outlineText(ctx, 'PRESS SPACE / ENTER TO RUN IT AGAIN', VIEW_W / 2, VIEW_H - 40, CF.cream, 6);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  void PAL;
  void DANGER;
}
