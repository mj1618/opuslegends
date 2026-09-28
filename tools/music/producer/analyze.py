"""Objective mix analysis ('ears' for an agent that can't listen).

Reports loudness (own BS.1770 + ffmpeg ebur128 cross-check), peaks/clipping, crest factor /
PLR / PSR, octave-band balance vs. an approximate rock-master reference, per-band stereo
correlation, per-stem band dominance (masking), beat-map onset alignment per lane, kick
transient punch in the master, tail/DC sanity, and writes a log-frequency spectrogram PNG.
"""
from __future__ import annotations

import json
import math
import re
import subprocess

import numpy as np
from scipy import signal

from . import dsp, loudness

OCT_CENTERS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
# Approximate long-term octave-band power of loud rock masters, dB relative to the loudest band.
# Synthesised from published LTAS studies (Pestana et al. 2013, AES 135) and common "rock" tonal
# balance targets. Treat as a +-4 dB corridor, not gospel.
ROCK_REF = [-9, -2, -1, -5, -8, -10, -12.5, -15.5, -19.5, -30]


def octave_bands(x, sr):
    m = x.mean(axis=0) if x.ndim == 2 else x
    f, p = signal.welch(m, sr, nperseg=16384)
    out = []
    for c in OCT_CENTERS:
        lo, hi = c / math.sqrt(2), min(c * math.sqrt(2), sr / 2)
        sel = (f >= lo) & (f < hi)
        out.append(float(np.sum(p[sel])) if np.any(sel) else 1e-20)
    db = 10 * np.log10(np.maximum(np.array(out), 1e-20))
    return db


def band_correlation(x, sr):
    res = {}
    for name, lo, hi in [("sub<120", 20, 120), ("low-mid 120-1k", 120, 1000), ("mid 1k-5k", 1000, 5000), ("high>5k", 5000, 20000)]:
        s = signal.butter(4, [lo, min(hi, sr * 0.45)], btype="band", fs=sr, output="sos")
        y = signal.sosfilt(s, x, axis=-1)
        l, r = y[0], y[1]
        den = math.sqrt(float(np.sum(l * l) * np.sum(r * r))) + 1e-20
        res[name] = round(float(np.sum(l * r)) / den, 3)
    return res


def onset_errors(stem, sr, samples, window_ms=25.0, frac=0.3):
    """For each expected onset sample s, return the audible-onset error in ms (+ = audio late).
    Envelope = Hilbert magnitude smoothed 0.5 ms (no ripple on kick/bass lows). Background =
    minimum envelope in [s-window, s-1ms] (tail of earlier notes / a shout's /h/ pre-roll);
    peak = max from there to s+window; onset = first sample after the minimum where the envelope
    crosses background + frac*(peak-background). Meant for isolated lane renders."""
    m = stem.mean(axis=0) if stem.ndim == 2 else stem
    w = int(window_ms * 1e-3 * sr)
    pad = int(0.03 * sr)
    sm = max(1, int(0.0005 * sr))
    one = int(0.001 * sr)
    errs = []
    for s in samples:
        a, b = s - w - pad, s + w + pad
        if a < 0 or b >= len(m):
            continue
        env = np.abs(signal.hilbert(m[a:b]))
        env = np.convolve(env, np.ones(sm) / sm, mode="same")
        i0 = pad  # = s - w
        iS = pad + w  # = s
        ib = i0 + int(np.argmin(env[i0:iS - one]))
        bg = float(env[ib])
        pk = float(np.max(env[ib:iS + w]))
        if pk <= bg * 1.05:
            continue
        thr = bg + frac * (pk - bg)
        above = np.nonzero(env[ib:iS + w] >= thr)[0]
        if len(above) == 0:
            continue
        onset = a + ib + int(above[0])
        errs.append((onset - s) / sr * 1000)
    return np.array(errs)


def engine_beat_alignment(x, sr, samples, window_s=0.06):
    """Port of src/audio/song.ts analyzeBeatAlignment (first-difference energy, 1.5 ms windows,
    loudest transient within +-60 ms, walk back to 30% of peak). Heuristic: assumes the loudest
    transient near each beat is on the beat, so off-beat accents can pull it."""
    d = x[0] if x.ndim == 2 else x
    lp = np.diff(d, prepend=d[0]) ** 2
    c = np.concatenate([[0.0], np.cumsum(lp)])
    hop = 8
    win = max(8, round(sr * 0.0015))
    errs = []
    for s0 in samples:
        a = int(s0 - window_s * sr)
        b = int(s0 + window_s * sr)
        if a < 0 or b + win >= len(d):
            continue
        idx = np.arange(a, b + 1, hop)
        env = c[idx + win] - c[idx]
        k = int(np.argmax(env))
        peak = env[k]
        while k > 0 and env[k - 1] > peak * 0.3:
            k -= 1
        onset = (a + k * hop + win * 0.7)
        errs.append((onset - s0) / sr * 1000)
    return np.array(errs)


def isolated_lane_alignment(score, min_vel=0.5, max_events=24, frac=0.5):
    """Validate that every lane's sounds start where the beat map says: re-render sampled events
    of each lane ONE AT A TIME (same instrument/params, no overlap with other notes) and measure
    where the Hilbert envelope first reaches `frac` of its peak (50% ~ perceptual attack; for a
    shout this is the vowel, not the quiet /h/). + = audio late."""
    from dataclasses import replace
    from .beatmap import lane_events
    groups: dict = {}
    for lane, name, ev, extra in lane_events(score):
        if ev.vel >= min_vel and lane not in ("crowd", "stops"):
            groups.setdefault((lane, name), []).append(ev)
    sr = score.sr
    at = int(0.15 * sr)
    n = int(0.6 * sr)
    res = {}
    for (lane, name), evs in groups.items():
        tr = score.tracks[name]
        pick = [evs[int(i)] for i in np.linspace(0, len(evs) - 1, min(max_events, len(evs)))]
        errs = []
        for ev in pick:
            e1 = replace(ev, start=at, params=dict(ev.params))
            y = tr.instrument.render([e1], n, sr, np.random.default_rng(tr.seed), tr)
            m = y.mean(axis=0) if y.ndim == 2 else y
            env = np.abs(signal.hilbert(m))
            sm = max(1, int(0.0005 * sr))
            env = np.convolve(env, np.ones(sm) / sm, mode="same")
            seg = env[: at + int(0.1 * sr)]
            pk = float(np.max(seg))
            if pk <= 0:
                continue
            onset = int(np.nonzero(seg >= frac * pk)[0][0])
            errs.append((onset - at) / sr * 1000)
        if errs:
            errs = np.array(errs)
            key = lane if lane not in res else f"{lane}:{name}"
            res[key] = {"n": int(len(errs)), "median_ms": round(float(np.median(errs)), 2),
                        "p90_abs_ms": round(float(np.percentile(np.abs(errs), 90)), 2),
                        "max_abs_ms": round(float(np.max(np.abs(errs))), 2), "track": name}
    return res


def kick_punch(x, sr, samples):
    """dB rise of the 5 ms peak after each kick over the 20 ms before it (bigger = punchier)."""
    m = np.abs(x).max(axis=0) if x.ndim == 2 else np.abs(x)
    vals = []
    for s in samples:
        a = s - int(0.02 * sr)
        if a < 0 or s + int(0.01 * sr) >= len(m):
            continue
        before = np.sqrt(np.mean(m[a:s - int(0.002 * sr)] ** 2)) + 1e-9
        after = np.max(m[s:s + int(0.006 * sr)]) + 1e-9
        vals.append(20 * math.log10(after / before))
    return float(np.median(vals)) if vals else float("nan")


def ffmpeg_ebur128(path):
    try:
        p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-filter_complex", "ebur128=peak=true",
                            "-f", "null", "-"], capture_output=True, text=True, timeout=300)
        txt = p.stderr[p.stderr.rfind("Summary:"):]
        g = lambda pat: float(re.search(pat, txt).group(1))
        return {"I": g(r"I:\s+(-?[\d.]+) LUFS"), "LRA": g(r"LRA:\s+(-?[\d.]+) LU"), "truePeak": g(r"Peak:\s+(-?[\d.]+) dBFS")}
    except Exception as e:  # pragma: no cover
        return {"error": str(e)}


def spectrogram_png(x, sr, path, title_rows=None, height=260, width=1400, stems=None):
    """Log-frequency spectrogram (30 Hz - 20 kHz) of the master (+ optional stems stacked), dB colour."""
    from PIL import Image, ImageDraw

    def spec_img(sig, h):
        m = sig.mean(axis=0) if sig.ndim == 2 else sig
        f, t, Z = signal.stft(m, sr, nperseg=4096, noverlap=4096 - 512)
        P = 20 * np.log10(np.abs(Z) + 1e-9)
        logf = np.geomspace(30, 20000, h)
        rows = np.array([np.interp(lf, f, np.arange(len(f))) for lf in logf]).astype(int)
        img = P[rows][::-1]
        cols = np.linspace(0, img.shape[1] - 1, width).astype(int)
        img = img[:, cols]
        top = np.percentile(img, 99.7)
        v = np.clip((img - (top - 80)) / 80, 0, 1)
        # simple 'magma-ish' colormap
        r = np.clip(1.6 * v, 0, 1)
        g = np.clip(1.6 * v - 0.6, 0, 1)
        b = np.clip(0.6 * np.sin(np.pi * v) + np.clip(2 * v - 1.6, 0, 1), 0, 1)
        return (np.stack([r, g, b], -1) * 255).astype(np.uint8)

    blocks = [("master", x)] + list((stems or {}).items())
    hs = [height] + [110] * (len(blocks) - 1)
    total_h = sum(hs) + 16 * len(blocks)
    canvas = Image.new("RGB", (width + 60, total_h), (10, 10, 14))
    dr = ImageDraw.Draw(canvas)
    y0 = 0
    for (name, sig), h in zip(blocks, hs):
        dr.text((4, y0 + 2), name, fill=(220, 220, 220))
        im = Image.fromarray(spec_img(sig, h))
        canvas.paste(im, (60, y0 + 14))
        for fr in (100, 1000, 10000):
            yy = y0 + 14 + int((1 - math.log(fr / 30) / math.log(20000 / 30)) * (h - 1))
            dr.text((4, yy - 5), f"{fr // 1000}k" if fr >= 1000 else f"{fr}", fill=(160, 160, 160))
            dr.line([(52, yy), (58, yy)], fill=(160, 160, 160))
        y0 += h + 16
    canvas.save(path)


def analyze(master, sr, stems, beatmap, master_wav_path=None, png_path=None, premaster=None, lane_align=None, tracks=None):
    rep: dict = {}
    L = loudness.integrated_lufs(master, sr)
    tp = loudness.true_peak_db(master)
    sp = loudness.sample_peak_db(master)
    rms_db = 20 * math.log10(math.sqrt(float(np.mean(master ** 2))) + 1e-12)
    st = loudness.short_term_lufs(master, sr)
    st_valid = st[st > -60]
    rep["loudness"] = {
        "integrated_lufs": round(L, 2), "true_peak_dbtp": round(tp, 2), "sample_peak_dbfs": round(sp, 2),
        "short_term_max_lufs": round(float(np.max(st_valid)), 2) if len(st_valid) else None,
        "short_term_range_lu_p10_p95": round(float(np.percentile(st_valid, 95) - np.percentile(st_valid, 10)), 2) if len(st_valid) else None,
        "PLR_db": round(tp - L, 2), "crest_factor_db": round(sp - rms_db, 2),
    }
    if master_wav_path:
        rep["loudness"]["ffmpeg_ebur128"] = ffmpeg_ebur128(master_wav_path)
    rep["clipping"] = {"samples_over_-0.1dBFS": int(np.sum(np.abs(master) > dsp.db2lin(-0.1))),
                       "dc_offset": [round(float(np.mean(master[c])), 6) for c in range(2)]}
    # per-section loudness
    secs = {}
    for s in beatmap["sections"]:
        a = int((s["t0"] + beatmap["song"]["audioOffset"]) * sr)
        b = int((s["t1"] + beatmap["song"]["audioOffset"]) * sr)
        seg = master[:, a:b]
        if seg.shape[1] > sr * 0.5:
            secs[s["name"]] = round(loudness.integrated_lufs(seg, sr), 1)
    rep["section_lufs"] = secs
    # spectrum
    ob = octave_bands(master, sr)
    rel = ob - ob.max()
    dev = rel - np.array(ROCK_REF)
    rep["octave_balance"] = {f"{c:g}": {"rel_db": round(float(r), 1), "ref_db": ref, "dev_db": round(float(d), 1)}
                             for c, r, ref, d in zip(OCT_CENTERS, rel, ROCK_REF, dev)}
    spec_flags = [f"{c:g} Hz {'+' if d > 0 else ''}{d:.1f} dB vs ref" for c, d in zip(OCT_CENTERS, dev) if abs(d) > 4]
    # stereo
    l, r = master[0], master[1]
    mid = 0.5 * (l + r)
    side = 0.5 * (l - r)
    rep["stereo"] = {"correlation": round(float(np.corrcoef(l, r)[0, 1]), 3),
                     "side_to_mid_db": round(10 * math.log10((np.mean(side ** 2) + 1e-20) / (np.mean(mid ** 2) + 1e-20)), 1),
                     "band_correlation": band_correlation(master, sr)}
    # stem band dominance
    dom = {}
    stem_bands = {k: octave_bands(v, sr) for k, v in stems.items()}
    for i, c in enumerate(OCT_CENTERS):
        tot = sum(10 ** (sb[i] / 10) for sb in stem_bands.values())
        dom[f"{c:g}"] = {k: round(100 * 10 ** (sb[i] / 10) / tot, 1) for k, sb in stem_bands.items()}
    rep["stem_band_share_pct"] = dom
    if tracks:
        tb = {k: octave_bands(v.astype(np.float64), sr) for k, v in tracks.items()}
        rep["track_band_share_pct"] = {}
        for i, c in enumerate(OCT_CENTERS):
            tot = sum(10 ** (x[i] / 10) for x in tb.values())
            rep["track_band_share_pct"][f"{c:g}"] = {k: round(100 * 10 ** (x[i] / 10) / tot, 1) for k, x in tb.items()}
    rep["stem_lufs"] = {k: round(loudness.integrated_lufs(v, sr), 1) for k, v in stems.items()}
    # beat-map alignment per lane: each lane re-rendered in isolation (see isolated_lane_alignment)
    align = dict(lane_align or {})
    if "kick" in beatmap["lanes"]:
        ks = [e["sample"] for e in beatmap["lanes"]["kick"] if e.get("vel", 1) >= 0.5]
        rep["kick_punch_db"] = {"master": round(kick_punch(master, sr, ks), 1)}
        if premaster is not None:
            rep["kick_punch_db"]["premaster"] = round(kick_punch(premaster, sr, ks), 1)
    # the game's own debug check (src/audio/song.ts analyzeBeatAlignment), ported: every beat vs. master
    bs = [b["sample"] for b in beatmap["beats"]]
    ea = engine_beat_alignment(master, sr, bs)
    if len(ea):
        align["engine_check@master"] = {"n": int(len(ea)), "meanMs": round(float(np.mean(ea)), 2),
                                        "meanAbsMs": round(float(np.mean(np.abs(ea))), 2),
                                        "maxAbsMs": round(float(np.max(np.abs(ea))), 2)}
    rep["beat_alignment"] = align
    # tail + aliasing sanity
    tail = master[:, -int(0.05 * sr):]
    rep["tail_rms_dbfs"] = round(20 * math.log10(math.sqrt(float(np.mean(tail ** 2))) + 1e-12), 1)
    head = master[:, : int(beatmap["song"]["audioOffset"] * sr * 0.8)]
    rep["preroll_peak_dbfs"] = round(loudness.sample_peak_db(head), 1) if head.size else None
    if "guitars" in stems:
        g = stems["guitars"]
        f, p = signal.welch(g.mean(axis=0), sr, nperseg=8192)
        rep["guitars_energy_above_12k_db"] = round(10 * math.log10(np.sum(p[f > 12000]) / np.sum(p) + 1e-20), 1)
    flags = []
    lo = rep["loudness"]
    if abs(lo["integrated_lufs"] + 14) > 0.5:
        flags.append(f"loudness {lo['integrated_lufs']} LUFS (target -14)")
    if lo["true_peak_dbtp"] > -0.9:
        flags.append(f"true peak {lo['true_peak_dbtp']} dBTP > -1")
    if lo["PLR_db"] < 8:
        flags.append(f"PLR {lo['PLR_db']} dB: over-limited (rock masters ~8-11)")
    flags += spec_flags
    if rep["stereo"]["band_correlation"]["sub<120"] < 0.85:
        flags.append("low end not mono enough (sub corr < 0.85)")
    if rep["stereo"]["correlation"] < 0.3:
        flags.append("stereo correlation low (<0.3): mono-compatibility risk")
    for lane, a in align.items():
        if a.get("p90_abs_ms", 0) > 5:
            flags.append(f"lane {lane} onsets p90 {a['p90_abs_ms']} ms off")
    if rep["clipping"]["samples_over_-0.1dBFS"] > 0:
        flags.append("samples above -0.1 dBFS")
    rep["flags"] = flags
    if png_path:
        spectrogram_png(master, sr, png_path, stems=stems)
    return rep


def print_report(rep):
    lo = rep["loudness"]
    print(f"  loudness  I={lo['integrated_lufs']} LUFS  TP={lo['true_peak_dbtp']} dBTP  PLR={lo['PLR_db']}  crest={lo['crest_factor_db']} dB"
          f"  ST max={lo['short_term_max_lufs']}  ST range={lo['short_term_range_lu_p10_p95']} LU")
    if "ffmpeg_ebur128" in lo:
        print(f"  ffmpeg    {lo['ffmpeg_ebur128']}")
    print("  sections  " + "  ".join(f"{k}:{v}" for k, v in rep["section_lufs"].items()))
    print("  octaves   " + "  ".join(f"{k}:{v['rel_db']:+.0f}({v['dev_db']:+.0f})" for k, v in rep["octave_balance"].items()))
    print(f"  stereo    corr={rep['stereo']['correlation']}  S/M={rep['stereo']['side_to_mid_db']} dB  {rep['stereo']['band_correlation']}")
    print("  stems LUFS " + "  ".join(f"{k}:{v}" for k, v in rep["stem_lufs"].items()))
    for c, d in rep.get("track_band_share_pct", rep["stem_band_share_pct"]).items():
        top = sorted(d.items(), key=lambda kv: -kv[1])[:3]
        print(f"    {c:>6} Hz: " + ", ".join(f"{k} {v:.0f}%" for k, v in top))
    print(f"  alignment {json.dumps(rep['beat_alignment'])}")
    print(f"  punch     {rep.get('kick_punch_db')}  tail={rep['tail_rms_dbfs']} dBFS  preroll={rep['preroll_peak_dbfs']}  gtr>12k={rep.get('guitars_energy_above_12k_db')}")
    print("  FLAGS: " + ("; ".join(rep["flags"]) if rep["flags"] else "none"))
