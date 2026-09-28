/**
 * SET-PIECE MOMENTS (review iter2 fix 4/6, visual half): the camera and the frame make the big beats BIG.
 *
 *   LAUNCH REVEAL  every long launch (bounce pad flight >= 1.5 beats or >= 100 px up — the bar-9 launch onto
 *                  the roofs, the chorus launch onto the bar top): the camera pulls out (-16 %) and looks up,
 *                  speed lines rush down the frame edges, searchlights sweep the sky behind the city, a bloom
 *                  flips the sky on take-off. Eased over the flight in MUSICAL time (exact under rewinds).
 *   GIANT SMASH    big breakables inside the song's walkdown (lane `bassWalks` name ~ walkdown) are drawn 2x
 *                  (`giantAt`), and each smash is the act's money shot: projector flash, a 70s comic "KRAK!"
 *                  stamp, radial speed lines, zoom punch, heavy shake and world-space debris (staves, hoops, foam).
 *   THE SHOT       choruses are a different SHOT: the director zooms out, and here the background gets a
 *                  theatrical gel (colour shift, alternating per 2-bar line), crossing searchlights behind
 *                  the play band, and a key follow-spot + dark iris on the star. The play layer keeps its true
 *                  colours (danger language). Level `fx: 'shot'` cues (if any) punch the shot on their beat.
 *
 * Read-only on game state; owns only render-side state (camera moment offsets, debris).
 */
import type { BeatInfo } from '../art/core/beat';
import { drawGlow } from '../art/core/draw';
import { TAU, hash } from '../art/core/math';
import { CF } from '../art/palette';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import type { Camera } from './camera';
import type { MusicFeed } from './music';
import { MARQUEE } from './screens';

interface Debris {
  on: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  kind: number;
  t: number;
  s: number;
}

interface Smash {
  x: number;
  y: number;
  t: number;
  word: string;
}

const WORDS = ['KRAK!', 'SMASH!', 'WHAM!', 'KA-BOOM!'];
const PIN_WORDS = ['STRIKE!', 'KRAK!', 'TURKEY!', 'STRIKE!'];

export class Moments {
  /** 0..1 launch reveal envelope */
  launchK = 0;
  /** 0..1 chorus shot */
  shotK = 0;
  private launch: { beat: number; land: number } | null = null;
  private padUsed: boolean[] = [];
  private broke: boolean[] = [];
  private walk: [number, number][] = [];
  private debris: Debris[] = [];
  private smashes: Smash[] = [];
  private punch = 0;
  private freeze = 0;
  private seed = 3;
  private lastRun = -1;
  private shotPunch = 0;
  private wordN = -1;
  private lastShotCue = -1;
  /** hero screen pos (set by the renderer each frame) */
  heroSx = 0;
  heroSy = 0;

  constructor(g: Game) {
    try {
      for (const e of g.song.lane('bassWalks')) {
        const n = String((e as unknown as { name?: string }).name ?? '');
        const end = (e as unknown as { endBeat?: number }).endBeat;
        if (/walkdown/i.test(n) && typeof end === 'number') this.walk.push([e.beat - 0.5, end + 0.5]);
      }
    } catch {
      /* no beat map: no walkdowns */
    }
    for (let i = 0; i < 64; i++) this.debris.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, kind: 0, t: 0, s: 1 });
  }

  private rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed & 0xffffff) / 0x1000000;
  }

  /** is a BIG breakable at this beat a GIANT (walkdown money-shot) one? */
  giantAt(beat: number): boolean {
    for (const [a, z] of this.walk) if (beat >= a && beat <= z) return true;
    return false;
  }

  update(g: Game, dt: number, feed: MusicFeed, cam: Camera, wb: number, active: boolean): void {
    const L = g.level;
    if (g.runId !== this.lastRun || this.padUsed.length !== L.bouncePads.length || this.broke.length !== L.breakables.length) {
      this.lastRun = g.runId;
      this.padUsed = L.bouncePads.map((p) => p.used);
      this.broke = L.breakables.map((b) => b.broken);
      this.launch = null;
    }
    // --- launches
    L.bouncePads.forEach((p, i) => {
      if (p.used && !this.padUsed[i]) {
        const big = p.landBeat - p.beat >= 1.5 || p.y - p.landY >= 100;
        if (big) this.launch = { beat: Math.min(wb, p.beat + 0.2), land: p.landBeat };
      }
      this.padUsed[i] = p.used;
    });
    let lk = 0;
    if (this.launch) {
      const { beat, land } = this.launch;
      if (wb < beat - 0.5) this.launch = null;
      else {
        const u = (wb - beat) / Math.max(0.5, land - beat);
        lk = u < 0.2 ? u / 0.2 : u < 0.85 ? 1 : Math.max(0, 1 - (u - 0.85) / 0.45);
        lk = lk * lk * (3 - 2 * lk);
        if (u > 1.4) this.launch = null;
      }
    }
    this.launchK = lk;
    // --- giant smashes
    L.breakables.forEach((b, i) => {
      if (b.broken && !this.broke[i] && (b.giant || (b.big && this.giantAt(b.beat)))) this.smash(b.x, b.y, b.r, cam, b.look === 'pin');
      this.broke[i] = b.broken;
    });
    // --- the chorus shot (+ level 'shot' cues punch it)
    const sp = (g as unknown as { setPiece?: { name: string } | null }).setPiece;
    const want = active && (feed.chorus || sp?.name === 'chorusShot') ? 1 : 0;
    this.shotK += (want - this.shotK) * Math.min(1, dt * 1.8);
    for (let i = 0; i < L.fx.length; i++) {
      const c = L.fx[i] as { beat: number; fx: string; amount: number };
      if (c.fx !== 'shot' || i === this.lastShotCue) continue;
      if (wb >= c.beat && wb < c.beat + 0.25) {
        this.lastShotCue = i;
        this.shotPunch = Math.max(this.shotPunch, Math.min(1, c.amount || 1));
      }
    }
    // --- camera: pull out + look up on the launch, punch in on smashes
    cam.momentZoom = -0.16 * this.launchK + this.punch - 0.04 * this.shotPunch;
    cam.momentY = -150 * this.launchK;
    this.punch *= Math.exp(-dt / 0.1);
    this.freeze *= Math.exp(-dt / 0.14);
    this.shotPunch *= Math.exp(-dt / 0.5);
    for (const d of this.debris) {
      if (!d.on) continue;
      d.t += dt;
      d.vy += 2600 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      if (d.t > 1.3) d.on = false;
    }
    for (const s of this.smashes) s.t += dt;
    while (this.smashes.length && this.smashes[0].t > 0.6) this.smashes.shift();
  }

  private smash(x: number, y: number, r: number, cam: Camera, pin = false): void {
    this.punch = Math.max(this.punch, 0.07);
    this.freeze = 1;
    cam.addTrauma(0.5);
    this.wordN++;
    this.smashes.push({ x, y: y - r * 2.2, t: 0, word: pin ? PIN_WORDS[this.wordN % PIN_WORDS.length] : WORDS[this.wordN % WORDS.length] });
    if (this.smashes.length > 3) this.smashes.shift();
    let n = 0;
    for (const d of this.debris) {
      if (d.on) continue;
      if (++n > 26) break;
      const a = -Math.PI / 2 + (this.rand() - 0.5) * 2.6;
      const sp = 500 + this.rand() * 1100;
      d.on = true;
      d.t = 0;
      d.x = x + (this.rand() - 0.5) * r * 2;
      d.y = y + (this.rand() - 0.5) * r * 2;
      d.vx = Math.cos(a) * sp + 250;
      d.vy = Math.sin(a) * sp;
      d.rot = this.rand() * TAU;
      d.vr = (this.rand() - 0.5) * 22;
      d.kind = pin ? 3 + (n % 2) : n % 3;
      d.s = 0.7 + this.rand() * 0.8;
    }
  }

  /** SCREEN space, after the background layers, before the world: gel + searchlights behind the play band */
  drawBehind(g: CanvasRenderingContext2D, b: BeatInfo): void {
    const s = this.shotK;
    if (s > 0.01) {
      // theatrical gel over the background only (colour shift per 2-bar line: rose / violet)
      const line = Math.floor(b.beat / 8) % 2;
      g.save();
      g.globalCompositeOperation = 'multiply';
      const gr = g.createLinearGradient(0, 0, 0, VIEW_H);
      gr.addColorStop(0, line ? '#B890E0' : '#E890B8');
      gr.addColorStop(1, '#FFD8B8');
      g.globalAlpha = 0.45 * s;
      g.fillStyle = gr;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      g.restore();
      // crossing searchlights, swinging on the half-bar
      this.beams(g, b, 0.1 * s, [CF.neonRose, CF.neonJade], b.beat * 0.25);
    }
    if (this.launchK > 0.01) this.beams(g, b, 0.16 * this.launchK, [CF.beamHaze, CF.bulb, CF.beamHaze], b.time * 0.9);
  }

  private beams(g: CanvasRenderingContext2D, b: BeatInfo, a: number, cols: string[], phase: number): void {
    g.save();
    g.globalCompositeOperation = 'lighter';
    cols.forEach((c, i) => {
      const bx = VIEW_W * (0.2 + 0.6 * (i / Math.max(1, cols.length - 1)));
      const ang = -Math.PI / 2 + Math.sin(phase * Math.PI + i * 2.1) * 0.55;
      const len = 1400;
      const w = 0.07;
      const gr = g.createLinearGradient(bx, VIEW_H, bx + Math.cos(ang) * len, VIEW_H + Math.sin(ang) * len);
      gr.addColorStop(0, c);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = a;
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(bx - 14, VIEW_H * 0.92);
      g.lineTo(bx + Math.cos(ang - w) * len, VIEW_H * 0.92 + Math.sin(ang - w) * len);
      g.lineTo(bx + Math.cos(ang + w) * len, VIEW_H * 0.92 + Math.sin(ang + w) * len);
      g.lineTo(bx + 14, VIEW_H * 0.92);
      g.closePath();
      g.fill();
    });
    g.restore();
    void b;
  }

  /** WORLD space: debris from giant smashes */
  drawWorld(g: CanvasRenderingContext2D): void {
    for (const d of this.debris) {
      if (!d.on) continue;
      g.save();
      g.translate(d.x, d.y);
      g.rotate(d.rot);
      g.scale(d.s, d.s);
      g.globalAlpha = Math.min(1, (1.3 - d.t) / 0.3);
      g.lineWidth = 3;
      g.strokeStyle = CF.filmBlack;
      if (d.kind === 0) {
        // oak stave
        g.fillStyle = '#8A5A36';
        g.beginPath();
        g.rect(-26, -7, 52, 14);
        g.fill();
        g.stroke();
        g.fillStyle = '#5A3A22';
        g.fillRect(-26, -2, 52, 3);
      } else if (d.kind === 1) {
        // brass hoop
        g.strokeStyle = '#B8923A';
        g.lineWidth = 6;
        g.beginPath();
        g.ellipse(0, 0, 26, 10, 0, 0, TAU);
        g.stroke();
      } else if (d.kind === 3) {
        // pin neck chunk (UV white + pink stripe)
        g.fillStyle = '#F4EFE2';
        g.beginPath();
        g.ellipse(0, 0, 9, 20, 0, 0, TAU);
        g.fill();
        g.stroke();
        g.fillStyle = CF.neonRose;
        g.fillRect(-8, -6, 16, 4);
      } else if (d.kind === 4) {
        // pin belly shard
        g.fillStyle = '#F4EFE2';
        g.beginPath();
        g.moveTo(-16, -8);
        g.lineTo(14, -12);
        g.lineTo(8, 12);
        g.closePath();
        g.fill();
        g.stroke();
      } else {
        // foam
        g.fillStyle = CF.cream;
        g.beginPath();
        g.arc(0, 0, 14, 0, TAU);
        g.arc(12, 6, 9, 0, TAU);
        g.fill();
      }
      g.restore();
    }
    g.globalAlpha = 1;
  }

  /**
   * SCREEN space after the world (inside the film): launch speed lines, the chorus follow-spot + iris,
   * the giant-smash flash / lines / comic stamp. `toScreen` maps world -> screen.
   */
  drawScreen(g: CanvasRenderingContext2D, b: BeatInfo, toScreen: (x: number, y: number) => [number, number]): void {
    const hx = this.heroSx;
    const hy = this.heroSy;
    // --- chorus: key follow-spot from the top + a dark iris around the star
    const s = Math.max(this.shotK, this.shotPunch);
    if (s > 0.01) {
      g.save();
      const iris = g.createRadialGradient(hx, hy - 90, 180, hx, hy - 90, 1150);
      iris.addColorStop(0, 'rgba(10,6,12,0)');
      iris.addColorStop(1, `rgba(10,6,12,${0.42 * s})`);
      g.fillStyle = iris;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      g.globalCompositeOperation = 'lighter';
      const gr = g.createLinearGradient(0, 0, 0, hy);
      gr.addColorStop(0, 'rgba(255,241,214,0)');
      gr.addColorStop(1, `rgba(255,241,214,${0.16 * s})`);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(hx - 60, 0);
      g.lineTo(hx + 60, 0);
      g.lineTo(hx + 170, hy);
      g.lineTo(hx - 170, hy);
      g.closePath();
      g.fill();
      g.restore();
      drawGlow(g, hx, hy - 10, '#FFF1D6', 200, 0.22 * s);
    }
    // --- launch: speed lines rushing DOWN the frame edges (we're rising): tapered cream wedges, thick at take-off
    const lk = this.launchK;
    if (lk > 0.02) {
      g.save();
      g.fillStyle = 'rgba(255,246,232,0.9)';
      for (let i = 0; i < 22; i++) {
        const side = i % 2 ? 1 : 0;
        const edge = hash(i) * 0.2 * VIEW_W;
        const x = side ? VIEW_W - 20 - edge : 20 + edge;
        if (Math.abs(x - hx) < 280) continue;
        const sp = 1.8 + hash(i + 9) * 1.6;
        const y = ((b.time * sp + hash(i + 5)) % 1) * (VIEW_H + 500) - 300;
        const len = 160 + hash(i + 7) * 260;
        const w = 5 + hash(i + 2) * 9;
        g.globalAlpha = lk * (0.35 + 0.4 * hash(i + 3)) * (1 - edge / (0.26 * VIEW_W));
        g.beginPath();
        g.moveTo(x - w / 2, y + len);
        g.lineTo(x + w / 2, y + len);
        g.lineTo(x, y);
        g.closePath();
        g.fill();
      }
      g.restore();
    }
    // --- giant smash: flash, radial lines, the comic stamp
    if (this.freeze > 0.02) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,244,220,${0.42 * this.freeze})`;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      g.restore();
    }
    for (const sm of this.smashes) {
      const [sx, sy] = toScreen(sm.x, sm.y);
      const k = sm.t / 0.6;
      if (sm.t < 0.25) {
        g.save();
        g.strokeStyle = `rgba(26,20,16,${0.6 * (1 - sm.t / 0.25)})`;
        g.lineWidth = 5;
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * TAU + hash(i) * 0.2;
          const r0 = 160 + hash(i + 1) * 80;
          const r1 = r0 + 260 + hash(i + 2) * 200;
          g.beginPath();
          g.moveTo(sx + Math.cos(a) * r0, sy + 120 + Math.sin(a) * r0);
          g.lineTo(sx + Math.cos(a) * r1, sy + 120 + Math.sin(a) * r1);
          g.stroke();
        }
        g.restore();
      }
      const inK = Math.min(1, sm.t / 0.06);
      const sc = 1.8 - 0.8 * inK;
      g.save();
      g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      g.translate(sx, sy - 40 * k);
      g.rotate(-0.12);
      g.scale(sc, sc);
      g.font = `italic 88px ${MARQUEE}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#5E2B4E';
      for (let d = 7; d > 0; d--) g.fillText(sm.word, d, d);
      g.lineWidth = 10;
      g.lineJoin = 'round';
      g.strokeStyle = CF.filmBlack;
      g.strokeText(sm.word, 0, 0);
      g.fillStyle = CF.cream;
      g.fillText(sm.word, 0, 0);
      g.restore();
    }
  }
}
