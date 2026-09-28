#!/usr/bin/env python3
"""Iteration 6 lanes for the ORIGINAL recording, merged into the committed beat maps without a full rebuild:

    tools/music/.venv/bin/python tools/music/token_lanes.py

  tokenMelody  what each collected token sings: the vocal melody two octaves up where the singer agrees with it
               (measured with pYIN on the demucs vocal stem), a chord tone a third above where he bends (see
               tools/music/original/tokens.py); the outro's tag hook included
  piano        the record's own piano hits (the bar-pianist goon plays these)

Writes both assets/audio/jim_original.beatmap.json and jim_edit.beatmap.json (lanes + laneInfo; the edit through
build_original.edit_map, exactly like stage_edit) and tools/music/reports/jim_tokens.json (agreement per section).
build_original.py's `lanes` stage computes the same lanes, so a full rebuild keeps them.
"""
from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import numpy as np  # noqa: E402

import build_original as B  # noqa: E402
from original import tokens as T  # noqa: E402
from original.timegrid import TimeGrid  # noqa: E402

FULL = os.path.join(B.ROOT, "assets", "audio", "jim_original.beatmap.json")
EDIT = os.path.join(B.ROOT, "assets", "audio", "jim_edit.beatmap.json")


def full_lanes(G, full):
    """the two lanes on the full song (song beats)"""
    ft, midi = T.vocal_pitch(B.stem("vocals"), B.SR, os.path.join(B.BUILD, "vocal_pyin.npz"))
    tuning = T.band_tuning(full["lanes"]["bass"])
    notes = [{"beat": e["beat"], "pitch": e["pitch"], "durBeats": e["durBeats"], "section": e.get("section")}
             for e in full["lanes"]["melody"]]
    notes += T.outro_tag_notes(B.TR)
    notes.sort(key=lambda n: n["beat"])
    part = T.token_part(notes, ft, midi, G, full["song"]["harmony"], tuning)
    piano = T.piano_lane(B.stem("piano"), B.SR, G)
    return {"tokenMelody": part, "piano": piano}, tuning


def to_edit(lanes, GE, n_edit_beats):
    """song-beat lanes -> edit beats (as build_original.stage_edit maps every lane)"""
    out = {}
    for name, evs in lanes.items():
        o = []
        for e in evs:
            eb = B.edit_map(e["beat"])
            if eb is None or eb > n_edit_beats:
                continue
            d = {k: v for k, v in e.items() if k not in ("beat", "t", "sample", "endBeat", "endT")}
            if "endBeat" in e:
                seg_end = next(kb for ka, kb in B.EDIT_KEEP if ka <= e["beat"] < kb)
                d["endBeat"] = round(float(B.edit_map(min(e["endBeat"], seg_end) - 1e-6) + 1e-6), 4)
            o.append(GE.ev(eb, **d))
        out[name] = o
    return out


def merge(path, lanes, info):
    bm = json.load(open(path))
    for k, v in lanes.items():
        bm["lanes"][k] = sorted(v, key=lambda e: e["beat"])
        bm["laneInfo"][k] = {"description": B.LANE_DESC.get(k, "custom lane"), "count": len(v)}
    bm["audio"]["tokenVoice"] = info
    with open(path, "w") as f:
        json.dump(bm, f, indent=1, separators=(",", ": "))
        f.write("\n")


def main():
    G, _ = B.load_grid()
    full = json.load(open(FULL))
    lanes, tuning = full_lanes(G, full)
    edit = json.load(open(EDIT))
    GE = TimeGrid(np.array([b["t"] for b in edit["beats"]]) + edit["song"]["audioOffset"], B.SR)
    elanes = to_edit(lanes, GE, edit["song"]["lengthBeats"])
    stats_full = T.phrase_stats(lanes["tokenMelody"])
    stats_edit = T.phrase_stats(elanes["tokenMelody"])
    info = {"octave": T.TOKEN_OCTAVE, "agreeCents": T.AGREE_CENTS, "bandTuningCents": round(tuning, 1),
            "doc": "tools/music/original/tokens.py; audio/tokenMelody.ts"}
    merge(FULL, lanes, info)
    merge(EDIT, elanes, info)
    rep = {"bandTuningCents": round(tuning, 1), "agreeCents": T.AGREE_CENTS, "full": stats_full, "edit": stats_edit,
           "pianoHits": {"full": len(lanes["piano"]), "edit": len(elanes["piano"])}}
    with open(os.path.join(B.REPORTS, "jim_tokens.json"), "w") as f:
        json.dump(rep, f, indent=1)
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main()
