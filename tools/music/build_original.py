#!/usr/bin/env python3
"""Beat map, lanes, level edit and reward overlays for the ORIGINAL recording of "You Don't Mess Around with Jim".

Run with the analysis venv (librosa + demucs):
    tools/music/.venv/bin/python tools/music/build_original.py [--stage all|grid|lanes|full|edit|shouts]

Inputs (never committed):  reference/jim_croce_original.mp3  (copied to assets/audio/licensed/jim_original.mp3)
Stems (gitignored build):  tools/music/build/original/demucs/htdemucs_6s/jim_croce_original/*.wav  (demucs htdemucs_6s)
Outputs:
  assets/audio/jim_original.beatmap.json        full song: per-beat tempo map, bars, sections, lanes (committed)
  assets/audio/jim_edit.beatmap.json            the level edit (committed)
  assets/audio/licensed/jim_original.{ogg,mp3}  full song (NOT committed)
  assets/audio/licensed/jim_edit.{ogg,mp3}      the edit (NOT committed)
  assets/audio/stems/jim_overlay/*.ogg           reward overlays for the full song (our own audio, committed)
  assets/audio/stems/jim_edit_overlay/*.ogg      the same overlays cut like the edit (committed)
  tools/music/reports/jim_original.*             verification report + click-track check
No lyrics anywhere: vocal phrases are timing/pitch only; melody notes come from jim_transcription.json.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

import numpy as np  # noqa: E402
from scipy import signal  # noqa: E402
from scipy.io import wavfile  # noqa: E402

from original.beatgrid import build_grid, swing_ratio, band_env, attack_near  # noqa: E402

SR = 44100
SRC = os.path.join(ROOT, "reference", "jim_croce_original.mp3")
LIC = os.path.join(ROOT, "assets", "audio", "licensed")
DEMUCS = os.path.join(HERE, "build", "original", "demucs", "htdemucs_6s", "jim_croce_original")
BUILD = os.path.join(HERE, "build", "original")
REPORTS = os.path.join(HERE, "reports")
TR = json.load(open(os.path.join(HERE, "songs", "jim_transcription.json")))

ANCHOR_T = 0.14          # song bar 1 beat 1 (transcription, from the beat grid of the original)
N_BARS = 119
N_BEATS = N_BARS * 4


def decode(path, sr=SR, mono=False):
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(sr), "-"],
                       capture_output=True, check=True)
    x = np.frombuffer(p.stdout, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)
    return x.mean(axis=0) if mono else x


_STEM_LAG = None


def _read_stem(name):
    sr, x = wavfile.read(os.path.join(DEMUCS, f"{name}.wav"))
    kind = x.dtype.kind
    x = x.astype(np.float64)
    if kind == "i":
        x = x / 32768.0
    x = x.T
    if sr != SR:
        x = signal.resample_poly(x, SR, sr, axis=-1)
    return x


def stem_lag():
    """Samples by which the demucs stems lag the ffmpeg-decoded mix. demucs decoded the MP3 without honouring the
    LAME gapless header (encoder delay), so its stems are late (measured: 1105 samples = 25.06 ms)."""
    global _STEM_LAG
    if _STEM_LAG is None:
        mix = decode(SRC, mono=True)
        s = sum(_read_stem(n).mean(axis=0) for n in ("drums", "bass", "guitar", "piano", "vocals", "other"))
        a, b = mix[int(10 * SR):int(40 * SR)], s[int(10 * SR):int(40 * SR)]
        c = signal.correlate(b, a, mode="full", method="fft")
        _STEM_LAG = int(np.argmax(c) - (len(a) - 1))
    return _STEM_LAG


def stem(name, mono=True):
    """demucs stem on the ffmpeg-decoded timeline of the original (lag-compensated), SR, mono or (2, n)."""
    x = _read_stem(name)
    lag = stem_lag()
    if lag > 0:
        x = np.concatenate([x[:, lag:], np.zeros((2, lag))], axis=1)
    elif lag < 0:
        x = np.concatenate([np.zeros((2, -lag)), x[:, :lag]], axis=1)
    return x.mean(axis=0) if mono else x


def rel(p):
    return os.path.relpath(p, ROOT)


# ======================================================================================== grid
def stage_grid():
    import librosa
    drums = stem("drums")
    oenv = librosa.onset.onset_strength(y=drums, sr=SR, hop_length=256, aggregate=np.median)
    _, coarse = librosa.beat.beat_track(onset_envelope=oenv, sr=SR, hop_length=256, start_bpm=164, tightness=400,
                                        units="time")
    g = build_grid(drums, SR, ANCHOR_T, N_BEATS + 1, np.asarray(coarse))   # +1: the end of the last bar
    beats = g["times"]
    mix = decode(SRC, mono=True)
    swing = swing_ratio(stem("guitar") + 0.5 * drums, SR, beats)
    rep = verify(beats, g, mix, drums)
    rep["swing"] = {"median": round(float(np.nanmedian(swing)), 4), "p25": round(float(np.nanpercentile(swing, 25)), 4),
                    "p75": round(float(np.nanpercentile(swing, 75)), 4), "measured_beats": int(np.sum(np.isfinite(swing)))}
    np.savez(os.path.join(BUILD, "grid.npz"), beats=beats, hits=g["hits"], used=g["used"], contrast=g["contrast"],
             swing=swing)
    with open(os.path.join(REPORTS, "jim_original.grid.json"), "w") as f:
        json.dump(rep, f, indent=1)
    print(json.dumps(rep, indent=1))
    return beats, rep


def verify(beats, g, mix, drums):
    """Accuracy of the grid against (a) an independent onset detector on the full mix (librosa spectral flux,
    backtracked), (b) the engine's analyzeBeatAlignment (ported), (c) a click-track mix for a human listen."""
    import librosa
    from producer.analyze import engine_beat_alignment
    res = g["residual"][g["used"]] * 1000
    allres = g["residual"][np.isfinite(g["residual"])] * 1000
    rep = {"beats": len(beats), "stem_lag_compensated_samples": stem_lag(), "clean_hits_used": int(np.sum(g["used"])),
           "grid_vs_drum_hits_ms": {"n": int(len(allres)), "mean_abs": round(float(np.mean(np.abs(allres))), 2),
                                    "p90_abs": round(float(np.percentile(np.abs(allres), 90)), 2),
                                    "max_abs": round(float(np.max(np.abs(allres))), 2),
                                    "within_10ms_pct": round(float(np.mean(np.abs(allres) <= 10) * 100), 1),
                                    "beats_1_3_mean": round(float(np.nanmean(g["residual"][0::2]) * 1000), 2),
                                    "beats_2_4_mean": round(float(np.nanmean(g["residual"][1::2]) * 1000), 2)},
           "bpm_range": [round(float(60 / np.max(np.diff(beats))), 2), round(float(60 / np.min(np.diff(beats))), 2)]}
    # tempo drift by bar groups
    bpm_bars = [60 / float(np.mean(np.diff(beats[b * 4:(b + 1) * 4 + 1]))) for b in range(N_BARS - 1)]
    rep["bpm_first8bars"] = round(float(np.mean(bpm_bars[:8])), 2)
    rep["bpm_last8bars"] = round(float(np.mean(bpm_bars[-9:-1])), 2)
    ibi = np.diff(beats)
    loc = np.convolve(ibi, np.ones(9) / 9, mode="same")
    rep["beat_jitter_ms_sd"] = round(float(np.std((ibi - loc)[8:-8]) * 1000), 2)
    # (a) independent onsets on the full mix
    hop = 64
    on = librosa.onset.onset_detect(y=mix, sr=SR, hop_length=hop, backtrack=True, units="time",
                                    onset_envelope=librosa.onset.onset_strength(y=mix, sr=SR, hop_length=hop))
    errs = []
    for t in beats:
        k = np.searchsorted(on, t)
        cand = [on[j] for j in (k - 1, k) if 0 <= j < len(on)]
        if cand:
            d = min(cand, key=lambda c: abs(c - t)) - t
            if abs(d) <= 0.05:
                errs.append(d * 1000)
    errs = np.array(errs)
    rep["vs_independent_onsets_ms"] = {"n": int(len(errs)), "median": round(float(np.median(errs)), 2),
                                       "mean_abs": round(float(np.mean(np.abs(errs))), 2),
                                       "p90_abs": round(float(np.percentile(np.abs(errs), 90)), 2),
                                       "max_abs": round(float(np.max(np.abs(errs))), 2),
                                       "within_10ms_pct": round(float(np.mean(np.abs(errs) <= 10) * 100), 1)}
    # (b) the engine's own heuristic, on the full mix
    ea = engine_beat_alignment(np.stack([mix, mix]), SR, [int(round(t * SR)) for t in beats])
    rep["engine_check_ms"] = {"n": int(len(ea)), "mean": round(float(np.mean(ea)), 2),
                              "mean_abs": round(float(np.mean(np.abs(ea))), 2),
                              "p90_abs": round(float(np.percentile(np.abs(ea), 90)), 2)}
    # (c) click track over the song (downbeats higher), and the click-vs-drum-hit check on the mixed file
    click = np.zeros_like(mix)
    n = int(0.012 * SR)
    tt = np.arange(n) / SR
    for i, t in enumerate(beats):
        f = 2000.0 if i % 4 == 0 else 1400.0
        c = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.003)
        k = int(round(t * SR))
        click[k:k + n] += c[: len(click) - k] * 0.35
    both = np.stack([0.7 * mix + click, 0.7 * mix + click])
    wavfile.write(os.path.join(BUILD, "click_check.wav"), SR, both.T.astype(np.float32))
    # detect the click (2 kHz-band attack) and the drum hit in the drum stem around each beat, compare
    cl_env = band_env(click, SR, "broad")
    dr_env = {k: band_env(drums, SR, k) for k in ("kick", "snare")}
    d = []
    for i, t in enumerate(beats):
        rc = attack_near(cl_env, SR, t, win=0.02)
        rd = attack_near(dr_env["kick" if i % 2 == 0 else "snare"], SR, t, win=0.03)
        if rc and rd and rd[2] > 8:
            d.append((rd[0] - rc[0]) * 1000)
    d = np.array(d)
    rep["click_vs_drum_hit_ms"] = {"n": int(len(d)), "mean_abs": round(float(np.mean(np.abs(d))), 2),
                                   "p90_abs": round(float(np.percentile(np.abs(d), 90)), 2),
                                   "max_abs": round(float(np.max(np.abs(d))), 2),
                                   "within_10ms_pct": round(float(np.mean(np.abs(d) <= 10) * 100), 1)}
    return rep


# ======================================================================================== beat map writer
CHORD_TONES = {"E": [0, 4, 7], "E7": [0, 4, 7, 10], "A7": [5, 9, 12, 15], "B7": [7, 11, 14, 17], "A": [5, 9, 12],
               "B": [7, 11, 14]}
E_MIXO = [0, 2, 4, 5, 7, 9, 10]
KEY = {"root": 40, "scale": E_MIXO}
SECTION_LABEL = {
    "intro": "Intro: band only (drums, bass, acoustic guitars on E)",
    "verse": "Verse: vocal melody; 8 bars E then A7/B7 (second half is stop-time: the bass lays out)",
    "prechorus": "Pre-chorus: 2 bars E, bass walk-up E-F#-G# into the chorus",
    "chorus": "Chorus: A7 E7 A7 E7 A7 A7 B7(walkdown) E; hook A = bars 7-8",
    "tag": "Tag: hook B (the post-chorus tag hook)",
    "turnaround": "Turnaround: 2 bars B7, piano B-octave stabs on every beat, bass walk-up to E",
    "breakdown": "Breakdown: 8-bar E vamp, bass quarters + chromatic pickup every 2nd bar, spoken-style vocal",
    "outro": "Outro: E vamp, the tag repeats every 2 bars, fades from ~bar 116",
}


def sections_from_form(G, energy_rows=None):
    out = []
    for s in TR["form"]:
        b0, b1 = s["bars"][0], s["bars"][1]
        base = "".join(c for c in s["name"] if not c.isdigit())
        sb, eb = (b0 - 1) * 4, b1 * 4
        d = {"name": s["name"], "label": SECTION_LABEL.get(base, base), "startBar": b0, "bars": b1 - b0 + 1,
             "startBeat": sb, "endBeat": eb, "t0": round(float(G.beat_to_time(sb)), 5),
             "t1": round(float(G.beat_to_time(min(eb, G.n - 1))), 5),
             "bpm": round(float(60 * (eb - sb) / (G.beat_to_time(min(eb, G.n - 1)) - G.beat_to_time(sb))), 2),
             "key": {"root": 40, "name": "E", "scale": E_MIXO, "scaleName": "mixolydian", "blueNotes": [3, 6]}}
        if energy_rows:
            d["energy"] = round(float(np.mean([r["intensity"] for r in energy_rows[b0 - 1:b1]])), 3)
        out.append(d)
    return out


def harmony(G, bar_map=None):
    """bar-level chords (transcription); bar_map maps song bars -> output bars for edits"""
    out = []
    prev = None
    for c in TR["chordsPerBar"]:
        ch = c["chord"].split("(")[0].strip().split()[0]
        if ch == prev:
            continue
        prev = ch
        out.append({"beat": (c["bar"] - 1) * 4, "tones": CHORD_TONES.get(ch, CHORD_TONES["E"]), "name": ch})
    return out


def write_beatmap(path, G, lanes, sections, harm, files, swing, extra_audio=None, song_id="jim_original",
                  title="You Don't Mess Around with Jim", bars_label=None, n_beats=None):
    n_beats = n_beats or G.n - 1
    n_bars = n_beats // 4
    lanes = {k: sorted(v, key=lambda e: (e["beat"], e.get("pitch", 0))) for k, v in lanes.items() if v}
    sec_at = lambda bar: next((s["name"] for s in sections if s["startBar"] <= (bars_label(bar) if bars_label else bar + 1) < s["startBar"] + s["bars"]), None)
    bm = {
        "schema": "opuslegends.beatmap/1",
        "generator": "tools/music/build_original.py",
        "song": {"id": song_id, "title": title, "artist": "Jim Croce (1972 recording)",
                 "tempo": G.tempo_points()[:n_beats], "beatsPerBar": 4, "audioOffset": round(G.offset, 6),
                 "lengthBeats": n_beats, "key": KEY, "harmony": harm},
        "audio": {"sampleRate": SR, "swingRatio": round(float(swing), 4),   # off-beat 8th position (SongDef.swing)
                  "tempoMap": "one tempo point per beat (live band, no click); beat i starts at the sum of the "
                              "previous beats' 60/bpm, i.e. exactly the per-beat grid",
                  "files": files, **(extra_audio or {})},
        "sections": sections,
        "bars": [{"i": b, "bar": (bars_label(b) if bars_label else b + 1), "beat": b * 4,
                  "t": round(float(G.beat_to_time(b * 4)), 5), "sample": int(G.sample(b * 4)), "section": sec_at(b)}
                 for b in range(n_bars + 1)],
        "beats": [{"i": i, "t": round(float(G.t[i]), 5), "sample": int(G.sample(i)), "bar": i // 4, "beatInBar": i % 4,
                   "bpm": round(60.0 / float(G.spb[min(i, G.n - 2)]), 3)} for i in range(n_beats + 1)],
        "lanes": lanes,
        "laneInfo": {k: {"description": LANE_DESC.get(k, "custom lane"), "count": len(v)} for k, v in lanes.items()},
    }
    with open(path, "w") as f:
        json.dump(bm, f, indent=1, separators=(",", ": "))
        f.write("\n")
    return bm


LANE_DESC = {
    "kick": "kick drum hits detected in the recording (exact hit time; beat is fractional). pos = on | and | trip",
    "snare": "snare hits; backbeat = on beats 2/4",
    "crash": "crash/cymbal hits (long bright tail)",
    "tom": "tom hits off the quarter grid (fills)",
    "fills": "half-bars with >= 3 off-grid drum hits: fills. accents = strongest hits",
    "bass": "bass notes from the recording: pitch (MIDI, from pYIN), durBeats, vel",
    "bassWalks": "the song's signature bass figures (walk-ups, walkdowns, climbs) from the transcription, each note "
                 "snapped to the detected bass onset (detected=true) where there is one",
    "vocalPhrases": "vocal phrase spans (start/end), timing only: no words",
    "sustains": "held vocal notes >= ~1 beat (pitch = sung MIDI note; +12 for a lead-guitar octave)",
    "melody": "vocal melody as notes (transcription; MIDI at sounding pitch)",
    "hooks": "hook moments: hookA (title line), hookB (tag), line1, versePeak",
    "bassOut": "stop-time: runs where the bass lays out (the verses' second halves)",
    "stops": "beats where the whole band drops out",
    "energy": "one entry per bar: mixDb, per-stem dB, drum hit count, intensity 0..1",
    "cue": "landmarks (section starts, the breakdown, the last chorus, the fade)",
    "shouts": "OVERLAY: gang HEY!/HUP! (our reward stem, stems/..../shouts.ogg); t = vowel onset",
    "stomps": "OVERLAY: stomps (reward stem)",
    "claps": "OVERLAY: hand claps (reward stem)",
    "cowbell": "OVERLAY: cowbell accents (reward stem)",
    "splices": "EDIT: where the edit jumps (crossfade centred on t)",
    "tokenMelody": "what a collected token sings (tools/music/original/tokens.py): pitch = token MIDI (the vocal two "
                   "octaves up); mode double | measured (the singer agrees within agreeCents) | harmony (a chord tone a "
                   "third above: the singer bends or can't be measured); sung = the transcribed note, measured = pYIN",
    "piano": "the record's own piano hits (demucs piano stem onsets; vel 0..1): the bar-pianist goon plays these",
}


def load_grid():
    from original.timegrid import TimeGrid
    g = np.load(os.path.join(BUILD, "grid.npz"), allow_pickle=True)
    return TimeGrid(g["beats"], SR), g


def stage_lanes():
    from original import lanes as L
    G, g = load_grid()
    ft = G.ft
    mix = decode(SRC, mono=True)
    st = {k: stem(k) for k in ("drums", "bass", "guitar", "piano", "vocals", "other")}
    hits, info = L.drum_hits(st["drums"], SR, G)
    lanes = {"kick": [], "snare": [], "tom": []}      # no crash lane: no crash cymbals are detectable in this mix
    for h in hits:
        base = dict(vel=h["vel"], pos=h["pos"])
        if "kick" in h["kinds"]:
            lanes["kick"].append(G.ev(h["beat"], **base, **({"accent": True} if h["vel"] >= 0.7 else {})))
        if "snare" in h["kinds"]:
            bb = h["pos"] == "on" and h["bib"] in (1, 3)
            lanes["snare"].append(G.ev(h["beat"], **base, **({"backbeat": True} if bb else {}),
                                       **({"accent": True} if h["vel"] >= 0.7 else {})))
        if "tom" in h["kinds"]:
            lanes["tom"].append(G.ev(h["beat"], **base))
    lanes["fills"] = L.fills(hits, G, N_BARS)
    lanes["bass"] = L.bass_notes(st["bass"], SR, G)
    lanes["bassWalks"] = L.bass_walks(TR, G, lanes["bass"], TR["form"])
    det_phr, lanes["sustains"] = L.vocal_lanes(st["vocals"], SR, G, min_gap_beats=0.5)
    # phrases: the transcription's boundaries for verses/choruses; stem detection for the breakdown and outro
    clipped = []
    for e in det_phr:        # detected phrases only where the transcription has none, clipped to the section
        lim = 97 * 4 if 90 <= e["bar"] <= 97 else (N_BEATS if e["bar"] >= 107 else None)
        if lim is None:
            continue
        eb = min(e["endBeat"], lim)
        if eb - e["beat"] >= 1.0:
            clipped.append(dict(e, endBeat=round(eb, 4), durBeats=round(eb - e["beat"], 3),
                                endT=round(float(G.beat_to_time(eb)), 5), source="detected"))
    lanes["vocalPhrases"] = L.transcription_phrases(TR, G) + clipped
    lanes["sustains"] = [e for e in lanes["sustains"] if e["endBeat"] <= N_BEATS]
    lanes["melody"], lanes["hooks"] = L.transcription_melody(TR, G)
    lanes["bassOut"], lanes["stops"] = L.stop_time(st["bass"], st["drums"], st["guitar"] + st["piano"] + st["other"],
                                                   SR, G, ft)
    lanes["energy"] = L.energy_per_bar(mix, st, SR, G, ft, hits, N_BARS)
    cue = []
    for s in TR["form"]:
        cue.append(G.ev((s["bars"][0] - 1) * 4, name=s["name"], bar=s["bars"][0]))
    cue.append(G.ev((116 - 1) * 4, name="fade_start", bar=116, note="the original fades out from ~bar 116"))
    lanes["cue"] = cue
    # iteration 6: the token voice (the melody measured against the record) + the piano hits (token_lanes.py)
    from original import tokens as T
    ft_v, midi_v = T.vocal_pitch(st["vocals"], SR, os.path.join(BUILD, "vocal_pyin.npz"))
    notes = [{"beat": e["beat"], "pitch": e["pitch"], "durBeats": e["durBeats"], "section": e.get("section")}
             for e in lanes["melody"]] + T.outro_tag_notes(TR)
    lanes["tokenMelody"] = T.token_part(sorted(notes, key=lambda n: n["beat"]), ft_v, midi_v, G, harmony(G),
                                        T.band_tuning(lanes["bass"]))
    lanes["piano"] = T.piano_lane(st["piano"], SR, G)
    with open(os.path.join(BUILD, "lanes.json"), "w") as f:
        json.dump({"lanes": lanes, "info": info}, f)
    print({k: len(v) for k, v in lanes.items()}, info)
    return lanes


# ======================================================================================== overlay + encode
OVERLAY_LEVELS = {"shouts": -17.0, "stomps": -19.0, "cowbell": -24.0}     # track LUFS (active parts)
SHOUT_SENDS = {"room": 0.14}                                                # the gang in the bar's room, no hall


def render_overlay(G, place, n_samples, extra=None, only=None):
    """Render the overlay events (song beats -> file seconds) with the sampled palette. Returns {stem: (2, n)}.
    extra(tracks_by_name, file_time_of_beat) may add events (e.g. the edit's final hit). only = stems to fill."""
    from producer.score import Score
    from producer.mix import Mixer
    from instruments.palette import Palette
    P = Palette(use_samples=True)
    cow_tune = 1.049 if P.sampled("drums") else 0.906          # cowbell on B4
    dur = n_samples / SR
    s = Score("jim_overlay", "JIM overlay", bpm=60, key="E2", scale="mixolydian", swing=0.0, sr=SR, pre_roll=0.0,
              tail=0.0)
    s.section("all", int(math.ceil(dur / 4)) + 1)
    s.bus("shouts", comp=dict(thresh=-18, ratio=2, attack_ms=5, release_ms=100))
    s.bus("stomps", comp=dict(thresh=-16, ratio=2.5, attack_ms=6, release_ms=90))
    s.bus("cowbell")
    # iteration 8 ("the HEYs are a bit demonic"): a tight natural gang (SampledGangShouts caps a hit at 8 layers, one
    # take per performer, +-1 st) in a SHORT dry-ish room - the old room .25 + 2.2 s dark hall .12 smeared it
    hey = s.track("shouts", P.shouts(voices=8), bus="shouts", lufs=OVERLAY_LEVELS["shouts"],
                  sends=SHOUT_SENDS, eq=[("hp", 160)])
    stp = s.track("stomps", P.kit(), bus="stomps", lufs=OVERLAY_LEVELS["stomps"], sends={"room": 0.3},
                  eq=[("hp", 45)])
    cow = s.track("cowbell", P.kit(levels={"cowbell": 0.5}), bus="cowbell", lufs=OVERLAY_LEVELS["cowbell"],
                  sends={"room": 0.2}, pan=0.25)
    ftb = lambda b: float(G.beat_to_time(b) + G.offset)
    want = lambda k: only is None or k in only
    for b, w, vel, voices, phrase in (place.shouts if want("shouts") else []):
        hey.hit(ftb(b), w, vel, voices=voices)
    for b, vel, gang in (place.stomps if want("stomps") else []):
        stp.hit(ftb(b), "stomp", vel, gang=gang)
    for b, vel in (place.claps if want("stomps") else []):
        stp.hit(ftb(b), "clap", vel)
    for b, vel in (place.cow if want("cowbell") else []):
        cow.hit(ftb(b), "cowbell", vel, tune=cow_tune)
    if extra:
        extra({"shouts": hey, "stomps": stp, "cowbell": cow}, ftb)
    stems = Mixer(s, verbose=False).render()
    out = {}
    for k, v in stems.items():
        v = v[:, :n_samples] if v.shape[1] >= n_samples else np.pad(v, ((0, 0), (0, n_samples - v.shape[1])))
        out[k] = v
    return out


OVERLAY_VS_ORIGINAL_DB = {"shouts": -7.0, "stomps": -9.0, "cowbell": -14.0}   # in the choruses, gated LUFS


def calibrate_overlay(G, mix, ov, gains=None):
    """Set each overlay stem's level against the ORIGINAL in the choruses (so a stem at gain 1.0 sits
    OVERLAY_VS_ORIGINAL_DB under the record), then true-peak limit each stem to -1 dBTP. Returns (stems, gains dB).
    Pass `gains` to reuse the full song's gains (the edit)."""
    from producer import loudness
    from producer.mix import limiter
    if gains is None:
        idx = []
        for sct in TR["form"]:
            if sct["name"].startswith("chorus"):
                idx.append((int(G.ft[(sct["bars"][0] - 1) * 4] * SR), int(G.ft[sct["bars"][1] * 4] * SR)))
        cat = lambda x: np.concatenate([x[:, a:b] for a, b in idx], axis=1)
        ref = loudness.integrated_lufs(cat(mix), SR)
        gains = {k: float(ref + OVERLAY_VS_ORIGINAL_DB[k] - loudness.integrated_lufs(cat(v), SR)) for k, v in ov.items()}
    out = {k: limiter(v * 10 ** (gains[k] / 20), SR, ceiling_db=-1.0) for k, v in ov.items()}
    return out, gains


def encode(x, path, q, fmt="ogg"):
    wav = path + ".tmp.wav"
    wavfile.write(wav, SR, np.ascontiguousarray(x.T).astype(np.float32))
    codec = ["-c:a", "libvorbis", "-q:a", str(q)] if fmt == "ogg" else ["-c:a", "libmp3lame", "-q:a", str(q)]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, *codec, path], check=True)
    os.remove(wav)
    return os.path.getsize(path)


def decoder_lag(ref, path):
    dec = decode(path)
    n = int(8 * SR)
    a, b = ref.mean(axis=0)[int(5 * SR):int(5 * SR) + n], dec.mean(axis=0)[int(5 * SR):int(5 * SR) + n]
    c = signal.correlate(b, a, mode="full", method="fft")
    return int(np.argmax(c) - (len(a) - 1))


def overlay_lanes(G, place):
    lanes = {"shouts": [G.ev(b, word=w, vel=round(v, 3), voices=n, phrase=ph) for b, w, v, n, ph in place.shouts],
             "stomps": [G.ev(b, vel=round(v, 3), gang=g) for b, v, g in place.stomps],
             "claps": [G.ev(b, vel=round(v, 3)) for b, v in place.claps],
             "cowbell": [G.ev(b, vel=round(v, 3)) for b, v in place.cow]}
    return lanes


def section_level_report(G, mix, stems):
    from producer import loudness
    rows = {}
    for sct in TR["form"]:
        a = int(G.ft[(sct["bars"][0] - 1) * 4] * SR)
        b = int(G.ft[min(sct["bars"][1] * 4, G.n - 1)] * SR)
        r = {"original": round(loudness.integrated_lufs(mix[:, a:b], SR), 1)}
        for k, v in stems.items():
            L = loudness.integrated_lufs(v[:, a:b], SR)
            r[k] = round(L, 1) if math.isfinite(L) and L > -70 else None
        rows[sct["name"]] = r
    return rows


def stage_full():
    """overlay stems + encodes + the full-song beat map"""
    from original.overlay import Place
    G, g = load_grid()
    lanes = json.load(open(os.path.join(BUILD, "lanes.json")))["lanes"]
    swing = float(np.nanmedian(g["swing"]))
    mix = decode(SRC)
    n = mix.shape[1]
    place = Place(G, lanes, TR["form"], N_BEATS, swing).build()
    ov, gains = calibrate_overlay(G, mix, render_overlay(G, place, n))
    np.savez(os.path.join(BUILD, "overlay_full.npz"), **{k: v.astype(np.float32) for k, v in ov.items()})
    lanes.update(overlay_lanes(G, place))
    os.makedirs(LIC, exist_ok=True)
    sd = os.path.join(ROOT, "assets", "audio", "stems", "jim_overlay")
    os.makedirs(sd, exist_ok=True)
    files = {}
    ogg = os.path.join(LIC, "jim_original.ogg")
    encode(mix, ogg, 5)
    files["mix"] = {"path": "licensed/jim_original.ogg", "repoPath": rel(ogg), "licensed": True,
                    "decoderLagSamples": decoder_lag(mix, ogg), "bytes": os.path.getsize(ogg)}
    mp3 = os.path.join(LIC, "jim_original.mp3")      # the untouched source file
    for k, v in ov.items():
        pth = os.path.join(sd, f"{k}.ogg")
        encode(v, pth, 4)
        files[k] = {"path": f"stems/jim_overlay/{k}.ogg", "repoPath": rel(pth), "overlay": True,
                    "bytes": os.path.getsize(pth)}
    alt = {"alternates": {"mp3": {"path": "licensed/jim_original.mp3", "repoPath": rel(mp3), "licensed": True,
                                  "decoderLagSamples": decoder_lag(mix, mp3),
                                  "note": "the source MP3; ffmpeg honours its LAME gapless header (lag 0). A decoder "
                                          "that ignores it plays 1105 samples (25 ms) late: prefer the OGG"}},
           "lengthSamples": int(n), "durationSec": round(n / SR, 3),
           "measuredLoudness": {"integratedLufs": -10.5, "note": "the original master (ffmpeg ebur128)"},
           "overlayCalibration": {"vsOriginalInChorusesDb": OVERLAY_VS_ORIGINAL_DB,
                                  "appliedGainDb": {k: round(v, 2) for k, v in gains.items()},
                                  "note": "at stem gain 1.0 each overlay sits this far under the record (gated "
                                          "LUFS over the choruses); each stem is true-peak limited to -1 dBTP. "
                                          "Original + overlays can exceed 0 dBFS: put a limiter/compressor on the "
                                          "game's music bus or play the original at about -3 dB"},
           "overlayLevels": section_level_report(G, mix, ov),
           "gridAccuracy": json.load(open(os.path.join(REPORTS, "jim_original.grid.json")))
           if os.path.exists(os.path.join(REPORTS, "jim_original.grid.json")) else None}
    energy = lanes.get("energy")
    secs = sections_from_form(G, energy)
    bm = write_beatmap(os.path.join(ROOT, "assets", "audio", "jim_original.beatmap.json"), G, lanes, secs,
                       harmony(G), files, swing, alt, n_beats=N_BEATS)
    print("full beat map:", {k: v["count"] for k, v in bm["laneInfo"].items()})
    print(json.dumps(alt["overlayLevels"], indent=0)[:1500])
    return bm


# ======================================================================================== the level edit
# Keep song beats [0, 130) then [246, 461): the jump happens on beat 3 of bar 33 -> beat 3 of bar 62. Both are the
# 2nd bar of the identical B7 turnaround (bass B B C# D# -> E), so the bass walk continues and verse 3's vocal
# pickup (bar 62 b3.67) follows naturally. The edit ends on the outro tag's resolution: song bar 115 beat 1 (edit
# bar 86), with a band-stop button (the original fades under our final hit: stomps, gang HEY, cowbell, crash).
EDIT_KEEP = [(0, 130), (246, 461)]          # song beats, end exclusive
EDIT_FINAL_SONG_BEAT = 456                  # song bar 115 beat 1 = edit beat 340
EDIT_XFADE_MS = 24.0
EDIT_PRE_MS = 14.0                           # the splice crossfade ends this long before the beat-3 attack
EDIT_TAIL_S = 4.2


def edit_map(song_beat):
    """song beat -> edit beat (None if cut)"""
    off = 0.0
    for a, b in EDIT_KEEP:
        if a <= song_beat < b:
            return song_beat - a + off
        off += b - a
    return None


def splice(x, G, keep=EDIT_KEEP, final_beat=EDIT_FINAL_SONG_BEAT, fade_beats=1.0, tail_s=EDIT_TAIL_S):
    """Cut a (2, n) signal on the song's per-beat grid. Each join is an equal-power crossfade of EDIT_XFADE_MS
    that ends EDIT_PRE_MS before the incoming segment's first beat (so that beat's attack is untouched). After
    the final beat the signal fades out over 0.35 s (after `fade_beats` beats) and `tail_s` of silence follows.
    Returns (y, file times of the edit's beats)."""
    L = int(EDIT_XFADE_MS * 1e-3 * SR / 2)
    pre = int(EDIT_PRE_MS * 1e-3 * SR) + L
    joins = []                                   # (source sample where segment j starts, where it ends)
    for j, (a, b) in enumerate(keep):
        s0 = 0 if j == 0 else int(round(G.ft[a] * SR)) - pre
        s1 = x.shape[1] if j == len(keep) - 1 else int(round(G.ft[b] * SR)) - pre
        joins.append((s0, s1))
    tt = np.linspace(0, np.pi / 2, 2 * L)
    fo, fi = np.cos(tt), np.sin(tt)
    out = x[:, joins[0][0]:joins[0][1]]
    for j in range(1, len(joins)):
        e_prev, (s0, s1) = joins[j - 1][1], joins[j]
        blend = x[:, e_prev - L:e_prev + L] * fo + x[:, s0 - L:s0 + L] * fi
        out = np.concatenate([out[:, : out.shape[1] - L], blend, x[:, s0 + L:s1]], axis=1)
    # edit beat file times: each later segment is shifted back by the audio it skipped
    eft = []
    offset = 0.0
    for j, (a, b) in enumerate(keep):
        if j > 0:
            offset += (joins[j][0] - joins[j - 1][1]) / SR
        for i in range(a, min(b, G.n)):
            eft.append(G.ft[i] - offset)
    eft = np.array(eft)
    fb = int(edit_map(final_beat))
    t_end = eft[fb] + fade_beats * (eft[fb + 1] - eft[fb])
    n_keep = int(t_end * SR)
    nf = int(0.35 * SR)
    y = out[:, :n_keep + nf].copy()
    y[:, n_keep:] *= np.linspace(1, 0, y.shape[1] - n_keep) ** 2
    y = np.pad(y, ((0, 0), (0, int(tail_s * SR))))
    return y, eft


def final_hit(tracks, ftb_edit_time):
    """our button on the final beat: gang HEY, stomps, kick, crash, cowbell, crowd"""
    t = ftb_edit_time
    tracks["shouts"].hit(t, "HEY", 1.0, voices=8)
    tracks["stomps"].hit(t, "stomp", 1.0, gang=5)
    tracks["stomps"].hit(t, "kick", 1.0)
    tracks["stomps"].hit(t, "crash", 1.0)
    tracks["stomps"].hit(t, "clap", 0.9)
    tracks["cowbell"].hit(t, "cowbell", 0.9, tune=1.049)


def render_button(n, t_final):
    """the edit's final hit at file time `t_final`, rendered alone: {shouts (+ the crowd's cheer), stomps, cowbell}"""
    from producer.score import Score
    from producer.mix import Mixer
    from instruments.palette import Palette
    from instruments.vocals import Crowd
    P = Palette(use_samples=True)
    sc = Score("jim_button", "button", bpm=60, sr=SR, pre_roll=0.0, tail=0.0, swing=0.0)
    sc.section("all", int(math.ceil(n / SR / 4)) + 1)
    sc.bus("shouts")
    sc.bus("stomps")
    sc.bus("cowbell")
    tr = {"shouts": sc.track("shouts", P.shouts(voices=8), bus="shouts", sends={"room": 0.18, "hall": 0.05}),
          "stomps": sc.track("stomps", P.kit(), bus="stomps", sends={"room": 0.3, "hall": 0.15}),
          "cowbell": sc.track("cowbell", P.kit(), bus="cowbell", sends={"room": 0.2})}
    final_hit(tr, t_final)
    crowd = sc.track("crowd", Crowd(), bus="shouts", sends={"hall": 0.3})
    crowd.hit(t_final + 0.15, "cheer", 0.9, dur=3.5)
    return Mixer(sc, verbose=False).render()


def _fit(v, n):
    return v[:, :n] if v.shape[1] >= n else np.pad(v, ((0, 0), (0, n - v.shape[1])))


def add_button(ov, btn, n):
    """the button into the overlay stems, like the loudest overlay moments (peak ~ -3 dBFS), then -1 dBTP limited"""
    from producer.mix import limiter
    for k in ov:
        b = btn.get(k)
        if b is not None:
            b = _fit(b, n)
            b = b * (10 ** (-3 / 20) / (np.max(np.abs(b)) + 1e-9)) * (0.8 if k == "cowbell" else 1.0)
            ov[k] = limiter(ov[k] + b, SR, ceiling_db=-1.0)
    return ov


def button_mix(btn, n):
    """the button as baked (quieter) into the licensed edit mix"""
    m = sum(_fit(v, n) for v in btn.values())
    return m * (10 ** (-6 / 20) / (np.max(np.abs(m)) + 1e-9))


def stage_edit():
    from original.timegrid import TimeGrid
    G, g = load_grid()
    mix = decode(SRC)
    y, eft = splice(mix, G)
    GE = TimeGrid(eft, SR)
    n = y.shape[1]
    final_e = edit_map(EDIT_FINAL_SONG_BEAT)
    # overlays: the full song's overlay stems cut the same way (sample-aligned), plus the final hit
    ovf = np.load(os.path.join(BUILD, "overlay_full.npz"))
    ov = {}
    for k in ovf.files:
        v, _ = splice(ovf[k].astype(np.float64), G, fade_beats=0.0)
        ov[k] = v[:, :n] if v.shape[1] >= n else np.pad(v, ((0, 0), (0, n - v.shape[1])))
    # the final hit (rendered on the edit timeline) goes into the overlays AND (quieter) into the edit's mix
    from producer.mix import limiter
    btn = render_button(n, float(GE.beat_to_time(final_e) + GE.offset))
    ov = add_button(ov, btn, n)
    btn_mix = button_mix(btn, n)
    y_mix = limiter(y + btn_mix, SR, ceiling_db=-0.5)
    # encode
    ogg = os.path.join(LIC, "jim_edit.ogg")
    mp3 = os.path.join(LIC, "jim_edit.mp3")
    encode(y_mix, ogg, 5)
    encode(y_mix, mp3, 4, "mp3")
    sd = os.path.join(ROOT, "assets", "audio", "stems", "jim_edit_overlay")
    os.makedirs(sd, exist_ok=True)
    files = {"mix": {"path": "licensed/jim_edit.ogg", "repoPath": rel(ogg), "licensed": True,
                     "decoderLagSamples": decoder_lag(y_mix, ogg), "bytes": os.path.getsize(ogg)}}
    for k, v in ov.items():
        pth = os.path.join(sd, f"{k}.ogg")
        encode(v, pth, 4)
        files[k] = {"path": f"stems/jim_edit_overlay/{k}.ogg", "repoPath": rel(pth), "overlay": True,
                    "bytes": os.path.getsize(pth)}
    # lanes, sections, harmony remapped
    full = json.load(open(os.path.join(ROOT, "assets", "audio", "jim_original.beatmap.json")))
    n_edit_beats = int(final_e) + 4                       # through the end of the final bar
    lanes = {}
    for name, evs in full["lanes"].items():
        out = []
        for e in evs:
            eb = edit_map(e["beat"])
            if eb is None or eb > n_edit_beats:
                continue
            d = {k: v for k, v in e.items() if k not in ("beat", "t", "sample", "endBeat", "endT", "accents", "notes")}
            extra = {}
            if "endBeat" in e:
                seg_end = next(kb for ka, kb in EDIT_KEEP if ka <= e["beat"] < kb)
                ee = edit_map(min(e["endBeat"], seg_end) - 1e-6) + 1e-6     # spans crossing a cut are clipped
                extra["endBeat"] = round(float(ee), 4)
                extra["endT"] = round(float(GE.beat_to_time(ee)), 5)
            if "accents" in e:
                extra["accents"] = [round(edit_map(x), 4) for x in e["accents"] if edit_map(x) is not None]
            if "notes" in e:
                extra["notes"] = [dict(nn, beat=round(edit_map(nn["beat"]), 4),
                                       t=round(float(GE.beat_to_time(edit_map(nn["beat"]))), 5))
                                  for nn in e["notes"] if edit_map(nn["beat"]) is not None]
            if "bar" in d:
                d["songBar"] = d.pop("bar")
            out.append(GE.ev(eb, **d, **extra))
        lanes[name] = out
    lanes["shouts"].append(GE.ev(final_e, word="HEY", vel=1.0, voices=16, phrase="final_hit"))
    lanes["stomps"].append(GE.ev(final_e, vel=1.0, gang=5))
    lanes["cowbell"].append(GE.ev(final_e, vel=0.9))
    lanes["stops"] = [GE.ev(final_e + 1, beats=3, kind="end", note="the record fades under the final hit")]
    lanes["splices"] = [GE.ev(edit_map(EDIT_KEEP[1][0]), fromSongBeat=EDIT_KEEP[0][1], toSongBeat=EDIT_KEEP[1][0],
                              note="song bar 33 b3 -> song bar 62 b3 (identical B7 turnaround bar), "
                                   f"{EDIT_XFADE_MS:.0f} ms equal-power crossfade ending {EDIT_PRE_MS:.0f} ms before "
                                   "the beat"),
                        GE.ev(final_e, kind="button", songBeat=EDIT_FINAL_SONG_BEAT)]
    lanes["cue"] = [c for c in lanes["cue"]] + [GE.ev(final_e, name="final_hit", songBar=115)]
    secs = []
    for sct in full["sections"]:
        a, b = sct["startBeat"], sct["endBeat"]
        ks = [(max(a, ka), min(b, kb)) for ka, kb in EDIT_KEEP if max(a, ka) < min(b, kb)]
        for k, (x0, x1) in enumerate(ks):
            e0, e1 = edit_map(x0), edit_map(x1 - 1e-6) + 1e-6
            e1 = min(e1, n_edit_beats)
            if e0 >= n_edit_beats:
                continue
            d = dict(sct, startBeat=round(e0, 3), endBeat=round(e1, 3), startBar=int(e0 // 4) + 1,
                     bars=round((e1 - e0) / 4, 2), songBars=[int(x0 // 4) + 1, int(min(x1, EDIT_FINAL_SONG_BEAT + 4) - 1) // 4 + 1],
                     t0=round(float(GE.beat_to_time(e0)), 5), t1=round(float(GE.beat_to_time(e1)), 5))
            if (x0, x1) != (a, b):
                d["partial"] = f"song beats {x0}-{x1} of {a}-{b}"
            secs.append(d)
    harm = []
    for h in full["song"]["harmony"]:
        eb = edit_map(h["beat"])
        if eb is not None and eb <= n_edit_beats:
            harm.append(dict(h, beat=round(eb, 3)))
    if not any(abs(h["beat"] - 130) < 1e-6 for h in harm):
        harm.append({"beat": 130, "tones": [7, 11, 14, 17], "name": "B7"})
    harm.sort(key=lambda h: h["beat"])
    extra = {"edit": {"keepSongBeats": EDIT_KEEP, "finalSongBeat": EDIT_FINAL_SONG_BEAT,
                      "durationSec": round(n / SR, 2), "musicEndsSec": round(float(GE.ft[int(final_e)]) + 1.0, 2),
                      "doc": "docs/music/original_edit.md"},
             "lengthSamples": int(n), "durationSec": round(n / SR, 3),
             "overlayCalibration": full["audio"]["overlayCalibration"]}
    bm = write_beatmap(os.path.join(ROOT, "assets", "audio", "jim_edit.beatmap.json"), GE, lanes, secs, harm, files,
                       full["audio"]["swingRatio"], extra, song_id="jim_edit",
                       title="You Don't Mess Around with Jim (level edit)", bars_label=lambda b: song_bar_of_edit(b),
                       n_beats=n_edit_beats)
    # a bar map for the doc
    print("edit:", round(n / SR, 2), "s;", n_edit_beats // 4, "bars;", {k: v["count"] for k, v in bm["laneInfo"].items()})
    check_splice(y, GE)
    return bm


def edit_map_inv(e):
    off = 0.0
    for a, b in EDIT_KEEP:
        if e < off + (b - a):
            return a + (e - off)
        off += b - a
    return None


def song_bar_of_edit(edit_bar_index):
    sb = edit_map_inv(edit_bar_index * 4)
    return int(sb // 4) + 1 if sb is not None else None


def check_splice(y, GE):
    """Seam check: short-term level and spectral change across the join vs the beat-to-beat norm around it."""
    j = edit_map(EDIT_KEEP[1][0])
    tj = GE.ft[int(j)]
    m = y.mean(axis=0)
    w = int(0.05 * SR)

    def spec(t):
        a = int(t * SR)
        seg = m[a:a + w] * np.hanning(w)
        return 20 * np.log10(np.abs(np.fft.rfft(seg)) + 1e-9)

    diffs = []
    for k in range(-6, 7):
        if k == 0:
            continue
        t0 = GE.ft[int(j) + k] - 0.06
        diffs.append(float(np.mean(np.abs(spec(t0) - spec(t0 + 0.05)))))
    seam = float(np.mean(np.abs(spec(tj - 0.06) - spec(tj - 0.01))))
    print(f"splice seam spectral change {seam:.2f} dB vs neighbouring beats {np.median(diffs):.2f} dB (median)")


def stage_shouts():
    """Iteration 8: re-render ONLY the gang-shout overlay (full song + the edit, with the final hit) and the edit's
    licensed mix (its button carries the final HEY). The stomps/cowbell stems, the lanes and every other beat-map field
    stay as they are; the beat maps get the new shouts file sizes, gain and section levels."""
    from original.overlay import Place
    from original.timegrid import TimeGrid
    G, g = load_grid()
    lanes = json.load(open(os.path.join(BUILD, "lanes.json")))["lanes"]
    swing = float(np.nanmedian(g["swing"]))
    mix = decode(SRC)
    n = mix.shape[1]
    place = Place(G, lanes, TR["form"], N_BEATS, swing).build()
    full_p = os.path.join(ROOT, "assets", "audio", "jim_original.beatmap.json")
    full = json.load(open(full_p))
    have = [(round(e["beat"], 3), e["word"]) for e in full["lanes"]["shouts"]]
    assert have == [(round(b, 3), w) for b, w, *_ in place.shouts], "shout placement differs from the beat map"
    sh, gains = calibrate_overlay(G, mix, {"shouts": render_overlay(G, place, n, only={"shouts"})["shouts"]})
    npz = os.path.join(BUILD, "overlay_full.npz")
    ovf = {k: v for k, v in np.load(npz).items()}
    ovf["shouts"] = sh["shouts"].astype(np.float32)
    np.savez(npz, **ovf)
    pth = os.path.join(ROOT, "assets", "audio", "stems", "jim_overlay", "shouts.ogg")
    encode(sh["shouts"], pth, 4)
    fa = full["audio"]
    fa["files"]["shouts"]["bytes"] = os.path.getsize(pth)
    fa["overlayCalibration"]["appliedGainDb"]["shouts"] = round(gains["shouts"], 2)
    fa["overlayLevels"] = section_level_report(G, mix, {k: v.astype(np.float64) for k, v in ovf.items()})
    with open(full_p, "w") as f:
        json.dump(full, f, indent=1, separators=(",", ": "))
        f.write("\n")
    print("full: shouts gain", round(gains["shouts"], 2), "dB")
    # ---- the edit: the full stem cut the same way + the final hit; the licensed edit mix gets the new button
    from producer.mix import limiter
    y, eft = splice(mix, G)
    GE = TimeGrid(eft, SR)
    ne = y.shape[1]
    final_e = edit_map(EDIT_FINAL_SONG_BEAT)
    v, _ = splice(ovf["shouts"].astype(np.float64), G, fade_beats=0.0)
    btn = render_button(ne, float(GE.beat_to_time(final_e) + GE.offset))
    ove = add_button({"shouts": _fit(v, ne)}, btn, ne)
    edit_p = os.path.join(ROOT, "assets", "audio", "jim_edit.beatmap.json")
    edit = json.load(open(edit_p))
    pth = os.path.join(ROOT, "assets", "audio", "stems", "jim_edit_overlay", "shouts.ogg")
    encode(ove["shouts"], pth, 4)
    edit["audio"]["files"]["shouts"]["bytes"] = os.path.getsize(pth)
    edit["audio"]["overlayCalibration"] = fa["overlayCalibration"]
    if os.path.exists(LIC):                       # licensed (gitignored): the record + the button, never committed
        y_mix = limiter(y + button_mix(btn, ne), SR, ceiling_db=-0.5)
        ogg = os.path.join(LIC, "jim_edit.ogg")
        encode(y_mix, ogg, 5)
        encode(y_mix, os.path.join(LIC, "jim_edit.mp3"), 4, "mp3")
        edit["audio"]["files"]["mix"]["decoderLagSamples"] = decoder_lag(y_mix, ogg)
        edit["audio"]["files"]["mix"]["bytes"] = os.path.getsize(ogg)
    with open(edit_p, "w") as f:
        json.dump(edit, f, indent=1, separators=(",", ": "))
        f.write("\n")
    print("edit: shouts stem + button re-rendered")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", default="all", choices=["all", "grid", "lanes", "full", "edit", "shouts"])
    args = ap.parse_args()
    os.makedirs(BUILD, exist_ok=True)
    os.makedirs(REPORTS, exist_ok=True)
    if args.stage in ("all", "grid"):
        stage_grid()
    if args.stage in ("all", "lanes"):
        stage_lanes()
    if args.stage in ("all", "full"):
        stage_full()
    if args.stage in ("all", "edit"):
        stage_edit()
    if args.stage == "shouts":
        stage_shouts()


if __name__ == "__main__":
    main()
