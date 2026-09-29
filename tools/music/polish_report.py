"""Analysis of the mix lab's iteration-7 scenes (node src/audio/lab/mixlab.mjs --prefix=polish) — measured, not heard.

    tools/music/.venv/bin/python tools/music/polish_report.py playtest/out-audio/mixlab

Scenes X / X_music (no SFX) / X_sfx (no music), as feel_report.py. Reports (<dir>/polish_report.json):
  - THE COLOUR REEL (beat 15): the whoosh (the 0.5 s into the beat) and the bloom (0.6 s from it) vs the music, the
    mix around it (loudness, limiter, true peak);
  - THE ROOF SIGN: each neon letter (0.4 s) vs the music, broadband and in its band;
  - THE CANISTER GLINTS (the 4 beats before each takeoff, act 1 + the roof) and the tease vs the music;
  - THE ENDING by billing (S / A / B / C): THE END flourish and the rank sting (momentary max over 2.5 s from each moment,
    and vs the music under it), where the stamp's attack lands vs the picture's slam (ms), the curtain-call applause
    1-4 s after the stamp, true peak.
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import feel_report as FR  # noqa: E402
import mix_report as MR  # noqa: E402
import stage_report as SR  # noqa: E402


def moments(r, key):
    return [e for e in r.meta.get("polish", []) if e.get(key) is not None and e.get(key) is not False]


def mix(r, b0, b1):
    return {**MR.level_report(r, b0, b1), "limiter": MR.gain_reduction(r, b0, b1)}


def ending(R, L):
    r, s, m = R.get(f"polish_poster_{L}"), R.get(f"polish_poster_{L}_sfx"), R.get(f"polish_poster_{L}_music")
    if not r:
        return None
    sr = r.sr
    te = moments(r, "theEnd")[0]["t"]
    ts = moments(r, "stamp")[0]["t"]
    post = lambda t0, t1: r.post[:, max(0, int((t0 - r.t0_post) * sr)): int((t1 - r.t0_post) * sr)]
    pre = lambda x, t0, t1: x.pre[:, max(0, x.idx_pre(t0)): x.idx_pre(t1)]
    out = {"theEndMomMaxLufs": round(SR.mom_max(post(te, te + 2.5), sr), 1),
           "stingMomMaxLufs": round(SR.mom_max(post(ts, ts + 2.5), sr), 1),
           "beforeStingMomMaxLufs": round(SR.mom_max(post(ts - 1.2, ts - 0.05), sr), 1),
           "applause1to4sAfterStampLufs": round(SR.lufs(post(ts + 1, ts + 4), sr), 1),
           "truePeakDbtp": round(MR.true_peak(post(te - 0.2, ts + 6), sr), 2)}
    if s and m:
        out["theEndVsMusicDb"] = round(SR.epow(pre(s, te, te + 1.0)) - SR.epow(pre(m, te, te + 1.0)), 1)
        out["stingVsMusicDb"] = round(SR.epow(pre(s, ts, ts + 0.6)) - SR.epow(pre(m, ts, ts + 0.6)), 1)
        # the stamp's attack vs the slam: where its thump (60-250 Hz: under the applause bed, which is high-passed at
        # 300 Hz) first rises 12 dB over what was there before it
        hf = SR.band(pre(s, ts - 0.1, ts + 0.2), sr, 60, 250)
        k = int(0.001 * sr)
        env = np.convolve(np.abs(hf).max(axis=0), np.ones(k) / k, mode="same")
        base = float(np.median(env[: int(0.09 * sr)])) + 1e-9
        i0 = int(0.05 * sr)
        hit = np.nonzero(env[i0:] > 4 * base)[0]
        out["stampAttackMs"] = round(((i0 + int(hit[0])) / sr - 0.1) * 1000, 1) if len(hit) else None
    return out


def main(d):
    metas = json.load(open(os.path.join(d, "meta.json")))
    R = {m["name"]: MR.Render(d, m) for m in metas if m["name"].startswith("polish")}
    rep = {}
    if "polish_intro" in R:
        r = R["polish_intro"]
        rep["colorBurst"] = {"whoosh": FR.sound_vs_music(R, "polish_intro", [14.3], dur=0.26),
                             "bloom": FR.sound_vs_music(R, "polish_intro", [15], dur=0.6),
                             "mix13to19": mix(r, 13, 19), "mix1to12": mix(r, 1, 12)}
    if "polish_sign" in R:
        r = R["polish_sign"]
        beats = [e["beat"] for e in moments(r, "sign")]
        rep["sign"] = {"letters": FR.sound_vs_music(R, "polish_sign", beats, dur=0.4),
                       "each": [FR.sound_vs_music(R, "polish_sign", [b], dur=0.4) for b in beats],
                       "mix": mix(r, 170, 182)}
    for n, beats in (("polish_glint", [39, 40, 41, 42]), ("polish_glint_roof", [166, 167, 168, 169])):
        if n in R:
            rep[n] = {"glints": FR.sound_vs_music(R, n, beats, dur=0.3)}
    if "polish_glint" in R:
        rep["polish_glint"]["tease"] = FR.sound_vs_music(R, "polish_glint", [44.6], dur=0.5)
    rep["ending"] = {L: ending(R, L) for L in ("S", "A", "B", "C") if f"polish_poster_{L}" in R}
    with open(os.path.join(d, "polish_report.json"), "w") as f:
        json.dump(rep, f, indent=1)
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(MR.ROOT, "playtest", "out-audio", "mixlab"))
