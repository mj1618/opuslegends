/**
 * BEAT SPACE → WORLD X (iteration 9: the chorus SPEED-UP).
 *
 * The level is authored in beats. Until iteration 8 the world was x = beat × ppb; now the pixels per beat vary:
 * during a `speed` zone (the choruses) the hero covers `mul` × more ground per beat, so the music (which can't change:
 * it's the original recording) stays put while the GAME speeds up. The mapping is the integral
 *
 *     x(beat) = ∫ ppb · m(b) db        m = 1 outside the zones, `mul` inside,
 *
 * with a smoothstep ramp from 1 to `mul` over the `rampIn` beats BEFORE the zone's `from` (full speed ON the chorus
 * downbeat) and back over the `rampOut` beats after its `to`. Everything that turns a beat into a position uses it:
 * the builder's geometry, token arcs, entity placement, the music line, the Burn, the autoplay bot, the judge's
 * lag, the camera, the tools (slack / rubric / tokens). Jump physics stay in BEATS (airtime unchanged), so a jump
 * covers `mul` × more ground in the chorus and every gap / lift authored in beats keeps its timing (only the hero's
 * pixel-sized hitbox is a little smaller in beats: windows move by a few ms — slack.mjs measures them).
 *
 * Without zones x = beat × ppb exactly (bit-identical to the old mapping). Negative beats (count-ins) extrapolate.
 */
export interface SpeedZone {
  /** first beat at full speed (the chorus downbeat) */
  from: number;
  /** last beat at full speed (the ramp back starts here) */
  to: number;
  /** ppb multiplier at full speed (1.25 = 25 % more ground per beat) */
  mul: number;
  /** beats of ramp before `from` (default 1) */
  rampIn: number;
  /** beats of ramp after `to` (default 1) */
  rampOut: number;
}

/** smoothstep and its integral from 0 to u */
const S = (u: number) => u * u * (3 - 2 * u);
const SI = (u: number) => u * u * u - (u * u * u * u) / 2;

interface Seg {
  /** beat range [b0, b1) */
  b0: number;
  b1: number;
  /** x at b0 */
  x0: number;
  /** multiplier at b0 / b1; kind 'flat' (m0 = m1) or 'ramp' (smoothstep m0 → m1) */
  m0: number;
  m1: number;
  ramp: boolean;
}

export class BeatX {
  readonly ppb: number;
  readonly zones: readonly SpeedZone[];
  private segs: Seg[] = [];

  constructor(ppb: number, zones: SpeedZone[] = []) {
    this.ppb = ppb;
    this.zones = [...zones].sort((a, b) => a.from - b.from);
    // breakpoints: [from - rampIn, from, to, to + rampOut] per zone (zones must not overlap, ramps included)
    let x = 0;
    let b = 0;
    const segs: Seg[] = [];
    const push = (b1: number, m0: number, m1: number, ramp: boolean) => {
      if (b1 <= b + 1e-9) return;
      segs.push({ b0: b, b1, x0: x, m0, m1, ramp });
      x += this.ppb * (b1 - b) * (ramp ? m0 + (m1 - m0) * SI(1) : m0);
      b = b1;
    };
    for (const z of this.zones) {
      const a0 = z.from - z.rampIn;
      if (a0 < b - 1e-9) throw new Error(`speed zones overlap at beat ${z.from}`);
      if (a0 < 0) throw new Error(`speed zone ramp before beat 0 (${z.from})`);
      push(a0, 1, 1, false);
      push(z.from, 1, z.mul, true);
      push(z.to, z.mul, z.mul, false);
      push(z.to + z.rampOut, z.mul, 1, true);
    }
    push(Infinity, 1, 1, false);
    this.segs = segs;
  }

  private seg(beat: number): Seg {
    const s = this.segs;
    if (beat < s[0].b1 || s.length === 1) return s[0];
    let lo = 0;
    let hi = s.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s[mid].b0 <= beat) lo = mid;
      else hi = mid - 1;
    }
    return s[lo];
  }

  /** ppb multiplier at `beat` (1 = normal speed) */
  mulAt(beat: number): number {
    const g = this.seg(beat);
    if (!g.ramp) return g.m0;
    const u = Math.min(1, Math.max(0, (beat - g.b0) / (g.b1 - g.b0)));
    return g.m0 + (g.m1 - g.m0) * S(u);
  }

  /** world px per beat at `beat` (the hero's run speed there = ppbAt × BPM / 60) */
  ppbAt(beat: number): number {
    return this.ppb * this.mulAt(beat);
  }

  /** world x of `beat` */
  x(beat: number): number {
    const g = this.seg(beat);
    if (!g.ramp) return g.x0 + this.ppb * g.m0 * (beat - g.b0);
    const w = g.b1 - g.b0;
    const u = Math.min(1, Math.max(0, (beat - g.b0) / w));
    return g.x0 + this.ppb * w * (g.m0 * u + (g.m1 - g.m0) * SI(u));
  }

  /** beat at world x (the inverse of x()) */
  beat(x: number): number {
    const s = this.segs;
    let lo = 0;
    let hi = s.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s[mid].x0 <= x) lo = mid;
      else hi = mid - 1;
    }
    const g = s[lo];
    if (!g.ramp) return g.b0 + (x - g.x0) / (this.ppb * g.m0);
    // Newton on the ramp (monotonic, m ≥ min(m0, m1) > 0)
    let b = g.b0 + (x - g.x0) / (this.ppb * Math.min(g.m0, g.m1));
    b = Math.min(g.b1, Math.max(g.b0, b));
    for (let i = 0; i < 8; i++) {
      const err = this.x(b) - x;
      if (Math.abs(err) < 1e-7) break;
      b -= err / this.ppbAt(b);
      b = Math.min(g.b1, Math.max(g.b0, b));
    }
    return b;
  }

  /** world px between two beats */
  dx(b0: number, b1: number): number {
    return this.x(b1) - this.x(b0);
  }

  /**
   * 0..1 how far into a speed zone `beat` is (0 outside, ramps with the speed) — the CHORUS state for audio / art:
   * (mul(beat) − 1) / (zone.mul − 1)
   */
  chorusK(beat: number): number {
    for (const z of this.zones) {
      if (beat < z.from - z.rampIn) return 0;
      if (beat <= z.to + z.rampOut) return z.mul === 1 ? (beat >= z.from && beat <= z.to ? 1 : 0) : (this.mulAt(beat) - 1) / (z.mul - 1);
    }
    return 0;
  }

  /** the zone covering `beat` at full speed or in its ramps (null outside) */
  zoneAt(beat: number): SpeedZone | null {
    for (const z of this.zones) if (beat >= z.from - z.rampIn && beat <= z.to + z.rampOut) return z;
    return null;
  }
}
