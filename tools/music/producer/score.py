"""Score-as-code DSL.

A ``Score`` is a constant-tempo piece made of consecutive ``Section``s (bars). Each ``Track``
holds note/hit events addressed in *beats* (float, beat 0 = first downbeat of the song).
The same score drives both the audio render and ``beatmap.json`` so the level's event
lanes are sample-exact by construction.

Quick reference (see tools/music/README.md for the full guide)::

    s = Score("demo", "Palette Demo", bpm=150, key="E2", scale="mixolydian", swing=0.35)
    intro = s.section("intro", bars=2, energy=0.4)
    riff  = s.section("riff", bars=8, energy=0.8)

    kit = s.track("drums", RockKit(), stem="drums", gameplay=True)
    kit.pattern(intro.start, bars=2, steps=8,
                kick="X...x...", floortom="x.x.x.x.", cowbell="xxxxxxxx")
    gtr = s.track("gtr", RhythmGuitar(), stem="guitars", gameplay=True, accent_lane="riff")
    gtr.seq(riff.start, ">E2+B2:0.5/pm E2+C#3:0.5/pm ...")
    s.stop(riff.start + 28, beats=2)      # band stop: lane event + mute gate
    s.chord(riff.start, "E7")             # harmony for musically-quantized SFX

Timing rules
------------
* ``swing`` (0..1.5) delays the off-beat 8th: 0 = straight, 1 = triplet shuffle (2:1); or give
  ``swing_ratio`` = off-beat position in the beat (0.5 straight, 0.667 shuffle, 0.675 = the
  measured Jim feel). Set per score and override per track (``swing=`` amount). Only straight
  8th/16th-grid positions move; triplet positions are exact. Beat map lanes store the
  *performed* (swung) beat and the notated one as ``grid``.
* ``humanize`` (timing jitter) is only allowed on tracks with ``gameplay=False``. Gameplay
  tracks may humanize velocity only. Only gameplay tracks export event lanes.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from .dsp import note as note_num

SCALES = {
    "major": [0, 2, 4, 5, 7, 9, 11],
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "blues": [0, 3, 5, 6, 7, 10],
    "minorPentatonic": [0, 3, 5, 7, 10],
    "majorPentatonic": [0, 2, 4, 7, 9],
}

CHORD_QUALITIES = {
    "": [0, 4, 7], "m": [0, 3, 7], "5": [0, 7, 12], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10],
    "6": [0, 4, 7, 9], "maj7": [0, 4, 7, 11], "9": [0, 4, 7, 10, 14], "dim": [0, 3, 6], "sus4": [0, 5, 7],
}

# default drum-piece -> beat-map lane names
DEFAULT_DRUM_LANES = {
    "kick": "kick", "stomp": "kick", "snare": "snare", "rimshot": "snare", "floortom": "floortom",
    "tom": "tom", "cowbell": "cowbell", "crash": "crash", "china": "crash", "ride": "ride",
    "clap": "clap", "hat": "hat", "openhat": "hat",
}


@dataclass
class Section:
    name: str
    start_bar: int
    bars: int
    beats_per_bar: int
    label: str | None = None
    energy: float | None = None
    meta: dict = field(default_factory=dict)

    @property
    def start(self) -> float:
        """absolute beat of the section's first downbeat"""
        return float(self.start_bar * self.beats_per_bar)

    @property
    def end(self) -> float:
        return float((self.start_bar + self.bars) * self.beats_per_bar)

    def bar(self, i: float, beat: float = 0.0) -> float:
        """absolute beat of (bar i within this section, beat within bar), both 0-based"""
        return self.start + i * self.beats_per_bar + beat


@dataclass
class Event:
    beat: float                 # notated position (beats)
    dur: float = 0.25           # beats
    pitch: float | list | None = None   # MIDI (float) or list for chords
    vel: float = 0.8
    piece: str | None = None    # drum piece / shout word / articulation
    params: dict = field(default_factory=dict)


@dataclass
class Resolved:
    """Event after swing/humanize, in samples. What instruments receive."""
    beat: float        # performed beat (swung; humanize included)
    grid_beat: float   # notated beat
    t: float           # song seconds (0 = beat 0)
    start: int         # sample index in the rendered file (includes pre-roll)
    dur_s: float
    dur_samples: int
    pitch: float | None
    vel: float
    piece: str | None
    params: dict
    spb: float         # seconds per beat (for instruments that need musical time)
    humanize_ms: float = 0.0


def swing_ratio_to_amount(ratio: float) -> float:
    """Off-beat 8th position (0.5 straight, 0.667 triplet shuffle, 0.75 dotted) -> swing amount."""
    return (ratio - 0.5) * 6.0


def swing_beat(b: float, amount: float, grid: float = 0.5) -> float:
    """Apply swing to a notated beat position. Only positions on the straight 8th/16th grid move:
    the off-beat 8th goes to 0.5 + amount/6 of the beat (amount 1 = triplet shuffle, ratio 0.667),
    16ths are interpolated linearly inside each 8th-note pair. Triplet-grid positions (1/3, 2/3,
    1/6 ...) and anything else off the 16th grid are left untouched, so write shuffle fills as
    triplets (pattern steps=12) and they stay exact."""
    if amount <= 0:
        return b
    cell = 2 * grid
    k = math.floor(b / cell + 1e-9)
    f = (b - k * cell) / cell  # 0..1 within the cell
    q = f * 4
    if abs(q - round(q)) > 1e-6:
        return b  # not on the 16th grid: leave (triplets etc.)
    m = 0.5 + amount / 6.0
    g = f * (m / 0.5) if f < 0.5 else m + (f - 0.5) * (1 - m) / 0.5
    return k * cell + g * cell


_TOKEN = re.compile(r"^(?P<acc>>?)(?P<p>[^:/]+)(?::(?P<d>[0-9.]+))?(?::(?P<v>[0-9.]+))?(?:/(?P<f>.*))?$")


def parse_flags(s: str | None) -> dict:
    out: dict[str, Any] = {}
    if not s:
        return out
    for tok in s.split(","):
        tok = tok.strip()
        if not tok:
            continue
        if "=" in tok:
            k, v = tok.split("=", 1)
            try:
                out[k] = float(v)
            except ValueError:
                out[k] = v
        else:
            m = re.match(r"^([a-zA-Z_]+)(-?[0-9.]+)$", tok)
            if m:
                out[m.group(1)] = float(m.group(2))
            else:
                out[tok] = True
    return out


def parse_pitch(p: str):
    if p in ("r", "-", "."):
        return None
    parts = p.split("+")
    ps = [note_num(x) for x in parts]
    return ps[0] if len(ps) == 1 else ps


class Track:
    def __init__(self, score: "Score", name: str, instrument, *, stem: str, bus: str, gameplay: bool,
                 swing: float | None, humanize: dict | None, lane: str | None, accent_lane: str | None,
                 drum_lanes: dict | None, mix: dict | None, seed: int):
        self.score = score
        self.name = name
        self.instrument = instrument
        self.stem = stem
        self.bus = bus
        self.gameplay = gameplay
        self.swing = swing
        self.humanize = dict(humanize or {})
        if gameplay and self.humanize.get("timing_ms", 0) > 0:
            raise ValueError(f"track {name}: gameplay tracks may not humanize timing (it would desync the beat map)")
        self.lane = lane
        self.accent_lane = accent_lane
        self.drum_lanes = drum_lanes
        self.mix = dict(mix or {})
        self.events: list[Event] = []
        self.automation: dict[str, list[tuple[float, float]]] = {}
        self.seed = seed

    # ----------------------------------------------------------------- authoring
    def hit(self, beat: float, piece: str, vel: float = 0.8, dur: float = 0.25, **params) -> "Track":
        self.events.append(Event(float(beat), dur, None, vel, piece, params))
        return self

    def note(self, beat: float, pitch, dur: float = 1.0, vel: float = 0.8, piece: str | None = None, **params) -> "Track":
        if isinstance(pitch, (list, tuple)):
            pitch = [note_num(p) for p in pitch]
        elif pitch is not None:
            pitch = note_num(pitch)
        self.events.append(Event(float(beat), dur, pitch, vel, piece, params))
        return self

    def pattern(self, start: float, bars: float = 1, steps: int = 16, vel: dict | None = None,
                accent: float = 1.0, normal: float = 0.8, ghost: float = 0.4, **rows: str) -> "Track":
        """Step-sequencer rows per piece. One pattern string covers ONE bar and is repeated for
        `bars` bars (or give a longer string covering several bars).
        'X' accent, 'x' normal, 'o' ghost, '.'/'-' rest, digits 1-9 = vel 0.1..0.9; spaces/'|' ignored."""
        bpb = self.score.beats_per_bar
        for piece, pat in rows.items():
            pat = pat.replace(" ", "").replace("|", "")
            step_beats = bpb / steps
            n_total = int(round(bars * steps))
            for i in range(n_total):
                c = pat[i % len(pat)]
                if c in ".-":
                    continue
                v = {"X": accent, "x": normal, "o": ghost}.get(c)
                if v is None and c.isdigit():
                    v = int(c) / 10.0
                if v is None:
                    raise ValueError(f"bad pattern char {c!r} in {piece}")
                if vel and piece in vel:
                    v *= vel[piece]
                self.hit(start + i * step_beats, piece, v, dur=step_beats, accent=(c == "X"))
        return self

    def seq(self, start: float, spec: str, vel: float = 0.8, dur: float = 0.5, **params) -> float:
        """Sequential tokens: `[>]PITCH[+PITCH..][:DUR][:VEL][/flags]`, rest = `r:DUR`.
        '>' marks a riff accent (goes to accent_lane if the track has one).
        flags: comma list, e.g. `/pm` palm mute, `/bend2` bend +2 st, `/slide-3`, `/vib`, `/straight`
        (exempt from swing), `/len=0.25` (sounding length in beats, independent of the step).
        Returns the beat after the last token."""
        b = float(start)
        for tok in spec.split():
            if tok == "|":
                continue
            m = _TOKEN.match(tok)
            if not m:
                raise ValueError(f"bad token {tok!r}")
            d = float(m.group("d")) if m.group("d") else dur
            p = parse_pitch(m.group("p"))
            if p is not None:
                v = float(m.group("v")) if m.group("v") else vel
                fl = parse_flags(m.group("f"))
                if m.group("acc"):
                    fl["accent"] = True
                    v = max(v, min(1.0, vel + 0.15))
                allp = {**params, **fl}
                dur_play = allp.pop("len", d)
                self.events.append(Event(b, float(dur_play), p, v, None, allp))
            b += d
        return b

    def automate(self, param: str, points: list[tuple[float, float]]) -> "Track":
        """Linear automation, points = [(beat, value), ...]. Mixer params: gain_db, pan, lpf, hpf.
        Instruments may read others (e.g. organ 'leslie' 0 slow .. 1 fast, guitar 'drive')."""
        self.automation.setdefault(param, []).extend(points)
        self.automation[param].sort()
        return self

    # ----------------------------------------------------------------- resolve
    def resolve(self) -> list[Resolved]:
        sc = self.score
        rng = np.random.default_rng(self.seed)
        sw = sc.swing if self.swing is None else self.swing
        tj = self.humanize.get("timing_ms", 0.0)
        vj = self.humanize.get("vel", 0.0)
        out = []
        for ev in sorted(self.events, key=lambda e: e.beat):
            swe = 0.0 if ev.params.get("straight") else sw
            b = swing_beat(ev.beat, swe)
            end_b = swing_beat(ev.beat + ev.dur, swe)
            hms = float(rng.normal(0, tj)) if tj > 0 else 0.0
            hms = float(np.clip(hms, -2.5 * tj, 2.5 * tj)) if tj > 0 else 0.0
            t = sc.time(b) + hms / 1000.0
            vel = float(np.clip(ev.vel * (1 + rng.normal(0, vj)) if vj > 0 else ev.vel, 0.02, 1.0))
            dur_s = max(0.0, sc.time(end_b) - sc.time(b))
            start = int(round((t + sc.pre_roll) * sc.sr))
            out.append(Resolved(b + hms / 1000.0 / sc.spb, ev.beat, t, start, dur_s, int(round(dur_s * sc.sr)),
                                ev.pitch, vel, ev.piece, dict(ev.params), sc.spb, hms))
        return out

    def automation_curve(self, param: str, n: int, default: float) -> np.ndarray | None:
        pts = self.automation.get(param)
        if not pts:
            return None
        sc = self.score
        xs = np.array([(sc.time(b) + sc.pre_roll) * sc.sr for b, _ in pts])
        ys = np.array([v for _, v in pts], dtype=float)
        return np.interp(np.arange(n), xs, ys, left=ys[0], right=ys[-1])


class Score:
    def __init__(self, id: str, title: str, bpm: float, beats_per_bar: int = 4, *, key: str = "E2",
                 scale: str | list = "minor", swing: float = 0.0, swing_ratio: float | None = None, sr: int = 48000, pre_roll: float = 0.25,
                 tail: float = 2.5, artist: str | None = None, seed: int = 1):
        self.id = id
        self.title = title
        self.artist = artist
        self.bpm = float(bpm)
        self.beats_per_bar = beats_per_bar
        self.key_root = int(note_num(key))
        self.scale = SCALES[scale] if isinstance(scale, str) else list(scale)
        self.scale_name = scale if isinstance(scale, str) else "custom"
        self.swing = swing_ratio_to_amount(swing_ratio) if swing_ratio is not None else swing
        self.sr = sr
        self.pre_roll = pre_roll
        self.tail = tail
        self.seed = seed
        self.sections: list[Section] = []
        self.tracks: dict[str, Track] = {}
        self.harmony: list[tuple[float, list[int], str]] = []
        self.markers: dict[str, list[dict]] = {}
        self.stops: list[dict] = []
        self.buses: dict[str, dict] = {}

    # ----------------------------------------------------------------- time
    @property
    def spb(self) -> float:
        return 60.0 / self.bpm

    def time(self, beat: float) -> float:
        return beat * self.spb

    def sample(self, beat: float) -> int:
        return int(round((self.time(beat) + self.pre_roll) * self.sr))

    @property
    def length_bars(self) -> int:
        return sum(s.bars for s in self.sections)

    @property
    def length_beats(self) -> float:
        return float(self.length_bars * self.beats_per_bar)

    @property
    def n_samples(self) -> int:
        return int(math.ceil((self.pre_roll + self.time(self.length_beats) + self.tail) * self.sr))

    def b(self, bar: float, beat: float = 0.0) -> float:
        return bar * self.beats_per_bar + beat

    # ----------------------------------------------------------------- structure
    def section(self, name: str, bars: int, label: str | None = None, energy: float | None = None, **meta) -> Section:
        s = Section(name, self.length_bars, bars, self.beats_per_bar, label or name, energy, meta)
        self.sections.append(s)
        return s

    def sec(self, name: str) -> Section:
        for s in self.sections:
            if s.name == name:
                return s
        raise KeyError(name)

    def track(self, name: str, instrument, *, stem: str | None = None, bus: str = "music", gameplay: bool = False,
              swing: float | None = None, humanize: dict | None = None, lane: str | None = None,
              accent_lane: str | None = None, drum_lanes: dict | None = None, **mix) -> Track:
        """mix kwargs: gain_db, pan, width, eq=[...], comp={...}, sends={'room':0.2,'hall':0.1}, sat=..."""
        tr = Track(self, name, instrument, stem=stem or name, bus=bus, gameplay=gameplay, swing=swing,
                   humanize=humanize, lane=lane, accent_lane=accent_lane, drum_lanes=drum_lanes, mix=mix,
                   seed=self.seed * 1000 + len(self.tracks) * 17 + 3)
        self.tracks[name] = tr
        return tr

    def chord(self, beat: float, chord: str | list[int], name: str | None = None) -> None:
        """Harmony span from `beat` until the next chord. 'E7', 'A', 'Bm', 'E5' or semitone list from key root."""
        if isinstance(chord, str):
            m = re.match(r"^([A-G][#b]?)(.*)$", chord)
            root = int(note_num(m.group(1) + "2")) - self.key_root
            tones = [(root % 12) + t for t in CHORD_QUALITIES[m.group(2)]]
            name = name or chord
        else:
            tones = list(chord)
        self.harmony.append((float(beat), tones, name or ""))
        self.harmony.sort(key=lambda h: h[0])

    def mark(self, lane: str, beat: float, **data) -> None:
        """Arbitrary beat-map marker (e.g. 'shouts' cue with no audio, 'riff' phrase starts, 'cue')."""
        self.markers.setdefault(lane, []).append({"beat": float(beat), **data})

    def stop(self, beat: float, beats: float, kind: str = "stop", keep: tuple = (), fade_ms: float = 12.0, **data) -> None:
        """Band stop / break: every track except `keep` is gated silent from `beat` for `beats`
        (reverb tails ring). Emits a 'stops' lane event."""
        self.stops.append({"beat": float(beat), "beats": float(beats), "kind": kind, "keep": tuple(keep),
                           "fade_ms": fade_ms, **data})

    def bus(self, name: str, **settings) -> None:
        self.buses[name] = settings
