/**
 * MID-ACT VISUAL BEATS (review iter4 fix 4, visual half): the two long rooms — the honky-tonk (bars 16-33) and the
 * facade climb (bars 34-51) — get a new picture every few bars, so no 26-second stretch looks the same. Presentation
 * only (no mechanics); everything is a pure function of the world beat (rewind-safe) plus one-shot camera kicks.
 *
 *   doorKick     the honky-tonk door slams open behind Slim: a warm blast of light, splinters, dust, a camera kick
 *   signCrash    a neon BEER sign snaps a chain, swings and CRASHES into the back bar (sparks, shake), then dies
 *   lightsOut    the house lights cut: the room behind goes black (a candle spot on Slim), flicker, then SNAP back on
 *   brawl        a bar brawl erupts behind the play band: silhouettes trading haymakers on the beat, chairs + bottles
 *                flying through the upper frame, handheld brawl-cam
 *   searchlights the facade: two premiere searchlights sweep up the wall from the street far below (+ a window chase)
 *   rain         the rain starts on the climb (streaks over the frame, a cold wet grade, lightning on the crashes)
 *   policeSweep  the cops arrive below: blue / red light washes sweep the wall on the beat (background only: the play
 *                layer's red stays the danger colour)
 *   moonOut      the rain stops, the clouds part: a big moon over the roof for the stop-time
 *
 * Cues: the level's `setPiece` items with these names (their `beats` = duration). A level without any of them gets the
 * DEFAULT schedule below (edit bars; each gated to its own environment, so a shifted level just skips a beat).
 */
import { type BeatInfo, hit } from '../art/core/beat';
import { drawGlow, star4 } from '../art/core/draw';
import { TAU, hash } from '../art/core/math';
import { CF } from '../art/palette';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import type { Camera } from './camera';
import type { Director } from './director';

export type BeatKind = 'doorKick' | 'signCrash' | 'spotlights' | 'houseLights' | 'lightsOut' | 'brawl' | 'lightChase' | 'searchlights' | 'tenants' | 'rain' | 'policeSweep' | 'moonOut';
const KINDS: BeatKind[] = ['doorKick', 'signCrash', 'spotlights', 'houseLights', 'lightsOut', 'brawl', 'lightChase', 'searchlights', 'tenants', 'rain', 'policeSweep', 'moonOut'];
/** other names a level cue may use for the same beat */
const ALIAS: Record<string, BeatKind> = { signDrop: 'signCrash', streetReveal: 'policeSweep', windowChase: 'lightChase', lightsDown: 'lightsOut', barBrawl: 'brawl', signFall: 'signCrash', police: 'policeSweep', policeLights: 'policeSweep', rainStart: 'rain', moon: 'moonOut', doorOpen: 'doorKick' };
/** which environment each beat belongs to */
const ENV: Record<BeatKind, string> = { doorKick: 'bar', signCrash: 'bar', spotlights: 'bar', houseLights: 'bar', lightsOut: 'bar', brawl: 'bar', lightChase: 'facade', searchlights: 'facade', tenants: 'facade', rain: 'facade', policeSweep: 'facade', moonOut: 'facade' };

const bar = (n: number) => 4 * (n - 1);
/** the default schedule (edit bars): one new picture every 2-5 bars through both long rooms */
const DEFAULT: Cue[] = [
  { kind: 'doorKick', beat: bar(17), beats: 2 },
  { kind: 'signCrash', beat: bar(20) + 2, beats: 1.5 },
  { kind: 'spotlights', beat: bar(22), beats: 36 },
  { kind: 'brawl', beat: bar(24), beats: 20 },
  { kind: 'houseLights', beat: bar(31), beats: 4 },
  { kind: 'lightChase', beat: bar(35), beats: 16, ahead: 1 },
  { kind: 'rain', beat: bar(38), beats: bar(42) - bar(38) },
  { kind: 'policeSweep', beat: bar(39), beats: 4 },
  { kind: 'searchlights', beat: bar(42), beats: 16 },
  { kind: 'tenants', beat: bar(44), beats: 8 },
];
/** beats a picture starts BEFORE its cue (the sign's chain snaps early so the CRASH lands on the cue's beat) */
const LEAD: Partial<Record<BeatKind, number>> = { signCrash: 1.2 };
/** beats a picture lingers after its cue's window (the fallen sign lies there dark for a while) */
const TAIL: Partial<Record<BeatKind, number>> = { signCrash: 6, houseLights: 2 };

interface Cue {
  kind: BeatKind;
  beat: number;
  beats: number;
  /** lightChase: the window lights this many beats ahead of the hero's grid position */
  ahead?: number;
}

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export class VisualBeats {
  private cues: Cue[] = [];
  private key: unknown = null;
  private kicked = new Set<number>();
  private lastRun = -1;
  /** the active beats this frame: kind -> d (beats since its start) */
  private on = new Map<BeatKind, { d: number; c: Cue }>();

  private load(game: Game): void {
    const L = game.level;
    if (this.key === L) return;
    this.key = L;
    const own: Cue[] = [];
    for (const sp of L.setPieces) {
      const kind = (KINDS as string[]).includes(sp.name) ? (sp.name as BeatKind) : ALIAS[sp.name];
      if (kind) own.push({ kind, beat: sp.beat, beats: Math.max(1, sp.beats ?? 4), ahead: (sp as { ahead?: number }).ahead });
    }
    // the level's cues win per kind; the defaults fill the kinds it doesn't cue
    const cued = new Set(own.map((c) => c.kind));
    this.cues = [...own, ...DEFAULT.filter((c) => !cued.has(c.kind))].sort((a, b) => a.beat - b.beat);
  }

  /** once per frame: which beats are live (and their one-shot camera kicks) */
  update(game: Game, cam: Camera, dir: Director, env: string, wb: number): void {
    this.load(game);
    if (game.runId !== this.lastRun) {
      this.lastRun = game.runId;
      this.kicked.clear();
    }
    this.on.clear();
    this.cues.forEach((c, i) => {
      const d = wb - c.beat + (LEAD[c.kind] ?? 0);
      if (d < -0.01 || d > c.beats + (LEAD[c.kind] ?? 0) + (TAIL[c.kind] ?? 1) || ENV[c.kind] !== env) {
        if (d < -0.5) this.kicked.delete(i); // rewound before it: kick again
        return;
      }
      this.on.set(c.kind, { d, c });
      // one-shot camera kicks on the hits
      const hitAt = c.kind === 'signCrash' ? 1.2 : c.kind === 'lightsOut' ? c.beats : -1;
      if (hitAt >= 0 && d >= hitAt && d < hitAt + 0.3 && !this.kicked.has(i)) {
        this.kicked.add(i);
        cam.addTrauma(c.kind === 'lightsOut' ? 0.2 : 0.5);
        dir.punch = Math.max(dir.punch, c.kind === 'lightsOut' ? 0.03 : 0.06);
      }
      if (c.kind === 'brawl' && d < c.beats) {
        // brawl-cam: a small handheld kick on every backbeat
        const ph = d - Math.floor(d);
        if (Math.floor(wb) % 2 === 1 && ph < 0.05 && !this.kicked.has(1000 + Math.floor(wb))) {
          this.kicked.add(1000 + Math.floor(wb));
          cam.addTrauma(0.12);
        }
      }
    });
  }

  /** extra flyers for the director (the brawl throws things on every beat) */
  get brawling(): boolean {
    const b = this.on.get('brawl');
    return !!b && b.d < b.c.beats;
  }

  /** SCREEN space, over the background layers, behind the play band (the camera's shake rotation is active) */
  drawBehind(g: CanvasRenderingContext2D, b: BeatInfo, camX: number): void {
    if (!this.on.size) return;
    const lo = this.on.get('lightsOut');
    if (lo) this.lightsOutBack(g, lo.d, lo.c.beats);
    const sp = this.on.get('spotlights');
    if (sp) this.spotsBack(g, sp.d, sp.c.beats, b, camX);
    const hl = this.on.get('houseLights');
    if (hl) this.houseLights(g, hl.d);
    const sc = this.on.get('signCrash');
    if (sc) this.signCrash(g, sc.d, 1.2 + 6, b, camX);
    const br = this.on.get('brawl');
    if (br) this.brawl(g, br.d, br.c.beats, b, camX);
    const mo = this.on.get('moonOut');
    if (mo) this.moon(g, mo.d, mo.c.beats);
    const rn = this.on.get('rain');
    if (rn) this.rainBack(g, rn.d, rn.c.beats, b);
    const sl = this.on.get('searchlights');
    if (sl) {
      if (!mo) this.moon(g, sl.d, sl.c.beats);
      this.searchlights(g, sl.d, sl.c.beats, b);
    }
    const ps = this.on.get('policeSweep');
    if (ps) this.police(g, ps.d, ps.c.beats, b);
  }

  /** WORLD space, behind the level's entities: the lit-window chase and the tenants on the facade wall */
  drawWorld(g: CanvasRenderingContext2D, game: Game, b: BeatInfo, x0: number, x1: number): void {
    const lc = this.on.get('lightChase');
    const tn = this.on.get('tenants');
    if (!lc && !tn) return;
    const L = game.level;
    const ppb = L.ppb;
    const wb = game.worldBeat;
    if (lc) {
      const ahead = lc.c.ahead ?? 1;
      const n0 = Math.ceil(lc.c.beat);
      const n1 = Math.min(Math.floor(wb), Math.floor(lc.c.beat + lc.c.beats - 1));
      for (let n = n0; n <= n1; n++) {
        const x = (n + ahead) * ppb + 60;
        if (x < x0 - 120 || x > x1 + 120) continue;
        const fy = L.floorYAt(x);
        if (Number.isNaN(fy)) continue;
        const age = wb - n;
        const pop = age < 0.25 ? 1 - age / 0.25 : 0;
        const fade = Math.max(0, 1 - Math.max(0, age - 8) / 2);
        if (fade <= 0) continue;
        litWindow(g, x, fy - 250, fade, pop, n, b, false);
      }
    }
    if (tn) {
      // stop-time: the neighbours throw their windows open one per beat and lean out to yell (arms up on the hits)
      const n0 = Math.ceil(tn.c.beat);
      const n1 = Math.min(Math.floor(wb), Math.floor(tn.c.beat + tn.c.beats - 1));
      const fadeAll = 1 - smooth((wb - (tn.c.beat + tn.c.beats)) / 1);
      for (let n = n0; n <= n1; n++) {
        const x = (n + 2.5) * ppb + (hash(n) - 0.5) * 120;
        if (x < x0 - 120 || x > x1 + 120) continue;
        const fy = L.floorYAt(x);
        if (Number.isNaN(fy)) continue;
        const age = wb - n;
        litWindow(g, x, fy - 280 - (n % 2) * 120, fadeAll, age < 0.25 ? 1 - age / 0.25 : 0, n, b, true);
      }
    }
  }

  /** SCREEN space, over the world (inside the film): door blast, the lights-out spot, rain streaks */
  drawFront(g: CanvasRenderingContext2D, b: BeatInfo, heroX: number, heroY: number): void {
    if (!this.on.size) return;
    const dk = this.on.get('doorKick');
    if (dk) this.doorKick(g, dk.d, b, heroX, heroY);
    const lo = this.on.get('lightsOut');
    if (lo) this.lightsOutFront(g, lo.d, lo.c.beats, heroX, heroY);
    const sp = this.on.get('spotlights');
    if (sp) this.spotsFront(g, sp.d, sp.c.beats, b, heroX, heroY);
    const rn = this.on.get('rain');
    if (rn) this.rainFront(g, rn.d, rn.c.beats, b);
  }

  // ------------------------------------------------------------------ the honky-tonk

  private doorKick(g: CanvasRenderingContext2D, d: number, b: BeatInfo, hx: number, hy: number): void {
    if (d > 1.5) return;
    const ox = hx + 70;
    const oy = hy - 110;
    const t = d * b.spb;
    // a warm blast from the left (the door behind Slim) + a white pop
    if (t < 0.1) {
      g.fillStyle = `rgba(255,236,200,${0.5 * (1 - t / 0.1)})`;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    const a = Math.max(0, 1 - d / 1.5);
    g.save();
    g.globalCompositeOperation = 'lighter';
    // the room's lamps flare through the swinging doors
    drawGlow(g, ox + 200, oy, '#FFD696', 700, 0.55 * a);
    g.restore();
    // splinters + dust flying right from the door
    for (let i = 0; i < 26; i++) {
      const sp = 900 + hash(i) * 1400;
      const ang = (hash(i + 3) - 0.6) * 1.6;
      const x = ox + Math.cos(ang) * sp * t;
      const y = oy + (hash(i + 5) - 0.5) * 160 + Math.sin(ang) * sp * t + 900 * t * t;
      if (x > VIEW_W + 40 || y > VIEW_H + 40) continue;
      g.save();
      g.translate(x, y);
      g.rotate(t * (6 + i) + i);
      g.globalAlpha = a;
      if (i % 3) {
        g.fillStyle = '#8A5A36';
        g.fillRect(-16, -4, 32, 8);
        g.strokeStyle = CF.filmBlack;
        g.lineWidth = 2;
        g.strokeRect(-16, -4, 32, 8);
      } else {
        g.fillStyle = 'rgba(233,216,180,0.6)';
        g.beginPath();
        g.arc(0, 0, 18 + 30 * t, 0, TAU);
        g.fill();
      }
      g.restore();
    }
  }

  private signCrash(g: CanvasRenderingContext2D, d: number, beats: number, b: BeatInfo, camX: number): void {
    // screen x drifts with a mid parallax (it hangs in the back bar)
    const x = VIEW_W * 0.7 - d * 50;
    void camX;
    const topY = VIEW_H * 0.12;
    const hangY = VIEW_H * 0.26;
    const floorY = VIEW_H * 0.56;
    const fade = Math.max(0, 1 - Math.max(0, d - (beats - 1)) / 1);
    if (fade <= 0 || x < -300 || x > VIEW_W + 300) return;
    let y = hangY;
    let rot = 0;
    let lit = 1;
    if (d < 0.8) {
      // one chain snaps: it swings down on the other
      rot = Math.sin(d * 9) * 0.5 * Math.min(1, d * 4);
      lit = Math.sin(d * 60) > 0 ? 1 : 0.3;
    } else if (d < 1.2) {
      const u = (d - 0.8) / 0.4;
      y = hangY + (floorY - hangY) * u * u;
      rot = 0.5 * (1 - u) + 0.15;
      lit = 0.6;
    } else {
      y = floorY;
      rot = 0.15;
      lit = 0;
    }
    g.save();
    g.globalAlpha = fade;
    // chains
    g.strokeStyle = 'rgba(40,30,24,0.9)';
    g.lineWidth = 4;
    g.beginPath();
    if (d < 1.2) {
      g.moveTo(x - 120, topY);
      g.lineTo(x - 120 + Math.cos(rot) * 0, y - 60);
    }
    if (d < 0.02) {
      g.moveTo(x + 120, topY);
      g.lineTo(x + 120, y - 60);
    }
    g.stroke();
    g.translate(x - 120, y - 60);
    g.rotate(rot);
    g.scale(1.5, 1.5);
    // the sign board + BEER in neon
    g.fillStyle = '#1E1418';
    g.fillRect(-10, 0, 260, 120);
    g.strokeStyle = CF.filmBlack;
    g.lineWidth = 6;
    g.strokeRect(-10, 0, 260, 120);
    g.font = 'italic 88px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = lit > 0.5 ? CF.neonJade : 'rgba(80,110,100,0.8)';
    g.fillText('BEER', 120, 62);
    if (lit > 0.5) drawGlow(g, 120, 60, CF.neonJade, 220, 0.4 * lit);
    g.restore();
    // the CRASH: sparks + a dust cloud where it hits the back bar
    const k = d - 1.2;
    if (k >= 0 && k < 1.2) {
      const t = k * b.spb;
      for (let i = 0; i < 30; i++) {
        const ang = -Math.PI / 2 + (hash(i) - 0.5) * 2.6;
        const sp = 400 + hash(i + 1) * 900;
        const px = x + Math.cos(ang) * sp * t;
        const py = floorY + 40 + Math.sin(ang) * sp * t + 1200 * t * t;
        g.fillStyle = i % 3 ? CF.bulb : '#FFFFFF';
        g.globalAlpha = Math.max(0, 1 - k / 1.2) * fade;
        g.fillRect(px, py, 5, 5);
      }
      g.fillStyle = `rgba(200,180,150,${0.35 * (1 - k / 1.2) * fade})`;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.arc(x - 100 + i * 50, floorY + 80 - k * 60, 40 + k * 70, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
      if (k < 0.25) star4(g, x, floorY + 40, 120 * (1 - k / 0.25), k * 4, 'rgba(255,246,220,0.95)');
    }
  }

  /** 0..1 how far the house lights are down (in over a beat, back up over the houseLights cue that follows) */
  private spotK(d: number, beats: number): number {
    return smooth(d / 1) * (1 - smooth((d - beats) / 1.5));
  }

  /** HOUSE LIGHTS DOWN: the room behind goes dark; on the chorus downbeat (+4) the audience STANDS UP into the light */
  private spotsBack(g: CanvasRenderingContext2D, d: number, beats: number, b: BeatInfo, camX: number): void {
    const k = this.spotK(d, beats);
    if (k <= 0) return;
    g.fillStyle = `rgba(8,5,6,${0.62 * k})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    const stand = smooth((d - 4) / 0.6) * k;
    if (stand <= 0) return;
    const hey = hit(b, 'hey', 0.3);
    const baseY = VIEW_H * 0.55;
    backlight(g, baseY - 60, 0.28 * stand);
    g.fillStyle = '#2A1C18';
    g.strokeStyle = '#2A1C18';
    const span = VIEW_W + 200;
    for (let i = 0; i < 22; i++) {
      const x = ((((i * 97 + hash(i) * 60 - camX * 0.5) % span) + span) % span) - 100;
      const s = 0.5 + 0.2 * hash(i + 3);
      const y = baseY + 60 * (1 - stand) + hash(i + 5) * 20;
      const head = y - 90 * s;
      g.beginPath();
      g.ellipse(x, y - 40 * s, 22 * s, 48 * s, 0, Math.PI, TAU);
      g.fill();
      g.beginPath();
      g.arc(x, head, 13 * s, 0, TAU);
      g.fill();
      if (hey > 0.2 || hash(i + 9) > 0.7) {
        g.lineWidth = 7 * s;
        g.lineCap = 'round';
        for (const sd of [-1, 1]) {
          g.beginPath();
          g.moveTo(x + sd * 12 * s, y - 70 * s);
          g.lineTo(x + sd * 26 * s, y - (120 + 20 * hey) * s);
          g.stroke();
        }
      }
    }
  }

  /** three follow-spots from the booth swing in and track Slim (lagging, overlapping), a warm pool on the bar top */
  private spotsFront(g: CanvasRenderingContext2D, d: number, beats: number, b: BeatInfo, hx: number, hy: number): void {
    const k = this.spotK(d, beats);
    if (k <= 0) return;
    const off = beats - d < 1.5 ? smooth((d - (beats - 1.5)) / 1.5) : 0; // the spots swing off for the house lights
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const src = VIEW_W * (0.2 + 0.3 * i);
      const swingIn = 1 - smooth((d - i * 0.25) / 1);
      const lag = Math.sin(b.beat * Math.PI * 0.5 + i * 2) * 90;
      const tx = hx + (i - 1) * 110 + lag + (swingIn + off) * (i - 1 || 1) * 900;
      const ty = hy + 10;
      const gr = g.createLinearGradient(0, -40, 0, ty);
      gr.addColorStop(0, `rgba(255,241,214,${0.02 * k})`);
      gr.addColorStop(1, `rgba(255,241,214,${0.13 * k})`);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(src - 30, -40);
      g.lineTo(src + 30, -40);
      g.lineTo(tx + 150, ty);
      g.lineTo(tx - 150, ty);
      g.closePath();
      g.fill();
      g.fillStyle = `rgba(255,236,200,${0.12 * k})`;
      g.beginPath();
      g.ellipse(tx, ty, 160, 34, 0, 0, TAU);
      g.fill();
    }
    g.restore();
  }

  /** the house lights come back UP: a warm fade-up over the room, dust hanging in it */
  private houseLights(g: CanvasRenderingContext2D, d: number): void {
    const k = Math.max(0, 1 - d / 2.5) * smooth(d / 0.5);
    if (k <= 0) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,214,150,${0.22 * k})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.restore();
    g.fillStyle = `rgba(233,216,180,${0.5 * k})`;
    for (let i = 0; i < 60; i++) g.fillRect(hash(i) * VIEW_W, (hash(i + 7) * VIEW_H * 0.6 + d * 40 * (0.5 + hash(i + 2))) % (VIEW_H * 0.6), 3, 3);
  }

  private lightsOutBack(g: CanvasRenderingContext2D, d: number, beats: number): void {
    // the room behind drops to black (flicker in), the lights SNAP back on at `beats` with a warm pop
    const on = d >= beats;
    if (on) {
      const k = d - beats;
      if (k < 0.6) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(255,220,160,${0.35 * (1 - k / 0.6)})`;
        g.fillRect(0, 0, VIEW_W, VIEW_H);
        g.restore();
      }
      return;
    }
    const flick = d < 0.3 ? (Math.floor(d * 24) % 2 ? 0.4 : 0.9) : 0.9;
    g.fillStyle = `rgba(6,4,6,${flick})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  private lightsOutFront(g: CanvasRenderingContext2D, d: number, beats: number, hx: number, hy: number): void {
    if (d >= beats) return;
    // the play band stays readable: a dim veil + one warm spot on Slim that leans ahead of him
    const flick = d < 0.3 ? (Math.floor(d * 24) % 2 ? 0.2 : 0.45) : 0.45;
    const sx = hx + 260;
    const sy = hy - 60;
    const gr = g.createRadialGradient(sx, sy, 260, sx, sy, 1050);
    gr.addColorStop(0, 'rgba(6,4,6,0)');
    gr.addColorStop(1, `rgba(6,4,6,${flick})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    drawGlow(g, hx, hy - 90, '#FFE9C2', 260, 0.25);
  }

  private brawl(g: CanvasRenderingContext2D, d: number, beats: number, b: BeatInfo, camX: number): void {
    const inK = smooth(d / 0.5) * (1 - smooth((d - beats) / 1));
    if (inK <= 0) return;
    const baseY = VIEW_H * 0.5;
    const punch = Math.exp(-b.beatPhase * 6);
    const back = Math.floor(b.beat) % 2 === 1;
    backlight(g, baseY - 80, 0.3 * inK);
    g.save();
    g.globalAlpha = 0.95 * inK;
    for (let i = 0; i < 6; i++) {
      const span = VIEW_W + 600;
      const x = ((((i * 353 - camX * 0.6) % span) + span) % span) - 300;
      const s = 0.55 + 0.15 * hash(i);
      const y = baseY + hash(i + 7) * 30;
      const hitter = (i + (back ? 1 : 0)) % 2;
      // two silhouettes trading haymakers on the beat
      for (const side of [-1, 1]) {
        const px = x + side * 70 * s;
        const swing = (side === (hitter ? 1 : -1) ? punch : 0) * 60 * s;
        const reel = (side === (hitter ? -1 : 1) ? punch : 0) * 18 * s;
        g.fillStyle = side < 0 ? '#2E201C' : '#35251F';
        g.beginPath();
        g.ellipse(px - side * reel, y - 70 * s, 34 * s, 56 * s, side * reel * 0.01, 0, TAU);
        g.fill();
        g.beginPath();
        g.arc(px - side * reel * 1.4, y - 140 * s, 18 * s, 0, TAU);
        g.fill();
        g.strokeStyle = g.fillStyle as string;
        g.lineWidth = 13 * s;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(px - side * 10 * s, y - 100 * s);
        g.lineTo(px - side * (40 * s + swing), y - 110 * s - swing * 0.2);
        g.stroke();
        g.beginPath();
        g.moveTo(px, y - 30 * s);
        g.lineTo(px + side * 20 * s, y + 30 * s);
        g.stroke();
      }
      // the POW spark between them
      if (punch > 0.6) star4(g, x, y - 110 * s, 30 * punch * s, i, 'rgba(255,236,190,0.9)');
    }
    g.restore();
  }

  // ------------------------------------------------------------------ the facade

  private searchlights(g: CanvasRenderingContext2D, d: number, beats: number, b: BeatInfo): void {
    const k = smooth(d / 1) * (1 - smooth((d - beats) / 1));
    if (k <= 0) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const bx = VIEW_W * (0.25 + 0.5 * i);
      const ang = -Math.PI / 2 + Math.sin(b.beat * Math.PI * 0.25 + i * 2.4) * 0.5;
      const len = 1900;
      const w = 0.06;
      const gr = g.createLinearGradient(bx, VIEW_H + 100, bx + Math.cos(ang) * len, VIEW_H + 100 + Math.sin(ang) * len);
      gr.addColorStop(0, `rgba(248,241,220,${0.3 * k})`);
      gr.addColorStop(1, 'rgba(248,241,220,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(bx - 20, VIEW_H + 100);
      g.lineTo(bx + Math.cos(ang - w) * len, VIEW_H + 100 + Math.sin(ang - w) * len);
      g.lineTo(bx + Math.cos(ang + w) * len, VIEW_H + 100 + Math.sin(ang + w) * len);
      g.lineTo(bx + 20, VIEW_H + 100);
      g.closePath();
      g.fill();
    }
    // a window-light chase: a warm band running up the wall on each bar, lighting the windows it passes
    const u = (b.beat / 4) % 1;
    const y = VIEW_H * (1 - u * 1.2);
    const gr = g.createLinearGradient(0, y - 120, 0, y + 120);
    gr.addColorStop(0, 'rgba(255,210,140,0)');
    gr.addColorStop(0.5, `rgba(255,210,140,${0.1 * k})`);
    gr.addColorStop(1, 'rgba(255,210,140,0)');
    g.fillStyle = gr;
    g.fillRect(0, y - 120, VIEW_W, 240);
    g.restore();
  }

  private rainK(d: number, beats: number): number {
    return smooth(d / 2) * (1 - smooth((d - beats) / 2));
  }

  private rainBack(g: CanvasRenderingContext2D, d: number, beats: number, b: BeatInfo): void {
    const k = this.rainK(d, beats);
    if (k <= 0) return;
    // a cold wet grade over the backdrop
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgba(150,170,210,${0.35 * k})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.restore();
    // lightning on the crashes (a bolt + a sky flash, never a full-frame strobe)
    const s = b.since.crash;
    if (s < 0.3) {
      const n = b.count.crash;
      const a = k * (s < 0.06 || (s > 0.12 && s < 0.18) ? 1 : 0.3) * (1 - s / 0.3);
      const x0 = 300 + hash(n * 13) * (VIEW_W - 600);
      drawGlow(g, x0, VIEW_H * 0.15, '#C9C8FF', 600, 0.5 * a);
      g.strokeStyle = `rgba(230,228,255,${a})`;
      g.lineWidth = 4;
      g.beginPath();
      let x = x0;
      let y = -20;
      g.moveTo(x, y);
      for (let i = 0; i < 9; i++) {
        x += (hash(n * 7 + i) - 0.5) * 120;
        y += 40 + hash(n * 3 + i) * 40;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  }

  private rainFront(g: CanvasRenderingContext2D, d: number, beats: number, b: BeatInfo): void {
    const k = this.rainK(d, beats);
    if (k <= 0) return;
    const t = b.time;
    g.strokeStyle = `rgba(210,222,245,${0.3 * k})`;
    g.lineWidth = 2;
    g.beginPath();
    const n = Math.round(220 * k);
    for (let i = 0; i < n; i++) {
      const sp = 1500 + hash(i) * 800;
      const x0 = hash(i * 3) * (VIEW_W + 400) - t * 420 * (0.8 + hash(i) * 0.4);
      const x = ((x0 % (VIEW_W + 400)) + VIEW_W + 400) % (VIEW_W + 400);
      const y = (hash(i * 7) * VIEW_H + t * sp) % (VIEW_H + 80);
      g.moveTo(x, y - 40);
      g.lineTo(x - 12, y);
    }
    g.stroke();
  }

  private police(g: CanvasRenderingContext2D, d: number, beats: number, b: BeatInfo): void {
    const k = smooth(d / 0.5) * (1 - smooth((d - beats) / 1));
    if (k <= 0) return;
    const blueLeft = Math.floor(b.beat * 2) % 2 === 0;
    const flash = 0.6 + 0.4 * Math.exp(-((b.beat * 2) % 1) * 4);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const side of [0, 1]) {
      const blue = (side === 0) === blueLeft;
      const col = blue ? [70, 110, 255] : [224, 64, 110];
      const sweep = Math.sin(b.beat * Math.PI * 0.5 + side * Math.PI) * 0.35;
      const cx = VIEW_W * (side ? 0.72 : 0.28) + sweep * VIEW_W * 0.3;
      const gr = g.createRadialGradient(cx, VIEW_H + 80, 60, cx, VIEW_H + 80, 1100);
      gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${0.34 * k * flash})`);
      gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // the street far below: headlight / taillight streaks racing along the bottom of the frame
    for (let i = 0; i < 14; i++) {
      const lane = i % 2;
      const sp = (900 + hash(i) * 700) * (lane ? -1 : 1);
      const x = ((((hash(i + 3) * VIEW_W + b.time * sp) % (VIEW_W + 400)) + VIEW_W + 400) % (VIEW_W + 400)) - 200;
      const y = VIEW_H * (0.9 + 0.04 * lane);
      const gr = g.createLinearGradient(x, 0, x - Math.sign(sp) * 160, 0);
      gr.addColorStop(0, lane ? `rgba(255,236,190,${0.6 * k})` : `rgba(255,120,90,${0.5 * k})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(Math.min(x, x - Math.sign(sp) * 160), y, 160, 5);
    }
    g.restore();
    void hit;
  }

  private moon(g: CanvasRenderingContext2D, d: number, beats: number): void {
    const k = smooth(d / 3) * (1 - smooth((d - beats) / 1));
    if (k <= 0) return;
    const mx = VIEW_W * 0.78;
    const my = VIEW_H * 0.17;
    g.save();
    g.globalAlpha = k;
    drawGlow(g, mx, my, '#DDE4FF', 420, 0.45);
    g.fillStyle = '#F2EEDC';
    g.beginPath();
    g.arc(mx, my, 70, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(180,176,160,0.5)';
    for (const [dx, dy, r] of [
      [-20, -14, 14],
      [22, 12, 10],
      [4, 30, 8],
    ] as [number, number, number][]) {
      g.beginPath();
      g.arc(mx + dx, my + dy, r, 0, TAU);
      g.fill();
    }
    // the clouds parting across it
    const part = smooth(d / 4);
    g.fillStyle = 'rgba(40,36,60,0.8)';
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.ellipse(mx + sd * (60 + 260 * part), my + 20, 180, 46, 0, 0, TAU);
      g.fill();
    }
    g.restore();
  }
}

/**
 * one lit window on the facade wall (world space, centre x, top y): a warm pane in a dark frame, a tenant's silhouette
 * (leaning out and yelling with arms up on the beat when `yell`), a flash when it pops on. Scenery: never gold / red.
 */
function litWindow(g: CanvasRenderingContext2D, x: number, y: number, a: number, pop: number, seed: number, b: BeatInfo, yell: boolean): void {
  const w = 96;
  const h = 128;
  g.save();
  g.globalAlpha = a;
  g.fillStyle = '#1A1014';
  g.fillRect(x - w / 2 - 10, y - 10, w + 20, h + 20);
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#FFE2A8');
  gr.addColorStop(1, '#E8A860');
  g.fillStyle = gr;
  g.fillRect(x - w / 2, y, w, h);
  // the tenant
  const bob = yell ? Math.exp(-b.beatPhase * 5) : 0;
  const tx = x + (hash(seed) - 0.5) * 30;
  g.fillStyle = '#2A1A1E';
  g.beginPath();
  g.ellipse(tx, y + h - 20 - bob * 18, 26, 44, 0, Math.PI, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(tx, y + h - 70 - bob * 22, 15, 0, Math.PI * 2);
  g.fill();
  if (yell) {
    g.strokeStyle = '#2A1A1E';
    g.lineWidth = 9;
    g.lineCap = 'round';
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(tx + sd * 18, y + h - 50 - bob * 18);
      g.lineTo(tx + sd * (30 + 10 * bob), y + h - 100 - bob * 40);
      g.stroke();
    }
    // the yell: a jagged cream burst
    if (bob > 0.4) star4(g, tx + 50, y + 10, 26 * bob, seed, 'rgba(255,246,232,0.95)');
    // shutters flung open
    g.fillStyle = '#3E2A2E';
    g.fillRect(x - w / 2 - 34, y, 22, h);
    g.fillRect(x + w / 2 + 12, y, 22, h);
  }
  // sash bars + sill
  g.fillStyle = '#1A1014';
  g.fillRect(x - 3, y, 6, h);
  g.fillRect(x - w / 2, y + h / 2 - 3, w, 6);
  g.fillStyle = '#8A7060';
  g.fillRect(x - w / 2 - 14, y + h + 8, w + 28, 8);
  g.globalCompositeOperation = 'lighter';
  drawGlow(g, x, y + h / 2, '#FFC878', 170, 0.35 + 0.5 * pop);
  g.restore();
}

/** a warm band of light behind the back bar (silhouettes in front of it read against the dark room) */
function backlight(g: CanvasRenderingContext2D, y: number, a: number): void {
  if (a <= 0.01) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createLinearGradient(0, y - 150, 0, y + 110);
  gr.addColorStop(0, 'rgba(255,190,120,0)');
  gr.addColorStop(0.6, `rgba(255,190,120,${a})`);
  gr.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = gr;
  g.fillRect(0, y - 150, VIEW_W, 260);
  g.restore();
}
