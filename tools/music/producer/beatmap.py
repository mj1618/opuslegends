"""beatmap.json emitter (schema 'opuslegends.beatmap/1', documented in tools/music/README.md)."""
from __future__ import annotations

import json

import numpy as np

from .score import DEFAULT_DRUM_LANES, Score

LANE_INFO = {
    "kick": "kick drum + floor stomps (the 'boom')",
    "snare": "snare / rimshot backbeats",
    "floortom": "floor tom stomp hits",
    "tom": "rack tom hits (fills)",
    "cowbell": "cowbell hits",
    "crash": "crash / china cymbal hits",
    "ride": "ride hits",
    "hat": "hi-hat hits (dense; mostly for visuals)",
    "clap": "hand claps",
    "shouts": "gang shouts; `word` = HEY/WHOA/HO/HA/YEAH; t = vowel onset",
    "crowd": "crowd cheers/roars; dur = length",
    "riff": "riff accents (notes marked '>' on accent_lane tracks); pitch = lowest note",
    "melody": "melody notes; pitch = MIDI note, dur/durBeats = length, bend = semitones",
    "bass": "bass notes",
    "stops": "band stops/breaks: silence from t for dur seconds (reverb tails ring)",
}


def _r(x, d=6):
    return float(round(float(x), d))


def lane_events(sc: Score):
    """Yield (lane, track_name, Resolved event, extra fields) for every gameplay event that maps to a lane."""
    for name, tr in sc.tracks.items():
        if not tr.gameplay:
            continue
        drum_map = tr.drum_lanes if tr.drum_lanes is not None else DEFAULT_DRUM_LANES
        kind = getattr(tr.instrument, "lane_kind", None) or type(tr.instrument).__name__   # sampled alternatives set lane_kind
        for ev in tr.resolve():
            p = ev.params
            xtra = {k[2:]: (bool(v) if isinstance(v, np.bool_) else v) for k, v in p.items() if k.startswith("x_")}
            if ev.pitch is None and ev.piece is not None:
                piece = ev.piece
                if kind == "GangShouts":
                    yield "shouts", name, ev, {"word": piece.upper(), "track": name, **xtra}
                elif kind == "Crowd":
                    yield "crowd", name, ev, {"kind": piece, "dur": _r(ev.dur_s, 4), "track": name, **xtra}
                elif piece in drum_map:
                    extra = {"piece": piece} if drum_map[piece] != piece else {}
                    if p.get("accent"):
                        extra["accent"] = True
                    yield drum_map[piece], name, ev, {**extra, **xtra}
                continue
            if ev.pitch is None:
                continue
            pitches = [float(x) for x in np.atleast_1d(ev.pitch)]
            info = {"pitch": _r(min(pitches), 3), "dur": _r(ev.dur_s, 4), "durBeats": _r(ev.dur_s / sc.spb, 4),
                    "track": name}
            if len(pitches) > 1:
                info["chord"] = [_r(x, 3) for x in pitches]
            for k in ("bend", "slide", "vib", "pm"):
                if p.get(k):
                    info[k] = p[k] if not isinstance(p[k], (bool, np.bool_)) else True
            info.update(xtra)
            if tr.lane:
                yield tr.lane, name, ev, info
            if tr.accent_lane and p.get("accent"):
                yield tr.accent_lane, name, ev, dict(info)


def build(score: Score, files: dict | None = None, loudness: dict | None = None, source: str | None = None) -> dict:
    sc = score
    sr = sc.sr
    lanes: dict[str, list[dict]] = {}

    def add(lane, ev, **extra):
        d = {"beat": _r(ev.beat), "t": _r(ev.t), "sample": int(ev.start), "vel": _r(ev.vel, 3)}
        if abs(ev.beat - ev.grid_beat) > 1e-6:
            d["grid"] = _r(ev.grid_beat)
        d.update(extra)
        lanes.setdefault(lane, []).append(d)

    for lane, name, ev, extra in lane_events(sc):
        if lane in sc.lane_ends and "durBeats" in extra:
            extra = {**extra, "endBeat": _r(ev.beat + extra["durBeats"]), "endT": _r(ev.t + extra["dur"])}
        add(lane, ev, **extra)

    for st in sc.stops:
        b = st["beat"]
        lanes.setdefault("stops", []).append({"beat": _r(b), "t": _r(sc.time(b)), "sample": sc.sample(b),
                                              "beats": _r(st["beats"]), "dur": _r(st["beats"] * sc.spb),
                                              "kind": st["kind"],
                                              **{k: v for k, v in st.items() if k not in ("beat", "beats", "kind", "keep", "fade_ms")}})
    for lane, marks in sc.markers.items():
        for mk in marks:
            b = mk["beat"]
            lanes.setdefault(lane, []).append({"beat": _r(b), "t": _r(sc.time(b)), "sample": sc.sample(b),
                                               **{k: v for k, v in mk.items() if k != "beat"}})
    for name in list(lanes):
        lane = sorted(lanes[name], key=lambda d: (d["beat"], d.get("pitch", 0)))
        # merge simultaneous unpitched hits (e.g. kick + layered stomps on the same beat) into one event
        merged: list[dict] = []
        for d in lane:
            prev = merged[-1] if merged else None
            if prev is not None and prev["sample"] == d["sample"] and "pitch" not in d and "pitch" not in prev \
                    and "vel" in d and "vel" in prev and name not in ("stops",):
                prev["vel"] = max(prev["vel"], d["vel"])
                pieces = prev.setdefault("pieces", [prev.pop("piece", name)])
                pieces.append(d.get("piece", name))
                if d.get("accent"):
                    prev["accent"] = True
                continue
            merged.append(d)
        for d in merged:
            if "pieces" in d:
                d["pieces"] = sorted(set(d["pieces"]))
        lanes[name] = merged

    bpb = sc.beats_per_bar

    def sec_of_bar(bar):
        for s in sc.sections:
            if s.start_bar <= bar < s.start_bar + s.bars:
                return s.name
        return None

    n_beats = int(sc.length_beats)
    beats = [{"i": i, "t": _r(sc.time(i)), "sample": sc.sample(i), "bar": i // bpb, "beatInBar": i % bpb}
             for i in range(n_beats + 1)]
    bars = [{"i": b, "beat": b * bpb, "t": _r(sc.time(b * bpb)), "sample": sc.sample(b * bpb), "section": sec_of_bar(b)}
            for b in range(sc.length_bars + 1)]
    sections = [{"name": s.name, "label": s.label, "startBar": s.start_bar, "bars": s.bars, "startBeat": s.start,
                 "endBeat": s.end, "t0": _r(sc.time(s.start)), "t1": _r(sc.time(s.end)), "energy": s.energy, **s.meta}
                for s in sc.sections]
    harmony = [{"beat": _r(b), "tones": tones, **({"name": nm} if nm else {})} for b, tones, nm in sc.harmony]

    return {
        "schema": "opuslegends.beatmap/1",
        "generator": f"tools/music/render.py {source or ''}".strip(),
        "song": {
            "id": sc.id, "title": sc.title, **({"artist": sc.artist} if sc.artist else {}),
            "tempo": [{"beat": 0, "bpm": sc.bpm}],
            "beatsPerBar": bpb,
            "audioOffset": _r(sc.pre_roll),
            "lengthBeats": sc.length_beats,
            "key": {"root": sc.key_root, "scale": sc.scale},
            "harmony": harmony,
        },
        "audio": {"sampleRate": sr, "lengthSamples": sc.n_samples, "durationSec": _r(sc.n_samples / sr, 3),
                  "swing": round(sc.swing, 4), "swingRatio": round(0.5 + sc.swing / 6, 4), "files": files or {}, "loudness": loudness or {}},
        "sections": sections,
        "bars": bars,
        "beats": beats,
        "lanes": lanes,
        "laneInfo": {k: {"description": sc.lane_desc.get(k, LANE_INFO.get(k, "custom marker lane")), "count": len(v)}
                     for k, v in lanes.items()},
    }


def write(path, bm: dict) -> None:
    with open(path, "w") as f:
        json.dump(bm, f, indent=1, separators=(",", ": "))
        f.write("\n")
