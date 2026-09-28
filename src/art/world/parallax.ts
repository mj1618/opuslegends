/**
 * PARALLAX SCENE FRAMEWORK (theme-agnostic).
 *
 * A scene is an ordered list of layers split into two passes around the play layer:
 *   scene.drawBack(ctx, cam, beat)    -> every layer with pass 'back' (sky ... mid-ground)
 *   ...game draws terrain / entities / hero in world space...
 *   scene.drawFront(ctx, cam, beat)   -> every layer with pass 'front' (foreground, weather, grade)
 *
 * Each layer gets a SceneFrame { L (current Lighting), version, b (BeatInfo) } so it can relight
 * and dance. Build layers with:
 *   - stripLayer(): a horizontally tiling, RELIGHTABLE silhouette strip (you paint masks once; the
 *     lighting recolours body / shade-left / shade-right / detail / accent / rim channels) + live props
 *     at anchors, + an optional beat "bump".
 *   - skyLayer(): gradient sky, sun/moon/stars, relit clouds (from sky.ts).
 *   - any object implementing SceneLayer (fully custom drawing).
 */
import { type BeatInfo, type Instrument, hit } from '../core/beat';
import { TintBake } from '../core/bake';
import type { Ctx } from '../core/canvas';
import { type RGB, css, hex, mix } from '../core/color';
import { clamp01 } from '../core/math';
import { type ArtCamera, type LayerView, pushLayer } from './camera';
import { type LightKey, type Lighting, LightingDirector, atmos, lit } from './lighting';
import { Sky } from './sky';
import { type Anchor, TiledLayer } from './tiledLayer';

export interface SceneFrame {
  L: Lighting;
  version: number;
  b: BeatInfo;
}

export interface SceneLayer {
  id: string;
  pass: 'back' | 'front';
  draw(g: Ctx, cam: ArtCamera, f: SceneFrame): void;
}

export class ParallaxScene {
  readonly light: LightingDirector;
  readonly layers: SceneLayer[] = [];
  /** ids of layers to skip */
  readonly hidden = new Set<string>();

  constructor(light: LightKey | LightingDirector = 'morning') {
    this.light = typeof light === 'string' ? new LightingDirector(light) : light;
  }

  add(...layers: SceneLayer[]): this {
    this.layers.push(...layers);
    return this;
  }

  get L(): Lighting {
    return this.light.current;
  }

  /** advance lighting transitions + reset the relight budget. Call once per frame. */
  update(dt: number): void {
    this.light.update(dt);
    TintBake.frame();
  }

  frame(b: BeatInfo): SceneFrame {
    return { L: this.light.current, version: this.light.version, b };
  }

  drawPass(g: Ctx, cam: ArtCamera, b: BeatInfo, pass: 'back' | 'front'): void {
    const f = this.frame(b);
    for (const l of this.layers) if (l.pass === pass && !this.hidden.has(l.id)) l.draw(g, cam, f);
  }

  drawBack(g: Ctx, cam: ArtCamera, b: BeatInfo): void {
    this.drawPass(g, cam, b, 'back');
  }

  drawFront(g: Ctx, cam: ArtCamera, b: BeatInfo): void {
    this.drawPass(g, cam, b, 'front');
  }
}

// ------------------------------------------------------------------------------ strip layer

export interface StripMaterial {
  /** main body colour (before lighting) */
  base: RGB | string;
  /** shadow-side colour (default: base) */
  shade?: RGB | string;
  /** fine detail colour (cracks, windows frames, strata) */
  detail?: RGB | string;
  /** accent colour (vegetation, signage, trims) */
  accent?: RGB | string;
  /** emissive colour (lit windows, neon, lamps) — NOT darkened by lighting, scaled by L.lamps */
  glow?: RGB | string;
  /** 0 = play layer .. 1 = horizon: haze + desaturation */
  depth: number;
}

export interface StripPainter {
  /** channel contexts (paint in white; alpha = coverage) */
  body: Ctx;
  shadeL: Ctx;
  shadeR: Ctx;
  detail: Ctx;
  accent: Ctx;
  rim: Ctx;
  glow: Ctx;
  /** tile width/height (tile coords: x 0..W, y 0..H) */
  W: number;
  H: number;
  /** convert tile y -> layer y */
  top: number;
  anchors: Anchor[];
}

export interface StripOpts {
  id: string;
  pass?: 'back' | 'front';
  /** parallax factor */
  factor: number;
  /** tile width, layer-space top and height */
  W: number;
  top: number;
  H: number;
  /** cache resolution multiplier (distant = 0.5 is fine) */
  res?: number;
  material: StripMaterial;
  paint(p: StripPainter): void;
  /** live props drawn in layer space after the strip (anchors are tiling-aware via layer.eachAnchor) */
  props?(g: Ctx, v: LayerView, f: SceneFrame, layer: TiledLayer): void;
  /** vertical "breathe" on a beat lane */
  bump?: { lane: Instrument; amount: number; decay?: number };
  /** soft-focus blur (px) for foreground strips */
  blur?: number;
  /** overall alpha (e.g. fade a layer with a lighting scalar) */
  alpha?: (L: Lighting) => number;
}

const rgb = (c: RGB | string | undefined, fb: RGB): RGB => (c === undefined ? fb : typeof c === 'string' ? hex(c) : c);

/** Standard 7-channel relightable strip. */
export function stripLayer(o: StripOpts): SceneLayer & { layer: TiledLayer } {
  const layer = new TiledLayer(
    o.W,
    o.top,
    o.H,
    o.factor,
    7,
    (ch, W, H, anchors) =>
      o.paint({ body: ch(0), shadeL: ch(1), shadeR: ch(2), detail: ch(3), accent: ch(4), rim: ch(5), glow: ch(6), W, H, top: o.top, anchors }),
    o.res ?? 1,
  );
  if (o.blur) layer.bake.blur = o.blur;
  const m = o.material;
  const base = rgb(m.base, [200, 200, 200]);
  const shade = rgb(m.shade, base);
  const detail = rgb(m.detail, mix(base, [0, 0, 0], 0.6));
  const accent = rgb(m.accent, base);
  const glow = rgb(m.glow, [255, 220, 150]);
  let key = -1;
  let cols: string[] = [];
  return {
    id: o.id,
    pass: o.pass ?? 'back',
    layer,
    draw(g, cam, f) {
      const L = f.L;
      const a = o.alpha ? o.alpha(L) : 1;
      if (a <= 0.01) return;
      if (key !== f.version) {
        key = f.version;
        const d = m.depth;
        const aR = clamp01(0.5 - L.lightDir * 0.5); // light from the left -> right faces in shade
        const sh = lit(L, shade, 0.05, d);
        cols = [
          css(lit(L, base, 0.9, d)),
          css(sh, 0.2 + 0.65 * (1 - aR)),
          css(sh, 0.2 + 0.65 * aR),
          css(lit(L, detail, 0.5, d), 0.75),
          css(lit(L, accent, 0.9, d)),
          css(mix(lit(L, base, 1.1, d), L.rim, 0.5 * L.rimAmt)),
          css(atmos(L, glow, d * 0.5), clamp01(0.12 + L.lamps * 0.8)),
        ];
      }
      const bump = o.bump ? hit(f.b, o.bump.lane, o.bump.decay ?? 0.12) * o.bump.amount : 0;
      if (a < 1) {
        g.save();
        g.globalAlpha = a;
      }
      const v = layer.draw(g, cam, cols, bump);
      if (o.props) {
        pushLayer(g, v);
        o.props(g, v, f, layer);
        g.restore();
      }
      if (a < 1) g.restore();
    },
  };
}

/** Gradient sky + sun/moon/stars + relit clouds as a scene layer. */
export function skyLayer(id = 'sky'): SceneLayer & { sky: Sky } {
  const sky = new Sky();
  return {
    id,
    pass: 'back',
    sky,
    draw(g, cam, f) {
      sky.draw(g, cam, f.L, f.b, f.version);
    },
  };
}
