"""Honky-tonk piano and tonewheel organ with Leslie.

HonkyTonkPiano: per note 1-3 detuned strings (unison detune is the honky-tonk character),
stiff-string inharmonicity, hammer spectrum (velocity -> brightness, strike-position notch),
two-stage decay (prompt + aftersound), damper release, hammer thump + 'tack' click, then a
synthesized soundboard IR convolved at track level. Stereo spread by pitch.

Organ: 9-drawbar additive tonewheel voice with key click, optional percussion, tube
overdrive, and a two-rotor Leslie (horn/drum crossover at 800 Hz, doppler via modulated
delay + AM, separate inertia per rotor, two mics). Automate 'leslie' 0 (chorale) .. 1 (tremolo).
"""
from __future__ import annotations

import math

import numpy as np

from producer import dsp
from producer.dsp import TWO_PI, eq, filt
from .base import Instrument, expand_chords, vq


class HonkyTonkPiano(Instrument):
    mono = False
    variants = 2

    def __init__(self, detune_cents=11.0, bright=1.0, level=1.0, width=0.6, soundboard=0.35):
        super().__init__()
        self.detune = detune_cents
        self.bright = bright
        self.level = level
        self.width = width
        self.soundboard = soundboard

    def voice_key(self, ev):
        return (float(ev.pitch), vq(ev.vel, 10), round(min(ev.dur_s, 3.0), 2))

    def voice(self, ev, sr, rng):
        m = float(ev.pitch)
        f0 = float(dsp.mtof(m))
        v = ev.vel
        hold = min(ev.dur_s, 3.0)
        rel = 0.12 if m < 48 else 0.08
        n = int((hold + rel * 3) * sr)
        t = np.arange(n) / sr
        # decay times: long in the bass, short in the treble
        tau1 = float(np.interp(m, [21, 48, 72, 96, 108], [2.6, 1.3, 0.55, 0.22, 0.12]))
        tau2 = tau1 * 5.0
        B = float(np.interp(m, [21, 48, 72, 108], [2.5e-4, 1.8e-4, 4e-4, 2.5e-3]))
        n_str = 1 if m < 34 else (2 if m < 46 else 3)
        offs = {1: [0.0], 2: [-0.55, 0.55], 3: [-1.0, 0.15, 0.9]}[n_str]
        fc = (900 + 5200 * v ** 1.8) * self.bright  # hammer contact low-pass
        K = int(min(36, (0.45 * sr) // (f0 * math.sqrt(1 + B * 36 * 36))))
        x = np.zeros(n)
        pos = 1.0 / 8.3
        fss = [f0 * 2 ** (o * self.detune * rng.uniform(0.8, 1.2) / 1200) for o in offs]
        for k in range(1, K + 1):
            a = (abs(math.sin(math.pi * k * pos)) + 0.05) / k ** 0.9 / (1 + (k * f0 / fc) ** 2)
            if a < 1e-4:
                continue
            d = 1.0 / (1 + (k * f0 / 2200) ** 1.3)
            env = 0.72 * np.exp(-t / (tau1 * d)) + 0.28 * np.exp(-t / (tau2 * d))
            partial = np.zeros(n)
            for fs in fss:
                fk = k * fs * math.sqrt(1 + B * k * k)
                if fk < 0.45 * sr:
                    partial += np.sin(TWO_PI * fk * t + rng.uniform(0, TWO_PI))
            x += a * partial * env
        x /= n_str
        # attack: hammer thump + 'tack' (thumbtack-piano style metallic click)
        m_att = int(0.03 * sr)
        tt = t[:m_att]
        thump = filt(rng.standard_normal(m_att), "lp", 600 + f0, sr) * np.exp(-tt / 0.006) * 0.4
        tack = filt(rng.standard_normal(m_att), "bp", 3800, sr, 1.5) * np.exp(-tt / 0.0025) * (0.5 * v)
        x[:m_att] += thump + tack
        # damper
        hs = int(hold * sr)
        if hs < n:
            x[hs:] *= np.exp(-np.arange(n - hs) / (rel / 4.0 * sr))
        x *= 1 - np.exp(-t / 0.0006)
        pan = float(np.clip((m - 60) / 30.0, -1, 1)) * self.width
        return dsp.to_stereo(x * v ** 1.35, pan)

    def render(self, events, n, sr, rng, track=None):
        y = super().render(expand_chords(events), n, sr, rng, track)
        # soundboard/body: short dense decaying noise IR, lowpassed over time
        L = int(0.09 * sr)
        tt = np.arange(L) / sr
        irs = []
        for ch in range(2):
            ir = rng.standard_normal(L) * np.exp(-tt / 0.018)
            ir = eq(ir, sr, [("peak", 250, 1.0, 4), ("peak", 1200, 1.0, 2), ("lp", 5000, 0.7)])
            ir /= np.sqrt(np.sum(ir ** 2))
            irs.append(ir)
        body = dsp.fftconv(y, np.stack(irs))
        y = y + self.soundboard * body
        y = eq(y, sr, [("hp", 45, 0.7), ("peak", 3200, 1.0, 2.0), ("hs", 7000, 0.7, 1.5)])
        return y * self.level


DRAWBAR_RATIOS = [0.5, 1.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0]


class Organ(Instrument):
    """Tonewheel organ. drawbars: 9-digit string like '888000000'. perc: None | '2nd' | '3rd'.
    Track automation 'leslie' (0 slow .. 1 fast) controls the rotor speed."""
    mono = False

    def __init__(self, drawbars="888600000", perc=None, drive=0.5, leslie=True, level=1.0, click=0.12):
        super().__init__()
        self.db = [int(c) for c in drawbars]
        self.perc = perc
        self.drive = drive
        self.leslie = leslie
        self.level = level
        self.click = click

    def voice(self, ev, sr, rng):
        pitches = np.atleast_1d(ev.pitch)
        hold = ev.dur_s
        n = int((hold + 0.03) * sr)
        t = np.arange(n) / sr
        x = np.zeros(n)
        for m in pitches:
            f0 = float(dsp.mtof(m))
            for r, d in zip(DRAWBAR_RATIOS, self.db):
                if d == 0:
                    continue
                f = f0 * r
                while f > 5900:  # tonewheel foldback in the top octave
                    f /= 2
                x += 10 ** ((d - 8) * 3 / 20) * np.sin(TWO_PI * f * t + rng.uniform(0, TWO_PI))
            if self.perc:
                r = 2.0 if self.perc == "2nd" else 3.0
                x += 0.9 * np.sin(TWO_PI * f0 * r * t) * np.exp(-t / 0.2)
        env = np.clip(t / 0.004, 0, 1)
        hs = int(hold * sr)
        env[hs:] *= np.exp(-np.arange(n - hs) / (0.006 * sr))
        x *= env
        if self.click > 0:
            m_c = min(n, int(0.006 * sr))
            ck = filt(rng.standard_normal(m_c), "hp", 1500, sr) * np.exp(-np.arange(m_c) / (0.0012 * sr))
            x[:m_c] += self.click * ck * len(pitches)
        return x * ev.vel * 0.25

    def render(self, events, n, sr, rng, track=None):
        mono = np.zeros(n)
        for ev in events:
            dsp.place(mono, self.voice(ev, sr, rng), ev.start)
        # tube preamp
        if self.drive > 0:
            u = dsp.upsample(mono, 2)
            g = 1 + 5 * self.drive
            u = dsp.tube(u, g, 0.1) / math.tanh(g)
            mono = dsp.dc_block(dsp.downsample(u, 2), sr)
        speed = np.zeros(n)
        if track is not None:
            c = track.automation_curve("leslie", n, 0.0)
            if c is not None:
                speed = c
        y = leslie(mono, sr, speed) if self.leslie else dsp.to_stereo(mono)
        y = eq(y, sr, [("hp", 60, 0.7), ("peak", 2500, 1.0, 1.5), ("lp", 9000, 0.7)])
        return y * self.level


def leslie(x, sr, speed):
    """Two-rotor Leslie. speed: per-sample 0 (chorale) .. 1 (tremolo). Returns stereo."""
    lo = filt(x, "lp", 800, sr, 0.7, order=4)
    hi = filt(x, "hp", 800, sr, 0.7, order=4)

    def rotor(slow, fast, tau):
        a = math.exp(-1 / (tau * sr))
        from scipy.signal import lfilter
        sm = lfilter([1 - a], [1, -a], speed, zi=[speed[0] * a])[0] if len(speed) else speed
        rate = slow + (fast - slow) * sm
        return TWO_PI * np.cumsum(rate) / sr

    th_h = rotor(0.8, 6.8, 0.6)
    th_d = rotor(0.66, 5.9, 2.4)
    out = []
    for mic_phase in (0.0, 2.3):
        dh = (0.0006 + 0.00042 * np.sin(th_h + mic_phase)) * sr
        dd = (0.0006 + 0.00022 * np.sin(th_d + mic_phase + 1.0)) * sr
        h = dsp.mod_delay(hi, dh) * (1 + 0.45 * np.sin(th_h + mic_phase + 1.57))
        # horn pointing away is also duller: blend a lowpassed copy with the rotation
        h_dull = filt(h, "lp", 3000, sr)
        mix = 0.5 + 0.5 * np.sin(th_h + mic_phase + 1.57)
        h = h * mix + h_dull * (1 - mix)
        d = dsp.mod_delay(lo, dd) * (1 + 0.22 * np.sin(th_d + mic_phase + 1.57))
        out.append(h + d)
    return np.stack(out)
