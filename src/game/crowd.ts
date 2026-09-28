/**
 * The crowd (DESIGN §4 "choir"): the SKILL meter and the music reward (iteration 3: it measures how well
 * you play, not how much).
 *   Perfect +1 · Great +0.5 · Good 0 · Miss −2 · stumble −4 · death −6 (from the checkpoint's value) ·
 *   a complete on-grid Hup-Hup-HEY +3 · and it DECAYS (Tun.crowd.decayPerBeat, faster the fuller the house:
 *   decaySlope above decayKnee) while you're not feeding it.
 *   Wakes at 8 (Tun.crowd.start; iteration 4), floor 3, cap 24; the level caps it per section (`crowd`
 *   items → RuntimeLevel.crowdCaps; 10 intro … 24 chorus) so FULL HOUSE (≥ bigCatchAt) only happens in a
 *   chorus played near-clean — or on the chorus downbeat after a clean Hup-Hup-HEY (the drop, game.ts).
 *   A cap BELOW the meter (a new act's verse after a FULL HOUSE chorus) never clamps it: the excess glides
 *   down (Tun.crowd.capGlidePerBeat) and gains can't raise it meanwhile.
 * `value` is fractional; `count` (members on their feet, an integer) is what the stems/theatre use.
 * Hooks: `onChange(count)` (stems, audio/mix.ts), and Game re-emits every change as a `crowd` event
 * (game/events.ts) with `value`, `norm` (0..1) and `fullHouse`.
 */
import { Tun } from './tunables';

export class Crowd {
  /** fractional meter (the truth) */
  value = 0;
  /** members standing = floor(value + 1e-6) — the stems and the theatre use this */
  count = 0;
  peak = 0;
  /** before the cold-open wake-up the crowd is asleep (count 0, not drawn as followers) */
  awake = false;
  /** presentation pulse on gain (0..1) */
  flash = 0;
  /** last change of `count` (+n / -n) for a HUD pop */
  lastDelta = 0;
  onChange: ((count: number) => void) | null = null;
  /** every scored change + decay steps that drop a member (Game turns it into a `crowd` event) */
  onValue: ((value: number, delta: number) => void) | null = null;

  get bigCatch(): boolean {
    return this.count >= Tun.crowd.bigCatchAt;
  }

  /** normalised 0..1 over the whole meter (0 = empty house, 1 = max) */
  get norm(): number {
    return Math.min(1, this.value / Tun.crowd.max);
  }

  /** normalised loudness 0..1 for the shouts stem */
  get level(): number {
    return Math.min(1, this.count / Tun.crowd.fullAt);
  }

  wake(): void {
    this.awake = true;
    this.set(Tun.crowd.start);
  }

  /**
   * Section cap (level `crowd` items): gains can't pass it, so FULL HOUSE (bigCatchAt) is kept for the
   * chorus. Lowering it below the value does NOT clamp: the excess glides down in `decay` (iteration 4).
   */
  cap: number = Tun.crowd.max;

  setCap(cap: number): void {
    this.cap = cap;
  }

  /** a new run: asleep, empty, with the start section's cap */
  reset(cap: number): void {
    this.awake = false;
    this.count = 0;
    this.value = 0;
    this.peak = 0;
    this.cap = cap;
  }

  set(n: number, quiet = false): void {
    const C = Tun.crowd;
    // gains stop at the cap (or where the meter already is, above a lowered cap); losses always apply
    const hi = Math.max(this.cap, Math.min(n, this.value));
    const v = Math.max(this.awake ? C.min : 0, Math.min(C.max, hi, n));
    const dv = v - this.value;
    if (Math.abs(dv) < 1e-9) return;
    this.value = v;
    const c = Math.floor(v + 1e-6);
    this.lastDelta = c - this.count;
    if (c !== this.count) {
      this.count = c;
      this.peak = Math.max(this.peak, c);
      if (this.lastDelta > 0) this.flash = 1;
      this.onChange?.(c);
    }
    if (!quiet || this.lastDelta !== 0) this.onValue?.(v, dv);
  }

  add(n: number): void {
    this.set(this.value + n);
  }

  stumble(): void {
    this.add(-Tun.crowd.stumbleLoss);
  }

  /** the meter cools while nobody feeds it (called every sim step with the beats elapsed); above a lowered cap it glides down */
  decay(beats: number): void {
    if (beats <= 0) return;
    const C = Tun.crowd;
    let v = this.value;
    if (v > this.cap) v = Math.max(this.cap, v - C.capGlidePerBeat * beats);
    if (v > C.min) v -= (C.decayPerBeat + C.decaySlope * Math.max(0, v - C.decayKnee)) * beats;
    if (v !== this.value) this.set(v, true);
  }
}

/** Shouts-stem gain for a crowd count: -6 dB at 0 -> 0 dB at `fullAt`. */
export function shoutsGain(count: number): number {
  const k = Math.min(1, count / Tun.crowd.fullAt);
  return Math.pow(10, (-6 + 6 * k) / 20);
}
