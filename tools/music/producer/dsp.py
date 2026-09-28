"""Core DSP helpers shared by instruments and the mixer (numpy/scipy only).

Conventions
-----------
* Mono signals are 1-D float64 arrays; stereo signals are shape (2, n).
* All filters are designed as second-order sections (SOS) for stability and applied
  with scipy.signal.sosfilt / sosfiltfilt.
* ``sr`` is always passed explicitly (the renderer uses 48 kHz).
"""
from __future__ import annotations

import math
from functools import lru_cache

import numpy as np
from scipy import signal

TWO_PI = 2.0 * math.pi


# --------------------------------------------------------------------------- units
def db2lin(db):
    return 10.0 ** (np.asarray(db, dtype=float) / 20.0)


def lin2db(x, floor=1e-12):
    return 20.0 * np.log10(np.maximum(np.abs(x), floor))


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0)


NOTE_NAMES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def note(name: str | int | float) -> float:
    """'E2' -> 40, 'F#3' -> 54, 'Bb1' -> 34. Numbers pass through (MIDI)."""
    if isinstance(name, (int, float, np.integer, np.floating)):
        return float(name)
    s = name.strip()
    n = NOTE_NAMES[s[0].upper()]
    i = 1
    while i < len(s) and s[i] in "#b":
        n += 1 if s[i] == "#" else -1
        i += 1
    octave = int(s[i:])
    return float(n + 12 * (octave + 1))


# --------------------------------------------------------------------------- filters (RBJ cookbook)
def _biquad(kind: str, f: float, sr: int, q: float = 0.7071, gain_db: float = 0.0) -> np.ndarray:
    f = min(max(f, 1.0), sr * 0.49)
    A = 10 ** (gain_db / 40.0)
    w0 = TWO_PI * f / sr
    cw, sw = math.cos(w0), math.sin(w0)
    alpha = sw / (2 * q)
    if kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "bp":  # constant 0 dB peak gain
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "notch":
        b = [1.0, -2 * cw, 1.0]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "peak":
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind in ("ls", "lowshelf"):
        sq = 2 * math.sqrt(A) * alpha
        b = [A * ((A + 1) - (A - 1) * cw + sq), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sq)]
        a = [(A + 1) + (A - 1) * cw + sq, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sq]
    elif kind in ("hs", "highshelf"):
        sq = 2 * math.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cw + sq), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sq)]
        a = [(A + 1) - (A - 1) * cw + sq, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sq]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]
    a = np.array(a) / a[0]
    return np.concatenate([b, a])[None, :]


@lru_cache(maxsize=4096)
def _sos_cached(kind, f, sr, q, gain_db, order):
    if kind in ("lp", "hp") and order > 2:
        # Butterworth for steeper slopes
        return signal.butter(order, min(f, sr * 0.49), btype="low" if kind == "lp" else "high", fs=sr, output="sos")
    return _biquad(kind, f, sr, q, gain_db)


def sos(kind: str, f: float, sr: int, q: float = 0.7071, gain_db: float = 0.0, order: int = 2) -> np.ndarray:
    return _sos_cached(kind, float(f), int(sr), float(q), float(gain_db), int(order))


def filt(x: np.ndarray, kind: str, f: float, sr: int, q: float = 0.7071, gain_db: float = 0.0, order: int = 2) -> np.ndarray:
    """Apply one filter along the last axis (works for mono or stereo)."""
    return signal.sosfilt(sos(kind, f, sr, q, gain_db, order), x, axis=-1)


def eq(x: np.ndarray, sr: int, bands) -> np.ndarray:
    """Chain of filters. bands: list of tuples
    ('hp'|'lp', f[, q][, order]) / ('peak'|'ls'|'hs', f, q, gain_db) / ('bp'|'notch', f, q)."""
    if not bands:
        return x
    secs = []
    for b in bands:
        kind = b[0]
        if kind in ("hp", "lp"):
            f = b[1]
            q = b[2] if len(b) > 2 else 0.7071
            order = b[3] if len(b) > 3 else 2
            secs.append(sos(kind, f, sr, q, 0.0, order))
        elif kind in ("bp", "notch"):
            secs.append(sos(kind, b[1], sr, b[2] if len(b) > 2 else 1.0))
        else:
            secs.append(sos(kind, b[1], sr, b[2], b[3]))
    return signal.sosfilt(np.concatenate(secs, axis=0), x, axis=-1)


def onepole_lp(x, f, sr):
    a = math.exp(-TWO_PI * f / sr)
    return signal.lfilter([1 - a], [1, -a], x, axis=-1)


def dc_block(x, sr, f=12.0):
    return filt(x, "hp", f, sr, 0.7071)


def tv_filter(x: np.ndarray, kind: str, freqs: np.ndarray, sr: int, q: float = 0.7071, block: int = 128) -> np.ndarray:
    """Time-varying biquad (block-wise coefficient updates with carried state). freqs is per-sample."""
    y = np.zeros_like(x)
    zi = np.zeros((1, 2)) if x.ndim == 1 else np.zeros((1, x.shape[0], 2))
    n = x.shape[-1]
    for s in range(0, n, block):
        e = min(n, s + block)
        f = float(np.mean(freqs[s:e]))
        sec = _biquad(kind, f, sr, q)
        if x.ndim == 1:
            y[s:e], zi = signal.sosfilt(sec, x[s:e], zi=zi)
        else:
            out, zi = signal.sosfilt(sec, x[:, s:e], axis=-1, zi=zi)
            y[:, s:e] = out
    return y


# --------------------------------------------------------------------------- oversampling + waveshaping
def upsample(x, factor):
    return signal.resample_poly(x, factor, 1, axis=-1) if factor > 1 else x


def downsample(x, factor):
    return signal.resample_poly(x, 1, factor, axis=-1) if factor > 1 else x


def soft_clip(x, drive=1.0):
    return np.tanh(drive * x)


def tube(x, drive=1.0, bias=0.15):
    """Asymmetric tube-ish stage: even harmonics from bias, DC removed by caller."""
    y = np.tanh(drive * x + bias) - math.tanh(bias)
    return y


def diode_clip(x, drive=1.0, knee=0.6):
    """Harder, 'op-amp + diode' clipping (odd harmonics, flatter top)."""
    z = drive * x
    return z / (1.0 + np.abs(z) ** 2.5) ** (1 / 2.5) * (1 + 0 * knee)


def fuzz(x, drive=1.0, asym=0.3):
    """Fuzz-face-ish: heavy asymmetric clipping with gating-ish crossover."""
    z = drive * x
    pos = np.tanh(z * (1 + asym))
    neg = np.tanh(z * (1 - asym) * 1.8) / 1.2
    return np.where(z >= 0, pos, neg)


# --------------------------------------------------------------------------- envelopes
def exp_env(n, sr, tau, attack=0.0005):
    t = np.arange(n) / sr
    e = np.exp(-t / max(tau, 1e-5))
    na = int(attack * sr)
    if na > 1:
        e[:na] *= np.linspace(0.0, 1.0, na) ** 1.5
    return e


def adsr(n, sr, a=0.005, d=0.1, s=0.7, r=0.05, gate=None):
    """Linear-attack, exponential decay/release ADSR. gate = samples held (default n - r)."""
    gate = n - int(r * sr) if gate is None else min(gate, n)
    t = np.arange(n) / sr
    na = max(1, int(a * sr))
    e = np.empty(n)
    e[:na] = np.linspace(0, 1, na)
    tt = t[na:] - t[na - 1] if na < n else t[:0]
    e[na:] = s + (1 - s) * np.exp(-tt / max(d, 1e-4))
    if gate < n:
        level = e[max(gate - 1, 0)]
        tr = (np.arange(n - gate)) / sr
        e[gate:] = level * np.exp(-tr / max(r / 4.0, 1e-4))
    return e


def fade_tail(x, sr, ms=5.0):
    n = min(x.shape[-1], int(ms * 1e-3 * sr))
    if n > 1:
        x[..., -n:] *= np.linspace(1, 0, n)
    return x


# --------------------------------------------------------------------------- noise
def white(n, rng):
    return rng.standard_normal(n)


def pink(n, rng):
    """Voss-McCartney-ish via FFT 1/f shaping."""
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.arange(len(X))
    f[0] = 1
    X /= np.sqrt(f)
    y = np.fft.irfft(X, n)
    return y / (np.std(y) + 1e-12)


def shaped_noise(n, sr, rng, env_fn, n_fft=1024, hop=256):
    """STFT noise synthesis. env_fn(freqs[Hz], times[s]) -> magnitude array (F, T).
    Used for cymbals/hats/claps/crowd: frequency-dependent decays that a single filter can't do."""
    frames = int(math.ceil(n / hop)) + 2
    freqs = np.fft.rfftfreq(n_fft, 1 / sr)
    times = np.arange(frames) * hop / sr
    mag = env_fn(freqs[:, None], times[None, :])
    ph = rng.uniform(0, TWO_PI, mag.shape)
    Z = mag * np.exp(1j * ph)
    _, y = signal.istft(Z, fs=sr, nperseg=n_fft, noverlap=n_fft - hop, boundary=True)
    y = y[:n]
    if len(y) < n:
        y = np.pad(y, (0, n - len(y)))
    return y


# --------------------------------------------------------------------------- oscillators
def blit_square(phase, harmonics_max, duty=0.5):
    """Band-limited pulse by additive synthesis. phase: radians array; harmonics_max int."""
    y = np.zeros_like(phase)
    for k in range(1, harmonics_max + 1):
        c = math.sin(math.pi * k * duty) / k
        if abs(c) > 1e-6:
            y += c * np.sin(k * phase)
    return y * 4 / math.pi


def phase_from_freq(freq, sr, phase0=0.0):
    """freq: scalar or per-sample array (Hz). Returns phase (radians) per sample."""
    return phase0 + TWO_PI * np.cumsum(freq) / sr


# --------------------------------------------------------------------------- modulated delay (chorus, doppler)
def mod_delay(x, delay_samples):
    """Read x at (n - delay[n]) with linear interpolation. delay_samples per-sample array."""
    n = x.shape[-1]
    idx = np.arange(n) - delay_samples
    idx = np.clip(idx, 0, n - 1)
    i0 = np.floor(idx).astype(np.int64)
    frac = idx - i0
    i1 = np.minimum(i0 + 1, n - 1)
    return x[..., i0] * (1 - frac) + x[..., i1] * frac


def delay(x, samples):
    samples = int(round(samples))
    if samples <= 0:
        return x
    y = np.zeros_like(x)
    y[..., samples:] = x[..., :-samples]
    return y


# --------------------------------------------------------------------------- stereo
def pan_gains(pan):
    """Constant-power pan law, pan in [-1, 1]."""
    th = (np.asarray(pan, dtype=float) + 1) * math.pi / 4
    return np.cos(th), np.sin(th)


def to_stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    gl, gr = pan_gains(pan)
    return np.stack([x * gl, x * gr])


def ms_width(x, width):
    """width 0 = mono, 1 = unchanged, >1 wider."""
    m = 0.5 * (x[0] + x[1])
    s = 0.5 * (x[0] - x[1]) * width
    return np.stack([m + s, m - s])


def mono_below(x, sr, f=100.0):
    """'Elliptical EQ': high-pass the side channel so everything below f is mono."""
    m = 0.5 * (x[0] + x[1])
    sd = filt(0.5 * (x[0] - x[1]), "hp", f, sr, 0.7071, order=4)
    return np.stack([m + sd, m - sd])


def haas_widen(x_mono, sr, ms=12.0, amount=0.6, pan=0.0):
    """Mono -> pseudo-stereo using a short delayed, filtered copy on one side."""
    d = delay(x_mono, ms * 1e-3 * sr)
    d = filt(d, "hs", 3000, sr, 0.7, -3)
    l = x_mono + amount * 0.5 * d
    r = x_mono - amount * 0.5 * d
    st = np.stack([l, r])
    if pan:
        gl, gr = pan_gains(pan)
        st = np.stack([st[0] * gl * math.sqrt(2), st[1] * gr * math.sqrt(2)])
    return st


# --------------------------------------------------------------------------- IR design
def minimum_phase_fir(freqs_hz, gains_db, sr, n_taps=2048):
    """Min-phase FIR from a magnitude spec (piecewise-linear in log-f) via real cepstrum."""
    n_fft = n_taps * 4
    f = np.fft.rfftfreq(n_fft, 1 / sr)
    lf = np.log10(np.maximum(f, 1.0))
    mag_db = np.interp(lf, np.log10(np.maximum(freqs_hz, 1.0)), gains_db)
    mag = 10 ** (mag_db / 20)
    full = np.concatenate([mag, mag[-2:0:-1]])
    cep = np.fft.ifft(np.log(np.maximum(full, 1e-8))).real
    w = np.zeros(n_fft)
    w[0] = 1
    w[1:n_fft // 2] = 2
    w[n_fft // 2] = 1
    h = np.fft.ifft(np.exp(np.fft.fft(cep * w))).real[:n_taps]
    h *= np.hanning(2 * n_taps)[n_taps:] ** 0.5  # gentle tail taper
    return h


def fftconv(x, h):
    """Convolve along the last axis; output trimmed to input length. h: 1-D or (2, m)."""
    n = x.shape[-1]
    if x.ndim == 1 and h.ndim == 1:
        return signal.oaconvolve(x, h)[:n]
    if x.ndim == 1:
        x = np.stack([x, x])
    if h.ndim == 1:
        h = np.stack([h, h])
    return np.stack([signal.oaconvolve(x[i], h[i])[:n] for i in range(2)])


def normalize(x, peak=1.0):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


def place(buf: np.ndarray, sig: np.ndarray, start: int) -> None:
    """Add sig into buf at sample index start (clips to buffer bounds). Mono or stereo."""
    n = buf.shape[-1]
    if start >= n or sig.shape[-1] == 0:
        return
    s0 = max(0, start)
    off = s0 - start
    e = min(n, start + sig.shape[-1])
    if e <= s0:
        return
    if buf.ndim == 2 and sig.ndim == 1:
        buf[:, s0:e] += sig[off:off + e - s0]
    else:
        buf[..., s0:e] += sig[..., off:off + e - s0]
