/**
 * The crowd (DESIGN §4 "choir"): the SKILL meter and the music reward (iteration 3: it measures how well
 * you play, not how much).
 *   Perfect +1 · Great +0.5 · Good 0 · Miss −2 · stumble −4 · death −6 (from the checkpoint's value) ·
 *   a complete on-grid Hup-Hup-HEY +3 · and it DECAYS (Tun.crowd.decayPerBeat) while you're not feeding it.
 *   Floor 3 (the three members woken in the cold open), cap 24; the level caps it per section (`crowd`
 *   items → RuntimeLevel.crowdCaps; 10 intro … 24 chorus) so FULL HOUSE (≥ bigCatchAt) only happens in a
 *   chorus played near-clean.
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
   * Section cap (level `crowd` items): the meter can't pass it, so FULL HOUSE (bigCatchAt) is kept
   * for the chorus. Lowering it below the value pulls the value down with it.
   */
  cap: number = Tun.crowd.max;

  setCap(cap: number): void {
    if (cap === this.cap) return;
    this.cap = cap;
    if (this.value > cap) this.set(cap);
  }

  set(n: number, quiet = false): void {
    const C = Tun.crowd;
    const v = Math.max(this.awake ? C.min : 0, Math.min(C.max, this.cap, n));
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

  /** the meter cools while nobody feeds it (called every sim step with the beats elapsed) */
  decay(beats: number): void {
    if (beats > 0 && this.value > Tun.crowd.min) this.set(this.value - Tun.crowd.decayPerBeat * beats, true);
  }
}

/** Shouts-stem gain for a crowd count: -6 dB at 0 -> 0 dB at `fullAt`. */
export function shoutsGain(count: number): number {
  const k = Math.min(1, count / Tun.crowd.fullAt);
  return Math.pow(10, (-6 + 6 * k) / 20);
}
