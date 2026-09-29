"""Iteration 7 ("heard and seen") one-shots: the poster's rank stamp + per-tier stabs (the sting lands WITH the stamp),
the roof's neon letters flickering on as SLIM, the intro's colour burst on beat 15, the film canister's tease glint.
Recipes only (numpy in, numpy out); tools/music/sfx.py renders them (`--set=polish`).

Everything pitched is in E at A440. Piano parts take a `piano(events)` callable from sfx.py (the song's sampled
honky-tonk piano), events = (midi, at_s, dur_s, vel).
"""
from __future__ import annotations

import numpy as np

from producer import dsp
from producer.dsp import TWO_PI, eq, filt
from . import fx
from .vocals import shout_voice


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


# --------------------------------------------------------------------------- the poster: the stamp + the billing
def rank_stamp(sr, rng):
    """the billing stamp SLAMS on the one-sheet: a heavy rubber stamp on a poster board — a low padded thump, the
    paper's slap and the board's short rattle. The attack is the sample's first ms (lands ON the slam)."""
    n = int(0.45 * sr)
    t = _t(n, sr)
    thump = sum(a * np.sin(TWO_PI * f * t + rng.uniform(0, 6)) * np.exp(-t / d)
                for f, a, d in [(78, 1.0, 0.09), (131, 0.6, 0.06), (212, 0.35, 0.04)])
    thump *= 1 - np.exp(-t / 0.0015)
    slap = filt(rng.standard_normal(n), "bp", 1600, sr, 0.9) * np.exp(-t / 0.012)
    slap += 0.5 * filt(rng.standard_normal(n), "hp", 3500, sr) * np.exp(-t / 0.004)
    board = fx.wood(0.7, sr, rng, "thunk")[:n]
    y = 1.0 * _norm(thump) + 0.55 * _norm(slap) + 0.35 * _norm(board)
    return _norm(np.tanh(1.6 * _norm(y)))


def rank_stab_events(tier):
    """the pianist punctuates the stamp: S = a fortissimo E chord with the low octave and a top run of glass-bright
    notes, A = a full forte E chord, B = a mezzo E triad, C = WARM: a soft rolled E6/9 (E G# B C# F#), the lounge
    ending of a good night — kind, not a joke"""
    if tier == "S":
        ev = [(m, 0.0, 1.6, 1.0) for m in (40, 52, 64, 68, 71, 76)]
        ev += [(m, 0.09 + i * 0.05, 0.9, 0.7) for i, m in enumerate((80, 83, 88))]
    elif tier == "A":
        ev = [(m, 0.0, 1.4, 0.9) for m in (52, 64, 68, 71, 76)]
    elif tier == "B":
        ev = [(m, 0.0, 1.1, 0.72) for m in (52, 64, 68, 71)]
    else:
        ev = [(m, i * 0.045, 2.0, 0.5 - 0.02 * i) for i, m in enumerate((52, 64, 68, 71, 73, 78))]
    return ev


def rank_stab(piano, tier, sr, rng):
    """the tier stab (a piano chord ON the slam) + bells for S / A. C gets a music-box-soft glass E on top instead"""
    p = piano(rank_stab_events(tier))
    parts = [(p, 0.0, 1.0)]
    if tier in ("S", "A"):
        for i, m in enumerate((88, 92, 95, 100) if tier == "S" else (88, 95)):
            b = fx.bell_voice("glass", float(m), 0.8, sr, rng)[: int(1.3 * sr)]
            parts.append((b, 0.03 + 0.06 * i, 0.3 if tier == "S" else 0.22))
    if tier == "C":
        b = fx.bell_voice("glass", 88.0, 0.5, sr, rng)[: int(1.4 * sr)]
        parts.append((b, 0.22, 0.14))
    dur = p.shape[-1] / sr + 0.1
    return _norm(_mix(parts, sr, dur))


# --------------------------------------------------------------------------- the roof: neon letters come ON as SLIM
def neon_on(m, sr, rng, dur=0.95):
    """a neon letter flickering ON: the transformer relay CLUNKS, the tube strikes and sputters (gaps shrinking), then
    burns with a steady buzz AT PITCH (`m`: the harmonics of the letter's note, so four letters walk up the chord)
    and fades. Onset = the clunk."""
    n = int((dur + 0.05) * sr)
    t = _t(n, sr)
    f0 = float(dsp.mtof(m))
    ph = TWO_PI * f0 * t * (1 + 0.002 * np.sin(TWO_PI * 5.5 * t))
    buzz = sum(np.sin(k * ph + 0.4 * k) / k ** 0.9 for k in range(1, 18) if k * f0 < 0.42 * sr)
    buzz = eq(buzz, sr, [("hp", 180, 0.7), ("peak", 1600, 1.0, 4)])
    # the strike: sputtering ON (on-gaps grow, off-gaps shrink), then steady
    gate = np.full(n, 0.03)
    tt = 0.035
    while tt < 0.3:
        u = tt / 0.3
        on = rng.uniform(0.006, 0.02) + 0.05 * u
        off = rng.uniform(0.01, 0.035) * (1 - u) + 0.002
        a, b = int(tt * sr), int((tt + on) * sr)
        gate[a:min(b, n)] = 1.0
        tt += on + off
    gate[int(tt * sr):] = 1.0
    gate = dsp.onepole_lp(gate, 500, sr)
    env = np.clip(1 - np.maximum(t - 0.45, 0) / (dur - 0.45), 0, 1) ** 1.6
    sizzle = filt(rng.standard_normal(n), "hp", 6000, sr) * 0.25 * gate * np.exp(-t / 0.25)
    tone = _norm(buzz) * gate * env
    # the relay: a hard metal clunk (a contactor pulling in) + a low transformer thud
    m_c = int(0.18 * sr)
    tc = t[:m_c]
    clunk = sum(a * np.sin(TWO_PI * f * tc + rng.uniform(0, 6)) * np.exp(-tc / d)
                for f, a, d in [(95, 1.0, 0.05), (410, 0.6, 0.025), (1230, 0.45, 0.012), (2710, 0.3, 0.006)])
    clunk += 0.5 * filt(rng.standard_normal(m_c), "bp", 2500, sr, 1.5) * np.exp(-tc / 0.003)
    clunk *= 1 - np.exp(-tc / 0.0004)
    y = np.zeros(n)
    y[:m_c] += 0.9 * _norm(clunk)
    y += 0.55 * tone + sizzle
    return _norm(y)


# --------------------------------------------------------------------------- the intro: the film comes to COLOUR
def color_whoosh(sr, rng, dur=0.56):
    """the rising air into the colour switch: a filtered-noise riser that PEAKS at its very end (start it `dur` s before
    the beat: 1.5 beats at the intro's tempo)"""
    y = fx.riser(dur, 1.0, sr, rng)
    n = y.shape[1]
    y[:, -int(0.012 * sr):] *= np.linspace(1, 0, int(0.012 * sr))
    return _norm(eq(y, sr, [("hp", 300, 0.7), ("hs", 7000, 0.7, -4)]))[:, :n]


def aah_crowd(sr, rng, people=16, dur=1.6):
    """a delighted audience 'aaAAH' (the lights came on), stereo"""
    out = np.zeros((2, int(dur * sr)))
    for _ in range(people):
        y, _on = shout_voice("AAH", sr, rng, rng.uniform(150, 320), rng.uniform(0.92, 1.18), rng.uniform(0.9, 1.15),
                             rng.uniform(0.35, 0.6))
        dsp.place(out, dsp.to_stereo(y * rng.uniform(0.4, 0.8), rng.uniform(-0.9, 0.9)), int(abs(rng.normal(0, 0.035)) * sr))
    return _norm(eq(out, sr, [("hp", 180, 0.7)]))


def color_bloom(sr, rng, dur=1.8):
    """ON the beat the street floods to colour: a soft air 'fwoom' bloom, a shimmer of glass bells up the E chord and
    the house's delighted 'aaah' lifting under it (subtle: the record's HEY is the hit)"""
    n = int(dur * sr)
    t = _t(n, sr)
    air = np.stack([dsp.tv_filter(rng.standard_normal(n), "bp", 900 + 3500 * np.exp(-t / 0.25), sr, 0.8) for _ in range(2)])
    air *= np.exp(-t / 0.28) * (1 - np.exp(-t / 0.004))
    parts = [(air, 0.0, 0.8), (aah_crowd(sr, rng), 0.04, 0.7)]
    for i, m in enumerate((88, 92, 95, 100)):
        b = fx.bell_voice("glass", float(m), 0.6, sr, rng)[: int(1.2 * sr)]
        parts.append((b, 0.02 + 0.035 * i, 0.22))
    return _norm(_mix(parts, sr, dur))


# --------------------------------------------------------------------------- the canister tease
def canister_glint(m, sr, rng):
    """the canister's tease: a tiny star-glint — a glass ting at `m` with a quick shimmer above it (the camera flash of
    a lens catching the light): small, bright, clearly 'something shiny up there'"""
    n = int(0.6 * sr)
    t = _t(n, sr)
    b = fx.bell_voice("glass", float(m), 0.7, sr, rng)[:n]
    b = b[:n] if len(b) >= n else np.pad(b, (0, n - len(b)))
    b *= np.exp(-t / 0.16)
    sh = filt(rng.standard_normal(n), "bp", 9000, sr, 3.0) * np.exp(-np.maximum(t - 0.01, 0) / 0.05) * (t > 0.01)
    trem = 1 + 0.5 * np.sin(TWO_PI * 22 * t)
    y = _norm(b) * trem + 0.25 * _norm(sh)
    return _norm(filt(y, "hp", 1500, sr))
