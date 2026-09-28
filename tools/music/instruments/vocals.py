"""Gang shouts ("HEY!", "HUP!", "WHOA!", "HO!", "HA!", "YEAH!") and crowd cheer — pure formant synthesis.

Each voice = band-limited glottal source (pitch contour + jitter/shimmer + aspiration noise)
through a time-varying 5-formant *cascade* (Klatt-style: correct relative formant levels for
free), with word keyframes (consonant aspiration -> vowel -> glide). A gang layers 8-12 voices
with different pitch, vocal-tract length, pan and 0-25 ms *late-only* onset spread; the
gang's perceptual attack (envelope at 50% of peak, i.e. the vowel) is self-calibrated to land exactly on the beat;
the leading /h/ aspiration is pre-rolled before it.

Licensing note: macOS `say` voices would add realism but Apple's licence limits their
output to personal, non-commercial use — so they are NOT used. For a real upgrade, record a
few people shouting and load them with instruments.base.Sampler (piece = word).
"""
from __future__ import annotations

import math

import numpy as np
from scipy import signal

from producer import dsp
from producer.dsp import TWO_PI, eq, filt
from .base import Instrument
from .drums import clap

# loud/shouted male formants (Hz); F1 raised vs. conversational values
VOWELS = {
    "A": [800, 1250, 2600, 3500, 4500],
    "E": [620, 1800, 2600, 3500, 4500],
    "I": [420, 2050, 2750, 3550, 4500],
    "O": [580, 930, 2500, 3400, 4500],
    "U": [370, 780, 2400, 3300, 4500],
    "AE": [730, 1650, 2550, 3500, 4500],
    "UH": [680, 1200, 2550, 3500, 4500],
}
BW = [95, 115, 170, 230, 300]

# keyframes: (time s, vowel, amplitude, noise ratio). The vowel onset time 'on' is aligned to the beat.
WORDS = {
    "HEY": dict(on=0.06, frames=[(0.0, "E", 0.0, 1.0), (0.055, "E", 0.35, 1.0), (0.075, "E", 1.0, 0.12),
                                 (0.20, "E", 0.95, 0.1), (0.30, "I", 0.6, 0.12), (0.38, "I", 0.0, 0.3)],
                pitch=[(0.0, 1.0), (0.1, 1.07), (0.25, 1.0), (0.38, 0.86)]),
    "HO": dict(on=0.05, frames=[(0.0, "O", 0.0, 1.0), (0.045, "O", 0.35, 1.0), (0.065, "O", 1.0, 0.1),
                                (0.2, "O", 0.9, 0.1), (0.3, "U", 0.0, 0.2)],
               pitch=[(0.0, 1.0), (0.1, 1.05), (0.3, 0.88)]),
    "HA": dict(on=0.05, frames=[(0.0, "A", 0.0, 1.0), (0.045, "A", 0.4, 1.0), (0.065, "A", 1.0, 0.12),
                                (0.17, "A", 0.85, 0.12), (0.26, "UH", 0.0, 0.3)],
               pitch=[(0.0, 1.0), (0.08, 1.06), (0.26, 0.85)]),
    "WHOA": dict(on=0.07, frames=[(0.0, "U", 0.0, 0.3), (0.05, "U", 0.45, 0.15), (0.1, "O", 1.0, 0.08),
                                  (0.45, "O", 0.95, 0.08), (0.62, "U", 0.7, 0.1), (0.75, "U", 0.0, 0.2)],
                 pitch=[(0.0, 0.92), (0.1, 1.06), (0.3, 1.04), (0.75, 0.74)]),
    # short, punchy "HUP!": /h/ -> open-mid vowel -> lip closure, with a light /p/ release burst
    "HUP": dict(on=0.05, frames=[(0.0, "UH", 0.0, 1.0), (0.042, "UH", 0.35, 1.0), (0.062, "UH", 1.0, 0.1),
                                 (0.125, "UH", 0.95, 0.1), (0.15, "U", 0.25, 0.1), (0.165, "U", 0.0, 0.2)],
                pitch=[(0.0, 1.0), (0.07, 1.1), (0.165, 0.97)], burst=(0.19, 0.22)),
    # disappointed audience "OOOH" (falls in pitch)
    "OOH": dict(on=0.08, frames=[(0.0, "U", 0.0, 0.3), (0.08, "U", 0.6, 0.1), (0.3, "O", 1.0, 0.08),
                                 (0.85, "O", 0.8, 0.1), (1.15, "U", 0.0, 0.25)],
                pitch=[(0.0, 1.12), (0.3, 1.06), (1.15, 0.78)]),
    # iteration 6 (the near-miss WHEW): an admiring, RELIEVED audience "ooOOH" that climbs instead of falling
    "OOHUP": dict(on=0.08, frames=[(0.0, "U", 0.0, 0.3), (0.1, "U", 0.55, 0.12), (0.4, "O", 1.0, 0.08),
                                   (0.8, "O", 0.95, 0.1), (1.0, "U", 0.0, 0.25)],
                  pitch=[(0.0, 0.86), (0.4, 1.0), (0.8, 1.16), (1.0, 1.1)]),
    "YEAH": dict(on=0.05, frames=[(0.0, "I", 0.0, 0.2), (0.05, "I", 0.7, 0.1), (0.12, "E", 1.0, 0.08),
                                  (0.28, "AE", 1.0, 0.08), (0.45, "A", 0.8, 0.1), (0.58, "UH", 0.0, 0.2)],
                 pitch=[(0.0, 0.95), (0.12, 1.08), (0.35, 1.02), (0.58, 0.8)]),
}


def _interp_frames(frames, t, stretch):
    ts = np.array([f[0] for f in frames]) * stretch
    F = np.array([VOWELS[f[1]] for f in frames], float)
    amps = np.interp(t, ts, [f[2] for f in frames])
    noise = np.interp(t, ts, [f[3] for f in frames])
    formants = np.stack([np.exp(np.interp(t, ts, np.log(F[:, i]))) for i in range(5)])
    return formants, amps, noise


def _cascade(x, formants, bws, sr, block=64):
    """Time-varying 5-resonator cascade (unity DC gain per resonator)."""
    n = len(x)
    y = np.zeros(n)
    zi = np.zeros((5, 2))
    for s in range(0, n, block):
        e = min(n, s + block)
        secs = []
        for i in range(5):
            f = float(formants[i, s])
            r = math.exp(-math.pi * bws[i] / sr)
            c = 2 * r * math.cos(TWO_PI * min(f, sr * 0.45) / sr)
            g = 1 - c + r * r
            secs.append([g, 0, 0, 1, -c, r * r])
        y[s:e], zi = signal.sosfilt(np.array(secs), x[s:e], zi=zi)
    return y


def shout_voice(word, sr, rng, f0=200.0, tract=1.0, dur_scale=1.0, effort=1.0):
    """One voice saying `word`. Returns (signal, onset_samples) where onset = vowel onset."""
    w = WORDS[word]
    stretch = dur_scale
    total = max(w["frames"][-1][0], w.get("burst", (0, 0))[0] + 0.015) * stretch + 0.03
    n = int(total * sr)
    t = np.arange(n) / sr
    formants, amps, noise_r = _interp_frames(w["frames"], t, stretch)
    formants = formants * tract
    pts = w["pitch"]
    pc = np.interp(t, [p[0] * stretch for p in pts], [p[1] for p in pts])
    jitter = dsp.onepole_lp(rng.standard_normal(n), 25, sr) * 0.35
    f = f0 * pc * (1 + 0.012 * jitter + 0.004 * np.sin(TWO_PI * rng.uniform(4.5, 6.5) * t))
    ph = TWO_PI * np.cumsum(f) / sr
    K = int(6000 // (f0 * 1.15))
    src = np.zeros(n)
    tilt = 1.15 - 0.3 * effort
    for k in range(1, K + 1):
        src += np.sin(k * ph + 0.3 * k) / k ** tilt
    # shouted-voice roughness: a weak subharmonic (period-doubling) component, strongest at high effort
    rough = 0.22 * effort
    if rough > 0:
        for k in range(1, K + 1):
            src += rough * np.sin((k - 0.5) * ph + 0.7 * k) / k ** (tilt + 0.3)
    src /= 3.0
    # glottal-synchronous aspiration + breath
    asp = rng.standard_normal(n) * (0.5 + 0.5 * np.maximum(np.sin(ph), 0))
    asp = filt(asp, "hp", 400, sr)
    shimmer = 1 + 0.06 * dsp.onepole_lp(rng.standard_normal(n), 40, sr)
    exc = src * (1 - noise_r) * shimmer + asp * noise_r * 0.55 + asp * 0.04
    y = _cascade(exc, formants, [b * (1.0 + 0.2 * effort) for b in BW], sr)
    y = filt(y, "hp", 120, sr)  # lip radiation-ish + rumble removal
    y *= dsp.onepole_lp(amps, 120, sr)
    if w.get("burst"):
        bt, ba = w["burst"]
        k = int(bt * stretch * sr)
        m = min(int(0.012 * sr), n - k)
        if m > 0:
            b = filt(rng.standard_normal(m), "bp", 1400, sr, 0.8) * np.exp(-np.arange(m) / (0.0025 * sr))
            y[k:k + m] += ba * np.max(np.abs(y)) * b / (np.max(np.abs(b)) + 1e-9)
    y = np.tanh(1.8 * effort * y / (np.max(np.abs(y)) + 1e-9)) / math.tanh(1.8 * effort)
    return y, int(w["on"] * stretch * sr)


class GangShouts(Instrument):
    """event.piece = word ('HEY', 'HUP', 'WHOA', 'HO', 'HA', 'YEAH'). params: voices (int), dur (stretch)."""
    mono = False
    variants = 3

    def __init__(self, voices=10, spread=0.8, level=1.0, high_voices=2):
        super().__init__()
        self.voices = voices
        self.spread = spread
        self.level = level
        self.high = high_voices

    def voice_key(self, ev):
        return (ev.piece, int(ev.params.get("voices", self.voices)), round(float(ev.params.get("stretch", 1.0)), 2))

    def voice(self, ev, sr, rng):
        word = ev.piece.upper()
        nv = int(ev.params.get("voices", self.voices))
        stretch = float(ev.params.get("stretch", 1.0))
        pre = int(0.1 * sr * stretch)
        parts = []
        for i in range(nv):
            high = i >= nv - self.high
            f0 = rng.uniform(290, 380) if high else rng.uniform(150, 250)
            tract = rng.uniform(1.1, 1.2) if high else rng.uniform(0.93, 1.07)
            y, on = shout_voice(word, sr, rng, f0, tract, stretch * rng.uniform(0.94, 1.08), rng.uniform(0.8, 1.0))
            late = 0 if i == 0 else int(min(abs(rng.normal(0, 0.009)), 0.025) * sr)
            pan = 0.0 if i == 0 else rng.uniform(-self.spread, self.spread)
            parts.append((y, pre - on + late, pan, rng.uniform(0.7, 1.0)))
        n = max(p[1] + len(p[0]) for p in parts) + 1
        out = np.zeros((2, n))
        for y, off, pan, g in parts:
            dsp.place(out, dsp.to_stereo(y * g, pan), off)
        out = eq(out, sr, [("hp", 140, 0.7), ("peak", 300, 1.0, -2), ("peak", 3000, 1.0, 2.5), ("lp", 9000, 0.7)])
        out /= math.sqrt(nv)
        # self-calibrate the perceptual onset: shift so the gang envelope reaches 50% of its peak
        # exactly `pre` samples in (i.e. on the beat), whatever the word/stretch/voice spread
        env = np.abs(signal.hilbert(out.mean(axis=0)))
        sm = int(0.0005 * sr)
        env = np.convolve(env, np.ones(sm) / sm, mode="same")
        head = env[: pre + int(0.12 * sr)]  # judge the attack, not a later swell (long WHOA)
        cross = int(np.nonzero(head >= 0.5 * head.max())[0][0])
        shift = cross - pre
        if shift > 0:
            out = out[:, shift:]
        elif shift < 0:
            out = np.pad(out, ((0, 0), (-shift, 0)))
        return out * ev.vel

    def render(self, events, n, sr, rng, track=None):
        out = np.zeros((2, n))
        for i, ev in enumerate(events):
            k = (self.voice_key(ev), i % self.variants)
            sig = self._cache.get(k)
            if sig is None:
                sig = self.voice(ev, sr, rng)
                self._cache[k] = sig
            pre = int(0.1 * sr * float(ev.params.get("stretch", 1.0)))
            dsp.place(out, sig, ev.start - pre)  # vowel onset lands exactly on ev.start
        return out * self.level


class Crowd(Instrument):
    """Crowd cheer / roar. piece 'cheer' (burst with whoops, whistles, claps) or 'roar' (sustained bed).
    Event dur sets the length."""
    mono = False

    def __init__(self, level=1.0, people=26):
        super().__init__()
        self.level = level
        self.people = people

    def voice(self, ev, sr, rng):
        dur = max(1.0, ev.dur_s)
        n = int((dur + 1.2) * sr)
        t = np.arange(n) / sr
        out = np.zeros((2, n))
        env = np.clip(t / 0.15, 0, 1) * np.exp(-np.maximum(t - dur * 0.6, 0) / (dur * 0.35))
        # roar bed: pink noise through broad vocal-ish bands, slow AM
        for ch in range(2):
            r = dsp.pink(n, rng)
            r = eq(r, sr, [("hp", 250, 0.7), ("peak", 700, 0.8, 5), ("peak", 1700, 1.0, 3), ("lp", 4500, 0.7, 4)])
            am = 1 + 0.25 * dsp.onepole_lp(rng.standard_normal(n), 3, sr) * 8
            out[ch] += 0.09 * r * env * np.clip(am, 0.3, 2)
        if ev.piece == "cheer":
            for i in range(self.people):
                word = rng.choice(["YEAH", "WHOA", "HEY", "HO"])
                f0 = rng.uniform(170, 420)
                st = rng.uniform(1.4, 3.2) * min(dur, 2.0) / 1.5
                y, on = shout_voice(word, sr, rng, f0, rng.uniform(0.92, 1.2), st, rng.uniform(0.5, 1.0))
                off = int(rng.uniform(0, 0.45) * sr)
                dsp.place(out, dsp.to_stereo(y * rng.uniform(0.15, 0.4), rng.uniform(-0.9, 0.9)), off)
            for i in range(3):  # whistles
                m = int(rng.uniform(0.6, 1.1) * sr)
                tt = np.arange(m) / sr
                fw = rng.uniform(1900, 2600) * (1 + 0.25 * np.minimum(tt / 0.25, 1)) * (1 - 0.2 * np.maximum(tt - 0.6, 0))
                wv = np.sin(TWO_PI * np.cumsum(fw) / sr) * np.clip(tt / 0.05, 0, 1) * np.exp(-np.maximum(tt - 0.5, 0) / 0.1)
                dsp.place(out, dsp.to_stereo(wv * 0.05, rng.uniform(-0.8, 0.8)), int(rng.uniform(0.1, 0.5) * sr))
            n_claps = int(dur * 14)
            for i in range(n_claps):
                c = clap(rng.uniform(0.3, 0.7), sr, rng) * 0.1
                dsp.place(out, c * np.array([[rng.uniform(0.2, 1)], [rng.uniform(0.2, 1)]]), int(rng.uniform(0.05, dur) * sr))
        return out * ev.vel

    def render(self, events, n, sr, rng, track=None):
        out = np.zeros((2, n))
        for ev in events:
            dsp.place(out, self.voice(ev, sr, rng), ev.start)
        return out * self.level
