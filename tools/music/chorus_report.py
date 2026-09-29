"""The chorus lift (src/audio/lift.ts, mix.ts CHORUS_LIFT) measured on the mix-lab renders (`chorus_*` scenes of
node src/audio/lab/mixlab.mjs --prefix=chorus).

    tools/music/.venv/bin/python tools/music/chorus_report.py playtest/out-audio/mixlab

Per act render (with the lift / `_off` = the pre-lift chain):
  - per section: integrated LUFS and true peak of the master, limiter GR (% of 10 ms blocks over 0.5 / 1 / 2 dB, max) and
    its beat-locked modulation depth (pumping), stereo width (side/mid dB);
  - the contrast: each chorus vs the non-chorus music around it (the verse / pre-chorus before it, the tag after), with the
    lift and without it;
  - the lift's ramps: the pre-limiter lift/off level ratio in 1/8-beat blocks, where it crosses half way (in beats);
  - chorus_tone: high-frequency clicks at the ramps (a steady two-tone through act 1's lift).
Writes <dir>/chorus_report.json.
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mix_report import BM, Render, beat_time, db, gain_reduction, level_report  # noqa: E402

SECTIONS = [(s["name"], s["startBeat"], s["endBeat"]) for s in BM["sections"]]
CHORUSES = [s for s in SECTIONS if s[0].startswith("chorus")]


def width_db(x):
    m = (x[0] + x[1]) / 2
    s = (x[0] - x[1]) / 2
    return round(db(np.sqrt(np.mean(s**2))) - db(np.sqrt(np.mean(m**2))), 2)


def sections_in(r: Render):
    a, b = r.meta["from"], r.meta["to"]
    return [(n, max(s0, a), min(s1, b)) for n, s0, s1 in SECTIONS if s1 > a + 1 and s0 < b - 1]


def section_table(r: Render):
    out = {}
    for n, s0, s1 in sections_in(r):
        lv = level_report(r, s0, s1)
        gr = gain_reduction(r, s0, s1)
        a, b = r.span_post(s0, s1)
        out[n] = {
            "beats": [s0, s1],
            "lufs": lv["integratedLufs"],
            "truePeak": lv["truePeakDbtp"],
            "prePeak": lv["prePeakDbfs"],
            "gr>0.5%": gr["blocksOver0.5dB%"],
            "gr>1%": gr["blocksOver1dB%"],
            "gr>2%": gr["blocksOver2dB%"],
            "grMax": gr["maxGrDb"],
            "pump": gr["beatLockedGrDepthDb"],
            "widthSM": width_db(r.post[:, a:b]),
        }
        if r.meta["scenario"].get("nosfx"):
            cs = clip_stats(r, s0, s1)
            if cs:
                out[n].update(cs)
    return out


def clip_stats(r: Render, s0, s1):
    """the lift's soft clip (music-only renders: the pre-limiter channels = the clip's output x the master trim): how
    much it shaved — % of samples reduced > 0.5 / 1 dB, the max, and the shaved-off energy vs the music (distortion)"""
    c = r.meta.get("liftClipDb")
    if c is None:
        return None
    a, b = r.span_pre(s0, s1)
    y = np.abs(r.pre[:, a:b]) * r.meta.get("limiterMakeup", 1.0) / 10 ** (r.meta["headroomDb"] / 20)
    ceil, knee = 10 ** (c / 20), 10 ** ((c - 3) / 20)
    yy = np.clip(y, 0, ceil - 1e-7)
    inv = np.where(yy > knee, knee + (ceil - knee) * np.arctanh(np.clip((yy - knee) / (ceil - knee), 0, 0.999999)), yy)
    gr = 20 * np.log10(np.maximum(inv, 1e-9) / np.maximum(yy, 1e-9))
    shaved = np.sum((inv - yy) ** 2)
    return {
        "clip>0.5dB%": round(100 * float(np.mean(gr > 0.5)), 3),
        "clip>1dB%": round(100 * float(np.mean(gr > 1)), 3),
        "clipMaxDb": round(float(gr.max()), 2),
        "shavedVsMusicDb": round(10 * np.log10(max(shaved, 1e-20) / max(float(np.sum(yy**2)), 1e-20)), 1),
    }


def contrast(tab):
    """each chorus vs the music around it: the section before (verse / pre-chorus / breakdown) and the tag after"""
    names = list(tab)
    res = {}
    for i, n in enumerate(names):
        if not n.startswith("chorus"):
            continue
        before = [names[j] for j in range(i - 1, -1, -1) if not names[j].startswith("chorus")][:2]
        after = names[i + 1] if i + 1 < len(names) else None
        around = [tab[k]["lufs"] for k in before + ([after] if after else [])]
        res[n] = {
            "vs": before + ([after] if after else []),
            "chorusMinusAroundLU": round(tab[n]["lufs"] - float(np.mean(around)), 2) if around else None,
            "chorusMinusBeforeLU": round(tab[n]["lufs"] - tab[before[0]]["lufs"], 2) if before else None,
        }
    return res


def ramp_report(on: Render, off: Render):
    """lift / off pre-limiter level ratio per 1/8 beat around each chorus's edges: where it crosses half way"""
    res = {}
    for n, c0, c1 in CHORUSES:
        if c0 < on.meta["from"] or c1 > on.meta["to"]:
            continue
        row = {}
        for edge, b0, b1 in (("in", c0 - 2, c0 + 1), ("out", c1 - 1, c1 + 2)):
            beats = np.arange(b0, b1, 0.125)
            ratio = []
            for b in beats:
                a, z = on.span_pre(b, b + 0.125)
                ea = np.sqrt(np.mean(on.pre[:, a:z] ** 2))
                a2, z2 = off.span_pre(b, b + 0.125)
                eo = np.sqrt(np.mean(off.pre[:, a2:z2] ** 2))
                ratio.append(db(ea) - db(eo))
            ratio = np.array(ratio)
            lo, hi = float(np.median(ratio[:6] if edge == "in" else ratio[-6:])), float(np.median(ratio[-6:] if edge == "in" else ratio[:6]))
            mid = (lo + hi) / 2
            k = int(np.argmax(ratio > mid)) if edge == "in" else int(np.argmax(ratio < mid))
            row[edge] = {"restDb": round(lo if edge == "in" else hi, 2), "liftDb": round(hi if edge == "in" else lo, 2), "halfWayBeat": round(float(beats[k] + 0.0625), 3)}
        res[n] = row
    return res


def click_report(r: Render):
    """HF (> 6 kHz) energy of the post-limiter tone in 5 ms blocks: max near the ramps vs the median elsewhere"""
    x = r.post[0]
    sos = signal.butter(4, 6000, "hp", fs=r.sr, output="sos")
    y = signal.sosfilt(sos, x)
    blk = int(0.005 * r.sr)
    m = len(y) // blk
    e = np.sqrt(np.mean(y[: m * blk].reshape(m, blk) ** 2, axis=1))
    med = float(np.median(e[e > 0])) if np.any(e > 0) else 1e-12
    rises = []
    for _, c0, c1 in CHORUSES:
        for b in (c0 - 1, c0, c1, c1 + 1):
            if r.meta["from"] + 1 <= b <= r.meta["to"] - 1:
                a, z = r.span_post(b - 0.1, b + 0.1)
                # the steady tone's HF on both sides (the lift moves its level: the louder side is the reference)
                a1, z1 = r.span_post(b - 1.3, b - 0.3)
                a2, z2 = r.span_post(b + 0.3, b + 1.3)
                local = max(float(np.median(e[a1 // blk: z1 // blk])), float(np.median(e[a2 // blk: z2 // blk])))
                rises.append(db(float(np.max(e[a // blk: z // blk + 1]))) - db(local))
    # a click = HF energy at a ramp point over the steady tone's HF around it
    return {"hfMedianDbfs": round(db(med), 1), "clickRiseDb": round(max(rises), 1) if rises else None}


def main(d):
    metas = {m["name"]: m for m in json.load(open(os.path.join(d, "meta.json")))}
    R = {n: Render(d, m) for n, m in metas.items() if n.startswith("chorus")}
    rep = {}
    for n in sorted(R):
        if n.endswith("_off") or n.startswith("chorus_tone"):
            continue
        tab = section_table(R[n])
        entry = {"sections": tab, "contrast": contrast(tab)}
        off = R.get(n + "_off")
        if off is not None:
            toff = section_table(off)
            entry["off"] = {"sections": toff, "contrast": contrast(toff)}
            entry["deltaVsOffLU"] = {k: round(tab[k]["lufs"] - toff[k]["lufs"], 2) for k in tab if k in toff}
            entry["ramps"] = ramp_report(R[n], off)
        rep[n] = entry
    for n in ("chorus_tone", "chorus_tone3", "chorus_tone3_off"):
        if n in R:
            rep[n] = click_report(R[n])
    json.dump(rep, open(os.path.join(d, "chorus_report.json"), "w"), indent=1)

    # the summary
    for n, e in rep.items():
        if n.startswith("chorus_tone"):
            print(f"\n{n}: {e}")
            continue
        print(f"\n== {n}")
        print(f"  {'section':12s} {'LUFS':>6s} {'off':>6s} {'Δ':>5s} {'TP':>6s} {'GR>.5%':>7s} {'GR>1%':>6s} {'GRmax':>6s} {'pump':>5s} {'offGR>.5%':>9s} {'offPump':>7s} {'S/M':>6s}")
        off = e.get("off", {}).get("sections", {})
        for s, v in e["sections"].items():
            o = off.get(s, {})
            print(
                f"  {s:12s} {v['lufs']:6.1f} {o.get('lufs', float('nan')):6.1f} {e.get('deltaVsOffLU', {}).get(s, float('nan')):5.1f} {v['truePeak']:6.2f} "
                f"{v['gr>0.5%']:7.1f} {v['gr>1%']:6.1f} {v['grMax']:6.2f} {v['pump']:5.2f} {o.get('gr>0.5%', float('nan')):9.1f} {o.get('pump', float('nan')):7.2f} {v['widthSM']:6.1f}"
            )
        for s, v in e["sections"].items():
            if "clip>0.5dB%" in v and (s.startswith("chorus") or v["clip>0.5dB%"] > 0):
                print(f"  clip {s}: >0.5 dB {v['clip>0.5dB%']}% of samples, >1 dB {v['clip>1dB%']}%, max {v['clipMaxDb']} dB, shaved {v['shavedVsMusicDb']} dB re the music")
        for c, v in e["contrast"].items():
            ov = e.get("off", {}).get("contrast", {}).get(c, {})
            print(f"  {c}: chorus - around ({', '.join(v['vs'])}) = {v['chorusMinusAroundLU']:+.2f} LU (off {ov.get('chorusMinusAroundLU', float('nan')):+.2f}); vs before {v['chorusMinusBeforeLU']:+.2f} (off {ov.get('chorusMinusBeforeLU', float('nan')):+.2f})")
        for c, v in e.get("ramps", {}).items():
            print(f"  ramps {c}: {v}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "playtest", "out-audio", "mixlab"))
