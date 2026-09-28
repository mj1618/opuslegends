/**
 * Renderer: draws the whole frame from game state (read-only) with the art lab's grindhouse toolkit.
 *
 *   MusicFeed  (music.ts)      song lanes + sections -> art BeatInfo (kick/snare/hat/.../hey, energy)
 *   Stage      (stage.ts)      42nd Street + the Honky-Tonk parallax scenes, lighting keyframes from the
 *                              level's sky cues, floors / lethal pits / doorway, film pass
 *   SlimDriver (slimDriver.ts) player state -> Slim rig poses
 *   Director   (director.ts)   the world reacts to the music (zoom-out on choruses, punches, flying stuff)
 *   skins      (entityDraw.ts) every gameplay entity in the danger language (data-driven registry)
 *   screens    (screens.ts)    title marquee, HUD, count-in leader, end-of-reel poster
 *
 * Frame order: [film weave] sky -> parallax back layers -> play-band wash -> (world transform) pits,
 * floors, doorway, awnings/crates, chalk marks, keg lifts, splices, finish, snapped cues, pendulums, tokens,
 * Bluffers, the Burn -> SLIM -> particles -> popups -> [end world] foreground layers -> director (flyers,
 * dust, flashes) -> Perfect freeze lines -> film pass -> rewind -> THEATRE (audience strip, outside the
 * film) -> cue dot -> HUD -> screens -> flash / fade -> debug.
 */
import type { BeatInfo } from '../art/core/beat';
import { drawGlow } from '../art/core/draw';
import { drawSlim } from '../art/grindhouse/slim';
import { drawTheatre } from '../art/grindhouse/theatre';
import { CF } from '../art/palette';
import type { ArtCamera } from '../art/world/camera';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import { Tun } from '../game/tunables';
import { marksOnAt } from '../level/build';
import { Director } from './director';
import {
  type EnvKind,
  type SkinCtx,
  SLAM_LIFT_PX,
  drawBarLine,
  drawBlock,
  drawBouncePad,
  drawBreakable,
  drawChaser,
  drawCueDot,
  drawFinish,
  drawJabber,
  drawKind,
  drawLowSign,
  drawPendulum,
  drawPhrase,
  drawPlatform,
  drawScansion,
  drawSlamPlatform,
  drawSplice,
  drawSpike,
  drawToken,
} from './entityDraw';
import { applyBeatReact } from './groove';
import { MusicFeed } from './music';
import { FONT, MARQUEE, drawCenterText, drawEndScreen, drawHud, drawRewind, drawTitleScreen, outlineText } from './screens';
import { SlimDriver } from './slimDriver';
import type { SpriteSet } from './sprites';
import { Stage } from './stage';

export { outlineText, roundRect } from './screens';

const KNOWN_ENEMY = new Set(['jabber']);
const KNOWN_HAZARD = new Set(['spike']);

export class Renderer {
  private game: Game;
  readonly stage: Stage;
  readonly feed: MusicFeed;
  readonly slim = new SlimDriver();
  readonly director = new Director();
  private last = NaN;
  /** presentation clock (s): runs through pauses in the music (deaths, menus) */
  private clock = 0;
  private perfectAt = -99;
  private lastFreeze = 0;
  private endAt = -1;
  private sc: SkinCtx;
  /** JS render cost (ms) samples for perf probes */
  private msSamples: number[] = [];

  constructor(game: Game, _sprites: SpriteSet) {
    this.game = game;
    this.stage = new Stage(game.display.scale);
    this.feed = new MusicFeed(game.song, game.tempo);
    this.sc = { b: this.feed.info, env: 'street', time: 0, wb: 0, swing: game.level.swing };
  }

  /** JS render cost summary (avg / p95 / max ms) since the last call */
  perf(reset = true): { frames: number; avgMs: number; p95Ms: number; maxMs: number } {
    const s = [...this.msSamples].sort((a, b) => a - b);
    if (reset) this.msSamples = [];
    if (!s.length) return { frames: 0, avgMs: NaN, p95Ms: NaN, maxMs: NaN };
    const r = (x: number) => Math.round(x * 100) / 100;
    return { frames: s.length, avgMs: r(s.reduce((a, b) => a + b, 0) / s.length), p95Ms: r(s[Math.floor(s.length * 0.95)]), maxMs: r(s[s.length - 1]) };
  }

  render(px: number, py: number): void {
    const t0 = performance.now();
    this.frame(px, py);
    if (this.msSamples.length < 20000) this.msSamples.push(performance.now() - t0);
  }

  private frame(px: number, py: number): void {
    const g = this.game;
    const ctx = g.display.beginFrame();
    this.stage.setResolution(g.display.scale);
    const nowWall = performance.now() / 1000;
    const dt = Number.isNaN(this.last) ? 1 / 60 : Math.min(0.1, Math.max(0, nowWall - this.last));
    this.last = nowWall;
    if (!g.paused) this.clock += dt;
    const b = this.feed.update(g.groove);
    const slimState = this.slim.update(g, this.clock);

    if (g.scene === 'loading' || g.scene === 'title') {
      this.stage.coldOpen = false;
      this.stage.streetLight.setBlend('neon', 'neon', 1);
      this.stage.street.update(dt);
      drawTitleScreen(ctx, g, b, this.stage, slimState, this.clock);
      g.debug.drawScreen(ctx);
      this.endAt = -1;
      return;
    }

    const L = g.level;
    const cam = g.camera;
    const cold = g.phase === 'coldOpen';
    const lightBeat = cold ? L.def.startBeat : g.conductor.playing ? g.conductor.beat : g.spawnBeat;
    this.stage.coldOpen = cold;
    this.stage.update(dt, L, lightBeat);
    this.director.active = g.scene === 'play' && g.conductor.playing && g.phase !== 'dying';
    this.director.extPulse = Math.max(this.director.extPulse, g.background.pulse > 0.9 ? g.background.pulse : 0);
    const envHere = this.stage.envAt(L, px);
    this.director.update(dt, this.feed, b, cam, envHere);
    if (g.freezeFx > this.lastFreeze + 1e-4) this.perfectAt = this.clock;
    this.lastFreeze = g.freezeFx;

    const acam: ArtCamera = { x: cam.rx, y: cam.ry, zoom: cam.rzoom };
    const w = this.stage.film.weave(b);
    ctx.save();
    ctx.translate(w.x, w.y);
    // background (shares the camera's shake rotation)
    ctx.save();
    if (cam.rangle !== 0) {
      ctx.translate(VIEW_W / 2, VIEW_H / 2);
      ctx.rotate(cam.rangle);
      ctx.translate(-VIEW_W / 2, -VIEW_H / 2);
    }
    this.stage.drawBack(ctx, L, acam, b);
    ctx.restore();

    ctx.save();
    cam.apply(ctx);
    const v = cam.viewBounds();
    this.sc.b = b;
    this.sc.time = this.clock;
    this.sc.wb = cold ? L.def.startBeat : g.worldBeat;
    this.drawLevel(ctx, v.x0, v.x1, v.y0, v.y1, b);
    // SLIM
    if (!(g.player.mode === 'dead' && g.fade > 0.5)) {
      // the projector's follow-spot on the star (night scenes) + a contact shadow: Slim always pops
      const Lh = this.stage.light(envHere);
      const night = Math.max(0, Math.min(1, Lh.lamps * 1.2 - 0.2));
      if (night > 0.05) drawGlow(ctx, px, py - 80, CF.beamHaze, 190, 0.2 * night);
      const gy = L.surfaceYNear(px);
      const lift = Math.max(0, gy - py);
      if (!Number.isNaN(L.floorYAt(px)) && lift < 400) {
        ctx.fillStyle = `rgba(13,10,8,${0.4 * (1 - lift / 400)})`;
        ctx.beginPath();
        ctx.ellipse(px, gy + 2, 46 * (1 - lift / 800), 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = this.slim.alpha;
      drawSlim(ctx, px, py, slimState);
      ctx.globalAlpha = 1;
    }
    g.particles.draw(ctx, v.x0, v.x1);
    this.drawPopups(ctx);
    g.debug.drawWorld(ctx, v);
    ctx.restore();

    ctx.save();
    if (cam.rangle !== 0) {
      ctx.translate(VIEW_W / 2, VIEW_H / 2);
      ctx.rotate(cam.rangle);
      ctx.translate(-VIEW_W / 2, -VIEW_H / 2);
    }
    this.stage.drawFront(ctx, L, acam, b);
    ctx.restore();
    this.director.draw(ctx, b);
    ctx.restore();

    // screen-space: hero position for the replay burst / audience ripple
    const hsx = VIEW_W / 2 + (px - cam.rx) * cam.rzoom;
    // (the Perfect replay burst is drawn by the Slim rig itself: s.perfect)
    const ppb = L.ppb;
    const damage = g.chaser.active ? Math.max(0, Math.min(1, 1 - (g.player.x - g.chaser.x) / (3.5 * ppb))) : 0;
    this.stage.film.draw(ctx, b, { amount: 1, damage });
    if (g.phase === 'dying') drawRewind(ctx, Math.min(1, g.deathProgress * 1.4), this.clock);
    // the theatre (outside the film): the audience strip is the streak meter
    const enforcers = L.enemies.filter((e) => !e.alive && !e.heaved).length;
    drawTheatre(ctx, b, {
      standing: g.crowd.awake ? g.crowd.count : 0,
      heroX: hsx,
      perfectT: this.clock - this.perfectAt < 2 ? this.clock - this.perfectAt : undefined,
      enforcers,
      light: this.stage.light(envHere),
    });
    let cue = 0;
    for (const cp of L.checkpoints) cue = Math.max(cue, cp.flash);
    drawCueDot(ctx, cue);
    drawHud(ctx, g, b);
    if (g.scene === 'end') {
      if (this.endAt < 0) this.endAt = this.clock;
      drawEndScreen(ctx, g, b, slimState, this.clock, this.clock - this.endAt);
    } else this.endAt = -1;
    if (g.paused) drawCenterText(ctx, 'INTERMISSION', 'press Enter / Space to resume');

    if (g.flash > 0.001) {
      ctx.globalAlpha = Math.min(1, g.flash);
      ctx.fillStyle = g.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    if (g.fade > 0.001) {
      ctx.globalAlpha = Math.min(1, g.fade);
      ctx.fillStyle = CF.filmBlack;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    g.debug.drawScreen(ctx);
  }

  // ------------------------------------------------------------------ world

  private env(x: number): EnvKind {
    return this.stage.envAt(this.game.level, x);
  }

  private drawLevel(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, b: BeatInfo): void {
    const g = this.game;
    const L = g.level;
    const gr = g.groove;
    const sc = this.sc;
    const wb = sc.wb;
    const pitY = Tun.flow.pitY;

    // ground, puddles, lethal pits, the bar's front door
    this.stage.drawDoorways(ctx, L, x0, x1, b);
    this.stage.drawGround(ctx, L, x0, x1, y1, b);

    // awnings / shelves, crates
    for (const s of L.platforms) {
      if (s.x + s.w < x0 || s.x > x1) continue;
      drawPlatform(ctx, s.x, s.y, s.w, s.h, this.env(s.x + s.w / 2), b);
    }
    for (const s of L.blocks) {
      if (s.x + s.w < x0 || s.x > x1) continue;
      drawBlock(ctx, s.x, s.y, s.w, s.h);
    }

    // chalk: bar lines on every downbeat (quiet metronome) + scansion marks + Hup-Hup-HEY phrases
    const bpb = g.tempo.beatsPerBar;
    const ppb = L.ppb;
    const barPulse = gr.pulse(4, 0.4);
    for (let bb = Math.ceil(x0 / ppb / bpb) * bpb; bb * ppb < x1; bb += bpb) {
      const fy = L.floorYAt(bb * ppb);
      if (!Number.isNaN(fy)) drawBarLine(ctx, bb * ppb, fy, Math.abs(gr.beat - bb) < 0.5 ? barPulse : 0);
    }
    const markY = (a: { x: number; groundY: number }) => {
      const slam = L.slams.find((f) => a.x >= f.solid.x && a.x <= f.solid.x + f.solid.w);
      return slam ? slam.solid.y + 20 - slam.lift * SLAM_LIFT_PX : a.groundY + 44;
    };
    for (const a of L.actions) {
      if (a.x < x0 - 50 || a.x > x1 + 50 || a.glyph === 'none' || !marksOnAt(L, a.beat)) continue;
      const d = gr.beat - a.beat;
      const lit = d > -0.35 && d < 0.6 ? 1 - Math.abs(d) / 0.6 : 0;
      drawScansion(ctx, a.glyph, a.x, markY(a), lit, g.judge.gradeAt(a.beat, a.type) === 'perfect');
    }
    for (const ph of L.phrases) {
      const xs = ph.beats.map((bt) => bt * ppb) as [number, number, number];
      if (xs[2] < x0 - 100 || xs[0] > x1 + 100 || !marksOnAt(L, ph.beats[0])) continue;
      const fy = L.floorYAt(xs[0]);
      const lit = ph.beats.map((bt) => {
        const d = gr.beat - bt;
        return d > -0.35 && d < 0.6 ? 1 - Math.abs(d) / 0.6 : 0;
      });
      const done = ph.beats.every((bt, i) => g.judge.gradeAt(bt, i === 2 ? 'strike' : 'jump') !== null && g.judge.gradeAt(bt, i === 2 ? 'strike' : 'jump') !== 'miss');
      drawPhrase(ctx, xs, (Number.isNaN(fy) ? 0 : fy) + 44, lit, done);
    }

    // cellar keg lifts
    for (const f of L.slams) {
      const s = f.solid;
      if (s.x + s.w < x0 - 40 || s.x > x1 + 40) continue;
      const slam = f.lift === 0 ? gr.pulse(1, 0.2) : 0;
      drawSlamPlatform(ctx, s.x, s.y, s.w, s.h, f.lift, pitY, slam, b);
    }

    // checkpoints: film splices ("SC. <bar>")
    for (const cp of L.checkpoints) {
      if (cp.x < x0 - 200 || cp.x > x1 + 200) continue;
      const fy = L.floorYAt(cp.x);
      drawSplice(ctx, cp.x, y0, y1, cp.reached, cp.flash, `SC. ${Math.round(cp.beat / bpb)}`, Number.isNaN(fy) ? 0 : fy);
    }

    // finish
    if (L.finishX > x0 - 300 && L.finishX < x1 + 300) {
      const fy = L.floorYAt(L.finishX - 1);
      drawFinish(ctx, L.finishX, Number.isNaN(fy) ? 0 : fy, b);
    }

    // hazards: snapped cues (stumble) + any new hazard kind via its skin
    for (const h of L.hazards) {
      const cx = h.vis.x + h.vis.w / 2 + h.offX;
      if (cx < x0 - 100 || cx > x1 + 100) continue;
      if (!h.alive && h.offY > 900) continue;
      const pulse = h.alive ? gr.pulse(1, 0.25) : 0;
      const fy = h.vis.y + h.vis.h + h.offY;
      if (KNOWN_HAZARD.has(h.kind)) drawSpike(ctx, cx, fy, pulse, h.rot);
      else drawKind(ctx, h.kind, { x: cx, y: fy, w: h.vis.w, h: h.vis.h }, { ...sc, env: this.env(cx) }, 'stumble');
    }

    // pendulum targets (reward)
    for (const f of L.pendulums) {
      if (f.pivotX < x0 - 250 || f.pivotX > x1 + 250) continue;
      if (f.struck && f.struckT > 0.5) continue;
      const toBottom = wb - f.beat;
      sc.env = this.env(f.pivotX);
      drawPendulum(
        ctx,
        {
          pivotX: f.pivotX,
          pivotY: f.pivotY,
          x: f.x,
          y: f.y,
          r: f.r,
          big: f.big,
          glint: f.struck ? 0 : Math.max(0, 1 - Math.abs(toBottom + 1) / 0.3),
          bottom: f.struck ? 0 : Math.max(0, 1 - Math.abs(toBottom) / 0.35),
          struckT: f.struck ? f.struckT : NaN,
          seed: f.id,
          viewTop: y0,
        },
        sc,
      );
    }

    // breakables (reward: gold rim, glint the beat before), bounce pads (launch), low signs (stumble: slide under)
    for (const bk of L.breakables) {
      if (bk.x < x0 - 150 || bk.x > x1 + 150 || (bk.broken && bk.brokenT > 0.45)) continue;
      sc.env = this.env(bk.x);
      drawBreakable(
        ctx,
        {
          x: bk.x,
          y: bk.y,
          r: bk.r,
          baseY: bk.baseY,
          high: bk.high,
          big: bk.big,
          look: bk.look,
          glint: bk.broken ? 0 : Math.max(0, 1 - Math.abs(wb - bk.beat + 1) / 0.3),
          now: bk.broken ? 0 : Math.max(0, 1 - Math.abs(wb - bk.beat) / 0.35),
          brokenT: bk.broken ? bk.brokenT : NaN,
          seed: bk.id,
          viewTop: y0,
        },
        sc,
      );
    }
    for (const bp of L.bouncePads) if (bp.x > x0 - 300 && bp.x < x1 + 300) drawBouncePad(ctx, bp.x, bp.y, bp.w, bp.kick, this.env(bp.x), b);
    for (const sg of L.signs) {
      const r = sg.rect;
      if (r.x + r.w < x0 - 50 || r.x > x1 + 50) continue;
      drawLowSign(ctx, r.x, r.y, r.w, r.h, sg.swing, sg.hit, b, y0);
    }

    // tokens: each leaps on its own beat so rows ripple in time
    for (const l of L.lums) {
      if (l.x < x0 - 60 || l.x > x1 + 60 || l.skipped) continue;
      if (l.collected) {
        const t = l.collectT;
        if (t > 0.35) continue;
        const k = t / 0.35;
        drawToken(ctx, l.x, l.y - 80 * k, l.angle - 0.8 * k, 1 + k * 0.7, 1, 1 - k);
        continue;
      }
      const own = gr.pulse(1, 0.18, l.beat % 1);
      const bob = -8 * (1 - gr.bounce(1, l.beat % 1));
      drawToken(ctx, l.x, l.y + bob, l.angle + Math.sin(gr.beat * Math.PI + l.x) * 0.12, 1 + 0.18 * own, own);
    }
    for (const h of g.loose) {
      if (h.collected) continue;
      const blink = h.t > 0 && h.expires - g.simTime < 0.6 ? (Math.floor(h.t * 12) % 2 ? 0.35 : 1) : 1;
      drawToken(ctx, h.x, h.y, Math.sin(h.t * 6) * 0.4, 1, 0.5, blink);
    }

    // Bluffers: flex on the swung "and", jab on the beat, WIND-UP TELL in the beat before their jab
    const off = gr.beat - Math.floor(gr.beat);
    const flexK = Math.max(0, 1 - Math.abs(off - L.swing) / 0.3);
    for (const e of L.enemies) {
      if (e.x < x0 - 250 || e.x > x1 + 250) continue;
      if ((!e.alive || e.retired) && e.deadTime > 2.2) continue;
      const live = e.alive && !e.retired;
      if (!KNOWN_ENEMY.has(e.kind)) {
        drawKind(ctx, e.kind, { x: e.x, y: e.y, w: e.w, h: e.h }, { ...sc, env: this.env(e.x) }, 'stumble');
        continue;
      }
      const r = live ? applyBeatReact(e.react, gr) : { sx: 1, sy: 1, dy: 0, flash: 0 };
      const toJab = e.beat - wb;
      // struck: knocked toward the camera into the front row (grows a little, then fades so it never hides Slim)
      const scale = e.heaved ? Math.max(0.15, 1 - e.deadTime * 0.9) : !e.alive ? 1 + Math.min(0.7, e.deadTime * 1.1) : 1;
      const fade = !e.alive && !e.heaved ? Math.max(0, 1 - Math.max(0, e.deadTime - 0.3) / 0.35) : 1;
      if (fade <= 0.01) continue;
      ctx.globalAlpha = fade;
      drawJabber(ctx, e.x, e.y + r.dy, {
        flex: live ? flexK : 0,
        jab: live ? Math.min(1, e.jabT / 0.12) : 0,
        windup: live && toJab > 0 && toJab < 1 ? 1 - toJab : 0,
        flying: e.retired && e.alive,
        dead: !e.alive,
        rot: e.rot,
        scale,
        squash: r.sx - 1,
        time: this.clock,
        seed: e.id,
      });
      ctx.globalAlpha = 1;
      if (e.hitFlash > 0) {
        ctx.globalAlpha = e.hitFlash;
        ctx.fillStyle = CF.cream;
        ctx.beginPath();
        ctx.arc(e.x, e.y - e.h / 2, 60 * (1.4 - e.hitFlash * 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // the Burn: the film burning in from the left (lethal)
    if (g.chaser.active && g.chaser.x > x0 - 800) {
      const riseK = Math.min(1, (wb - g.chaser.riseBeat) / Tun.chaser.riseBeats);
      const surge = Math.sin(Math.PI * Math.min(1, riseK)) * 0.8 * ppb;
      const lagBeats = Number.isFinite(g.player.musicX) ? (g.player.musicX - g.player.x) / ppb : 0;
      const showX = g.chaser.x + (riseK < 1 && lagBeats < 0.3 ? surge : 0);
      drawChaser(ctx, showX, y0 - 100, this.clock, y1 + 100);
    }
  }

  private drawPopups(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    if (!g.popups.length) return;
    ctx.font = `38px ${MARQUEE}`;
    ctx.textAlign = 'center';
    for (const p of g.popups) {
      ctx.globalAlpha = Math.max(0, 1 - p.t);
      outlineText(ctx, p.text, p.x, p.y - 60 * p.t, p.color, 6);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    void FONT;
  }
}
