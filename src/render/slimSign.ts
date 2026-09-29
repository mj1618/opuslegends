/**
 * THE ROOF SIGN (iteration 7, review iter6 redesign of bars 42-49, "rename the sign"): a rooftop neon sign on a steel
 * lattice behind the roof reads "BIG JIM'S" (rose tubes, "BIG" in script over four steel box letters J I M 'S). Each
 * stop-time strike REWRITES one box letter: the old tube pops dead (sparks, a zap from the strike to the cell), and the new
 * letter BUZZES to life — stutter, catch, steady — in warm gold neon, until it spells S L I M and the frame's bulbs chase.
 * A missed hit leaves that letter as it was (BIG JIM's). On Big Jim's glint (the verse peak) the sign is RIPPED DOWN: a
 * cable snaps, it swings, and drops out of the frame — payback comes at the marquee swap.
 *
 * Data: the level's `signLetters` (beat, index, letter, word) + the `slimSign` set-piece; a letter is rewritten when the
 * judge has a hit graded on its beat. Fallback (a level without them): the stop-time 'neon' breakables in 168-184.
 * Screen space at parallax 0.22 (a far rooftop: it drifts across the frame through the whole stop-time), drawn over
 * the facade's lit windows, under the play layer. Deterministic in the world beat.
 */
import type { BeatInfo } from '../art/core/beat';
import { drawGlow } from '../art/core/draw';
import { hash } from '../art/core/math';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import { MARQUEE } from './screens';

interface Letter {
  beat: number;
  index: number;
  letter: string;
}

const P = 0.22;
const OLD = ['J', 'I', 'M', 'S'];
const ROSE = '#E8569B';
const ROSE_CORE = '#FFD0E6';
const GOLD = '#FFC94A';
const GOLD_CORE = '#FFF4D0';
const CELL_W = 150;
const CELL_H = 176;

export class SlimSign {
  private key: unknown = null;
  private letters: Letter[] = [];
  private from = NaN;
  private to = NaN;
  private rip = NaN;
  private centre = NaN;

  private setup(game: Game): void {
    const L = game.level;
    if (this.key === L) return;
    this.key = L;
    const ext = (L as unknown as { signLetters?: { beat: number; index: number; letter: string; word: string }[] }).signLetters;
    const sp = L.setPieces.find((s) => s.name === 'slimSign');
    let letters: Letter[] = ext && ext.length ? ext.map((l) => ({ beat: l.beat, index: l.index, letter: l.letter })) : [];
    if (!letters.length && (sp || L.def.startBeat < 168)) {
      const neon = L.breakables.filter((k) => k.look === 'neon' && k.beat >= 168 && k.beat < 184).sort((a, b) => a.beat - b.beat);
      letters = neon.slice(0, 4).map((k, i) => ({ beat: k.beat, index: i, letter: 'SLIM'[i] }));
    }
    this.letters = letters;
    if (!letters.length) {
      this.from = NaN;
      return;
    }
    const first = letters[0].beat;
    const last = letters[letters.length - 1].beat;
    this.from = (sp?.beat ?? first) - 6;
    this.to = sp ? sp.beat + sp.beats : last + 6;
    const glint = L.setPieces.find((s) => s.name === 'bigJimGlint' && s.beat > last && s.beat < this.to + 4);
    this.rip = glint ? glint.beat + 0.5 : NaN;
    this.centre = (first + last) / 2 + 0.3;
  }

  /** hero screen pos (hx, hy) for the zap; z = camera zoom; px = the hero's world x */
  draw(g: CanvasRenderingContext2D, game: Game, b: BeatInfo, wb: number, px: number, z: number, hx: number, hy: number): void {
    this.setup(game);
    if (Number.isNaN(this.from) || wb < this.from || wb > this.to + 3) return;
    const ppb = game.level.ppb;
    const sx = VIEW_W / 2 + (this.centre * ppb - px) * P * z;
    if (sx < -700 || sx > VIEW_W + 700) return;
    let sy = 290;
    let rot = 0;
    // the RIP: the left cable snaps, it swings on the right one, then drops
    const rd = Number.isNaN(this.rip) ? -1 : wb - this.rip;
    const W = CELL_W * 4 + 90;
    if (rd > 0) {
      rot = Math.min(0.55, rd * 1.4) + (rd > 0.4 ? Math.sin(rd * 9) * 0.06 * Math.max(0, 1 - rd) : 0);
      if (rd > 0.9) sy += 1400 * (rd - 0.9) ** 2;
      if (sy > VIEW_H + 400) return;
    }
    const dead = rd > 0.25;
    const t = b.time;
    g.save();
    // the lattice legs (stay put; the sign falls off them)
    this.drawLattice(g, sx, 290, W);
    g.translate(sx + W / 2, sy - CELL_H / 2 - 60);
    g.rotate(rot);
    g.translate(-(sx + W / 2), -(sy - CELL_H / 2 - 60));
    // the board: dark steel frame
    const x0 = sx - W / 2;
    const y0 = sy - CELL_H / 2 - 30;
    g.fillStyle = '#17111A';
    g.fillRect(x0, y0, W, CELL_H + 60);
    g.strokeStyle = '#0B0708';
    g.lineWidth = 6;
    g.strokeRect(x0, y0, W, CELL_H + 60);
    // letters
    const hits = this.letters.map((l) => this.state(game, l, wb));
    const done = hits.length >= 4 && hits.every((h) => h.lit && h.k >= 1);
    // "BIG" in script over the cells: dies with the first rewrite
    const bigOn = !dead && !hits.some((h) => h.lit && h.k > 0.2);
    this.tube(g, "BIG", x0 + 70, y0 - 12, `italic 64px ${MARQUEE}`, bigOn ? 1 : 0, ROSE, ROSE_CORE, t, 1);
    for (let i = 0; i < 4; i++) {
      const cx = x0 + 45 + CELL_W * (i + 0.5);
      const cy = sy + 14;
      // the cell (a steel box letter's face)
      g.fillStyle = '#231A22';
      g.fillRect(cx - CELL_W / 2 + 8, sy - CELL_H / 2 + 4, CELL_W - 16, CELL_H - 8);
      const h = hits.find((q) => q.index === i);
      const font = `bold 150px ${MARQUEE}`;
      if (h && h.lit && h.k > 0) {
        // the new letter buzzing to life
        const on = dead ? (rd < 0.6 && hash(Math.floor(t * 30) + i) > 0.5 ? 0.6 : 0) : h.buzz;
        this.tube(g, h.letter, cx, cy + 56, font, on, GOLD, GOLD_CORE, t, 0);
        if (h.k < 0.25) this.sparks(g, cx, cy - 20, h.k / 0.25, i);
      } else {
        // the old letter: rose, or popping dead as it is replaced
        const on = dead ? (rd < 0.5 && hash(Math.floor(t * 30) + i * 7) > 0.4 ? 0.8 : 0) : h && h.lit ? 0 : 1;
        this.tube(g, OLD[i], cx, cy + 56, font, on, ROSE, ROSE_CORE, t, 0);
        if (i === 2 && on > 0) this.tube(g, '’', cx + CELL_W / 2 - 4, cy - 30, `bold 90px ${MARQUEE}`, on, ROSE, ROSE_CORE, t, 0);
      }
    }
    // SLIM complete: the frame's bulbs chase in gold
    const nb = 26;
    for (let i = 0; i < nb; i++) {
      const u = i / nb;
      const per = 2 * (W + CELL_H + 60);
      let d = u * per;
      let bx: number;
      let by: number;
      if (d < W) [bx, by] = [x0 + d, y0];
      else if ((d -= W) < CELL_H + 60) [bx, by] = [x0 + W, y0 + d];
      else if ((d -= CELL_H + 60) < W) [bx, by] = [x0 + W - d, y0 + CELL_H + 60];
      else [bx, by] = [x0, y0 + CELL_H + 60 - (d - W)];
      const lit = done && !dead ? ((i + Math.floor(b.beat * 4)) % 3 === 0 ? 1 : 0.35) : 0.08;
      g.fillStyle = lit > 0.5 ? GOLD_CORE : lit > 0.2 ? '#C89A3A' : '#3A2E24';
      g.beginPath();
      g.arc(bx, by, 7, 0, Math.PI * 2);
      g.fill();
      if (lit > 0.5) drawGlow(g, bx, by, GOLD, 26, 0.5);
    }
    g.restore();
    // the zap: a gold arc from the strike to the cell it rewrites (the first 0.22 beat)
    for (const h of hits) {
      if (!h.lit || h.k <= 0 || h.k > 0.22 || dead) continue;
      const cx = x0 + 45 + CELL_W * (h.index + 0.5);
      this.zap(g, hx + 60 * z, hy - 90 * z, cx, sy, 1 - h.k / 0.22, h.index + Math.floor(t * 40));
    }
  }

  /** per letter: rewritten? (a hit graded on its beat) · k = beats since (0..1 over the buzz) · buzz = neon on 0..1 */
  private state(game: Game, l: Letter, wb: number): { index: number; letter: string; lit: boolean; k: number; buzz: number } {
    const gr = game.judge.gradeAt(l.beat, 'strike');
    const lit = gr !== null && gr !== 'miss' && wb >= l.beat - 0.05;
    const d = wb - l.beat;
    const k = Math.max(0, Math.min(1, d / 0.9));
    // the buzz: dead for a beat-tick, stutters (on/off slices), catches, steady
    let buzz = 1;
    if (d < 0.08) buzz = 0;
    else if (d < 0.7) {
      const slice = Math.floor(d * 22);
      buzz = hash(slice * 3 + l.index) > 0.35 + 0.5 * (1 - d / 0.7) ? 1 : 0.15;
    }
    return { index: l.index, letter: l.letter, lit, k, buzz };
  }

  /** a neon tube letter: the dead glass always, the glow + a hot core when on */
  private tube(g: CanvasRenderingContext2D, txt: string, x: number, y: number, font: string, on: number, col: string, core: string, t: number, align: 0 | 1): void {
    g.font = font;
    g.textAlign = align ? 'left' : 'center';
    g.textBaseline = 'alphabetic';
    g.lineJoin = 'round';
    g.lineWidth = 12;
    g.strokeStyle = '#3A2E34';
    g.strokeText(txt, x, y);
    if (on <= 0.02) return;
    const hum = 0.92 + 0.08 * Math.sin(t * 50 + x);
    const m = g.measureText(txt);
    drawGlow(g, align ? x + m.width / 2 : x, y - 55, col, 150, 0.55 * on * hum);
    g.globalAlpha = on;
    g.lineWidth = 11;
    g.strokeStyle = col;
    g.strokeText(txt, x, y);
    g.lineWidth = 4;
    g.strokeStyle = core;
    g.strokeText(txt, x, y);
    g.globalAlpha = 1;
  }

  private sparks(g: CanvasRenderingContext2D, x: number, y: number, u: number, seed: number): void {
    g.fillStyle = GOLD_CORE;
    for (let i = 0; i < 12; i++) {
      const a = hash(i + seed * 17) * Math.PI * 2;
      const r = 20 + 140 * u * (0.5 + hash(i * 3 + seed));
      g.globalAlpha = 1 - u;
      g.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r + 120 * u * u, 5, 5);
    }
    g.globalAlpha = 1;
  }

  private zap(g: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, a: number, seed: number): void {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(255,214,120,${0.8 * a})`;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(ax, ay);
    const n = 9;
    for (let i = 1; i < n; i++) {
      const u = i / n;
      g.lineTo(ax + (bx - ax) * u + (hash(seed * 13 + i) - 0.5) * 60, ay + (by - ay) * u + (hash(seed * 7 + i) - 0.5) * 60);
    }
    g.lineTo(bx, by);
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = `rgba(255,250,235,${a})`;
    g.stroke();
    g.restore();
  }

  /** two steel lattice legs from the frame bottom up to the sign (dark, behind it) */
  private drawLattice(g: CanvasRenderingContext2D, sx: number, sy: number, W: number): void {
    g.strokeStyle = '#1B141C';
    g.lineWidth = 7;
    for (const lx of [sx - W * 0.3, sx + W * 0.3]) {
      const top = sy;
      g.beginPath();
      g.moveTo(lx - 30, top);
      g.lineTo(lx - 44, VIEW_H + 20);
      g.moveTo(lx + 30, top);
      g.lineTo(lx + 44, VIEW_H + 20);
      for (let y = top; y < VIEW_H; y += 90) {
        const w0 = 30 + ((y - top) / (VIEW_H - top)) * 14;
        const w1 = 30 + ((y + 90 - top) / (VIEW_H - top)) * 14;
        g.moveTo(lx - w0, y);
        g.lineTo(lx + w1, y + 90);
        g.moveTo(lx + w0, y);
        g.lineTo(lx - w1, y + 90);
      }
      g.stroke();
    }
  }
}
