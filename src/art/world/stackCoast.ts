/**
 * THE STACK COAST — world renderer (DESIGN §3). Owns every background layer and draws them in
 * order around the play layer:
 *
 *   coast.drawBackground(ctx, cam, beat)   sky, lightning, horizon, far stacks, beam, cliffs, cave
 *   coast.drawSeaBack(ctx, cam, beat, o)   sea surface/body behind the terrain
 *   ...game draws terrain + entities + Crabbe in world coords...
 *   coast.drawSeaFront(ctx, cam, beat, o)  front wave band + surf bursts at terrain edges
 *   coast.drawForeground(ctx, cam, beat)   cave ceiling, foreground silhouettes, rain, vignette
 *
 * Lighting: `coast.light` is a LightingDirector — call `coast.light.set('storm', 4)` at section
 * changes and `coast.update(dt)` each frame. Everything relights smoothly.
 */
import { type BeatInfo } from '../core/beat';
import { TintBake } from '../core/bake';
import { type Ctx, makeCanvas, ctx2d } from '../core/canvas';
import { type ArtCamera, VIEW_H, VIEW_W } from './camera';
import { Cave } from './cave';
import { Cliffs } from './cliffs';
import { FarStacks } from './farStacks';
import { Foreground } from './foreground';
import { Horizon, type HorizonOptions } from './horizon';
import { type LightKey, type Lighting, LightingDirector } from './lighting';
import { Sea, type SeaOptions } from './sea';
import { Sky } from './sky';
import { warmTerrain } from './terrain';
import { Weather } from './weather';

export interface CoastOptions extends HorizonOptions {
  /** hide layers (debug / set-pieces) */
  hide?: Partial<Record<'sky' | 'horizon' | 'far' | 'cliffs' | 'cave' | 'fg' | 'weather', boolean>>;
}

export class StackCoast {
  readonly light: LightingDirector;
  readonly sky = new Sky();
  readonly horizon = new Horizon();
  readonly far = new FarStacks();
  readonly cliffs = new Cliffs();
  readonly cave = new Cave();
  readonly sea = new Sea();
  readonly fg = new Foreground();
  readonly weather = new Weather();
  private vignette: HTMLCanvasElement;

  constructor(light: LightKey | LightingDirector = 'dawn') {
    this.light = typeof light === 'string' ? new LightingDirector(light) : light;
    warmTerrain();
    this.vignette = makeCanvas(480, 270);
    const v = ctx2d(this.vignette);
    const gr = v.createRadialGradient(240, 135, 60, 240, 135, 290);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.7, 'rgba(0,0,0,0.12)');
    gr.addColorStop(1, 'rgba(0,0,0,0.5)');
    v.fillStyle = gr;
    v.fillRect(0, 0, 480, 270);
  }

  get L(): Lighting {
    return this.light.current;
  }

  /** advance lighting transitions + reset the relight budget. Call once per frame. */
  update(dt: number): void {
    this.light.update(dt);
    TintBake.frame();
  }

  drawBackground(g: Ctx, cam: ArtCamera, b: BeatInfo, o: CoastOptions = {}): void {
    const L = this.L;
    const ver = this.light.version;
    const h = o.hide ?? {};
    if (!h.sky) this.sky.draw(g, cam, L, b, ver);
    if (!h.weather) this.weather.drawBolts(g, L, b, this.sky.horizonY(cam));
    if (!h.horizon) this.horizon.draw(g, cam, L, b, ver, o);
    if (!h.far) this.far.draw(g, cam, L, b);
    if (!h.cliffs && L.cave < 0.99) {
      this.cliffs.drawBeam(g, cam, L, b);
      this.cliffs.draw(g, cam, L, b);
    }
    if (!h.cave) this.cave.drawBackdrop(g, cam, L, b);
  }

  drawSeaBack(g: Ctx, cam: ArtCamera, b: BeatInfo, o: SeaOptions = {}): void {
    this.sea.drawBack(g, cam, this.L, b, this.light.version, o);
  }

  drawSeaFront(g: Ctx, cam: ArtCamera, b: BeatInfo, o: SeaOptions = {}): void {
    this.sea.drawFront(g, cam, this.L, b, this.light.version, o);
  }

  drawForeground(g: Ctx, cam: ArtCamera, b: BeatInfo, o: CoastOptions = {}): void {
    const L = this.L;
    const h = o.hide ?? {};
    if (!h.cave) this.cave.drawCeiling(g, cam, L, b);
    if (!h.fg) this.fg.draw(g, cam, L, b);
    if (!h.weather) this.weather.drawRain(g, L, b);
    g.save();
    g.globalAlpha = 0.55 + L.cave * 0.35 + L.rain * 0.2;
    g.drawImage(this.vignette, 0, 0, VIEW_W, VIEW_H);
    g.restore();
  }
}
