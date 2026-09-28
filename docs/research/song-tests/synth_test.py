#!/usr/bin/env python3
"""Feasibility test: ~10 s rock arrangement of the public-domain shanty
"Drunken Sailor" rendered with pure numpy/scipy DSP (no samples, no downloads).

Voices: synthesized kick/snare/hat/crash, Karplus-Strong bass, double-tracked
Karplus-Strong power chords through a tanh amp + cab filter, KS lead guitar,
synthetic-IR convolution reverb, bus compressor. Output: 44.1 kHz stereo WAV.
Also writes the exact beat map (JSON) — which is the point: for our own
productions the beat map is free and sample-exact.

usage: python3 synth_test.py out.wav
"""
import json
import sys

import numpy as np
from scipy import signal

SR = 44100
BPM = 150.0
BEAT = 60.0 / BPM
rng = np.random.default_rng(7)


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------- Karplus-Strong
def karplus(freq, dur, decay=0.996, bright=0.5, pick_pos=0.2):
    """Block-vectorised Karplus-Strong plucked string."""
    n_total = int(dur * SR)
    N = max(2, int(round(SR / freq)))
    exc = rng.uniform(-1, 1, N)
    # brightness: one-pole lowpass on the excitation
    exc = signal.lfilter([bright], [1, -(1 - bright)], exc)
    # pick-position comb (removes some harmonics -> less "synthy")
    d = max(1, int(N * pick_pos))
    exc = exc - np.roll(exc, d) * 0.9
    out = np.zeros(n_total + N)
    out[:N] = exc
    k = 1
    while k * N < n_total + N:
        s, e = k * N, min((k + 1) * N, n_total + N)
        prev = out[s - N:e - N]
        prev_m1 = out[s - N - 1:e - N - 1] if s - N - 1 >= 0 else np.concatenate(([0.0], out[s - N:e - N - 1]))
        out[s:e] = decay * 0.5 * (prev + prev_m1)
        k += 1
    return out[:n_total]


def env_adsr(n, a=0.002, r=0.03, sustain_len=None):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    nr = max(1, int(r * SR))
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


# ---------------------------------------------------------------- drums
def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 35)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7)
    click = rng.normal(0, 1, n) * np.exp(-t * 400) * 0.3
    return np.tanh(1.8 * (body + click))


def snare():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    b, a = signal.butter(2, [1500 / (SR / 2), 9000 / (SR / 2)], "band")
    noise = signal.lfilter(b, a, noise) * np.exp(-t * 18)
    tone = (np.sin(2 * np.pi * 185 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t * 30)
    return np.tanh(1.5 * (0.9 * noise + 0.6 * tone))


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    b, a = signal.butter(4, 7000 / (SR / 2), "high")
    return signal.lfilter(b, a, noise) * np.exp(-t * (12 if open_ else 70)) * 0.5


def crash():
    n = int(2.0 * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n)
    b, a = signal.butter(2, 4000 / (SR / 2), "high")
    return signal.lfilter(b, a, noise) * np.exp(-t * 2.2) * 0.45


# ---------------------------------------------------------------- guitar amp
def amp(x, gain=18.0):
    b, a = signal.butter(1, 700 / (SR / 2), "high")      # tighten low end pre-drive
    x = signal.lfilter(b, a, x)
    y = np.tanh(gain * x) + 0.15 * np.tanh(gain * 3 * x)  # asymmetric-ish 2-stage clip
    b, a = signal.butter(4, 4800 / (SR / 2), "low")       # speaker cab rolloff
    y = signal.lfilter(b, a, y)
    b, a = signal.iirpeak(2200 / (SR / 2), 1.2)           # presence bump
    y = y + 0.3 * signal.lfilter(b, a, y)
    b, a = signal.butter(2, 90 / (SR / 2), "high")
    return signal.lfilter(b, a, y)


def power_chord(root_midi, dur, mute=True):
    notes = [root_midi, root_midi + 7, root_midi + 12]
    dec = 0.985 if mute else 0.997
    s = sum(karplus(midi_hz(m), dur, decay=dec, bright=0.55 if mute else 0.7) for m in notes)
    return s * env_adsr(len(s), r=0.01)


# ---------------------------------------------------------------- arrangement
def build():
    bars = 4
    total = int((bars * 4 * BEAT + 2.0) * SR)
    L = np.zeros(total)
    R = np.zeros(total)
    beats = []

    def put(buf, x, t, g=1.0):
        i = max(0, int(t * SR))
        j = min(total, i + len(x))
        buf[i:j] += g * x[: j - i]

    def both(x, t, g=1.0, pan=0.0):
        put(L, x, t, g * np.sqrt(0.5 * (1 - pan)))
        put(R, x, t, g * np.sqrt(0.5 * (1 + pan)))

    K, S, H, HO, C = kick(), snare(), hat(), hat(True), crash()
    # chord roots per bar (D dorian: Dm, C, Dm, C->Dm)
    roots = [38, 36, 38, 36]  # D2, C2 (guitar power chords an octave up below)
    gtrL = np.zeros(total)
    gtrR = np.zeros(total)
    for bar in range(bars):
        for eighth in range(8):
            t = (bar * 4 + eighth / 2) * BEAT
            if eighth % 2 == 0:
                beats.append({"t": round(t, 6), "bar": bar + 1, "beat": eighth // 2 + 1})
            # drums
            if eighth in (0, 3, 4, 7 if bar % 2 else 99):
                both(K, t, 0.9)
            if eighth in (2, 6):
                both(S, t, 0.7)
            both(HO if eighth == 7 else H, t + rng.normal(0, 0.002), 0.35, pan=0.3)
            # bass: driving eighths, octave jump on the 'and' of 4
            r = roots[bar] - 12 + (12 if eighth == 7 else 0)
            b = karplus(midi_hz(r + 12), BEAT / 2 * 0.95, decay=0.995, bright=0.35)
            both(np.tanh(2.5 * b) * 0.5, t, 0.8)
            # rhythm guitars, double-tracked with independent plucks + timing
            chord_root = roots[bar] + 12
            accent = eighth in (0, 3, 6)
            dur = BEAT / 2 * (0.95 if accent else 0.9)
            put(gtrL, power_chord(chord_root, dur, mute=not accent), t + rng.normal(0, 0.004))
            put(gtrR, power_chord(chord_root, dur, mute=not accent), t + rng.normal(0, 0.004))
    both(C, 0.0, 0.6)
    gl, gr = amp(gtrL * 0.12), amp(gtrR * 0.12)
    L += 0.28 * gl
    R += 0.28 * gr

    # lead melody "What shall we do with the drunken sailor" (D dorian, up an octave)
    A, G, D, F, C, E, B, c, d = 69, 67, 62, 65, 60, 64, 71, 72, 74
    mel = [(A, 1), (A, .5), (A, .5), (A, 1), (A, .5), (A, .5), (A, 1), (D, 1), (F, 1), (A, 1),
           (G, 1), (G, .5), (G, .5), (G, 1), (G, .5), (G, .5), (G, 1), (C, 1), (E, 1), (G, 1)]
    mel += mel[:10]
    t = 0.0
    lead = np.zeros(total)
    for m, dur in mel:
        if t >= bars * 4:
            break
        x = karplus(midi_hz(m), dur * BEAT * 0.98, decay=0.9985, bright=0.8)
        # light vibrato via tiny resample wobble is overkill here; just envelope
        put(lead, x * env_adsr(len(x), r=0.02), t * BEAT)
        t += dur
    ld = amp(lead * 0.2, gain=10)
    both(ld, 0.0, 0.33, pan=-0.05)

    # reverb send: synthetic stereo IR
    n_ir = int(1.4 * SR)
    ti = np.arange(n_ir) / SR
    irL = rng.normal(0, 1, n_ir) * np.exp(-ti * 4.5)
    irR = rng.normal(0, 1, n_ir) * np.exp(-ti * 4.5)
    b, a = signal.butter(2, 5000 / (SR / 2), "low")
    irL, irR = signal.lfilter(b, a, irL) * 0.02, signal.lfilter(b, a, irR) * 0.02
    send = (L + R) * 0.5
    L = L + 0.25 * signal.fftconvolve(send, irL)[:total]
    R = R + 0.25 * signal.fftconvolve(send, irR)[:total]

    # bus compressor (feed-forward, RMS detector)
    mix = np.stack([L, R])
    det = np.sqrt(signal.lfilter([0.002], [1, -0.998], (mix ** 2).mean(0)) + 1e-12)
    thr = 0.25
    gain = np.where(det > thr, (thr / det) ** (1 - 1 / 3.0), 1.0)
    mix *= gain
    mix /= np.abs(mix).max() * 1.12
    return mix, beats


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "test.wav"
    mix, beats = build()
    from scipy.io import wavfile
    wavfile.write(out, SR, (mix.T * 32767).astype(np.int16))
    with open(out.rsplit(".", 1)[0] + "_beatmap.json", "w") as f:
        json.dump({"bpm": BPM, "offset": 0.0, "beats": beats}, f)
    print("wrote", out, mix.shape[1] / SR, "s")
