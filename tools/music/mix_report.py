"""Analysis of the offline mix-lab renders (node src/audio/lab/mixlab.mjs) — ears for agents that can't listen.

    tools/music/.venv/bin/python tools/music/mix_report.py playtest/out-audio/mixlab

Each render is a 4-channel float WAV: ch 0-1 = the master output (after limiter + soft clip), ch 2-3 = the
pre-limiter mix (after the headroom trim; linear, so component renders add up). Reports:
  - loudness (BS.1770 integrated / max short-term LUFS) and true peak of the master;
  - limiter activity: gain reduction per 10 ms block, and its BEAT-LOCKED modulation depth (= audible pumping);
  - the booth: spectrum and stereo width of the record through the closed vs the open booth;
  - FULL HOUSE: each overlay vs the record IN THE OVERLAY'S OWN BAND during its events (lane-gated);
  - grade bells vs the record in the bell's band; the journey's loudness per bar;
  - click test: high-frequency transients on a steady tone while the booth moves, snags and warbles.
Writes <dir>/report.json.
"""
from __future__ import annotations

import json
import math
import os
import sys

import numpy as np
import soundfile as sf
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from producer import loudness  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BM = json.load(open(os.path.join(ROOT, "assets", "audio", "jim_edit.beatmap.json")))
BEAT_T = np.array([b["t"] for b in BM["beats"]])
LANE_SR = BM["audio"]["sampleRate"]
OFFSET = BM["song"]["audioOffset"]


def db(x):
    return 20 * math.log10(max(float(x), 1e-12))


def pdb(x):
    return 10 * math.log10(max(float(x), 1e-20))


def beat_time(b):
    i = int(math.floor(b))
    i = min(max(i, 0), len(BEAT_T) - 2)
    return BEAT_T[i] + (b - i) * (BEAT_T[i + 1] - BEAT_T[i])


def time_beat(t):
    i = int(np.clip(np.searchsorted(BEAT_T, t) - 1, 0, len(BEAT_T) - 2))
    return i + (t - BEAT_T[i]) / (BEAT_T[i + 1] - BEAT_T[i])


def true_peak(x, sr):
    y = signal.resample_poly(x, 4, 1, axis=-1)
    return db(np.max(np.abs(y)))


class Render:
    def __init__(self, d, meta):
        self.meta = meta
        x, self.sr = sf.read(os.path.join(d, meta["name"] + ".wav"), always_2d=True)
        x = x.T
        self.post, self.pre = x[:2], x[2:4]
        self.t0_pre = meta["songTimeAtSample0Pre"]
        self.t0_post = meta["songTimeAtSample0Post"]

    def idx_pre(self, song_t):
        return int(round((song_t - self.t0_pre) * self.sr))

    def span_pre(self, b0, b1):
        return max(0, self.idx_pre(beat_time(b0))), min(self.pre.shape[1], self.idx_pre(beat_time(b1)))

    def span_post(self, b0, b1):
        f = lambda b: int(round((beat_time(b) - self.t0_post) * self.sr))
        return max(0, f(b0)), min(self.post.shape[1], f(b1))


def gain_reduction(r: Render, b0, b1):
    """per-10 ms block GR (dB) of the master vs the pre-limiter mix (aligned by the limiter delay)"""
    a, b = r.span_pre(b0, b1)
    d = int(round(r.meta["limiterDelay"] * r.sr))
    pre = r.pre[:, a:b]
    post = r.post[:, a + d:b + d]
    n = min(pre.shape[1], post.shape[1])
    blk = int(0.01 * r.sr)
    m = n // blk
    pe = np.sqrt(np.mean(pre[:, :m * blk].reshape(2, m, blk) ** 2, axis=(0, 2)))
    po = np.sqrt(np.mean(post[:, :m * blk].reshape(2, m, blk) ** 2, axis=(0, 2)))
    ok = pe > 10 ** (-40 / 20)
    # the pre-limiter tap sits after the trim, which cancels the limiter's makeup gain: take it back out
    mk = db(r.meta.get("limiterMakeup", 1.0))
    gr = np.where(ok, 20 * np.log10(np.maximum(po, 1e-9) / np.maximum(pe, 1e-9)) - mk, 0.0)
    # beat-locked modulation: mean GR by beat phase (16 bins), max - min
    tms = r.t0_pre + (a + (np.arange(m) + 0.5) * blk) / r.sr
    phase = np.array([time_beat(t) % 1.0 for t in tms])
    bins = np.floor(phase * 16).astype(int)
    prof = np.array([gr[bins == k].mean() if np.any(bins == k) else 0 for k in range(16)])
    return {
        "blocksOver0.5dB%": round(100 * float(np.mean(gr < -0.5)), 1),
        "blocksOver1dB%": round(100 * float(np.mean(gr < -1)), 1),
        "blocksOver2dB%": round(100 * float(np.mean(gr < -2)), 1),
        "maxGrDb": round(float(-gr.min()), 2),
        "beatLockedGrDepthDb": round(float(prof.max() - prof.min()), 2),
    }


def level_report(r: Render, b0, b1):
    a, b = r.span_post(b0, b1)
    x = r.post[:, a:b]
    ap, bp = r.span_pre(b0, b1)
    return {
        "integratedLufs": round(loudness.integrated_lufs(x, r.sr), 1),
        "maxShortTermLufs": round(float(np.max(loudness.short_term_lufs(x, r.sr))), 1),
        "truePeakDbtp": round(true_peak(x, r.sr), 2),
        "prePeakDbfs": round(db(np.max(np.abs(r.pre[:, ap:bp]))), 2),
    }


HALF_OCT = [63, 125, 250, 500, 700, 1000, 1400, 2000, 2800, 4000, 5600, 8000, 11000, 16000]


def band_levels(x, sr):
    f, P = signal.welch(x.mean(axis=0), sr, nperseg=8192)
    return {c: pdb(P[(f >= c / 2 ** 0.25) & (f < c * 2 ** 0.25)].sum()) for c in HALF_OCT}


def width(x):
    m, s = (x[0] + x[1]) / 2, (x[0] - x[1]) / 2
    return pdb(np.mean(s ** 2)) - pdb(np.mean(m ** 2))


def lane_windows(r: Render, lanes, b0, b1, win=0.1):
    out = []
    for ln in lanes:
        for e in BM["lanes"][ln]:
            if not (b0 <= e["beat"] < b1):
                continue
            st = e["sample"] / LANE_SR - OFFSET
            i = r.idx_pre(st)
            out.append((i, i + int(win * r.sr)))
    return out


def band_ratio(comp: Render, rec: Render, wins, band):
    lo, hi = band
    sos = signal.butter(4, [lo, hi], btype="band", fs=comp.sr, output="sos")
    c = signal.sosfilt(sos, comp.pre.mean(axis=0))
    r = signal.sosfilt(sos, rec.pre.mean(axis=0))
    ec = [np.mean(c[a:b] ** 2) for a, b in wins if b <= len(c)]
    er = [np.mean(r[a:b] ** 2) for a, b in wins if b <= len(r)]
    return round(pdb(np.mean(ec)) - pdb(np.mean(er)), 1)  # energy over all event windows


def dominant_band(comp: Render, wins):
    seg = np.concatenate([comp.pre[:, a:b] for a, b in wins if b <= comp.pre.shape[1]], axis=1)
    bl = band_levels(seg, comp.sr)
    c = max(bl, key=bl.get)
    return c, (c / 2 ** 0.25, c * 2 ** 0.25)


def main(d):
    metas = json.load(open(os.path.join(d, "meta.json")))
    R = {m["name"]: Render(d, m) for m in metas}
    rep = {"levels": {}, "limiter": {}}
    CH = (88, 120)  # chorus 1
    for name, r in R.items():
        if name.startswith("full_") and name != "full_nosfx":
            continue
        sc = r.meta["scenario"]
        span = CH if name.startswith("full") or name in ("booth", "mid") or name.startswith("record") else (sc["from"] + 1, sc["to"] - 1)
        rep["levels"][name] = level_report(r, *span)
        rep["limiter"][name] = gain_reduction(r, *span)

    if "record_open" in R and "record_booth" in R:
        o, b = R["record_open"], R["record_booth"]
        ao, bo = o.span_pre(*CH)
        ab, bb = b.span_pre(*CH)
        lo, lb = band_levels(o.pre[:, ao:bo], o.sr), band_levels(b.pre[:, ab:bb], b.sr)
        rep["booth"] = {
            "boothMinusOpenByBandDb": {c: round(lb[c] - lo[c], 1) for c in HALF_OCT},
            "sideMinusMidDb": {"open": round(width(o.pre[:, ao:bo]), 1), "booth": round(width(b.pre[:, ab:bb]), 1)},
            "lufsOpen": rep["levels"]["record_open"]["integratedLufs"],
            "lufsBooth": rep["levels"]["record_booth"]["integratedLufs"],
        }
    if "full_record" in R:
        rec = R["full_record"]
        ov = {}
        for comp, lanes in [("full_cowbell", ["cowbell"]), ("full_stomps", ["stomps"]), ("full_stomps", ["claps"]), ("full_shouts", ["shouts"])]:
            if comp not in R:
                continue
            c = R[comp]
            wins = lane_windows(c, lanes, *CH) or lane_windows(c, lanes, 80, 124)
            if not wins:
                continue
            centre, band = dominant_band(c, wins)
            ov[f"{comp[5:]}:{lanes[0]}"] = {
                "events": len(wins),
                "dominantBandHz": centre,
                "vsRecordInDominantBandDb": band_ratio(c, rec, wins, band),
                "vsRecordBroadband300_5kDb": band_ratio(c, rec, wins, (300, 5000)),
            }
        rep["fullHouseOverlays"] = ov
        if "full_bells" in R:
            c = R["full_bells"]
            wins = []
            for bt in range(*CH):
                i = c.idx_pre(beat_time(bt))
                wins.append((i, i + int(0.15 * c.sr)))
            centre, band = dominant_band(c, wins)
            rep["bells"] = {"dominantBandHz": centre, "vsRecordInBandDb": band_ratio(c, rec, wins, band),
                            "vsRecordBroadbandDb": band_ratio(c, rec, wins, (60, 16000))}
        if "full_cheers" in R:
            # the audience cheering into the vocal gaps: 1 s windows where the cheer is active
            c = R["full_cheers"]
            a0, b0 = c.span_pre(*CH)
            m = loudness.momentary_lufs(c.pre[:, a0:b0], c.sr)
            mr = loudness.momentary_lufs(rec.pre[:, a0:b0], rec.sr)
            n = min(len(m), len(mr))
            act = m[:n] > np.max(m[:n]) - 10
            rep["gapCheers"] = {"activeSec": round(float(np.sum(act)) * 0.1, 1),
                                "medianDbVsRecordWhenActive": round(float(np.median(m[:n][act] - mr[:n][act])), 1)}
        # loudness bloom: booth vs full house, record + overlays
        if "full_nosfx" in R:
            rep["bloom"] = {k: rep["levels"][k]["integratedLufs"] for k in ("record_booth", "booth", "mid", "record_open", "full_nosfx", "full") if k in rep["levels"]}
    if "journey" in R:
        j = R["journey"]
        rows = []
        sc = j.meta["scenario"]
        for bar0 in range(int(sc["from"]) // 4 * 4 + 4, int(sc["to"]) - 4, 4):
            a, b = j.span_post(bar0, bar0 + 4)
            crowd = [e["crowd"] for e in sc["events"] if "crowd" in e and e["beat"] < bar0 + 4]
            rows.append({"bar": bar0 // 4 + 1, "crowd": crowd[-1] if crowd else sc["crowd"],
                         "momentaryLufs": round(float(np.median(loudness.momentary_lufs(j.post[:, a:b], j.sr))), 1),
                         "width": round(width(j.post[:, a:b]), 1)})
        rep["journeyByBar"] = rows
        rep["limiter"]["journey_chorus"] = gain_reduction(j, *CH)
    if "journey_sfx" in R and "full_record" in R:
        s = R["journey_sfx"]
        misses = [e["beat"] for e in s.meta["scenario"]["events"] if e.get("miss")]
        # thunk lands on the next swung 8th after the judge expiry: window the beat + 0.5 .. +1
        wins = [(s.idx_pre(beat_time(b + 0.4)), s.idx_pre(beat_time(b + 1.0))) for b in misses]
        ecs = [np.max(np.abs(s.pre[:, a:b])) for a, b in wins]
        rep["miss"] = {"thunkPeakDbfs": round(db(max(ecs)), 1)}
    if "journey_sfx" in R and "journey" in R:
        # each theatre sound vs the music under it (momentary loudness, 400 ms from the event; linear
        # pre-limiter channels: music = journey - journey_sfx)
        s, j = R["journey_sfx"], R["journey"]
        music = j.pre - s.pre
        evs = s.meta["scenario"]["events"]
        full_at = next((e["beat"] for e in evs if e.get("crowd", 0) >= 20), None)
        spots = {"perfect": [e["beat"] for e in evs if e.get("grade") == "perfect"],
                 "great": [e["beat"] for e in evs if e.get("grade") == "great"],
                 "miss": [e["beat"] + 0.5 for e in evs if e.get("miss")],
                 "stumble": [e["beat"] + 0.1 for e in evs if e.get("stumble")],
                 "checkpoint": [math.ceil(e["beat"] + 0.05) for e in evs if e.get("checkpoint")],
                 "fullHouseCheer": [math.ceil((full_at + 0.01) / 4) * 4] if full_at is not None else []}
        out = {}
        for k, beats in spots.items():
            diffs = []
            for b in beats:
                i = s.idx_pre(beat_time(b)) - int(0.03 * s.sr)
                w = int((1.2 if k == "fullHouseCheer" else 0.4) * s.sr)
                if i < 0 or i + w > music.shape[1]:
                    continue
                diffs.append(loudness.integrated_lufs(s.pre[:, i:i + w], s.sr) - loudness.integrated_lufs(music[:, i:i + w], s.sr))
            diffs = [x for x in diffs if math.isfinite(x)]
            if diffs:
                out[k] = {"n": len(diffs), "medianDbVsMusic": round(float(np.median(diffs)), 1), "maxDbVsMusic": round(float(np.max(diffs)), 1)}
        rep["sfxVsMusic"] = out
    if "clicktest" in R:
        c = R["clicktest"]
        a, b = c.span_pre(56, 120)
        sos = signal.butter(8, 7000, btype="high", fs=c.sr, output="sos")
        hf = signal.sosfilt(sos, c.pre[:, a:b], axis=-1)
        blk = int(0.005 * c.sr)
        m = hf.shape[1] // blk
        e = np.sqrt(np.mean(hf[:, :m * blk].reshape(2, m, blk) ** 2, axis=(0, 2)))
        tone = np.sqrt(np.mean(c.pre[:, a:b] ** 2))
        worst = [round(time_beat(c.t0_pre + (a + (k + 0.5) * blk) / c.sr), 2) for k in np.argsort(e)[-3:][::-1]]
        rep["clicktest"] = {"toneRmsDbfs": round(db(tone), 1), "maxHf5msDbfs": round(db(e.max()), 1), "worstAtBeats": worst,
                            "medianHf5msDbfs": round(db(np.median(e)), 1),
                            "hfWorstVsToneDb": round(db(e.max()) - db(tone), 1)}
    json.dump(rep, open(os.path.join(d, "report.json"), "w"), indent=1)
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "playtest", "out-audio", "mixlab"))
