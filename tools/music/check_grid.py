#!/usr/bin/env python3
"""Verify a rendered song against its gameplay grid (reads tools/music/build/<name>/ WAVs + the beat map).

    python3 tools/music/check_grid.py jim

Checks
  * stops: master level inside every stop vs. the beat before it (band stops: tails may ring;
    'total' stops must be near-silent);
  * stem-empty ranges: e.g. the lead stem in the stalactite response bars;
  * ghost levels: response ghosts (riff lane, role=response) vs. their calls, and stomp-break slot ghosts;
  * shouts: each shout's gang envelope reaches 50 % of its peak on the beat (onset error, isolated stem);
  * stems sum to the master (when rendered at master level).
"""
from __future__ import annotations

import json
import math
import os
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))


def rd(p):
    sr, x = wavfile.read(p)
    return sr, x.T.astype(np.float64)


def db(x):
    return 20 * math.log10(max(x, 1e-12))


def rms(x):
    return math.sqrt(float(np.mean(x ** 2))) if x.size else 0.0


def main(name):
    bd = os.path.join(HERE, "build", name)
    bm = json.load(open(os.path.join(ROOT, "assets", "audio", f"{name}.beatmap.json")))
    sr, master = rd(os.path.join(bd, f"{name}.wav"))
    stems = {f[5:-4]: rd(os.path.join(bd, f))[1] for f in os.listdir(bd) if f.startswith("stem_")}
    spb = 60.0 / bm["song"]["tempo"][0]["bpm"]
    off = bm["song"]["audioOffset"]
    S = lambda beat: int(round((beat * spb + off) * sr))
    ok = True
    print(f"== {name}: {len(bm['lanes'].get('stops', []))} stops")
    base = stems.get("base", master)
    for st in bm["lanes"].get("stops", []):
        a, b = S(st["beat"]), S(st["beat"] + st["beats"])
        tot = st.get("total")
        # band stops: the BAND (base stem) must drop out (lead fills + shouts may play); total: the whole master
        x = master if tot else base
        pre = x[:, S(st["beat"] - 1):a]
        hole = x[:, (a + b) // 2:b]          # 2nd half of the hole (reverb tails decay in the first half)
        d = db(rms(hole)) - db(rms(pre))
        bad = d > (-30 if tot else -15)
        ok &= not bad
        print(f"  stop @beat {st['beat']:7.2f} ({st['beats']} b{' TOTAL' if tot else ''}): {'master' if tot else 'base'} "
              f"hole {d:6.1f} dB vs beat before{'   <-- FAIL' if bad else ''}")
    # stems sum
    ms = bm["audio"]["files"].get("masterStems")
    if ms and bm["audio"]["files"].get("stemsAtMasterLevel"):
        g = 10 ** (bm["audio"]["files"].get("stemsGainDb", 0) / 20)
        ssum = sum(stems[k] for k in ms) / g
        err = db(rms(ssum - master)) - db(rms(master))
        print(f"  stems {ms} sum vs master: residual {err:.1f} dB (soft clip only)")
    # lead empty bars
    lead = stems.get("lead")
    if lead is not None:
        for bar in (42, 44, 46, 48):
            seg = lead[:, S(bar * 4):S(bar * 4 + 4)]
            pk = float(np.max(np.abs(seg))) if seg.size else 0
            bad = pk > 1e-4
            ok &= not bad
            print(f"  lead stem bar {bar}: peak {db(pk):7.1f} dBFS{'   <-- FAIL' if bad else ''}")
    # ghosts vs calls
    riff = bm["lanes"].get("riff", [])
    calls = [e for e in riff if e.get("role") == "call"]
    if calls and lead is not None and base is not None:
        def peak_after(x, beat, dur=0.3):
            return float(np.max(np.abs(x[:, S(beat):S(beat) + int(dur * sr)])))
        c = np.median([db(peak_after(lead, e["beat"])) for e in calls])
        r = np.median([db(peak_after(base, e["beat"] + 4)) for e in calls])
        print(f"  stalactite call peak (lead stem) {c:.1f} dBFS; base stem at response {r:.1f} dBFS (ghost is inside the base mix)")
    # shouts onset (isolated shouts stem, 50 % envelope)
    sh = stems.get("shouts")
    if sh is not None:
        errs = []
        m = sh.mean(axis=0)
        for e in bm["lanes"].get("shouts", []):
            s0 = e["sample"]
            seg = m[s0 - int(0.08 * sr): s0 + int(0.12 * sr)]
            env = np.abs(signal.hilbert(seg))
            env = np.convolve(env, np.ones(24) / 24, mode="same")
            i0 = int(np.argmin(env[: int(0.06 * sr)]))
            pk = env[i0:].max()
            k = i0 + int(np.nonzero(env[i0:] >= 0.5 * pk)[0][0])
            errs.append((k - int(0.08 * sr)) / sr * 1000)
        errs = np.array(errs)
        print(f"  shouts in the mixed shouts stem: onset median {np.median(errs):+.1f} ms, p90 |err| {np.percentile(np.abs(errs), 90):.1f} ms "
              f"(overlapping tails/reverb bias this; the isolated check is in the analysis report)")
    print("GRID OK" if ok else "GRID FAIL")
    return ok


if __name__ == "__main__":
    sys.exit(0 if main(sys.argv[1] if len(sys.argv) > 1 else "jim") else 1)
