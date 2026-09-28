/**
 * Renderer: draws the whole frame from game state (read-only). Placeholder art — every entity
 * is drawn by a small function in entityDraw.ts (swap point for the art module) — built on the
 * beat-reactive hooks (Groove).
 *
 * Draw order: background (sky preset + parallax + haze) -> world (pit, pendulum rigs, ground, bar
 * lines + scansion marks, slam platforms, beacons, spikes, pendulums, lums, jabbers, chaser) ->
 * crowd -> hero -> particles -> popups -> debug world overlay -> HUD -> screens -> flash/fade.
 */
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import { Tun } from '../game/tunables';
import { groundStyleAt, marksOnAt } from '../level/build';
import {
  type HeroPose,
  SLAM_LIFT_PX,
  PAL,
  drawBarLine,
  drawBeacon,
  drawChaser,
  drawAudience,
  drawAudienceIcon,
  drawCueDot,
  drawFilmPass,
  drawHero,
  drawPendulumRig,
  drawPendulumTarget,
  drawJabber,
  drawLum,
  drawPool,
  drawScansion,
  drawPit,
  drawSpike,
  drawSlamPlatform,
  makeGroundTile,
} from './entityDraw';
import { applyBeatReact } from './groove';
import { type SpriteSet, blit } from './sprites';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export class Renderer {
  private game: Game;
  private spr: SpriteSet;
  private groundPattern: CanvasPattern | null = null;
  private timberPattern: CanvasPattern | null = null;

  constructor(game: Game, sprites: SpriteSet) {
    this.game = game;
    this.spr = sprites;
  }

  render(px: number, py: number): void {
    const g = this.game;
    const ctx = g.display.beginFrame();
    if (!this.groundPattern) this.groundPattern = ctx.createPattern(makeGroundTile('street'), 'repeat');
    if (!this.timberPattern) this.timberPattern = ctx.createPattern(makeGroundTile('timber'), 'repeat');

    if (g.scene === 'loading' || g.scene === 'title') {
      this.drawTitle(ctx);
      return;
    }

    const cam = g.camera;
    this.skyFor(g.phase === 'coldOpen' ? -50 : g.conductor.playing ? g.conductor.beat : g.spawnBeat);
    g.background.draw(ctx, cam.rx, cam.ry, g.groove);

    ctx.save();
    cam.apply(ctx);
    const v = cam.viewBounds();
    this.drawLevel(ctx, v.x0, v.x1, v.y0, v.y1);
    this.drawPlayer(ctx, px, py);
    g.particles.draw(ctx, v.x0, v.x1);
    this.drawPopups(ctx);
    g.debug.drawWorld(ctx, v);
    ctx.restore();

    this.drawCrowd(ctx);
    this.drawFreeze(ctx);
    drawFilmPass(ctx, g.groove.time);
    this.drawRewind(ctx);
    let cue = 0;
    for (const cp of g.level.checkpoints) cue = Math.max(cue, cp.flash);
    drawCueDot(ctx, cue);
    this.drawHud(ctx);
    if (g.scene === 'end') this.drawEnd(ctx);
    if (g.paused) this.drawCenterText(ctx, 'PAUSED', 'press Enter / Space to resume');

    if (g.flash > 0.001) {
      ctx.globalAlpha = Math.min(1, g.flash);
      ctx.fillStyle = g.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    if (g.fade > 0.001) {
      ctx.globalAlpha = Math.min(1, g.fade);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    g.debug.drawScreen(ctx);
  }

  // ------------------------------------------------------------------ world

  private skyFor(beat: number): void {
    const cues = this.game.level.skyCues;
    const bg = this.game.background;
    let from = cues[0]?.preset ?? 'dawn';
    let to = from;
    let k = 1;
    for (let i = 0; i < cues.length; i++) {
      if (beat < cues[i].beat) break;
      from = i > 0 ? cues[i - 1].preset : cues[i].preset;
      to = cues[i].preset;
      k = Math.min(1, (beat - cues[i].beat) / 8);
    }
    bg.skyFrom = from;
    bg.skyTo = to;
    bg.skyK = k;
  }

  private drawLevel(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number): void {
    const g = this.game;
    const L = g.level;
    const gr = g.groove;
    const pitY = Tun.flow.pitY;
    const wb = g.phase === 'coldOpen' ? L.def.startBeat : g.worldBeat;

    // the pit (behind the ground)
    drawPit(ctx, x0, x1, pitY, y1);

    // training-dummy frames (behind the ground line)
    for (const f of L.pendulums) {
      if (f.pivotX < x0 - 300 || f.pivotX > x1 + 300) continue;
      drawPendulumRig(ctx, f.pivotX, f.pivotY, L.surfaceYNear(f.pivotX));
    }

    // ground (asphalt on the Street, floorboards in the Dojo). Walkable-top rule (DESIGN §3):
    // a 4 px film-black edge + a 2 px cream lip, so every surface reads day or night
    const cutX = L.groundCues.map((c) => c.beat * L.ppb);
    for (const f of L.floors) {
      if (f.x1 < x0 || f.x0 > x1) continue;
      const a = Math.max(f.x0, x0 - 10);
      const b = Math.min(f.x1, x1 + 10);
      const depth = Math.max(0, Math.min(1400, y1 - f.y));
      const cuts = [a, ...cutX.filter((c) => c > a && c < b), b];
      for (let k = 0; k < cuts.length - 1; k++) {
        const style = groundStyleAt(L, (cuts[k] + cuts[k + 1]) / 2 / L.ppb);
        ctx.fillStyle = (style === 'timber' ? this.timberPattern : this.groundPattern) ?? PAL.asphalt;
        ctx.fillRect(cuts[k], f.y, cuts[k + 1] - cuts[k], depth);
      }
      ctx.fillStyle = PAL.filmBlack;
      ctx.fillRect(a, f.y, b - a, 5);
      ctx.fillStyle = PAL.lip;
      ctx.fillRect(a, f.y - 2, b - a, 3);
      ctx.fillStyle = PAL.filmBlack;
      if (f.x0 >= x0 - 30) ctx.fillRect(f.x0 - 2, f.y, 6, depth);
      if (f.x1 <= x1 + 30) ctx.fillRect(f.x1 - 4, f.y, 6, depth);
      // a dip below the base ground line: a shallow puddle
      if (f.y > 20) drawPool(ctx, f.x0, f.x1, 14, f.y, gr.time);
    }

    // bar lines (gaffer-tape strokes on every downbeat, always on) + choreographer's chalk marks
    const bpb = g.tempo.beatsPerBar;
    const ppb = L.ppb;
    const barPulse = gr.pulse(4, 0.4);
    for (let b = Math.ceil(x0 / ppb / bpb) * bpb; b * ppb < x1; b += bpb) {
      const fy = L.floorYAt(b * ppb);
      if (!Number.isNaN(fy)) drawBarLine(ctx, b * ppb, fy, Math.abs(gr.beat - b) < 0.5 ? barPulse : 0);
    }
    for (const a of L.actions) {
      if (a.x < x0 - 50 || a.x > x1 + 50 || a.glyph === 'none' || !marksOnAt(L, a.beat)) continue;
      let y = a.groundY + 44;
      const slam = L.slams.find((f) => a.x >= f.solid.x && a.x <= f.solid.x + f.solid.w);
      if (slam) y = slam.solid.y + 20 - slam.lift * SLAM_LIFT_PX;
      const d = gr.beat - a.beat;
      const lit = d > -0.35 && d < 0.6 ? 1 - Math.abs(d) / 0.6 : 0;
      const grade = g.judge.gradeAt(a.beat, a.type);
      drawScansion(ctx, a.glyph, a.x, y, lit, grade === 'perfect');
    }

    // slam platforms
    for (const f of L.slams) {
      const s = f.solid;
      if (s.x + s.w < x0 || s.x > x1) continue;
      const slam = f.lift === 0 ? gr.pulse(1, 0.2) : 0;
      drawSlamPlatform(ctx, s.x, s.y, s.w, s.h, f.lift, pitY, slam);
    }

    // checkpoints: film splices across the frame ("SC. <bar>")
    for (const cp of L.checkpoints) {
      if (cp.x < x0 - 100 || cp.x > x1 + 100) continue;
      drawBeacon(ctx, cp.x, y0, y1, cp.reached, cp.flash, `SC. ${Math.round(cp.beat / g.tempo.beatsPerBar)}`);
    }

    // finish: the harbour's end post
    if (L.finishX > x0 - 200 && L.finishX < x1 + 200) {
      const fy = L.floorYAt(L.finishX - 1);
      const y = Number.isNaN(fy) ? 0 : fy;
      const pulse = 1 + 0.06 * gr.pulse(1, 0.3);
      ctx.save();
      ctx.translate(L.finishX, y);
      ctx.scale(pulse, pulse);
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = i % 2 ? PAL.film : PAL.filmBlack;
        ctx.fillRect(-14, -420 + i * 30, 28, 30);
      }
      ctx.font = `bold 44px ${FONT}`;
      ctx.textAlign = 'center';
      outlineText(ctx, 'BAR 33', 0, -440, PAL.film);
      ctx.restore();
    }

    // spikes
    for (const h of L.hazards) {
      const cx = h.vis.x + h.vis.w / 2 + h.offX;
      if (cx < x0 - 80 || cx > x1 + 80) continue;
      if (!h.alive && h.offY > 900) continue;
      const pulse = h.alive ? gr.pulse(1, 0.25) : 0;
      drawSpike(ctx, cx, h.vis.y + h.vis.h - 22 + h.offY, pulse, h.rot);
    }

    // pendulum targets
    for (const f of L.pendulums) {
      if (f.pivotX < x0 - 200 || f.pivotX > x1 + 200) continue;
      if (f.struck) {
        if (f.struckT > 0.5) continue;
        const k = f.struckT / 0.5;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = PAL.gold;
        ctx.lineWidth = 6 * (1 - k);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r + 70 * k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      const toBottom = wb - f.beat;
      // glint 1 beat before the bottom of the swing (the telegraph), glow at the bottom
      const glint = Math.max(0, 1 - Math.abs(toBottom + 1) / 0.3);
      const bottomGlow = Math.max(0, 1 - Math.abs(toBottom) / 0.35);
      drawPendulumTarget(ctx, f.pivotX, f.pivotY, f.x, f.y, f.r, glint, bottomGlow);
    }

    // lums
    for (const l of L.lums) {
      if (l.x < x0 - 60 || l.x > x1 + 60 || l.skipped) continue;
      if (l.collected) {
        const t = l.collectT;
        if (t > 0.35) continue;
        const k = t / 0.35;
        drawLum(ctx, l.x, l.y - 70 * k, l.angle - 0.8 * k, 1 + k * 0.6, 1, 1 - k);
        continue;
      }
      // each lums leaps on its own beat so rows ripple in time
      const own = gr.pulse(1, 0.18, l.beat % 1);
      const bob = -8 * (1 - gr.bounce(1, l.beat % 1));
      drawLum(ctx, l.x, l.y + bob, l.angle + Math.sin(gr.beat * Math.PI + l.x) * 0.12, 1 + 0.18 * own, own);
    }
    for (const h of g.loose) {
      if (h.collected) continue;
      const blink = h.t > 0 && h.expires - g.simTime < 0.6 ? (Math.floor(h.t * 12) % 2 ? 0.35 : 1) : 1;
      drawLum(ctx, h.x, h.y, Math.sin(h.t * 6) * 0.4, 1, 0.5, blink);
    }

    // jabbers (bluff goons): bow on the swung "and", mask + jab on the beat
    const off = gr.beat - Math.floor(gr.beat);
    const bowK = Math.max(0, 1 - Math.abs(off - L.swing) / 0.3);
    for (const e of L.enemies) {
      if (e.x < x0 - 200 || e.x > x1 + 200) continue;
      if ((!e.alive || e.retired) && e.deadTime > 2.2) continue;
      const r = e.alive && !e.retired ? applyBeatReact(e.react, gr) : { sx: 1, sy: 1, dy: 0, flash: 0 };
      const toJab = e.beat - gr.beat;
      const windup = toJab > 0 && toJab < 1 ? 1 - toJab : 0;
      // heaved = through the paper wall (away); struck = knocked toward the camera into the front row
      const scale = e.heaved ? Math.max(0.15, 1 - e.deadTime * 0.9) : !e.alive ? 1 + Math.min(1.5, e.deadTime * 1.6) : 1;
      drawJabber(ctx, e.x, e.y + r.dy, {
        bow: e.alive && !e.retired ? bowK : 0,
        jab: Math.min(1, e.jabT / 0.12),
        windup,
        flying: e.retired && e.alive,
        dead: !e.alive,
        rot: e.rot,
        scale,
        squash: r.sx - 1,
      });
      if (e.hitFlash > 0) {
        ctx.globalAlpha = e.hitFlash;
        blit(ctx, this.spr.lumGlow, e.x, e.y - e.h / 2, 2.2, 2.2);
        ctx.globalAlpha = 1;
      }
    }

    // the chaser: the film burning in from the left (drawn over everything behind the hero)
    if (g.chaser.active && g.chaser.x > x0 - 800) {
      const riseK = Math.min(1, (wb - g.chaser.riseBeat) / Tun.chaser.riseBeats);
      const surge = Math.sin(Math.PI * Math.min(1, riseK)) * 0.8 * ppb;
      const lagBeats = Number.isFinite(g.player.musicX) ? (g.player.musicX - g.player.x) / ppb : 0;
      const showX = g.chaser.x + (riseK < 1 && lagBeats < 0.3 ? surge : 0);
      drawChaser(ctx, showX, y0, gr.time, y1);
    }
  }

  // ------------------------------------------------------------------ hero + crowd

  private pose: HeroPose = { sx: 1, sy: 1, facing: 1, runPhase: 0, running: false, grounded: true, strike: NaN, beatBob: 0, spin: NaN, hidden: false, dead: false, surging: false, t: 0 };

  /** the theatre audience along the bottom of the frame (screen space): the crowd streak */
  private drawCrowd(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    const gr = g.groove;
    const seats = Tun.crowd.max;
    const standing = g.crowd.awake ? g.crowd.count : 0;
    const p = g.player;
    const wave = p.strikeTime >= 0 && g.crowd.count >= 4 ? p.strikeTime / 0.4 : -1;
    const backbeat = gr.pulse(2, 0.3, 1);
    drawAudience(ctx, seats, standing, gr.beat, gr.pulse(1, 0.3), g.conductor.playing ? backbeat : 0, wave, g.crowd.bigCatch);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const g = this.game;
    const p = g.player;
    const dead = p.mode === 'dead';
    if (dead && g.fade > 0.5) return;
    const P = this.pose;
    P.sx = p.sx;
    P.sy = p.sy;
    P.facing = p.facing;
    P.runPhase = p.runPhase;
    P.running = p.grounded && Math.abs(p.vx) > 50;
    P.grounded = p.grounded;
    P.strike = p.strikeTime >= 0 ? p.strikeTime / Tun.strike.duration : NaN;
    P.beatBob = g.groove.pulse(1, 0.3);
    const since = Tun.stumble.iframesBeats * p.spb - p.iframes;
    P.spin = p.iframes > 0 && since < 0.35 ? since / 0.35 : NaN;
    P.hidden = p.iframes > 0 && since >= 0.35 && Math.floor(g.groove.time * 20) % 2 === 0;
    P.dead = dead;
    P.surging = p.surging && p.mode === 'play';
    P.t = g.groove.time;
    drawHero(ctx, x, y, P);
  }

  // ------------------------------------------------------------------ HUD & screens

  /** Perfect sweep: radial speed lines (the movie's slow-motion replay) */
  private drawFreeze(ctx: CanvasRenderingContext2D): void {
    const k = this.game.freezeFx / 0.2;
    if (k <= 0) return;
    ctx.strokeStyle = `rgba(248,241,220,${0.5 * k})`;
    ctx.lineWidth = 4;
    const cx = VIEW_W * 0.32;
    const cy = VIEW_H * 0.62;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + i * 0.37;
      const r0 = 380 + ((i * 97) % 160);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * (r0 + 400), cy + Math.sin(a) * (r0 + 400));
      ctx.stroke();
    }
  }

  /** death: the film visibly rewinds (reverse scrub) before the respawn */
  private drawRewind(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    if (g.phase !== 'dying') return;
    const k = Math.min(1, g.deathProgress * 1.4);
    ctx.fillStyle = `rgba(248,241,220,${0.08 * k})`;
    for (let i = 0; i < 9; i++) {
      const y = ((g.groove.time * 2400 + i * 131) % VIEW_H) | 0;
      ctx.fillRect(0, y, VIEW_W, 6);
    }
    ctx.globalAlpha = k;
    ctx.font = `bold 120px ${FONT}`;
    ctx.textAlign = 'center';
    outlineText(ctx, '◀◀', VIEW_W / 2, VIEW_H * 0.42, PAL.film, 10);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  private drawPopups(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    if (!g.popups.length) return;
    ctx.font = `bold 34px ${FONT}`;
    ctx.textAlign = 'center';
    for (const p of g.popups) {
      ctx.globalAlpha = Math.max(0, 1 - p.t);
      outlineText(ctx, p.text, p.x, p.y - 60 * p.t, p.color, 5);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    const gr = g.groove;
    const pop = 1 + 0.12 * gr.pulse(1, 0.2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // lums counter
    drawLum(ctx, 72, 70, -0.25, 1.5 * pop, gr.pulse(1, 0.3));
    ctx.font = `bold 50px ${FONT}`;
    const wN = ctx.measureText(`${g.stats.lums}`).width;
    outlineText(ctx, `${g.stats.lums}`, 118, 72, PAL.gold);
    ctx.font = `bold 28px ${FONT}`;
    outlineText(ctx, `/ ${g.stats.lumsTotal}`, 118 + wN + 12, 80, PAL.film);
    // training dummies cracked
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillStyle = PAL.wood;
    ctx.beginPath();
    ctx.ellipse(72, 134, 9, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    outlineText(ctx, `${g.stats.pendulums} / ${g.stats.pendulumsTotal}`, 100, 136, PAL.film);
    // the audience (count + meter)
    if (g.crowd.awake) {
      const cx = 72;
      const cy = 196;
      const cp = 1 + 0.35 * g.crowd.flash;
      drawAudienceIcon(ctx, cx, cy + 6, g.crowd.flash);
      ctx.font = `bold ${Math.round(40 * cp)}px ${FONT}`;
      outlineText(ctx, `${g.crowd.count}`, 104, cy, g.crowd.bigCatch ? PAL.gold : PAL.film);
      const w = 220;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(170, cy - 8, w, 16);
      ctx.fillStyle = g.crowd.bigCatch ? PAL.gold : PAL.film;
      ctx.fillRect(170, cy - 8, (w * g.crowd.count) / Tun.crowd.max, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(170 + (w * Tun.crowd.bigCatchAt) / Tun.crowd.max - 1, cy - 12, 3, 24);
      if (g.crowd.bigCatch) {
        ctx.font = `bold ${Math.round(34 + 6 * gr.pulse(1, 0.3))}px ${FONT}`;
        outlineText(ctx, 'FULL HOUSE!', 410, cy, PAL.gold);
      }
    }
    // deaths / stumbles (small)
    if (g.stats.deaths > 0 || g.stats.stumbles > 0) {
      ctx.font = `bold 24px ${FONT}`;
      outlineText(ctx, `falls ${g.stats.deaths} · stumbles ${g.stats.stumbles}`, 46, 250, PAL.film, 4);
    }
    // beat metronome dots (top right): 4 dots, current beat lit
    if (g.scene === 'play' && g.phase !== 'coldOpen') {
      const bib = Math.floor(gr.beatInBar);
      for (let i = 0; i < 4; i++) {
        const on = i === bib && g.conductor.playing;
        const r = on ? 12 + 8 * gr.pulse(1, 0.2) : 9;
        ctx.fillStyle = on ? (i === 0 ? PAL.gold : '#ffffff') : 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(VIEW_W - 170 + i * 40, 60, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `bold 22px ${FONT}`;
      ctx.textAlign = 'right';
      const barNo = Math.floor(gr.beat / 4);
      if (g.conductor.playing) outlineText(ctx, `bar ${barNo}`, VIEW_W - 44, 100, 'rgba(255,255,255,0.7)', 4);
      ctx.textAlign = 'left';
    }
    // cold open prompt
    if (g.phase === 'coldOpen') {
      const k = 0.6 + 0.4 * gr.pulse(1, 0.4);
      ctx.textAlign = 'center';
      ctx.font = `bold 64px ${FONT}`;
      ctx.globalAlpha = Math.min(1, g.coldOpenT * 2);
      outlineText(ctx, 'CUE-FU', VIEW_W / 2, VIEW_H * 0.2, PAL.film, 8);
      ctx.globalAlpha = Math.min(1, g.coldOpenT * 2) * k;
      ctx.font = `bold 44px ${FONT}`;
      outlineText(ctx, 'press  X  (CUE SWEEP)  to roll the film', VIEW_W / 2, VIEW_H * 0.3, PAL.heroAccent, 7);
      ctx.globalAlpha = 1;
    }
    // count-in
    if (g.phase === 'countIn' && g.scene === 'play' && g.conductor.playing) {
      const beatsLeft = g.spawnBeat - g.conductor.beat;
      if (beatsLeft > 0 && beatsLeft <= Tun.flow.countInBeats) {
        // film countdown leader: a circle with a sweeping hand and the number
        const n = Math.ceil(beatsLeft);
        const frac = beatsLeft - Math.floor(beatsLeft);
        const cx = VIEW_W / 2;
        const cy = VIEW_H * 0.32;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(26,20,16,0.55)';
        ctx.beginPath();
        ctx.arc(cx, cy, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(233,216,180,0.35)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 110, -Math.PI / 2, -Math.PI / 2 + (1 - frac) * Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = PAL.film;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 110, 0, Math.PI * 2);
        ctx.moveTo(cx - 130, cy);
        ctx.lineTo(cx + 130, cy);
        ctx.moveTo(cx, cy - 130);
        ctx.lineTo(cx, cy + 130);
        ctx.stroke();
        const k = g.groove.pulse(1, 0.3);
        ctx.font = `bold ${110 + 30 * k}px ${FONT}`;
        ctx.textAlign = 'center';
        outlineText(ctx, n === 1 ? 'HEY!' : String(n), cx, cy + 6, n === 1 ? PAL.heroAccent : PAL.film);
        ctx.globalAlpha = 1;
      }
    }
    // first-appearance hint (tutorial text)
    const beat = g.conductor.playing ? g.conductor.beat : -1;
    for (const h of g.level.hints) {
      const d = beat - h.beat;
      if (d < -0.5 || d > h.beats) continue;
      const a = Math.min(1, (d + 0.5) / 0.5, (h.beats - d) / 1);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = `bold 38px ${FONT}`;
      ctx.textAlign = 'center';
      const w = ctx.measureText(h.text).width + 60;
      ctx.fillStyle = 'rgba(20,26,58,0.55)';
      ctx.fillRect(VIEW_W / 2 - w / 2, VIEW_H * 0.12 - 32, w, 64);
      outlineText(ctx, h.text, VIEW_W / 2, VIEW_H * 0.12, '#ffffff', 5);
      ctx.globalAlpha = 1;
      break;
    }
    // dubbed subtitle on the song's shouts (cream, never yellow: yellow reads as reward)
    if (g.subtitle.t > 0 && g.scene === 'play') {
      ctx.globalAlpha = Math.min(1, g.subtitle.t * 5);
      ctx.font = `bold 52px ${FONT}`;
      ctx.textAlign = 'center';
      outlineText(ctx, g.subtitle.text, VIEW_W / 2, VIEW_H - 120, '#F4EFE2', 7);
      ctx.globalAlpha = 1;
    }
    if (g.toast.t > 0) {
      ctx.globalAlpha = Math.min(1, g.toast.t * 2);
      ctx.font = `bold 36px ${FONT}`;
      ctx.textAlign = 'center';
      outlineText(ctx, g.toast.text, VIEW_W / 2, VIEW_H - 80, '#ffffff');
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private drawTitle(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    g.background.skyFrom = g.background.skyTo = 'neon';
    g.background.skyK = 1;
    g.background.draw(ctx, g.groove.time * 200, -240, g.groove);
    ctx.fillStyle = 'rgba(10,6,30,0.35)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const k = g.groove.pulse(1, 0.25);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${120 + 8 * k}px ${FONT}`;
    outlineText(ctx, 'CUE-FU', VIEW_W / 2, VIEW_H * 0.34, PAL.heroAccent, 12);
    ctx.font = `bold 34px ${FONT}`;
    outlineText(ctx, 'OpusLegends · vertical slice: cold open → Chorus 1 · ' + g.song.title, VIEW_W / 2, VIEW_H * 0.46, '#ffffff');
    ctx.font = `bold 46px ${FONT}`;
    if (g.loadError) outlineText(ctx, 'Failed to load audio: ' + g.loadError, VIEW_W / 2, VIEW_H * 0.64, '#ff8080');
    else if (g.scene === 'loading') outlineText(ctx, 'tuning the band…', VIEW_W / 2, VIEW_H * 0.64, '#ffffff');
    else {
      ctx.globalAlpha = 0.6 + 0.4 * k;
      outlineText(ctx, 'PRESS ANY KEY', VIEW_W / 2, VIEW_H * 0.64, '#ffffff');
      ctx.globalAlpha = 1;
    }
    ctx.font = `28px ${FONT}`;
    outlineText(ctx, 'Hold → run · Space/Z/W: tap = HOP, hold = JUMP · X/J: CUE SWEEP · Gamepad: A hop, X/B sweep', VIEW_W / 2, VIEW_H * 0.8, '#e8e0ff', 5);
    outlineText(ctx, '[ / ] audio latency · Esc pause · ` debug overlay', VIEW_W / 2, VIEW_H * 0.85, '#bfb4e0', 5);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    g.debug.drawScreen(ctx);
  }

  private drawEnd(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    ctx.fillStyle = 'rgba(10,6,30,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 100px ${FONT}`;
    outlineText(ctx, 'SLICE COMPLETE!', VIEW_W / 2, VIEW_H * 0.18, PAL.heroAccent, 10);
    const r = g.report();
    const gr = r.grades;
    const total = gr.perfect + gr.great + gr.good + gr.miss;
    const lines: [string, string][] = [
      ['Fortune coins', `${g.stats.lums} / ${g.stats.lumsTotal}`],
      ['Training dummies', `${g.stats.pendulums} / ${g.stats.pendulumsTotal}`],
      ['Audience on its feet', `${g.crowd.peak}`],
      ['On the beat', `${gr.perfect + gr.great + gr.good} / ${total}  (${gr.perfect} perfect, ${gr.great} great)`],
      ['Heaves', `${g.stats.heaves} / ${r.phrases}`],
      ['Falls · stumbles', `${g.stats.deaths} · ${g.stats.stumbles}`],
    ];
    ctx.font = `bold 42px ${FONT}`;
    lines.forEach(([k, v], i) => {
      ctx.textAlign = 'right';
      outlineText(ctx, k, VIEW_W / 2 - 30, VIEW_H * 0.32 + i * 64, '#cfc3ff');
      ctx.textAlign = 'left';
      outlineText(ctx, v, VIEW_W / 2 + 30, VIEW_H * 0.32 + i * 64, '#ffffff');
    });
    const pct = total > 0 ? (gr.perfect + gr.great * 0.7 + gr.good * 0.4) / total : 0;
    const cup = pct > 0.85 && g.stats.lums >= g.stats.lumsTotal * 0.9 ? 'BOX-OFFICE SMASH' : pct > 0.65 ? 'CULT CLASSIC' : pct > 0.4 ? 'B-MOVIE' : 'STRAIGHT TO VIDEO';
    ctx.textAlign = 'center';
    ctx.font = `bold 56px ${FONT}`;
    outlineText(ctx, cup, VIEW_W / 2, VIEW_H * 0.76, PAL.gold, 8);
    ctx.font = `bold 34px ${FONT}`;
    ctx.globalAlpha = 0.6 + 0.4 * g.groove.pulse(1, 0.3);
    outlineText(ctx, 'press Space / Enter to play again', VIEW_W / 2, VIEW_H * 0.87, '#ffffff');
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private drawCenterText(ctx: CanvasRenderingContext2D, title: string, sub: string): void {
    ctx.fillStyle = 'rgba(10,6,30,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 100px ${FONT}`;
    outlineText(ctx, title, VIEW_W / 2, VIEW_H * 0.45, '#ffffff', 10);
    ctx.font = `bold 36px ${FONT}`;
    outlineText(ctx, sub, VIEW_W / 2, VIEW_H * 0.56, '#cfc3ff');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
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

export function outlineText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, outline = 6): void {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a1030';
  ctx.lineWidth = outline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
