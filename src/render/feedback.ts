/**
 * FEEDBACK (review iter2 fix 5, visual half): every press answers, on by default, cheap.
 *
 *   STAMPS        (iteration 6: only NOTABLE moments — the game's `stamp` events: the first Perfect of a phrase, streak
 *                 milestones, a completed Hup-Hup-HEY, a near-miss WHEW, a film canister; the bells carry every other
 *                 Perfect) as bold 70s-poster rubber stamps (cached sprites), slammed in up-and-BEHIND Slim's head
 *                 where it happened (world space: they drift left out of frame as he runs on, never over the lane).
 *   COMBO         film-title lettering under the metronome (screen space): extruded italic block letters
 *                 that GROW and HEAT UP with the streak (cream -> bulb -> gold -> neon rose -> white-hot
 *                 with a gold halo), a bump on every hit, and on a break the number drops off and greys out.
 *   MISS          a film SCRATCH torn across the hero (screen space, 4-5 film frames): a jagged cream gash
 *                 with a black gutter; bigger (+ a burn-hole) on stumbles and deaths. Never red: red = danger.
 *
 * Read-only on game state. Grades come from the judge's targets (diffed per frame, so rewinds that clear
 * grades are ignored) — robust to whatever grade / combo events the game adds. If the game exposes
 * its own combo count (`game.combo` number or `{ count }`), the counter shows that one.
 */
import { drawGlow } from '../art/core/draw';
import { type Ctx, drawSprite, sprite } from '../art/core/canvas';
import { TAU, hash } from '../art/core/math';
import { CF } from '../art/palette';
import { VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import type { Grade } from '../game/judge';
import { REWARD } from './entityDraw';
import { MARQUEE } from './screens';

type StampStyle = 'perfect' | 'great' | 'good' | 'streak' | 'heave' | 'whew' | 'canister';

interface Stamp {
  grade: StampStyle;
  text: string;
  x: number;
  y: number;
  t: number;
  rot: number;
  /** 0..1 scale (long streaks shrink the stamps: the bells carry Perfect) */
  s: number;
  /** seconds since a newer stamp replaced it (NaN = still the newest) */
  gone: number;
}

interface Scratch {
  t: number;
  big: boolean;
  seed: number;
}

const STAMP_LIFE = 0.62;
/** the rarer notable moments hold a little longer */
const lifeOf = (st: StampStyle) => (st === 'whew' || st === 'canister' || st === 'streak' ? 0.95 : STAMP_LIFE);
const STAMP_STYLE: Record<StampStyle, { text: string; fill: string; ink: string; w: number; h: number }> = {
  perfect: { text: 'PERFECT!', fill: REWARD.gold, ink: CF.filmBlack, w: 210, h: 64 },
  great: { text: 'GREAT', fill: CF.cream, ink: CF.filmBlack, w: 150, h: 54 },
  good: { text: 'GOOD', fill: '#B8AE9A', ink: CF.filmBlack, w: 124, h: 54 },
  streak: { text: 'x25 STREAK!', fill: REWARD.shine, ink: '#3A1E30', w: 250, h: 66 },
  heave: { text: 'HEAVE!', fill: REWARD.gold, ink: CF.filmBlack, w: 200, h: 70 },
  whew: { text: 'WHEW!', fill: CF.cream, ink: '#20303A', w: 200, h: 72 },
  canister: { text: 'FILM FOUND!', fill: REWARD.gold, ink: '#2A1810', w: 270, h: 66 },
};

/** a rubber-stamp poster block: ink slab, inner rule, chunky italic caps, worn (knocked-out specks) */
function stampSprite(grade: StampStyle, text: string) {
  const st = STAMP_STYLE[grade];
  const h = st.h;
  const w = Math.max(st.w, Math.round(text.length * h * 0.42 + 40));
  return sprite(`fb-stamp-${grade}-${text}`, w + 20, h + 20, (w + 20) / 2, (h + 20) / 2, (g) => {
    const x = -w / 2;
    const y = -h / 2;
    // slab (slight trapezoid = hand-stamped)
    g.beginPath();
    g.moveTo(x + 4, y);
    g.lineTo(x + w, y + 2);
    g.lineTo(x + w - 4, y + h);
    g.lineTo(x, y + h - 2);
    g.closePath();
    g.fillStyle = st.ink;
    g.fill();
    g.strokeStyle = st.fill;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x + 10, y + 7);
    g.lineTo(x + w - 7, y + 8);
    g.lineTo(x + w - 10, y + h - 7);
    g.lineTo(x + 7, y + h - 8);
    g.closePath();
    g.stroke();
    g.font = `italic ${Math.round(h * 0.66)}px ${MARQUEE}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = st.fill;
    g.fillText(text, 0, 2, w - 26);
    if (grade !== 'good' && grade !== 'great') {
      // two little stars flanking the word
      for (const s of [-1, 1]) {
        const sx = s * (w / 2 - 4);
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU - Math.PI / 2;
          const r = i % 2 ? 4 : 10;
          g.lineTo(sx + Math.cos(a) * r, -h / 2 - 2 + Math.sin(a) * r);
        }
        g.closePath();
        g.fillStyle = REWARD.shine;
        g.fill();
        g.strokeStyle = st.ink;
        g.lineWidth = 2;
        g.stroke();
      }
    }
    // worn ink: knock out specks
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 26; i++) {
      const px = x + hash(i * 3 + w) * w;
      const py = y + hash(i * 7 + h) * h;
      g.beginPath();
      g.arc(px, py, 0.8 + hash(i + 99) * 2.2, 0, TAU);
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  });
}

/** the game's notable-moment event (game/events.ts 'stamp', iteration 6) — typed loosely so render builds either way */
interface StampEvent {
  kind: string;
  beat: number;
  x: number;
  y: number;
  text: string;
  combo: number;
}
type LooseEvents = { on(type: string, fn: (e: never) => void): () => void };

const STYLE_OF: Record<string, StampStyle> = { firstPerfect: 'perfect', streak: 'streak', heave: 'heave', whew: 'whew', canister: 'canister' };

/** combo heat ramp (never tangerine = hero, never lacquer red = danger) */
const HEAT: [number, string][] = [
  [0, CF.cream],
  [8, CF.bulb],
  [16, REWARD.gold],
  [32, CF.neonRose],
  [48, '#FFFFFF'],
];

function heatCol(n: number): string {
  let c = HEAT[0][1];
  for (const [k, col] of HEAT) if (n >= k) c = col;
  return c;
}

export class Feedback {
  private stamps: Stamp[] = [];
  private scratches: Scratch[] = [];
  private seen: (Grade | null)[] = [];
  private combo = 0;
  private best = 0;
  private bump = 0;
  /** the broken combo number falling away */
  private broke = { n: 0, t: 9 };
  private lastStumbles = 0;
  private lastDeaths = 0;
  private lastRun = -1;
  private seed = 1;
  /** seconds since the last miss / stumble (the Burn and others can read it) */
  sinceMiss = 99;
  /** seconds since the last stumble */
  sinceStumble = 99;

  get count(): number {
    return this.combo;
  }

  private rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed & 0xffffff) / 0x1000000;
  }

  /** the game's own combo, when it exposes one */
  private gameCombo(g: Game): number | undefined {
    const c = (g as unknown as { combo?: unknown }).combo;
    if (typeof c === 'number') return c;
    if (c && typeof c === 'object' && typeof (c as { count?: unknown }).count === 'number') return (c as { count: number }).count;
    return undefined;
  }

  private eventsKey: unknown = null;
  /** film canister pickups: a gold burst where it was grabbed (world) */
  private canFx: { x: number; y: number; t: number }[] = [];
  private pending: StampEvent[] = [];
  /** seconds since the last WHEW (near-miss) — the renderer's slow-mo flash reads it; NaN = none yet */
  whewT = NaN;
  whewAt: [number, number] = [0, 0];

  /** listen to the game's notable-moment stamps (once per events bus) */
  private attach(g: Game): void {
    const ev = (g as unknown as { events?: LooseEvents }).events;
    if (!ev || ev === this.eventsKey) return;
    this.eventsKey = ev;
    ev.on('stamp', ((e: StampEvent) => {
      if (e.kind === 'giant') return; // the giant smash has its own comic stamp (render/moments.ts)
      this.pending.push(e);
    }) as (e: never) => void);
    ev.on('canister', ((e: { x: number; y: number }) => {
      this.canFx.push({ x: e.x, y: e.y, t: 0 });
    }) as (e: never) => void);
    ev.on('whew', ((e: { x: number; y: number }) => {
      this.whewT = 0;
      this.whewAt = [e.x, e.y];
    }) as (e: never) => void);
  }

  private stamp(e: StampEvent): void {
    const style = STYLE_OF[e.kind] ?? 'perfect';
    let text = e.text || STAMP_STYLE[style].text;
    if (style === 'streak' && !e.text) text = `x${e.combo} STREAK!`;
    for (const o of this.stamps) if (Number.isNaN(o.gone)) o.gone = 0;
    while (this.stamps.length > 1) this.stamps.shift();
    const big = style === 'whew' || style === 'canister' || style === 'heave' ? 1.12 : 1;
    this.stamps.push({ grade: style, text: text.toUpperCase(), x: e.x - 70 + this.rand() * 30, y: e.y - 215 - this.rand() * 20, t: 0, rot: -0.14 + this.rand() * 0.12, s: big, gone: NaN });
  }

  update(g: Game, dt: number): void {
    this.attach(g);
    if (!Number.isNaN(this.whewT)) this.whewT += dt;
    const ts = g.judge.targets;
    if (g.runId !== this.lastRun) {
      this.lastRun = g.runId;
      this.seen = ts.map((t) => t.grade);
      this.combo = 0;
      this.best = 0;
      this.stamps.length = 0;
      this.pending.length = 0;
      this.canFx.length = 0;
      this.scratches.length = 0;
      this.whewT = NaN;
      this.lastStumbles = g.stats.stumbles;
      this.lastDeaths = g.stats.deaths;
    }
    if (this.seen.length !== ts.length) this.seen = ts.map((t) => t.grade);
    for (let i = 0; i < ts.length; i++) {
      const gr = ts[i].grade;
      if (gr === this.seen[i]) continue;
      this.seen[i] = gr;
      if (!gr) continue; // re-armed by a rewind
      if (gr === 'miss') {
        this.breakCombo();
        this.scratch(false);
        continue;
      }
      this.combo++;
      this.best = Math.max(this.best, this.combo);
      this.bump = 1;
    }
    if (g.stats.stumbles > this.lastStumbles) {
      this.breakCombo();
      this.scratch(true);
      this.sinceStumble = 0;
    }
    if (g.stats.deaths > this.lastDeaths) {
      this.breakCombo();
      this.scratch(true);
    }
    this.lastStumbles = g.stats.stumbles;
    this.lastDeaths = g.stats.deaths;
    const ext = this.gameCombo(g);
    if (ext !== undefined) {
      if (ext > this.combo) this.bump = 1;
      if (ext < this.combo && this.combo >= 3) this.broke = { n: this.combo, t: 0 };
      this.combo = ext;
    }
    for (const e of this.pending.splice(0)) this.stamp(e);
    for (const c of this.canFx) c.t += dt;
    while (this.canFx.length && this.canFx[0].t > 0.9) this.canFx.shift();
    for (const s of this.stamps) {
      s.t += dt;
      if (!Number.isNaN(s.gone)) s.gone += dt;
    }
    while (this.stamps.length && (this.stamps[0].t > lifeOf(this.stamps[0].grade) || this.stamps[0].gone > 0.09)) this.stamps.shift();
    for (const s of this.scratches) s.t += dt;
    while (this.scratches.length && this.scratches[0].t > 0.3) this.scratches.shift();
    this.bump *= Math.exp(-dt / 0.12);
    this.broke.t += dt;
    this.sinceMiss += dt;
    this.sinceStumble += dt;
  }

  private breakCombo(): void {
    if (this.combo >= 3) this.broke = { n: this.combo, t: 0 };
    this.combo = 0;
    this.sinceMiss = 0;
  }

  private scratch(big: boolean): void {
    this.scratches.push({ t: 0, big, seed: Math.floor(this.rand() * 1000) });
    if (this.scratches.length > 3) this.scratches.shift();
  }

  /** WORLD space (camera transform active): the stamps + the film-canister pickup bursts */
  drawWorld(ctx: Ctx): void {
    for (const c of this.canFx) {
      // FILM FOUND: a gold flash, rays spinning out, a ring and a spray of sprocket-hole confetti
      const k = c.t / 0.9;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, c.x, c.y, REWARD.glow, 160 + 220 * k, 0.8 * (1 - k));
      ctx.fillStyle = `rgba(255,224,138,${0.35 * (1 - k)})`;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + k * 1.5;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.arc(c.x, c.y, 120 + 380 * k, a - 0.06, a + 0.06);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = `rgba(255,246,220,${0.9 * (1 - k)})`;
      ctx.lineWidth = 8 * (1 - k) + 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 40 + 260 * Math.sqrt(k), 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 16; i++) {
        const a = hash(i + 5) * TAU;
        const sp = 260 + hash(i + 9) * 420;
        const px = c.x + Math.cos(a) * sp * c.t;
        const py = c.y + Math.sin(a) * sp * c.t + 600 * c.t * c.t;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(c.t * (6 + i));
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = i % 2 ? REWARD.gold : CF.cream;
        ctx.fillRect(-7, -5, 14, 10);
        ctx.fillStyle = CF.filmBlack;
        ctx.fillRect(-4, -2, 3, 4);
        ctx.fillRect(1, -2, 3, 4);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    for (const s of this.stamps) {
      const k = s.t / lifeOf(s.grade);
      // slam in (1.7 -> 1 in 70 ms), hold, then lift + fade
      const inK = Math.min(1, s.t / 0.07);
      const sc = (1 + 0.7 * (1 - inK) * (1 - inK)) * s.s;
      const a = (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4) * (Number.isNaN(s.gone) ? 1 : 1 - s.gone / 0.09);
      ctx.globalAlpha = Math.max(0, a) * (0.4 + 0.6 * inK);
      const kick = Number.isNaN(s.gone) ? 0 : s.gone / 0.09;
      drawSprite(ctx, stampSprite(s.grade, s.text), s.x - 40 * kick, s.y - 30 * Math.max(0, k - 0.5) - 20 * kick, s.rot - 0.3 * kick, sc, sc);
    }
    ctx.globalAlpha = 1;
  }

  /** SCREEN space, inside the film (before the film pass): the miss scratch across the hero (feet hx, hy) */
  drawScratches(ctx: Ctx, hx: number, hy: number, zoom: number): void {
    for (const s of this.scratches) this.drawScratch(ctx, s, hx, hy, zoom);
  }

  private drawScratch(ctx: Ctx, s: Scratch, hx: number, hy: number, zoom: number): void {
    // film frames: visible on 4-5 frames at 24 fps, flickering
    const frame = Math.floor(s.t * 24);
    if (frame > (s.big ? 6 : 4) || (frame === 2 && !s.big)) return;
    const h = 175 * zoom;
    const top = hy - h * 1.25;
    const bot = hy + 30 * zoom;
    const tilt = (hash(s.seed) - 0.5) * 0.5;
    const x0 = hx + (hash(s.seed + 1) - 0.5) * 30 * zoom;
    const n = 9;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';
    for (const [w, col] of [
      [s.big ? 16 : 11, 'rgba(13,10,8,0.85)'],
      [s.big ? 7 : 4.5, 'rgba(255,250,236,0.95)'],
    ] as [number, string][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const y = top + (bot - top) * u;
        const jag = (hash(s.seed * 13 + i + frame * 31) - 0.5) * 18;
        const x = x0 + (u - 0.5) * (bot - top) * tilt + jag;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    if (s.big) {
      // a second, thinner scratch + an emulsion burn-hole (cream ring) on stumbles / deaths
      ctx.strokeStyle = 'rgba(255,250,236,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 + 34 * zoom, top + 20);
      ctx.lineTo(x0 + 22 * zoom, bot);
      ctx.stroke();
      const r = (18 + 10 * frame) * zoom;
      ctx.fillStyle = 'rgba(13,10,8,0.6)';
      ctx.beginPath();
      ctx.arc(x0 - 20 * zoom, hy - h * 0.6, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,236,190,0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** HUD: the combo title card (under the metronome) */
  drawCombo(ctx: Ctx, beatPulse: number): void {
    const n = this.combo;
    const X = VIEW_W - 170;
    const Y = 158;
    if (n >= 3) {
      const heat = Math.min(1, n / 48);
      // (iteration 6: half the old growth — the streak reads, it doesn't shout over the picture)
      const size = Math.round(40 + 18 * Math.min(1, Math.log2(n / 2) / 4.6) + 8 * this.bump);
      const col = heatCol(n);
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(-0.06);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      if (n >= 16) drawGlow(ctx, 0, -size * 0.35, n >= 32 ? CF.neonRose : REWARD.glow, size * 2.2, 0.18 + 0.2 * heat + 0.2 * beatPulse);
      const txt = `x${n}`;
      ctx.font = `italic ${size}px ${MARQUEE}`;
      // extruded film-title block letters: a dark 3D side, then an ink outline, then the face
      const depth = 4 + Math.round(6 * heat);
      ctx.fillStyle = n >= 32 ? '#5E2B4E' : '#3A2418';
      for (let d = depth; d > 0; d--) ctx.fillText(txt, d * 0.9, d);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 8;
      ctx.strokeStyle = CF.filmBlack;
      ctx.strokeText(txt, 0, 0);
      ctx.fillStyle = col;
      ctx.fillText(txt, 0, 0);
      // a hot highlight band across the top half of the letters when the streak is burning
      if (n >= 16) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-size * 2, -size * 0.8, size * 4, size * 0.28);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(txt, 0, 0);
        ctx.restore();
      }
      ctx.font = `italic ${Math.round(20 + 6 * heat)}px ${MARQUEE}`;
      ctx.lineWidth = 5;
      ctx.strokeText('COMBO', 0, 26 + 4 * heat);
      ctx.fillStyle = CF.filmHi;
      ctx.fillText('COMBO', 0, 26 + 4 * heat);
      ctx.restore();
    }
    // the broken streak drops off the title card and greys out
    if (this.broke.t < 0.7) {
      const k = this.broke.t / 0.7;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.translate(X + 30 * k, Y + 160 * k * k);
      ctx.rotate(-0.06 + 0.6 * k);
      ctx.textAlign = 'center';
      ctx.font = `italic 56px ${MARQUEE}`;
      ctx.lineWidth = 7;
      ctx.strokeStyle = CF.filmBlack;
      ctx.strokeText(`x${this.broke.n}`, 0, 0);
      ctx.fillStyle = '#8F8A80';
      ctx.fillText(`x${this.broke.n}`, 0, 0);
      ctx.restore();
    }
  }

  /** best streak this run (poster) */
  get bestCombo(): number {
    return this.best;
  }
}
