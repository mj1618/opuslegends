"""ITU-R BS.1770-4 loudness (LUFS), true peak, and short-term loudness — numpy only.
Cross-checked against ffmpeg's ebur128 filter by analyze.py."""
from __future__ import annotations

import math

import numpy as np
from scipy import signal


def _k_weight_sos(sr):
    # stage 1: high shelf (+4 dB), stage 2: RLB high-pass — coefficient formulas as in pyloudnorm
    G, Q, fc = 3.999843853973347, 0.7071752369554196, 1681.974450955533
    A = 10 ** (G / 40.0)
    K = math.tan(math.pi * fc / sr)
    Vh = 10 ** (G / 20.0)
    Vb = Vh ** 0.4996667741545416
    a0 = 1.0 + K / Q + K * K
    b = [(Vh + Vb * K / Q + K * K) / a0, 2.0 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a = [1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0]
    fc2, Q2 = 38.13547087602444, 0.5003270373238773
    K2 = math.tan(math.pi * fc2 / sr)
    a02 = 1 + K2 / Q2 + K2 * K2
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, 2.0 * (K2 * K2 - 1.0) / a02, (1.0 - K2 / Q2 + K2 * K2) / a02]
    del A
    return np.array([b + a, b2 + a2])


def _block_power(x, sr, win_s, hop_s):
    y = signal.sosfilt(_k_weight_sos(sr), x, axis=-1)
    y2 = np.sum(y ** 2, axis=0) if y.ndim == 2 else y ** 2  # channel weights 1.0 (L/R)
    win = int(win_s * sr)
    hop = int(hop_s * sr)
    if len(y2) < win:
        return np.array([np.mean(y2)])
    c = np.concatenate([[0.0], np.cumsum(y2)])
    starts = np.arange(0, len(y2) - win + 1, hop)
    return (c[starts + win] - c[starts]) / win


def integrated_lufs(x, sr):
    z = _block_power(x, sr, 0.4, 0.1)
    l = -0.691 + 10 * np.log10(np.maximum(z, 1e-20))
    z = z[l > -70]
    if len(z) == 0:
        return -math.inf
    rel = -0.691 + 10 * math.log10(np.mean(z)) - 10
    l = -0.691 + 10 * np.log10(np.maximum(z, 1e-20))
    z2 = z[l > rel]
    return -0.691 + 10 * math.log10(np.mean(z2))


def short_term_lufs(x, sr, hop_s=0.1):
    z = _block_power(x, sr, 3.0, hop_s)
    return -0.691 + 10 * np.log10(np.maximum(z, 1e-20))


def momentary_lufs(x, sr, hop_s=0.1):
    z = _block_power(x, sr, 0.4, hop_s)
    return -0.691 + 10 * np.log10(np.maximum(z, 1e-20))


def true_peak_db(x, os=4):
    y = signal.resample_poly(x, os, 1, axis=-1)
    return 20 * math.log10(max(np.max(np.abs(y)), 1e-12))


def sample_peak_db(x):
    return 20 * math.log10(max(np.max(np.abs(x)), 1e-12))
