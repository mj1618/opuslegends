"""The strike HIT (src/audio/sfx.ts Sfx.hit, iteration 9b: the HEYs became hits) and the 'shouts' overlay's HIT accents,
measured on the mix-lab renders (`hit_*` scenes of node src/audio/lab/mixlab.mjs --prefix=hit).

    tools/music/.venv/bin/python tools/music/hit_report.py playtest/out-audio/mixlab

Per hit kind (the hero alone / + the audience's stomp-clap / the heavy hit), over its events (hit_sfx: the SFX alone;
hit_synth_sfx: the synth fallback): max momentary loudness (400 ms), peak, crest factor over the first 100 ms (transient
punch), the attack's rise time (10 -> 90 % of the envelope peak), the SMACK's timing (envelope 50 % crossing vs the
beat), the spectrum (sub < 120 Hz / low-mids 120-500 / presence 2-6 kHz, re the 0.5-2 kHz mids), the tail (0.15-0.4 s
vs the first 0.1 s); vs the music (hit_music) in the first 100 ms: the hit alone under/over the music (broadband and
in 1-5 kHz), and the whole mix over the music (hit_mix). The mix's true peak and limiter gain reduction at the hits.
The overlay (hit_stem / hit_record / hit_full, crowd 21): each shouts-lane accent in the window vs the record (first
150 ms, broadband + 1-5 kHz + < 150 Hz), its timing vs the lane beat, and the full mix's true peak / limiter there.
The death groan (hit_groan): its F0 track (pYIN) and centroid. Writes <dir>/hit_report.json.
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mix_report import BM, Render, beat_time, db, gain_reduction, true_peak  # noqa: E402
from producer import loudness  # noqa: E402

KIND = {1: "hero", 2: "hero+crowd", 3: "heavy"}


def seg(r: Render, b, a_s, b_s, pre=False):
    t = beat_time(b)
    t0 = r.t0_pre if pre else r.t0_post
    x = r.pre if pre else r.post
    i0 = int(round((t + a_s - t0) * r.sr))
    i1 = int(round((t + b_s - t0) * r.sr))
    return x[:, max(0, i0): max(0, i1)]


def band_db(x, sr, lo, hi):
    m = x.mean(axis=0)
    S = np.abs(np.fft.rfft(m * np.hanning(len(m)))) ** 2
    f = np.fft.rfftfreq(len(m), 1 / sr)
    return 10 * np.log10(S[(f >= lo) & (f < hi)].sum() + 1e-20)


def rms_db(x):
    return db(np.sqrt(np.mean(x ** 2)) if x.size else 0.0)


def env_of(x, sr):
    e = np.abs(signal.hilbert(x.mean(axis=0)))
    return np.convolve(e, np.ones(24) / 24, mode="same")


def timing(r: Render, b, win=(-0.08, 0.25)):
    """ms of the envelope's 50 % crossing vs the beat, and the 10 -> 90 % rise time (ms)"""
    x = seg(r, b, *win)
    e = env_of(x, r.sr)
    pk = e.max()
    k50 = int(np.nonzero(e >= 0.5 * pk)[0][0])
    k10 = int(np.nonzero(e >= 0.1 * pk)[0][0])
    k90 = int(np.nonzero(e >= 0.9 * pk)[0][0])
    return round((k50 / r.sr + win[0]) * 1000, 1), round((k90 - k10) / r.sr * 1000, 1)


def per_kind(r: Render, music: Render | None):
    out = {}
    for v, name in KIND.items():
        bs = [h["beat"] for h in r.meta["hits"] if h["kind"] == v]
        if not bs:
            continue
        rows = []
        for b in bs:
            x = seg(r, b, -0.01, 0.45)
            st = x if x.shape[1] >= int(0.45 * r.sr) else np.pad(x, ((0, 0), (0, int(0.45 * r.sr) - x.shape[1])))
            head = seg(r, b, -0.005, 0.1)
            on, rise = timing(r, b)
            mid = band_db(x, r.sr, 500, 2000)
            row = {
                "momentaryMax": float(np.max(loudness.momentary_lufs(st, r.sr))),
                "peakDbfs": db(np.max(np.abs(head))),
                "crestDb": db(np.max(np.abs(head))) - rms_db(head),
                "riseMs": rise,
                "onsetMs": on,
                "subRelMid": band_db(x, r.sr, 20, 120) - mid,
                "lowmidRelMid": band_db(x, r.sr, 120, 500) - mid,
                "presRelMid": band_db(x, r.sr, 2000, 6000) - mid,
                "tailDb": rms_db(seg(r, b, 0.15, 0.4)) - rms_db(head),
            }
            if music is not None:
                mu = seg(music, b, -0.005, 0.1)
                row["vsMusicDb"] = rms_db(head) - rms_db(mu)
                row["vsMusic1to5kDb"] = band_db(head, r.sr, 1000, 5000) - band_db(mu, music.sr, 1000, 5000)
            rows.append(row)
        out[name] = {k: round(float(np.mean([rw[k] for rw in rows])), 1) for k in rows[0]}
        out[name]["n"] = len(rows)
        out[name]["onsetMsRange"] = [min(rw["onsetMs"] for rw in rows), max(rw["onsetMs"] for rw in rows)]
    return out


def mix_vs_music(m: Render, music: Render):
    out = {}
    for v, name in KIND.items():
        bs = [h["beat"] for h in m.meta["hits"] if h["kind"] == v]
        if bs:
            out[name] = round(float(np.mean([rms_db(seg(m, b, -0.005, 0.1)) - rms_db(seg(music, b, -0.005, 0.1)) for b in bs])), 2)
    a = min(h["beat"] for h in m.meta["hits"]) - 1
    b = max(h["beat"] for h in m.meta["hits"]) + 1
    i0, i1 = m.span_post(a, b)
    return {"mixOverMusicDb(first 100 ms)": out, "truePeakDbtp": round(true_peak(m.post[:, i0:i1], m.sr), 2),
            "limiter": gain_reduction(m, a, b)}


def overlay(stem: Render, rec: Render, full: Render | None):
    a = stem.meta["from"] if "from" in stem.meta else 84
    lane = [e for e in BM["lanes"]["shouts"] if 85 <= e["beat"] < 131]
    rows = []
    for e in lane:
        b = e["beat"]
        x = seg(stem, b, -0.005, 0.15)
        y = seg(rec, b, -0.005, 0.15)
        on, rise = timing(stem, b)
        rows.append({"beat": b, "word": e["word"], "vsRecordDb": round(rms_db(x) - rms_db(y), 1),
                     "vsRecord1to5kDb": round(band_db(x, stem.sr, 1000, 5000) - band_db(y, rec.sr, 1000, 5000), 1),
                     "vsRecordSubDb": round(band_db(x, stem.sr, 20, 150) - band_db(y, rec.sr, 20, 150), 1),
                     "onsetMs": on, "riseMs": rise,
                     "crestDb": round(db(np.max(np.abs(x))) - rms_db(x), 1)})
    rep = {"accents": rows,
           "mean": {k: round(float(np.mean([r[k] for r in rows])), 1) for k in ("vsRecordDb", "vsRecord1to5kDb", "vsRecordSubDb", "onsetMs", "riseMs", "crestDb")}}
    if full is not None:
        i0, i1 = full.span_post(85, 131)
        rep["full"] = {"truePeakDbtp": round(true_peak(full.post[:, i0:i1], full.sr), 2), "limiter": gain_reduction(full, 85, 131),
                       "overRecordAtAccentsDb": round(float(np.mean([rms_db(seg(full, e["beat"], -0.005, 0.15)) - rms_db(seg(rec, e["beat"], -0.005, 0.15)) for e in lane])), 2)}
    del a
    return rep


def groan(r: Render):
    import librosa

    t = beat_time(89) + 0.05
    i0 = int(round((t - r.t0_post) * r.sr))
    x = r.post[:, i0: i0 + int(1.6 * r.sr)].mean(axis=0)
    f0, vf, _ = librosa.pyin(x.astype(float), fmin=60, fmax=800, sr=r.sr, frame_length=4096)
    f = f0[vf]
    return {"f0MedianHz": round(float(np.nanmedian(f)), 0) if len(f) else None}


def main(d):
    metas = {m["name"]: m for m in json.load(open(os.path.join(d, "meta.json")))}
    R = {n: Render(d, m) for n, m in metas.items() if n.startswith("hit")}
    music = R.get("hit_music")
    rep = {}
    for n in ("hit_sfx", "hit_synth_sfx"):
        if n in R:
            rep[n] = per_kind(R[n], music)
    if "hit_mix" in R and music is not None:
        rep["hit_mix"] = mix_vs_music(R["hit_mix"], music)
    if "hit_stem" in R and "hit_record" in R:
        rep["overlay"] = overlay(R["hit_stem"], R["hit_record"], R.get("hit_full"))
    if "hit_groan" in R:
        rep["groan"] = groan(R["hit_groan"])
    json.dump(rep, open(os.path.join(d, "hit_report.json"), "w"), indent=1)
    for n, v in rep.items():
        print(f"\n== {n}")
        if n == "overlay":
            for rw in v["accents"]:
                print("  " + "  ".join(f"{a} {b}" for a, b in rw.items()))
            print("  mean", v["mean"])
            if "full" in v:
                print("  full", v["full"])
        elif isinstance(v, dict) and all(isinstance(x, dict) for x in v.values()):
            for k, row in v.items():
                print(f"  {k:11s} " + "  ".join(f"{a} {b}" for a, b in row.items()))
        else:
            print(f"  {v}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "playtest", "out-audio", "mixlab"))
