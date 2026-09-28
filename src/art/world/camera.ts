/**
 * Camera + parallax projection shared by every world layer.
 *
 * ArtCamera = world point at the centre of the 1920x1080 view + zoom (same convention as the game
 * camera). World y grows DOWN and the base ground top is y = 0.
 *
 * Background layers are authored in "world-at-reference" coordinates: where things appear when the
 * camera sits at REF_CAM_Y. A layer with parallax factor f follows the camera by f in x and y, and
 * zooms by 1 + (zoom - 1) * f.
 */
import type { Ctx } from '../core/canvas';

export const VIEW_W = 1920;
export const VIEW_H = 1080;
/** typical camera centre y: ground top (y=0) sits at screen y 790 */
export const REF_CAM_Y = -250;
/** play-layer sea surface (world y) */
export const SEA_Y = 170;
/** horizon line, in reference coords (screen y 490 at REF_CAM_Y) */
export const HORIZON_Y = -300;

export interface ArtCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface LayerView {
  /** zoom for this layer */
  z: number;
  /** layer-space x at the screen centre */
  cx: number;
  /** layer-space y at the screen centre */
  cy: number;
  /** visible layer-space x range */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export function layerView(cam: ArtCamera, f: number): LayerView {
  const z = 1 + (cam.zoom - 1) * f;
  const cx = cam.x * f;
  const cy = REF_CAM_Y + (cam.y - REF_CAM_Y) * f;
  const hw = VIEW_W / 2 / z;
  const hh = VIEW_H / 2 / z;
  return { z, cx, cy, x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh };
}

/** Push a transform so drawing in layer space lands on screen. Pair with g.restore(). */
export function pushLayer(g: Ctx, v: LayerView): void {
  g.save();
  g.translate(VIEW_W / 2, VIEW_H / 2);
  g.scale(v.z, v.z);
  g.translate(-v.cx, -v.cy);
}

/** layer-space y -> screen y */
export function screenY(v: LayerView, y: number): number {
  return VIEW_H / 2 + (y - v.cy) * v.z;
}
export function screenX(v: LayerView, x: number): number {
  return VIEW_W / 2 + (x - v.cx) * v.z;
}
