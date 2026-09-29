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
import { drawTheatre } from '../art/grindhouse/theatre';
import type { SlimState } from '../art/grindhouse/slim';
import { CF } from '../art/palette';
import type { ArtCamera } from '../art/world/camera';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import { Tun } from '../game/tunables';
import { marksOnAt } from '../level/build';
import { drawBreakable, pickLook } from './breakables';
import { Burn } from './burn';
import { Director } from './director';
import { Feedback } from './feedback';
import { drawJamLine } from './jamline';
import { Moments } from './moments';
import {
  type EnvKind,
  type SkinCtx,
  SLAM_LIFT_PX,
  drawBarLine,
  drawBlock,
  drawBouncePad,
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
import { drawMech } from './mechDraw';
import { Act3Art, ENDING, ENDING_LEAD } from './act3Draw';
import { drawJimFist } from '../art/grindhouse/bigjim';
import { drawBench } from '../art/grindhouse/poolroom';
import { MusicFeed } from './music';
import { FONT, MARQUEE, POSTER_STAMP_AT, drawCenterText, drawEndScreen, drawHud, drawRewind, drawTitleScreen, outlineText } from './screens';
import { drawCalibration } from './calibDraw';
import { SlimDriver } from './slimDriver';
import { HeroPass } from './heroPass';
import { drawSpeedLayer, foregroundMusician } from './speedLayer';
import { GoonBand } from './band';
import { goonPartAt } from '../audio/goonParts';
import { drawCanister } from './canisterDraw';
import type { SpriteSet } from './sprites';
import { Stage } from './stage';
import { VisualBeats } from './beats';
import { ColourReel, VIVID_BEATS } from './intro';
import { SlimSign } from './slimSign';

export { outlineText, roundRect } from './screens';

const easeOutK = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);

const KNOWN_ENEMY = new Set(['jabber']);
const KNOWN_HAZARD = new Set(['spike']);

export class Renderer {
  private game: Game;
  readonly stage: Stage;
  readonly feed: MusicFeed;
  readonly slim = new SlimDriver();
  /** Slim's own pass: after the light layer, with a rim light (render/heroPass.ts) */
  readonly hero = new HeroPass();
  readonly band = new GoonBand();
  /** the part each Bluffer plays along to (render/band.ts partAt), per level */
  private goonParts = new Map<number, { part: string; lane: string }>();
  private goonPartsKey: unknown = null;
  readonly director = new Director();
  readonly feedback = new Feedback();
  readonly burn = new Burn();
  readonly act3 = new Act3Art();
  /** the long rooms' mid-act visual beats (render/beats.ts) */
  readonly beats = new VisualBeats();
  /** the silent-film intro that floods to colour on the first HEY (render/intro.ts) */
  readonly colour = new ColourReel();
  /** the roof's neon sign rewritten BIG JIM'S → SLIM by the stop-time strikes (render/slimSign.ts) */
  readonly sign = new SlimSign();
  readonly moments: Moments;
  /** level design tags ('mode' items: street, rooftops, launch, ...) sorted by beat — picks breakable families */
  private modes: { beat: number; mode: string }[] = [];
  private burnFlare = 0;
  private lastStumbles = 0;
  private last = NaN;
  /** presentation clock (s): runs through pauses in the music (deaths, menus) */
  private clock = 0;
  private perfectAt = -99;
  private lastFreeze = 0;
  private endAt = -1;
  private sc: SkinCtx;
  /** the final hit's freeze-frame (a copy of the backing store; allocated ahead by prewarm) */
  private freezeCv: HTMLCanvasElement | null = null;
  private frozen = false;
  private frozenHero: [number, number] = [0, 0];
  private frozenHit: [number, number] = [0, 0];
  /** the camera + Slim locked on the final hit (render-only, from the freeze on) */
  private lock: { rx: number; ry: number; rz: number; px: number; py: number; pose: SlimState['pose']; pt: number; fx: number; fy: number } | null = null;
  /** JS render cost (ms) samples for perf probes */
  private msSamples: number[] = [];

  constructor(game: Game, _sprites: SpriteSet) {
    this.game = game;
    this.stage = new Stage(game.display.scale);
    this.feed = new MusicFeed(game.song, game.tempo);
    this.sc = { b: this.feed.info, env: 'street', time: 0, wb: 0, swing: game.level.swing };
    this.moments = new Moments(game);
  }

  private modeAt(beat: number): string {
    const L = this.game.level;
    if (this.modes.length === 0 || (this.modes as unknown as { src?: unknown }).src !== L) {
      const m = L.def.items.filter((it) => it.type === 'mode') as { beat: number; mode: string }[];
      this.modes = [...m].sort((a, b) => a.beat - b.beat);
      (this.modes as unknown as { src?: unknown }).src = L;
    }
    let cur = '';
    for (const m of this.modes) {
      if (m.beat > beat) break;
      cur = m.mode;
    }
    return cur;
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
      if (g.scene === 'title') this.warm(ctx, b);
      g.debug.drawScreen(ctx);
      this.endAt = -1;
      return;
    }

    const L = g.level;
    const cam = g.camera;
    const cold = g.phase === 'coldOpen';
    const lightBeat = cold ? L.def.startBeat : g.conductor.playing ? g.conductor.beat : g.spawnBeat;
    this.stage.coldOpen = cold;
    this.stage.chorus = this.moments.shotK;
    this.stage.climb = Math.max(0, -250 - cam.ry);
    this.stage.update(dt, L, lightBeat);
    this.director.active = g.scene === 'play' && g.conductor.playing && g.phase !== 'dying';
    this.director.extPulse = Math.max(this.director.extPulse, g.background.pulse > 0.9 ? g.background.pulse : 0);
    const envHere = this.stage.envAt(L, px);
    this.director.update(dt, this.feed, b, cam, envHere);
    const wbNow = cold ? L.def.startBeat : g.worldBeat;
    this.moments.update(g, dt, this.feed, cam, wbNow, this.director.active);
    this.beats.update(g, cam, this.director, this.director.active ? this.stage.envAt(L, g.player.x) : '', wbNow);
    this.director.brawl = this.beats.brawling;
    this.feedback.update(g, g.paused ? 0 : dt);
    if (g.stats.stumbles > this.lastStumbles) this.burnFlare = 1;
    this.lastStumbles = g.stats.stumbles;
    this.burnFlare *= Math.exp(-dt / 0.6);
    if (g.freezeFx > this.lastFreeze + 1e-4) this.perfectAt = this.clock;
    this.lastFreeze = g.freezeFx;

    // pre-warm the scenes (+ the finale's freeze buffer) while nothing is at stake: cold open, count-in, pauses
    if (cold || g.phase === 'countIn' || g.paused) this.warm(ctx, b);
    // act 3's finale: seconds since the FINAL HIT (NaN before it); the frame freezes on the strike (see below), then the
    // camera + Slim stay LOCKED on the blow (render-only) while Big Jim flies off
    this.act3.track(g, this.clock);
    const hitT = this.act3.hitT(this.clock);
    if (!(hitT >= 0)) {
      this.frozen = false;
      this.lock = null;
    }
    const loom = this.act3.loomK(g);
    if (loom > 0 && !this.lock) {
      // the finale's push-in: Slim and Big Jim's face fill the frame for the last Hup-Hup-HEY
      cam.momentZoom += 0.24 * loom;
    }
    if (this.lock && hitT >= 0) {
      const Lk = this.lock;
      const push = 1 + 0.14 * easeOutK(Math.max(0, Math.min(1, (hitT - ENDING.hold) / 0.9)));
      const sh = hitT < 0.8 ? (1 - hitT / 0.8) ** 2 * 22 : 0;
      cam.rzoom = Lk.rz * push;
      cam.rx = Lk.rx + (Lk.fx - Lk.rx) * (1 - 1 / push) + sh * Math.sin(hitT * 71);
      cam.ry = Lk.ry + (Lk.fy - Lk.ry) * (1 - 1 / push) + sh * Math.cos(hitT * 53);
      px = Lk.px;
      py = Lk.py;
      slimState.pose = Lk.pose;
      slimState.poseTime = Lk.pt + 0.22 * Math.max(0, hitT - ENDING.hold);
    }
    const acam: ArtCamera = { x: cam.rx, y: cam.ry, zoom: cam.rzoom };
    // THE COLOUR REEL: where the colour floods out of (the struck target on the burst beat, else Slim)
    const colBeat = this.colour.burstBeat(L);
    const sepia = !Number.isNaN(colBeat) && wbNow < colBeat + VIVID_BEATS;
    if (sepia) {
      const o = this.colour.originWorld() ?? { x: px, y: py - 80 };
      this.colour.ox = VIEW_W / 2 + (o.x - cam.rx) * cam.rzoom;
      this.colour.oy = VIEW_H / 2 + (o.y - cam.ry) * cam.rzoom;
    }
    this.syncAct3(envHere);
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
    drawJamLine(
      ctx,
      acam,
      b,
      (e) => this.stage.light(e as EnvKind),
      (x) => this.stage.envAt(L, x),
      this.feed.energy,
      this.feed.chorus,
      (x) => Number.isNaN(L.floorYAt(x)),
      (e) => this.stage.sceneCam(L, e as EnvKind, acam),
    );
    // THE GOON BAND: goons playing the record's parts just behind the play band (render/band.ts)
    if (!cold) this.band.draw(ctx, g, cam, this.feed, b, (x) => this.stage.envAt(L, x), (e) => this.stage.light(e as EnvKind), dt, this.colour.bandOn(wbNow));
    // the silent film: the background in heavy sepia until the colour burst
    if (sepia) {
      this.colour.grade(ctx, wbNow, 0.92);
      this.colour.vivid(ctx, wbNow, 0.5);
    }
    // CHORUS CONTRAST (iteration 7, review iter6 fix 10: chorus 1 and the Lanes read muddy): in the honky-tonk and the
    // Lanes the chorus SHOT darkens the room behind the play band (a multiply grade, heaviest at the top and under the
    // floor line), the floors get a key light and the rewards a halo (drawLevel: this.keyK)
    this.keyK = envHere === 'bar' || envHere === 'lanes' ? Math.max(0, Math.min(1, this.moments.shotK)) : 0;
    if (this.keyK > 0.01) this.chorusGrade(ctx, this.keyK, envHere, VIEW_H / 2 + (py - cam.ry) * cam.rzoom, cam.rzoom);
    this.moments.gelScale = envHere === 'roof' ? 0.15 : envHere === 'theatre' ? 0 : 1;
    this.moments.drawBehind(ctx, b);
    this.beats.drawBehind(ctx, b, cam.rx);
    ctx.restore();

    ctx.save();
    cam.apply(ctx);
    const v = cam.viewBounds();
    this.sc.b = b;
    this.sc.time = this.clock;
    this.sc.wb = cold ? L.def.startBeat : g.worldBeat;
    this.act3.behind(ctx, g, cam, v.x0, v.x1, this.stage.light(envHere), b, this.clock); // act 3: Big Jim (render/act3Draw.ts)
    this.beats.drawWorld(ctx, g, b, v.x0, v.x1); // the facade's window chase / tenants (render/beats.ts)
    // THE ROOF SIGN (screen space, over the facade's lit windows): a far rooftop neon rewritten by the stop-time strikes
    ctx.restore();
    this.sign.draw(ctx, g, b, wbNow, px, cam.rzoom, VIEW_W / 2 + (px - cam.rx) * cam.rzoom, VIEW_H / 2 + (py - cam.ry) * cam.rzoom);
    ctx.save();
    cam.apply(ctx);
    this.drawLevel(ctx, v.x0, v.x1, v.y0, v.y1, b);
    ctx.restore();
    // screen-space: hero position for the replay burst / audience ripple / the light layer
    const hsx = VIEW_W / 2 + (px - cam.rx) * cam.rzoom;
    const hsy = VIEW_H / 2 + (py - cam.ry) * cam.rzoom;
    this.moments.heroSx = hsx;
    this.moments.heroSy = hsy;
    // the silent film's play layer: lighter sepia (the rewards keep a glint of gold; Slim, drawn after, stays in colour)
    if (sepia) this.colour.grade(ctx, wbNow, 0.62);
    // THE LIGHT LAYER (iteration 6): spotlights, follow-spots, flashes, blooms — all UNDER the star, so they light the
    // scene around Slim and never bleach his tangerine
    this.moments.drawLight(ctx);
    this.beats.drawFront(ctx, b, hsx, hsy);
    this.director.drawLight(ctx);
    ctx.save();
    cam.apply(ctx);
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
      // his rim light takes the scene's rim colour, pushed toward cream
      const rim = Lh.rim;
      this.hero.rim = `rgb(${Math.round(255 * 0.55 + rim[0] * 0.45)},${Math.round(240 * 0.55 + rim[1] * 0.45)},${Math.round(214 * 0.55 + rim[2] * 0.45)})`;
      this.hero.draw(ctx, px, py, slimState, this.slim.alpha);
    }
    g.particles.draw(ctx, v.x0, v.x1);
    this.moments.drawWorld(ctx);
    // (the stamps sit out the finale: the HUD is gone from 332, the KNOCKOUT! is the only word on the screen)
    if (this.act3.hudAlpha(g) > 0.5) this.feedback.drawWorld(ctx);
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
    // SPEED: the foreground whip (parallax 1.6, never over the lane) + margin speed lines at full run (render/speedLayer.ts)
    if (!cold && g.scene === 'play') {
      const p = g.player;
      const fy = L.surfaceYNear(px);
      drawSpeedLayer(
        ctx,
        {
          camX: cam.rx,
          zoom: cam.rzoom,
          groundSy: VIEW_H / 2 + ((Number.isNaN(fy) ? py : Math.max(fy, py)) - cam.ry) * cam.rzoom,
          heroSy: VIEW_H / 2 + (py - cam.ry) * cam.rzoom,
          env: envHere,
          L: this.stage.light(envHere),
          ppb: L.ppb,
          speedK: p.mode === 'dead' || !g.conductor.playing ? 0 : Math.min(1, Math.max(0, p.vx / Math.max(1, p.runSpeed))),
          boost: Math.max(this.feed.chorus ? 1 : 0, this.moments.launchK, Math.min(1, Math.max(0, p.vx / Math.max(1, p.runSpeed) - 1) / 0.12)),
        },
        b,
        (this.colour.bandOn(wbNow) ? foregroundMusician(cam.rx, cam.rzoom, L.ppb, envHere, this.feed, b, this.stage.light(envHere), true, (x) => !Number.isNaN(L.floorYAt(x))) : null) ?? undefined,
      );
    }
    this.drawRevealCurtain(ctx, cam, g.worldBeat);
    ctx.restore();
    if (sepia) {
      this.colour.drawBurst(ctx, wbNow, b);
      if (wbNow >= colBeat && wbNow < colBeat + 0.12) this.director.punch = Math.max(this.director.punch, 0.06);
    }
    this.drawWhew(ctx, this.feedback.whewT, hsx, hsy, cam.rzoom);
    this.moments.drawScreen(ctx, b, (x, y) => [VIEW_W / 2 + (x - cam.rx) * cam.rzoom, VIEW_H / 2 + (y - cam.ry) * cam.rzoom]);
    this.director.draw(ctx, b);
    this.feedback.drawScratches(ctx, hsx, hsy, cam.rzoom);
    // act 3: the hush, the finale's iris, THE END, the victory (render/act3Draw.ts)
    this.act3.screen(ctx, g, (x, y) => [VIEW_W / 2 + (x - cam.rx) * cam.rzoom, VIEW_H / 2 + (y - cam.ry) * cam.rzoom], hsx, hsy, b, this.clock, this.stage.light(envHere));
    ctx.restore();

    // (the Perfect replay burst is drawn by the Slim rig itself: s.perfect)
    const ppb = L.ppb;
    const damage = g.chaser.active ? Math.max(0, Math.min(1, 1 - (g.player.x - g.chaser.x) / (3.5 * ppb))) : 0;
    this.stage.film.draw(ctx, b, { amount: 1, damage });
    // THE BURN: the print melting in from the left edge (always on screen once risen)
    if (g.chaser.active) {
      const th = (g.chaser as { threat?: number }).threat;
      const burnThreat = typeof th === 'number' ? th : Math.max(0, Math.min(1, (Tun.chaser.restGap - g.chaser.gap) / 0.75));
      const riseK = Math.max(0, Math.min(1, (this.sc.wb - g.chaser.riseBeat) / Tun.chaser.riseBeats));
      const last = g.stats.deathLog[g.stats.deathLog.length - 1];
      const eat = g.phase === 'dying' && last?.cause === 'chaser' ? Math.min(1, g.deathProgress * 1.6) : 0;
      this.burn.draw(
        ctx,
        {
          realX: VIEW_W / 2 + (g.chaser.x - cam.rx) * cam.rzoom,
          heroX: hsx,
          rise: riseK,
          // (iteration 6: it only surges / flares when it is actually pulled in from its rest — `threat`; at rest a drum
          // fill is a small pulse, so the one real threat never cries wolf)
          lunge: this.director.active ? Math.max(g.chaser.lunge ?? 0, this.feed.fill * (0.6 + 0.4 * this.feed.fillStrength) * (0.15 + 0.85 * burnThreat)) : 0,
          flare: Math.max(this.burnFlare, (g.chaser.flare ?? 0) * (0.3 + 0.7 * burnThreat)),
          eat,
          t: this.clock,
        },
        b,
      );
    }
    if (g.phase === 'dying') drawRewind(ctx, Math.min(1, g.deathProgress * 1.4), this.clock);
    // THE FINAL HIT: freeze-frame the strike (a copy of the finished film frame), push in on Slim, then act 3's post:
    // light burst, the iris slamming shut on him, THE END, the victory (render/act3Draw.ts)
    if (hitT >= 0) {
      // freeze on the strike's contact (a late / early swing still gets its frame; no swing: freeze anyway at 0.22 s)
      if (!this.frozen && hitT >= ENDING.freeze) {
        const fh = L.breakables.find((k) => k.look === 'finalHit');
        if (!fh || (fh.broken && fh.brokenT >= 0.02) || hitT >= 0.2) {
          this.freezeFrame(ctx, hsx, hsy);
          this.frozenHit = fh ? [VIEW_W / 2 + (fh.x - cam.rx) * cam.rzoom, VIEW_H / 2 + (fh.y - cam.ry) * cam.rzoom] : [hsx + 150, hsy - 110];
          const ft = this.act3.finalTarget(g);
          this.lock = { rx: cam.rx, ry: cam.ry, rz: cam.rzoom, px, py, pose: slimState.pose, pt: slimState.poseTime, fx: ft ? (px + ft.x) / 2 : px, fy: ft ? (py + ft.y) / 2 - 60 : py - 100 };
        }
      }
      const [fx, fy] = this.frozen ? this.frozenHero : [hsx, hsy];
      // THE HITSTOP: the contact frame holds (a jolt on its first frames), then the live world resumes locked on the blow
      if (this.frozen && hitT < ENDING.hold && this.freezeCv) {
        const jolt = hitT - ENDING.freeze < 0.07 ? 1.035 : 1;
        const [ox, oy] = this.frozenHit;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(jolt, jolt);
        ctx.translate(-ox, -oy);
        ctx.drawImage(this.freezeCv, 0, 0, VIEW_W, VIEW_H);
        ctx.restore();
      }
      this.act3.post(ctx, g, hitT, fx, fy, this.frozen ? this.frozenHit : [fx + 150, fy - 110], b, this.clock, this.stage.light(envHere));
      if (hitT >= ENDING.shut) this.stage.film.draw(ctx, b, { amount: 0.7 });
    }
    // the theatre around the film in the finale: curtains over its edges + the marquee cut-in
    this.act3.hall(ctx, g, b, this.clock);
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
    this.act3.eruption(ctx, hitT, b);
    // the HUD fades out for the finale (332 on) and stays off through THE END, the victory and the poster
    const hudA = this.act3.hudAlpha(g);
    if (hudA > 0.01) {
      drawHud(ctx, g, b, hudA);
      if (g.scene === 'play' && g.phase !== 'coldOpen') {
        ctx.globalAlpha = hudA;
        this.feedback.drawCombo(ctx, g.groove.pulse(1, 0.25));
        ctx.globalAlpha = 1;
      }
    }
    if (g.scene === 'end') {
      if (this.endAt < 0) this.endAt = this.clock;
      // act 3's ending (THE END -> the victory iris) plays out in the theatre before the poster prints
      const T = this.clock - this.act3.hitClock;
      const hold = Number.isFinite(T) && T < ENDING.poster ? ENDING.poster - T : 0;
      if (hold <= 0) drawEndScreen(ctx, g, b, slimState, this.clock, this.clock - this.endAt - (Number.isFinite(T) ? Math.max(0, ENDING.poster - (this.endAt - this.act3.hitClock)) : 0));
    } else this.endAt = -1;
    this.endingCues(g, hitT);
    if (g.paused && !g.calib.active) drawCenterText(ctx, 'INTERMISSION', 'Enter / Space: resume  ·  X: re-sync the projector (audio lag)');
    drawCalibration(ctx, g);

    // (the finale owns its own light: no game flash over the final hit's burst / freeze)
    if (g.flash > 0.001 && !(this.act3.curtainK(g) > 0 && g.worldBeat > 339)) {
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

  private cueFired = { theEnd: false, stamp: false };
  /** 0..1 the chorus contrast pass (key light on the floors, halos on the rewards) */
  private keyK = 0;

  /** the chorus contrast grade over the background (screen space): multiply, lightest around the play band */
  private chorusGrade(g: CanvasRenderingContext2D, k: number, env: string, heroY: number, z: number): void {
    const dark = env === 'lanes' ? [52, 40, 78] : [58, 44, 38];
    const band = [236, 226, 216];
    const c = (rgb: number[], w: number) => `rgb(${rgb.map((v) => Math.round(255 + (v - 255) * w * k)).join(',')})`;
    const top = heroY - 260 * z;
    const floor = heroY + 40 * z;
    const gr = g.createLinearGradient(0, 0, 0, VIEW_H);
    gr.addColorStop(0, c(dark, 1));
    gr.addColorStop(Math.max(0.01, Math.min(0.9, top / VIEW_H)), c(band, 1));
    gr.addColorStop(Math.max(0.02, Math.min(0.95, floor / VIEW_H)), c(band, 1));
    gr.addColorStop(Math.max(0.03, Math.min(0.99, (floor + 120 * z) / VIEW_H)), c(dark, 1));
    gr.addColorStop(1, c(dark, 1));
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = gr;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.restore();
  }

  /**
   * THE ENDING's audio hooks (iteration 7): the renderer owns the ending's clock, so it tells the audio when its two
   * picture beats land, on `game.events` (payloads documented in render/act3Draw.ts ENDING):
   *   'theEnd'      { inS, beat }          the iris has shut, THE END card starts (hit + ENDING.shut)
   *   'posterStamp' { inS, letter, tier }  the poster's RANK stamp slams down (poster start + POSTER_STAMP_AT)
   * Each fires once per run, ENDING_LEAD s early at most (`inS` = seconds until the moment: schedule on the audio clock).
   */
  private endingCues(g: Game, hitT: number): void {
    const F = this.cueFired;
    if (!(hitT >= 0) && g.scene !== 'end') {
      F.theEnd = F.stamp = false;
      return;
    }
    const emit = (type: string, e: unknown) => (g.events as unknown as { emit(t: string, e: unknown): void }).emit(type, e);
    if (!F.theEnd && hitT >= ENDING.shut - ENDING_LEAD) {
      F.theEnd = true;
      emit('theEnd', { inS: Math.max(0, ENDING.shut - hitT), beat: g.worldBeat });
    }
    if (F.stamp || g.scene !== 'end' || this.endAt < 0) return;
    const posterAt = Number.isFinite(this.act3.hitClock) ? Math.max(this.act3.hitClock + ENDING.poster, this.endAt) : this.endAt;
    const at = posterAt + POSTER_STAMP_AT;
    if (this.clock >= at - ENDING_LEAD) {
      F.stamp = true;
      // the finisher's billing (game.finalRank, floored at C) when the game exposes it, else the live rank
      const r = (g as unknown as { finalRank?: { letter: string; tier: string } }).finalRank ?? g.rank();
      emit('posterStamp', { inS: Math.max(0, at - this.clock), letter: r.letter, tier: r.tier });
    }
  }

  /**
   * THE WHEW (iteration 6, the game's `whew` event: a near-miss survived by a hair): a SLOW-MO FLASH — time "catches its
   * breath": two cream rings contract onto Slim, the frame edges go cold and desaturated for ~half a second, a quick
   * push-in; the WHEW! stamp comes with the game's `stamp` event (render/feedback.ts). Render-only: the sim never slows.
   */
  private drawWhew(ctx: CanvasRenderingContext2D, T: number, hx: number, hy: number, z: number): void {
    if (!(T >= 0) || T > 0.55) return;
    if (T < 0.05) this.director.punch = Math.max(this.director.punch, 0.035);
    const k = 1 - T / 0.55;
    ctx.save();
    // cold, desaturated edges (a held breath)
    const vg = ctx.createRadialGradient(hx, hy - 80 * z, 160 * z, hx, hy - 80 * z, 1200);
    vg.addColorStop(0, 'rgba(40,60,80,0)');
    vg.addColorStop(1, `rgba(40,60,80,${0.45 * k})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalCompositeOperation = 'saturation';
    const sg = ctx.createRadialGradient(hx, hy - 80 * z, 220 * z, hx, hy - 80 * z, 900);
    sg.addColorStop(0, 'rgba(128,128,128,0)');
    sg.addColorStop(1, `rgba(128,128,128,${0.7 * k})`);
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalCompositeOperation = 'source-over';
    // rings contracting onto him
    for (let i = 0; i < 2; i++) {
      const u = Math.min(1, (T - i * 0.07) / 0.3);
      if (u <= 0 || u >= 1) continue;
      ctx.strokeStyle = `rgba(244,239,226,${0.7 * (1 - u)})`;
      ctx.lineWidth = 6 + 10 * (1 - u);
      ctx.beginPath();
      ctx.arc(hx, hy - 80 * z, (520 - 400 * u) * z, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private reveal: { key: unknown; x: number; beat: number } = { key: null, x: NaN, beat: NaN };

  /**
   * THE DROP's reveal (act 3, bar 69): the casino's velvet drape hangs at the roof's edge and hides the sunset until the
   * drop's downbeat (the roof's `sunset` sky cue, 272), then flies up in 0.6 beat — the sky is a shock of colour.
   */
  private drawRevealCurtain(ctx: CanvasRenderingContext2D, cam: Game['camera'], wb: number): void {
    const L = this.game.level;
    if (this.reveal.key !== L) {
      const bd = this.stage.boundaries(L).find((q) => q.to === 'roof');
      const sky = L.skyCues.find((c) => c.preset === 'sunset');
      this.reveal = { key: L, x: bd?.x ?? NaN, beat: sky?.beat ?? NaN };
    }
    const R = this.reveal;
    if (Number.isNaN(R.x) || Number.isNaN(R.beat)) return;
    const d = wb - R.beat;
    if (d > 0.6 || d < -24) return;
    const sx = VIEW_W / 2 + (R.x - cam.rx) * cam.rzoom;
    if (sx > VIEW_W + 40) return;
    const up = d <= 0 ? 0 : (d / 0.6) ** 2;
    const oy = -up * (VIEW_H + 260);
    const x0 = Math.max(-60, sx);
    const fold = 84 * cam.rzoom + 20;
    const sway = Math.sin(wb * Math.PI * 0.5) * 6;
    ctx.save();
    ctx.translate(0, oy);
    ctx.fillStyle = '#2A0C24';
    ctx.fillRect(x0, -60, VIEW_W - x0 + 60, VIEW_H + 120);
    for (let x = x0; x < VIEW_W + fold; x += fold) {
      const gr = ctx.createLinearGradient(x, 0, x + fold, 0);
      gr.addColorStop(0, '#2A0C24');
      gr.addColorStop(0.45, '#7A3A66');
      gr.addColorStop(0.6, '#8A4A76');
      gr.addColorStop(1, '#2A0C24');
      ctx.fillStyle = gr;
      ctx.fillRect(x, -60, fold + 1, VIEW_H + 120);
    }
    // the leading edge: a gold braid + a shadow on the scene beside it
    const edge = ctx.createLinearGradient(x0 - 50, 0, x0, 0);
    edge.addColorStop(0, 'rgba(13,6,12,0)');
    edge.addColorStop(1, 'rgba(13,6,12,0.55)');
    ctx.fillStyle = edge;
    ctx.fillRect(x0 - 50, -60, 50, VIEW_H + 120);
    ctx.fillStyle = CF.gold;
    ctx.fillRect(x0 + sway * 0.3, -60, 7, VIEW_H + 120);
    // the hem: gold fringe (seen as it flies up)
    ctx.fillStyle = CF.gold;
    ctx.fillRect(x0, VIEW_H + 40, VIEW_W - x0, 14);
    ctx.fillStyle = '#B8923A';
    for (let x = x0 + 6; x < VIEW_W; x += 16) ctx.fillRect(x, VIEW_H + 54, 5, 26);
    ctx.restore();
  }

  private warmed = false;
  private warmX = 0;

  /**
   * one pre-warm step per frame: the scenes (render/stage.ts prewarm), then the freeze buffer, then the whole level's
   * play layer window by window (skins, fonts, glow sprites, gradients bake on first use: a ~20 ms first-draw spike at
   * the honky-tonk's first low sign, found with a per-section timer) — all into the throwaway freeze buffer
   */
  private warm(ctx: CanvasRenderingContext2D, b: BeatInfo): void {
    if (this.warmed) return;
    if (!this.stage.prewarm(this.game.level, b)) return;
    const src = ctx.canvas;
    if (!this.freezeCv || this.freezeCv.width !== src.width || this.freezeCv.height !== src.height) {
      this.freezeCv = document.createElement('canvas');
      this.freezeCv.width = src.width;
      this.freezeCv.height = src.height;
      return;
    }
    const L = this.game.level;
    const fc = this.freezeCv.getContext('2d');
    if (!fc || this.warmX > L.finishX + 2400) {
      this.warmed = true;
      return;
    }
    const x0 = this.warmX;
    const x1 = x0 + 2400;
    this.warmX = x1;
    const fy = L.floorYAt(x0 + 1200);
    const cy = (Number.isNaN(fy) ? 0 : fy) - 250;
    fc.setTransform(this.game.display.scale, 0, 0, this.game.display.scale, 0, 0);
    fc.save();
    fc.translate(VIEW_W / 2, VIEW_H / 2);
    fc.scale(0.8, 0.8);
    fc.translate(-(x0 + 1200), -cy);
    const bw: BeatInfo = { ...b, time: Math.abs(b.time) + 8 };
    this.sc.b = bw;
    this.drawLevel(fc, x0, x1, cy - 700, cy + 700, bw);
    fc.restore();
  }

  /** copy the finished film frame (backing-store pixels) for the final hit's freeze */
  private freezeFrame(ctx: CanvasRenderingContext2D, hx: number, hy: number): void {
    const src = ctx.canvas;
    if (!this.freezeCv || this.freezeCv.width !== src.width || this.freezeCv.height !== src.height) {
      this.freezeCv = document.createElement('canvas');
      this.freezeCv.width = src.width;
      this.freezeCv.height = src.height;
    }
    const fc = this.freezeCv.getContext('2d');
    if (!fc) return;
    fc.setTransform(1, 0, 0, 1, 0, 0);
    fc.clearRect(0, 0, src.width, src.height);
    fc.drawImage(src, 0, 0);
    this.frozen = true;
    this.frozenHero = [hx, hy];
  }

  /** act 3 scene state from the game (the casino's dying chandeliers + the hush, the penthouse's lens blaze / flares) */
  private syncAct3(_env: EnvKind): void {
    const A = this.game.mech.act3;
    if (!A) return;
    const wb = this.game.worldBeat;
    const R = A.state.rack;
    const cs = this.stage.casinoState;
    cs.dark = R.active ? 3 - R.lights : cs.dark;
    const hush = this.game.level.setPieces.find((s) => s.name === 'hush');
    cs.hush = hush && wb >= hush.beat && wb < hush.beat + hush.beats ? 1 : 0;
    cs.krak = Number.isNaN(R.breakBeat) || wb < R.breakBeat ? NaN : wb - R.breakBeat;
    const J = A.bigJim.state;
    const ps = this.stage.penthouseState;
    ps.blaze = J.blaze;
    let flare = 0;
    for (const cb of J.crackBeat) if (!Number.isNaN(cb) && wb >= cb) flare = Math.max(flare, 1 - (wb - cb) / 0.6);
    ps.crack = Math.max(0, flare);
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
    // the chorus KEY LIGHT: a warm wash across every floor top in view (the lane separates from the room)
    if (this.keyK > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const f of L.floors) {
        if (f.x1 < x0 || f.x0 > x1) continue;
        const gr = ctx.createLinearGradient(0, f.y - 10, 0, f.y + 70);
        gr.addColorStop(0, `rgba(255,226,170,${0.26 * this.keyK})`);
        gr.addColorStop(1, 'rgba(255,226,170,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(Math.max(f.x0, x0), f.y - 10, Math.min(f.x1, x1) - Math.max(f.x0, x0), 80);
      }
      ctx.restore();
    }

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
      if (this.env(s.x) === 'penthouse' && g.mech.act3?.bigJim.state.visible > 0.3) {
        // BIG JIM'S FIST is the lift: the back of his hand is the platform, red knuckle rings (lethal lift over the pit)
        const k = Math.max(s.w, 180) / 220;
        const top = s.y - f.lift * SLAM_LIFT_PX;
        ctx.globalAlpha = f.lift > 0.02 ? 0.8 : 1;
        drawJimFist(ctx, s.x + s.w / 2, top + 88 * k, k, (Math.round(s.x / 97) % 2) * 2 - 1, 'fist', Math.PI / 2, slam);
        ctx.globalAlpha = 1;
        ctx.fillStyle = f.lift > 0.02 ? 'rgba(244,239,226,0.5)' : '#F4EFE2';
        ctx.fillRect(s.x, top - 4, s.w, 3);
        if (slam > 0.05) {
          ctx.strokeStyle = `rgba(255,246,232,${0.7 * slam})`;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.ellipse(s.x + s.w / 2, top + 180 * k, s.w * (1.2 - slam * 0.4), 24, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else drawSlamPlatform(ctx, s.x, s.y, s.w, s.h, f.lift, pitY, slam, b);
    }

    // checkpoints: film splices ("SC. <bar>")
    for (const cp of L.checkpoints) {
      if (cp.x < x0 - 200 || cp.x > x1 + 200) continue;
      const fy = L.floorYAt(cp.x);
      drawSplice(ctx, cp.x, y0, y1, cp.reached, cp.flash, `SC. ${Math.round(cp.beat / bpb)}`, Number.isNaN(fy) ? 0 : fy);
    }

    // finish
    if (L.finishX > x0 - 300 && L.finishX < x1 + 300 && this.env(L.finishX - 1) !== 'theatre') {
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
    const jimOn = (g.mech.act3?.bigJim.state.visible ?? 0) > 0.5;
    const jimFace = jimOn && this.act3.loomK(g) > 0.5;
    for (const bk of L.breakables) {
      if (bk.x < x0 - 150 || bk.x > x1 + 150 || (bk.broken && bk.brokenT > 0.45)) continue;
      sc.env = this.env(bk.x);
      if (bk.look === 'finalHit' && jimFace && bk.broken) continue;
      if (jimOn && ((bk.look === 'lens' && !bk.broken) || (bk.look === 'finalHit' && jimFace))) {
        // his REAL lens sits on the target (act3Draw leans him in): only the reward ring + glint here
        const glint = Math.max(0, 1 - Math.abs(wb - bk.beat + 1) / 0.3);
        const now = Math.max(0, 1 - Math.abs(wb - bk.beat) / 0.35);
        const near = Math.max(0, 1 - Math.abs(wb - bk.beat) / 1.6);
        if (near > 0) {
          ctx.globalAlpha = near;
          ctx.strokeStyle = '#E0B64A';
          ctx.lineWidth = 6 + 6 * now;
          ctx.beginPath();
          ctx.arc(bk.x, bk.y, bk.r * (1.5 - 0.3 * now), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          if (glint > 0.05) drawGlow(ctx, bk.x, bk.y, '#FFD878', bk.r * 3, 0.5 * glint);
        }
        continue;
      }
      drawBreakable(
        ctx,
        {
          x: bk.x,
          y: bk.y,
          r: bk.r,
          baseY: bk.baseY,
          high: bk.high,
          big: bk.big,
          giant: bk.giant,
          look: pickLook(bk.look, sc.env, this.modeAt(bk.beat), bk.big, bk.id),
          glint: bk.broken ? 0 : Math.max(0, 1 - Math.abs(wb - bk.beat + 1) / 0.3),
          now: bk.broken ? 0 : Math.max(0, 1 - Math.abs(wb - bk.beat) / 0.35),
          brokenT: bk.broken ? bk.brokenT : NaN,
          seed: bk.id,
          viewTop: y0,
        },
        sc,
      );
    }
    for (const bp of L.bouncePads) {
      if (bp.x < x0 - 300 || bp.x > x1 + 300) continue;
      const e = this.env(bp.x);
      if (e === 'poolroom' || e === 'roof') drawBench(ctx, bp.x, bp.y, Math.max(bp.w, 200), bp.kick, this.stage.light(e));
      else drawBouncePad(ctx, bp.x, bp.y, bp.w, bp.kick, e, b);
      // THE POP (iteration 7): a bounce is a comic beat — shock ring, rays, a BOING! on the street's mini-launch
      if (bp.kick > 0.01 && bp.kick < 0.999) drawBouncePop(ctx, bp.x, bp.y, bp.w, 1 - bp.kick, e === 'street' && bp.landBeat - bp.beat <= 2.6);
    }
    for (const sg of L.signs) {
      const r = sg.rect;
      if (r.x + r.w < x0 - 50 || r.x > x1 + 50) continue;
      if (this.env(r.x) === 'penthouse') drawSleeveSign(ctx, r.x, r.y, r.w, r.h, sg.hit, b, y0);
      else drawLowSign(ctx, r.x, r.y, r.w, r.h, sg.swing, sg.hit, b, y0);
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
      if (this.keyK > 0.01) drawGlow(ctx, l.x, l.y + bob, '#FFD878', 58, (0.3 + 0.25 * own) * this.keyK);
      drawToken(ctx, l.x, l.y + bob, l.angle + Math.sin(gr.beat * Math.PI + l.x) * 0.12, 1 + 0.18 * own, own);
    }
    for (const h of g.loose) {
      if (h.collected) continue;
      const blink = h.t > 0 && h.expires - g.simTime < 0.6 ? (Math.floor(h.t * 12) % 2 ? 0.35 : 1) : 1;
      drawToken(ctx, h.x, h.y, Math.sin(h.t * 6) * 0.4, 1, 0.5, blink);
    }
    // hidden film canisters (iteration 6, gameplay placeholder: render/canisterDraw.ts)
    for (const c of L.canisters ?? []) if (c.x > x0 - 100 && c.x < x1 + 100) drawCanister(ctx, c, wb, this.clock, y0, L.floorYAt(c.from * L.ppb));

    // ON-OBJECT GLYPHS (iteration 7: the teaches that used to be banners): a gold glyph pops over the thing to hit
    this.drawGlyphs(ctx, wb, x0, x1);

    // act-2 mechanics (thrown bottles, firebombs, rolling balls, Big Jim's glint): placeholder draws, render/mechDraw.ts
    drawMech(ctx, g.mech, wb, x0, x1, this.clock, this.stage.light(this.env(g.player.x)), b, { x: g.player.x, y: g.player.y });
    // act 3: the BIG JIM letters, the call's rings (placeholder draws, render/act3Draw.ts)
    this.act3.front(ctx, g, g.camera, x0, x1, this.stage.light(this.env(g.player.x)), b, this.clock);

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
      let pp = this.goonParts.get(e.id);
      if (!pp || this.goonPartsKey !== L) {
        if (this.goonPartsKey !== L) {
          this.goonParts.clear();
          this.goonPartsKey = L;
        }
        // the same rule the audio flares on a smash (audio/goonParts.ts goonPartAt)
        const part = goonPartAt(g.song, e.beat);
        pp = { part, lane: part };
        this.goonParts.set(e.id, pp);
      }
      const pl = this.feed.lane(pp.lane);
      const partHit = live && Number.isFinite(pl.since) ? Math.exp(-(pl.since * b.spb) / 0.14) : 0;
      drawJabber(ctx, e.x, e.y + r.dy, {
        part: pp.part,
        partHit,
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

  }

  /**
   * an on-object tutorial glyph (level `hint` items with `glyph`: RuntimeLevel.glyphs): over the target at its beat, a
   * gold-rimmed ink badge with the verb ("X", "HOP") that swings in `beats` before, ticks on each beat and flashes gold
   * on the beat itself — the teach lives ON the thing, not in a banner
   */
  private drawGlyphs(ctx: CanvasRenderingContext2D, wb: number, x0: number, x1: number): void {
    const L = this.game.level;
    const gl = (L as unknown as { glyphs?: { beat: number; beats: number; text: string; icon?: string }[] }).glyphs;
    if (!gl || !gl.length) return;
    for (const h of gl) {
      const d = wb - h.beat;
      if (d < -h.beats - 0.3 || d > 0.4) continue;
      let x = h.beat * L.ppb;
      if (x < x0 - 200 || x > x1 + 200) continue;
      // the thing at that beat: a breakable, a pendulum target, else the floor there
      const bk = L.breakables.find((k) => Math.abs(k.beat - h.beat) < 0.3);
      const pd = bk ? undefined : L.pendulums.find((p) => Math.abs(p.beat - h.beat) < 0.3);
      const fy = L.floorYAt(x);
      let y = (Number.isNaN(fy) ? 0 : fy) - 250;
      if (bk) [x, y] = [bk.x, bk.y - bk.r - 90];
      else if (pd) [x, y] = [pd.x, pd.y - pd.r - 90];
      const inK = Math.min(1, (d + h.beats + 0.3) / 0.3);
      const outK = d > 0.1 ? Math.max(0, 1 - (d - 0.1) / 0.3) : 1;
      const now = Math.max(0, 1 - Math.abs(d) / 0.3);
      const tick = Math.exp(-(((wb % 1) + 1) % 1) * 6);
      const s = (0.6 + 0.4 * inK) * (1 + 0.1 * tick + 0.35 * now);
      ctx.save();
      ctx.globalAlpha = inK * outK;
      ctx.translate(x, y + 8 * (1 - inK));
      ctx.scale(s, s);
      if (now > 0.05) drawGlow(ctx, 0, 0, '#FFD878', 110, 0.6 * now);
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.fillStyle = CF.filmBlack;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = now > 0.3 ? '#FFE08A' : '#E0B64A';
      ctx.stroke();
      // a pointer to the thing below
      ctx.beginPath();
      ctx.moveTo(-10, 34);
      ctx.lineTo(0, 54);
      ctx.lineTo(10, 34);
      ctx.fillStyle = '#E0B64A';
      ctx.fill();
      ctx.font = `${h.text.length > 1 ? 30 : 44}px ${MARQUEE}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = now > 0.3 ? '#FFF6E0' : '#FFE08A';
      ctx.fillText(h.text, 0, 2);
      ctx.restore();
    }
  }

  // (act 3 skins that live here: small enough not to need a module)
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

/** a bounce pad's POP (u 0..1 over the pad's 0.33 s kick): cream shock ring, rays, dust, a comic BOING! */
function drawBouncePop(g: CanvasRenderingContext2D, x: number, y: number, w: number, u: number, word: boolean): void {
  const e = 1 - (1 - u) * (1 - u);
  g.save();
  g.globalAlpha = 1 - u;
  g.strokeStyle = CF.cream;
  g.lineWidth = 10 * (1 - u) + 2;
  g.beginPath();
  g.ellipse(x, y - 10, w * (0.5 + 0.9 * e), 30 + 50 * e, 0, 0, Math.PI * 2);
  g.stroke();
  g.lineCap = 'round';
  g.lineWidth = 7;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * (0.1 + 0.8 * (i / 8));
    const r0 = 60 + 120 * e;
    const r1 = r0 + 70 * (1 - u);
    g.beginPath();
    g.moveTo(x + Math.cos(a) * r0 * 1.4, y - 30 + Math.sin(a) * r0);
    g.lineTo(x + Math.cos(a) * r1 * 1.4, y - 30 + Math.sin(a) * r1);
    g.stroke();
  }
  if (word) {
    const s = 0.6 + 0.6 * Math.min(1, u / 0.2) - 0.1 * u;
    g.globalAlpha = Math.min(1, (1 - u) * 2.2);
    g.translate(x + w * 0.45, y - 150 - 80 * e);
    g.rotate(-0.12);
    g.scale(s, s);
    g.font = `italic 64px ${MARQUEE}`;
    g.textAlign = 'center';
    outlineText(g, 'BOING!', 0, 0, CF.cream, 10);
  }
  g.restore();
}

/**
 * Act 3's knee-slide under BIG JIM'S SLEEVE (a lowSign in the penthouse): his velvet cuff hangs across the lane, gold
 * braid at the hem, the Bluffers' cue tips poking out under it = the red STUMBLE points. Chalk DUCK! on the velvet.
 */
function drawSleeveSign(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hitK: boolean, b: BeatInfo, viewTop: number): void {
  const sway = Math.sin(b.beat * Math.PI * 0.5) * 6;
  const bot = y + h;
  // the velvet drape from the top of the frame down to the hem
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, '#2E1428');
  gr.addColorStop(0.35, '#8A4A76');
  gr.addColorStop(0.7, '#5E2B4E');
  gr.addColorStop(1, '#2E1428');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x - 20, viewTop - 40);
  g.lineTo(x + w + 20, viewTop - 40);
  g.lineTo(x + w + sway, bot - 10);
  for (let i = 6; i >= 0; i--) g.quadraticCurveTo(x + (i + 0.5) * (w / 6) + sway, bot + 14, x + i * (w / 6) + sway, bot - 10);
  g.closePath();
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = CF.filmBlack;
  g.stroke();
  g.strokeStyle = 'rgba(30,10,26,0.5)';
  g.lineWidth = 8;
  for (let i = 1; i < 5; i++) {
    g.beginPath();
    g.moveTo(x + (i / 5) * w, viewTop);
    g.lineTo(x + (i / 5) * w + sway, bot - 16);
    g.stroke();
  }
  // gold braid hem
  g.strokeStyle = '#E0B64A';
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(x + sway, bot - 14);
  g.lineTo(x + w + sway, bot - 14);
  g.stroke();
  // cue tips poking out under the hem: red POINTS (stumble)
  for (let i = 0; i < 5; i++) {
    const cx = x + ((i + 0.5) / 5) * w + sway;
    g.fillStyle = CF.filmBlack;
    g.fillRect(cx - 4, bot - 12, 8, 18);
    g.beginPath();
    g.moveTo(cx - 7, bot + 4);
    g.lineTo(cx, bot + 20);
    g.lineTo(cx + 7, bot + 4);
    g.closePath();
    g.fillStyle = hitK ? '#6A5A48' : '#B3201B';
    g.fill();
  }
  // chalk DUCK! on the velvet
  g.font = `italic 44px ${MARQUEE}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(244,239,226,0.85)';
  g.fillText('DUCK!', x + w / 2 + sway, bot - 70);
}
