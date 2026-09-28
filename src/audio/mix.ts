/**
 * Music mix levels: how the reward stems follow the crowd (streak) meter.
 *
 * The record plays at unity (0 dB) on the music bus. Each overlay stem's gain is a piecewise-linear
 * curve in dB over the crowd count (0..24; the cold open wakes 3, BIG CATCH at 20). At stem gain
 * 1.0 the edit's overlays sit under the record in the choruses by: shouts -7 dB, stomps(+claps) -9 dB,
 * cowbell -14 dB (beatmap audio.overlayCalibration), so "full" is still a layer, never a takeover.
 *
 *   shouts   the gang HEY!/HUP!s: always there, -6 dB at 0 -> full at 12
 *   stomps   stomps + hand claps join once the crowd is on its feet: silent <= 3, -12 dB at 4 -> full at 12
 *   cowbell  the hot streak: silent < 12, -8 dB at 12 -> full at BIG CATCH (20)
 *   bonus    placeholder song only: organ + harmony lead at BIG CATCH
 *
 * Stems not in the table stay at their SongDef.stemGains value.
 */

/** [crowd count, gain dB] points; -Infinity = silent. Below the first / above the last point: clamped. */
type Curve = [number, number][];

interface OverlayRule {
  curve: Curve;
  /** gain ramp time in beats (slow for layers that should swell in) */
  rampBeats: number;
}

export const OVERLAY_RULES: Record<string, OverlayRule> = {
  shouts: { curve: [[0, -6], [12, 0]], rampBeats: 0.75 },
  stomps: { curve: [[3, -Infinity], [4, -12], [12, 0]], rampBeats: 1 },
  cowbell: { curve: [[11, -Infinity], [12, -8], [20, 0]], rampBeats: 4 },
  bonus: { curve: [[19, -Infinity], [20, 0]], rampBeats: 4 },
};

export const dbToGain = (db: number): number => (db === -Infinity ? 0 : Math.pow(10, db / 20));

function curveDb(c: Curve, x: number): number {
  if (x <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) {
    const [x1, y1] = c[i];
    if (x <= x1) {
      const [x0, y0] = c[i - 1];
      if (y0 === -Infinity) return x >= x1 ? y1 : -Infinity;
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return c[c.length - 1][1];
}

/** Linear gain of an overlay stem at a crowd count (undefined = not an overlay stem). */
export function overlayGain(stem: string, crowd: number): number | undefined {
  const r = OVERLAY_RULES[stem];
  return r ? dbToGain(curveDb(r.curve, crowd)) : undefined;
}

/**
 * Master bus levels (measured, see iteration-2 engine notes in CLAUDE.md):
 *   - the record (edit) is mastered hot: -10.5 LUFS, 100 ms RMS median -14 dBFS, true peaks +0.75 dBFS
 *     (it clips on its own), so it plays at unity into the master soft limiter;
 *   - synth SFX at unity: strike/lum/land/thwack ~-26 dBFS RMS(100 ms), hop -34, peaks -9..-18 dBFS.
 *     At +6 dB the gameplay SFX sit ~6 dB under the record (strike/lum ~-20, hop ~-28 "low in the
 *     mix"), reward sounds (chime, roar) come up close to it;
 *   - limiter: threshold just under 0 dBFS so it only catches peaks; its makeup gain is trimmed
 *     away (AudioSystem.calibrate), so below the threshold everything is at unity.
 */
export const MIX = {
  /** music bus (record + overlay stems), linear */
  music: 1.0,
  /** SFX bus, linear (+6 dB) */
  sfx: 2.0,
  /** soft limiter on the master (DynamicsCompressorNode): threshold/knee dB, ratio, attack/release s */
  limiter: { threshold: -2.5, knee: 2, ratio: 20, attack: 0.002, release: 0.1 },
} as const;
