"""Picked electric bass: modal string + pick click, DI/amp blend with gentle drive."""
from __future__ import annotations

import math

import numpy as np

from producer import dsp
from producer.dsp import eq, filt
from .base import Instrument, vq
from .strings import modal_string, pitch_curve, release_env


class _BassDI(Instrument):
    variants = 2

    def __init__(self, bright=0.55, tau=1.6):
        super().__init__()
        self.bright = bright
        self.tau = tau

    def voice_key(self, ev):
        if any(k in ev.params for k in ("bend", "slide", "vib", "fall")):
            return None
        return (float(np.atleast_1d(ev.pitch)[0]), vq(ev.vel), round(ev.dur_s, 3), bool(ev.params.get("pm")))

    def voice(self, ev, sr, rng):
        pm = bool(ev.params.get("pm"))
        hold_s = ev.dur_s * 0.9
        n = int((hold_s + 0.08) * sr)
        curve = pitch_curve(n, sr, ev, base_dur=hold_s) if any(k in ev.params for k in ("bend", "slide", "vib", "fall")) else None
        f0 = float(dsp.mtof(float(np.atleast_1d(ev.pitch)[0])))
        x = modal_string(f0, n, sr, rng, curve=curve, bright=self.bright * (0.6 if pm else 1.0) * (0.75 + 0.25 * ev.vel),
                         pos=rng.uniform(0.1, 0.16), tau=0.25 if pm else self.tau, kmax=36, B=1.2e-4,
                         hf_tau_hz=700 if pm else 1600, pick_noise=0.12)
        x *= release_env(n, sr, int(hold_s * sr), 0.03)
        return x * ev.vel ** 1.0


class Bass(Instrument):
    """Picked bass. drive 0..1 blends a saturated upper band over a clean DI low end."""
    mono = True

    def __init__(self, drive=0.5, bright=0.55, level=1.0):
        super().__init__()
        self.drive = drive
        self.bright = bright
        self.level = level

    def render(self, events, n, sr, rng, track=None):
        di = _BassDI(self.bright).render(events, n, sr, rng)
        di /= np.max(np.abs(di)) + 1e-9
        low = filt(di, "lp", 220, sr, 0.7, order=4)
        u = dsp.upsample(di, 2)
        u = dsp.tube(filt(u, "hp", 180, sr * 2), 4.0, 0.2)
        grit = dsp.downsample(u, 2)
        grit = eq(grit, sr, [("hp", 200, 0.7), ("peak", 900, 0.9, 3), ("lp", 3800, 0.7, 4)])
        clean = eq(di, sr, [("hp", 35, 0.7), ("peak", 80, 1.0, 2), ("peak", 700, 1.0, -2), ("lp", 5000, 0.7)])
        y = 0.8 * clean + self.drive * 0.35 * grit + 0.15 * low
        return y * self.level
