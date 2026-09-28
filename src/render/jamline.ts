/**
 * THE JAM LINE (review iter2 fix 8): harmless goons dancing on the backbeat just BEHIND the play band
 * (parallax 0.85, hazed, never red/gold), like Rayman's jamming enemies. More of them join as the song's
 * energy rises; in a chorus the whole line is up. Street: flat caps and vests; bar: patrons; lanes: bowlers.
 * The facade climb has no line (you're outside a building) — its windows dance instead (art/grindhouse/facade).
 */
import type { BeatInfo } from '../art/core/beat';
import { css, hex, mix } from '../art/core/color';
import { hash } from '../art/core/math';
import { type JammerColours, drawJammer } from '../art/grindhouse/jammers';
import type { ArtCamera } from '../art/world/camera';
import { layerView, pushLayer } from '../art/world/camera';
import { type Lighting, lit } from '../art/world/lighting';
import { VIEW_W } from '../engine/display';

const SP = 560;
const F = 0.85;
const VESTS: Record<string, string[]> = {
  street: ['#5E2B4E', '#3E5A5E', '#6B4A34', '#4A4A5A'],
  bar: ['#6B4A34', '#3E5A5E', '#5E2B4E', '#2F5A3A'],
  lanes: ['#3FF0E0', '#E04BD0', '#B9A0E0', '#2A1650'],
};

export function drawJamLine(
  g: CanvasRenderingContext2D,
  cam: ArtCamera,
  b: BeatInfo,
  lightFor: (env: string) => Lighting,
  envAtWorld: (x: number) => string,
  energy: number,
  chorus: boolean,
  hide: (worldX: number) => boolean,
  /** the scene camera for an environment (the Lanes are authored around their own floor) */
  camFor: (env: string) => ArtCamera = () => cam,
): void {
  const envC = envAtWorld(cam.x);
  if (envC === 'facade') return;
  const v = layerView(camFor(envC), F);
  pushLayer(g, v);
  const want = chorus ? 1 : Math.max(0.25, Math.min(0.85, (energy - 0.35) * 1.4));
  const cache = new Map<string, { L: Lighting; body: string; skin: string; rim: string }>();
  for (let k = Math.floor(v.x0 / SP) - 1; k <= Math.floor(v.x1 / SP) + 1; k++) {
    if (hash(k * 3 + 1) > want) continue;
    const lx = k * SP + hash(k) * 240;
    const sx = VIEW_W / 2 + (lx - v.cx) * v.z;
    const wx = cam.x + (sx - VIEW_W / 2) / cam.zoom;
    if (hide(wx)) continue;
    const env = envAtWorld(wx);
    if (env === 'facade') continue;
    let c = cache.get(env);
    if (!c) {
      const L = lightFor(env);
      const body = lit(L, hex('#2A2024'), 0.5, 0.28);
      c = { L, body: css(body), skin: css(lit(L, hex('#9A7462'), 0.6, 0.28)), rim: css(mix(body, L.rim, 0.65), 0.9) };
      cache.set(env, c);
    }
    const vests = VESTS[env] ?? VESTS.street;
    const vest = vests[Math.floor(hash(k + 7) * vests.length)];
    const C: JammerColours = { body: c.body, skin: c.skin, rim: c.rim, vest: css(lit(c.L, hex(vest), env === 'lanes' ? 1.2 : 0.6, 0.28)) };
    const n = hash(k + 11) < 0.4 ? 2 : 1;
    for (let i = 0; i < n; i++) drawJammer(g, lx + i * 70, -6 + i * 4, 0.82 - i * 0.05, Math.floor(hash(k * 5 + i) * 5), b, C, i ? -1 : 1);
  }
  g.restore();
}
