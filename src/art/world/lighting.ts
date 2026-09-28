/**
 * Lighting: the compressed-day arc (DESIGN §3 "Lighting arc").
 *
 * A `Lighting` is a bag of colours + scalars that every layer reads. Keyframes blend smoothly
 * (`blendLighting`) and a `LightingDirector` eases between them over time. All material colours
 * go through `lit()` so the whole world relights consistently (incl. haze by depth and the
 * finale's parchment/engraving look).
 */
import { type RGB, desat, hex, lum, mix, mul } from '../core/color';
import { clamp01, smooth } from '../core/math';
import { RGBP } from '../palette';

export const LIGHT_KEYS = ['preDawn', 'dawn', 'morning', 'cave', 'storm', 'sunset', 'dusk', 'parchment'] as const;
export type LightKey = (typeof LIGHT_KEYS)[number];

export interface Lighting {
  skyTop: RGB;
  skyMid: RGB;
  skyLow: RGB;
  /** glow colour hugging the horizon / behind the sun */
  glow: RGB;
  glowAmt: number;
  sun: RGB;
  /** sun position in screen fractions (y 0 = top); below horizon = hidden */
  sunX: number;
  sunY: number;
  sunR: number;
  sunAmt: number;
  moonAmt: number;
  starAmt: number;
  /** direct light multiplier */
  key: RGB;
  /** shadow / ambient multiplier */
  amb: RGB;
  /** rim / bounce light colour */
  rim: RGB;
  rimAmt: number;
  /** atmospheric haze colour + strength */
  haze: RGB;
  hazeK: number;
  cloud: RGB;
  cloudLit: RGB;
  cloudAmt: number;
  /** -1 light from the left, +1 from the right */
  lightDir: number;
  seaTop: RGB;
  seaDeep: RGB;
  foam: RGB;
  glitter: number;
  beam: number;
  /** lamp / window glow strength (lighthouse lamp, beacon lamps) */
  lamps: number;
  rain: number;
  whitecaps: number;
  lightning: number;
  cave: number;
  caustics: number;
  parchment: number;
  /** extra background saturation loss (0..1) */
  bgDesat: number;
}

const H = hex;

const base = (o: Partial<Lighting>): Lighting => ({
  skyTop: H('#4FB3E6'),
  skyMid: H('#8FD3F0'),
  skyLow: H('#DDF3F7'),
  glow: H('#FFF3D6'),
  glowAmt: 0.3,
  sun: H('#FFF6D8'),
  sunX: 0.72,
  sunY: 0.16,
  sunR: 46,
  sunAmt: 1,
  moonAmt: 0,
  starAmt: 0,
  key: H('#FFF8EC'),
  amb: H('#7E9CC0'),
  rim: H('#FFFFFF'),
  rimAmt: 0.3,
  haze: H('#BFE6F2'),
  hazeK: 0.55,
  cloud: H('#CFE6F4'),
  cloudLit: H('#FFFFFF'),
  cloudAmt: 1,
  lightDir: 1,
  seaTop: H('#3FC3C4'),
  seaDeep: RGBP.seaDeep,
  foam: RGBP.foam,
  glitter: 0.6,
  beam: 0.1,
  lamps: 0.15,
  rain: 0,
  whitecaps: 0.2,
  lightning: 0,
  cave: 0,
  caustics: 0,
  parchment: 0,
  bgDesat: 0.3,
  ...o,
});

export const LIGHTS: Record<LightKey, Lighting> = {
  preDawn: base({
    skyTop: H('#0B1030'),
    skyMid: H('#1E2450'),
    skyLow: H('#4A3F6E'),
    glow: H('#F4A98A'),
    glowAmt: 0.55,
    sun: H('#FFC9A0'),
    sunX: 0.2,
    sunY: 0.5,
    sunAmt: 0,
    moonAmt: 1,
    starAmt: 1,
    key: H('#9AA6D8'),
    amb: H('#3A3F78'),
    rim: H('#F4B28F'),
    rimAmt: 0.45,
    haze: H('#2E3462'),
    hazeK: 0.6,
    cloud: H('#262B55'),
    cloudLit: H('#8E7FA8'),
    cloudAmt: 0.7,
    lightDir: -1,
    seaTop: H('#1D4E6A'),
    seaDeep: H('#0A2238'),
    foam: H('#AEC4DE'),
    glitter: 0.25,
    beam: 1,
    lamps: 1,
    whitecaps: 0.15,
    bgDesat: 0.35,
  }),
  dawn: base({
    skyTop: H('#7C7FC0'),
    skyMid: H('#F7B9A0'),
    skyLow: H('#FBE3C8'),
    glow: H('#FFD7A0'),
    glowAmt: 0.8,
    sun: H('#FFE7B0'),
    sunX: 0.24,
    sunY: 0.38,
    sunR: 58,
    sunAmt: 1,
    starAmt: 0.08,
    key: H('#FFD9AE'),
    amb: H('#8472A4'),
    rim: H('#FFC98A'),
    rimAmt: 0.8,
    haze: H('#F2C4B6'),
    hazeK: 0.55,
    cloud: H('#C69BB4'),
    cloudLit: H('#FFE2C0'),
    cloudAmt: 0.9,
    lightDir: -1,
    seaTop: H('#6FB9C4'),
    seaDeep: H('#2B6A84'),
    foam: H('#FFF1E6'),
    glitter: 1,
    beam: 0.45,
    lamps: 0.6,
    whitecaps: 0.2,
  }),
  morning: base({}),
  cave: base({
    skyTop: H('#050F14'),
    skyMid: H('#10262E'),
    skyLow: H('#1B4048'),
    glow: H('#7FE0D6'),
    glowAmt: 0.4,
    sunAmt: 0,
    key: H('#9FE6DE'),
    amb: H('#1E3E4C'),
    rim: H('#9FF3E8'),
    rimAmt: 0.9,
    haze: H('#14323A'),
    hazeK: 0.7,
    cloud: H('#10262E'),
    cloudLit: H('#1B4048'),
    cloudAmt: 0,
    lightDir: 1,
    seaTop: H('#1F7F86'),
    seaDeep: H('#07262E'),
    foam: H('#BFF7EE'),
    glitter: 0.2,
    beam: 0,
    lamps: 1,
    whitecaps: 0.1,
    cave: 1,
    caustics: 1,
    bgDesat: 0.2,
  }),
  storm: base({
    skyTop: H('#23273F'),
    skyMid: H('#4B4E6D'),
    skyLow: H('#6E6F88'),
    glow: H('#9C9CC0'),
    glowAmt: 0.25,
    sunAmt: 0,
    key: H('#B4B8D6'),
    amb: H('#3A3E5E'),
    rim: H('#D8DCF8'),
    rimAmt: 0.5,
    haze: H('#555A78'),
    hazeK: 0.7,
    cloud: H('#2E3350'),
    cloudLit: H('#6E7194'),
    cloudAmt: 1,
    lightDir: 1,
    seaTop: H('#2E6C78'),
    seaDeep: H('#132D3C'),
    foam: H('#DCE8F0'),
    glitter: 0,
    beam: 0.85,
    lamps: 1,
    rain: 1,
    whitecaps: 1,
    lightning: 1,
    bgDesat: 0.45,
  }),
  sunset: base({
    skyTop: H('#4E3A86'),
    skyMid: H('#FF7F66'),
    skyLow: H('#FFB347'),
    glow: H('#FFD27A'),
    glowAmt: 1,
    sun: H('#FFE9A0'),
    sunX: 0.7,
    sunY: 0.36,
    sunR: 72,
    sunAmt: 1,
    key: H('#FFC08A'),
    amb: H('#7A4474'),
    rim: H('#FFD27A'),
    rimAmt: 1,
    haze: H('#F79A7A'),
    hazeK: 0.55,
    cloud: H('#A4508A'),
    cloudLit: H('#FFC47A'),
    cloudAmt: 0.9,
    lightDir: 1,
    seaTop: H('#C47A86'),
    seaDeep: H('#3A3868'),
    foam: H('#FFE8D6'),
    glitter: 1,
    beam: 0.2,
    lamps: 0.5,
    whitecaps: 0.3,
    bgDesat: 0.2,
  }),
  dusk: base({
    skyTop: H('#0E0E2A'),
    skyMid: H('#2B2A55'),
    skyLow: H('#6E4A70'),
    glow: H('#F09A74'),
    glowAmt: 0.55,
    sun: H('#FFB080'),
    sunX: 0.8,
    sunY: 0.48,
    sunR: 60,
    sunAmt: 0,
    moonAmt: 0.6,
    starAmt: 0.75,
    key: H('#A298C8'),
    amb: H('#34305E'),
    rim: H('#F0A07A'),
    rimAmt: 0.7,
    haze: H('#3A3560'),
    hazeK: 0.65,
    cloud: H('#2A2850'),
    cloudLit: H('#A06A80'),
    cloudAmt: 0.7,
    lightDir: 1,
    seaTop: H('#34416E'),
    seaDeep: H('#121838'),
    foam: H('#C8C4E4'),
    glitter: 0.35,
    beam: 0.9,
    lamps: 1,
    whitecaps: 0.15,
    bgDesat: 0.35,
  }),
  parchment: base({
    skyTop: RGBP.parchment,
    skyMid: RGBP.parchment,
    skyLow: H('#E6D3A8'),
    glow: RGBP.parchment,
    glowAmt: 0,
    sunAmt: 0,
    key: H('#FFFFFF'),
    amb: H('#B8A27A'),
    rim: RGBP.parchment,
    rimAmt: 0,
    haze: RGBP.parchment,
    hazeK: 0.35,
    cloud: H('#E6D5AE'),
    cloudLit: RGBP.parchment,
    cloudAmt: 0.6,
    seaTop: RGBP.seaWash,
    seaDeep: H('#7FAAA2'),
    foam: RGBP.parchment,
    glitter: 0,
    beam: 0,
    lamps: 0,
    whitecaps: 0,
    parchment: 1,
    bgDesat: 0.5,
  }),
};

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function blendLighting(a: Lighting, b: Lighting, t: number): Lighting {
  const o = {} as Record<string, unknown>;
  for (const k of Object.keys(a) as (keyof Lighting)[]) {
    const va = a[k];
    const vb = b[k];
    o[k] = typeof va === 'number' ? lerpN(va, vb as number, t) : mix(va as RGB, vb as RGB, t);
  }
  return o as unknown as Lighting;
}

/** Eases the current lighting toward a target keyframe. */
export class LightingDirector {
  current: Lighting;
  private from: Lighting;
  private to: Lighting;
  private t = 1;
  private dur = 1;
  key: LightKey;
  /** increments every time `current` changes (use to cache derived gradients) */
  version = 0;

  constructor(key: LightKey = 'morning') {
    this.key = key;
    this.current = LIGHTS[key];
    this.from = this.current;
    this.to = this.current;
  }

  set(key: LightKey, seconds = 2): void {
    this.key = key;
    this.from = this.current;
    this.to = LIGHTS[key];
    this.t = 0;
    this.dur = Math.max(1e-3, seconds);
    if (seconds <= 0) this.t = 1;
    this.recompute();
  }

  /** jump to a blend between two keys (slider) */
  setBlend(a: LightKey, b: LightKey, t: number): void {
    this.current = blendLighting(LIGHTS[a], LIGHTS[b], clamp01(t));
    this.from = this.to = this.current;
    this.t = 1;
    this.version++;
  }

  update(dt: number): void {
    if (this.t >= 1) return;
    this.t = Math.min(1, this.t + dt / this.dur);
    this.recompute();
  }

  private recompute() {
    this.current = blendLighting(this.from, this.to, smooth(this.t));
    this.version++;
  }
}

/** Engraving look: map a colour to parchment (light) .. ink (dark). */
function engrave(c: RGB): RGB {
  const l = lum(c);
  return mix(RGBP.ink, RGBP.parchment, Math.min(1, l * 1.25));
}

/**
 * Light a material colour.
 * @param light 0 = in shadow (ambient only) .. 1 = fully lit by the key light (>1 = hot highlight)
 * @param depth 0 = play layer .. 1 = horizon (adds haze + desaturation)
 */
export function lit(L: Lighting, mat: RGB, light: number, depth = 0): RGB {
  const sh = mul(mat, L.amb);
  const li = mul(mat, L.key);
  let c = mix(sh, li, light);
  if (depth > 0) {
    c = desat(c, depth * (0.25 + L.bgDesat * 0.5));
    c = mix(c, L.haze, Math.min(0.92, depth * L.hazeK));
  }
  if (L.parchment > 0) c = mix(c, engrave(c), L.parchment);
  return c;
}

/** Apply only haze/parchment to an already-coloured value (emissive / sky-reflecting things). */
export function atmos(L: Lighting, c: RGB, depth = 0): RGB {
  let o = c;
  if (depth > 0) o = mix(o, L.haze, Math.min(0.92, depth * L.hazeK));
  if (L.parchment > 0) o = mix(o, engrave(o), L.parchment);
  return o;
}
