/**
 * Stage: the art lab's environments inside the game (src/art/grindhouse).
 *
 *   42nd Street (street.ts) and the Honky-Tonk (bar.ts) as relightable parallax scenes with ambient
 *   life, each with its own LightingDirector. The level's `sky` cues pick the light (golden -> neon on
 *   the street; honkytonk -> 'bar' indoors; any other grindhouse key by name) and cross-fade over 2 bars
 *   in MUSICAL time (deterministic under rewinds). The level's `ground` cues pick the environment by
 *   world x ('street' | 'timber' = bar); where the camera straddles a change the two scenes are split at
 *   the doorway (screen-space clip) and a door frame + neon sign is drawn in the play layer.
 *
 *   stage.update(dt, level, beat)
 *   stage.drawBack(ctx, cam, b)        sky ... mid-ground life (+ a play-band value wash for readability)
 *   stage.drawGround(ctx, level, view) floors (sidewalk / floorboards), dips (puddles), lethal pits, doorway
 *   stage.drawFront(ctx, cam, b)       foreground props, haze
 *   stage.film.draw(...)               film pass (renderer calls it)
 */
import type { BeatInfo } from '../art/core/beat';
import { hit } from '../art/core/beat';
import { setArtResolution } from '../art/core/canvas';
import { css, hex, mix } from '../art/core/color';
import { drawGlow } from '../art/core/draw';
import { TAU, hash } from '../art/core/math';
import { drawBarFloor, makeBar } from '../art/grindhouse/bar';
import './../art/grindhouse/lights';
import { type StreetScene, drawStreetGround, makeStreet } from '../art/grindhouse/street';
import { FilmPass } from '../art/fx/film';
import { CF } from '../art/palette';
import type { ArtCamera } from '../art/world/camera';
import { LIGHTS, type Lighting, LightingDirector, lit, useLights } from '../art/world/lighting';
import type { ParallaxScene } from '../art/world/parallax';
import { VIEW_H, VIEW_W } from '../engine/display';
import { Tun } from '../game/tunables';
import { type RuntimeLevel, groundStyleAt } from '../level/build';
import { DANGER } from './entityDraw';

export type Env = 'street' | 'bar';

/** level sky preset -> grindhouse light key */
const SKY_TO_LIGHT: Record<string, string> = { golden: 'golden', neon: 'neon', honkytonk: 'bar', bar: 'bar' };
const INTERIOR = new Set(['bar', 'poolroom', 'velvet', 'throne', 'houselights']);

const H = hex;

export class Stage {
  readonly streetLight: LightingDirector;
  readonly barLight: LightingDirector;
  readonly street: StreetScene;
  readonly bar: ParallaxScene;
  readonly film = new FilmPass();
  private lastBlend = { street: '', bar: '' };
  /** set by the renderer: the cold open keeps the street in the dark theatre light */
  coldOpen = false;
  private resScale = 0;

  /** @param resScale backing-store px per logical px (set BEFORE the scenes bake, so nothing re-bakes on frame 1) */
  constructor(resScale = 1) {
    this.setResolution(resScale);
    useLights('grindhouse');
    this.streetLight = new LightingDirector('golden');
    this.barLight = new LightingDirector('bar');
    this.street = makeStreet(this.streetLight);
    this.bar = makeBar(this.barLight);
  }

  /** keep art caches at the backing-store resolution */
  setResolution(scale: number): void {
    if (Math.abs(scale - this.resScale) < 1e-3) return;
    this.resScale = scale;
    setArtResolution(scale);
  }

  light(env: Env): Lighting {
    return env === 'bar' ? this.barLight.current : this.streetLight.current;
  }

  envAt(L: RuntimeLevel, x: number): Env {
    return groundStyleAt(L, x / L.ppb) === 'timber' ? 'bar' : 'street';
  }

  /** world x of every environment change (sorted) */
  boundaries(L: RuntimeLevel): { x: number; to: Env }[] {
    const out: { x: number; to: Env }[] = [];
    let cur: Env = 'street';
    for (const c of L.groundCues) {
      const e: Env = c.style === 'timber' ? 'bar' : 'street';
      if (e !== cur) out.push({ x: c.beat * L.ppb, to: e });
      cur = e;
    }
    return out;
  }

  /** lighting from the level's sky cues at `beat` (musical time: exact under rewinds) */
  update(dt: number, L: RuntimeLevel, beat: number): void {
    const ext: { beat: number; key: string }[] = [];
    const int: { beat: number; key: string }[] = [];
    for (const c of L.skyCues) {
      const key = SKY_TO_LIGHT[c.preset] ?? c.preset;
      if (!LIGHTS[key]) continue;
      (INTERIOR.has(key) ? int : ext).push({ beat: c.beat, key });
    }
    const pick = (cues: { beat: number; key: string }[], dflt: string): [string, string, number] => {
      let from = cues[0]?.key ?? dflt;
      let to = from;
      let k = 1;
      for (let i = 0; i < cues.length; i++) {
        if (beat < cues[i].beat) break;
        from = i > 0 ? cues[i - 1].key : cues[i].key;
        to = cues[i].key;
        k = Math.min(1, (beat - cues[i].beat) / 8);
      }
      return [from, to, k];
    };
    let s = pick(ext, 'golden');
    if (this.coldOpen) s = ['cold', 'cold', 1];
    const b = pick(int, 'bar');
    this.apply(this.streetLight, 'street', s);
    this.apply(this.barLight, 'bar', b);
    this.street.update(dt);
    this.bar.update(dt);
  }

  private apply(d: LightingDirector, id: 'street' | 'bar', [a, b, k]: [string, string, number]): void {
    const kq = Math.round(k * 60) / 60;
    const tag = `${a}|${b}|${kq}`;
    if (tag === this.lastBlend[id]) return;
    this.lastBlend[id] = tag;
    d.setBlend(a, b, kq);
  }

  /** the scene(s) in view and where they split (screen x), for back/front passes */
  private split(L: RuntimeLevel, cam: ArtCamera): { left: Env; right: Env; sx: number } {
    const hw = VIEW_W / 2 / cam.zoom;
    const x0 = cam.x - hw;
    const x1 = cam.x + hw;
    const left = this.envAt(L, x0);
    for (const bd of this.boundaries(L)) {
      if (bd.x > x0 && bd.x < x1 && bd.to !== left) return { left, right: bd.to, sx: VIEW_W / 2 + (bd.x - cam.x) * cam.zoom };
    }
    return { left, right: left, sx: VIEW_W };
  }

  private scene(e: Env): ParallaxScene {
    return e === 'bar' ? this.bar : this.street;
  }

  private pass(ctx: CanvasRenderingContext2D, L: RuntimeLevel, cam: ArtCamera, b: BeatInfo, which: 'back' | 'front'): void {
    const sp = this.split(L, cam);
    if (sp.left === sp.right) {
      this.scene(sp.left).drawPass(ctx, cam, b, which);
      if (which === 'back') this.wash(ctx, cam, sp.left, 0, VIEW_W);
      return;
    }
    for (const [env, a, z] of [
      [sp.left, 0, sp.sx],
      [sp.right, sp.sx, VIEW_W],
    ] as [Env, number, number][]) {
      if (z - a < 1) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(a - 40, -200, z - a + 40, VIEW_H + 400);
      ctx.clip();
      this.scene(env).drawPass(ctx, cam, b, which);
      if (which === 'back') this.wash(ctx, cam, env, a, z);
      ctx.restore();
    }
  }

  drawBack(ctx: CanvasRenderingContext2D, L: RuntimeLevel, cam: ArtCamera, b: BeatInfo): void {
    this.pass(ctx, L, cam, b, 'back');
  }

  drawFront(ctx: CanvasRenderingContext2D, L: RuntimeLevel, cam: ArtCamera, b: BeatInfo): void {
    this.pass(ctx, L, cam, b, 'front');
  }

  /**
   * READABILITY (review fix 7): a soft value wash over the background right behind the play band, so the
   * marquee lettering / bottle wall sit well below the hero, hazards and rewards in contrast.
   */
  private wash(ctx: CanvasRenderingContext2D, cam: ArtCamera, env: Env, x0: number, x1: number): void {
    const Lt = this.light(env);
    const groundSy = VIEW_H / 2 + (0 - cam.y) * cam.zoom;
    const top = groundSy - 620 * cam.zoom;
    const rgb = lit(Lt, H(env === 'bar' ? '#1E140E' : '#2A1E24'), 0.35);
    const bar = env === 'bar';
    const g = ctx.createLinearGradient(0, top, 0, groundSy);
    g.addColorStop(0, css(rgb, 0));
    g.addColorStop(0.4, css(rgb, bar ? 0.4 : 0.34));
    g.addColorStop(1, css(rgb, bar ? 0.5 : 0.44));
    ctx.fillStyle = g;
    ctx.fillRect(x0, top, x1 - x0, groundSy - top + 2);
  }

  // ------------------------------------------------------------------ play layer: ground, pits, doorway

  /** Floors (per environment), dips (safe puddles), lethal pits. World transform active. */
  drawGround(ctx: CanvasRenderingContext2D, L: RuntimeLevel, x0: number, x1: number, y1: number, b: BeatInfo): void {
    const cuts = this.boundaries(L).map((bd) => bd.x);
    const pitY = Tun.flow.pitY;
    // lethal pits: every hole between floor spans in view
    const fl = L.floors;
    for (let i = 0; i < fl.length; i++) {
      const f = fl[i];
      const n = fl[i + 1];
      if (!n) break;
      if (n.x0 - f.x1 < 4) continue;
      if (n.x0 < x0 - 100 || f.x1 > x1 + 100) continue;
      drawLethalPit(ctx, f.x1, n.x0, Math.min(f.y, n.y), pitY, y1, b);
    }
    for (const f of fl) {
      if (f.x1 < x0 || f.x0 > x1) continue;
      const a = Math.max(f.x0, x0 - 40);
      const z = Math.min(f.x1, x1 + 40);
      const depth = Math.max(40, Math.min(1400, y1 - f.y + 40));
      const segs = [a, ...cuts.filter((c) => c > a && c < z), z];
      for (let k = 0; k < segs.length - 1; k++) {
        const sa = segs[k];
        const sz = segs[k + 1];
        const env = this.envAt(L, (sa + sz) / 2);
        const rect = { x: sa, y: f.y, w: sz - sa, h: depth };
        const style = { light: this.light(env), capL: sa === f.x0, capR: sz === f.x1 };
        if (env === 'bar') drawBarFloor(ctx, rect, style);
        else drawStreetGround(ctx, rect, { ...style, version: this.streetLight.version });
      }
      if (f.y > 20) drawPuddle(ctx, f.x0, f.x1, f.y, b);
    }
  }

  /** the bar's front door where the street turns into the Honky-Tonk (behind the hero) */
  drawDoorways(ctx: CanvasRenderingContext2D, L: RuntimeLevel, x0: number, x1: number, b: BeatInfo): void {
    for (const bd of this.boundaries(L)) {
      if (bd.x < x0 - 400 || bd.x > x1 + 400) continue;
      const fy = L.floorYAt(bd.x + 1);
      drawDoorway(ctx, bd.x, Number.isNaN(fy) ? 0 : fy, bd.to, this.light(bd.to), b);
    }
  }
}

// ------------------------------------------------------------------ pieces

/**
 * LETHAL PIT (danger language: lacquer red + hot edge, the same on every lethal thing): a black shaft,
 * a red furnace glow boiling up from below, hot-edge rims on both lips and red/black hazard chevrons on
 * the curb faces. Reads as "death" in greyscale too: the only pure-black void with bright jagged rims.
 */
export function drawLethalPit(ctx: CanvasRenderingContext2D, xa: number, xb: number, top: number, pitY: number, yBottom: number, b: BeatInfo): void {
  const w = xb - xa;
  const t = b.time;
  ctx.fillStyle = DANGER.void;
  ctx.fillRect(xa - 2, top - 2, w + 4, yBottom - top + 4);
  // furnace glow from below (pulses on the kick)
  const k = 0.75 + 0.25 * hit(b, 'kick', 0.15);
  const gr = ctx.createLinearGradient(0, top + 30, 0, pitY + 180);
  gr.addColorStop(0, 'rgba(179,32,27,0)');
  gr.addColorStop(0.55, `rgba(179,32,27,${0.55 * k})`);
  gr.addColorStop(1, `rgba(255,74,61,${0.85 * k})`);
  ctx.fillStyle = gr;
  ctx.fillRect(xa, top + 30, w, pitY + 180 - top - 30);
  drawGlow(ctx, (xa + xb) / 2, pitY + 60, DANGER.hot, Math.max(120, w * 0.8), 0.45 * k);
  // rising embers
  ctx.fillStyle = DANGER.hot;
  for (let i = 0; i < 7; i++) {
    const u = (t * (0.5 + hash(i) * 0.6) + hash(i + 11)) % 1;
    const ex = xa + 14 + hash(i + 3) * (w - 28) + Math.sin(t * 3 + i) * 8;
    const ey = pitY + 120 - u * (pitY + 120 - top);
    ctx.globalAlpha = (1 - u) * 0.9;
    ctx.fillRect(ex, ey, 4, 4);
  }
  ctx.globalAlpha = 1;
  // hot-edge rims + hazard chevrons on both curb faces
  for (const [x, dir] of [
    [xa, 1],
    [xb, -1],
  ] as [number, number][]) {
    ctx.fillStyle = DANGER.hot;
    ctx.fillRect(x - (dir > 0 ? 0 : 6), top - 4, 6, 70);
    ctx.save();
    ctx.beginPath();
    ctx.rect(dir > 0 ? x - 34 : x, top + 4, 34, 22);
    ctx.clip();
    ctx.fillStyle = DANGER.red;
    ctx.fillRect(dir > 0 ? x - 34 : x, top + 4, 34, 22);
    ctx.fillStyle = DANGER.ink;
    for (let s = -2; s < 4; s++) {
      const sx = (dir > 0 ? x - 34 : x) + s * 14;
      ctx.beginPath();
      ctx.moveTo(sx, top + 26);
      ctx.lineTo(sx + 7, top + 26);
      ctx.lineTo(sx + 29, top + 4);
      ctx.lineTo(sx + 22, top + 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // jagged broken-glass teeth along the bottom of the visible shaft top: the lethal silhouette
  ctx.fillStyle = DANGER.ink;
  ctx.beginPath();
  ctx.moveTo(xa, pitY + 40);
  const n = Math.max(3, Math.round(w / 34));
  for (let i = 0; i <= n; i++) {
    const x = xa + (i / n) * w;
    ctx.lineTo(x - w / n / 2, pitY + 40);
    ctx.lineTo(x - w / n / 4, pitY + 4 - hash(i + Math.round(xa)) * 16);
  }
  ctx.lineTo(xb, pitY + 40);
  ctx.lineTo(xb, pitY + 400);
  ctx.lineTo(xa, pitY + 400);
  ctx.closePath();
  ctx.fill();
}

/** a dip in the ground = a safe puddle (cool blue, reflective streaks — never red) */
function drawPuddle(ctx: CanvasRenderingContext2D, x0: number, x1: number, floorY: number, b: BeatInfo): void {
  const top = floorY - 16;
  ctx.fillStyle = 'rgba(52,86,110,0.85)';
  ctx.fillRect(x0 + 4, top, x1 - x0 - 8, 16);
  ctx.fillStyle = 'rgba(248,241,220,0.55)';
  for (let x = x0 + 12; x < x1 - 20; x += 30) ctx.fillRect(x, top + 3 + Math.sin(b.time * 3 + x * 0.05) * 2, 16, 3);
}

/** the Honky-Tonk's front door: jambs, lintel, neon sign — the scene split hides behind it */
function drawDoorway(ctx: CanvasRenderingContext2D, x: number, y: number, to: Env, L: Lighting, b: BeatInfo): void {
  const wood = css(lit(L, H('#4E3A2C'), 0.8));
  const dark = CF.filmBlack;
  const top = y - 330;
  // brick pier + jamb
  ctx.fillStyle = css(lit(L, H(CF.brick), 0.7));
  ctx.fillRect(x - 70, top - 520, 70, 520 + 330);
  ctx.fillStyle = dark;
  ctx.fillRect(x - 74, top - 520, 6, 850);
  ctx.fillRect(x - 4, top - 520, 6, 850);
  ctx.fillStyle = wood;
  ctx.fillRect(x - 16, top, 22, 330);
  // lintel
  ctx.fillRect(x - 90, top - 26, 300, 30);
  ctx.fillStyle = dark;
  ctx.fillRect(x - 90, top - 30, 300, 5);
  // neon sign over the door: flickers with the hats, blazes on the kick
  const on = 0.7 + 0.3 * hit(b, 'kick', 0.12);
  const word = to === 'bar' ? 'HONKY-TONK' : '42ND ST';
  ctx.save();
  ctx.font = 'italic 54px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(20,12,8,0.9)';
  ctx.strokeText(word, x + 60, top - 90);
  ctx.fillStyle = css(mix(H(CF.neonRose), [255, 255, 255], 0.15 * on), on);
  ctx.fillText(word, x + 60, top - 90);
  ctx.restore();
  drawGlow(ctx, x + 60, top - 90, CF.neonRose, 260, 0.35 * on);
  void TAU;
}
