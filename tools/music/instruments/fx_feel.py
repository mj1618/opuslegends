"""Iteration 6 ("feel") one-shots: the token voice, the near-miss WHEW, the film canister, the poster's rank stings
and the goon stingers. Recipes only (numpy in, numpy out); tools/music/sfx.py renders them (`--set=feel`).

Everything pitched is in E at A440 (the record measures -2 cents on the bass, within the ear's tolerance). Piano parts
take a `piano(events)` callable from sfx.py (the song's sampled honky-tonk piano), events = (midi, at_s, dur_s, vel).
"""
from __future__ import annotations

import math

import numpy as np

from producer import dsp
from producer.dsp import TWO_PI, eq, filt
from . import fx
from . import fx_stage as S
from .vocals import Crowd, shout_voice


def _t(n, sr):
    return np.arange(n) / sr


def _norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


def _st(x):
    return x if x.ndim == 2 else dsp.to_stereo(x)


def _mix(parts, sr, dur):
    """sum (signal, start_s, gain) parts into a stereo buffer `dur` s long"""
    out = np.zeros((2, int(dur * sr)))
    for y, at, g in parts:
        dsp.place(out, _st(y) * g, int(at * sr))
    return out


# --------------------------------------------------------------------------- the token voice
def token_bell(m, sr, rng):
    """the sparkle on top of the token's piano note: a small glass bell at the same pitch, quick (the piano carries
    the pitch, the bell the 'shine' that reads as a pickup)"""
    y = fx.bell_voice("glass", float(m), 0.8, sr, rng)
    n = int(0.45 * sr)
    y = y[:n] * np.exp(-_t(n, sr) / 0.12)
    return filt(y, "hp", 1200, sr)


def token_voice(piano_note, m, sr, rng):
    """honky-tonk piano note (the song's piano, two octaves over the singer) + the glass bell sparkle: bright,
    short, pitch-clear, and a different colour from the Perfect bell (a pinball ding)"""
    b = token_bell(m, sr, rng)
    a = int(np.argmax(np.abs(piano_note) > 0.05 * np.max(np.abs(piano_note))))     # the hammer strike
    y = np.zeros(max(len(piano_note), a + len(b)))
    y[: len(piano_note)] += piano_note
    y[a: a + len(b)] += 0.32 * _norm(b) * np.max(np.abs(piano_note))
    return y


# --------------------------------------------------------------------------- the near-miss WHEW
def whew_gasp(sr, rng):
    """the audience's quick inhale 'HAH!' (tension: the moment you almost fell)"""
    return _norm(S.gasp(sr, rng, people=18, dur=0.32))


def whew_relief(sr, rng, dur=2.2):
    """the relief: a rising, admiring 'ooOOH' from the house that swells into a short cheer (you made it)"""
    out = np.zeros((2, int(dur * sr)))
    for i in range(14):
        f0 = rng.uniform(150, 330)
        y, on = shout_voice("OOHUP", sr, rng, f0, rng.uniform(0.92, 1.18), rng.uniform(0.85, 1.05), rng.uniform(0.5, 0.8))
        dsp.place(out, dsp.to_stereo(y * rng.uniform(0.4, 0.8), rng.uniform(-0.85, 0.85)), int(abs(rng.normal(0, 0.03)) * sr))
    out = _norm(out)
    cheer = Crowd(people=20).voice(S._ev("cheer", 1.3), sr, rng)
    t = _t(cheer.shape[1], sr)
    cheer = _norm(cheer) * np.clip(t / 0.35, 0, 1)                     # swells in under the top of the ooh
    dsp.place(out, cheer[:, : out.shape[1] - int(0.55 * sr)] * 0.9, int(0.55 * sr))
    n = out.shape[1]
    out[:, -int(0.4 * sr):] *= np.linspace(1, 0, int(0.4 * sr)) ** 2
    return _norm(eq(out, sr, [("hp", 160, 0.7)]))[:, :n]


# --------------------------------------------------------------------------- the film canister
def tin_clank(sr, rng, f0=780.0):
    """a 16 mm film can: thin steel lid, inharmonic and quick"""
    n = int(0.5 * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    for r, a, d in [(1.0, 1.0, 0.09), (1.58, 0.7, 0.07), (2.31, 0.55, 0.05), (3.12, 0.4, 0.035), (4.47, 0.3, 0.025),
                    (5.9, 0.2, 0.018)]:
        x += a * np.sin(TWO_PI * f0 * r * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    x += 0.5 * filt(rng.standard_normal(n), "bp", 3500, sr, 1.2) * np.exp(-t / 0.004)
    return x * (1 - np.exp(-t / 0.0003))


def ratchet(sr, rng, dur=0.34, r0=14.0, r1=34.0):
    """the reel spinning up as the film threads: clicks accelerating r0 -> r1 per second"""
    n = int(dur * sr)
    y = np.zeros(n)
    t = 0.0
    while t < dur:
        k = int(t * sr)
        m = min(int(0.006 * sr), n - k)
        if m <= 0:
            break
        c = filt(rng.standard_normal(m), "bp", rng.uniform(2200, 3200), sr, 4.0) * np.exp(-np.arange(m) / (0.0012 * sr))
        y[k:k + m] += c * (0.5 + 0.5 * t / dur)
        t += 1.0 / (r0 + (r1 - r0) * t / dur)
    return y


def canister(chord, sr, rng):
    """a FILM CANISTER found: the lid clanks, the reel spins up, and a glass-bell arpeggio climbs the chord the band
    is playing (`chord` = MIDI notes, low to high) — a treasure glint, in key"""
    parts = [(tin_clank(sr, rng), 0.0, 0.8), (ratchet(sr, rng), 0.04, 0.35)]
    for i, m in enumerate(chord):
        b = fx.bell_voice("glass", float(m), 0.8, sr, rng)
        parts.append((b[: int(1.2 * sr)], 0.09 + i * 0.075, 0.55 + 0.1 * i))
    out = _mix(parts, sr, 1.6)
    return _norm(out)


# --------------------------------------------------------------------------- the poster stings
def projector_flutter(sr, rng, dur=1.4):
    """the projector motor running the leader out: shutter flutter (24 fps) slowing down"""
    n = int(dur * sr)
    y = np.zeros(n)
    t = 0.0
    while t < dur - 0.02:
        k = int(t * sr)
        m = int(0.008 * sr)
        c = filt(rng.standard_normal(m), "bp", rng.uniform(1300, 1900), sr, 2.0) * np.exp(-np.arange(m) / (0.0018 * sr))
        y[k:k + m] += c * (1 - t / dur)
        t += 1.0 / (24.0 - 14.0 * t / dur)
    return y


def flourish_events(size="normal"):
    """THE END: a honky-tonk run up the E major pentatonic and a tremolo E chord (the piano player's sign-off).
    size: 'big' (S: two octaves + a low E octave under the chord), 'normal', 'small' (C: just the two-chord 'ta-da')"""
    ev = []
    if size != "small":
        run = [64, 66, 68, 71, 73, 76, 78, 80, 83, 85, 88] if size == "big" else [71, 73, 76, 78, 80, 83, 85, 88]
        for i, m in enumerate(run):
            ev.append((m, i * 0.042, 0.2, 0.55 + 0.03 * i))
        t0 = len(run) * 0.042 + 0.05
    else:
        ev += [(m, 0.0, 0.18, 0.6) for m in (71, 75, 81)]              # B7 pickup chord (B D# A)
        t0 = 0.24
    chord = [76, 80, 83, 88] + ([64, 52] if size == "big" else [])
    for k in range(10 if size != "small" else 5):                     # tremolo: the chord rolled + re-struck
        vel = 0.8 * (1 - k / 14)
        for j, m in enumerate(chord):
            ev.append((m, t0 + k * 0.075 + j * 0.006, 0.12 if k < 9 else 1.0, vel))
    return ev


def theend(piano, sr, rng, size="normal"):
    """the poster lands: the projector runs the leader out under the piano player's flourish"""
    p = piano(flourish_events(size))
    dur = p.shape[-1] / sr + 0.1
    parts = [(p, 0.0, 1.0), (projector_flutter(sr, rng, dur=min(1.4, dur)), 0.0, 0.25)]
    if size == "big":
        parts.append((fx.applause(1.0, sr, rng, dur=1.2, density=40), 0.2, 0.25))
    return _norm(_mix(parts, sr, dur))


def flop_events():
    """STRAIGHT TO VIDEO: the piano player's deflating 'wah wah wah waaah' (B, A#, A, then a trembling G#)"""
    ev = []
    for i, m in enumerate((71, 70, 69)):
        ev += [(m, i * 0.34, 0.3, 0.7), (m - 12, i * 0.34, 0.3, 0.5)]
    for k in range(12):
        ev += [(68 - (k % 2) * 0.0, 1.02 + k * 0.07, 0.1 if k < 11 else 0.8, 0.6 * (1 - k / 16)), (56, 1.02 + k * 0.07, 0.1, 0.35)]
    return ev


def flop(piano, sr, rng):
    p = piano(flop_events())
    return _norm(_mix([(p, 0.0, 1.0), (projector_flutter(sr, rng, 1.2), 0.0, 0.18)], sr, p.shape[-1] / sr + 0.1))


def claps_sparse(sr, rng):
    """the unimpressed house: four lone claps, slowing, and a cough"""
    from .drums import clap
    parts = []
    t = 0.0
    for i in range(4):
        c = clap(rng.uniform(0.4, 0.6), sr, rng)[:, : int(0.15 * sr)]
        parts.append((c, t, 0.9 - 0.15 * i))
        t += 0.42 + 0.12 * i
    m = int(0.28 * sr)
    tt = _t(m, sr)
    cough = dsp.tv_filter(rng.standard_normal(m), "bp", 700 + 500 * np.exp(-tt / 0.05), sr, 1.5) * np.exp(-tt / 0.07) * (1 - np.exp(-tt / 0.004))
    parts.append((cough, t + 0.25, 0.8))
    return _norm(_mix(parts, sr, t + 0.8))


# --------------------------------------------------------------------------- goon stingers
def piano_gliss_events():
    """the bar pianist smashed: a glissando down the keys from E7 into a low E octave slam"""
    ev = []
    whites = [m for m in range(100, 64, -1) if m % 12 in (0, 2, 4, 5, 7, 9, 11)]
    for i, m in enumerate(whites):
        ev.append((m, i * 0.012, 0.12, 0.35 + 0.3 * i / len(whites)))
    t = len(whites) * 0.012 + 0.02
    ev += [(40, t, 1.2, 1.0), (52, t, 1.2, 0.9), (59, t, 1.0, 0.6)]
    return ev


def piano_gliss(piano, sr, rng):
    return _norm(piano(piano_gliss_events()))
