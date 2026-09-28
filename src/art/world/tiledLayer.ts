/**
 * TiledLayer: a horizontally repeating, relightable parallax strip (TintBake channels) plus
 * a list of "anchors" (points of interest for live beat-reactive props: cave mouths, blowholes,
 * lamps, ledges...). Content is painted once by `paint(ch, W, H, anchors)` in local tile coords
 * (x 0..W, y top..top+H).
 */
import { TintBake } from '../core/bake';
import type { Ctx } from '../core/canvas';
import { type ArtCamera, type LayerView, layerView, pushLayer } from './camera';

export interface Anchor {
  kind: string;
  x: number;
  y: number;
  /** free parameter (size, variant...) */
  s: number;
}

export class TiledLayer {
  readonly bake: TintBake;
  readonly anchors: Anchor[] = [];
  constructor(
    readonly W: number,
    readonly top: number,
    readonly H: number,
    readonly f: number,
    nChannels: number,
    paint: (ch: (i: number) => Ctx, W: number, H: number, anchors: Anchor[]) => void,
    resMul = 1,
  ) {
    this.bake = new TintBake(W, H, nChannels, resMul);
    paint((i) => this.bake.ch(i), W, H, this.anchors);
  }

  view(cam: ArtCamera): LayerView {
    return layerView(cam, this.f);
  }

  /** compose (throttled) and draw the tiles. `bump` scales about the layer's base line (beat breathe). */
  draw(g: Ctx, cam: ArtCamera, colours: readonly (string | null)[], bump = 0): LayerView {
    this.bake.compose(colours);
    const v = this.view(cam);
    pushLayer(g, v);
    if (bump) {
      const by = this.top + this.H;
      g.translate(0, by);
      g.scale(1, 1 + bump);
      g.translate(0, -by);
    }
    const start = Math.floor(v.x0 / this.W) * this.W;
    for (let x = start; x < v.x1; x += this.W) g.drawImage(this.bake.out, x, this.top, this.W, this.H);
    g.restore();
    return v;
  }

  /** visit anchors visible in view v (tiling-aware); fn gets layer-space coords */
  eachAnchor(v: LayerView, kind: string | null, margin: number, fn: (a: Anchor, x: number) => void): void {
    for (const a of this.anchors) {
      if (kind && a.kind !== kind) continue;
      for (let x = a.x + Math.ceil((v.x0 - margin - a.x) / this.W) * this.W; x <= v.x1 + margin; x += this.W) fn(a, x);
    }
  }
}
