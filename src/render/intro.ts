/**
 * THE COLOUR REEL (iteration 7, review iter6 redesign of bars 1-8): the picture opens as a SILENT FILM — the street
 * graded sepia, the goon band standing idle — and on the record's first HEY (beat 15, the big pendulum = the marquee's
 * master switch) the frame FLOODS TO COLOUR: a Technicolor wipe (cyan / magenta / yellow fringes, the three strips of
 * the camera) races out from the struck target, a cream flash, the band starts playing.
 *
 *   colour.burstBeat(level)          the burst beat: a `setPiece` named colorOn / colourOn / colorBurst / colourBurst,
 *                                    else beat 15 when the level starts before it (the edit), else NaN (no sepia)
 *   colour.grade(ctx, wb, k)         screen space: the sepia grade over what is drawn so far (k = strength), with the
 *                                    colour hole growing from the burst origin after the burst
 *   colour.drawBurst(ctx, wb, b)     the wipe's fringes + the flash (after the scene, before the film pass)
 *   colour.vivid(ctx, wb, k)         after the burst: saturation pushed up, easing back to normal over 16 beats
 *   colour.bandOn(wb)                false before the burst: the band only mimes
 *
 * Slim (drawn after the grades) and the rewards stay in colour: the hero brings the colour. Deterministic in the world
 * beat (rewind-safe).
 */
import type { BeatInfo } from '../art/core/beat';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { RuntimeLevel } from '../level/build';

/** beats the wipe takes to cross the frame */
const WIPE_BEATS = 0.7;
const MAX_R = Math.hypot(VIEW_W, VIEW_H) + 300;
const SEPIA = '112,84,52';
/** beats the post-burst saturation push lasts */
export const VIVID_BEATS = 16;

export class ColourReel {
  private key: unknown = null;
  private beat = NaN;
  private origin: { x: number; y: number } | null = null;
  /** screen position of the burst origin this frame (set by the renderer) */
  ox = VIEW_W / 2;
  oy = VIEW_H / 2;

  burstBeat(L: RuntimeLevel): number {
    if (this.key !== L) {
      this.key = L;
      const sp = L.setPieces.find((s) => /^colou?r(On|Burst)$/i.test(s.name));
      this.beat = sp ? sp.beat : L.def.startBeat < 15 ? 15 : NaN;
      // the burst comes out of the struck target on that beat (the big pendulum), else out of Slim
      const pd = L.pendulums.find((p) => Math.abs(p.beat - this.beat) < 0.6);
      const bk = L.breakables.find((k) => Math.abs(k.beat - this.beat) < 0.6);
      this.origin = pd ? { x: pd.x, y: pd.y } : bk ? { x: bk.x, y: bk.y } : null;
    }
    return this.beat;
  }

  /** the world point the colour floods out of (null = the hero) */
  originWorld(): { x: number; y: number } | null {
    return this.origin;
  }

  /** 0..1 how far the wipe has gone (0 before the burst, 1 = full colour) */
  wipe(wb: number): number {
    if (Number.isNaN(this.beat)) return 1;
    return Math.max(0, Math.min(1, (wb - this.beat) / WIPE_BEATS));
  }

  bandOn(wb: number): boolean {
    return Number.isNaN(this.beat) || wb >= this.beat - 0.05;
  }

  /** the sepia grade (screen space) over what has been drawn: `k` = its strength */
  grade(g: CanvasRenderingContext2D, wb: number, k: number): void {
    const u = this.wipe(wb);
    if (u >= 1 || k <= 0) return;
    // the colour hole grows fast (ease-in: a gathering flood)
    const r = u <= 0 ? 0 : MAX_R * (u * u * (3 - 2 * u));
    g.save();
    g.globalCompositeOperation = 'color';
    if (r <= 0) {
      g.fillStyle = `rgba(${SEPIA},${k})`;
    } else {
      const gr = g.createRadialGradient(this.ox, this.oy, Math.max(0, r - 180), this.ox, this.oy, r);
      gr.addColorStop(0, `rgba(${SEPIA},0)`);
      gr.addColorStop(1, `rgba(${SEPIA},${k})`);
      g.fillStyle = gr;
    }
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    // silent-film flatness: a soft warm veil (lifted blacks) that goes with the colour
    g.globalCompositeOperation = 'source-over';
    if (r <= 0) {
      g.fillStyle = `rgba(214,190,150,${0.1 * k})`;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    g.restore();
  }

  /**
   * after the burst the world is MORE than normal colour for a while (a fresh print: saturation pushed toward full,
   * easing back over `VIVID_BEATS`) — the payoff has to read against the already-warm street
   */
  vivid(g: CanvasRenderingContext2D, wb: number, k: number): void {
    if (Number.isNaN(this.beat)) return;
    const d = wb - this.beat;
    if (d < 0 || d > VIVID_BEATS) return;
    const a = k * this.wipe(wb) * (1 - d / VIVID_BEATS);
    if (a < 0.01) return;
    g.save();
    g.globalCompositeOperation = 'saturation';
    g.fillStyle = `rgba(255,0,0,${a})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.restore();
  }

  /** the Technicolor fringes riding the wipe's front + the flash on the burst */
  drawBurst(g: CanvasRenderingContext2D, wb: number, b: BeatInfo): void {
    if (Number.isNaN(this.beat)) return;
    const d = wb - this.beat;
    if (d < 0 || d > WIPE_BEATS + 0.6) return;
    const u = Math.min(1, d / WIPE_BEATS);
    g.save();
    // the flash: cream, fast
    const fl = Math.max(0, 1 - d / 0.25);
    if (fl > 0) {
      g.fillStyle = `rgba(255,246,226,${0.55 * fl})`;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (u < 1) {
      const r = MAX_R * (u * u * (3 - 2 * u));
      g.globalCompositeOperation = 'lighter';
      const fringes: [string, number][] = [
        ['40,210,230', 0],
        ['240,60,170', 26],
        ['255,220,60', 52],
      ];
      for (const [c, off] of fringes) {
        const rr = r - off;
        if (rr <= 4) continue;
        g.strokeStyle = `rgba(${c},${0.55 * (1 - u * 0.6)})`;
        g.lineWidth = 22 + 30 * u;
        g.beginPath();
        g.arc(this.ox, this.oy, rr, 0, Math.PI * 2);
        g.stroke();
      }
      // sparkles thrown off the front
      g.fillStyle = 'rgba(255,240,200,0.9)';
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2 + i * 0.37;
        const rr = r + 30 + ((i * 53) % 90);
        const sz = 3 + (i % 3) * 2;
        g.fillRect(this.ox + Math.cos(a) * rr - sz / 2, this.oy + Math.sin(a) * rr - sz / 2, sz, sz);
      }
    }
    g.restore();
    void b;
  }
}
