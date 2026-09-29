"""The hero's strike HEY (src/audio/sfx.ts Sfx.hey, iteration 8: real takes) measured on the mix-lab renders (`hey_*`
scenes of node src/audio/lab/mixlab.mjs --prefix=hey): the samples vs the old synth (`hey_synth_sfx`).

    tools/music/.venv/bin/python tools/music/hey_report.py playtest/out-audio/mixlab

Per HEY kind (hero alone / + the audience / a Heave's roar), over its events: max momentary loudness (400 ms), the
spectral centroid, low-mids (80-500 Hz) vs presence (1-4 kHz), the tail (0.35-0.65 s after the beat vs the first 0.25 s),
the vowel's timing (envelope 50 % crossing vs the beat), and vs the music (hey_music) in 1-4 kHz. The death groan:
its F0 track (pYIN) and centroid. Writes <dir>/hey_report.json.
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mix_report import Render, beat_time, db  # noqa: E402
from producer import loudness  # noqa: E402

KIND = {1: "hero", 4: "hero+crowd", 5: "roar"}


def seg(r: Render, b, a_s, b_s):
    t = beat_time(b)
    i0 = int(round((t + a_s - r.t0_post) * r.sr))
    i1 = int(round((t + b_s - r.t0_post) * r.sr))
    return r.post[:, max(0, i0): max(0, i1)]


def band_db(x, sr, lo, hi):
    m = x.mean(axis=0)
    S = np.abs(np.fft.rfft(m * np.hanning(len(m)))) ** 2
    f = np.fft.rfftfreq(len(m), 1 / sr)
    return 10 * np.log10(S[(f >= lo) & (f < hi)].sum() + 1e-20)


def centroid(x, sr):
    m = x.mean(axis=0)
    S = np.abs(np.fft.rfft(m * np.hanning(len(m))))
    f = np.fft.rfftfreq(len(m), 1 / sr)
    return float((S * f).sum() / (S.sum() + 1e-20))


def onset_ms(r: Render, b):
    x = seg(r, b, -0.15, 0.25).mean(axis=0)
    env = np.abs(signal.hilbert(x))
    env = np.convolve(env, np.ones(48) / 48, mode="same")
    k = int(np.nonzero(env >= 0.5 * env.max())[0][0])
    return round((k / r.sr - 0.15) * 1000, 1)


def per_kind(r: Render, music: Render | None):
    out = {}
    for v, name in KIND.items():
        bs = [h["beat"] for h in r.meta["heys"] if h["voices"] == v]
        if not bs:
            continue
        rows = []
        for b in bs:
            x = seg(r, b, -0.05, 0.4)
            st = x if x.shape[1] >= int(0.45 * r.sr) else np.pad(x, ((0, 0), (0, int(0.45 * r.sr) - x.shape[1])))
            head = seg(r, b, -0.05, 0.25)
            tail = seg(r, b, 0.35, 0.65)
            row = {
                "momentaryMax": float(np.max(loudness.momentary_lufs(st, r.sr))),
                "centroid": centroid(x, r.sr),
                "lowmidMinusPresence": band_db(x, r.sr, 80, 500) - band_db(x, r.sr, 1000, 4000),
                "tailDb": db(np.sqrt(np.mean(tail**2))) - db(np.sqrt(np.mean(head**2))),
                "onsetMs": onset_ms(r, b),
            }
            if music is not None:
                row["vsMusic1to4kDb"] = band_db(x, r.sr, 1000, 4000) - band_db(seg(music, b, -0.05, 0.4), music.sr, 1000, 4000)
            rows.append(row)
        out[name] = {k: round(float(np.mean([rw[k] for rw in rows])), 1) for k in rows[0]}
        out[name]["n"] = len(rows)
        out[name]["onsetMsRange"] = [min(rw["onsetMs"] for rw in rows), max(rw["onsetMs"] for rw in rows)]
    return out


def groan(r: Render):
    import librosa

    t = beat_time(89) + 0.05
    i0 = int(round((t - r.t0_post) * r.sr))
    x = r.post[:, i0: i0 + int(1.6 * r.sr)].mean(axis=0)
    f0, vf, _ = librosa.pyin(x.astype(float), fmin=60, fmax=800, sr=r.sr, frame_length=4096)
    f = f0[vf]
    return {
        "f0StartHz": round(float(np.nanmedian(f[:5])), 0) if len(f) > 5 else None,
        "f0EndHz": round(float(np.nanmedian(f[-5:])), 0) if len(f) > 5 else None,
        "f0MedianHz": round(float(np.nanmedian(f)), 0) if len(f) else None,
        "centroid": round(centroid(x[None, :], r.sr), 0),
    }


def main(d):
    metas = {m["name"]: m for m in json.load(open(os.path.join(d, "meta.json")))}
    R = {n: Render(d, m) for n, m in metas.items() if n.startswith("hey")}
    music = R.get("hey_music")
    rep = {}
    for n in ("hey_sfx", "hey_synth_sfx"):
        if n in R:
            rep[n] = per_kind(R[n], music)
    if "hey_mix" in R and music is not None:
        # the whole mix at each HEY vs the music alone there (how far the HEY pokes out)
        m = R["hey_mix"]
        rows = [db(np.sqrt(np.mean(seg(m, h["beat"], -0.02, 0.3) ** 2))) - db(np.sqrt(np.mean(seg(music, h["beat"], -0.02, 0.3) ** 2))) for h in m.meta["heys"]]
        rep["hey_mix"] = {"mixOverMusicDb": round(float(np.mean(rows)), 2)}
    if "hey_groan" in R:
        rep["groan"] = groan(R["hey_groan"])
    json.dump(rep, open(os.path.join(d, "hey_report.json"), "w"), indent=1)
    for n, v in rep.items():
        print(f"\n== {n}")
        if isinstance(v, dict) and all(isinstance(x, dict) for x in v.values()):
            for k, row in v.items():
                print(f"  {k:11s} " + "  ".join(f"{a} {b}" for a, b in row.items()))
        else:
            print(f"  {v}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "playtest", "out-audio", "mixlab"))
