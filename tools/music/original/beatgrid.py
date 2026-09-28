"""Per-beat grid of a live recording (no click): track, then lock every beat to the drummer's actual hit.

1. librosa beat tracking on the demucs drum stem gives a coarse grid (tempo prior 164 BPM, high tightness).
2. The grid is numbered from a known anchor (song bar 1 beat 1, from the transcription) and extended to cover
   the whole song.
3. Each beat is refined on the drum stem: kick band (< 150 Hz) on beats 1/3, snare band (1.5-6 kHz) on 2/4, with
   the other band as a fallback. The onset is where the 1 ms envelope first reaches 30 % of the way from the
   local floor to the hit's peak (the same "perceptual attack" rule as the engine's analyzeBeatAlignment).
4. Hits that disagree with a local linear fit of their neighbours by more than 15 ms (fills, flams, missed hits)
   are replaced by the fit.
"""
from __future__ import annotations

import numpy as np
from scipy import signal


def band_env(x, sr, kind, smooth_ms=1.0):
    if kind == "kick":
        sos = signal.butter(4, 150, "low", fs=sr, output="sos")
    elif kind == "snare":
        sos = signal.butter(4, [1500, 6000], "band", fs=sr, output="sos")
    else:
        sos = signal.butter(2, 60, "high", fs=sr, output="sos")
    y = signal.sosfiltfilt(sos, x)
    env = np.abs(signal.hilbert(y))
    k = max(1, int(smooth_ms * 1e-3 * sr))
    return np.convolve(env, np.ones(k) / k, mode="same")


def attack_near(env, sr, t, win=0.05, frac=0.3, pre=0.04):
    """Onset of the strongest hit within +-win of t. Returns (onset_time, peak, contrast_db) or None."""
    a, b = int((t - win) * sr), int((t + win) * sr)
    if a - int(pre * sr) < 0 or b >= len(env):
        return None
    seg = env[a:b]
    p = a + int(np.argmax(seg))
    peak = float(env[p])
    lo = p - int(pre * sr)
    floor_i = lo + int(np.argmin(env[lo:p])) if p > lo else p
    floor = float(env[floor_i])
    thr = floor + frac * (peak - floor)
    k = floor_i + int(np.nonzero(env[floor_i:p + 1] >= thr)[0][0])
    return k / sr, peak, 20 * np.log10((peak + 1e-12) / (floor + 1e-12))


def local_fit(idx, times, i, half=4):
    sel = [j for j in range(max(0, i - half), min(len(times), i + half + 1)) if j != i and np.isfinite(times[j])]
    if len(sel) < 3:
        return np.nan
    xs = np.array([idx[j] for j in sel], float)
    ys = np.array([times[j] for j in sel])
    A = np.stack([xs, np.ones_like(xs)], 1)
    m, c = np.linalg.lstsq(A, ys, rcond=None)[0]
    return m * idx[i] + c


def build_grid(drums, sr, anchor_t, n_beats, coarse, tol=0.02, min_contrast_db=6.0, half=2):
    """drums: mono drum stem; anchor_t: time of beat 0; n_beats: beats to produce; coarse: tracked beat times.

    Hits are measured on the broadband (> 60 Hz) drum envelope: a 70s kick's low band peaks 30-50 ms after its
    beater attack, so band-limited envelopes mis-time it. The drummer plays a laid-back backbeat (snare a few ms
    late, kick a few ms early vs an even grid); a hit-locked grid would make the per-beat tempo alternate by
    ~3 %. The returned grid is therefore a robust local linear fit (+-`half` beats, both parities) through the
    hits: smooth tempo, every beat within a few ms of its hit. `hits` keeps the exact hit times.
    Returns dict: times (grid), hits (nan where no clean hit), prior, contrast, fit residual (hit - grid)."""
    env = band_env(drums, sr, "broad")
    spb0 = float(np.median(np.diff(coarse)))
    d = np.diff(coarse)
    if d.min() < 0.8 * spb0 or d.max() > 1.25 * spb0:
        raise ValueError("coarse beats have gaps/doubles; fix the tracker before numbering them")
    # number the tracked beats consecutively from the anchor (a constant-tempo index estimate would drift
    # by beats over the band's ~3 % push)
    first = int(round((coarse[0] - anchor_t) / float(np.median(d[:8]))))
    prior = np.full(n_beats, np.nan)
    prior[0] = anchor_t
    for j, t in enumerate(coarse):
        if 0 <= first + j < n_beats:
            prior[first + j] = t
    known = np.nonzero(np.isfinite(prior))[0]
    prior = np.interp(np.arange(n_beats), known, prior[known], left=np.nan, right=np.nan)
    last = known[-1]
    tail_spb = float(np.median(np.diff(prior[max(0, last - 16):last + 1])))
    for i in range(last + 1, n_beats):
        prior[i] = prior[last] + (i - last) * tail_spb
    # lock to hits: strongest broadband attack within +-45 ms, onset at 30 % of the rise
    hits = np.full(n_beats, np.nan)
    con = np.zeros(n_beats)
    for i in range(n_beats):
        r = attack_near(env, sr, prior[i], win=0.045, pre=0.06)
        if r is not None and r[2] >= min_contrast_db:
            hits[i] = r[0]
            con[i] = r[2]
    # robust smooth grid: iterative local fits, dropping hits > tol from the fit (fills, flams, pushes)
    idx = np.arange(n_beats)
    use = hits.copy()
    for _ in range(3):
        fit = np.array([local_fit(idx, use, i, half) if np.isfinite(hits[i]) or True else np.nan for i in range(n_beats)])
        # local_fit excludes beat i itself; include it by averaging with the leave-one-out fit
        bad = np.isfinite(use) & np.isfinite(fit) & (np.abs(use - fit) > tol)
        use[bad] = np.nan
    grid = np.array([_fit_incl(idx, use, i, half) for i in range(n_beats)])
    grid = np.where(np.isfinite(grid), grid, prior)
    for i in range(1, n_beats):
        if grid[i] <= grid[i - 1] + 0.2:
            grid[i] = grid[i - 1] + spb0
    return {"times": grid, "hits": hits, "used": np.isfinite(use), "prior": prior, "contrast": con,
            "residual": hits - grid}


def _fit_incl(idx, times, i, half):
    sel = [j for j in range(max(0, i - half), min(len(times), i + half + 1)) if np.isfinite(times[j])]
    if len(sel) < 3:
        return np.nan
    xs = np.array([idx[j] for j in sel], float)
    ys = np.array([times[j] for j in sel])
    A = np.stack([xs, np.ones_like(xs)], 1)
    m, c = np.linalg.lstsq(A, ys, rcond=None)[0]
    return m * idx[i] + c


def swing_ratio(x, sr, beats, lo=0.55, hi=0.8, min_contrast_db=6.0):
    """Off-beat 8th position per beat: strongest onset (broadband) between lo..hi of the beat interval."""
    env = band_env(x, sr, "broad")
    out = np.full(len(beats) - 1, np.nan)
    for i in range(len(beats) - 1):
        a, b = beats[i], beats[i + 1]
        d = b - a
        c = a + 0.5 * (lo + hi) * d
        r = attack_near(env, sr, c, win=0.5 * (hi - lo) * d)
        if r is not None and r[2] >= min_contrast_db:
            out[i] = (r[0] - a) / d
    return out
