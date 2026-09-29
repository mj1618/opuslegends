"""HITS: the percussive accents that replaced every shouted HEY / HUP in the game (iteration 9b; user playtest: "just
change the 'heys' to more of a hitting sound effect").

Built from the sampled kit (DRSKit CC-BY 4.0: cross-stick, kick, snare, floor tom) + VCSL (CC0: hand clap, concert
bass drum) + synthesis, all from the compact sample cache (instruments/sample_cache.py). Every hit is aligned so its
envelope reaches 50 % of its attack peak at `PRE` (the beat), like the old gang shouts, so beat-map lanes and the
game's `align: true` scheduling put the SMACK on the beat.

    strike_hit(i, sr, big=False)   the hero's cue strike: a pool-cue CRACK (leather tip snap + maple shaft ring, the
                                   kit's cross-stick) into a body-punch THUMP (kick beater, a skin-slap clap pitched
                                   down, a pitched sub) + a short transient tail (a small, dark room). `i` = the
                                   round-robin variant (different samples, tuning, weights). big = the heavy variant
                                   (heave / giants / the break shot / the final hit): + concert bass drum, a snare CRACK,
                                   a deeper sub, a longer tail.
    crowd_hit(sr, seed, size)      the audience hits WITH you: a gang of boots + hand claps (stereo, 0-14 ms spread)
    HitAccents                     the overlay 'shouts' stem as hits: 'HEY' = the big accent (the house's stomp + claps +
                                   a cue crack + punch), 'HUP' = a lighter jab (punch + tip snap + a few claps).
                                   params: voices (the old gang size) -> how many boots / claps.
"""
from __future__ import annotations

import math

import numpy as np

from producer import dsp
from producer.dsp import TWO_PI, eq, filt
from . import sample_cache as sc
from .base import Instrument
from .drums import stomp as synth_stomp

PRE = 0.05          # s of pre-roll in every voice (the attack's 50 % point sits here)


# --------------------------------------------------------------------------- samples
def _hits(section, piece):
    return sc.section(section)[piece]["hits"]


def _samp(section, piece, vel, k=0, rate=1.0, n_s=0.8, sr=sc.SR):
    """a cached one-shot (mono) at velocity layer nearest `vel`, round-robin index k, pitched by `rate`, at `sr` (the
    cache is 48 kHz), starting at its transient, `n_s` s long (zero-padded)"""
    from .sampled import resample_ratio, wav
    hs = _hits(section, piece)
    best = min(abs(h["vel"] - vel) for h in hs)
    pool = [h for h in hs if abs(h["vel"] - vel) - best < 1e-6]
    h = pool[k % len(pool)]
    x = wav(h["f"])[:, int(h["on"]):]
    r = rate * sc.SR / sr
    if abs(r - 1) > 1e-4:
        x = resample_ratio(x, r)
    x = x.mean(axis=0)
    n = int(n_s * sr)
    x = x[:n] if len(x) >= n else np.pad(x, (0, n - len(x)))
    return x / (np.max(np.abs(x)) + 1e-12)


def _t(n, sr):
    return np.arange(n) / sr


def _env(n, sr, tau, attack=0.0003):
    t = _t(n, sr)
    return np.exp(-t / tau) * (1 - np.exp(-t / attack))


def _gate(x, sr, hold, tau):
    """hold then exponential release (tightens a sample's ring)"""
    t = _t(len(x), sr)
    return x * np.where(t < hold, 1.0, np.exp(-(t - hold) / tau))


def _room_ir(sr, rng, rt=0.22, lp=4500.0, pre_ms=6.0):
    """a small dark room: a few early reflections + a noise tail (RT60 `rt`), low-passed (stereo)"""
    n = int((rt * 1.3 + pre_ms / 1000) * sr)
    t = _t(n, sr)
    out = []
    for ch in range(2):
        h = rng.standard_normal(n) * np.exp(-t * 6.91 / rt) * (t > pre_ms / 1000)
        for d, a in ((0.0071, 0.5), (0.0113, 0.35), (0.0167, 0.3), (0.0229, 0.2)):
            i = int((d + rng.uniform(-0.0012, 0.0012)) * sr)
            h[i] += a * (1 if rng.random() < 0.5 else -1) * 12
        h = filt(h, "lp", lp, sr)
        h = filt(h, "hp", 180, sr)
        out.append(h / (np.sqrt(np.sum(h ** 2)) + 1e-12))
    return np.stack(out)


def _conv(x, ir):
    """mono x through a stereo IR -> stereo, len(x)"""
    return np.stack([dsp.fftconv(x, ir[c])[: len(x)] for c in range(2)])


def _align(y, sr, pre=PRE):
    """shift so the envelope reaches 50 % of its attack peak exactly at `pre` s (stereo or mono)"""
    from scipy import signal
    m = y.mean(axis=0) if y.ndim == 2 else y
    env = np.abs(signal.hilbert(m))
    sm = max(1, int(0.0005 * sr))
    env = np.convolve(env, np.ones(sm) / sm, mode="same")
    head = env[: int(pre * sr) + int(0.08 * sr)]
    cross = int(np.nonzero(head >= 0.5 * head.max())[0][0])
    shift = cross - int(pre * sr)
    if shift > 0:
        y = y[..., shift:]
    elif shift < 0:
        y = np.pad(y, ((0, 0), (-shift, 0)) if y.ndim == 2 else (-shift, 0))
    return y


# --------------------------------------------------------------------------- layers
def cue_crack(sr, rng, k=0, tune=1.0, amt=1.0):
    """the pool cue's CRACK: a leather tip snap (a 1 ms band of noise at ~2.8 kHz) + the maple shaft's ring (three
    hard-wood modes, 10-25 ms) + the kit's cross-stick (real wood on wood), tuned up to a tighter, harder knock"""
    n = int(0.25 * sr)
    t = _t(n, sr)
    tip = filt(rng.standard_normal(n), "bp", 2800 * tune, sr, 0.9) * _env(n, sr, 0.0011, 0.00008) * 1.6
    tip += filt(rng.standard_normal(n), "hp", 5000, sr) * _env(n, sr, 0.0005, 0.00005) * 0.7
    shaft = np.zeros(n)
    for f, a, d in ((1320, 1.0, 0.022), (2870, 0.65, 0.014), (4630, 0.35, 0.008)):
        f = f * tune * rng.uniform(0.985, 1.015)
        shaft += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6)) * _env(n, sr, d, 0.0002)
    stick = _samp("kit", "sidestick", 1.0, k, rate=1.12 * tune, n_s=0.25, sr=sr)
    stick = _gate(filt(stick, "hp", 500, sr), sr, 0.012, 0.018)
    x = 0.9 * tip + 0.45 * shaft + 0.8 * stick
    return x * amt


def punch_body(sr, rng, k=0, tune=1.0, amt=1.0, big=False):
    """the body-punch THUMP: the kick's beater smack (low-passed: the thud of a fist, not a drum), a hand-clap pitched
    down and darkened into a skin SLAP, a short pitched sub (the mass), a low-passed noise thud"""
    n = int(0.6 * sr)
    t = _t(n, sr)
    kick = _samp("kit", "kick", 1.0, k, rate=1.08 * tune, n_s=0.6, sr=sr)
    kick = _gate(eq(kick, sr, [("hp", 65, 0.7), ("peak", 160, 0.9, 3.0), ("lp", 3000, 0.7)]), sr, 0.025, 0.04 if not big else 0.08)
    tom = _samp("kit", "floortom", 1.0, k, rate=1.25 * tune, n_s=0.6, sr=sr)
    tom = _gate(eq(tom, sr, [("hp", 90, 0.7), ("lp", 1600, 0.7)]), sr, 0.02, 0.035 if not big else 0.07)
    slap = _samp("perc", "clap", 0.85, k, rate=0.78 * tune, n_s=0.6, sr=sr)
    slap = _gate(eq(slap, sr, [("hp", 250, 0.7), ("lp", 3200, 0.8), ("peak", 900, 1.0, 3.0)]), sr, 0.006, 0.02)
    f0 = (78 if not big else 52) * tune
    f = f0 + (f0 * 1.6) * np.exp(-t / 0.014)
    sub = np.sin(dsp.phase_from_freq(f, sr)) * _env(n, sr, 0.04 if not big else 0.12, 0.0006)
    thud = filt(filt(rng.standard_normal(n), "lp", 600, sr), "hp", 90, sr) * _env(n, sr, 0.022, 0.0004) * 2.2
    x = 0.6 * kick + 0.45 * tom + 1.0 * slap + (0.3 if not big else 0.4) * sub + 0.5 * thud
    return x * amt


def impact_tail(x, sr, rng, rt=0.22, wet=0.28):
    """a short transient tail: the hit in a small dark room (stereo), dry kept centred"""
    ir = _room_ir(sr, rng, rt=rt)
    y = np.pad(x, (0, int(rt * 1.3 * sr)))
    w = _conv(y, ir)
    w *= np.max(np.abs(y)) / (np.max(np.abs(w)) + 1e-12)
    return np.stack([y, y]) + wet * w


# the hero's four round-robin variants: (sample rr index, tuning, crack weight, body weight)
STRIKE_VARIANTS = ((0, 1.00, 1.00, 1.00), (1, 0.96, 0.92, 1.08), (2, 1.04, 1.06, 0.94), (3, 0.98, 0.96, 1.04))


def strike_hit(i, sr, big=False, seed=900):
    """the hero's strike: CRACK + THUMP + tail (mono-compatible stereo), attack's 50 % at PRE"""
    rng = np.random.default_rng(seed + 31 * i + (500 if big else 0))
    k, tune, wc, wb = STRIKE_VARIANTS[i % len(STRIKE_VARIANTS)]
    n = int((0.9 if big else 0.55) * sr)
    crack = cue_crack(sr, rng, k, tune, wc * 1.9)
    body = punch_body(sr, rng, k, tune * (0.94 if big else 1.0), wb, big=big)
    x = np.zeros(n)
    d = int(0.0015 * sr)          # the tip lands a hair before the body gives: 'k-THUD'
    x[: len(crack)] += crack[:n]
    x[d: d + len(body)] += body[: n - d]
    if big:
        boom = _samp("perc", "bassdrum", 1.0, k, rate=1.0, n_s=0.9, sr=sr)
        boom = _gate(filt(boom, "lp", 1800, sr), sr, 0.08, 0.22)
        snr = _samp("kit", "snare", 1.0, k, rate=0.97, n_s=0.5, sr=sr)
        snr = _gate(eq(snr, sr, [("hp", 160, 0.7), ("peak", 4200, 1.0, 2.0)]), sr, 0.03, 0.08)
        x[: len(boom)] += 0.45 * boom[:n]
        x[: len(snr)] += 0.55 * snr[:n]
    x = np.tanh(1.8 * x / (np.max(np.abs(x)) + 1e-12)) / math.tanh(1.8)
    x = eq(x, sr, [("hp", 36, 0.7), ("peak", 330, 1.0, -2.5), ("peak", 3300, 0.9, 2.0), ("lp", 14000, 0.7)])
    y = impact_tail(x, sr, rng, rt=0.4 if big else 0.24, wet=0.45 if big else 0.4)
    y = _align(y, sr)
    fade = int(0.04 * sr)
    y[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    return y / (np.max(np.abs(y)) + 1e-12)


def crowd_hit(sr, seed=950, size=1.0, claps=6, boots=4, spread=0.85):
    """the house hits WITH you: `boots` stomps on the boards + `claps` hand claps, each a different sample / timing
    (0-14 ms late, the first exactly on the beat), spread L/R. size scales the lows (a bigger house)"""
    rng = np.random.default_rng(seed)
    n = int(0.6 * sr)
    out = np.zeros((2, n + int(PRE * sr)))
    p0 = int(PRE * sr)
    for j in range(boots):
        s = synth_stomp(rng.uniform(0.75, 1.0), sr, rng)[:n]
        late = 0 if j == 0 else int(rng.uniform(0.002, 0.014) * sr)
        pan = float(rng.uniform(-spread, spread)) if j else 0.0
        dsp.place(out, dsp.to_stereo(s, pan) * math.sqrt(2) * (0.9 if j else 1.0) * size, p0 + late)
    for j in range(claps):
        c = _samp("perc", "clap", rng.choice([0.7, 0.85, 1.0]), int(rng.integers(0, 8)), rate=rng.uniform(0.94, 1.06), n_s=0.4, sr=sr)
        c = _gate(c, sr, 0.01, 0.05)
        late = int(rng.uniform(0.0, 0.012) * sr)
        pan = float(rng.uniform(-spread, spread))
        dsp.place(out, dsp.to_stereo(c, pan) * math.sqrt(2) * rng.uniform(0.5, 0.8), p0 + late)
    # off the record's bass: the boards' knock (120-400 Hz) and the heel slaps carry it, not the 41 Hz sub
    out = eq(out, sr, [("hp", 80, 0.7), ("hp", 80, 0.7), ("peak", 320, 1.0, -2.0), ("peak", 2200, 0.9, 2.0)])
    ir = _room_ir(sr, rng, rt=0.3)
    wet = np.stack([dsp.fftconv(out.mean(axis=0), ir[c])[: out.shape[1]] for c in range(2)])
    wet *= np.max(np.abs(out)) / (np.max(np.abs(wet)) + 1e-12)
    out = out + 0.25 * wet
    out = _align(out, sr)
    return out / (np.max(np.abs(out)) + 1e-12)


# --------------------------------------------------------------------------- the overlay stem
class HitAccents(Instrument):
    """The 'shouts' overlay stem as HITS (a drop-in for SampledGangShouts: same events, same lane). event.piece =
    the slot's word: 'HEY' (and HO / WHOA / YEAH) = the big accent: the house's boots + claps + a cue CRACK + a punch
    THUMP (+ the concert bass drum for voices >= 14); 'HUP' (and HA) = a lighter jab: punch + tip snap + a few claps.
    params: voices (the old gang size, 8-16) -> boots / claps / weight. Aligned: the attack's 50 % on the event."""
    mono = False
    variants = 4
    lane_kind = "GangShouts"      # beat map: the same 'shouts' lane (the slots didn't move)
    LIGHT = {"HUP", "HA"}

    def __init__(self, level: float = 1.0, **_):
        super().__init__()
        self.level = level

    def voice_key(self, ev):
        return (ev.piece.upper() in self.LIGHT, int(ev.params.get("voices", 12)))

    def voice(self, ev, sr, rng):
        light = ev.piece.upper() in self.LIGHT
        nv = int(ev.params.get("voices", 12))
        seed = int(rng.integers(0, 1 << 30))
        k = int(rng.integers(0, 4))
        if light:
            h = strike_hit(k, sr, big=False, seed=seed)
            c = crowd_hit(sr, seed + 1, size=0.6, claps=3, boots=1, spread=0.6)
            y = _mix(h, 1.0, c, 0.45, sr)
        else:
            big = nv >= 14
            h = strike_hit(k, sr, big=big, seed=seed)
            c = crowd_hit(sr, seed + 1, size=1.0, claps=min(8, 3 + nv // 3), boots=min(6, 2 + nv // 4))
            y = _mix(h, 0.85, c, 0.8, sr)
        return y * ev.vel

    def render(self, events, n, sr, rng, track=None):
        out = np.zeros((2, n))
        p0 = int(PRE * sr)
        for i, ev in enumerate(events):
            key = (self.voice_key(ev), i % self.variants)
            sig = self._cache.get(key)
            if sig is None:
                sig = self._cache[key] = self.voice(ev, sr, rng)
            dsp.place(out, sig, ev.start - p0)
        return out * self.level


def _mix(a, ga, b, gb, sr):
    n = max(a.shape[1], b.shape[1])
    y = np.zeros((2, n))
    y[:, : a.shape[1]] += ga * a
    y[:, : b.shape[1]] += gb * b
    y = _align(y, sr)
    return y / (np.max(np.abs(y)) + 1e-12)
