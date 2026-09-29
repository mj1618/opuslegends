/**
 * ACT 3 ART in the game (bars 61-86): reads `game.mech.act3` (game/mech/act3.ts — a pure function of the world beat) and
 * draws it with the art toolkit (art/grindhouse/bigjim.ts, roof.ts, casino.ts, finale.ts). Danger language: the letters
 * are TERRAIN (steel + cream lip, rose neon); Big Jim is SCENERY — only his bound parts in the play band are threats /
 * rewards, and those are ordinary entities with their own skins (fists = slam lifts, medallions = pendulums, lenses =
 * giant breakables ...).
 *
 *   art.behind(g, ...)   world space, before the level: BIG JIM (rig + bound-part alignment: on a blow / lens beat his
 *                        whole body leans so the struck part sits exactly on the target — he ducks his face into the
 *                        play band on the HEY and reels back up), the rack frame, goons piling in
 *   art.front(g, ...)    world space, after the entities: the BIG JIM letters (upright on steel legs -> toppling -> a bridge;
 *                        SLAM sparks + tube pops + shake), the call's gold rings
 *   art.screen(g, ...)   screen space, INSIDE the film: the hush (reel-change freeze + changeover dot), the finale's iris
 *                        BEFORE the hit (blades creeping in at the corners, one per beat: the frame stays full)
 *   art.post(g, ...)     after the FINAL HIT (340), over the renderer's freeze-frame of the strike: light burst, the iris
 *                        slamming shut ON Slim (ENDING.shut), THE END burning in, the victory (ENDING in seconds)
 *   art.hall(g, ...)     the theatre around the film: curtain frame over its edges (from 332) + the marquee cut-in
 *   art.eruption(g, ...) the house on its feet after the hit: jumping silhouettes, popcorn, confetti cannons
 *   art.hudAlpha(game)   the HUD fades out on the finale's first beat (332) and stays off to the poster
 */
import { type BeatInfo, hit } from '../art/core/beat';
import { drawGlow, star4 } from '../art/core/draw';
import { JIM_NORM, JIM_PARTS, drawBigJim } from '../art/grindhouse/bigjim';
import { drawHeadGoon, drawRackFrame } from '../art/grindhouse/casino';
import { drawCurtainFrame, drawEruption, drawFinalBurst, drawIris, drawLensShatter, drawMarqueeCutIn, drawTheEnd, drawVictory } from '../art/grindhouse/finale';
import { drawLetterLegs, drawSignLetter } from '../art/grindhouse/roof';
import { drawSlim } from '../art/grindhouse/slim';
import type { Lighting } from '../art/world/lighting';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import { laneBeats } from '../audio/song';
import type { Camera } from './camera';
import { REWARD } from './entityDraw';

type ToScreen = (x: number, y: number) => [number, number];

/** bound parts his body leans onto (the walkdown's gold trophies stay trophies: he just braces and reels behind them) */
const PART_OF_LOOK: Record<string, keyof typeof JIM_PARTS> = { lens: 'lensL', chain: 'chain' };

/**
 * the ending's timeline (seconds after the final hit): the frame FREEZES on the strike at `freeze`, the iris slams shut
 * on Slim by `shut`, THE END burns in (`endSpeed` × the card's own clock), the victory iris opens at `victory`; the
 * renderer holds the poster until `poster`; its RANK stamp lands screens.ts POSTER_STAMP_AT s after that.
 * (iteration 7, review iter6 fix 4: trimmed 7.6 s → 4.9 s from the hit to the stamp — THE END 1.4 s, the victory 2 s)
 *
 * AUDIO HOOKS (game.events, emitted by the renderer — render/renderer.ts endingCues): 'theEnd' when the iris has shut and
 * THE END card starts (hit + `shut`), 'posterStamp' when the rank stamp slams onto the poster. Both fire up to
 * `ENDING_LEAD` s early with `inS` = seconds until the moment, so a listener can schedule on the audio clock.
 */
export const ENDING = { freeze: 0.04, hold: 0.3, shut: 0.9, endSpeed: 1.5, victory: 2.35, poster: 4.3 } as const;
export const ENDING_LEAD = 0.05;

/**
 * THE FINAL HIT's staging (iteration 6, review iter5 fix 2): from `loomFrom` Big Jim LOOMS in — big, roaring, fists up —
 * until his face sits ON the final-hit target by `loomFrom + loomBeats`, so Slim's last strike lands on his jaw. He only
 * flattens AFTER the hit: the hitstop freeze (ENDING.freeze → hold), then his head snaps back (`snap`), he squashes into a
 * pancake (`flat`) and is sucked away into a tiny film frame (`cut`), seconds after the hit.
 */
export const FINALE = { loomFrom: 335.5, loomBeats: 3.8, scale: 0.8, faceY: -930, faceDX: 70, snap: [0.3, 0.44], flat: [0.4, 0.62], cut: [0.58, 0.88] } as const;

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** window weight around a bound part's beat: leans in over 1.4 beats, holds through the hit, eases back over 1 */
function partWeight(d: number): number {
  if (d < -1.6 || d > 1.3) return 0;
  if (d < -0.25) return smooth((d + 1.6) / 1.35);
  if (d < 0.3) return 1;
  return 1 - smooth((d - 0.3) / 1.0);
}

export class Act3Art {
  private landed: boolean[] = [];
  private lastRun = -1;
  /** the render-side lean applied to Big Jim this frame (world px) */
  private lean = { x: 0, y: 0 };
  /** his face (world) this frame — the iris slams on it */
  private face = { x: NaN, y: NaN };
  /** presentation clock at the final hit (NaN = not yet): the ending runs in SECONDS from here */
  hitClock = NaN;

  private finBeat = NaN;
  private finKey: unknown = null;
  private hitKey: unknown = null;
  private hitAt: { x: number; y: number } | null = null;

  /** the final-hit target (world) — his face lands on it */
  finalTarget(game: Game): { x: number; y: number } | null {
    if (this.hitKey !== game.level) {
      this.hitKey = game.level;
      const fh = game.level.breakables.find((k) => k.look === 'finalHit');
      this.hitAt = fh ? { x: fh.x, y: fh.y } : null;
    }
    return this.hitAt;
  }

  /** 0..1 how far Big Jim has loomed in onto the final-hit target (1 from ~339.3 through the ending) */
  loomK(game: Game): number {
    if (!this.finalTarget(game)) return 0;
    return smooth((game.worldBeat - FINALE.loomFrom) / FINALE.loomBeats);
  }

  /** the finale's first beat (the level's `pullOut` set-piece, 332), NaN if the level has none */
  finaleBeat(game: Game): number {
    if (this.finKey !== game.level) {
      this.finKey = game.level;
      this.finBeat = game.level.setPieces.find((s) => s.name === 'pullOut')?.beat ?? NaN;
    }
    return this.finBeat;
  }

  /** 0..1 the theatre frame (curtains + valance over the film's edges) from the finale's first beat */
  curtainK(game: Game): number {
    const fb = this.finaleBeat(game);
    return Number.isNaN(fb) ? 0 : smooth((game.worldBeat - fb) / 2);
  }

  /** HUD opacity: it fades out over the finale's first beat and stays off through THE END, the victory and the poster */
  hudAlpha(game: Game): number {
    const fb = this.finaleBeat(game);
    if (Number.isNaN(fb)) return 1;
    return 1 - Math.max(0, Math.min(1, game.worldBeat - fb));
  }

  /** latch the presentation clock on the final hit (call once per frame, before drawing) */
  track(game: Game, clock: number): void {
    const I = game.mech.act3?.state.iris;
    if (I && I.active && game.worldBeat >= I.beat) {
      if (Number.isNaN(this.hitClock)) this.hitClock = clock;
    } else this.hitClock = NaN;
  }

  /** seconds since the final hit (NaN before it) */
  hitT(clock: number): number {
    return Number.isNaN(this.hitClock) ? NaN : clock - this.hitClock;
  }

  // ------------------------------------------------------------------ BIG JIM (behind the play band)
  behind(g: CanvasRenderingContext2D, game: Game, _cam: Camera, x0: number, x1: number, L: Lighting, b: BeatInfo, clock: number): void {
    const A = game.mech.act3;
    const J = A.bigJim.state;
    const wb = game.worldBeat;
    this.drawRack(g, game, x0, x1, L, b);
    this.drawCallGoons(g, game, x0, x1, L, clock);
    this.face.x = NaN;
    if (J.visible <= 0.01) return;
    const s0 = J.scale;
    const k0 = JIM_NORM * s0;
    const Ht = 1480 * k0;
    let ax = J.x;
    let ay = J.y + (1 - J.rise) * 0.85 * Ht;
    // THE FINALE (iteration 6): he LOOMS in until his face sits on the final-hit target (no shrink before the hit)
    const loom = this.loomK(game);
    const T = this.hitT(clock);
    let sEff = s0;
    if (loom > 0) {
      const ft = this.finalTarget(game) as { x: number; y: number };
      const kF = JIM_NORM * FINALE.scale;
      // he rocks toward Slim on every beat while he looms (a roar per beat), still on the hit
      const rock = Number.isNaN(T) ? 26 * Math.exp(-(wb - Math.floor(wb)) * 4) * (1 - loom * 0.6) : 0;
      const fx = ft.x + FINALE.faceDX * kF - rock;
      const fy = ft.y - FINALE.faceY * kF;
      ax += (fx - ax) * loom;
      ay += (fy - ay) * loom;
      sEff = s0 + (FINALE.scale - s0) * loom;
    }
    const s = loom > 0 ? sEff : s0;
    const k = JIM_NORM * s;
    // bound-part alignment: the part being hit sits exactly on its target
    const lvl = game.level;
    let best = 0;
    let lx = 0;
    let ly = 0;
    let fistN = 0;
    let lensN = 0;
    for (const bk of lvl.breakables) {
      const part0 = PART_OF_LOOK[bk.look];
      if (!part0) continue;
      let part = part0;
      if (bk.look === 'fist') part = fistN++ % 2 ? 'fistR' : 'fistL';
      if (bk.look === 'lens') part = lensN++ % 2 ? 'lensR' : 'lensL';
      const w = partWeight(wb - bk.beat);
      if (w <= best) continue;
      const P = JIM_PARTS[part];
      best = w;
      lx = (bk.x - (ax + P.x * k)) * w;
      ly = (bk.y - (ay + P.y * k)) * w;
    }
    // ease the lean (render-only smoothing, deterministic enough: it resets on rewinds via the run id)
    this.lean.x = lx;
    this.lean.y = ly;
    ax += this.lean.x;
    ay += this.lean.y;
    this.face.x = ax;
    this.face.y = ay - 1100 * k;
    if (ax + 900 * k < x0 - 400 || ax - 900 * k > x1 + 400) return;
    // fists: the slam lifts ARE his fists (the play layer draws them) — his arms reach down to them
    const fists: [{ x: number; y: number } | null, { x: number; y: number } | null] = [null, null];
    const hidden: [boolean, boolean] = [false, false];
    for (let i = 0; i < 2; i++) {
      const f = J.fists[i];
      if (!f) continue;
      const lift = (1 - f.down) * 150;
      fists[i] = { x: (f.x - ax) / s, y: (f.y - lift - 60 - ay) / s };
      hidden[i] = true;
    }
    // the finale: looming in with both fists up over Slim, shaking them on alternating beats; after the hit they fly up
    if (loom > 0.05) {
      const ph = Math.floor(wb) % 2;
      const pound = Number.isNaN(T) ? Math.exp(-(wb - Math.floor(wb)) * 5) : 0;
      const up = Number.isNaN(T) ? 0 : smooth(T / 0.4);
      fists[0] = { x: -620 - 180 * up, y: -1150 - (ph === 0 ? 90 * pound : 0) - 300 * up };
      fists[1] = { x: 560 + 220 * up, y: -1250 - (ph === 1 ? 90 * pound : 0) - 260 * up };
      hidden[0] = hidden[1] = false;
    }
    // the backhand (his swing rides the Burn's lunge): the right fist sweeps low across the floor
    if (J.swing > 0.05 && !fists[1]) fists[1] = { x: 900 - 1600 * J.swing, y: -100 + 40 * Math.sin(J.swing * Math.PI) };
    const crackT: [number, number] = [0, 1].map((i) => (Number.isNaN(J.crackBeat[i]) ? NaN : (wb - J.crackBeat[i]) * b.spb)) as [number, number];
    g.save();
    g.globalAlpha = Math.min(1, J.visible);
    // AFTER THE FINAL HIT (seconds T): the hitstop holds him on the blow, then his head SNAPS back, he squashes into a
    // pancake and is sucked away into a tiny film frame up-stage (the cut-out comes after the hit, not before)
    const Tl = Number.isNaN(T) ? -1 : T;
    const snap = Tl < 0 ? 0 : smooth((Tl - FINALE.snap[0]) / (FINALE.snap[1] - FINALE.snap[0]));
    const flat = Tl < 0 ? 0 : smooth((Tl - FINALE.flat[0]) / (FINALE.flat[1] - FINALE.flat[0]));
    const cut = Tl < 0 ? 0 : smooth((Tl - FINALE.cut[0]) / (FINALE.cut[1] - FINALE.cut[0]));
    if (snap > 0 || flat > 0 || cut > 0) {
      const fx = ax;
      const fy = ay - 930 * k;
      // snap: rocked back around his seat, knocked up-stage
      g.translate(ax + 260 * k * snap + 900 * k * cut, ay - 200 * k * snap - 1300 * k * cut);
      g.rotate(0.3 * snap - 0.5 * flat + 6 * cut * cut);
      const sq = 1 - 0.72 * flat;
      const shrink = 1 - 0.8 * cut;
      g.scale((1 + 0.55 * flat) * shrink, sq * shrink);
      g.translate(-ax, -ay);
      void fx;
      void fy;
    }
    if (cut > 0.05) this.drawFrame(g, ax, ay, k, b);
    const jimCrack: [number, number] = Tl >= 0 ? [2, 2] : J.crack;
    const jimCrackT: [number, number] = Tl >= 0 ? [Tl, Tl] : crackT;
    drawBigJim(g, ax, ay, s, {
      time: clock,
      beat: wb,
      bluff: loom > 0.2 ? 0 : J.bluff,
      roar: loom > 0 ? Math.max(J.roar, Tl >= 0 ? 1 - snap * 0.3 : 0.55 + 0.45 * Math.exp(-(wb - Math.floor(wb)) * 3)) : J.roar,
      reel: Tl >= 0 ? Math.max(snap, 1 - flat * 0.5) : J.reel,
      reelDir: Tl >= 0 ? 1 : J.reelDir,
      crack: jimCrack,
      crackT: jimCrackT,
      reflect: J.reflect,
      reflectX: Math.sin(wb * 0.5) * 0.4,
      blaze: J.blaze,
      chainT: Number.isNaN(J.chainBeat) ? NaN : (wb - J.chainBeat) * b.spb,
      panic: loom > 0 ? (Tl >= 0 ? 1 : 0.25) : J.panic,
      fists,
      fistHidden: hidden,
      lift: [0.2 + 0.2 * Math.sin(wb * Math.PI * 0.5), 0.2 + 0.2 * Math.cos(wb * Math.PI * 0.5)],
      light: L,
      throne: J.pose === 'throne' || J.prev === 'throne' || (J.pose === 'bluff' && J.k < 1),
      lod: s < 0.5 ? 0 : 1,
    });
    g.restore();
    if (flat > 0.3 && cut < 0.9) {
      // KO: stars circling where his head landed
      const hx = ax + 260 * k * snap + 900 * k * cut;
      const hy = ay - 200 * k * snap - 1300 * k * cut - 1100 * k * (1 - 0.72 * flat) * (1 - 0.8 * cut);
      const sk = (1 - 0.8 * cut) * flat;
      for (let i = 0; i < 5; i++) {
        const a = clock * 5 + (i / 5) * Math.PI * 2;
        star4(g, hx + Math.cos(a) * 300 * k * sk, hy - 140 * k * sk + Math.sin(a) * 80 * k * sk, 80 * k * sk, clock * 3 + i, i % 2 ? '#FFE08A' : '#FFF6E8');
      }
    }
    // his aura in the reveal: slow gold + fig rays behind the silhouette
    if (J.bluff > 0.05) {
      const hx = ax;
      const hy = ay - 1100 * k;
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const a = clock * 0.2 + (i / 12) * Math.PI * 2;
        g.fillStyle = i % 2 ? `rgba(224,182,74,${0.06 * J.bluff})` : `rgba(138,74,118,${0.08 * J.bluff})`;
        g.beginPath();
        g.moveTo(hx, hy);
        g.arc(hx, hy, 2600 * k, a - 0.09, a + 0.09);
        g.closePath();
        g.fill();
      }
      g.restore();
    }
  }

  /** Big Jim's film frame in the finale: a black celluloid border with sprockets he pounds on */
  private drawFrame(g: CanvasRenderingContext2D, ax: number, ay: number, k: number, b: BeatInfo): void {
    const w = 1700 * k;
    const h = 1700 * k;
    const x = ax - w / 2;
    const y = ay - h + 200 * k;
    const shake = hit(b, 'kick', 0.12) * 6;
    g.save();
    g.translate(shake, 0);
    g.lineWidth = 60 * k;
    g.strokeStyle = '#16100C';
    g.strokeRect(x, y, w, h);
    g.fillStyle = '#F4EFE2';
    for (let yy = y + 30 * k; yy < y + h - 40 * k; yy += 110 * k) {
      g.fillRect(x - 22 * k, yy, 20 * k, 50 * k);
      g.fillRect(x + w + 2 * k, yy, 20 * k, 50 * k);
    }
    g.restore();
  }

  // ------------------------------------------------------------------ the POOL ROOM's CALL AND RESPONSE
  private callKey: unknown = null;
  /** per call stomp: its beat, the goon's spot (world), the answer beat + where its target sits */
  private stompsC: { sb: number; to: number; gx: number; gy: number; ab: number; tx: number; ty: number; floor: boolean }[] = [];

  private callData(game: Game) {
    const L = game.level;
    if (this.callKey === L) return this.stompsC;
    this.callKey = L;
    this.stompsC = [];
    const calls = L.setPieces.filter((s) => s.name === 'callResponse').map((s) => ({ from: s.beat, to: s.beat + s.beats }));
    if (!calls.length) return this.stompsC;
    const st = laneBeats(game.song, 'stomps').sort((a, b) => a - b);
    for (const c of calls) {
      for (const sb of st) {
        if (sb < c.from - 0.01 || sb >= c.to - 0.5) continue; // the call is 1 · &2 · 3 (the bar's last stomp is the next bar's pickup)
        const ab = sb + (c.to - c.from);
        // the goon stands 0.9 beat in front of the hero's stomp-beat position (in your face, then out of the way)
        const gx = L.xAt(sb + 0.9);
        const gy = L.surfaceYNear(gx);
        const bk = L.breakables.find((k) => Math.abs(k.beat - ab) < 0.12);
        const tx = bk ? bk.x : L.xAt(ab);
        const ty = bk ? bk.y : L.surfaceYNear(L.xAt(ab)) - 8;
        this.stompsC.push({ sb, to: c.to, gx, gy: Number.isNaN(gy) ? 0 : gy, ab, tx, ty: Number.isNaN(ty) ? 0 : ty, floor: !bk });
      }
    }
    return this.stompsC;
  }

  /**
   * THE CALL: a foreground goon for each stomp of the Black Betty call, lit by his own lamp cone, standing on the table
   * just ahead of Slim — knee up, STOMP on his beat (dust + a gold shot out toward the answer spot), then he leaps back
   * out of the lane before Slim reaches him. Scenery (never red, never gold).
   */
  private drawCallGoons(g: CanvasRenderingContext2D, game: Game, x0: number, x1: number, _L: Lighting, clock: number): void {
    const S = this.callData(game);
    if (!S.length) return;
    const wb = game.worldBeat;
    for (let i = 0; i < S.length; i++) {
      const c = S[i];
      if (wb < c.to - 4 - 1 || wb > c.sb + 1.2) continue;
      if (c.gx < x0 - 200 || c.gx > x1 + 200) continue;
      const d = wb - c.sb;
      // in: drop from the lamp over the bar before the call; out: a leap back over 0.55 beat after the stomp
      const inK = smooth((wb - (c.to - 4 - 1)) / 0.8);
      const out = d > 0.12 ? smooth((d - 0.12) / 0.55) : 0;
      if (out >= 1) continue;
      const lift = d < 0 && d > -0.6 ? Math.sin(((d + 0.6) / 0.6) * Math.PI * 0.5) : 0; // knee up into the stomp
      const slam = d >= 0 && d < 0.3 ? 1 - d / 0.3 : 0;
      const x = c.gx + out * 260;
      const y = c.gy - (1 - inK) * 500 - Math.sin(out * Math.PI) * 220;
      const sc = 1.05 * (1 - 0.35 * out);
      g.save();
      g.globalAlpha = inK * (1 - out);
      // his lamp cone (warm, additive) + the pool of light on the felt
      g.globalCompositeOperation = 'lighter';
      const cone = g.createLinearGradient(0, c.gy - 700, 0, c.gy);
      cone.addColorStop(0, 'rgba(246,231,176,0)');
      cone.addColorStop(1, `rgba(246,231,176,${0.16 + 0.2 * slam})`);
      g.fillStyle = cone;
      g.beginPath();
      g.moveTo(c.gx - 40, c.gy - 700);
      g.lineTo(c.gx + 40, c.gy - 700);
      g.lineTo(c.gx + 150, c.gy);
      g.lineTo(c.gx - 150, c.gy);
      g.closePath();
      g.fill();
      g.globalCompositeOperation = 'source-over';
      drawGoon(g, x, y, sc, lift, slam, i, clock);
      g.restore();
      // the stomp: dust puffs + a shock ring on the felt
      if (slam > 0) {
        g.strokeStyle = `rgba(255,236,190,${0.8 * slam})`;
        g.lineWidth = 6;
        g.beginPath();
        g.ellipse(c.gx, c.gy + 2, 70 + 90 * (1 - slam), 14 + 8 * (1 - slam), 0, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = `rgba(233,216,180,${0.5 * slam})`;
        for (let k = 0; k < 6; k++) {
          const dx = (k - 2.5) * 34 * (1.6 - slam);
          g.beginPath();
          g.arc(c.gx + dx, c.gy - 10 - (1 - slam) * 30, 16 + 10 * (1 - slam), 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }

  /**
   * THE ANSWER's targets: on each call stomp a gold shot flies from the goon's boot to the spot the answer lands on
   * (the same beat, one bar later); the ring waits there, then closes like an approach circle onto the target ON its
   * beat and bursts. Hop spots ring the felt; strike spots ring the bell.
   */
  private drawCallRings(g: CanvasRenderingContext2D, game: Game, x0: number, x1: number, clock: number): void {
    const S = this.callData(game);
    if (!S.length) return;
    const wb = game.worldBeat;
    for (const c of S) {
      if (wb < c.sb || wb > c.ab + 0.45) continue;
      // the shot in flight
      const fly = (wb - c.sb) / 0.5;
      if (fly < 1) {
        const u = smooth(fly);
        const px = c.gx + (c.tx - c.gx) * u;
        const py = c.gy - 40 + (c.ty - c.gy + 40) * u - Math.sin(u * Math.PI) * 240;
        if (px > x0 - 100 && px < x1 + 100) {
          drawGlow(g, px, py, '#FFE08A', 70, 0.9);
          star4(g, px, py, 26, clock * 6, 'rgba(255,246,220,0.95)');
        }
        continue;
      }
      if (c.tx < x0 - 200 || c.tx > x1 + 200) continue;
      const toGo = c.ab - wb;
      const R0 = c.floor ? 46 : 52;
      const close = Math.max(0, Math.min(1, toGo / 2));
      const r = R0 * (1 + 1.6 * close);
      const burst = toGo < 0 ? -toGo / 0.45 : 0;
      const a = toGo < 0 ? 1 - burst : 0.55 + 0.45 * (1 - close);
      g.save();
      g.globalAlpha = Math.max(0, a);
      g.strokeStyle = REWARD.gold;
      g.lineWidth = 7 + 5 * (1 - close);
      g.beginPath();
      if (c.floor) g.ellipse(c.tx, c.ty, r * 1.6, r * 0.42, 0, 0, Math.PI * 2);
      else g.arc(c.tx, c.ty, r, 0, Math.PI * 2);
      g.stroke();
      // the fixed target ring the approach closes onto (dashed)
      if (toGo > 0) {
        g.setLineDash([10, 8]);
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(255,224,138,0.7)';
        g.beginPath();
        if (c.floor) g.ellipse(c.tx, c.ty, R0 * 1.6, R0 * 0.42, 0, 0, Math.PI * 2);
        else g.arc(c.tx, c.ty, R0, 0, Math.PI * 2);
        g.stroke();
        g.setLineDash([]);
      }
      if (burst > 0) {
        g.globalCompositeOperation = 'lighter';
        drawGlow(g, c.tx, c.ty, '#FFE08A', 120 + 120 * burst, 0.8 * (1 - burst));
        star4(g, c.tx, c.ty, 80 * (1 - burst), clock * 4, 'rgba(255,246,220,0.95)');
      }
      g.restore();
    }
  }

  // ------------------------------------------------------------------ the RACK (the Velvet Casino)
  private drawRack(g: CanvasRenderingContext2D, game: Game, x0: number, x1: number, L: Lighting, _b: BeatInfo): void {
    const R = game.mech.act3.state.rack;
    if (!R.active || !R.tiers.length) return;
    const wb = game.worldBeat;
    // goons piling in: each tier's heap drops from the dark ceiling on its downbeat
    for (const t of R.tiers) {
      if (t.k <= 0 || t.k >= 1 || t.x1 < x0 || t.x0 > x1) continue;
      const u = t.k;
      for (let i = 0; i < 6; i++) {
        const gx = t.x0 + ((i + 0.5) / 6) * (t.x1 - t.x0);
        const fall = (1 - u) * (1 - u) * 900 + i * 20 * (1 - u);
        g.fillStyle = '#4A2040';
        g.beginPath();
        g.ellipse(gx, t.y - 30 - fall, 50, 30, u * 3 + i, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#A8664F';
        g.beginPath();
        g.arc(gx + 20, t.y - 56 - fall, 14, 0, Math.PI * 2);
        g.fill();
      }
    }
    // the rack FRAME around the heap: hangs in from above the bar before, SLAMS on the fill's downbeat, bursts on the break
    const top = R.tiers.reduce((m, t) => Math.min(m, t.y), Infinity);
    const bot = R.tiers.reduce((m, t) => Math.max(m, t.y), -Infinity);
    const xa = R.tiers[0].x0;
    const xb = R.tiers[R.tiers.length - 1].x1;
    const fb = R.breakBeat - 3.65; // the fill bar's downbeat (the plan's 268)
    const drop = wb < fb - 4 ? 1 : wb < fb ? 0.35 * (1 - smooth((wb - (fb - 4)) / 4)) + (wb > fb - 0.5 ? -0.35 * (1 - (fb - wb) / 0.5) : 0) : 0;
    const burst = Number.isNaN(R.breakBeat) || wb < R.breakBeat ? 0 : Math.min(1.4, (wb - R.breakBeat) * 0.9);
    const w = Math.min(2600, (xb - xa) * 0.75);
    if (wb > fb - 8 && burst < 1.4) drawRackFrame(g, (xa + xb) / 2 + 200, bot + 80, w, Math.max(0, drop), L, burst);
    // the frame's SLAM: dust + a shock ring on the heap
    if (R.frame > 0) {
      g.strokeStyle = `rgba(244,239,226,${0.6 * R.frame})`;
      g.lineWidth = 8;
      g.beginPath();
      g.ellipse((xa + xb) / 2 + 200, bot + 60, w * (0.6 + 0.3 * (1 - R.frame)), 60, 0, 0, Math.PI * 2);
      g.stroke();
    }
    // the scatter: goons flying into the pockets like balls after the break
    if (R.scatter > 0 && R.scatter < 1) {
      const u = R.scatter;
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + ((i / 13) - 0.5) * 2.6;
        const sp = 900 + (i % 4) * 300;
        const gx = (xa + xb) / 2 + 200 + Math.cos(a) * sp * u;
        const gy = top - 200 + Math.sin(a) * sp * u + 1400 * u * u;
        g.save();
        g.translate(gx, gy);
        g.rotate(u * 12 + i);
        g.fillStyle = ['#5E2B4E', '#4A2040', '#8A4A76'][i % 3];
        g.beginPath();
        g.ellipse(0, 0, 44, 30, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#F4EFE2';
        g.beginPath();
        g.arc(0, 0, 13, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#1A1410';
        g.font = 'bold 14px "Arial Black", Impact, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String((i % 15) + 1), 0, 1);
        g.restore();
      }
    }
    void top;
    void drawHeadGoon;
  }

  // ------------------------------------------------------------------ letters + the call (front)
  front(g: CanvasRenderingContext2D, game: Game, cam: Camera, x0: number, x1: number, L: Lighting, b: BeatInfo, clock: number): void {
    const A = game.mech.act3;
    const lvl = game.level;
    const wb = game.worldBeat;
    if (game.runId !== this.lastRun) {
      this.lastRun = game.runId;
      this.landed = [];
    }
    // ---- the BIG JIM letters
    for (let i = 0; i < A.letters.length; i++) {
      const l = A.letters[i];
      if (l.x0 > x1 + 1400 || l.x0 + l.tall < x0 - 400) continue;
      const narrow = l.letter === 'I';
      const thick = narrow ? Math.min(l.tall * 0.3, 240) : Math.min(l.tall * 0.62, 600);
      // steel legs: from the letter's foot down to the roof under it (they stay as POSTS)
      let foot = lvl.floorYAt(l.x0 - 8);
      if (Number.isNaN(foot)) foot = l.y + 600;
      if (foot > l.y + 6) drawLetterLegs(g, l.x0, thick, l.y, foot, L);
      const ang = (l.angle * Math.PI) / 2 + (l.wobble > 0 ? Math.sin(wb * 40) * 0.015 * l.wobble : 0);
      const flick = l.state === 'falling' ? (Math.sin(clock * 70 + i) > 0.2 ? 1 : 0.25) : 1;
      const landedT = l.landedBeats * b.spb; // (NaN until landed; game/mech/letters.ts keeps it consistent with the state)
      // landed: the tubes blow on the SLAM, then flicker back on at half power (a lit bridge, not a dead outline)
      const relit = Number.isNaN(landedT) ? 0.5 : landedT < 0.35 ? 0 : landedT < 0.7 ? (Math.sin(clock * 60 + i) > 0 ? 0.5 : 0.1) : 0.5;
      const neon = l.state === 'landed' ? relit : flick * (l.state === 'standing' ? (Math.sin(clock * 13 + i * 3) > -0.97 ? 1 : 0.4) : 1);
      drawSignLetter(g, l.letter, { px: l.x0, py: l.y, len: l.tall, thick, angle: ang, neon, landedT, time: clock, light: L, b });
      if (l.state === 'landed') this.drawDeck(g, l.x0, l.y, l.tall);
      // the SLAM: shake the camera once per landing
      const isDown = l.state === 'landed' && wb - l.beat - 1 < 0.4;
      if (isDown && !this.landed[i]) cam.addTrauma(0.45);
      this.landed[i] = l.state === 'landed';
    }
    // ---- the call's gold rings (the answer targets): flying out of each stomp, then closing on their beat
    this.drawCallRings(g, game, x0, x1, clock);
  }

  /**
   * a landed letter's WALKABLE TOP (terrain language: 4 px black edge + cream lip): a riveted steel deck along its back,
   * so the bridge reads as floor and the wells between letters stay the only red
   */
  private drawDeck(g: CanvasRenderingContext2D, x: number, y: number, len: number): void {
    g.fillStyle = '#16100C';
    g.fillRect(x - 4, y - 8, len + 8, 30);
    const gr = g.createLinearGradient(0, y - 4, 0, y + 20);
    gr.addColorStop(0, '#8A7890');
    gr.addColorStop(1, '#3A2A3A');
    g.fillStyle = gr;
    g.fillRect(x, y - 4, len, 22);
    g.fillStyle = '#F4EFE2';
    g.fillRect(x, y - 6, len, 4);
    g.fillStyle = 'rgba(22,16,12,0.7)';
    for (let rx = x + 18; rx < x + len - 10; rx += 46) {
      g.beginPath();
      g.arc(rx, y + 8, 3.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  // ------------------------------------------------------------------ inside the film, screen space
  screen(g: CanvasRenderingContext2D, game: Game, toScreen: ToScreen, heroSx: number, heroSy: number, b: BeatInfo, clock: number, L: Lighting): void {
    const A = game.mech.act3;
    const wb = game.worldBeat;
    // ---- the HUSH: a reel-change freeze before the break (sepia hold + the changeover dot flares)
    const hush = game.level.setPieces.find((s) => s.name === 'hush');
    if (hush && wb >= hush.beat && wb < hush.beat + hush.beats) {
      const u = (wb - hush.beat) / hush.beats;
      g.fillStyle = `rgba(40,24,10,${0.28 * Math.sin(u * Math.PI)})`;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      const r = 44 + 16 * Math.sin(clock * 30);
      g.fillStyle = 'rgba(20,10,6,0.85)';
      g.beginPath();
      g.arc(VIEW_W - 150, 140, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(248,241,220,0.9)';
      g.lineWidth = 5;
      g.stroke();
      drawGlow(g, VIEW_W - 150, 140, '#F8F1DC', 160, 0.5);
    }
    // ---- the finale's IRIS before the hit: the blades only creep in at the corners (one per beat) — the frame stays
    // full so the last Hup-Hup-HEY is played big; the SLAM is post() on the hit
    const I = A.state.iris;
    if (!I.active || wb >= I.beat) return;
    const [cx, cy] = this.irisCentre(toScreen, heroSx, heroSy);
    this.irisAt = [cx, cy];
    drawIris(g, cx, cy, this.preR(I.close), I.close * 2.2, 1);
    void b;
    void clock;
    void L;
  }

  /** the finale's focus on screen (the push-in centre): the pre-hit iris centre, between Slim and Big Jim */
  focus(): [number, number] {
    return this.irisAt;
  }

  /** where the pre-hit iris sat (the slam starts there and homes in on Slim) */
  private irisAt: [number, number] = [VIEW_W / 2, VIEW_H / 2];

  /** the iris radius before the hit (a vignette that never reaches the play band) */
  private preR(close: number): number {
    return Math.hypot(VIEW_W, VIEW_H) * 0.62 * (1 - 0.3 * close);
  }

  /** the iris centre: on Slim, leaning a little toward Big Jim's face (both stay in the shot) */
  private irisCentre(toScreen: ToScreen, hx: number, hy: number): [number, number] {
    let cx = hx;
    let cy = hy - 90;
    if (!Number.isNaN(this.face.x)) {
      const [fx, fy] = toScreen(this.face.x, this.face.y);
      cx += (fx - cx) * 0.25;
      cy += (fy - cy) * 0.25;
    }
    return [Math.max(360, Math.min(VIEW_W - 360, cx)), Math.max(260, Math.min(VIEW_H - 260, cy))];
  }

  /**
   * AFTER THE FINAL HIT (screen space, over the frozen strike; T = seconds since the hit, hero = Slim's screen pos in the
   * frozen frame): the light burst at the cue tip, the iris SLAMMING shut on Slim (accelerating, done by ENDING.shut),
   * then THE END burning in, then the victory iris.
   */
  post(g: CanvasRenderingContext2D, game: Game, T: number, hx: number, hy: number, at: [number, number], b: BeatInfo, clock: number, L: Lighting): void {
    if (T < ENDING.shut) {
      const I = game.mech.act3.state.iris;
      const u = Math.max(0, (T - 0.06) / (ENDING.shut - 0.06));
      // the hit OPENS the frame fully (the blades spring back on the flash), then the iris slams shut, accelerating
      const r = Math.hypot(VIEW_W, VIEW_H) * 0.7 * (1 - u * u * u);
      void I;
      // IMPACT FRAMES: the white-out on contact (drawFinalBurst), then ~3 film frames in NEGATIVE (the white-out and
      // the burst invert to a dark frame with the silhouettes burning), then the held contact frame — the hitstop
      drawFinalBurst(g, T, at[0], at[1]);
      drawLensShatter(g, T, at[0] + 20, at[1] - 60);
      if (T >= ENDING.freeze + 0.02 && T < ENDING.freeze + 0.08) {
        g.save();
        g.globalCompositeOperation = 'difference';
        g.fillStyle = '#FFF6E8';
        g.fillRect(0, 0, VIEW_W, VIEW_H);
        g.restore();
      }
      const m = Math.min(1, u * 1.6);
      const cx = this.irisAt[0] + (hx - this.irisAt[0]) * m;
      const cy = this.irisAt[1] + (hy - 90 - this.irisAt[1]) * m;
      drawIris(g, cx, cy, Math.max(0, r), 1.4 + u * 2.4, 1);
      if (u > 0.85) drawGlow(g, cx, cy, '#FFF6E8', 60 + 200 * (1 - u), 0.7);
      return;
    }
    this.ending(g, T - ENDING.shut, T, b, clock, L);
  }

  /** the ending: t = seconds since the iris shut (black -> the film snaps -> THE END), then a clean cut to the victory */
  private ending(g: CanvasRenderingContext2D, t: number, T: number, b: BeatInfo, clock: number, L: Lighting): void {
    if (T < ENDING.victory) {
      drawTheEnd(g, t * ENDING.endSpeed, b);
      // THE END dips to black just before the victory iris opens (no double exposure)
      const out = Math.max(0, Math.min(1, (T - (ENDING.victory - 0.25)) / 0.25));
      if (out > 0) {
        g.fillStyle = `rgba(5,4,3,${out})`;
        g.fillRect(0, 0, VIEW_W, VIEW_H);
      }
      return;
    }
    drawVictory(g, T - ENDING.victory, b, (x, y, s) => drawSlim(g, x, y, { pose: 'victory', poseTime: 0.6 + T, time: clock, beatPhase: b.beatPhase, beat: b.beat, scale: s }), L);
  }

  // ------------------------------------------------------------------ the theatre around the film (outside it)
  /** the curtain frame over the film's edges + the marquee cut-in (the finale; screen space, after the film pass) */
  hall(g: CanvasRenderingContext2D, game: Game, b: BeatInfo, clock: number): void {
    const k = this.curtainK(game);
    if (k <= 0.001) return;
    const wb = game.worldBeat;
    const ms = game.level.setPieces.find((s) => s.name === 'marqueeSwap');
    if (ms && Number.isNaN(this.hitClock)) {
      const mk = (wb - ms.beat) / Math.max(1, ms.beats);
      if (mk > 0 && mk < 1.4) drawMarqueeCutIn(g, mk, b, clock);
    }
    drawCurtainFrame(g, k, b);
  }

  /** the house erupting in front of the screen after the final hit (over the audience strip) */
  eruption(g: CanvasRenderingContext2D, T: number, b: BeatInfo): void {
    if (!(T >= 0)) return;
    drawEruption(g, T, b, 1);
  }
}

/**
 * a pool-room goon doing the call (feet centre x, y; ~175 px tall at s = 1): burly silhouette in a fig or bottle-green
 * vest, flat cap, lamp rim light. `lift` 0..1 = knee up, `slam` 1..0 = the stomp's squash.
 */
function drawGoon(g: CanvasRenderingContext2D, x: number, y: number, s: number, lift: number, slam: number, i: number, clock: number): void {
  const vest = ['#3E2A44', '#2A3E34', '#44302A'][i % 3];
  g.save();
  g.translate(x, y);
  g.scale(s * (1 + 0.12 * slam), s * (1 - 0.1 * slam));
  const bob = Math.sin(clock * 6 + i) * 2;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // legs: planted + the stomping one (knee up)
  g.strokeStyle = '#1E1612';
  g.lineWidth = 22;
  g.beginPath();
  g.moveTo(-16, -78);
  g.lineTo(-20, -40);
  g.lineTo(-22, 0);
  g.moveTo(16, -78);
  g.lineTo(26 + 24 * lift, -44 - 40 * lift);
  g.lineTo(28 + 10 * lift, -2 - 56 * lift);
  g.stroke();
  // boots
  g.fillStyle = '#0D0A08';
  g.fillRect(-38, -12, 32, 14);
  g.fillRect(24 + 10 * lift, -14 - 56 * lift, 34, 14);
  // torso (vest over a cream shirt), arms swinging down on the stomp
  g.fillStyle = '#D9CDB8';
  g.beginPath();
  g.ellipse(0, -118 + bob, 44, 50, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = vest;
  g.beginPath();
  g.ellipse(0, -114 + bob, 46, 48, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#D9CDB8';
  g.beginPath();
  g.moveTo(-10, -160 + bob);
  g.lineTo(10, -160 + bob);
  g.lineTo(0, -120 + bob);
  g.closePath();
  g.fill();
  g.strokeStyle = '#A8664F';
  g.lineWidth = 16;
  const arm = -0.6 + 1.4 * lift - 1.2 * slam;
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(sd * 40, -148 + bob);
    g.lineTo(sd * (58 + 16 * Math.sin(arm)), -110 + bob - 40 * Math.cos(arm) * sd * 0.2 - 30 * lift);
    g.stroke();
  }
  // head + flat cap
  g.fillStyle = '#A8664F';
  g.beginPath();
  g.arc(0, -178 + bob, 20, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2A1A14';
  g.beginPath();
  g.ellipse(4, -192 + bob, 24, 10, 0, Math.PI, Math.PI * 2);
  g.fill();
  g.fillRect(-20, -194 + bob, 50, 6);
  // lamp rim light on the shoulders + cap
  g.strokeStyle = 'rgba(246,231,176,0.8)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, -114 + bob, 46, Math.PI * 1.15, Math.PI * 1.85);
  g.stroke();
  g.beginPath();
  g.arc(0, -178 + bob, 20, Math.PI * 1.1, Math.PI * 1.9);
  g.stroke();
  // ink outline on the torso
  g.strokeStyle = '#0D0A08';
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(0, -114 + bob, 46, 48, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}
