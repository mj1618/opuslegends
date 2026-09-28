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
 *                        (9 blades, closing per beat, SLAMS on Big Jim's face on the final hit), THE END burning in, the
 *                        second iris opening on Slim's victory pose
 *   art.pullK(game)      the PULL-OUT (0..1): the renderer squeezes the whole film into a screen in the theatre
 *   art.hall(g, ...)     the auditorium around that screen + the marquee cut-in
 */
import { type BeatInfo, hit } from '../art/core/beat';
import { drawGlow, star4 } from '../art/core/draw';
import { JIM_NORM, JIM_PARTS, drawBigJim, drawJimFist } from '../art/grindhouse/bigjim';
import { drawHeadGoon, drawRackFrame } from '../art/grindhouse/casino';
import { drawAuditorium, drawIris, drawMarqueeCutIn, drawTheEnd, drawVictory, screenRect } from '../art/grindhouse/finale';
import { drawLetterLegs, drawSignLetter } from '../art/grindhouse/roof';
import { drawSlim } from '../art/grindhouse/slim';
import type { Lighting } from '../art/world/lighting';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import { BREAK } from '../level/build';
import type { Camera } from './camera';
import { REWARD } from './entityDraw';

type ToScreen = (x: number, y: number) => [number, number];

/** bound parts his body leans onto (the walkdown's gold trophies stay trophies: he just braces and reels behind them) */
const PART_OF_LOOK: Record<string, keyof typeof JIM_PARTS> = { lens: 'lensL', chain: 'chain' };

/** the ending's timeline (seconds after the final hit); the renderer holds the poster until `poster` */
export const ENDING = { victory: 3.0, poster: 6.2 } as const;

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

  /** the pull-out amount (0..1) at the world beat */
  pullK(game: Game): number {
    const sp = game.level.setPieces.find((s) => s.name === 'pullOut');
    if (!sp) return 0;
    const wb = game.worldBeat;
    return smooth((wb - sp.beat) / 2);
  }

  // ------------------------------------------------------------------ BIG JIM (behind the play band)
  behind(g: CanvasRenderingContext2D, game: Game, cam: Camera, x0: number, x1: number, L: Lighting, b: BeatInfo, clock: number): void {
    const A = game.mech.act3;
    const J = A.bigJim.state;
    const wb = game.worldBeat;
    this.drawRack(g, game, x0, x1, L, b);
    this.face.x = NaN;
    if (J.visible <= 0.01) return;
    const s = J.scale;
    const k = JIM_NORM * s;
    const Ht = 1480 * k;
    let ax = J.x;
    let ay = J.y + (1 - J.rise) * 0.85 * Ht;
    if (J.panic > 0.5) {
      // the finale: shrunk into one film frame, held in the upper right of the picture (the iris's target)
      const fk = smooth((J.panic - 0.5) * 2);
      ax += (cam.rx + 430 / cam.rzoom - ax) * fk;
      ay += (cam.ry + 170 / cam.rzoom - ay) * fk;
    }
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
    // the finale: framed, pounding the edges of his film frame on alternating beats
    if (J.panic > 0.5) {
      const ph = Math.floor(wb) % 2;
      const pound = Math.exp(-(wb - Math.floor(wb)) * 5);
      fists[0] = { x: -700 - (ph === 0 ? 120 * pound : 0), y: -700 };
      fists[1] = { x: 700 + (ph === 1 ? 120 * pound : 0), y: -700 };
    }
    // the backhand (his swing rides the Burn's lunge): the right fist sweeps low across the floor
    if (J.swing > 0.05 && !fists[1]) fists[1] = { x: 900 - 1600 * J.swing, y: -100 + 40 * Math.sin(J.swing * Math.PI) };
    const crackT: [number, number] = [0, 1].map((i) => (Number.isNaN(J.crackBeat[i]) ? NaN : (wb - J.crackBeat[i]) * b.spb)) as [number, number];
    g.save();
    g.globalAlpha = Math.min(1, J.visible);
    if (J.panic > 0.5) this.drawFrame(g, ax, ay, k, b);
    drawBigJim(g, ax, ay, s, {
      time: clock,
      beat: wb,
      bluff: J.bluff,
      roar: J.roar,
      reel: J.reel,
      reelDir: J.reelDir,
      crack: J.crack,
      crackT,
      reflect: J.reflect,
      reflectX: Math.sin(wb * 0.5) * 0.4,
      blaze: J.blaze,
      chainT: Number.isNaN(J.chainBeat) ? NaN : (wb - J.chainBeat) * b.spb,
      panic: J.panic,
      fists,
      fistHidden: hidden,
      lift: [0.2 + 0.2 * Math.sin(wb * Math.PI * 0.5), 0.2 + 0.2 * Math.cos(wb * Math.PI * 0.5)],
      light: L,
      throne: J.pose === 'throne' || J.prev === 'throne' || (J.pose === 'bluff' && J.k < 1),
      lod: s < 0.5 ? 0 : 1,
    });
    g.restore();
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
    const ppb = lvl.ppb;
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
      const neon = l.state === 'landed' ? 0 : flick * (l.state === 'standing' ? (Math.sin(clock * 13 + i * 3) > -0.97 ? 1 : 0.4) : 1);
      const landedT = l.landedBeats * b.spb; // (NaN until landed; game/mech/letters.ts keeps it consistent with the state)
      drawSignLetter(g, l.letter, { px: l.x0, py: l.y, len: l.tall, thick, angle: ang, neon, landedT, time: clock, light: L, b });
      // the SLAM: shake the camera once per landing
      const isDown = l.state === 'landed' && wb - l.beat - 1 < 0.4;
      if (isDown && !this.landed[i]) cam.addTrauma(0.45);
      this.landed[i] = l.state === 'landed';
    }
    // ---- the call: each goon stomp lights a gold ring where your answer will land (the same beat, one bar later)
    const C = A.state.call;
    if (C.active && !C.answer && C.stomp > 0) {
      const x = (wb + 4) * ppb + BREAK.ahead;
      if (x > x0 && x < x1 + 800) {
        const y = lvl.surfaceYNear(x) - BREAK.h;
        g.globalAlpha = C.stomp;
        g.strokeStyle = REWARD.gold;
        g.lineWidth = 8;
        g.beginPath();
        g.arc(x, y, 40 + 40 * (1 - C.stomp), 0, Math.PI * 2);
        g.stroke();
        star4(g, x, y, 30 * C.stomp, clock, 'rgba(255,232,150,0.9)');
        g.globalAlpha = 1;
      }
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
    // ---- the finale's IRIS
    const I = A.state.iris;
    if (!I.active) return;
    const maxR = Math.hypot(VIEW_W, VIEW_H) * 0.62;
    let cx = heroSx;
    let cy = heroSy - 80;
    let r = maxR * (1 - I.close);
    // the iris aims at Big Jim's face through the last blades, then SLAMS on it
    if (!Number.isNaN(this.face.x)) {
      const [fx, fy] = toScreen(this.face.x, this.face.y);
      const aim = Math.max(I.slam, smooth(I.close / 0.6) * 0.6);
      cx += (fx - cx) * aim;
      cy += (fy - cy) * aim;
    }
    r *= 1 - I.slam;
    if (wb >= I.beat) {
      if (Number.isNaN(this.hitClock)) this.hitClock = clock;
    } else this.hitClock = NaN;
    const T = Number.isNaN(this.hitClock) ? -1 : clock - this.hitClock;
    if (T < 0.1) {
      drawIris(g, cx, cy, Math.max(0, r), I.close * 2.2 + I.slam * 0.8, 1);
      if (I.slam > 0) drawGlow(g, cx, cy, '#FFFFFF', 300 * (1 - I.slam) + 60, 0.8);
      return;
    }
    this.ending(g, T, b, clock, L);
  }

  /** the ending in seconds after the final hit: black -> the film snaps -> THE END burns in -> the victory iris */
  ending(g: CanvasRenderingContext2D, T: number, b: BeatInfo, clock: number, L: Lighting): void {
    if (T < ENDING.victory) {
      drawTheEnd(g, T, b);
      return;
    }
    drawVictory(g, T - ENDING.victory, b, (x, y, s) => drawSlim(g, x, y, { pose: 'victory', poseTime: 0.6 + T, time: clock, beatPhase: b.beatPhase, beat: b.beat, scale: s }), L);
    // THE END lingers as a title over the victory, fading
    const f = Math.max(0, 1 - (T - ENDING.victory) / 0.9);
    if (f > 0) {
      g.save();
      g.globalAlpha = f;
      drawTheEnd(g, 3, b);
      g.restore();
    }
  }

  // ------------------------------------------------------------------ the hall around the pulled-out screen
  hall(g: CanvasRenderingContext2D, game: Game, k: number, b: BeatInfo, clock: number): void {
    const sr = screenRect(k);
    const wb = game.worldBeat;
    drawAuditorium(g, sr, b, { k, house: k, standing: Math.max(20, game.crowd.count), t: clock });
    const ms = game.level.setPieces.find((s) => s.name === 'marqueeSwap');
    if (ms) {
      const mk = (wb - ms.beat) / Math.max(1, ms.beats);
      if (mk > 0 && mk < 1.4) drawMarqueeCutIn(g, mk, b, clock);
    }
    void drawJimFist;
  }

  screenRect(k: number) {
    return screenRect(k);
  }
}
