"""Additive 'modal string' model shared by guitars and bass.

Why additive instead of Karplus-Strong: KS can't be vectorised with fractional delay +
continuous pitch changes, but leads need bends/slides/vibrato. A string is a sum of
partials k*f0*sqrt(1+B k^2) with pluck-position comb, pick brightness and per-partial
decay; the phase integrates a per-sample pitch curve, so bends are free and alias-safe
(partials above 0.45*sr are skipped at the curve's highest pitch).
"""
from __future__ import annotations

import math

import numpy as np

from producer import dsp
from producer.dsp import TWO_PI


def pitch_curve(n, sr, ev, *, base_dur=None) -> np.ndarray:
    """Per-sample semitone offset from params: bend (st), bend_at (s), bend_time (s), bend_rel (bool),
    slide (st, start offset that glides to 0), slide_time (s), vib (depth st, True=0.22),
    vib_rate (Hz), vib_delay (s)."""
    t = np.arange(n) / sr
    c = np.zeros(n)
    p = ev.params
    if p.get("slide"):
        st = float(p["slide"])
        tt = float(p.get("slide_time", 0.07))
        x = np.clip(t / tt, 0, 1)
        c += st * (1 - (3 * x ** 2 - 2 * x ** 3))
    if p.get("bend"):
        st = float(p["bend"])
        at = float(p.get("bend_at", 0.04))
        bt = float(p.get("bend_time", 0.11))
        x = np.clip((t - at) / bt, 0, 1)
        c += st * (3 * x ** 2 - 2 * x ** 3)
        if p.get("bend_rel"):
            d = base_dur if base_dur is not None else ev.dur_s
            x2 = np.clip((t - (d - bt)) / bt, 0, 1)
            c -= st * (3 * x2 ** 2 - 2 * x2 ** 3)
    if p.get("vib"):
        depth = 0.22 if p["vib"] is True else float(p["vib"])
        rate = float(p.get("vib_rate", 5.6))
        dl = float(p.get("vib_delay", 0.14))
        fade = np.clip((t - dl) / 0.2, 0, 1)
        c += depth * fade * np.sin(TWO_PI * rate * np.maximum(t - dl, 0))
    if p.get("fall"):
        # pitch fall-off at the note end (e.g. -5 st)
        d = base_dur if base_dur is not None else ev.dur_s
        x = np.clip((t - d * 0.6) / max(d * 0.4, 0.05), 0, 1)
        c += float(p["fall"]) * x ** 2
    return c


def modal_string(f0, n, sr, rng, *, curve=None, bright=0.6, pos=0.16, tau=2.0, B=6e-5, kmax=48,
                 hf_tau_hz=2500.0, pick_noise=0.08, detune_cents=0.0, phase_rand=True):
    """Return mono string tone (n samples). curve = per-sample semitone offsets or None."""
    t = np.arange(n) / sr
    f0 = f0 * 2 ** (detune_cents / 1200)
    if curve is None:
        finst = np.full(n, f0)
        fmax = f0
    else:
        finst = f0 * 2 ** (curve / 12)
        fmax = float(np.max(finst))
    ph = TWO_PI * np.cumsum(finst) / sr
    K = int(min(kmax, (0.45 * sr) // fmax))
    x = np.zeros(n)
    p = 1.55 - 0.75 * bright  # spectral slope of pick excitation
    norm = 0.0
    for k in range(1, K + 1):
        comb = abs(math.sin(math.pi * k * pos)) + 0.04
        a = comb / k ** p
        fk = k * f0
        tk = tau / (1.0 + (fk / hf_tau_hz) ** 1.4)
        stretch = math.sqrt(1 + B * k * k)
        phi = rng.uniform(0, TWO_PI) if phase_rand else 0.0
        x += a * np.sin(k * stretch * ph + phi) * np.exp(-t / tk)
        norm += a
    x /= max(norm, 1e-9) ** 0.7
    if pick_noise > 0:
        m = min(n, int(0.01 * sr))
        pn = dsp.filt(rng.standard_normal(m), "bp", 2800 + 2500 * bright, sr, 0.8) * np.exp(-np.arange(m) / (0.0016 * sr))
        x[:m] += pick_noise * pn
    return x


def release_env(n, sr, hold, rel=0.04):
    """1 until `hold` samples, then exponential damp (string muted by hand)."""
    e = np.ones(n)
    if hold < n:
        tr = np.arange(n - hold) / sr
        e[hold:] = np.exp(-tr / max(rel / 4.6, 1e-4))
    return e
