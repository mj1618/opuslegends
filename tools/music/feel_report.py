"""Analysis of the mix lab's iteration-6 scenes (node src/audio/lab/mixlab.mjs --prefix=feel) — measured, not heard.

    tools/music/.venv/bin/python tools/music/feel_report.py playtest/out-audio/mixlab

Scenes X / X_music (no SFX) / X_sfx (no music): pre-limiter channels are linear, so a sound vs the music under it is
X_sfx vs X_music. Reports (<dir>/feel_report.json):
  - THE START AT CROWD 14 (the record full from beat 0): loudness / true peak / limiter vs crowd 8 and 12, the
    overlays (stomps+claps, shouts) vs the record in their own bands, verse 1 at 14 with bells;
  - TOKENS SING: each token vs the music (broadband and in its own band, 250 ms from its attack); pitch vs the
    SINGER at that moment (pYIN on the vocal stem, the original's timeline through the edit map): doubled within
    35 cents / a consonant harmony (>= 250 cents from him) / a RUB (60-250 cents: should be ~none); timing vs the grid;
  - WHEW (gasp + relief), the FILM CANISTER, the GOONS' stingers vs the music; the goon FLARE depth on the stems;
  - THE POSTER: the curtain-call applause level after the poster by rank (S vs A vs D), the stings' loudness.
"""
from __future__ import annotations

import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mix_report as MR  # noqa: E402
import stage_report as SR  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def _singer():
    """(song-beat per pYIN frame on the ORIGINAL, MIDI float) or None without the analysis cache"""
    p = os.path.join(HERE, "build", "original", "vocal_pyin.npz")
    g = os.path.join(HERE, "build", "original", "grid.npz")
    if not (os.path.exists(p) and os.path.exists(g)):
        return None
    from original.timegrid import TimeGrid
    d = np.load(p)
    G = TimeGrid(np.load(g, allow_pickle=True)["beats"], 44100)
    return G.file_time_to_beat(d["ft"]), d["midi"]


def _edit_to_song(b):
    off = 0.0
    for a, c in ((0, 130), (246, 461)):
        if b < off + (c - a):
            return a + (b - off)
        off += c - a
    return None


def sound_vs_music(R, name, beats, dur=0.25):
    """each event's sound (X_sfx) vs the music under it (X_music): broadband energy and in the sound's own band"""
    s, m = R.get(name + "_sfx"), R.get(name + "_music")
    if not s or not m:
        return None
    wins = [SR.win(s, b, dur, pre=0.0) for b in beats]
    seg = np.concatenate([s.pre[:, a:b] for a, b in wins], axis=1)
    c, bd = MR.dominant_band(s, wins)
    bb = [SR.epow(s.pre[:, a:b]) - SR.epow(m.pre[:, a:b]) for a, b in wins]
    sb = SR.band(s.pre, s.sr, *bd)
    mb = SR.band(m.pre, m.sr, *bd)
    inb = [SR.epow(sb[:, a:b]) - SR.epow(mb[:, a:b]) for a, b in wins]
    return {"n": len(beats), "vsMusicDb": {"median": round(float(np.median(bb)), 1), "max": round(float(np.max(bb)), 1)},
            "band": c, "inBandDb": {"median": round(float(np.median(inb)), 1), "max": round(float(np.max(inb)), 1)},
            "peakDbfs": round(MR.db(np.max(np.abs(seg))), 1)}


def token_pitch(meta, singer):
    """each token's pitch vs the singer at the moment it sounds"""
    toks = meta.get("tokens") or []
    if not toks or singer is None:
        return None
    fb, midi = singer
    out = {"tokens": len(toks), "melody": 0, "chord": 0, "doubled": 0, "harmony": 0, "rub": 0, "singerSilent": 0,
           "gridErrMs": []}
    rubs = []
    for t in toks:
        out["melody" if t["source"] == "melody" else "chord"] += 1
        sb = _edit_to_song(t["beat"])
        # the singer while the token's bell rings loudest (its first ~0.4 beat)
        sel = (fb >= sb) & (fb < sb + 0.4) if sb is not None else np.zeros(len(fb), bool)
        v = midi[sel][np.isfinite(midi[sel])]
        if len(v) < 3:
            out["singerSilent"] += 1
            continue
        d = ((t["midi"] - float(np.median(v))) * 100) % 1200
        d = min(d, 1200 - d)                      # pitch-class distance, cents (0..600)
        if d <= 35:
            out["doubled"] += 1
        elif d >= 250:
            out["harmony"] += 1
        elif d >= 200:
            out["tension"] = out.get("tension", 0) + 1    # a wide 2nd / narrow 3rd against a bending singer: blue, not wrong
        elif d > 60:
            out["rub"] += 1
            rubs.append({"beat": round(t["beat"], 2), "midi": t["midi"], "singer": round(float(np.median(v)), 2), "cents": round(d), "source": t["source"], "mode": t.get("mode")})
        else:
            out["harmony"] += 1                   # 35-60: a near-unison inside the singer's own vibrato/scoop
    sung = out["tokens"] - out["singerSilent"]
    out["rubPct"] = round(100 * out["rub"] / max(1, sung), 1)
    out["doubledPct"] = round(100 * out["doubled"] / max(1, sung), 1)
    out["rubs"] = rubs[:12]
    # timing: each token's sound vs its beat's nearest grid point (triplets + the swung and)
    sw = MR.BM["audio"]["swingRatio"]
    errs = []
    for t in toks:
        b = MR.time_beat(t["when"])
        k = math.floor(b)
        pts = [k, k + 1 / 3, k + sw, k + 1]
        errs.append(min(abs(MR.beat_time(p) - t["when"]) for p in pts) * 1000)
    out["gridErrMs"] = {"median": round(float(np.median(errs)), 1), "max": round(float(np.max(errs)), 1)}
    return out


def overlay_balance(R, full, comps, b0, b1):
    """each overlay stem vs the record in its own band during its hits (lane-gated), like mix_report's FULL HOUSE"""
    rec = R.get(full + "_record")
    out = {}
    for stem, lanes in comps.items():
        c = R.get(f"{full}_{stem}")
        if not c or not rec:
            continue
        wins = MR.lane_windows(c, lanes, b0, b1)
        if not wins:
            continue
        cb, bd = MR.dominant_band(c, wins)
        out[stem] = {"band": cb, "vsRecordInBandDb": MR.band_ratio(c, rec, wins, bd)}
    return out


def flare_depth(R):
    a, b = R.get("feel_goons_stems"), R.get("feel_goons_stems_ref")
    if not a or not b:
        return None
    out = []
    for e in a.meta.get("feel", []):
        if not e.get("goon"):
            continue
        i0, i1 = SR.win(a, e["beat"], 0.37 * 2.2, pre=0.0)
        out.append({"beat": e["beat"], "part": e["goon"], "flareDb": round(SR.epow(a.pre[:, i0:i1]) - SR.epow(b.pre[:, i0:i1]), 1)})
    return out


def poster(R):
    out = {}
    for L in ("S", "A", "D"):
        r = R.get(f"feel_poster_{L}")
        if not r:
            continue
        pb = next((e["beat"] for e in r.meta.get("feel", []) if e.get("poster")), 347.5)
        a, _ = r.span_post(pb, pb + 1)
        sr = r.sr
        seg = lambda s0, s1: r.post[:, a + int(s0 * sr): a + int(s1 * sr)]
        out[L] = {"stingMomMaxLufs": round(SR.mom_max(seg(0, 2.5), sr), 1),
                  "applause3to6sLufs": round(SR.lufs(seg(3, 6), sr), 1),
                  "truePeakDbtp": round(MR.true_peak(seg(0, 6), sr), 2)}
    return out


def main(d):
    metas = json.load(open(os.path.join(d, "meta.json")))
    R = {m["name"]: MR.Render(d, m) for m in metas if m["name"].startswith("feel")}
    rep = {}
    # ---- the start at 14
    st = {}
    for n in ("feel_intro8", "feel_intro12", "feel_intro14", "feel_intro14_record", "feel_verse14"):
        r = R.get(n)
        if r:
            b0, b1 = r.meta["from"], r.meta["to"]
            st[n] = {**MR.level_report(r, b0 + 1, b1), "limiter": MR.gain_reduction(r, b0 + 1, b1)}
    st["overlaysAt14"] = overlay_balance(R, "feel_intro14", {"stomps": ["stomps", "claps"], "shouts": ["shouts"]}, 0, 40)
    rep["start14"] = st
    # ---- tokens
    singer = _singer()
    tk = {}
    for n in ("feel_tok_chorus", "feel_tok_verse", "feel_lvltok_act1", "feel_lvltok_act3"):
        r = R.get(n)
        if not r:
            continue
        beats = [t["beat"] for t in (r.meta.get("tokens") or [])]
        tk[n] = {"level": sound_vs_music(R, n, beats), "pitch": token_pitch(r.meta, singer),
                 "mix": {**MR.level_report(r, r.meta["from"] + 1, r.meta["to"]), "limiter": MR.gain_reduction(r, r.meta["from"] + 1, r.meta["to"])}}
        m = R.get(n + "_music")
        if m:
            tk[n]["musicOnly"] = MR.level_report(m, m.meta["from"] + 1, m.meta["to"])
    rep["tokens"] = tk
    # ---- whew, canister, goons
    for n, key in (("feel_whew", "whew"), ("feel_canister", "canister"), ("feel_goons", "goon")):
        r = R.get(n)
        if not r:
            continue
        beats = [e["beat"] for e in r.meta.get("feel", []) if e.get(key)]
        rep[n] = {"level": sound_vs_music(R, n, beats, dur=0.4), "level2s": sound_vs_music(R, n, beats, dur=2.0),
                  "mix": {**MR.level_report(r, r.meta["from"] + 1, r.meta["to"]), "limiter": MR.gain_reduction(r, r.meta["from"] + 1, r.meta["to"])}}
    rep["goonFlare"] = flare_depth(R)
    rep["poster"] = poster(R)
    with open(os.path.join(d, "feel_report.json"), "w") as f:
        json.dump(rep, f, indent=1)
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(MR.ROOT, "playtest", "out-audio", "mixlab"))
