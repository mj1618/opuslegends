"""Beat <-> time on a per-beat grid, exactly as the engine's piecewise-constant TempoMap reproduces it from one
tempo point per beat (time is linear inside each beat, the tempo changes on every beat)."""
from __future__ import annotations

import numpy as np


class TimeGrid:
    def __init__(self, file_times, sr=44100):
        """file_times: file time (s) of beats 0..N-1 (beat 0 = song bar 1 beat 1)."""
        self.ft = np.asarray(file_times, float)
        self.offset = float(self.ft[0])          # audioOffset: file time of beat 0
        self.t = self.ft - self.offset           # song time (Conductor time): 0 at beat 0
        self.n = len(self.t)
        self.sr = sr
        self.spb = np.diff(self.t)

    def beat_to_time(self, b):
        b = np.asarray(b, float)
        i = np.clip(np.floor(b).astype(int), 0, self.n - 2)
        return self.t[i] + (b - i) * self.spb[i]

    def time_to_beat(self, t):
        t = np.asarray(t, float)
        i = np.clip(np.searchsorted(self.t, t, side="right") - 1, 0, self.n - 2)
        return i + (t - self.t[i]) / self.spb[i]

    def file_time_to_beat(self, ft):
        return self.time_to_beat(np.asarray(ft, float) - self.offset)

    def sample(self, b):
        return np.round((self.beat_to_time(b) + self.offset) * self.sr).astype(np.int64)

    def tempo_points(self, decimals=5):
        pts = [{"beat": i, "bpm": round(60.0 / float(self.spb[i]), decimals)} for i in range(self.n - 1)]
        return pts

    def ev(self, beat, **fields):
        """lane event dict in the beat-map schema"""
        b = float(beat)
        d = {"beat": round(b, 5), "t": round(float(self.beat_to_time(b)), 5), "sample": int(self.sample(b))}
        d.update(fields)
        return d
