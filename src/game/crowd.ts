/**
 * The crowd (DESIGN §4 "choir"): the streak meter AND the music reward.
 *   +1 member per Good-or-better action, +3 for a complete on-grid Hup-Hup-HEY, cap 24, floor 3
 *   (the three members woken in the cold open). A stumble costs 25%, a missed target 1.
 *   The level caps it per section (`crowd` items → RuntimeLevel.crowdCaps; e.g. 10 intro, 16 verse,
 *   19 pre-chorus, 24 chorus) so FULL HOUSE only happens in the chorus.
 * Music hook: `onChange` fires with the new count; Game maps it to stem gains
 * (shouts -6 dB at 0 -> full at >= 12; BIG CATCH bonus stem at >= 20).
 * Presentation: the theatre audience at the bottom of the frame — `count` of them are on their feet.
 */
import { Tun } from './tunables';

export class Crowd {
  count = 0;
  peak = 0;
  /** before the cold-open wake-up the crowd is asleep (count 0, not drawn as followers) */
  awake = false;
  /** presentation pulse on gain (0..1) */
  flash = 0;
  /** last change (+n / -n) for a HUD pop */
  lastDelta = 0;
  onChange: ((count: number) => void) | null = null;

  get bigCatch(): boolean {
    return this.count >= Tun.crowd.bigCatchAt;
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
   * for the chorus. Lowering it below the count pulls the count down with it.
   */
  cap: number = Tun.crowd.max;

  setCap(cap: number): void {
    if (cap === this.cap) return;
    this.cap = cap;
    if (this.count > cap) this.set(cap);
  }

  set(n: number): void {
    const C = Tun.crowd;
    const v = Math.max(this.awake ? C.min : 0, Math.min(C.max, this.cap, Math.round(n)));
    this.lastDelta = v - this.count;
    if (v !== this.count) {
      this.count = v;
      this.peak = Math.max(this.peak, v);
      if (this.lastDelta > 0) this.flash = 1;
      this.onChange?.(v);
    }
  }

  add(n: number): void {
    this.set(this.count + n);
  }

  stumble(): void {
    this.set(Math.floor(this.count * (1 - Tun.crowd.stumbleLoss)));
  }
}

/** Shouts-stem gain for a crowd count: -6 dB at 0 -> 0 dB at `fullAt`. */
export function shoutsGain(count: number): number {
  const k = Math.min(1, count / Tun.crowd.fullAt);
  return Math.pow(10, (-6 + 6 * k) / 20);
}
