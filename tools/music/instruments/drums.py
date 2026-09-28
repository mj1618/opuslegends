"""Synthesized rock kit + stomp/cowbell/clap percussion.

Pieces (event.piece): kick, snare, rimshot, floortom, tom, hat, openhat, crash, china, ride,
ridebell, cowbell, clap, stomp.

Every voice is built from physically-motivated layers:
  * membranes (kick/snare/toms/stomp): pitched modal sines with a fast pitch drop + filtered
    noise for beater/stick/wires, soft saturation per piece, a little per-hit random variation;
  * metals (hats/cymbals/ride): inharmonic modal partials + STFT-shaped noise with
    frequency-dependent decay (bright wash dies first), decorrelated L/R for width;
  * cowbell: classic two band-limited squares (≈540/800 Hz, slightly detuned) through a
    bandpass, layered with an acoustic modal bell + stick clank.
Samples can replace any piece via instruments.base.Layered(RockKit(), {"snare": Sampler(...)}).
"""
from __future__ import annotations

import math

import numpy as np

from producer import dsp
from producer.dsp import TWO_PI, eq, exp_env, filt
from .base import Instrument, vq

# audience-perspective panning
PAN = {"kick": 0.0, "snare": 0.02, "rimshot": 0.02, "floortom": -0.38, "tom": 0.2, "hat": 0.32, "openhat": 0.32,
       "crash": -0.45, "china": 0.55, "ride": 0.5, "ridebell": 0.5, "cowbell": 0.22, "clap": 0.0, "stomp": 0.0}
LEVEL = {"kick": 1.0, "snare": 0.8, "rimshot": 0.8, "floortom": 0.55, "tom": 0.5, "hat": 0.42, "openhat": 0.3,
         "crash": 0.5, "china": 0.2, "ride": 0.3, "ridebell": 0.3, "cowbell": 0.5, "clap": 0.5, "stomp": 0.95}


def _t(n, sr):
    return np.arange(n) / sr


def kick(vel, sr, rng, tune=1.0):
    n = int(0.55 * sr)
    t = _t(n, sr)
    f = 47 * tune + 105 * tune * np.exp(-t / 0.028) + 90 * np.exp(-t / 0.0035)
    ph = dsp.phase_from_freq(f, sr, rng.uniform(-0.1, 0.1))
    body = np.sin(ph) * exp_env(n, sr, 0.30, attack=0.0004)
    body += 0.18 * np.sin(2 * ph + 0.4) * np.exp(-t / 0.05)
    knock = filt(rng.standard_normal(n), "bp", 1100, sr, 1.1) * np.exp(-t / 0.010) * 0.55
    click = eq(rng.standard_normal(n), sr, [("hp", 3000, 0.7), ("lp", 9000, 0.7)]) * np.exp(-t / 0.0022) * 0.7
    tick = np.sin(TWO_PI * 3200 * t) * np.exp(-t / 0.0012) * 0.25
    x = body + (knock + click + tick) * (0.4 + 0.8 * vel ** 2)
    x = np.tanh(1.8 * x) / math.tanh(1.8)
    x = eq(x, sr, [("hp", 38, 0.8), ("peak", 68, 1.2, 1.0), ("peak", 380, 1.3, -6), ("peak", 3800, 1.0, 3.5)])
    return x * vel ** 1.2


def snare(vel, sr, rng, tune=1.0, rim=False):
    n = int(0.55 * sr)
    t = _t(n, sr)
    f1 = 188 * tune * (1 + 0.12 * vel * np.exp(-t / 0.012))
    body = np.zeros(n)
    for r, a, d in [(1.0, 1.0, 0.075), (1.59, 0.55, 0.05), (2.14, 0.35, 0.04), (2.65, 0.2, 0.03)]:
        body += a * np.sin(dsp.phase_from_freq(f1 * r, sr, rng.uniform(0, 6.28))) * np.exp(-t / d)
    wire_tau = 0.10 + 0.08 * vel
    wires = rng.standard_normal(n)
    wires = eq(wires, sr, [("hp", 1800, 0.7), ("peak", 3800, 0.8, 1.5), ("lp", 8500, 0.7), ("hs", 6000, 0.7, -4)])
    wires *= (1 - np.exp(-t / 0.0015)) * np.exp(-t / wire_tau)
    crack = filt(rng.standard_normal(n), "hp", 2200, sr) * np.exp(-t / 0.0028)
    crack = filt(crack, "lp", 7000, sr)
    x = 1.25 * body * exp_env(n, sr, 1.0, 0.0003) + 0.42 * wires * (0.55 + 0.45 * vel) + crack * (0.3 + 0.4 * vel ** 2)
    if rim:
        x += 0.6 * np.sin(TWO_PI * 910 * t) * np.exp(-t / 0.018) + 0.5 * crack
    x = np.tanh(1.6 * x) / math.tanh(1.6)
    x = eq(x, sr, [("hp", 95, 0.7), ("peak", 210, 1.0, 3), ("peak", 520, 1.2, -3), ("peak", 2200, 1.0, 1.5)])
    return x * vel ** 1.1


def tom(vel, sr, rng, f0=86.0, decay=0.55):
    n = int((decay * 2.2 + 0.1) * sr)
    t = _t(n, sr)
    fcurve = f0 * (1 + 0.28 * vel * np.exp(-t / 0.035))
    x = np.zeros(n)
    for r, a, d in [(1.0, 1.0, decay), (1.59, 0.45, decay * 0.45), (2.14, 0.25, decay * 0.28), (2.30, 0.18, decay * 0.2),
                    (2.92, 0.1, decay * 0.12)]:
        x += a * np.sin(dsp.phase_from_freq(fcurve * r, sr, rng.uniform(0, 6.28))) * np.exp(-t / d)
    x *= exp_env(n, sr, 10.0, 0.0006)
    stick = filt(rng.standard_normal(n), "bp", 2400, sr, 0.8) * np.exp(-t / 0.004) * 0.55
    thud = filt(rng.standard_normal(n), "lp", 400, sr) * np.exp(-t / 0.02) * 0.6
    x = x + (stick + thud) * (0.5 + 0.6 * vel)
    x = np.tanh(1.7 * x) / math.tanh(1.7)
    x = eq(x, sr, [("hp", f0 * 0.6, 0.7), ("peak", 450, 1.0, -5), ("peak", 3500, 1.0, 3)])
    return x * vel ** 1.1


# 808 hat/cymbal oscillator bank frequencies
_METAL = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]


def _metal_bank(n, sr, rng, scale=1.0, detune=0.01):
    t_phase = np.arange(n)
    x = np.zeros(n)
    for f in _METAL:
        ff = f * scale * (1 + rng.uniform(-detune, detune))
        hmax = int((sr * 0.45) // ff)
        hmax = hmax if hmax % 2 else hmax - 1
        ph = TWO_PI * ff * t_phase / sr + rng.uniform(0, 6.28)
        x += dsp.blit_square(ph, max(1, hmax))
    return x / len(_METAL)


def hat(vel, sr, rng, open_=False):
    dur = 0.9 if open_ else 0.16
    n = int(dur * sr)
    t = _t(n, sr)
    metal = _metal_bank(n, sr, rng, scale=1.5)
    noise = rng.standard_normal(n)
    x = 0.8 * metal + 0.6 * noise
    x = eq(x, sr, [("hp", 6500, 0.7, 4), ("peak", 9000, 1.2, 4), ("lp", 14000, 0.7)])
    tau = 0.28 if open_ else 0.022 + 0.01 * vel
    env = np.exp(-t / tau) * (1 - np.exp(-t / 0.0004))
    if not open_:
        env += 0.25 * np.exp(-t / 0.0025)
    return x * env * vel ** 1.3 * 0.6


def cymbal(vel, sr, rng, kind="crash"):
    dur = {"crash": 3.4, "china": 2.4, "ride": 2.6}[kind]
    n = int(dur * sr)
    t = _t(n, sr)
    base_tau = {"crash": 1.5, "china": 0.9, "ride": 1.8}[kind]

    def env_fn(f, tt):
        fk = np.maximum(f, 20) / 1000.0
        shape = np.where(f < 300, 0.0, 1.0) * (fk / 5.0) ** 0.35 / (1 + (fk / 13.0) ** 4)
        if kind == "ride":
            shape *= 0.5
        tau = base_tau * (0.55 + 0.9 / (1 + (fk / 4.5) ** 1.3))
        burst = 1.8 * np.exp(-tt / 0.045) * (fk > 3.0)
        return shape * (np.exp(-tt / tau) + burst) * (1 - np.exp(-tt / 0.003))

    out = []
    for ch in range(2):
        wash = dsp.shaped_noise(n, sr, rng, env_fn)
        partials = np.zeros(n)
        count = 70 if kind != "ride" else 40
        fs = np.exp(rng.uniform(math.log(420), math.log(12000), count))
        for f in fs:
            a = (f / 1000) ** -0.25 * rng.uniform(0.3, 1.0)
            d = base_tau * rng.uniform(0.4, 1.2) * (1 + 0.6 / (1 + f / 3000))
            partials += a * np.sin(TWO_PI * f * (1 + 0.0015 * np.sin(TWO_PI * 3.1 * t)) * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
        partials /= math.sqrt(count)
        x = wash * 9 + 0.14 * partials
        if kind == "china":
            x = np.tanh(2.5 * x)
        if kind == "ride":
            ping = np.zeros(n)
            for f, a in [(612, 1.0), (1415, 0.6), (2280, 0.4), (3790, 0.35), (5200, 0.25)]:
                ping += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6)) * np.exp(-t / 0.45)
            x = 0.6 * x + 0.12 * ping
        stick = filt(rng.standard_normal(n), "bp", 3500, sr, 0.8) * np.exp(-t / 0.003) * 0.4
        x = filt(x + stick, "hp", 350, sr)
        out.append(x)
    x = np.stack(out)
    m = 0.5 * (x[0] + x[1])
    s = 0.5 * (x[0] - x[1])
    x = np.stack([m + 0.7 * s, m - 0.7 * s])
    return x * vel ** 1.2 / (np.max(np.abs(x)) + 1e-9) * 0.9


def ridebell(vel, sr, rng):
    n = int(1.8 * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    for f, a, d in [(740, 1.0, 1.2), (1110, 0.5, 0.8), (1760, 0.7, 0.9), (2330, 0.4, 0.6), (3120, 0.3, 0.4), (4450, 0.2, 0.3)]:
        x += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6)) * np.exp(-t / d)
    x += filt(rng.standard_normal(n), "hp", 4000, sr) * np.exp(-t / 0.2) * 0.08
    x += filt(rng.standard_normal(n), "bp", 3000, sr, 1) * np.exp(-t / 0.003) * 0.6
    return x * vel ** 1.2 * 0.4


def cowbell(vel, sr, rng, pitch=1.0):
    """Two detuned band-limited squares (808 style) through a bandpass + acoustic bell layer."""
    n = int(0.7 * sr)
    t = _t(n, sr)
    sq = np.zeros(n)
    for f in (545.0 * pitch, 818.0 * pitch):
        f *= 1 + rng.uniform(-0.003, 0.003)
        hmax = int((sr * 0.45) // f)
        hmax = hmax if hmax % 2 else hmax - 1
        sq += dsp.blit_square(TWO_PI * f * t + rng.uniform(0, 6.28), hmax)
    sq = eq(sq, sr, [("hp", 480, 0.7), ("bp", 1650, 0.75), ("peak", 820, 2.0, 4)]) * 2.2
    env = 0.62 * np.exp(-t / 0.011) + 0.38 * np.exp(-t / 0.11)
    env *= 1 - np.exp(-t / 0.0003)
    bell = np.zeros(n)
    for r, a, d in [(1.0, 1.0, 0.16), (1.504, 0.8, 0.12), (2.41, 0.45, 0.07), (3.53, 0.3, 0.05), (4.71, 0.18, 0.035)]:
        bell += a * np.sin(TWO_PI * 562 * pitch * r * t + rng.uniform(0, 6)) * np.exp(-t / d)
    clank = filt(rng.standard_normal(n), "bp", 3200, sr, 1.2) * np.exp(-t / 0.0025) * 1.2
    x = 0.65 * sq * env + 0.35 * bell * 0.5 + clank * (0.3 + 0.7 * vel)
    x = np.tanh(1.3 * x)
    return x * vel ** 1.15


def clap(vel, sr, rng):
    n = int(0.6 * sr)
    t = _t(n, sr)
    out = []
    for ch in range(2):
        env = np.zeros(n)
        offs = [0.0, 0.0085 + rng.uniform(-0.001, 0.001), 0.019 + rng.uniform(-0.002, 0.002), 0.029 + rng.uniform(-0.002, 0.002)]
        for i, o in enumerate(offs):
            tt = np.maximum(t - o, 0) * (t >= o)
            env += (t >= o) * np.exp(-tt / 0.0038) * (1.0 if i < 3 else 0.9)
        last = offs[-1]
        env += (t >= last) * 0.55 * np.exp(-np.maximum(t - last, 0) / 0.095)
        x = rng.standard_normal(n) * env
        x = eq(x, sr, [("hp", 650, 0.7), ("bp", 1250, 0.9), ("peak", 2600, 1.0, 5)]) * 2.2
        out.append(x)
    x = np.stack(out)
    return x * vel ** 1.2


def stomp(vel, sr, rng):
    """Boot on a wooden stage: sub thump + boomy board + wood knock + heel slap."""
    n = int(0.5 * sr)
    t = _t(n, sr)
    f = 41 + 32 * np.exp(-t / 0.03)
    sub = np.sin(dsp.phase_from_freq(f, sr)) * np.exp(-t / 0.14) * (1 - np.exp(-t / 0.001))
    board = filt(rng.standard_normal(n), "lp", 260, sr, 0.9) * np.exp(-t / 0.045) * 2.2
    knock = np.zeros(n)
    for fr, a, d in [(118, 1.0, 0.06), (243, 0.7, 0.04), (395, 0.45, 0.025), (610, 0.3, 0.02)]:
        knock += a * np.sin(TWO_PI * fr * t + rng.uniform(0, 6)) * np.exp(-t / d)
    slap = filt(rng.standard_normal(n), "bp", 1800, sr, 0.7) * np.exp(-t / 0.006) * 0.8
    x = 1.0 * sub + 0.55 * board + 0.45 * knock + slap * (0.3 + 0.7 * vel)
    x = np.tanh(1.5 * x) / math.tanh(1.5)
    x = eq(x, sr, [("hp", 40, 0.7), ("peak", 130, 1.0, 2), ("peak", 300, 1.0, -3), ("peak", 2000, 1.0, 2)])
    return x * vel ** 1.1


class RockKit(Instrument):
    """Pieces as documented in the module docstring. Per-event params:
    tune (float, pitch multiplier); gang (int, extra layered stomps delayed 2-14 ms for a
    crowd feel — the first onset stays exactly on the grid)."""
    mono = False
    variants = 4

    def __init__(self, levels: dict | None = None, pans: dict | None = None, tune: float = 1.0):
        super().__init__()
        self.levels = {**LEVEL, **(levels or {})}
        self.pans = {**PAN, **(pans or {})}
        self.tune = tune

    def voice_key(self, ev):
        return (ev.piece, vq(ev.vel, 10), ev.params.get("tune", 1.0), ev.params.get("gang", 0))

    def voice(self, ev, sr, rng):
        p = ev.piece
        v = ev.vel
        tune = ev.params.get("tune", 1.0) * self.tune
        if p == "kick":
            x = kick(v, sr, rng, tune)
        elif p in ("snare", "rimshot"):
            x = snare(v, sr, rng, tune, rim=(p == "rimshot" or bool(ev.params.get("rim"))))
        elif p == "floortom":
            x = tom(v, sr, rng, 84 * tune, 0.5)
        elif p == "tom":
            x = tom(v, sr, rng, 128 * tune, 0.38)
        elif p == "hat":
            x = hat(v, sr, rng, False)
        elif p == "openhat":
            x = hat(v, sr, rng, True)
        elif p in ("crash", "china", "ride"):
            x = cymbal(v, sr, rng, p)
        elif p == "ridebell":
            x = ridebell(v, sr, rng)
        elif p == "cowbell":
            x = cowbell(v, sr, rng, tune)
        elif p == "clap":
            x = clap(v, sr, rng)
        elif p == "stomp":
            x = stomp(v, sr, rng)
            for g in range(int(ev.params.get("gang", 0))):
                d = int(rng.uniform(0.002, 0.014) * sr)
                y = stomp(v * rng.uniform(0.6, 0.9), sr, rng)
                x[d:] += y[: len(x) - d] * 0.6
        else:
            raise ValueError(f"unknown drum piece {p}")
        x = x * self.levels.get(p, 0.8)
        if x.ndim == 1:
            x = dsp.to_stereo(x, self.pans.get(p, 0.0))
        return x

    def render(self, events, n, sr, rng, track=None):
        # open-hat choke: an openhat is cut when the next hat/openhat arrives
        hats = [e for e in events if e.piece in ("hat", "openhat")]
        out = super().render([e for e in events if e.piece != "openhat"], n, sr, rng, track)
        for i, e in enumerate(hats):
            if e.piece != "openhat":
                continue
            x = self.voice(e, sr, rng)
            nxt = next((h for h in hats[i + 1:] if h.start > e.start), None)
            if nxt is not None:
                L = nxt.start - e.start
                if L < x.shape[1]:
                    x = x[:, :L + int(0.012 * sr)].copy()
                    fl = int(0.012 * sr)
                    x[:, -fl:] *= np.linspace(1, 0, fl)
            dsp.place(out, x, e.start)
        return out
