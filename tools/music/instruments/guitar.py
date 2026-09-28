"""Overdriven rhythm guitar (double-tracked) and lead guitar.

Signal chain per take:
    modal-string DI (per note, pick noise, palm mutes) -> summed DI
    -> pedal pre-EQ (screamer-style mid hump, tightening high-pass)
    -> 4x oversampled: tube stage 1 -> interstage HP/LP -> tube stage 2 -> (fuzz optional)
    -> tone stack (bass/mid/treble) -> power-amp soft clip
    -> downsample -> cab sim (minimum-phase FIR of a 4x12-ish response with speaker-breakup ripple)
Double-tracking renders a second take with different string/pick randomisation, a few cents
detune, 0-5 ms late timing (never early, so onsets stay on the beat map) and a different cab.
"""
from __future__ import annotations

import math

import numpy as np

from producer import dsp
from producer.dsp import eq, filt
from producer.score import Resolved
from .base import Instrument, vq
from .strings import modal_string, pitch_curve, release_env

CAB_4X12 = ([20, 55, 75, 100, 130, 200, 350, 550, 800, 1200, 1800, 2500, 3200, 4000, 5000, 6500, 8000, 11000, 20000],
            [-36, -14, -5, 1.0, 2.0, 0.0, -2.0, -3.5, -2.5, -0.5, 1.5, 3.5, 3.0, 0.0, -6, -15, -24, -40, -60])
CAB_2X12 = ([20, 60, 80, 110, 160, 250, 400, 700, 1000, 1600, 2400, 3000, 3800, 4800, 6000, 7500, 10000, 20000],
            [-34, -12, -4, 0.0, 1.0, 0.0, -1.5, -2.5, -1.0, 1.0, 3.0, 3.5, 1.5, -3.0, -10, -20, -34, -60])


def cab_ir(sr, kind="4x12", seed=0, n_taps=2048):
    f, g = CAB_4X12 if kind == "4x12" else CAB_2X12
    f = np.array(f, float)
    g = np.array(g, float)
    rng = np.random.default_rng(seed + 99)
    # speaker cone breakup: a few random peaks/dips between 1 and 6 kHz (makes it less 'fizzy-synth')
    extra_f = np.exp(rng.uniform(math.log(900), math.log(6000), 7))
    fr = np.sort(np.concatenate([f, extra_f]))
    gr = np.interp(np.log(fr), np.log(f), g)
    for ef in extra_f:
        i = np.argmin(np.abs(fr - ef))
        gr[i] += rng.uniform(-4, 3.5)
    return dsp.minimum_phase_fir(fr, gr, sr, n_taps)


def amp_chain(di, sr, *, gain=1.0, voicing="crunch", bass=0.0, mid=0.0, treble=0.0, presence=0.0, cab="4x12",
              cab_seed=0, os=4, gate_db=None):
    """Guitar amp sim. voicing: 'crunch' (AC/DC-ish boogie), 'fuzz' (fuzz pedal into crunch), 'lead' (saturated,
    mid-forward). gain scales the pre-gain (1.0 = voicing default)."""
    x = di / (np.max(np.abs(di)) + 1e-9)
    if voicing == "lead":
        pre = [("hp", 180, 0.7), ("peak", 750, 0.9, 7), ("lp", 6000, 0.7)]
        g1, g2, g3, bias = 14 * gain, 5.0, 1.6, 0.18
    elif voicing == "fuzz":
        pre = [("hp", 90, 0.7), ("peak", 900, 0.7, 3)]
        g1, g2, g3, bias = 9 * gain, 4.0, 1.4, 0.25
    else:
        pre = [("hp", 110, 0.7), ("peak", 800, 0.8, 5), ("lp", 7000, 0.7)]
        g1, g2, g3, bias = 6 * gain, 3.2, 1.4, 0.15
    x = eq(x, sr, pre)
    u = dsp.upsample(x, os)
    osr = sr * os
    if voicing == "fuzz":
        u = dsp.fuzz(u, g1, 0.35)
        u = filt(u, "hp", 60, osr)
        u = dsp.tube(u * g2 * 0.5, 1.0, bias)
    else:
        u = dsp.tube(u, g1, bias)
        u = eq(u, osr, [("hp", 45, 0.7), ("lp", 9000, 0.7)])
        u = dsp.tube(u, g2, -bias * 0.6)
    u = dsp.dc_block(u, osr, 20)
    # tone stack (Marshall-ish mid scoop is small for boogie)
    u = eq(u, osr, [("ls", 120, 0.7, bass), ("peak", 650, 0.8, -3 + mid), ("hs", 2800, 0.7, treble),
                    ("peak", 3800, 1.2, presence)])
    u = np.tanh(g3 * u) / math.tanh(g3)
    y = dsp.downsample(u, os)
    y = dsp.fftconv(y, cab_ir(sr, cab, cab_seed))
    y = filt(y, "hp", 70, sr)
    if gate_db is not None:
        y = _gate(y, sr, gate_db)
    return y


def _gate(y, sr, thresh_db):
    env = dsp.onepole_lp(np.abs(y), 30, sr)
    g = np.clip((dsp.lin2db(env) - thresh_db) / 6.0, 0, 1)
    g = dsp.onepole_lp(g, 60, sr)
    return y * g


class _GuitarDI(Instrument):
    """Shared DI renderer. params per event: pm (palm mute), accent, mute (dead-note chug), bend/slide/vib,
    let (let ring beyond dur, seconds)."""
    variants = 2

    def __init__(self, tau=2.5, bright=0.65, kmax=40):
        super().__init__()
        self.tau = tau
        self.bright = bright
        self.kmax = kmax
        self.detune = 0.0

    def voice_key(self, ev):
        p = ev.params
        if any(k in p for k in ("bend", "slide", "vib", "fall")):
            return None
        pitches = tuple(np.atleast_1d(ev.pitch).tolist())
        return (pitches, vq(ev.vel), round(ev.dur_s, 3), bool(p.get("pm")), bool(p.get("mute")), self.detune)

    def voice(self, ev, sr, rng):
        p = ev.params
        pitches = np.atleast_1d(ev.pitch)
        pm = bool(p.get("pm"))
        mute = bool(p.get("mute"))
        let = float(p.get("let", 0.0))
        hold_s = ev.dur_s * (0.92 if not pm else 0.85) + let
        rel = 0.035 if not pm else 0.02
        n = int((hold_s + rel * 2 + 0.02) * sr)
        hold = int(hold_s * sr)
        curve = pitch_curve(n, sr, ev, base_dur=hold_s) if any(k in p for k in ("bend", "slide", "vib", "fall")) else None
        x = np.zeros(n)
        for i, m in enumerate(sorted(pitches)):
            f0 = float(dsp.mtof(m))
            strum = int(i * rng.uniform(0.002, 0.006) * sr) if len(pitches) > 1 else 0  # downstroke low->high
            tau = 0.13 if pm else self.tau
            if mute:
                tau = 0.03
            s = modal_string(f0, n - strum, sr, rng, curve=None if curve is None else curve[: n - strum],
                             bright=(self.bright * (0.55 if pm else 1.0) * (0.7 + 0.3 * ev.vel)),
                             pos=rng.uniform(0.12, 0.2), tau=tau, kmax=self.kmax,
                             hf_tau_hz=900 if pm else 2600, pick_noise=0.15 if mute else 0.07,
                             detune_cents=self.detune + rng.normal(0, 1.5))
            x[strum:] += s * (1.0 if i == 0 else 0.85)
        x *= release_env(n, sr, hold, rel)
        return x * ev.vel ** 1.1


class RhythmGuitar(Instrument):
    """Double-tracked overdriven rhythm guitar (stereo). Construct with amp kwargs, e.g.
    RhythmGuitar(voicing='crunch', gain=1.2, spread=0.85, double=True)."""
    mono = False

    def __init__(self, voicing="crunch", gain=1.0, spread=0.85, double=True, bass=1.0, mid=0.0, treble=1.0,
                 presence=1.5, level=1.0):
        super().__init__()
        self.amp_kw = dict(voicing=voicing, gain=gain, bass=bass, mid=mid, treble=treble, presence=presence)
        self.spread = spread
        self.double = double
        self.level = level

    def render(self, events, n, sr, rng, track=None):
        takes = []
        n_takes = 2 if self.double else 1
        for take in range(n_takes):
            di_inst = _GuitarDI(tau=2.2, bright=0.62 + 0.08 * take)
            di_inst.detune = [-3.0, 3.5][take] if self.double else 0.0
            trng = np.random.default_rng(rng.integers(1 << 30) + take)
            evs = events
            if take == 1:
                evs = []
                for e in events:
                    d = int(trng.uniform(0.0, 0.005) * sr)
                    evs.append(Resolved(**{**e.__dict__, "start": e.start + d}))
            di = di_inst.render(evs, n, sr, trng)
            wet = amp_chain(di, sr, cab="4x12" if take == 0 else "2x12", cab_seed=take * 7 + 1, **self.amp_kw)
            takes.append(wet)
        if n_takes == 1:
            return dsp.to_stereo(takes[0] * self.level, 0.0)
        gl, gr = dsp.pan_gains(-self.spread)
        hl, hr = dsp.pan_gains(self.spread)
        L = takes[0] * gl + takes[1] * hl
        R = takes[0] * gr + takes[1] * hr
        return np.stack([L, R]) * self.level


class LeadGuitar(Instrument):
    """Saturated lead guitar with bends/slides/vibrato (mono; mixer pans + adds delay/reverb sends).
    params: bend=st, bend_at, bend_time, bend_rel, slide=st, vib=depth, fall=st, let=s."""
    mono = True

    def __init__(self, gain=1.0, voicing="lead", level=1.0, octave_double=False):
        super().__init__()
        self.gain = gain
        self.voicing = voicing
        self.level = level
        self.octave_double = octave_double

    def render(self, events, n, sr, rng, track=None):
        di_inst = _GuitarDI(tau=4.0, bright=0.8, kmax=48)
        di = di_inst.render(events, n, sr, rng)
        if self.octave_double:
            up = [Resolved(**{**e.__dict__, "pitch": (np.atleast_1d(e.pitch) + 12).tolist()[0]}) for e in events]
            di = di + 0.35 * di_inst.render(up, n, sr, rng)
        y = amp_chain(di, sr, voicing=self.voicing, gain=self.gain, cab="4x12", cab_seed=3, bass=-2, mid=2,
                      treble=1, presence=2)
        return y * self.level
