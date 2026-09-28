"""Analysis of the mix lab's act-2/3 scenes (node src/audio/lab/mixlab.mjs --prefix=act) — the level's audio cues through
the real graph, measured (agents can't listen).

    tools/music/.venv/bin/python tools/music/stage_report.py playtest/out-audio/mixlab

Each scene X is rendered three ways: X (the mix), X_music (no SFX: record + overlays + the hush), X_cues (the cue
sounds alone). Pre-limiter channels are linear, so a cue's level vs the music under it is X_cues vs X_music.
Reports (<dir>/stage_report.json):
  - every scene: loudness, true peak, limiter gain reduction (and its beat-locked pumping);
  - every cue sound (per STAGE_SFX layer): median/max momentary loudness vs the music in a 400 ms window from its
    attack, and vs the music IN ITS OWN dominant band (does it cut through where it lives?);
  - THE HUSH (act3_break): its depth vs the same beat un-hushed (broadband + per band), the KRAK vs the hushed music,
    the drop's slam-back contrast, the release click test (tone) and when the full range is back vs the downbeat;
  - THE FINALE (act3_finale): what our stack adds on the final hit (momentary max), peaks, limiter GR at the hit,
    and the ring-out tail beat by beat (the applause carrying past the record's fade into the poster).
"""
from __future__ import annotations

import json
import math
import os
import sys

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mix_report as MR  # noqa: E402
from producer import loudness  # noqa: E402

ROOT = MR.ROOT


def lufs(x, sr):
    v = loudness.integrated_lufs(x, sr) if x.shape[1] >= int(0.4 * sr) else float("-inf")
    return v if math.isfinite(v) else float("-inf")


def mom_max(x, sr):
    if x.shape[1] < int(0.4 * sr):
        x = np.pad(x, ((0, 0), (0, int(0.4 * sr) - x.shape[1])))
    return float(np.max(loudness.momentary_lufs(x, sr)))


def band(x, sr, lo, hi):
    sos = signal.butter(4, [lo, min(hi, sr * 0.45)], btype="band", fs=sr, output="sos")
    return signal.sosfilt(sos, x, axis=-1)


def epow(x):
    return MR.pdb(np.mean(x ** 2))


def win(r, beat, dur, pre=0.03):
    i = r.idx_pre(MR.beat_time(beat)) - int(pre * r.sr)
    return max(0, i), max(0, i) + int(dur * r.sr)


def layer_beats(meta):
    """(sound, layer id, beat of the layer's attack) for every cue that sounded in the render"""
    sc = meta["scenario"]
    lo, hi = sc["from"] + 0.5, sc["to"] - 1.5
    smashes = meta.get("smashes", [])
    out = []
    for c in meta.get("cues", []):
        if c["type"] == "hush":
            continue
        b = c["beat"]
        if c["type"] == "onSmash" and not any(abs(s - b) < 0.03 for s in smashes):
            continue
        if c["type"] == "onMiss":
            continue
        for l in meta["stageSfx"].get(c["sound"], []):
            lb = b + l.get("beats", 0)
            if lo <= lb <= hi:
                out.append((c["sound"], l["id"], lb))
    # act 2's mechanics: the telegraph starts 1 beat before the arrival (whistle = a bottle's whistle or a firebomb's
    # whoosh, StageAudio picks), the impacts land on it
    kinds = {"whistle": ("throwTelegraph", "bottle_whistle|firebomb_whoosh", -1), "rumble": ("ballRumble", "ball_rumble", -1),
             "ignite": ("firebombBurst", "firebomb_burst", 0), "shatter": ("bottleSmash", "bottle_smash", 0),
             "ballHit": ("ballHit", "ball_hit", 0)}
    for m in meta.get("mechs", []):
        snd, lid, off = kinds[m["kind"]]
        b = m["arrive"] + off
        if lo <= b <= hi:
            out.append((snd, lid, b))
    return out


def cue_levels(R, name):
    m, mu, cu = R[name], R.get(name + "_music"), R.get(name + "_cues")
    if not (mu and cu):
        return {}
    rows = {}
    for snd, lid, b in layer_beats(m.meta):
        long = lid.startswith("crowd_") or lid in ("film_runout", "bigjim_bluff", "glass_wall")
        a, e = win(cu, b, 1.2 if long else 0.4)
        if e > cu.pre.shape[1]:
            continue
        c, mm = cu.pre[:, a:e], mu.pre[:, a:e]
        d = lufs(c, cu.sr) - lufs(mm, cu.sr)
        # its own band: the half-octave band where the cue has the most energy
        bl = MR.band_levels(c, cu.sr)
        fc = max(bl, key=bl.get)
        lo_, hi_ = fc / 2 ** 0.5, fc * 2 ** 0.5
        db_band = epow(band(c, cu.sr, lo_, hi_)) - epow(band(mm, cu.sr, lo_, hi_))
        k = f"{snd}:{lid}"
        rows.setdefault(k, []).append((d, db_band, fc, b))
    # cues that sound together are measured together (the cue-only render has them all)
    allb = [(s_, b_) for s_, _l, b_ in layer_beats(m.meta)]
    out = {}
    for k, v in rows.items():
        ds = [x[0] for x in v if math.isfinite(x[0])]
        if not ds:
            continue
        out[k] = {"n": len(v), "medianDbVsMusic": round(float(np.median(ds)), 1), "maxDbVsMusic": round(float(np.max(ds)), 1),
                  "dominantBandHz": v[0][2], "medianInBandDb": round(float(np.median([x[1] for x in v])), 1),
                  "beats": [round(x[3], 2) for x in v][:8]}
        ov = sorted({s_ for s_, b_ in allb for x in v if abs(b_ - x[3]) < 0.15 and s_ != k.split(":")[0]})
        if ov:
            out[k]["withCues"] = ov
    return out


def hush_report(R):
    if not all(k in R for k in ("act3_break_music", "act3_break_nohush_music", "act3_break_cues", "act3_break")):
        return None
    m = R["act3_break"].meta
    h = next((c for c in m["cues"] if c["type"] == "hush"), None)
    if not h:
        return {"error": "no hush cue in the level"}
    hu, no, cu, full = R["act3_break_music"], R["act3_break_nohush_music"], R["act3_break_cues"], R["act3_break"]
    krak = next((c["beat"] for c in m["cues"] if c["type"] == "onSmash" and c["sound"] == "breakKrak"), h["to"] - 0.3)
    a, b = hu.span_pre(h["from"] + 0.12, krak - 0.03)
    rep = {"hush": [h["from"], h["to"]], "breakBeat": krak}
    x, y = hu.pre[:, a:b], no.pre[:, a:b]
    rep["depthBeforeKrakDb"] = round(epow(x) - epow(y), 1)
    rep["depthByBandDb"] = {f"{lo}-{hi}": round(epow(band(x, hu.sr, lo, hi)) - epow(band(y, hu.sr, lo, hi)), 1)
                            for lo, hi in ((30, 250), (250, 3400), (3400, 16000))}
    # the KRAK against the hushed music, and against what the un-hushed beat would have been
    # (power over the KRAK's first 0.3 beat, up to the release: too short for a 400 ms loudness window)
    a, b = cu.span_pre(krak - 0.01, h["to"] - 0.02)
    rep["krakVsHushedMusicDb"] = round(epow(cu.pre[:, a:b]) - epow(hu.pre[:, a:b]), 1)
    rep["krakVsUnhushedMusicDb"] = round(epow(cu.pre[:, a:b]) - epow(no.pre[:, a:b]), 1)
    rep["krakVsHushedMusicByBandDb"] = {f"{lo}-{hi}": round(epow(band(cu.pre[:, a:b], cu.sr, lo, hi)) - epow(band(hu.pre[:, a:b], cu.sr, lo, hi)), 1)
                                       for lo, hi in ((30, 250), (250, 3400), (3400, 16000))}
    # the limiter's gain reduction around the KRAK and the drop, per 1/8 beat (where does it bite?)
    tr = []
    for k in range(int((h["to"] + 1.0 - (krak - 0.1)) * 8)):
        b0 = krak - 0.1 + k / 8
        g = MR.gain_reduction(full, b0, b0 + 0.125)["maxGrDb"]
        if g > 0.5:
            tr.append([round(b0, 3), g])
    rep["limiterGrOver0.5dBAt"] = tr
    # the drop: the bar after vs the hushed beat (master)
    a0, b0 = full.span_post(h["from"] + 0.12, krak - 0.03)
    a1, b1 = full.span_post(h["to"] + 0.05, h["to"] + 1.05)
    rep["dropSlamBackDb"] = round(epow(full.post[:, a1:b1]) - epow(full.post[:, a0:b0]), 1)
    rep["limiterAtKrak"] = MR.gain_reduction(full, krak - 0.1, h["to"] + 1.0)
    rep["truePeakAtKrakDbtp"] = round(MR.true_peak(full.post[:, slice(*full.span_post(krak - 0.1, h["to"] + 1.0))], full.sr), 2)
    if "act3_break_tone" in R:
        t = R["act3_break_tone"]
        a, b = t.span_pre(h["from"] - 2, h["to"] + 2)
        sos = signal.butter(8, 7000, btype="high", fs=t.sr, output="sos")
        hf = signal.sosfilt(sos, t.pre[:, a:b], axis=-1)
        blk = int(0.005 * t.sr)
        n = hf.shape[1] // blk
        e = np.sqrt(np.mean(hf[:, :n * blk].reshape(2, n, blk) ** 2, axis=(0, 2)))
        tone = np.sqrt(np.mean(t.pre[:, a:b] ** 2))
        beats = [MR.time_beat(t.t0_pre + (a + (k + 0.5) * blk) / t.sr) for k in range(n)]
        edge = [k for k, bb in enumerate(beats) if min(abs(bb - h["from"]), abs(bb - h["to"])) < 0.15]
        rest = [k for k in range(n) if k not in edge]
        rep["clicktest"] = {"hfAtEdgesMaxDbfs": round(MR.db(e[edge].max()), 1), "hfElsewhereMaxDbfs": round(MR.db(e[rest].max()), 1),
                            "hfEdgeVsToneDb": round(MR.db(e[edge].max()) - MR.db(tone), 1)}
        # when is the full range back? the tone's 220 Hz component (below the horn's 320 Hz HP) vs the beat
        lo = band(t.pre[:, a:b], t.sr, 150, 280).mean(axis=0)
        blk = int(0.001 * t.sr)
        n = len(lo) // blk
        env = np.sqrt(np.mean(lo[:n * blk].reshape(n, blk) ** 2, axis=1))
        steady = np.median(env[:int(0.5 * t.sr / blk)])
        tb = np.array([MR.time_beat(t.t0_pre + (a + (k + 0.5) * blk) / t.sr) for k in range(n)])
        back = np.nonzero((tb > h["to"] - 0.3) & (env >= steady * 10 ** (-1 / 20)))[0]
        gone = np.nonzero((tb > h["from"] - 0.3) & (env <= steady * 10 ** (-20 / 20)))[0]
        downbeat = MR.beat_time(h["to"] + 0.03)
        if len(back):
            tback = t.t0_pre + (a + (back[0] + 0.5) * blk) / t.sr
            rep["fullRangeBackMsBeforeDownbeat"] = round((MR.beat_time(round(h["to"])) - tback) * 1000, 1)
            rep["fullRangeBackAtBeat"] = round(float(tb[back[0]]), 3)
        if len(gone):
            rep["squeezedInAtBeat"] = round(float(tb[gone[0]]), 3)
        del downbeat
    return rep


def finale_report(R):
    if not all(k in R for k in ("act3_finale", "act3_finale_music", "act3_finale_cues")):
        return None
    f, mu, cu = R["act3_finale"], R["act3_finale_music"], R["act3_finale_cues"]
    fin = next((c["beat"] for c in f.meta["cues"] if c.get("sound") == "finale"), None)
    if fin is None:
        return {"error": "no finale cue"}
    rep = {"finalHitBeat": fin}
    a, b = f.span_post(fin - 0.2, fin + 1.2)
    am, bm = mu.span_post(fin - 0.2, fin + 1.2)
    rep["hitMomentaryMaxLufs"] = {"mix": round(mom_max(f.post[:, a:b], f.sr), 1), "musicOnly": round(mom_max(mu.post[:, am:bm], mu.sr), 1)}
    rep["hitMomentaryAddedLu"] = round(rep["hitMomentaryMaxLufs"]["mix"] - rep["hitMomentaryMaxLufs"]["musicOnly"], 1)
    a2, b2 = win(cu, fin, 0.4, 0.03)
    rep["stackVsBakedHitDb"] = round(lufs(cu.pre[:, a2:b2], cu.sr) - lufs(mu.pre[:, a2:b2], mu.sr), 1)
    ap, bp = f.span_pre(fin - 0.5, fin + 2)
    rep["prePeakDbfs"] = {"mix": round(MR.db(np.max(np.abs(f.pre[:, ap:bp]))), 2), "musicOnly": round(MR.db(np.max(np.abs(mu.pre[:, ap:bp]))), 2)}
    rep["truePeakDbtp"] = round(MR.true_peak(f.post[:, a:b], f.sr), 2)
    rep["limiterAtHit"] = MR.gain_reduction(f, fin - 0.5, fin + 2)
    rep["limiterAtHitMusicOnly"] = MR.gain_reduction(mu, fin - 0.5, fin + 2)
    # crest: 10 ms peak vs 400 ms loudness over the hit (does it still punch?)
    rep["hitCrestDb"] = {"mix": round(MR.db(np.max(np.abs(f.post[:, a:b]))) - rep["hitMomentaryMaxLufs"]["mix"], 1),
                         "musicOnly": round(MR.db(np.max(np.abs(mu.post[:, am:bm]))) - rep["hitMomentaryMaxLufs"]["musicOnly"], 1)}
    tail = []
    last = min(f.meta["scenario"]["to"] - 1, MR.time_beat(f.t0_post + f.post.shape[1] / f.sr) - 1)
    b0 = fin
    while b0 + 1 <= last:
        a, b = f.span_post(b0, b0 + 1)
        am, bm = mu.span_post(b0, b0 + 1)
        tail.append({"beat": b0, "mixLufs": round(lufs(f.post[:, a:b], f.sr), 1) if b - a > 0.4 * f.sr else round(mom_max(f.post[:, a:b], f.sr), 1),
                     "musicLufs": round(mom_max(mu.post[:, am:bm], mu.sr), 1)})
        b0 += 1
    rep["tailByBeat"] = tail
    return rep


def main(d):
    metas = json.load(open(os.path.join(d, "meta.json")))
    R = {m["name"]: MR.Render(d, m) for m in metas if m["name"].startswith("act")}
    rep = {"scenes": {}, "cueSounds": {}}
    for name, r in R.items():
        if name.endswith("_cues"):
            continue
        sc = r.meta["scenario"]
        span = (sc["from"] + 1, sc["to"] - 1)
        a, b = r.span_post(*span)
        rep["scenes"][name] = {**MR.level_report(r, *span), "limiter": MR.gain_reduction(r, *span)}
    for name in R:
        if name + "_music" in R and name + "_cues" in R:
            rep["cueSounds"].update({f"{name}/{k}": v for k, v in cue_levels(R, name).items()})
    h = hush_report(R)
    if h:
        rep["hush"] = h
    f = finale_report(R)
    if f:
        rep["finale"] = f
    json.dump(rep, open(os.path.join(d, "stage_report.json"), "w"), indent=1)
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "playtest", "out-audio", "mixlab"))
