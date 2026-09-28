"""Instrument base class + one-shot/multisample player.

An instrument turns a list of ``Resolved`` events into audio:

    render(events, n, sr, rng, track) -> np.ndarray, shape (2, n) (or (n,) mono)

Most instruments only implement ``voice(ev, sr, rng) -> mono|stereo array`` and let the
base class place voices on the timeline. Voices are cached by ``voice_key`` so repeated
identical hits (drums!) are rendered once; ``variants`` keeps several random takes per key
so repeats don't sound machine-gunned.
"""
from __future__ import annotations

import glob
import math
import os
import re

import numpy as np
from scipy import signal
from scipy.io import wavfile

from producer.dsp import place


class Instrument:
    variants = 3          # random takes cached per voice key
    mono = True           # voices are mono (panned by mixer) unless False

    def __init__(self):
        self._cache: dict = {}

    def voice_key(self, ev):
        """Return a hashable key for caching, or None to disable caching for this event."""
        return None

    def voice(self, ev, sr, rng) -> np.ndarray:
        raise NotImplementedError

    def render(self, events, n, sr, rng, track=None) -> np.ndarray:
        out = np.zeros(n) if self.mono else np.zeros((2, n))
        for i, ev in enumerate(events):
            key = self.voice_key(ev)
            if key is not None:
                k = (key, i % self.variants)
                sig = self._cache.get(k)
                if sig is None:
                    sig = self.voice(ev, sr, rng)
                    self._cache[k] = sig
            else:
                sig = self.voice(ev, sr, rng)
            place(out, sig, ev.start)
        return out


def expand_chords(events):
    """Split chord events (pitch = list) into one event per pitch."""
    from dataclasses import replace
    out = []
    for e in events:
        if isinstance(e.pitch, (list, tuple, np.ndarray)):
            out.extend(replace(e, pitch=float(p), params=dict(e.params)) for p in sorted(e.pitch))
        else:
            out.append(e)
    return out


def vq(v, steps=8):
    """velocity quantiser for cache keys"""
    return int(round(v * steps))


# --------------------------------------------------------------------------- sampler
def load_wav(path: str, sr: int) -> np.ndarray:
    """Load a WAV as float (2, n) at `sr` (resampled with a polyphase filter if needed)."""
    fs, data = wavfile.read(path)
    if data.dtype.kind == "i":
        data = data.astype(np.float64) / float(np.iinfo(data.dtype).max)
    elif data.dtype.kind == "u":
        data = (data.astype(np.float64) - 128) / 128.0
    else:
        data = data.astype(np.float64)
    data = data.T if data.ndim == 2 else np.stack([data, data])
    if data.shape[0] > 2:
        data = data[:2]
    if fs != sr:
        g = math.gcd(fs, sr)
        data = signal.resample_poly(data, sr // g, fs // g, axis=-1)
    return data


class Sampler(Instrument):
    """One-shot / multisample player for later CC0/CC-BY sample packs.

    zones: list of dicts {path|glob, piece?, root (MIDI)?, lo, hi (MIDI range)?, vel_lo, vel_hi}
      - drum usage: {"piece": "snare", "glob": "kit/snare_v*_rr*.wav", "vel_lo": 0, "vel_hi": 1}
      - pitched:    {"glob": "piano/C4_*.wav", "root": 60, "lo": 58, "hi": 62}
    Round-robin across files matching a zone; velocity picks the zone; pitch shift by
    resampling (fine within a few semitones). Gain scales with velocity**vel_curve.
    """
    mono = False

    def __init__(self, zones: list[dict], base_dir: str = ".", vel_curve: float = 1.6, release_ms: float = 60.0):
        super().__init__()
        self.base_dir = base_dir
        self.vel_curve = vel_curve
        self.release_ms = release_ms
        self.zones = []
        for z in zones:
            files = sorted(glob.glob(os.path.join(base_dir, z.get("glob") or z["path"])))
            if not files:
                raise FileNotFoundError(f"Sampler zone matched no files: {z}")
            self.zones.append({**z, "files": files})
        self._loaded: dict[tuple, np.ndarray] = {}
        self._rr: dict[int, int] = {}

    def render(self, events, n, sr, rng, track=None):
        return super().render(expand_chords(events), n, sr, rng, track)

    def _get(self, path, sr):
        k = (path, sr)
        if k not in self._loaded:
            self._loaded[k] = load_wav(path, sr)
        return self._loaded[k]

    def _zone_for(self, ev):
        cands = []
        for i, z in enumerate(self.zones):
            if "piece" in z and z["piece"] != ev.piece:
                continue
            if ev.pitch is not None and "lo" in z and not (z["lo"] <= ev.pitch <= z["hi"]):
                continue
            if not (z.get("vel_lo", 0.0) <= ev.vel <= z.get("vel_hi", 1.0) + 1e-9):
                continue
            cands.append(i)
        return cands[0] if cands else None

    def voice(self, ev, sr, rng):
        zi = self._zone_for(ev)
        if zi is None:
            return np.zeros((2, 1))
        z = self.zones[zi]
        rr = self._rr.get(zi, 0)
        self._rr[zi] = rr + 1
        x = self._get(z["files"][rr % len(z["files"])], sr)
        if ev.pitch is not None and "root" in z:
            ratio = 2 ** ((float(np.atleast_1d(ev.pitch)[0]) - z["root"]) / 12.0)
            if abs(ratio - 1) > 1e-4:
                n_out = int(x.shape[1] / ratio)
                x = signal.resample(x, n_out, axis=-1)
        g = ev.vel ** self.vel_curve * z.get("gain", 1.0)
        y = x * g
        if z.get("choke", False) or ev.pitch is not None:
            # note-off release for pitched samples
            n_hold = ev.dur_samples
            nr = int(self.release_ms * 1e-3 * sr)
            if n_hold + nr < y.shape[1]:
                y = y[:, :n_hold + nr].copy()
                y[:, n_hold:] *= np.exp(-np.arange(nr) / (nr / 5.0))
        return y


class Layered(Instrument):
    """Route pieces to different instruments, e.g. sampled snare + synthesized everything else:
    Layered(default=RockKit(), overrides={'snare': Sampler([...])})."""
    mono = False

    def __init__(self, default: Instrument, overrides: dict[str, Instrument]):
        super().__init__()
        self.default = default
        self.overrides = overrides

    def render(self, events, n, sr, rng, track=None):
        out = np.zeros((2, n))
        groups: dict[int, list] = {}
        inst_by_id = {id(self.default): self.default}
        for ev in events:
            inst = self.overrides.get(ev.piece, self.default)
            inst_by_id[id(inst)] = inst
            groups.setdefault(id(inst), []).append(ev)
        for k, evs in groups.items():
            y = inst_by_id[k].render(evs, n, sr, rng, track)
            out += y if y.ndim == 2 else np.stack([y, y]) * math.sqrt(0.5)
        return out


def piece_pan(piece: str, table: dict) -> float:
    return table.get(re.sub(r"\d+$", "", piece or ""), 0.0)
