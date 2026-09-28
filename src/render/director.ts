/**
 * THE WORLD REACTS (review fix 6): a presentation director that makes the screen answer the MUSIC.
 * Reads the MusicFeed (song lanes + section energy) and drives:
 *   - camera: a real zoom-OUT on choruses (Camera.musicZoom, eased), zoom-punches on big accents
 *     (stabs / fill ends / hooks / section starts) and small snare punches in the chorus (Camera.hitZoom)
 *   - light: warm projector flashes on big accents, a bloom from the top on crashes
 *   - stuff flies on accents: bottles, pool balls, hats arc through the UPPER screen (never over the play
 *     band, desaturated: never gold/red), and dust/plaster shakes down from the signs/ceiling on the kick
 *   - everything scales with the bar's energy, so verses breathe and choruses explode
 * The art scenes react to the same BeatInfo on their own (marquee bulbs chase on 8ths + flash on the kick,
 * neon buzz on hats, brawlers trade punches on the snare, bottles on the snare, pool balls on stabs,
 * letters drop on the riff, the audience stomps / pops corn / yells HEY).
 */
import { type BeatInfo, hit } from '../art/core/beat';
import { drawGlow } from '../art/core/draw';
import { TAU } from '../art/core/math';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Camera } from './camera';
import type { MusicFeed } from './music';

interface Flyer {
  on: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  kind: number;
  t: number;
}

interface Speck {
  x: number;
  y: number;
  vy: number;
  t: number;
  life: number;
}

const FLYER_COLS = ['#3E7A5A', '#7A5A3A', '#6A6E8A', '#8A7E70', '#4A4450'];

export class Director {
  /** eased section framing (negative = zoom out) */
  sectionZoom = 0;
  punch = 0;
  flash = 0;
  bloom = 0;
  private lastAccent = 0;
  private lastSnare = -1;
  private lastKick = -1;
  private lastCrash = -1;
  private flyers: Flyer[] = [];
  private specks: Speck[] = [];
  private seed = 7;
  /** true when the director should run (song playing, in play) */
  active = false;
  /** 0..1 extra accent intensity from level fx cues (bgPulse) */
  extPulse = 0;

  constructor() {
    for (let i = 0; i < 16; i++) this.flyers.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, kind: 0, t: 0 });
  }

  private rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed & 0xffffff) / 0x1000000;
  }

  update(dt: number, feed: MusicFeed, b: BeatInfo, cam: Camera, env: 'street' | 'bar'): void {
    const e = feed.energy;
    // --- section framing: the chorus zooms OUT (the stage opens up), dense bars a little
    const want = this.active ? (feed.chorus ? -0.085 * (0.55 + 0.45 * e) : e > 0.85 ? -0.03 : 0) : 0;
    this.sectionZoom += (want - this.sectionZoom) * Math.min(1, dt * 1.6);
    cam.musicZoom = this.sectionZoom;
    // --- edges
    if (this.active) {
      if (feed.accentCount !== this.lastAccent && feed.accent < 0.12) {
        const s = feed.accentStrength * (0.5 + 0.5 * e);
        this.punch = Math.max(this.punch, 0.045 * s);
        this.flash = Math.max(this.flash, 0.16 * s);
        if (s > 0.55) this.burst(Math.round(2 + 3 * s), env);
        this.dust(Math.round(10 + 20 * s));
        if (s > 0.8) cam.addTrauma(0.1 * s);
      }
      if (b.count.snare !== this.lastSnare && b.since.snare < 0.1) {
        if (feed.chorus) this.punch = Math.max(this.punch, 0.012 * e);
        if (feed.chorus && this.rand() < 0.35 * e) this.burst(1, env);
      }
      if (b.count.kick !== this.lastKick && b.since.kick < 0.1 && env === 'bar') this.dust(Math.round(3 + 6 * e));
      if (b.count.crash !== this.lastCrash && b.since.crash < 0.1) this.bloom = Math.max(this.bloom, 0.5 * e);
      if (this.extPulse > 0.01) {
        this.bloom = Math.max(this.bloom, this.extPulse * 0.6);
        this.extPulse = 0;
      }
    }
    this.lastAccent = feed.accentCount;
    this.lastSnare = b.count.snare;
    this.lastKick = b.count.kick;
    this.lastCrash = b.count.crash;
    // --- decay
    this.punch *= Math.exp(-dt / 0.09);
    cam.hitZoom = this.punch;
    this.flash *= Math.exp(-dt / 0.1);
    this.bloom *= Math.exp(-dt / 0.35);
    for (const f of this.flyers) {
      if (!f.on) continue;
      f.t += dt;
      f.vy += 1500 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
      if (f.y > VIEW_H * 0.5 || f.x < -100 || f.x > VIEW_W + 100) f.on = false;
    }
    for (let i = this.specks.length - 1; i >= 0; i--) {
      const s = this.specks[i];
      s.t += dt;
      s.y += s.vy * dt;
      if (s.t > s.life) this.specks.splice(i, 1);
    }
  }

  /** things fly across the upper screen (bottles / pool balls in the bar, hats / papers on the street) */
  private burst(n: number, env: 'street' | 'bar'): void {
    for (let k = 0; k < n; k++) {
      const f = this.flyers.find((x) => !x.on);
      if (!f) return;
      const fromLeft = this.rand() < 0.5;
      f.on = true;
      f.t = 0;
      f.x = fromLeft ? -40 : VIEW_W + 40;
      f.y = VIEW_H * (0.22 + this.rand() * 0.15);
      f.vx = (fromLeft ? 1 : -1) * (500 + this.rand() * 500);
      f.vy = -700 - this.rand() * 350;
      f.rot = this.rand() * TAU;
      f.vr = (this.rand() - 0.5) * 18;
      f.kind = env === 'bar' ? (this.rand() < 0.55 ? 0 : 1) : this.rand() < 0.5 ? 2 : 3;
    }
  }

  private dust(n: number): void {
    for (let i = 0; i < n && this.specks.length < 160; i++) {
      this.specks.push({ x: this.rand() * VIEW_W, y: this.rand() * VIEW_H * 0.12, vy: 120 + this.rand() * 260, t: 0, life: 0.8 + this.rand() * 1.2 });
    }
  }

  /** screen space, after the world and foreground, before the film pass */
  draw(g: CanvasRenderingContext2D, b: BeatInfo): void {
    // dust / plaster shaken down
    if (this.specks.length) {
      g.fillStyle = 'rgba(233,216,180,0.55)';
      for (const s of this.specks) {
        const a = 1 - s.t / s.life;
        g.globalAlpha = a * 0.8;
        g.fillRect(s.x + Math.sin(s.t * 6 + s.x) * 6, s.y, 3, 3);
      }
      g.globalAlpha = 1;
    }
    // flyers (dim, desaturated silhouettes with a cream rim)
    for (const f of this.flyers) {
      if (!f.on) continue;
      g.save();
      g.translate(f.x, f.y);
      g.rotate(f.rot);
      g.fillStyle = FLYER_COLS[f.kind % FLYER_COLS.length];
      g.strokeStyle = 'rgba(26,20,16,0.9)';
      g.lineWidth = 3;
      g.beginPath();
      if (f.kind === 0) {
        g.rect(-7, -16, 14, 26);
        g.rect(-3, -26, 6, 10);
      } else if (f.kind === 1) g.arc(0, 0, 13, 0, TAU);
      else if (f.kind === 2) {
        g.ellipse(0, 0, 22, 7, 0, 0, TAU);
        g.rect(-12, -16, 24, 12);
      } else g.rect(-18, -12, 36, 24);
      g.stroke();
      g.fill();
      if (f.kind === 1) {
        g.fillStyle = '#E9E0D0';
        g.beginPath();
        g.arc(3, -3, 5, 0, TAU);
        g.fill();
      }
      g.restore();
    }
    // warm projector flash + crash bloom from the top of the frame
    if (this.flash > 0.01) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,236,200,${this.flash * 0.5})`;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      g.globalCompositeOperation = 'source-over';
    }
    if (this.bloom > 0.01) drawGlow(g, VIEW_W / 2, -60, '#FFF1D6', 900, this.bloom * 0.6);
    void hit;
    void b;
  }
}
