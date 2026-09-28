"""Bells and world/foley sounds, synthesized. Used by songs (stalactite call, slot ghosts, risers, roar) and by
tools/music/sfx.py for the game's one-shots, so a sound in the song and its one-shot are the same voice.

Bell(kind=...)   pitched; event.pitch = MIDI
    'stalactite'  ice/chalk water-bell: glockenspiel-bar partials (1, 2.76, 5.40, 8.93) + a soft harmonic body
                  (reads as a high piano) + a water-drip chirp on the strike
    'glass'       glass fishing-float chime: inharmonic glass partials with a slow two-copy shimmer
    'buoy'        big cast bell (hum/prime/tierce/quint/nominal) + clapper clank, long decay
    'temple'      small temple bell / singing bowl: strong fundamental, beating bowl partials
    'vibes'       jukebox vibraphone (1:4:10 bar, motor tremolo): the song's call/response riff voice
    'pinball'     pinball / jukebox bell 'ding'

SfxKit()          unpitched pieces (event.piece), dur = event length where it matters:
    oildrum  floor-tom-ish boom with steel-drum body modes (the "BOOM")
    riser    band-passed noise sweep 400 Hz -> 7 kHz, swelling to an abrupt end at the event's end
    roar     Big Jim: 50 Hz growl with vocal fry and subharmonics through low formants, swells over dur
    slam     claw slam: sub thud + rock crunch + debris
    krak     keystone crack: broadband snap + stone tink + low thump + crumble
    whale    breach: water whoosh + splash + droplets + low moan
    gull     rising squawk (wind-up), ~dur long, ends at the event end
    clack    pool-cue jab clack (two hard-wood resonances)
    rim      dry wooden rim clack
    scrape   pick-scrape "zzip" (slide release)
    gong / gong_small / gong_swell   tam-tam with a low E hum / opera gong / rolled tam-tam crescendo (dur)
Theme one-shot recipes (CUE-FU): gong, wood (thock/crack/thunk), paper_rip, crowd_roar_loop, applause,
projector_loop, film_flap, film_burn, whoosh, ball_clack, break_shot, bluff_roar, fist_slam (see sfx.py).
"""
from __future__ import annotations

import math

import numpy as np

from producer import dsp
from producer.dsp import TWO_PI, eq, filt
from .base import Instrument, vq
from .drums import tom
from .vocals import _cascade


def _t(n, sr):
    return np.arange(n) / sr


# --------------------------------------------------------------------------- bells
def bell_voice(kind, m, vel, sr, rng, dur_s=None):
    f0 = float(dsp.mtof(m))
    if kind == "stalactite":
        n = int(1.9 * sr)
        t = _t(n, sr)
        x = np.zeros(n)
        base_tau = 1.25 * (880.0 / f0) ** 0.35
        for r, a, d in [(1.0, 1.0, 1.0), (2.756, 0.34, 0.33), (5.404, 0.14, 0.14), (8.933, 0.05, 0.07)]:
            f = f0 * r
            if f < 0.45 * sr:
                x += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6.28)) * np.exp(-t / (base_tau * d))
        # soft harmonic "piano" body for pitch clarity
        for k in range(1, 7):
            f = f0 * k * math.sqrt(1 + 3e-4 * k * k)
            if f < 0.45 * sr:
                x += 0.28 / k ** 1.6 * np.sin(TWO_PI * f * t + rng.uniform(0, 6.28)) * np.exp(-t / (0.5 * base_tau / k ** 0.5))
        # drip: a fast upward chirp on the strike
        m_d = int(0.018 * sr)
        td = t[:m_d]
        fd = f0 * 2 * (1 + 1.5 * td / 0.018)
        x[:m_d] += 0.35 * np.sin(TWO_PI * np.cumsum(fd) / sr) * np.exp(-td / 0.006)
        tick = filt(rng.standard_normal(int(0.01 * sr)), "bp", 5500, sr, 1.2) * np.exp(-np.arange(int(0.01 * sr)) / (0.0012 * sr))
        x[: len(tick)] += 0.25 * tick
        x *= 1 - np.exp(-t / 0.0004)
        return x * vel ** 1.2 * 0.6
    if kind == "glass":
        n = int(1.6 * sr)
        t = _t(n, sr)
        x = np.zeros(n)
        for r, a, d in [(1.0, 1.0, 1.1), (2.32, 0.5, 0.6), (4.25, 0.3, 0.35), (6.63, 0.16, 0.2), (9.38, 0.08, 0.12)]:
            f = f0 * r
            if f >= 0.45 * sr:
                continue
            ph0 = rng.uniform(0, 6.28)
            for dc in (-1.5, 1.5):  # two phase-locked copies beating slowly: glassy shimmer, no attack cancel
                x += 0.5 * a * np.sin(TWO_PI * f * (1 + dc / 1200) * t + ph0) * np.exp(-t / d)
        tick = filt(rng.standard_normal(int(0.006 * sr)), "hp", 6000, sr) * np.exp(-np.arange(int(0.006 * sr)) / (0.0008 * sr))
        x[: len(tick)] += 0.3 * tick
        x *= 1 - np.exp(-t / 0.0003)
        return x * vel ** 1.2 * 0.55
    if kind == "vibes":
        # jukebox vibraphone: aluminium bar tuned 1 : 4 : 10, soft mallet, motor tremolo (the riff call voice)
        n = int(2.0 * sr)
        t = _t(n, sr)
        x = np.zeros(n)
        tau = 1.5 * (440.0 / f0) ** 0.25
        for r, a, d in [(1.0, 1.0, 1.0), (4.0, 0.22, 0.25), (10.0, 0.06, 0.08)]:
            f = f0 * r
            if f < 0.45 * sr:
                x += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6.28)) * np.exp(-t / (tau * d))
        x *= 1 + 0.28 * np.sin(TWO_PI * 5.2 * t + rng.uniform(0, 6.28))       # motor on
        m = int(0.01 * sr)
        x[:m] += 0.25 * filt(rng.standard_normal(m), "bp", 2 * f0, sr, 1.5) * np.exp(-np.arange(m) / (0.0015 * sr))
        x *= 1 - np.exp(-t / 0.002)
        return x * vel ** 1.2 * 0.6
    if kind == "pinball":
        # pinball / jukebox bell 'ding': small steel bell, bright, quick
        n = int(1.2 * sr)
        t = _t(n, sr)
        x = np.zeros(n)
        for r, a, d in [(1.0, 1.0, 0.55), (2.0, 0.35, 0.3), (2.76, 0.45, 0.22), (5.4, 0.2, 0.08), (8.9, 0.1, 0.04)]:
            f = f0 * r
            if f < 0.45 * sr:
                x += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
        m = int(0.004 * sr)
        x[:m] += 0.5 * filt(rng.standard_normal(m), "hp", 4000, sr) * np.exp(-np.arange(m) / (0.0006 * sr))
        x *= 1 - np.exp(-t / 0.0002)
        return x * vel ** 1.2 * 0.55
    if kind == "temple":
        # small temple bell / singing bowl: strong fundamental, bowl partials, each split into a slowly beating pair
        n = int(2.6 * sr)
        t = _t(n, sr)
        x = np.zeros(n)
        base_tau = 1.6 * (660.0 / f0) ** 0.3
        for r, a, d in [(1.0, 1.0, 1.0), (2.71, 0.42, 0.45), (5.15, 0.2, 0.22), (8.43, 0.08, 0.12)]:
            f = f0 * r
            if f >= 0.45 * sr:
                continue
            ph0 = rng.uniform(0, 6.28)
            beat = rng.uniform(0.7, 1.8) * (1 + 0.3 * r)
            for sgn in (-0.5, 0.5):
                x += 0.5 * a * np.sin(TWO_PI * (f + sgn * beat) * t + ph0) * np.exp(-t / (base_tau * d))
        m = int(0.012 * sr)
        strike = filt(rng.standard_normal(m), "bp", min(3 * f0, 9000), sr, 1.0) * np.exp(-np.arange(m) / (0.002 * sr))
        x[:m] += 0.3 * strike
        x *= 1 - np.exp(-t / 0.0015)
        return x * vel ** 1.2 * 0.6
    if kind == "buoy":
        n = int(3.2 * sr)
        t = _t(n, sr)
        x = np.zeros(n)
        # f0 = nominal; classic bell partials relative to the nominal
        for r, a, d in [(0.25, 0.35, 2.2), (0.5, 0.8, 1.6), (0.6, 0.5, 1.1), (0.75, 0.35, 0.9), (1.0, 1.0, 1.0),
                        (1.25, 0.35, 0.5), (1.5, 0.3, 0.4), (2.0, 0.22, 0.25), (2.61, 0.12, 0.15)]:
            f = f0 * r
            x += a * np.sin(TWO_PI * f * (1 + 0.0008 * np.sin(TWO_PI * 1.3 * t)) * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
        clank = filt(rng.standard_normal(int(0.03 * sr)), "bp", 2400, sr, 1.0)
        clank *= np.exp(-np.arange(len(clank)) / (0.004 * sr))
        x[: len(clank)] += 1.6 * clank
        x = np.tanh(1.4 * x) / math.tanh(1.4)
        x *= 1 - np.exp(-t / 0.0005)
        return x * vel ** 1.1 * 0.5
    raise ValueError(kind)


class Bell(Instrument):
    mono = True
    variants = 2

    def __init__(self, kind="stalactite", level=1.0):
        super().__init__()
        self.kind = kind
        self.level = level

    def voice_key(self, ev):
        return (float(np.atleast_1d(ev.pitch)[0]), vq(ev.vel, 10), ev.params.get("damp"), round(ev.dur_s, 3))

    def voice(self, ev, sr, rng):
        out = None
        for p in np.atleast_1d(ev.pitch):
            v = bell_voice(self.kind, float(p), ev.vel, sr, rng)
            out = v if out is None else out[: len(v)] + v[: len(out)]
        damp = ev.params.get("damp")
        if damp:   # hand-damp the ring `damp` seconds after the note's length
            k = int((ev.dur_s + float(damp)) * sr)
            if k < len(out):
                out = out.copy()
                out[k:] *= np.exp(-np.arange(len(out) - k) / (0.06 * sr))
        return out * self.level


# --------------------------------------------------------------------------- foley / world
def oildrum(vel, sr, rng):
    body = tom(vel, sr, rng, f0=62.0, decay=0.7)
    n = len(body)
    t = _t(n, sr)
    steel = np.zeros(n)
    for f, a, d in [(172, 1.0, 0.45), (287, 0.7, 0.32), (409, 0.55, 0.25), (538, 0.4, 0.2), (731, 0.3, 0.14),
                    (1022, 0.2, 0.09)]:
        steel += a * np.sin(TWO_PI * f * (1 + 0.02 * np.exp(-t / 0.03)) * t + rng.uniform(0, 6)) * np.exp(-t / d)
    slap = filt(rng.standard_normal(n), "bp", 1500, sr, 0.8) * np.exp(-t / 0.005)
    x = body * 1.1 + 0.28 * steel * (1 - np.exp(-t / 0.001)) + 0.35 * slap
    x = np.tanh(1.3 * x) / math.tanh(1.3)
    return eq(x, sr, [("hp", 35, 0.7), ("peak", 70, 1.0, 3), ("peak", 350, 1.2, -3)]) * vel ** 1.1


def riser(dur, vel, sr, rng):
    n = int(max(dur, 0.2) * sr)
    t = _t(n, sr)
    u = t / t[-1]
    fc = 400 * (7000 / 400) ** (u ** 1.3)
    out = []
    for ch in range(2):
        x = dsp.pink(n, rng) * 0.5 + rng.standard_normal(n) * 0.5
        y = dsp.tv_filter(x, "bp", fc, sr, 2.5)
        y = y + 0.4 * dsp.tv_filter(x, "hp", fc * 0.8, sr, 0.7)
        out.append(y)
    y = np.stack(out)
    env = u ** 2.2 * (1 - np.exp(-(1 - u) * n / (0.004 * sr)))
    y = y * env
    return y / (np.max(np.abs(y)) + 1e-9) * vel


def roar(dur, vel, sr, rng, f0=52.0):
    dur = max(dur, 0.6)
    n = int((dur + 0.4) * sr)
    t = _t(n, sr)
    u = np.clip(t / dur, 0, 1)
    pc = 0.85 + 0.35 * np.sin(math.pi * np.clip(u * 0.9, 0, 1)) - 0.25 * np.clip((t - dur) / 0.4, 0, 1)
    jitter = dsp.onepole_lp(rng.standard_normal(n), 12, sr) * 0.6
    f = f0 * pc * (1 + 0.04 * jitter)
    ph = TWO_PI * np.cumsum(f) / sr
    K = int(4000 // f0)
    src = np.zeros(n)
    for k in range(1, K + 1):
        src += np.sin(k * ph + 0.5 * k) / k ** 0.9
        src += 0.55 * np.sin((k - 0.5) * ph + 0.3 * k) / k ** 1.1   # subharmonic growl
    fry = 1 + 0.6 * np.sign(np.sin(TWO_PI * 23 * t + 2 * jitter))
    src = src * (0.6 + 0.4 * fry)
    noise = filt(rng.standard_normal(n), "lp", 2500, sr) * 3.0
    exc = src / K ** 0.5 + noise * 0.35
    formants = np.stack([np.full(n, v) for v in (420.0, 780.0, 1900.0, 2800.0, 3600.0)])
    formants[0] *= 1 + 0.2 * u
    formants[1] *= 1 + 0.25 * u
    y = _cascade(exc, formants, [140, 180, 250, 300, 350], sr)
    y = filt(y, "hp", 35, sr)
    env = np.clip(t / (dur * 0.55), 0, 1) ** 1.6 * np.exp(-np.maximum(t - dur, 0) / 0.12)
    y = y * env
    y = np.tanh(2.2 * y / (np.max(np.abs(y)) + 1e-9)) / math.tanh(2.2)
    y = eq(y, sr, [("peak", 90, 0.8, 4), ("peak", 1200, 1.0, -2), ("lp", 5000, 0.7)])
    return y / (np.max(np.abs(y)) + 1e-9) * vel


def _debris(n, sr, rng, rate=60.0, tau=0.25, start=0.0, lp=3500):
    x = np.zeros(n)
    k = int(rate * tau * 3)
    for _ in range(k):
        ts = start + rng.exponential(tau)
        i = int(ts * sr)
        if i >= n - 200:
            continue
        m = int(rng.uniform(0.002, 0.012) * sr)
        m = min(m, n - i)
        grain = rng.standard_normal(m) * np.exp(-np.arange(m) / (m / 4)) * math.exp(-(ts - start) / tau)
        x[i:i + m] += grain * rng.uniform(0.2, 1.0)
    return filt(x, "lp", lp, sr)


def slam(vel, sr, rng):
    n = int(1.6 * sr)
    t = _t(n, sr)
    f = 32 + 60 * np.exp(-t / 0.04)
    sub = np.sin(dsp.phase_from_freq(f, sr)) * np.exp(-t / 0.35) * (1 - np.exp(-t / 0.001))
    thud = filt(rng.standard_normal(n), "lp", 300, sr) * np.exp(-t / 0.06) * 2.0
    crunch = filt(rng.standard_normal(n), "bp", 900, sr, 0.6) * np.exp(-t / 0.05) * 1.2
    deb = _debris(n, sr, rng, rate=90, tau=0.3, start=0.02)
    x = 1.2 * sub + 0.6 * thud + 0.5 * crunch + 0.8 * deb
    x = np.tanh(1.6 * x) / math.tanh(1.6)
    return eq(x, sr, [("hp", 28, 0.7), ("peak", 60, 1.0, 3)]) * vel


def krak(vel, sr, rng):
    n = int(1.3 * sr)
    t = _t(n, sr)
    snap = filt(rng.standard_normal(n), "hp", 1800, sr) * np.exp(-t / 0.004) * 2.2
    snap2 = filt(rng.standard_normal(n), "bp", 3200, sr, 1.0) * np.exp(-np.maximum(t - 0.012, 0) / 0.006) * (t > 0.012) * 1.4
    tink = np.zeros(n)
    for fr, a, d in [(2210, 1.0, 0.05), (3480, 0.6, 0.035), (5130, 0.4, 0.02)]:
        tink += a * np.sin(TWO_PI * fr * t) * np.exp(-t / d)
    f = 45 + 80 * np.exp(-t / 0.02)
    thump = np.sin(dsp.phase_from_freq(f, sr)) * np.exp(-t / 0.16)
    deb = _debris(n, sr, rng, rate=70, tau=0.35, start=0.05, lp=5000)
    x = snap + snap2 + 0.35 * tink + 0.9 * thump + 0.7 * deb
    x = np.tanh(1.5 * x) / math.tanh(1.5)
    return eq(x, sr, [("hp", 35, 0.7)]) * vel


def whale(vel, sr, rng):
    n = int(2.6 * sr)
    t = _t(n, sr)
    out = []
    for ch in range(2):
        # whoosh (0-0.35 s), splash at 0.35 s, droplets after
        u = np.clip(t / 0.35, 0, 1)
        fc = 300 * (4000 / 300) ** u
        wh = dsp.tv_filter(rng.standard_normal(n), "bp", fc, sr, 1.2) * u ** 2 * (t < 0.36)
        ts = np.maximum(t - 0.35, 0)
        spl = eq(rng.standard_normal(n), sr, [("hp", 150, 0.7), ("peak", 900, 0.7, 4), ("lp", 7000, 0.7)])
        spl *= (t >= 0.35) * (np.exp(-ts / 0.25) + 0.3 * np.exp(-ts / 0.9)) * (1 - np.exp(-ts / 0.003))
        drops = np.zeros(n)
        for _ in range(40):
            i = int((0.5 + rng.exponential(0.4)) * sr)
            if i >= n - 2000:
                continue
            m = int(0.03 * sr)
            fdrop = rng.uniform(900, 2600)
            td = np.arange(m) / sr
            drops[i:i + m] += np.sin(TWO_PI * np.cumsum(fdrop * (1 + 2.5 * td / 0.03)) / sr) * np.exp(-td / 0.008) * rng.uniform(0.1, 0.4)
        out.append(0.8 * wh + 1.0 * spl + drops)
    y = np.stack(out)
    # low moan under it
    fm = 190 - 70 * np.clip(t / 1.8, 0, 1)
    ph = TWO_PI * np.cumsum(fm) / sr
    moan = (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.clip(t / 0.3, 0, 1) * np.exp(-np.maximum(t - 1.2, 0) / 0.4)
    y = y + 0.5 * moan
    y = np.tanh(1.2 * y / (np.max(np.abs(y)) + 1e-9))
    return y * vel


def gull(dur, vel, sr, rng):
    """Rising squawk: 'kee-YOW' wind-up that ends at dur."""
    dur = max(dur, 0.2)
    n = int((dur + 0.06) * sr)
    t = _t(n, sr)
    u = np.clip(t / dur, 0, 1)
    f0 = 780 * (1.9 ** (u ** 1.5)) * (1 + 0.03 * np.sin(TWO_PI * 11 * t))
    ph = TWO_PI * np.cumsum(f0) / sr
    src = np.zeros(n)
    for k in range(1, 9):
        src += np.sin(k * ph) / k ** 0.7
    rough = 1 + 0.55 * np.sin(TWO_PI * 63 * t)
    x = src * rough
    x = eq(x, sr, [("bp", 1800, 0.9), ("peak", 3200, 1.5, 6), ("hp", 600, 0.7)])
    env = np.clip(t / 0.02, 0, 1) * (0.35 + 0.65 * u ** 1.2) * np.exp(-np.maximum(t - dur, 0) / 0.02)
    # 3 syllable pulses, the last one longest
    puls = 0.55 + 0.45 * np.clip(np.sin(TWO_PI * t / dur * 1.5 + 0.2), 0, 1) ** 0.5
    x = x * env * np.where(u > 0.66, 1.0, puls)
    x = np.tanh(2.0 * x / (np.max(np.abs(x)) + 1e-9))
    return x * vel


def clack(vel, sr, rng, hard=True):
    n = int(0.25 * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    modes = [(1180, 1.0, 0.03), (2690, 0.7, 0.018), (4100, 0.35, 0.01)] if hard else [(880, 1.0, 0.025), (1960, 0.6, 0.015), (3300, 0.3, 0.008)]
    for f, a, d in modes:
        x += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6)) * np.exp(-t / d)
    click = filt(rng.standard_normal(n), "hp", 2500, sr) * np.exp(-t / 0.0015)
    x = x + 0.6 * click
    if hard:  # second stick answering 12 ms later: 'cl-ACK'
        k = int(0.012 * sr)
        x[k:] += 0.8 * x[: n - k]
    x *= 1 - np.exp(-t / 0.0002)
    return np.tanh(1.5 * x) * vel


def scrape(vel, sr, rng):
    n = int(0.36 * sr)
    t = _t(n, sr)
    u = t / t[-1]
    fc = 4200 * (700 / 4200) ** u
    x = dsp.tv_filter(rng.standard_normal(n), "bp", fc, sr, 3.0)
    ribs = 0.5 + 0.5 * np.sin(TWO_PI * np.cumsum(120 + 260 * u) / sr) ** 2    # string windings
    env = np.clip(t / 0.01, 0, 1) * (1 - u) ** 1.3
    x = x * ribs * env
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def surf_loop(n, sr, rng, swells=2):
    """Seamlessly loopable breaker roar of exactly n samples: circular FFT noise + integer-cycle swells."""
    out = []
    for ch in range(2):
        X = np.fft.rfft(rng.standard_normal(n))
        f = np.fft.rfftfreq(n, 1 / sr)
        shape = 1 / np.sqrt(np.maximum(f, 20)) * np.exp(-f / 5000) * (1 - np.exp(-f / 60))
        low = np.fft.irfft(X * shape, n)
        hiss = np.fft.irfft(X * (f > 1500) * np.exp(-f / 9000), n)
        k = np.arange(n) / n
        sw = 0.55 + 0.45 * np.sin(TWO_PI * swells * k + ch * 0.4) ** 2
        crash = np.clip(np.sin(TWO_PI * swells * k - 0.6), 0, 1) ** 6
        y = low / np.std(low) * sw + 0.5 * hiss / np.std(hiss) * (0.3 * sw + crash)
        out.append(y)
    y = np.stack(out)
    return y / np.max(np.abs(y))


# --------------------------------------------------------------------------- CUE-FU theme sounds
def _partial_bank(n, sr, rng, freqs, amps, taus, onsets=None, stereo=True, glide=None):
    t = _t(n, sr)
    out = []
    for ch in range(2 if stereo else 1):
        x = np.zeros(n)
        for i, (f, a, d) in enumerate(zip(freqs, amps, taus)):
            if f >= 0.45 * sr:
                continue
            fr = f if glide is None else f * glide
            ph = TWO_PI * np.cumsum(np.broadcast_to(fr, (n,))) / sr + rng.uniform(0, 6.28)
            env = np.exp(-t / d)
            if onsets is not None:
                env = env * (1 - np.exp(-t / max(onsets[i], 1e-4)))
            x += a * np.sin(ph) * env
        out.append(x)
    return np.stack(out) if stereo else out[0]


def gong(vel, sr, rng, kind="big", dur=None):
    """'big' tam-tam with a low E hum and the bloom (highs arrive late); 'small' opera gong (pitch rises);
    'swell' rolled tam-tam crescendo over `dur` seconds ending in a hit."""
    if kind == "small":
        n = int(1.8 * sr)
        t = _t(n, sr)
        f0 = 493.9 / 1.06  # rises into B4
        glide = 1 + 0.06 * (1 - np.exp(-t / 0.25))
        fs = [f0 * r for r in (1.0, 1.5, 2.09, 2.76, 3.4, 4.3)]
        y = _partial_bank(n, sr, rng, fs, [1.0, 0.5, 0.45, 0.3, 0.2, 0.12], [0.9, 0.6, 0.5, 0.35, 0.25, 0.18], glide=glide)
        hit = filt(rng.standard_normal(n), "bp", 1800, sr, 0.8) * np.exp(-t / 0.01) * 0.6
        y = y + hit
        y = np.tanh(1.2 * y / (np.max(np.abs(y)) + 1e-9))
        return y * vel
    if kind == "boom":       # short, low gong BOOM (bench-flip target): big gong body with fast decay
        y = gong(1.0, sr, rng, "big")[:, : int(1.8 * sr)]
        t = _t(y.shape[1], sr)
        y = y * np.exp(-t / 0.45)
        thump = np.sin(dsp.phase_from_freq(55 + 60 * np.exp(-t / 0.03), sr)) * np.exp(-t / 0.18)
        y = y + 0.9 * thump
        return np.tanh(1.2 * y / (np.max(np.abs(y)) + 1e-9)) * vel
    total = 6.0 if kind == "big" else max(dur, 0.3) + 4.5
    n = int(total * sr)
    t = _t(n, sr)
    k = 90
    fs = np.exp(rng.uniform(math.log(120), math.log(7500), k))
    amps = (fs / 300.0) ** -0.45 * rng.uniform(0.4, 1.0, k)
    taus = np.clip(4.8 * (300.0 / fs) ** 0.35, 0.5, 6.0)
    ons = 0.01 + 0.5 * (fs / 6000.0) ** 0.9 * rng.uniform(0.5, 1.5, k)
    body = _partial_bank(n, sr, rng, fs, amps, taus, ons)
    hum = np.sin(TWO_PI * 82.41 * (1 - 0.01 * (1 - np.exp(-t / 1.0))) * t) * np.exp(-t / 3.5)
    hum += 0.5 * np.sin(TWO_PI * 123.5 * t) * np.exp(-t / 2.5)
    y = body / np.sqrt(k) * 3 + 0.6 * hum
    mallet = filt(rng.standard_normal(n), "lp", 400, sr) * np.exp(-t / 0.03) * 0.8
    crash = filt(rng.standard_normal(n), "bp", 2500, sr, 0.6) * np.exp(-t / 0.35) * 0.25
    if kind == "big":
        y = y + mallet + crash
    else:  # swell: crescendo over dur, then the hit
        d = max(dur, 0.3)
        env = np.clip(t / d, 0, 1) ** 2.5
        roll = filt(rng.standard_normal(n), "bp", 900, sr, 0.5) * 0.15 * env
        pre = np.where(t < d, env, 1.0)
        y = y * pre + roll * (t < d)
        k0 = int(d * sr)
        y[:, k0:] += 1.2 * (mallet + crash)[: n - k0]
    y = np.tanh(1.3 * y / (np.max(np.abs(y)) + 1e-9)) / math.tanh(1.3)
    return y * vel


def wood(vel, sr, rng, kind="thock"):
    """training-dummy 'thock' (hardwood), 'crack' (wood splitting), 'thunk' (heavy bench plank)."""
    n = int((0.9 if kind == "crack" else 0.5) * sr)
    t = _t(n, sr)
    modes = {"thock": [(420, 1.0, 0.05), (1010, 0.6, 0.03), (1830, 0.35, 0.018), (2900, 0.2, 0.01)],
             "crack": [(620, 0.8, 0.04), (1450, 0.7, 0.025), (2600, 0.5, 0.015), (4100, 0.3, 0.008)],
             "thunk": [(118, 1.0, 0.12), (265, 0.8, 0.07), (470, 0.45, 0.04), (820, 0.25, 0.025)]}[kind]
    x = np.zeros(n)
    for f, a, d in modes:
        x += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6)) * np.exp(-t / d)
    click = filt(rng.standard_normal(n), "hp", 2000 if kind != "thunk" else 800, sr) * np.exp(-t / 0.002)
    x = x + (0.8 if kind != "thunk" else 0.4) * click
    if kind == "crack":
        x += 1.2 * _debris(n, sr, rng, rate=120, tau=0.12, start=0.004, lp=6000)
        creak = np.sin(TWO_PI * np.cumsum(180 + 60 * np.sin(TWO_PI * 7 * t)) / sr) * np.exp(-np.maximum(t - 0.05, 0) / 0.15) * (t > 0.05)
        x += 0.15 * filt(np.sign(creak) * np.abs(creak) ** 0.5, "bp", 900, sr, 1.5)
    if kind == "thunk":
        rattle = _debris(n, sr, rng, rate=40, tau=0.08, start=0.02, lp=4000)
        x += 0.4 * rattle
    x *= 1 - np.exp(-t / 0.0003)
    return np.tanh(1.4 * x / (np.max(np.abs(x)) + 1e-9)) * vel


def paper_rip(vel, sr, rng, dur=0.45):
    n = int((dur + 0.05) * sr)
    t = _t(n, sr)
    u = np.clip(t / dur, 0, 1)
    rate = 900 * (0.4 + 0.6 * np.sin(math.pi * u))       # fibre snaps per second
    snaps = (rng.uniform(0, 1, n) < rate / sr).astype(float) * rng.uniform(0.3, 1.0, n)
    grain = signal_lfilter_decay(snaps, sr, 0.0015)
    x = dsp.tv_filter(grain + 0.15 * rng.standard_normal(n) * np.sin(math.pi * u), "bp", 1500 + 2500 * u, sr, 0.9)
    env = np.sin(math.pi * u) ** 0.6 * (t < dur)
    x = x * env
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def signal_lfilter_decay(x, sr, tau):
    from scipy.signal import lfilter
    a = math.exp(-1 / (tau * sr))
    return lfilter([1.0], [1.0, -a], x) * rng_sign(len(x))


def rng_sign(n):
    return np.where(np.random.default_rng(n).uniform(size=n) > 0.5, 1.0, -1.0)


def crowd_roar_loop(n, sr, rng):
    """seamless (circular) theatre-audience roar bed of exactly n samples"""
    out = []
    f = np.fft.rfftfreq(n, 1 / sr)
    shape = np.exp(-((np.log(np.maximum(f, 1)) - math.log(800)) ** 2) / (2 * 0.8 ** 2)) + 0.3 * np.exp(-((np.log(np.maximum(f, 1)) - math.log(2200)) ** 2) / 0.5)
    for ch in range(2):
        y = np.fft.irfft(np.fft.rfft(rng.standard_normal(n)) * shape, n)
        k = np.arange(n) / n
        am = 1 + 0.25 * np.sin(TWO_PI * 3 * k + ch) + 0.15 * np.sin(TWO_PI * 7 * k + 2 * ch)
        out.append(y / np.std(y) * am)
    y = np.stack(out)
    return y / np.max(np.abs(y))


def applause(vel, sr, rng, dur=3.5, density=45.0):
    from .drums import clap
    n = int((dur + 0.8) * sr)
    out = np.zeros((2, n))
    k = int(density * dur)
    for _ in range(k):
        ts = rng.uniform(0, dur)
        env = min(1.0, ts / 0.3) * (1.0 if ts < dur * 0.6 else max(0.0, 1 - (ts - dur * 0.6) / (dur * 0.4)))
        c = clap(rng.uniform(0.3, 0.8), sr, rng)[:, : int(0.12 * sr)]
        c = c * np.array([[rng.uniform(0.2, 1)], [rng.uniform(0.2, 1)]]) * env
        i = int(ts * sr)
        out[:, i:i + c.shape[1]] += c[:, : n - i]
    out = eq(out, sr, [("hp", 300, 0.7), ("hs", 6000, 0.7, -3)])
    return out / (np.max(np.abs(out)) + 1e-9) * vel


def projector_loop(n, sr, rng, fps=24.0):
    """16 mm projector: claw/shutter clicks at `fps` + motor whine + fan hiss; exactly n samples, loops cleanly
    when n * fps / sr is an integer."""
    t = np.arange(n) / sr
    x = np.zeros(n)
    period = sr / fps
    k = 0
    while k * period < n:
        i = int(k * period)
        m = min(int(0.006 * sr), n - i)
        click = rng.standard_normal(m) * np.exp(-np.arange(m) / (0.0012 * sr)) * (1.0 if k % 2 == 0 else 0.6)
        x[i:i + m] += click
        k += 1
    x = eq(x, sr, [("bp", 2200, 0.8), ("peak", 900, 1.2, 4)])
    motor = 0.08 * np.sin(TWO_PI * 120 * t) + 0.04 * np.sin(TWO_PI * 360 * t) + 0.02 * np.sin(TWO_PI * 1440 * t)
    X = np.fft.rfft(rng.standard_normal(n))
    fan = np.fft.irfft(X * np.exp(-np.fft.rfftfreq(n, 1 / sr) / 3000), n)
    fan = 0.05 * fan / np.std(fan)
    y = x / (np.max(np.abs(x)) + 1e-9) + motor + fan
    return y / np.max(np.abs(y))


def film_flap(vel, sr, rng, dur=1.4):
    """loose film end slapping the reel as it runs out: clicks slowing from 22 to 9 per second"""
    n = int((dur + 0.1) * sr)
    x = np.zeros(n)
    tt = 0.0
    while tt < dur:
        r = 22 - 13 * tt / dur
        i = int(tt * sr)
        m = min(int(0.02 * sr), n - i)
        slap = filt(rng.standard_normal(m), "bp", 1600, sr, 0.9) * np.exp(-np.arange(m) / (0.003 * sr))
        x[i:i + m] += slap * rng.uniform(0.6, 1.0)
        tt += 1.0 / r
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def film_burn(vel, sr, rng, dur=1.2):
    """film melting in the gate: a sizzle swell with crackle pops"""
    n = int((dur + 0.1) * sr)
    t = _t(n, sr)
    u = np.clip(t / dur, 0, 1)
    sizzle = filt(rng.standard_normal(n), "hp", 3000, sr) * (u ** 0.7) * (1 - u) ** 0.3
    pops = _debris(n, sr, rng, rate=30, tau=dur * 0.6, start=0.05, lp=7000)
    x = 0.5 * sizzle + pops
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def whoosh(vel, sr, rng, dur=0.3):
    """staff sweep: band-passed noise sweeping up then down, with a doppler-ish amplitude peak at 60 %"""
    n = int((dur + 0.05) * sr)
    t = _t(n, sr)
    u = np.clip(t / dur, 0, 1)
    fc = 500 + 2800 * np.sin(math.pi * u) ** 1.5
    x = dsp.tv_filter(rng.standard_normal(n), "bp", fc, sr, 1.4)
    env = np.exp(-((u - 0.6) ** 2) / (2 * 0.18 ** 2)) * (t < dur)
    x = x * env
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def ball_clack(vel, sr, rng):
    n = int(0.15 * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    for f, a, d in [(3650, 1.0, 0.006), (5200, 0.6, 0.004), (7900, 0.35, 0.003), (2100, 0.3, 0.01)]:
        x += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6)) * np.exp(-t / d)
    x += 0.8 * filt(rng.standard_normal(n), "hp", 3000, sr) * np.exp(-t / 0.0008)
    x *= 1 - np.exp(-t / 0.0001)
    return np.tanh(1.3 * x / (np.max(np.abs(x)) + 1e-9)) * vel


def break_shot(vel, sr, rng):
    """THE BREAK: a leather cue-tip crack, the cue ball smashing the rack ~25 ms later (a dense burst of ball
    clacks), balls scattering into each other and the cushions (clicks + dull thuds), plus a low body thump so it
    lands like an impact into silence."""
    n = int(1.5 * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    tip = filt(rng.standard_normal(int(0.02 * sr)), "bp", 2600, sr, 0.9) * np.exp(-np.arange(int(0.02 * sr)) / (0.0012 * sr))
    x[: len(tip)] += 0.9 * tip
    t_hit = 0.025
    for k in range(26):                         # the rack explodes: clacks bunched right after the hit
        ts = t_hit + (rng.exponential(0.012) if k < 14 else rng.exponential(0.12))
        i = int(ts * sr)
        if i >= n - 8000:
            continue
        c = ball_clack(rng.uniform(0.5, 1.0) * math.exp(-(ts - t_hit) / 0.35), sr, rng)
        x[i:i + len(c)] += c
    for _ in range(8):                          # cushion thuds
        ts = t_hit + rng.uniform(0.12, 0.9)
        i = int(ts * sr)
        m = int(0.06 * sr)
        if i >= n - m:
            continue
        tt = np.arange(m) / sr
        th = np.sin(TWO_PI * rng.uniform(140, 230) * tt) * np.exp(-tt / 0.018) * rng.uniform(0.15, 0.4)
        x[i:i + m] += th * math.exp(-(ts - t_hit) / 0.6)
    ti = np.maximum(t - t_hit, 0)
    f = 42 + 75 * np.exp(-ti / 0.025)
    thump = np.sin(TWO_PI * np.cumsum(f) / sr) * np.exp(-ti / 0.16) * (t >= t_hit) * (1 - np.exp(-ti / 0.0008))
    x += 1.1 * thump
    x = np.tanh(1.6 * x / (np.max(np.abs(x)) + 1e-9)) / math.tanh(1.6)
    return eq(x, sr, [("hp", 30, 0.7), ("peak", 4500, 1.0, 2.0)]) * vel


def ball_pocket(vel, sr, rng):
    """a ball drops into a pocket: rim clack, thunk into the leather/net, short roll rattle"""
    n = int(0.6 * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    c = ball_clack(0.6, sr, rng)
    x[: len(c)] += c
    k = int(0.07 * sr)
    tt = t[: n - k]
    x[k:] += np.sin(TWO_PI * 190 * tt) * np.exp(-tt / 0.03) * 0.9 + filt(rng.standard_normal(n - k), "lp", 900, sr) * np.exp(-tt / 0.02) * 0.5
    x += 0.3 * _debris(n, sr, rng, rate=50, tau=0.12, start=0.1, lp=3000)
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def bluff_roar(vel, sr, rng):
    """Big Jim's boastful two-part roar: a short bark, then a long falling 'HAAAA'"""
    a = roar(0.35, 0.8, sr, rng, f0=70.0)
    b = roar(1.3, 1.0, sr, rng, f0=58.0)
    n = int(0.42 * sr) + len(b)
    y = np.zeros(n)
    y[: len(a)] += a
    y[int(0.42 * sr):] += b
    return y / (np.max(np.abs(y)) + 1e-9) * vel


def fist_slam(vel, sr, rng):
    """a giant fist on the pool table: slam + the balls jumping"""
    x = slam(1.0, sr, rng)
    n = len(x)
    for _ in range(9):
        ts = 0.05 + rng.exponential(0.12)
        i = int(ts * sr)
        if i >= n - 8000:
            continue
        c = ball_clack(rng.uniform(0.3, 0.8), sr, rng)
        x[i:i + len(c)] += 0.5 * c
    return x / (np.max(np.abs(x)) + 1e-9) * vel


# --------------------------------------------------------------------------- CUE-FU extended one-shots
def woodblock(vel, sr, rng, f0=987.8):
    n = int(0.3 * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    for r, a, d in [(1.0, 1.0, 0.045), (2.63, 0.35, 0.02), (4.1, 0.15, 0.012)]:
        x += a * np.sin(TWO_PI * f0 * r * t + rng.uniform(0, 6)) * np.exp(-t / d)
    x += 0.5 * filt(rng.standard_normal(n), "bp", 3500, sr, 1.0) * np.exp(-t / 0.0015)
    x *= 1 - np.exp(-t / 0.0002)
    return np.tanh(1.2 * x / (np.max(np.abs(x)) + 1e-9)) * vel


def pop(vel, sr, rng):
    n = int(0.08 * sr)
    t = _t(n, sr)
    x = filt(rng.standard_normal(n), "bp", rng.uniform(1200, 2400), sr, 1.2) * np.exp(-t / 0.004)
    x += 0.6 * np.sin(TWO_PI * rng.uniform(180, 260) * t) * np.exp(-t / 0.012)
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def popcorn(vel, sr, rng, dur=0.9, count=7):
    n = int((dur + 0.1) * sr)
    x = np.zeros(n)
    for i in range(count):
        ts = rng.uniform(0, dur)
        p = pop(rng.uniform(0.4, 1.0), sr, rng)
        k = int(ts * sr)
        x[k:k + len(p)] += p[: n - k]
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def creak(vel, sr, rng, dur=0.55):
    """stick-slip wood creak: a train of friction pulses whose rate wanders, through wooden resonances"""
    n = int((dur + 0.05) * sr)
    t = _t(n, sr)
    u = np.clip(t / dur, 0, 1)
    rate = 140 + 120 * np.sin(math.pi * u) + 30 * dsp.onepole_lp(rng.standard_normal(n), 6, sr)
    ph = np.cumsum(rate) / sr
    pulses = (np.diff(np.floor(ph), prepend=0) > 0).astype(float) * (0.6 + 0.4 * rng.uniform(size=n))
    x = eq(pulses, sr, [("bp", 650, 2.5), ("peak", 1700, 3.0, 8)])
    x *= np.sin(math.pi * u) ** 0.5 * (t < dur)
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def steam(vel, sr, rng, dur=0.7):
    n = int((dur + 0.05) * sr)
    t = _t(n, sr)
    x = eq(rng.standard_normal(n), sr, [("hp", 1800, 0.7), ("peak", 5000, 0.8, 4)])
    env = (1 - np.exp(-t / 0.01)) * np.exp(-t / (dur * 0.45))
    return x * env / (np.max(np.abs(x * env)) + 1e-9) * vel


def slowmo_whoosh(vel, sr, rng, dur=1.2):
    n = int((dur + 0.1) * sr)
    t = _t(n, sr)
    u = np.clip(t / dur, 0, 1)
    fc = 180 + 900 * np.sin(math.pi * u) ** 2
    x = dsp.tv_filter(rng.standard_normal(n), "bp", fc, sr, 2.0)
    rumble = np.sin(TWO_PI * np.cumsum(60 + 25 * np.sin(math.pi * u)) / sr) * 0.4
    env = np.sin(math.pi * u) ** 1.5 * (t < dur)
    x = (x / (np.std(x) + 1e-9) * 0.3 + rumble) * env
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def leader_beep(vel, sr, rng, f=1000.0, frames=1, fps=24.0):
    n = int(frames / fps * sr)
    t = _t(n, sr)
    x = np.sin(TWO_PI * f * t)
    r = int(0.002 * sr)
    x[:r] *= np.linspace(0, 1, r)
    x[-r:] *= np.linspace(1, 0, r)
    return x * vel


def burn_flare(vel, sr, rng):
    n = int(0.4 * sr)
    t = _t(n, sr)
    fss = filt(rng.standard_normal(n), "hp", 2500, sr) * (1 - np.exp(-t / 0.01)) * np.exp(-t / 0.12)
    x = fss.copy()
    p = pop(1.0, sr, rng)
    x[: len(p)] += 0.7 * p
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def frame_slip(vel, sr, rng, dur=0.6):
    """film jumps the gate: a burst of gate chatter (clicks at ~70/s) + a whoosh"""
    n = int((dur + 0.05) * sr)
    x = np.zeros(n)
    tt = 0.0
    while tt < dur * 0.7:
        k = int(tt * sr)
        m = min(int(0.004 * sr), n - k)
        x[k:k + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / (0.0008 * sr))
        tt += 1 / 70.0
    x = eq(x, sr, [("bp", 2400, 0.8)])
    w = whoosh(0.6, sr, rng, dur)
    x[: len(w)] += w[: n]
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def burn_loop(n, sr, rng):
    """seamless film-burn sizzle loop (circular noise + crackle placed modulo n)"""
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / sr)
    x = np.fft.irfft(X * (f > 2500) * np.exp(-f / 12000), n)
    x = x / np.std(x) * 0.25
    for _ in range(int(n / sr * 25)):
        k = int(rng.uniform(0, n))
        p = pop(rng.uniform(0.3, 1.0), sr, rng)
        idx = (k + np.arange(len(p))) % n
        x[idx] += 0.5 * p
    return x / np.max(np.abs(x))


def rewind(vel, sr, rng, dur=0.8):
    """rewind chatter: clicks accelerating 30 -> 110 per second + a rising motor whine"""
    n = int((dur + 0.05) * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    tt = 0.0
    while tt < dur:
        r = 30 + 80 * (tt / dur) ** 1.3
        k = int(tt * sr)
        m = min(int(0.004 * sr), n - k)
        x[k:k + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / (0.0007 * sr))
        tt += 1 / r
    x = eq(x, sr, [("bp", 2000, 0.8)])
    u = np.clip(t / dur, 0, 1)
    whine = np.sin(TWO_PI * np.cumsum(300 + 900 * u ** 1.5) / sr) * 0.12 * (t < dur)
    x = x / (np.max(np.abs(x)) + 1e-9) + whine
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def iris_slam(vel, sr, rng):
    n = int(0.7 * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    for f, a, d in [(690, 1.0, 0.06), (1870, 0.6, 0.03), (3300, 0.3, 0.015)]:
        x += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6)) * np.exp(-t / d)
    thud = np.sin(dsp.phase_from_freq(60 + 80 * np.exp(-t / 0.02), sr)) * np.exp(-t / 0.12)
    x += 1.0 * thud + 0.5 * filt(rng.standard_normal(n), "hp", 2000, sr) * np.exp(-t / 0.003)
    return np.tanh(1.4 * x / (np.max(np.abs(x)) + 1e-9)) * vel


def film_snap(vel, sr, rng):
    n = int(0.25 * sr)
    t = _t(n, sr)
    x = filt(rng.standard_normal(n), "hp", 1500, sr) * np.exp(-t / 0.006)
    x += 0.5 * filt(rng.standard_normal(n), "bp", 900, sr, 1.0) * np.exp(-t / 0.02)
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def flap_loop(n, sr, rng, rate=18.0):
    """constant-rate film flap, seamless when n * rate / sr is an integer"""
    x = np.zeros(n)
    period = sr / rate
    k = 0
    while k * period < n:
        i = int(k * period)
        m = int(0.02 * sr)
        slap = filt(rng.standard_normal(m), "bp", 1600, sr, 0.9) * np.exp(-np.arange(m) / (0.003 * sr))
        idx = (i + np.arange(m)) % n
        x[idx] += slap * rng.uniform(0.7, 1.0)
        k += 1
    return x / np.max(np.abs(x))


def lens_crack(vel, sr, rng):
    n = int(1.0 * sr)
    t = _t(n, sr)
    x = filt(rng.standard_normal(n), "hp", 2500, sr) * np.exp(-t / 0.005) * 1.5
    for _ in range(26):   # glass tinkles
        ts = 0.01 + rng.exponential(0.12)
        k = int(ts * sr)
        if k >= n - 4000:
            continue
        m = int(0.06 * sr)
        f = rng.uniform(3000, 9000)
        g = np.sin(TWO_PI * f * np.arange(m) / sr) * np.exp(-np.arange(m) / (0.01 * sr)) * rng.uniform(0.1, 0.5) * math.exp(-ts / 0.3)
        x[k:k + m] += g[: n - k]
    return x / (np.max(np.abs(x)) + 1e-9) * vel


def theatre_ambience(n, sr, rng, fps=24.0):
    """cold-open loop: audience murmur + far-off projector, exactly n samples (seamless)"""
    murmur = crowd_roar_loop(n, sr, rng) * 0.35
    mono = murmur.mean(axis=0)
    babble = np.zeros(n)
    from .vocals import shout_voice
    for _ in range(int(n / sr * 3)):
        f0 = rng.uniform(110, 240)
        y, _on = shout_voice(str(rng.choice(["HA", "HO", "YEAH"])), sr, rng, f0, rng.uniform(0.95, 1.15),
                             rng.uniform(1.2, 2.0), 0.3)
        k = int(rng.uniform(0, n))
        idx = (k + np.arange(len(y))) % n
        babble[idx] += y * rng.uniform(0.03, 0.08)
    proj = projector_loop(n, sr, rng, fps) * 0.12
    proj = filt(proj, "lp", 3000, sr)   # far away (booth glass)
    out = murmur + np.stack([babble * 0.9, babble * 1.1]) + np.stack([proj, proj])
    return out / np.max(np.abs(out))


class SfxKit(Instrument):
    mono = False
    variants = 2

    def __init__(self, level=1.0):
        super().__init__()
        self.level = level

    def voice_key(self, ev):
        return (ev.piece, vq(ev.vel, 10), round(ev.dur_s, 2))

    def voice(self, ev, sr, rng):
        p, v, d = ev.piece, ev.vel, ev.dur_s
        if p == "oildrum":
            x = oildrum(v, sr, rng)
        elif p == "riser":
            return riser(d, v, sr, rng) * self.level
        elif p == "roar":
            x = roar(d, v, sr, rng)
        elif p == "slam":
            x = slam(v, sr, rng)
        elif p == "krak":
            x = krak(v, sr, rng)
        elif p == "whale":
            return whale(v, sr, rng) * self.level
        elif p == "gull":
            x = gull(d, v, sr, rng)
        elif p == "clack":
            x = clack(v, sr, rng, True)
        elif p == "rim":
            x = clack(v, sr, rng, False)
        elif p == "scrape":
            x = scrape(v, sr, rng)
        elif p == "gong":
            return gong(v, sr, rng, "big") * self.level
        elif p == "gong_boom":
            return gong(v, sr, rng, "boom") * self.level
        elif p == "gong_small":
            x = gong(v, sr, rng, "small")
        elif p == "gong_swell":
            return gong(v, sr, rng, "swell", dur=d) * self.level
        else:
            raise ValueError(f"unknown sfx piece {p}")
        return dsp.to_stereo(x * self.level, 0.0)
