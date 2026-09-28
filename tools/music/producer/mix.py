"""Mixing: dynamics, reverb/delay, per-track strips, buses (= stems), master chain.

Signal flow
-----------
track: instrument -> [eq] -> [comp] -> [sat] -> gain(+automation) -> pan/width -> [lpf/hpf automation]
       -> stop gates -> bus;   sends (post-fader) -> that bus's reverb/delay returns
bus (= stem): sum -> [parallel comp] -> [comp] -> [eq] -> + returns      => exported as a stem
master: sum(stems) -> mono below 100 Hz -> eq -> glue comp -> soft clip -> gain -> true-peak limiter (-1 dBTP) -> -14 LUFS
Stems sum exactly to the pre-master mix (master processing is not in the stems).
"""
from __future__ import annotations

import math

import numpy as np
from scipy import ndimage, signal

from . import dsp, loudness
from .dsp import eq


# --------------------------------------------------------------------------- dynamics
def compress(x, sr, thresh=-18.0, ratio=4.0, attack_ms=5.0, release_ms=80.0, knee=6.0, makeup=0.0,
             detector="peak", sidechain=None, mix=1.0, block=16, auto_makeup=False, stats=None):
    """Feed-forward stereo-linked compressor with soft knee; gain computed per `block` samples."""
    sc = x if sidechain is None else sidechain
    a = np.abs(sc) if sc.ndim == 1 else np.max(np.abs(sc), axis=0)
    n = len(a)
    nb = int(math.ceil(n / block))
    pad = nb * block - n
    ap = np.pad(a, (0, pad)).reshape(nb, block)
    lv = np.sqrt(np.mean(ap ** 2, axis=1)) * math.sqrt(2) if detector == "rms" else np.max(ap, axis=1)
    lv_db = dsp.lin2db(lv)
    over = lv_db - thresh
    gr = np.where(over <= -knee / 2, 0.0,
                  np.where(over >= knee / 2, over * (1 - 1 / ratio),
                           (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    ca = math.exp(-block / (max(attack_ms, 0.01) * 1e-3 * sr))
    cr = math.exp(-block / (max(release_ms, 0.01) * 1e-3 * sr))
    sm = np.empty(nb)
    g = 0.0
    for i in range(nb):
        target = gr[i]
        c = ca if target > g else cr
        g = c * g + (1 - c) * target
        sm[i] = g
    centers = (np.arange(nb) + 0.5) * block
    gr_s = np.interp(np.arange(n), centers, sm)
    mk = makeup
    if auto_makeup:
        mk += 0.5 * float(np.mean(sm[sm > 0.05])) if np.any(sm > 0.05) else 0.0
    gain = dsp.db2lin(-gr_s + mk)
    if stats is not None:
        stats["gr_max_db"] = float(np.max(sm))
        active = sm[lv_db > -60]
        stats["gr_mean_db"] = float(np.mean(active)) if len(active) else 0.0
    y = x * gain
    return y if mix >= 1 else mix * y + (1 - mix) * x


def limiter(x, sr, ceiling_db=-1.0, lookahead_ms=1.5, release_ms=70.0, os=4, stats=None):
    """Offline look-ahead true-peak limiter. The gain is (min-filter over ±L) -> (box average over ±L),
    which provably never exceeds the required gain at any sample; release is a one-pole on top."""
    ceil = dsp.db2lin(ceiling_db)
    up = signal.resample_poly(x, os, 1, axis=-1)
    n = x.shape[-1]
    tp = np.max(np.abs(up[..., : n * os]).reshape(-1, n, os).max(axis=-1), axis=0) if x.ndim == 2 else \
        np.abs(up[: n * os]).reshape(n, os).max(axis=-1)
    req = np.minimum(1.0, ceil / np.maximum(tp, 1e-12)) * 0.999
    L = max(1, int(lookahead_ms * 1e-3 * sr))
    m = ndimage.minimum_filter1d(req, 2 * L + 1, mode="nearest")
    g = ndimage.uniform_filter1d(m, 2 * L + 1, mode="nearest")
    # release smoothing at block rate
    blk = 8
    nb = int(math.ceil(n / blk))
    gb = np.pad(g, (0, nb * blk - n), constant_values=1.0).reshape(nb, blk).min(axis=1)
    cr = math.exp(-blk / (release_ms * 1e-3 * sr))
    rb = np.empty(nb)
    cur = 1.0
    for i in range(nb):
        v = gb[i]
        cur = v if v < cur else cr * cur + (1 - cr) * v
        rb[i] = cur
    r = np.interp(np.arange(n), (np.arange(nb) + 0.5) * blk, rb)
    gain = np.minimum(g, r)
    if stats is not None:
        grdb = -dsp.lin2db(gain)
        stats["limiter_gr_max_db"] = float(np.max(grdb))
        stats["limiter_gr_mean_db"] = float(np.mean(grdb))
        stats["limiter_active_pct"] = float(np.mean(grdb > 0.5) * 100)
    return x * gain


def soft_clip(x, sr, drive_db=1.5, os=4):
    """Oversampled gentle clipper (catches the fastest transients before the limiter)."""
    g = dsp.db2lin(drive_db)
    u = signal.resample_poly(x, os, 1, axis=-1)
    u = np.tanh(u * g * 0.9) / 0.9 / g
    return signal.resample_poly(u, 1, os, axis=-1)


# --------------------------------------------------------------------------- reverb + delay
def make_ir(sr, rt60=1.2, predelay_ms=10.0, er=12, er_ms=35.0, hf_ratio=0.5, lf_ratio=1.1, width=1.0,
            build_ms=25.0, lp=12000.0, seed=0):
    """Synthesized stereo reverb IR: early reflections + band-wise exponentially decaying noise."""
    rng = np.random.default_rng(seed)
    n = int((rt60 * 1.3 + predelay_ms * 1e-3) * sr)
    t = np.arange(n) / sr
    bands = [(20, 250, lf_ratio), (250, 1000, 1.0), (1000, 3000, 0.85), (3000, 7000, 0.5 + 0.5 * hf_ratio),
             (7000, 20000, hf_ratio)]
    chans = []
    for ch in range(2):
        late = np.zeros(n)
        for lo, hi, rr in bands:
            s = signal.butter(4, [lo, min(hi, sr * 0.45)], btype="band", fs=sr, output="sos")
            nb = signal.sosfilt(s, rng.standard_normal(n))
            late += nb * np.exp(-6.9 * t / (rt60 * rr))
        late *= 1 - np.exp(-t / (build_ms * 1e-3))
        ir = np.zeros(n)
        pd = int(predelay_ms * 1e-3 * sr)
        ir[pd:] += late[: n - pd] * 0.9
        for i in range(er):
            dt = rng.uniform(1.0, er_ms) * 1e-3
            k = pd + int(dt * sr)
            if k < n:
                ir[k] += rng.choice([-1, 1]) * rng.uniform(0.4, 1.0) * (1 - dt / (er_ms * 1e-3 * 1.3)) * 6.0
        ir = dsp.filt(ir, "lp", lp, sr)
        chans.append(ir)
    ir = np.stack(chans)
    ir = dsp.ms_width(ir, width)
    ir /= math.sqrt(np.sum(ir ** 2) / 2)
    return ir


REVERBS = {
    "room": dict(rt60=0.5, predelay_ms=2, er=16, er_ms=22, hf_ratio=0.6, lf_ratio=0.8, width=1.1, build_ms=6, lp=10000),
    "plate": dict(rt60=1.5, predelay_ms=18, er=0, hf_ratio=0.8, lf_ratio=0.8, width=1.2, build_ms=8, lp=11000),
    "hall": dict(rt60=2.2, predelay_ms=24, er=10, er_ms=45, hf_ratio=0.45, lf_ratio=1.1, width=1.3, build_ms=40, lp=8000),
    "arena": dict(rt60=2.8, predelay_ms=40, er=14, er_ms=80, hf_ratio=0.4, lf_ratio=1.0, width=1.4, build_ms=60, lp=7000),
}


def tempo_delay(x, sr, time_s, feedback=0.35, repeats=6, lp=4500.0, hp=300.0, pingpong=True):
    x = x if x.ndim == 2 else np.stack([x, x])
    out = np.zeros_like(x)
    tap = x.copy()
    for r in range(1, repeats + 1):
        tap = dsp.eq(dsp.delay(tap, time_s * sr), sr, [("lp", lp, 0.7), ("hp", hp, 0.7)]) * feedback
        if pingpong:
            tap = tap[::-1].copy() if r == 1 else tap[::-1]
        out += tap
    return out


# --------------------------------------------------------------------------- mixer
class Mixer:
    def __init__(self, score, verbose=True, keep_tracks=False):
        self.score = score
        self.keep_tracks = keep_tracks
        self.tracks: dict = {}
        self.sr = score.sr
        self.verbose = verbose
        self._irs = {}
        self.stats: dict = {"tracks": {}, "buses": {}, "master": {}}

    def ir(self, name):
        if name not in self._irs:
            self._irs[name] = make_ir(self.sr, seed=hash(name) % 1000, **REVERBS[name])
        return self._irs[name]

    def gate_curve(self, track, n):
        sc = self.score
        g = np.ones(n)
        for st in sc.stops:
            if track.name in st["keep"] or track.bus in st["keep"]:
                continue
            s0 = sc.sample(st["beat"])
            s1 = sc.sample(st["beat"] + st["beats"])
            f = int(st["fade_ms"] * 1e-3 * self.sr)
            a = max(0, s0 - f)
            g[a:s0] = np.minimum(g[a:s0], np.linspace(1, 0, s0 - a))
            g[s0:s1] = 0.0
        return g

    def strip(self, tr, y):
        sr = self.sr
        m = tr.mix
        n = y.shape[-1]
        st = {}
        if m.get("eq"):
            y = eq(y, sr, m["eq"])
        if m.get("comp"):
            y = compress(y, sr, stats=st, **m["comp"])
        if m.get("sat"):
            d = float(m["sat"])
            y = np.tanh(d * y) / math.tanh(d)
        if m.get("lufs") is not None:
            # loudness-based gain staging: pre-fader level set by integrated LUFS of the active parts
            cur = loudness.integrated_lufs(y if y.ndim == 2 else np.stack([y, y]) * math.sqrt(0.5), sr)
            if math.isfinite(cur):
                y = y * dsp.db2lin(m["lufs"] - cur)
        gain = dsp.db2lin(m.get("gain_db", 0.0))
        auto_g = tr.automation_curve("gain_db", n, 0.0)
        if y.ndim == 1:
            pan = m.get("pan", 0.0)
            auto_p = tr.automation_curve("pan", n, pan)
            y = dsp.to_stereo(y, auto_p if auto_p is not None else pan)
        else:
            if m.get("pan"):
                gl, gr = dsp.pan_gains(m["pan"])
                y = np.stack([y[0] * gl * math.sqrt(2), y[1] * gr * math.sqrt(2)])
        if m.get("width") is not None:
            y = dsp.ms_width(y, m["width"])
        y = y * gain
        if auto_g is not None:
            y = y * dsp.db2lin(auto_g)
        for kind, param in (("lp", "lpf"), ("hp", "hpf")):
            c = tr.automation_curve(param, n, 0.0)
            if c is not None:
                y = dsp.tv_filter(y, kind, c, sr, 0.8)
        y = y * self.gate_curve(tr, n)
        st["peak_db"] = float(loudness.sample_peak_db(y))
        self.stats["tracks"][tr.name] = st
        return y

    def render(self):
        sc = self.score
        n = sc.n_samples
        sr = self.sr
        bus_sum: dict[str, np.ndarray] = {}
        sends: dict[tuple[str, str], np.ndarray] = {}
        import time
        for name, tr in sc.tracks.items():
            t0 = time.time()
            evs = tr.resolve()
            rng = np.random.default_rng(tr.seed)
            y = tr.instrument.render(evs, n, sr, rng, tr) if evs else np.zeros(n)
            y = self.strip(tr, y)
            if self.keep_tracks:
                self.tracks[name] = y.astype(np.float32)
            bus_sum.setdefault(tr.bus, np.zeros((2, n)))
            bus_sum[tr.bus] += y
            for fx, lvl in (tr.mix.get("sends") or {}).items():
                key = (tr.bus, fx)
                sends.setdefault(key, np.zeros((2, n)))
                sends[key] += y * lvl
            if self.verbose:
                print(f"  track {name:12s} {len(evs):4d} events  {time.time() - t0:5.2f}s  peak {self.stats['tracks'][name]['peak_db']:6.1f} dBFS")
        stems = {}
        for bus, y in bus_sum.items():
            cfg = sc.buses.get(bus, {})
            st = {}
            if cfg.get("parallel"):
                p = dict(cfg["parallel"])
                amt = p.pop("mix", 0.3)
                crushed = compress(y, sr, **p)
                y = y + amt * crushed
            if cfg.get("comp"):
                y = compress(y, sr, stats=st, **cfg["comp"])
            if cfg.get("eq"):
                y = eq(y, sr, cfg["eq"])
            if cfg.get("gain_db"):
                y = y * dsp.db2lin(cfg["gain_db"])
            for (b, fx), s in sends.items():
                if b != bus:
                    continue
                if fx.startswith("delay"):
                    # 'delay' = dotted-8th ping-pong; 'delay:0.5' = N beats
                    beats = float(fx.split(":")[1]) if ":" in fx else 0.75
                    y = y + tempo_delay(s, sr, beats * sc.spb)
                else:
                    # reverb returns: keep lows out of the room (mud + stereo lows)
                    y = y + dsp.fftconv(dsp.filt(s, "hp", 180, sr, 0.7071, order=4), self.ir(fx))
            stems[bus] = y
            self.stats["buses"][bus] = st
        return stems

    def master(self, stems, target_lufs=-14.0, ceiling_db=-1.0, glue=None, master_eq=None, clip_db=1.5,
               mono_below_hz=100.0):
        sr = self.sr
        mix = sum(stems.values())
        st = self.stats["master"]
        pre = loudness.integrated_lufs(mix, sr)
        st["premaster_lufs"] = pre
        norm = dsp.db2lin(-20.0 - pre)
        y = mix * norm
        y = dsp.mono_below(y, sr, mono_below_hz) if mono_below_hz else y
        if master_eq:
            y = eq(y, sr, master_eq)
        g = {"thresh": -17.0, "ratio": 2.0, "attack_ms": 12.0, "release_ms": 150.0, "knee": 6.0, "detector": "rms"}
        g.update(glue or {})
        gst = {}
        y = compress(y, sr, stats=gst, **g)
        st["glue_gr_mean_db"] = gst.get("gr_mean_db")
        st["glue_gr_max_db"] = gst.get("gr_max_db")
        gain_db = target_lufs - loudness.integrated_lufs(y, sr)
        out = y
        for it in range(4):
            z = y * dsp.db2lin(gain_db)
            if clip_db:
                z = soft_clip(z, sr, clip_db)
            lst = {}
            out = limiter(z, sr, ceiling_db=ceiling_db, stats=lst)
            got = loudness.integrated_lufs(out, sr)
            if abs(got - target_lufs) < 0.05:
                break
            gain_db += target_lufs - got
        st.update(lst)
        st["final_lufs"] = loudness.integrated_lufs(out, sr)
        st["true_peak_db"] = loudness.true_peak_db(out)
        st["master_gain_db"] = gain_db
        return out
