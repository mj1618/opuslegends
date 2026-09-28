"""Gameplay lanes extracted from the original recording (demucs stems, lag-compensated) + the transcription.

Everything is timing/pitch only; there are no lyrics anywhere. All positions go through the per-beat TimeGrid, so
`beat` is fractional where the event is off the grid.
"""
from __future__ import annotations

import math

import numpy as np
from scipy import signal

from .beatgrid import band_env, attack_near
from .timegrid import TimeGrid


def _rms_db(x):
    return 10 * math.log10(float(np.mean(x ** 2)) + 1e-20)


def _band(x, sr, lo=None, hi=None, order=4):
    if lo and hi:
        sos = signal.butter(order, [lo, hi], "band", fs=sr, output="sos")
    elif lo:
        sos = signal.butter(order, lo, "high", fs=sr, output="sos")
    else:
        sos = signal.butter(order, hi, "low", fs=sr, output="sos")
    return signal.sosfiltfilt(sos, x)


def _pos_label(frac):
    """position of an event inside its beat: 'on' (downbeat of the beat), 'and' (swung 8th), 'trip' (triplet 2nd),
    or None"""
    if frac < 0.12 or frac > 0.9:
        return "on"
    if 0.56 <= frac <= 0.78:
        return "and"
    if 0.25 <= frac <= 0.42:
        return "trip"
    return None


# -------------------------------------------------------------------------------------------- drums
def drum_hits(drums, sr, G: TimeGrid):
    import librosa
    hop = 128
    oenv = librosa.onset.onset_strength(y=drums, sr=sr, hop_length=hop)
    peaks = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop, units="time", backtrack=False,
                                       delta=0.07, wait=int(0.06 * sr / hop))
    env = band_env(drums, sr, "broad")
    low = _band(drums, sr, hi=120)
    tom = _band(drums, sr, 160, 450)
    snr = _band(drums, sr, 1500, 6000)
    hi = _band(drums, sr, lo=7000)
    rows = []
    for p in peaks:
        r = attack_near(env, sr, p, win=0.025, pre=0.05)
        if r is None:
            continue
        t0 = r[0]
        a = int(t0 * sr)
        f = dict(t=t0, contrast=r[2], peak=r[1],
                 low=_rms_db(low[a:a + int(0.08 * sr)]), tom=_rms_db(tom[a:a + int(0.08 * sr)]),
                 snr=_rms_db(snr[a:a + int(0.06 * sr)]), hi=_rms_db(hi[a:a + int(0.08 * sr)]),
                 hitail=_rms_db(hi[a + int(0.25 * sr):a + int(0.6 * sr)]))
        rows.append(f)
    if not rows:
        return [], {}
    # calibrate kick-vs-snare on the grid: onsets on beats 1/3 are (mostly) kicks, on 2/4 snares
    for f in rows:
        b = float(G.file_time_to_beat(f["t"]))
        f["beat"] = b
        f["frac"] = b - math.floor(b)
        f["bib"] = int(math.floor(b + 0.12)) % 4          # 0-based beat in bar (nearest beat for 'on' hits)
        f["ls"] = f["low"] - f["snr"]
    on13 = [f["ls"] for f in rows if _pos_label(f["frac"]) == "on" and f["bib"] in (0, 2)]
    on24 = [f["ls"] for f in rows if _pos_label(f["frac"]) == "on" and f["bib"] in (1, 3)]
    thr = 0.5 * (np.median(on13) + np.median(on24)) if on13 and on24 else 0.0
    tail_ref = np.median([f["hitail"] for f in rows])
    peak_ref = np.percentile([f["peak"] for f in rows], 95)
    out = []
    for f in rows:
        kinds = []
        if f["hitail"] > tail_ref + 9 and f["hi"] > np.percentile([g["hi"] for g in rows], 70):
            kinds.append("crash")
        if f["ls"] >= thr:
            kinds.append("kick")
        else:
            kinds.append("snare")
        if f["tom"] > f["snr"] + 6 and f["tom"] > f["low"] - 3 and _pos_label(f["frac"]) != "on":
            kinds.append("tom")
        f["kinds"] = kinds
        f["vel"] = round(float(min(1.0, f["peak"] / peak_ref)), 3)
        f["pos"] = _pos_label(f["frac"])
        out.append(f)
    return out, {"kick_snare_threshold_db": round(float(thr), 2)}


def fills(hits, G: TimeGrid, n_bars, min_vel=0.3):
    """Drum fills / phrase-end pushes: bars with strong off-beat hits (swung 'and' or triplet). The original's
    signature fill is an accent on the swung 'and' of 3 then kick+snare on 4 (bars 4, 8, 12, 20, 30, 32-33...).
    accents = the off-beat hits + the on-beat hit that follows them."""
    offs = [f for f in hits if f["pos"] in ("and", "trip") and f["vel"] >= min_vel]
    by_bar = {}
    for f in offs:
        by_bar.setdefault(int(f["beat"] // 4), []).append(f)
    out = []
    for bar, fs in sorted(by_bar.items()):
        if bar >= n_bars:
            continue
        fs.sort(key=lambda f: f["beat"])
        last = fs[-1]["beat"]
        nxt = [f for f in hits if f["pos"] == "on" and last < f["beat"] < last + 1.0]
        acc = [round(f["beat"], 4) for f in fs] + ([round(nxt[0]["beat"], 4)] if nxt else [])
        out.append(G.ev(fs[0]["beat"], bar=bar + 1, accents=acc, endBeat=acc[-1], strength=round(max(f["vel"] for f in fs), 3)))
    return out


# -------------------------------------------------------------------------------------------- bass
def bass_notes(bass, sr, G: TimeGrid):
    import librosa
    hop = 128
    oenv = librosa.onset.onset_strength(y=bass, sr=sr, hop_length=hop)
    on = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop, units="time", backtrack=False,
                                    delta=0.05, wait=int(0.08 * sr / hop))
    y22 = librosa.resample(bass, orig_sr=sr, target_sr=11025)
    f0, vflag, vprob = librosa.pyin(y22, fmin=35, fmax=260, sr=11025, frame_length=1024, hop_length=128)
    ft = librosa.times_like(f0, sr=11025, hop_length=128)
    env = band_env(bass, sr, "broad", smooth_ms=5)
    notes = []
    for i, t in enumerate(on):
        t_end = on[i + 1] if i + 1 < len(on) else t + 0.5
        sel = (ft >= t + 0.03) & (ft < min(t_end, t + 0.35)) & np.isfinite(f0)
        if np.sum(sel) < 2:
            continue
        midi = float(np.median(librosa.hz_to_midi(f0[sel])))
        # note end: envelope falls below 25 % of its peak (or the next onset)
        a, b = int(t * sr), int(t_end * sr)
        seg = env[a:b]
        pk = seg.max() if len(seg) else 0
        k = np.nonzero(seg < 0.25 * pk)[0]
        k = k[k > np.argmax(seg)] if len(k) else k
        te = t + (k[0] / sr if len(k) else (t_end - t))
        b0 = float(G.file_time_to_beat(t))
        b1 = float(G.file_time_to_beat(te))
        notes.append(G.ev(b0, pitch=round(midi), pitchCents=round((midi - round(midi)) * 100), durBeats=round(b1 - b0, 3),
                          dur=round(te - t, 4), vel=round(float(min(1.0, pk / (np.percentile(env, 99.5) + 1e-9))), 3)))
    return notes


# -------------------------------------------------------------------------------------------- vocals
def vocal_lanes(vocals, sr, G: TimeGrid, min_gap_beats=0.66, sustain_beats=0.9):
    """Phrases (start/end, from the vocal stem's envelope) and held notes (pYIN pitch stable >= sustain_beats).
    Timing and pitch only: no words."""
    import librosa
    hop = int(0.01 * sr)
    rms = librosa.feature.rms(y=vocals, frame_length=4 * hop, hop_length=hop)[0]
    db = 20 * np.log10(rms + 1e-9)
    ref = np.percentile(db, 95)
    on = db > ref - 24
    # hysteresis-free: close short gaps
    t = np.arange(len(on)) * hop / sr
    segs = []
    i = 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]:
                j += 1
            segs.append([t[i], t[min(j, len(t) - 1)]])
            i = j
        else:
            i += 1
    merged = []
    for a, b in segs:
        if merged:
            gap = float(G.file_time_to_beat(a) - G.file_time_to_beat(merged[-1][1]))
            if gap < min_gap_beats:
                merged[-1][1] = b
                continue
        merged.append([a, b])
    phrases = []
    for a, b in merged:
        b0, b1 = float(G.file_time_to_beat(a)), float(G.file_time_to_beat(b))
        if b1 - b0 >= 1.0:
            phrases.append(G.ev(b0, endBeat=round(b1, 4), endT=round(float(G.beat_to_time(b1)), 5),
                                durBeats=round(b1 - b0, 3), bar=int(b0 // 4) + 1))
    # held notes
    y = librosa.resample(vocals, orig_sr=sr, target_sr=16000)
    f0, vflag, vprob = librosa.pyin(y, fmin=90, fmax=600, sr=16000, frame_length=1024, hop_length=160)
    ft = librosa.times_like(f0, sr=16000, hop_length=160)
    midi = librosa.hz_to_midi(f0)
    sus = []
    i = 0
    n = len(midi)
    while i < n:
        if not np.isfinite(midi[i]):
            i += 1
            continue
        j = i
        while j + 1 < n and np.isfinite(midi[j + 1]) and abs(midi[j + 1] - np.nanmedian(midi[i:j + 1])) < 0.6:
            j += 1
        b0, b1 = float(G.file_time_to_beat(ft[i])), float(G.file_time_to_beat(ft[j]))
        if b1 - b0 >= sustain_beats:
            m = float(np.nanmedian(midi[i:j + 1]))
            sus.append(G.ev(b0, endBeat=round(b1, 4), endT=round(float(G.beat_to_time(b1)), 5), durBeats=round(b1 - b0, 3),
                            pitch=round(m), pitchCents=round((m - round(m)) * 100), source="vocal", bar=int(b0 // 4) + 1))
        i = j + 1
    return phrases, sus


# -------------------------------------------------------------------------------------------- transcription
def transcription_melody(TR, G: TimeGrid):
    """Melody lane (vocal line as notes, MIDI at sounding pitch; lead-guitar octave = +12) and hook moments."""
    mel = []
    for vname, v in TR["melody"]["verses"].items():
        for ph in v["phrases"]:
            for n in ph:
                mel.append(G.ev(n["songBeat"], pitch=n["midi"], durBeats=n["dur"], section=vname, source="transcription"))
    chorus_bars = [23, 52, 81, 98]
    for ci, cb in enumerate(chorus_bars):
        for n in TR["melody"]["chorusCanonical"]["notes"]:
            b = (cb - 1) * 4 + n["relBeat"]
            mel.append(G.ev(b, pitch=n["midi"], durBeats=n["dur"], section=f"chorus{ci + 1}", source="transcription"))
    mel.sort(key=lambda e: e["beat"])
    hooks = []
    for ci, cb in enumerate(chorus_bars):
        c0 = (cb - 1) * 4
        hooks.append(G.ev(c0 - 1, endBeat=c0 + 5, name="line1", desc="chorus line 1 (A7 -> E7), first thing heard",
                          chorus=ci + 1, priority=3))
        hooks.append(G.ev(c0 + 24, endBeat=c0 + 30, name="hookA", desc="HOOK A, the title line, over the B7 bass "
                          "walkdown B-A-G-F# -> E (the most recognisable phrase)", chorus=ci + 1, priority=1))
        hooks.append(G.ev(c0 + 30, endBeat=c0 + 36, name="hookB", desc="HOOK B, the tag (G A A | B A G A G G)",
                          chorus=ci + 1, priority=2))
    for vb, vi in ((17, 1), (46, 2), (75, 3)):
        hooks.append(G.ev((vb - 1) * 4, endBeat=(vb - 1) * 4 + 4, name="versePeak", desc="verse peak: the D held on "
                          "beat 1 of the first B7 bar", verse=vi, priority=4))
    for k, bar in enumerate(range(107, 119, 2)):
        # outro: the tag's B lands on bars 108, 110, ... (pickup in the bar before)
        hooks.append(G.ev((bar - 1) * 4 + 2, endBeat=(bar - 1) * 4 + 8, name="hookB", desc="HOOK B (outro repeat)",
                          outroRepeat=k + 1, priority=2))
    hooks.sort(key=lambda e: e["beat"])
    return mel, hooks


def transcription_phrases(TR, G: TimeGrid):
    """Vocal phrase spans from the transcription (verses: its phrase list; choruses: the canonical phrase map)."""
    out = []
    for vname, v in TR["melody"]["verses"].items():
        for k, ph in enumerate(v["phrases"]):
            b0 = ph[0]["songBeat"]
            b1 = ph[-1]["songBeat"] + ph[-1]["dur"]
            out.append(G.ev(b0, endBeat=round(b1, 4), endT=round(float(G.beat_to_time(b1)), 5), durBeats=round(b1 - b0, 3),
                            bar=int(b0 // 4) + 1, section=vname, phrase=k + 1, source="transcription"))
    spans = {"line1": (-1.0, 5.0), "line2": (6.67, 13.0), "line3": (14.67, 24.0), "hookA": (24.0, 30.0),
             "hookB": (30.0, 36.0)}
    for ci, cb in enumerate([23, 52, 81, 98]):
        c0 = (cb - 1) * 4
        for name, (r0, r1) in spans.items():
            b0 = c0 + math.floor(r0) + (0.5 if abs((r0 % 1) - 0.67) < 0.03 else r0 % 1)
            b1 = c0 + r1
            out.append(G.ev(b0, endBeat=b1, endT=round(float(G.beat_to_time(b1)), 5), durBeats=round(b1 - b0, 3),
                            bar=int(b0 // 4) + 1, section=f"chorus{ci + 1}", phrase=name, source="transcription"))
    return out


BASS_FIGS = {
    # name: (bar list, [(beat-in-bar 1-based float, note)])  (from jim_transcription.json 'figures.bass')
}


def bass_walks(TR, G: TimeGrid, bass_notes_lane, form):
    """The song's signature bass figures placed where the transcription says they occur, each note snapped to the
    detected bass onset (within 70 ms) when there is one."""
    F = TR["figures"]["bass"]
    placements = []
    chords = {c["bar"]: c["chord"] for c in TR["chordsPerBar"]}
    sec_of = {}
    for s in form:
        for b in range(s["bars"][0], s["bars"][1] + 1):
            sec_of[b] = s["name"]
    for bar in range(1, 120):
        sec = sec_of.get(bar, "")
        if sec.startswith("chorus"):
            rel = bar - [s for s in form if s["name"] == sec][0]["bars"][0]
            if chords.get(bar, "").startswith("A7"):
                placements.append(("chorusA7", bar))
            elif rel == 6:
                placements.append(("hookWalkdown", bar))
            elif chords.get(bar, "").startswith("E7") and rel in (1, 3):
                placements.append(("chorusE7", bar))
        elif sec.startswith("prechorus") and bar == [s for s in form if s["name"] == sec][0]["bars"][1]:
            placements.append(("prechorusWalkup", bar))
        elif sec.startswith("turnaround") and bar == [s for s in form if s["name"] == sec][0]["bars"][0]:
            placements.append(("turnaroundB7", bar))
        elif sec == "verse3" and 63 <= bar <= 70 and (bar - 63) % 2 == 0:
            placements.append(("verseBoogie", bar))
        elif sec in ("breakdown", "outro") and bar % 2 == 1:
            placements.append(("breakdownPickup", bar))
    import librosa
    det = [(e["t"], e["pitch"]) for e in bass_notes_lane]
    det_t = np.array([d[0] for d in det])
    out = []
    for name, bar in placements:
        fig = F[name]["notes"]
        notes = []
        for nm, bib, dur in fig:
            b = (bar - 1) * 4 + (float(bib) - 1)
            b = math.floor(b) + (0.5 if abs((b % 1) - 0.67) < 0.03 else (b % 1))  # transcription .67 = swung 'and'
            t = float(G.beat_to_time(b))
            snapped = False
            if len(det_t):
                k = int(np.argmin(np.abs(det_t - t)))
                if abs(det_t[k] - t) < 0.07:
                    t = float(det_t[k])
                    b = float(G.time_to_beat(t))
                    snapped = True
            notes.append({"beat": round(b, 4), "t": round(t, 5), "pitch": int(round(librosa.note_to_midi(nm))),
                          "durBeats": dur, "detected": snapped})
        out.append(G.ev(notes[0]["beat"], name=name, bar=bar, desc=F[name]["desc"], notes=notes,
                        endBeat=round(notes[-1]["beat"] + notes[-1]["durBeats"], 4)))
    return out


# -------------------------------------------------------------------------------------------- texture
def per_beat_db(x, sr, G: TimeGrid, file_times):
    out = np.full(G.n - 1, -120.0)
    for i in range(G.n - 1):
        a, b = int(file_times[i] * sr), int(file_times[i + 1] * sr)
        if b > a:
            out[i] = _rms_db(x[a:b])
    return out


def stop_time(bass, drums, rest, sr, G: TimeGrid, file_times):
    """bassOut: runs (>= 2 beats) where the bass lays out (the original's verse stop-time).
    stops: beats where the whole band drops > 15 dB below its local level (true band stops)."""
    bdb = per_beat_db(bass, sr, G, file_times)
    ref = np.percentile(bdb[bdb > -100], 75)
    out_b = bdb < ref - 14
    runs = []
    i = 0
    while i < len(out_b):
        if out_b[i]:
            j = i
            while j < len(out_b) and out_b[j]:
                j += 1
            if j - i >= 2:
                runs.append((i, j))
            i = j
        else:
            i += 1
    bass_out = [G.ev(a, endBeat=b, beats=b - a, bar=a // 4 + 1, endBar=(b - 1) // 4 + 1) for a, b in runs]
    band = per_beat_db(drums + rest, sr, G, file_times)
    loc = np.array([np.median(band[max(0, i - 8):i + 8]) for i in range(len(band))])
    st = np.nonzero(band < loc - 15)[0]
    stops = [G.ev(int(i), beats=1, kind="stop", dropDb=round(float(loc[i] - band[i]), 1)) for i in st]
    return bass_out, stops


def energy_per_bar(mix, stems, sr, G: TimeGrid, file_times, hits, n_bars):
    """One event per bar: loudness (dB RMS of the mix), per-stem dB, drum-hit density, and a 0..1 intensity."""
    rows = []
    for bar in range(n_bars):
        i0, i1 = bar * 4, min(bar * 4 + 4, G.n - 1)
        a, b = int(file_times[i0] * sr), int(file_times[i1] * sr)
        r = {"mixDb": round(_rms_db(mix[a:b]), 2)}
        for k, v in stems.items():
            r[k + "Db"] = round(_rms_db(v[a:b]), 1)
        r["drumHits"] = int(sum(1 for h in hits if i0 <= h["beat"] < i1 and h["vel"] >= 0.2))
        rows.append(r)
    mdb = np.array([r["mixDb"] for r in rows])
    dens = np.array([r["drumHits"] for r in rows], float)
    lo, hi = np.percentile(mdb, 5), np.percentile(mdb, 98)
    for bar, r in enumerate(rows):
        lv = np.clip((r["mixDb"] - lo) / (hi - lo + 1e-9), 0, 1)
        dn = np.clip(dens[bar] / (np.percentile(dens, 95) + 1e-9), 0, 1)
        r["intensity"] = round(float(0.7 * lv + 0.3 * dn), 3)
    return [G.ev(bar * 4, bar=bar + 1, **r) for bar, r in enumerate(rows)]
