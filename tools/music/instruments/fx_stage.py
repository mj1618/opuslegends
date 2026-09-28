"""Act-2 / act-3 one-shots (iteration 4): the break-shot KRAK, the BIG JIM letters, Big Jim, glass, the finale,
and the act-2 mechanics' dedicated sounds (bottle whistle, firebomb, bowling ball, pins, the window crash).

Recipes only (numpy in, numpy out); tools/music/sfx.py renders them (`--set=stage`) into assets/audio/sfx.
Pitched parts are in E (A440, like the record): the letters' steel clangs walk DOWN a mixolydian line that is a chord
tone of the chord each letter lands on (E D C# B A G over A7 E7 A7 E7 A7 A7), lens rings climb E chord tones,
Big Jim roars on the held B, subs sit on E1/E2 so the booms reinforce the key instead of fighting the bass.
"""
from __future__ import annotations

import math

import numpy as np

from producer import dsp
from producer.dsp import TWO_PI, eq, filt
from . import fx
from .vocals import GangShouts, Crowd, shout_voice


def _t(n, sr):
    return np.arange(n) / sr


def _norm(x):
    return x / (np.max(np.abs(x)) + 1e-12)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# --------------------------------------------------------------------------- building blocks
def sub_boom(sr, f_end, dur=0.6, f_start_mul=2.2, drop=0.05, tau=0.25):
    """a pitched sub thump: sine sweeping from f_end*f_start_mul down to f_end (in key), exp decay"""
    n = int(dur * sr)
    t = _t(n, sr)
    f = f_end * (1 + (f_start_mul - 1) * np.exp(-t / drop))
    y = np.sin(dsp.phase_from_freq(f, sr)) * np.exp(-t / tau) * (1 - np.exp(-t / 0.0008))
    return y


def steel_clang(f0, sr, rng, dur=0.9, bright=1.0):
    """a struck steel beam / sign frame: strong fundamental + octave (so it reads as `f0`), a fifth-ish partial and
    inharmonic plate modes above that decay fast"""
    n = int(dur * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    parts = [(1.0, 1.0, 0.45), (2.0, 0.55, 0.3), (3.0, 0.25, 0.18), (2.76, 0.3 * bright, 0.12), (4.07, 0.25 * bright, 0.07),
             (5.43, 0.2 * bright, 0.05), (6.9, 0.12 * bright, 0.035), (8.6, 0.08 * bright, 0.02)]
    for r, a, d in parts:
        f = f0 * r * (1 + rng.uniform(-0.002, 0.002))
        if f < 0.45 * sr:
            beat = 1 + 0.15 * np.sin(TWO_PI * rng.uniform(1.5, 4.0) * t)       # a slightly bent beam: slow beating
            x += a * np.sin(TWO_PI * f * t + rng.uniform(0, 6.28)) * np.exp(-t / (d * dur / 0.9)) * beat
    x += 0.6 * filt(rng.standard_normal(n), "hp", 2500, sr) * np.exp(-t / 0.002)
    return x * (1 - np.exp(-t / 0.0003))


def shards(sr, rng, n, count, tau, start=0.0, lo=2400, hi=9500, amp=1.0, stereo=True, pan=0.9):
    """glass shards: short inharmonic high rings, density decaying exponentially from `start`"""
    out = np.zeros((2, n)) if stereo else np.zeros(n)
    for _ in range(count):
        ts = start + rng.exponential(tau)
        i = int(ts * sr)
        m = int(rng.uniform(0.015, 0.07) * sr)
        if i >= n - m:
            continue
        tt = np.arange(m) / sr
        f = math.exp(rng.uniform(math.log(lo), math.log(hi)))
        g = np.sin(TWO_PI * f * tt) + 0.5 * np.sin(TWO_PI * f * rng.uniform(1.37, 1.62) * tt + 1.0)
        g += 0.4 * rng.standard_normal(m) * np.exp(-tt / 0.0008)
        g *= np.exp(-tt / rng.uniform(0.004, 0.02)) * rng.uniform(0.15, 1.0) * math.exp(-(ts - start) / (tau * 2.5)) * amp
        if stereo:
            dsp.place(out, dsp.to_stereo(g, rng.uniform(-pan, pan)), i)
        else:
            out[i:i + m] += g
    return out


def glass_shatter(sr, rng, size=1.0, dur=1.2):
    """a pane / skylight / glass wall breaking: the crack, the crash body, then the shards raining down.
    size 0.3 (a bottle) .. 1 (a glass wall). Stereo."""
    n = int((dur + 0.3) * sr)
    t = _t(n, sr)
    out = np.zeros((2, n))
    crack = filt(rng.standard_normal(n), "hp", 1800, sr) * np.exp(-t / (0.003 + 0.004 * size)) * 2.0
    body = eq(rng.standard_normal((2, n)), sr, [("bp", 3800, 0.6), ("peak", 6500, 1.0, 4)])
    body *= np.exp(-t / (0.05 + 0.15 * size)) * (1 - np.exp(-t / 0.002)) * 0.8
    out += dsp.to_stereo(crack) + body
    out += shards(sr, rng, n, int(30 + 170 * size), 0.05 + 0.25 * size * dur, 0.004, amp=1.2)
    # the second wave: big pieces hitting the floor
    if size > 0.5:
        out += shards(sr, rng, n, int(80 * size), 0.25 * dur, 0.18 * dur, lo=1800, hi=7000, amp=0.8)
        out += 0.5 * dsp.to_stereo(fx._debris(n, sr, rng, rate=60, tau=0.3 * dur, start=0.1, lp=6000))
    return out


def neon_fizz(sr, rng, dur=0.9, hum=120.0):
    """a neon tube dying: mains buzz (odd/even harmonics of the hum) sputtering on/off faster and faster, then gone,
    + the gas sizzle"""
    n = int((dur + 0.05) * sr)
    t = _t(n, sr)
    ph = TWO_PI * hum * t
    buzz = sum(np.sin(k * ph + 0.3 * k) / k ** 0.8 for k in range(1, 24))
    buzz = eq(buzz, sr, [("hp", 150, 0.7), ("peak", 1800, 1.0, 5)])
    gate = np.ones(n)
    tt = 0.0
    while tt < dur:                                  # sputter: off-gaps grow as the tube dies
        u = tt / dur
        on = rng.uniform(0.01, 0.05) * (1 - u) + 0.004
        off = rng.uniform(0.005, 0.03) * (0.3 + 2.5 * u)
        a, b = int((tt + on) * sr), int((tt + on + off) * sr)
        gate[a:min(b, n)] = 0.05
        tt += on + off
    gate = dsp.onepole_lp(gate, 400, sr)
    sizzle = filt(rng.standard_normal(n), "hp", 5000, sr) * 0.35
    env = np.clip(t / 0.01, 0, 1) * np.clip(1 - t / dur, 0, 1) ** 1.3
    return _norm((buzz / 6 + sizzle) * gate * env)


def tube_pops(sr, rng, n, count=8, span=0.5, start=0.02):
    """neon tubes popping one after another (a cascade): a glass 'tunk' + a puff each, spread in stereo"""
    out = np.zeros((2, n))
    ts = np.sort(start + rng.uniform(0, 1, count) ** 1.6 * span)
    for k, s in enumerate(ts):
        m = int(0.09 * sr)
        tt = np.arange(m) / sr
        p = fx.pop(1.0, sr, rng)
        g = np.zeros(m)
        g[: len(p)] += p[:m]
        f = rng.uniform(1300, 2600)
        g += 0.5 * np.sin(TWO_PI * f * tt) * np.exp(-tt / 0.012)
        g *= rng.uniform(0.4, 1.0) * (1 - 0.5 * k / count)
        dsp.place(out, dsp.to_stereo(g, rng.uniform(-0.8, 0.8)), int(s * sr))
    return out


def gasp(sr, rng, people=24, dur=0.55):
    """the audience's sharp intake of breath 'HAH!' (ingressive: breathy, no voicing, a rising noise band) + a few
    voiced 'oh!'s under it. Stereo; the attack is at the start."""
    n = int((dur + 0.3) * sr)
    out = np.zeros((2, n))
    for _ in range(people):
        m = int(rng.uniform(0.25, dur) * sr)
        tt = np.arange(m) / sr
        u = tt / tt[-1]
        fc = rng.uniform(900, 1400) * (1 + 0.6 * u)
        y = dsp.tv_filter(rng.standard_normal(m), "bp", fc, sr, 2.2)
        y += 0.5 * dsp.tv_filter(rng.standard_normal(m), "bp", fc * 2.2, sr, 3.0)
        env = np.clip(tt / 0.025, 0, 1) * (1 - u) ** 1.5
        dsp.place(out, dsp.to_stereo(y * env * rng.uniform(0.3, 1.0), rng.uniform(-0.9, 0.9)), int(abs(rng.normal(0, 0.02)) * sr))
    for _ in range(people // 4):
        y, on = shout_voice("HO", sr, rng, rng.uniform(170, 330), rng.uniform(0.95, 1.15), rng.uniform(0.8, 1.2), 0.5)
        dsp.place(out, dsp.to_stereo(y * rng.uniform(0.1, 0.25), rng.uniform(-0.8, 0.8)), int(rng.uniform(0.02, 0.1) * sr))
    return out


# --------------------------------------------------------------------------- act 3
def break_krak(sr, rng):
    """THE BREAK SHOT, huge: cue-tip crack, the cue ball through the rack (a dense clack burst), a stone-hard KRAK, an
    E1 sub boom, the felt lamps' glass bursting, and the audience's GASP right after. Stereo, ~2.6 s."""
    n = int(2.6 * sr)
    out = np.zeros((2, n))
    b = fx.break_shot(1.0, sr, rng)
    dsp.place(out, dsp.to_stereo(b * 0.9), 0)
    k = fx.krak(1.0, sr, rng)
    dsp.place(out, dsp.to_stereo(k * 0.8), int(0.004 * sr))
    # the sub is short (gone by the drop 0.35 beat later: the drop's own kick must land clean)
    dsp.place(out, dsp.to_stereo(sub_boom(sr, hz(28), dur=0.6, f_start_mul=2.5, drop=0.03, tau=0.13)), int(0.006 * sr))
    g = glass_shatter(sr, rng, size=0.55, dur=1.0)
    dsp.place(out, g * 0.45, int(0.02 * sr))
    # a spread of stereo ball clacks: the rack flying wide
    for _ in range(18):
        ts = 0.03 + rng.exponential(0.18)
        c = fx.ball_clack(rng.uniform(0.3, 0.8) * math.exp(-ts / 0.6), sr, rng)
        dsp.place(out, dsp.to_stereo(c * 0.5, rng.uniform(-1, 1)), int(ts * sr))
    gp = gasp(sr, rng, people=30)
    dsp.place(out, gp * 0.55, int(0.11 * sr))
    out = eq(out, sr, [("hp", 25, 0.7), ("peak", 55, 1.0, 2.0)])
    return np.tanh(1.5 * _norm(out)) / math.tanh(1.5)


def rack_collapse(sr, rng):
    """the break MISSED: the rack caves in on its own — wood splitting, the goon heap thudding down, balls rolling
    off (no tip crack, no gasp: a letdown, not a reward). Mono."""
    n = int(1.6 * sr)
    x = np.zeros(n)
    w = fx.wood(1.0, sr, rng, "crack")
    x[: len(w)] += 0.8 * w
    s = fx.slam(0.8, sr, rng)
    x[int(0.06 * sr):int(0.06 * sr) + len(s)] += s[: n - int(0.06 * sr)]
    for _ in range(10):
        ts = 0.1 + rng.exponential(0.25)
        i = int(ts * sr)
        c = fx.ball_clack(rng.uniform(0.2, 0.5), sr, rng)
        if i < n - len(c):
            x[i:i + len(c)] += 0.4 * c
    return filt(_norm(x), "lp", 5000, sr)


# the six letters B-I-G-J-I-M land on the backbeats 273 277 281 285 289 293 over A7 E7 A7 E7 A7 A7: a descending
# E mixolydian line where every note is a chord tone of its bar (E=5th of A7, D=b7 of E7, C#=3rd of A7, B=5th of E7,
# A=root of A7, G=b7 of A7)
LETTER_NOTES = [64, 62, 61, 59, 57, 55]    # E4 D4 C#4 B3 A3 G3


def letter_creak(i, sr, rng, dur=0.36):
    """the letter's steel legs groaning as it pivots (1 beat, swelling into the slam): stick-slip friction through
    beam resonances tuned an octave over its landing note"""
    n = int((dur + 0.04) * sr)
    t = _t(n, sr)
    u = np.clip(t / dur, 0, 1)
    rate = (55 + 12 * i) * (1 + 0.8 * u) + 12 * dsp.onepole_lp(rng.standard_normal(n), 8, sr) * 3
    ph = np.cumsum(rate) / sr
    pulses = (np.diff(np.floor(ph), prepend=0) > 0).astype(float) * (0.6 + 0.4 * rng.uniform(size=n))
    f = hz(LETTER_NOTES[i] + 12)
    x = eq(pulses, sr, [("bp", f, 6.0)]) * 1.0 + eq(pulses, sr, [("bp", f * 2.76, 5.0)]) * 0.5
    x += eq(pulses, sr, [("bp", 420, 1.5)]) * 0.6
    x *= (0.15 + 0.85 * u ** 1.5) * (t < dur)
    return _norm(x)


def letter_slam(i, sr, rng):
    """a 3-storey neon letter slamming down as a bridge: the E-line steel clang (the note), a sub on the same note two
    octaves down, the tube-pop cascade and the neon dying in a sputter. Stereo, ~1.5 s."""
    m = LETTER_NOTES[i]
    n = int(1.6 * sr)
    out = np.zeros((2, n))
    cl = steel_clang(hz(m), sr, rng, dur=1.1, bright=0.9)
    dsp.place(out, dsp.to_stereo(cl * 0.7, rng.uniform(-0.2, 0.2)), 0)
    dsp.place(out, dsp.to_stereo(0.6 * sub_boom(sr, hz(m - 24), dur=0.5, f_start_mul=2.0, drop=0.03, tau=0.12)), 0)
    th = filt(rng.standard_normal(n), "lp", 400, sr) * np.exp(-_t(n, sr) / 0.05) * 0.8
    out += dsp.to_stereo(th)
    out += 0.6 * tube_pops(sr, rng, n, count=6 + (i % 3) * 2, span=0.45, start=0.015)
    fz = neon_fizz(sr, rng, dur=0.8 + 0.1 * (i % 2))
    dsp.place(out, dsp.to_stereo(fz * 0.28, rng.uniform(-0.4, 0.4)), int(0.06 * sr))
    dsp.place(out, 0.35 * dsp.to_stereo(fx._debris(n, sr, rng, rate=50, tau=0.2, start=0.02, lp=4500)), 0)
    out = eq(out, sr, [("hp", 30, 0.7)])
    return np.tanh(1.3 * _norm(out)) / math.tanh(1.3)


def bigjim_bluff(sr, rng):
    """Big Jim's bluff display on the held B: a bark on E2, then a long roar settling on B1, chest-deep. Mono."""
    a = fx.roar(0.3, 0.75, sr, rng, f0=hz(40) / 1.18)         # E2
    b = fx.roar(1.25, 1.0, sr, rng, f0=hz(35) / 1.15)          # B1
    n = int(0.3 * sr) + len(b)
    y = np.zeros(n)
    y[: len(a)] += a
    y[int(0.3 * sr):] += b
    return _norm(eq(y, sr, [("hp", 30, 0.7), ("peak", 2200, 1.0, 3)]))


def bigjim_fist(i, sr, rng):
    """fist slam i (0..2), escalating: slam + the table's balls jumping + an E1 sub; the last one splits the table"""
    x = fx.fist_slam(0.8 + 0.1 * i, sr, rng)
    n = len(x)
    s = sub_boom(sr, hz(28), dur=0.9, f_start_mul=2.4, drop=0.03, tau=0.2 + 0.08 * i)
    x[: len(s)] += (0.45 + 0.15 * i) * s[:n]
    if i == 2:
        w = fx.wood(1.0, sr, rng, "crack")
        k = int(0.015 * sr)
        x[k:k + len(w)] += 0.6 * w[: n - k]
    return np.tanh(1.3 * _norm(x)) / math.tanh(1.3)


LENS_RINGS = [83, 88, 92, 95]   # B5 E6 G#6 B6: E chord tones climbing with each crack


def lens_crack(i, sr, rng):
    """aviator lens crack i (0..3), escalating: 0 a sharp crack, 1 + a spider-web crackle, 2 + shards, 3 the lens
    bursts (shards + a thump). A chrome ring on an E chord tone climbs with each. Stereo."""
    n = int((0.9 + 0.35 * i) * sr)
    t = _t(n, sr)
    out = np.zeros((2, n))
    crack = filt(rng.standard_normal(n), "hp", 2600, sr) * np.exp(-t / (0.003 + 0.002 * i)) * 1.5
    out += dsp.to_stereo(crack)
    f = hz(LENS_RINGS[i])
    ring = sum(a * np.sin(TWO_PI * f * r * t + rng.uniform(0, 6)) * np.exp(-t / d)
               for r, a, d in [(1.0, 1.0, 0.35), (2.0, 0.3, 0.15), (2.92, 0.2, 0.07)])
    out += dsp.to_stereo(ring * (0.25 + 0.05 * i), rng.uniform(-0.3, 0.3))
    if i >= 1:            # the web spreading: a run of micro-cracks
        k = int(6 + 6 * i)
        for j in range(k):
            ts = 0.01 + j * rng.uniform(0.008, 0.02)
            m = int(0.004 * sr)
            c = rng.standard_normal(m) * np.exp(-np.arange(m) / (0.0007 * sr)) * (1 - j / k) * 0.7
            dsp.place(out, dsp.to_stereo(filt(c, "hp", 3000, sr), rng.uniform(-0.5, 0.5)), int(ts * sr))
    if i >= 2:
        out += shards(sr, rng, n, 30 + 40 * (i - 2), 0.08 + 0.08 * (i - 2), 0.01, amp=0.8)
    if i == 3:
        out += 0.8 * dsp.to_stereo(sub_boom(sr, hz(40), dur=n / sr, f_start_mul=2.0, drop=0.02, tau=0.12))
        dsp.place(out, 0.6 * glass_shatter(sr, rng, 0.45, 0.7), 0)
    return np.tanh(1.2 * _norm(out)) / math.tanh(1.2)


def glass_skylight(sr, rng):
    return _norm(glass_shatter(sr, rng, size=0.6, dur=1.0) + 0.4 * dsp.to_stereo(
        np.pad(sub_boom(sr, hz(40), dur=0.4, tau=0.08), (0, int(1.3 * sr) - int(0.4 * sr)))))


def glass_wall(sr, rng):
    """the penthouse glass wall caving in: a huge shatter + a heavy E1 thump + a long shard rain"""
    g = glass_shatter(sr, rng, size=1.0, dur=2.2)
    n = g.shape[1]
    s = np.zeros(n)
    sb = sub_boom(sr, hz(28), dur=1.0, f_start_mul=3.0, drop=0.03, tau=0.3)
    s[: len(sb)] += sb
    out = g + 0.9 * dsp.to_stereo(s)
    return np.tanh(1.3 * _norm(out)) / math.tanh(1.3)


def iris_slam_big(sr, rng):
    """THE IRIS SLAM on the final hit: the blades' metal 'shhk' (a 70 ms pre-roll, quieter than the hit so the
    onset is the slam), a heavy iron clang on E3 (strong E3/E4/B4 so it sits in the E chord), an E1 sub and a hiss
    transient. Stereo, ~2 s."""
    n = int(2.0 * sr)
    t = _t(n, sr)
    out = np.zeros((2, n))
    pre = int(0.07 * sr)
    sh = dsp.tv_filter(rng.standard_normal(pre), "bp", np.linspace(2500, 6000, pre), sr, 2.0) * np.linspace(0, 1, pre) ** 2
    out[:, :pre] += 0.25 * sh
    ti = np.maximum(t - pre / sr, 0)
    on = (t >= pre / sr).astype(float)
    cl = np.zeros(n)
    f0 = hz(52)                                                    # E3
    for r, a, d in [(1.0, 1.0, 0.8), (2.0, 0.7, 0.55), (3.0, 0.45, 0.4), (4.0, 0.25, 0.25), (2.41, 0.3, 0.08),
                    (3.87, 0.22, 0.05), (5.6, 0.15, 0.03)]:
        cl += a * np.sin(TWO_PI * f0 * r * ti + rng.uniform(0, 6)) * np.exp(-ti / d)
    cl *= on * (1 - np.exp(-ti / 0.0004))
    out += np.stack([cl * 0.95, np.roll(cl, int(0.0007 * sr)) * 1.0]) * 0.55
    # a light sub: on the final hit the record's own kick + stomp own the sub band (a full sub here summed with them
    # into +2.5 dB of sub peak and ~1 dB more limiting, for no extra size)
    dsp.place(out, 0.45 * dsp.to_stereo(sub_boom(sr, hz(28), dur=1.2, f_start_mul=3.0, drop=0.025, tau=0.3)), pre)
    out += dsp.to_stereo(filt(rng.standard_normal(n), "hp", 2000, sr) * np.exp(-ti / 0.004) * on * 0.9)
    ish = fx.iris_slam(1.0, sr, rng)
    dsp.place(out, dsp.to_stereo(ish * 0.35), pre)
    return np.tanh(1.4 * _norm(out)) / math.tanh(1.4)


def film_runout(sr, rng, dur=3.2):
    """the film snaps and the tail flaps on the take-up reel, slowing from 20 to 3 flaps/s while the projector motor
    winds down. Mono."""
    n = int((dur + 0.2) * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    s = fx.film_snap(1.0, sr, rng)
    x[: len(s)] += s
    tt = 0.06
    while tt < dur:
        u = tt / dur
        r = 20 * (1 - u) ** 1.6 + 3
        i = int(tt * sr)
        m = min(int(0.02 * sr), n - i)
        slap = filt(rng.standard_normal(m), "bp", 1600, sr, 0.9) * np.exp(-np.arange(m) / (0.003 * sr))
        x[i:i + m] += 0.55 * slap * rng.uniform(0.6, 1.0) * (1 - 0.6 * u)
        tt += 1.0 / r
    u = np.clip(t / dur, 0, 1)
    motor = np.sin(TWO_PI * np.cumsum(120 * (1 - 0.7 * u)) / sr) * 0.05 * (1 - u) ** 2
    return _norm(x + motor)


def crowd_mega_cheer(sr, rng, dur=4.0):
    """the whole theatre on its feet: a gang 'YEAH!' right on the hit, 60 voices cheering, whistles, claps. Stereo."""
    c = Crowd(people=60).voice(_ev("cheer", dur), sr, rng)
    t = _t(c.shape[1], sr)
    c = c * np.clip(0.55 + t / 0.25, 0, 1)                          # the attack is the gang shout, then the swell
    g = GangShouts(voices=16, high_voices=5, spread=0.95)
    y = g.voice(_ev("YEAH", 0.6, voices=16), sr, rng)
    out = np.zeros((2, max(c.shape[1], y.shape[1])))
    dsp.place(out, c, 0)
    dsp.place(out, y * 1.4, 0)
    return _norm(out)


def crowd_applause_long(sr, rng, dur=9.0):
    """the curtain call: dense applause with whoops and whistles, holding, then thinning out over the last 3 s"""
    a = fx.applause(1.0, sr, rng, dur=dur, density=75)
    n = a.shape[1]
    cr = Crowd(people=26).voice(_ev("cheer", 2.5), sr, rng)
    out = a.copy()
    dsp.place(out, cr * 0.5, 0)
    for _ in range(8):
        y, _on = shout_voice(str(rng.choice(["WHOA", "YEAH", "HO"])), sr, rng, rng.uniform(170, 380), rng.uniform(0.95, 1.2),
                             rng.uniform(1.0, 1.6), rng.uniform(0.6, 1.0))
        dsp.place(out, dsp.to_stereo(y * rng.uniform(0.08, 0.16), rng.uniform(-0.9, 0.9)), int(rng.uniform(0.3, dur * 0.6) * sr))
    for _ in range(4):
        m = int(rng.uniform(0.5, 0.9) * sr)
        tt = np.arange(m) / sr
        fw = rng.uniform(2000, 2800) * (1 + 0.2 * np.minimum(tt / 0.2, 1))
        wv = np.sin(TWO_PI * np.cumsum(fw) / sr) * np.clip(tt / 0.04, 0, 1) * np.exp(-np.maximum(tt - 0.4, 0) / 0.1)
        dsp.place(out, dsp.to_stereo(wv * 0.04, rng.uniform(-0.8, 0.8)), int(rng.uniform(0.2, dur * 0.5) * sr))
    return _norm(out)


def marquee_clank(sr, rng):
    """the usher hanging a steel marquee letter: the hook's clank on E5 + a short rattle of the letter on its rail"""
    n = int(0.7 * sr)
    x = steel_clang(hz(76), sr, rng, dur=0.55, bright=1.2)
    y = np.zeros(n)
    y[: len(x)] += x
    for j in range(5):
        k = int((0.03 + j * rng.uniform(0.02, 0.035)) * sr)
        m = int(0.01 * sr)
        r = filt(rng.standard_normal(m), "bp", rng.uniform(2500, 4500), sr, 3.0) * np.exp(-np.arange(m) / (0.002 * sr))
        y[k:k + m] += 0.35 * r * (1 - j / 5)
    return _norm(y)


# --------------------------------------------------------------------------- act 2 mechanics
def bottle_whistle(sr, rng, dur=0.36):
    """a thrown bottle whistling down its arc: a breathy falling whistle B5 -> E5 over one beat (the telegraph:
    starts 1 beat before the arrival, gone by it)"""
    n = int((dur + 0.02) * sr)
    t = _t(n, sr)
    u = np.clip(t / dur, 0, 1)
    f = hz(83) * (hz(76) / hz(83)) ** (u ** 1.4) * (1 + 0.01 * np.sin(TWO_PI * 11 * t))
    tone = np.sin(dsp.phase_from_freq(f, sr)) + 0.15 * np.sin(2 * dsp.phase_from_freq(f, sr))
    breath = dsp.tv_filter(rng.standard_normal(n), "bp", f, sr, 8.0) * 0.8
    env = np.clip(t / 0.03, 0, 1) * (0.5 + 0.5 * u) * np.clip((dur - t) / 0.025, 0, 1)
    return _norm((tone + breath) * env)


def firebomb_whoosh(sr, rng, dur=0.36):
    """a lit firebomb tumbling through the air: a fluttering fire whoosh swelling to the arrival"""
    n = int((dur + 0.02) * sr)
    t = _t(n, sr)
    u = np.clip(t / dur, 0, 1)
    fc = 350 + 1300 * u ** 1.3
    x = dsp.tv_filter(rng.standard_normal(n), "bp", fc, sr, 1.1)
    flutter = 0.55 + 0.45 * np.sin(TWO_PI * (9 + 5 * u) * t) ** 2
    crackle = fx._debris(n, sr, rng, rate=60, tau=dur, start=0.0, lp=7000) * 0.6
    env = np.clip(t / 0.04, 0, 1) * (0.25 + 0.75 * u ** 1.5) * np.clip((dur - t) / 0.02, 0, 1)
    return _norm((x * flutter + crackle) * env)


def bottle_smash(sr, rng):
    """a bottle bursting (on you, or on the floor): the glass 'tonk' + a small shatter. Stereo."""
    g = glass_shatter(sr, rng, size=0.3, dur=0.45)
    n = g.shape[1]
    t = _t(n, sr)
    tonk = np.sin(TWO_PI * 1180 * t) * np.exp(-t / 0.012) + 0.5 * np.sin(TWO_PI * 2950 * t) * np.exp(-t / 0.006)
    return _norm(g + 0.6 * dsp.to_stereo(tonk))


def firebomb_burst(sr, rng):
    """the firebomb lands: the bottle bursts, the petrol goes up (FWOOMP, an E2 whump), then the flames crackle"""
    n = int(1.4 * sr)
    t = _t(n, sr)
    out = np.zeros((2, n))
    dsp.place(out, bottle_smash(sr, rng) * 0.6, 0)
    k = int(0.03 * sr)
    tk = np.maximum(t - k / sr, 0)
    fw = eq(rng.standard_normal((2, n)), sr, [("lp", 900, 0.7), ("peak", 250, 0.8, 4)])
    fw *= (t >= k / sr) * (1 - np.exp(-tk / 0.05)) * np.exp(-tk / 0.35) * 1.2
    out += fw
    dsp.place(out, 0.7 * dsp.to_stereo(sub_boom(sr, hz(40), dur=0.6, f_start_mul=1.6, drop=0.05, tau=0.2)), k)
    cr = fx._debris(n, sr, rng, rate=40, tau=0.6, start=0.1, lp=8000)
    out += 0.5 * np.stack([cr, np.roll(cr, int(0.013 * sr))])
    return np.tanh(1.2 * _norm(out)) / math.tanh(1.2)


def ball_rumble(sr, rng, dur=0.5, arrive=0.36):
    """a bowling ball rolling up the lane: an E1/E2 hum (the ball's weight, in key) with a thump per turn of the
    finger holes, lane rumble, swelling to the arrival at `arrive` s (1 beat after the telegraph) and past it"""
    n = int((dur + 0.03) * sr)
    t = _t(n, sr)
    u = np.clip(t / arrive, 0, 1)
    hum = np.sin(TWO_PI * hz(28) * t) + 0.7 * np.sin(TWO_PI * hz(40) * t + 1) + 0.25 * np.sin(TWO_PI * hz(47) * t + 2)
    turns = 0.6 + 0.4 * np.sin(TWO_PI * np.cumsum(6 + 4 * u) / sr) ** 8
    lane = eq(rng.standard_normal(n), sr, [("lp", 350, 0.7), ("peak", 120, 1.0, 5)]) * 0.5
    tick = eq(rng.standard_normal(n), sr, [("bp", 1800, 1.5)]) * 0.06 * turns
    # swells to 85 % of the way there, then eases off INTO the arrival: the rumble is heard BEFORE the beat and gets
    # out of the way of the downbeat's kick (it used to peak on it: +0.4 dB true peak at the master)
    rise = np.clip(t / (0.85 * arrive), 0, 1)
    env = (0.12 + 0.88 * rise ** 2) * np.where(t > 0.85 * arrive, np.exp(-(t - 0.85 * arrive) / 0.08), 1.0)
    env *= np.clip((dur - t) / 0.06, 0, 1)
    return _norm((hum * 0.8 * turns + lane + tick) * env)


def ball_hit(sr, rng):
    """the ball clobbers your shins: a dull heavy thud + a hollow knock"""
    n = int(0.5 * sr)
    t = _t(n, sr)
    th = np.sin(dsp.phase_from_freq(hz(40) * (1 + 1.5 * np.exp(-t / 0.02)), sr)) * np.exp(-t / 0.1)
    knock = fx.wood(0.8, sr, rng, "thunk")[:n]
    x = th.copy()
    x[: len(knock)] += 0.6 * knock
    x += 0.4 * filt(rng.standard_normal(n), "lp", 1200, sr) * np.exp(-t / 0.015)
    return _norm(x)


def _pin(sr, rng):
    """one maple bowling pin: a hollow clonk"""
    m = int(0.12 * sr)
    tt = np.arange(m) / sr
    f = rng.uniform(780, 980)
    y = sum(a * np.sin(TWO_PI * f * r * tt + rng.uniform(0, 6)) * np.exp(-tt / d)
            for r, a, d in [(1.0, 1.0, 0.03), (1.87, 0.6, 0.02), (3.1, 0.35, 0.01)])
    y += 0.4 * filt(rng.standard_normal(m), "bp", 2500, sr, 1.0) * np.exp(-tt / 0.002)
    return y


def pin_scatter(sr, rng, big=False):
    """pins going down: clonks against each other, then clattering on the lane (big = all ten + the ball: STRIKE)"""
    n = int((1.3 if big else 0.7) * sr)
    out = np.zeros((2, n))
    k = 14 if big else 5
    for j in range(k):
        ts = abs(rng.normal(0, 0.04)) + (rng.exponential(0.12) if j > 2 else 0)
        dsp.place(out, dsp.to_stereo(_pin(sr, rng) * rng.uniform(0.4, 1.0), rng.uniform(-0.8, 0.8)), int(ts * sr))
    for _ in range(k):          # pins hitting the lane
        ts = 0.08 + rng.exponential(0.2 if big else 0.1)
        m = int(0.05 * sr)
        tt = np.arange(m) / sr
        th = np.sin(TWO_PI * rng.uniform(180, 320) * tt) * np.exp(-tt / 0.015) * rng.uniform(0.2, 0.5)
        dsp.place(out, dsp.to_stereo(th, rng.uniform(-0.8, 0.8)), int(ts * sr))
    if big:
        out += 0.9 * dsp.to_stereo(np.pad(sub_boom(sr, hz(40), dur=0.5, f_start_mul=2.0, tau=0.12), (0, n - int(0.5 * sr))))
    return _norm(out)


def window_crash(sr, rng):
    """the Heave through the big window: the goon hits the sash (wood crack + thump), the pane explodes, the shards
    rain into the building. Stereo, ~1.8 s."""
    g = glass_shatter(sr, rng, size=0.85, dur=1.4)
    n = g.shape[1]
    w = fx.wood(1.0, sr, rng, "crack")
    s = np.zeros(n)
    s[: len(w)] += 0.5 * w[:n]
    sb = sub_boom(sr, hz(40), dur=0.5, f_start_mul=2.0, tau=0.1)
    s[: len(sb)] += 0.7 * sb
    return np.tanh(1.2 * _norm(g + dsp.to_stereo(s))) / math.tanh(1.2)


def _ev(piece, dur_s, **params):
    from producer.score import Resolved
    return Resolved(0.0, 0.0, 0.0, 0, dur_s, 0, None, 1.0, piece, params, 1.0)
