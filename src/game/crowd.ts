/**
 * The crowd (DESIGN §4 "choir"): the streak meter AND the music reward.
 *   +1 member per Good-or-better action, +3 for a complete on-grid Hup-Hup-HEY, cap 24, floor 3
 *   (the three members woken in the cold open). A stumble costs 25%.
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

  set(n: number): void {
    const C = Tun.crowd;
    const v = Math.max(this.awake ? C.min : 0, Math.min(C.max, Math.round(n)));
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
