"""Sampled instruments (real recordings) - drop-in alternatives to the synthesized palette.

    SampledKit          acoustic kit (DrumGizmo DRSKit, 13-mic multitrack mixed to stereo) + VCSL percussion
                        (cowbell, clap, tamb, shaker, gong, bassdrum, anvil, clash); velocity layers + round-robin;
                        unknown pieces (e.g. 'stomp') fall back to the synthesized RockKit.
    SampledPiano        Salamander Grand V3 (Yamaha C5, 8 of 16 layers); honky=cents adds the honky-tonk chorus
                        (two detuned copies of every note).
    IRRhythmGuitar      RhythmGuitar through real 4x12 cab impulse responses (Science Amplification IRs).
    IRLeadGuitar        LeadGuitar through a real cab IR.
    SampledGangShouts   gang shouts layered from real recorded group + solo shouts (Freesound CC0/CC-BY):
                        HEY, HUP, HO, HA, YEAH, WHOA; other words fall back to the formant-synth GangShouts.

All of them read the compact cache built by ``instruments/sample_cache.py`` (never the raw libraries).
``instruments/palette.py`` switches whole songs between synth and sampled instruments.
"""
from __future__ import annotations

import math
from fractions import Fraction

import numpy as np
from scipy import signal

from producer import dsp
from producer.dsp import eq
from . import sample_cache as sc
from .base import Instrument, expand_chords, vq
from .drums import LEVEL as SYNTH_LEVEL, PAN as SYNTH_PAN, RockKit
from .guitar import LeadGuitar, RhythmGuitar
from .vocals import GangShouts

_WAV: dict[str, np.ndarray] = {}
DEBUG = False


def wav(rel: str) -> np.ndarray:
    x = _WAV.get(rel)
    if x is None:
        x = _WAV[rel] = sc.read(rel)
    return x


_ALIGN: dict[str, int] = {}


def attack_index(rel: str, on: int, lead_ms: float = 1.5, sr: int = sc.SR) -> int:
    """Sample index to put ON the beat: the transient start `on`, or - for slow/smeared attacks (group claps,
    cymbal bloom, piano hammers) - `lead_ms` before the envelope reaches 50 % of its attack peak. This is what the
    beat-map lane check measures (perceptual attack), so lanes stay within ~2 ms."""
    k = _ALIGN.get(rel)
    if k is None:
        x = wav(rel)
        seg = x[:, on: on + int(0.12 * sr)].mean(axis=0)
        env = np.abs(signal.hilbert(seg))
        sm = max(1, int(0.0005 * sr))
        env = np.convolve(env, np.ones(sm) / sm, mode="same")
        o50 = on + int(np.nonzero(env >= 0.5 * env.max())[0][0])
        k = _ALIGN[rel] = max(on, o50 - int(lead_ms * 1e-3 * sr))
    return k


def resample_ratio(x: np.ndarray, ratio: float) -> np.ndarray:
    """Play x `ratio` times faster (pitch up by ratio). Polyphase, alias-safe."""
    if abs(ratio - 1.0) < 1e-5:
        return x
    fr = Fraction(1.0 / ratio).limit_denominator(600)
    return signal.resample_poly(x, fr.numerator, fr.denominator, axis=-1)


class _RoundRobin:
    """Pick a hit for a velocity: nearest velocity layer, round-robin inside it (never the same take twice in a row)."""

    def __init__(self, hits: list[dict], seed: int = 0):
        self.hits = hits
        vels = sorted({round(h["vel"], 3) for h in hits})
        self.layers = [(v, [h for h in hits if round(h["vel"], 3) == v]) for v in vels]
        self.pos: dict[int, int] = {}
        self.rng = np.random.default_rng(seed)

    def pick(self, vel: float):
        vs = np.array([v for v, _ in self.layers])
        li = int(np.argmin(np.abs(vs - vel) + 0.02 * (vs < vel)))   # ties -> the softer-sounding layer above
        lv, hs = self.layers[li]
        k = self.pos.get(li)
        k = int(self.rng.integers(len(hs))) if k is None else (k + 1 + int(self.rng.integers(max(1, len(hs) - 1)))) % len(hs)
        self.pos[li] = k
        return hs[k], lv


# =========================================================================== drums
# pieces that live in the 'perc' (VCSL) section of the cache
PERC_PIECES = ("cowbell", "cowbell2", "clap", "tamb", "tambshake", "shaker", "gong", "bassdrum", "anvil", "clash")
# relative levels for pieces RockKit doesn't have (RockKit's LEVEL table covers the rest)
EXTRA_LEVEL = {"tom2": 0.5, "halfhat": 0.35, "hatfoot": 0.3, "sidestick": 0.35, "cowbell2": 0.45, "tamb": 0.35, "tambshake": 0.3, "shaker": 0.25, "gong": 0.6, "bassdrum": 0.8,
               "anvil": 0.4, "clash": 0.5}
EXTRA_PAN = {"tom2": -0.25, "halfhat": 0.32, "hatfoot": 0.32, "sidestick": 0.02, "cowbell2": 0.22, "tamb": -0.3, "tambshake": -0.3, "shaker": 0.35, "gong": 0.0, "bassdrum": 0.0,
             "anvil": 0.15, "clash": -0.2}
# mix EQ per piece (the multi-mic samples are raw: boxy 250-500 Hz room/overhead build-up, no click). A typical rock
# drum-bus treatment, applied once per sample file.
PIECE_EQ = {
    "kick": [("hp", 30, 0.7), ("peak", 55, 0.9, 6.0), ("ls", 90, 0.7, 2.0), ("peak", 380, 1.0, -8.0), ("peak", 3800, 1.0, 4.0)],
    "snare": [("hp", 80, 0.7), ("peak", 190, 1.2, 2.0), ("peak", 520, 0.9, -6.0), ("peak", 4500, 0.8, 2.5)],
    "sidestick": [("hp", 150, 0.7), ("peak", 500, 1.0, -3.0)],
    "tom": [("hp", 70, 0.7), ("peak", 420, 0.9, -7.0), ("peak", 3500, 1.0, 2.5)],
    "tom2": [("hp", 55, 0.7), ("peak", 400, 0.9, -7.0), ("peak", 3500, 1.0, 2.5)],
    "floortom": [("hp", 45, 0.7), ("ls", 100, 0.7, 2.0), ("peak", 380, 0.9, -7.0), ("peak", 3500, 1.0, 2.5)],
    "hat": [("hp", 300, 0.7), ("peak", 600, 1.0, -3.0), ("hs", 10000, 0.7, 3.0)],
    "halfhat": [("hp", 300, 0.7), ("peak", 600, 1.0, -3.0), ("hs", 10000, 0.7, 3.0)],
    "openhat": [("hp", 300, 0.7), ("peak", 600, 1.0, -3.0), ("hs", 10000, 0.7, 3.0)],
    "hatfoot": [("hp", 300, 0.7)],
    "crash": [("hp", 250, 0.7), ("peak", 500, 1.0, -3.0), ("hs", 9000, 0.7, 4.0)],
    "china": [("hp", 250, 0.7), ("peak", 500, 1.0, -3.0), ("hs", 9000, 0.7, 3.0)],
    "ride": [("hp", 250, 0.7), ("peak", 500, 1.0, -2.0), ("hs", 10000, 0.7, 3.0)],
    "ridebell": [("hp", 250, 0.7), ("hs", 10000, 0.7, 2.0)],
    "cowbell": [("hp", 250, 0.7)],
    "cowbell2": [("hp", 250, 0.7)],
    "clap": [("hp", 200, 0.7), ("peak", 1500, 1.0, 2.0)],
    "tamb": [("hp", 400, 0.7)],
    "tambshake": [("hp", 400, 0.7)],
    "shaker": [("hp", 500, 0.7)],
}
# loudness reference window per piece (s) for calibrating against the synth kit
REF_WIN = {"crash": 0.4, "china": 0.4, "ride": 0.3, "openhat": 0.25, "gong": 0.6, "clash": 0.4}


# pieces played by another sampled piece: piece -> (sampled piece, minimum velocity)
ALIASES = {"rimshot": ("snare", 0.92)}      # DRSKit's rim samples are cross-sticks ('sidestick'); a rimshot ~ a max-velocity snare


def kit_wav(rel: str, piece: str, sr: int = sc.SR) -> np.ndarray:
    k = rel + "|eq"
    x = _WAV.get(k)
    if x is None:
        x = wav(rel)
        if piece in PIECE_EQ:
            x = eq(x, sr, PIECE_EQ[piece])
        _WAV[k] = x
    return x


class SampledKit(Instrument):
    """Acoustic kit + percussion from samples. Same piece names as RockKit plus tom2, cowbell2, tamb, tambshake,
    shaker, gong, bassdrum, anvil, clash, halfhat, hatfoot, sidestick. Per-event params: tune (pitch multiplier, e.g. 0.94).

    levels/pans: overrides (audience perspective, like RockKit). Every sampled piece is loudness-matched to the
    synthesized RockKit piece at the same velocity (so the existing mixes keep their balance), then scaled by
    `levels`. `fallback`: instrument for pieces without samples (default RockKit(), used for 'stomp').
    `synth_layer`: {'kick': 0.3} blends in some of the synthesized piece (e.g. extra sub/click on the kick).
    `kick_sub`: level of a sine sub-kick (70->48 Hz, ~0.2 s) under the sampled kick, relative to its peak. The
    acoustic kick has ~4 dB less 40-80 Hz than the synth RockKit kick the mixes were balanced on."""
    mono = False

    def __init__(self, levels: dict | None = None, pans: dict | None = None, tune: float = 1.0, fallback: Instrument | None = None,
                 synth_layer: dict | None = None, seed: int = 7, kick_sub: float = 0.7):
        super().__init__()
        self.kick_sub = kick_sub
        self.fallback = fallback or RockKit()
        self.levels = {**SYNTH_LEVEL, **EXTRA_LEVEL, **(levels or {})}
        self.pans = {**SYNTH_PAN, **EXTRA_PAN, **(pans or {})}
        self.tune = tune
        self.synth_layer = synth_layer or {}
        idx = sc.load_index()
        self.pieces: dict[str, dict] = {}
        for p, d in idx.get("kit", {}).items():
            self.pieces[p] = d
        for p, d in idx.get("perc", {}).items():
            self.pieces[p] = d
        if not self.pieces:
            raise FileNotFoundError("sample cache has no kit/perc: run tools/music/instruments/sample_cache.py")
        self.rr = {p: _RoundRobin(d["hits"], seed + i) for i, (p, d) in enumerate(sorted(self.pieces.items()))}
        self._cal: dict[str, float] = {}

    def has(self, piece):
        return piece in self.pieces

    def _calibration(self, piece, sr):
        """Gain that makes the loudest sampled layer as loud as the synth piece at vel 1 (x level ratio)."""
        g = self._cal.get(piece)
        if g is not None:
            return g
        win = int(REF_WIN.get(piece, 0.15) * sr)
        hits = self.pieces[piece]["hits"]
        top = max(h["vel"] for h in hits)
        loud = [kit_wav(h["f"], piece) for h in hits if h["vel"] == top]
        s_rms = np.mean([np.sqrt(np.mean(x[:, :win] ** 2)) for x in loud])
        ref_piece = piece if piece in SYNTH_LEVEL else {"tom2": "tom", "cowbell2": "cowbell", "halfhat": "openhat", "hatfoot": "hat"}.get(piece)
        if ref_piece is not None:
            from producer.score import Resolved
            rng = np.random.default_rng(3)
            ev = Resolved(0, 0, 0, 0, 0.25, int(0.25 * sr), None, 1.0, ref_piece, {}, 60 / 164)
            y = RockKit().voice(ev, sr, rng)          # includes RockKit's level for ref_piece
            r_rms = np.sqrt(np.mean(y[:, :win] ** 2))
            g = r_rms / (s_rms + 1e-12) * self.levels.get(piece, 0.5) / SYNTH_LEVEL[ref_piece]
            print(f"[SampledKit] {piece}: synth {20 * np.log10(r_rms):.1f} dB, sample {20 * np.log10(s_rms):.1f} dB -> {20 * np.log10(g):+.1f} dB") if DEBUG else None
        else:
            # no synth counterpart: match the synth snare's loudness, then scale by level
            ev_rms = self._snare_ref(sr, win)
            g = ev_rms / (s_rms + 1e-12) * self.levels.get(piece, 0.5) / SYNTH_LEVEL["snare"]
        self._cal[piece] = g
        return g

    def _sub(self, sr, on, n):
        k = ("sub", on, n)
        v = self._cal.get(k)
        if v is None:
            m = n - on
            t = np.arange(m) / sr
            f = 48 + 22 * np.exp(-t / 0.03)
            ph = 2 * np.pi * np.cumsum(f) / sr
            sub = np.sin(ph) * np.exp(-t / 0.2) * np.clip(t / 0.002, 0, 1)
            v = np.zeros(n)
            v[on:] = sub
            self._cal[k] = v
        return v

    def _snare_ref(self, sr, win):
        from producer.score import Resolved
        ev = Resolved(0, 0, 0, 0, 0.25, int(0.25 * sr), None, 1.0, "snare", {}, 60 / 164)
        y = RockKit().voice(ev, sr, np.random.default_rng(3))
        return np.sqrt(np.mean(y[:, :win] ** 2))

    def hit(self, piece, vel, sr, tune=1.0):
        h, lv = self.rr[piece].pick(vel)
        x = kit_wav(h["f"], piece)
        # velocity: the layer carries the timbre; residual gain bridges to the exact velocity (gentle, 0.5x..1.4x)
        g = float(np.clip((vel / max(lv, 1e-3)) ** 1.2, 0.5, 1.4)) * self._calibration(piece, sr)
        y = x * g
        if piece == "kick" and self.kick_sub > 0:
            y = y + self._sub(sr, h["on"], y.shape[1]) * (self.kick_sub * float(np.max(np.abs(y))))
        t = tune * self.tune
        if abs(t - 1) > 1e-4:
            y = resample_ratio(y, t)
        # pan: the samples carry the overhead image; nudge the whole hit toward the piece's pan (balance, not collapse)
        p = self.pans.get(piece, 0.0)
        if piece in PERC_PIECES and abs(p) > 1e-3:
            gl, gr = dsp.pan_gains(p)
            y = np.stack([y[0] * gl * math.sqrt(2), y[1] * gr * math.sqrt(2)])
        return y, int(round(attack_index(h["f"], h["on"]) / t))

    def render(self, events, n, sr, rng, track=None):
        out = np.zeros((2, n))
        fb_events = []
        hats = [e for e in events if e.piece in ("hat", "openhat")]
        for e in events:
            p = e.piece
            if p in ALIASES and p not in self.pieces and ALIASES[p][0] in self.pieces:
                from dataclasses import replace
                p, vmin = ALIASES[p]
                e = replace(e, piece=p, vel=max(e.vel, vmin))
            if p not in self.pieces:
                fb_events.append(e)
                continue
            if p in self.synth_layer:
                fb_events.append(e)
            y, on = self.hit(p, e.vel, sr, float(e.params.get("tune", 1.0)))
            if p == "openhat":
                nxt = next((h for h in hats if h.start > e.start), None)
                if nxt is not None:
                    L = nxt.start - e.start + on
                    if L < y.shape[1]:
                        fl = int(0.012 * sr)
                        y = y[:, :L + fl].copy()
                        y[:, -fl:] *= np.linspace(1, 0, fl)
            dsp.place(out, y, e.start - on)
        fb_only = [e for e in fb_events if e.piece not in self.pieces]
        if fb_only:
            y = self.fallback.render(fb_only, n, sr, rng, track)
            out += y if y.ndim == 2 else np.stack([y, y])
        for p, amt in self.synth_layer.items():
            evs = [e for e in fb_events if e.piece == p and p in self.pieces]
            if evs:
                out += amt * self.fallback.render(evs, n, sr, rng, track)
        return out


# =========================================================================== piano
class SampledPiano(Instrument):
    """Salamander Grand (Yamaha C5) multisample. honky: detune in cents of the honky-tonk chorus (0 = plain grand;
    ~8-14 = saloon piano): every note plays two copies, +honky/2 and -honky/2 cents, the second 0.3-1.2 ms late, spread
    `honky_width` apart. bright: high-shelf dB at 3 kHz. width: M/S width of the (AB-miked) samples.
    release: damper time constant scale."""
    mono = False
    variants = 1

    def __init__(self, honky: float = 0.0, honky_width: float = 0.35, bright: float = 6.0, width: float = 0.8, level: float = 1.0,
                 release: float = 1.0, max_hold: float = 6.0):
        super().__init__()
        self.honky = honky
        self.honky_width = honky_width
        self.bright = bright
        self.width = width
        self.level = level
        self.release = release
        self.max_hold = max_hold
        notes = sc.section("piano")["notes"]
        self.keys = sorted({n["midi"] for n in notes})
        self.by_key = {k: sorted([n for n in notes if n["midi"] == k], key=lambda n: n["vel"]) for k in self.keys}

    def voice_key(self, ev):
        return (float(ev.pitch), vq(ev.vel, 24), round(min(ev.dur_s, self.max_hold), 2))

    def _sample(self, m, vel):
        k = min(self.keys, key=lambda kk: (abs(kk - m), kk < m))
        layers = self.by_key[k]
        vs = np.array([n["vel"] for n in layers])
        i = int(np.searchsorted(vs, vel - 1e-6))       # first layer whose top velocity >= vel
        i = min(i, len(layers) - 1)
        n = layers[i]
        return n, k

    def voice(self, ev, sr, rng):
        m = float(ev.pitch)
        v = float(np.clip(ev.vel, 0.02, 1.0))
        n, root = self._sample(m, v)
        x = wav(n["f"])
        # gain bridge inside the layer (layers are ~8/127 apart): +-2 dB at most
        g = float(np.clip((v / n["vel"]) ** 0.8, 0.7, 1.0))
        hold = min(ev.dur_s, self.max_hold)
        rel = float(np.interp(m, [21, 48, 72, 108], [0.35, 0.22, 0.14, 0.08])) * self.release
        L = min(x.shape[1], int((hold + rel * 5) * sr) + n["on"])
        base = x[:, :L]

        def shifted(cents):
            ratio = 2 ** ((m - root) / 12 + cents / 1200)
            return resample_ratio(base, ratio), ratio

        if self.honky > 0:
            a, ra = shifted(+self.honky / 2)
            b, rb = shifted(-self.honky / 2)
            d = int(rng.uniform(0.0003, 0.0012) * sr)
            Lh = max(a.shape[1], b.shape[1] + d)
            y = np.zeros((2, Lh))
            w = self.honky_width
            y[:, :a.shape[1]] += np.stack([a[0] * (1 + w), a[1] * (1 - w)]) * 0.5
            y[:, d:d + b.shape[1]] += np.stack([b[0] * (1 - w), b[1] * (1 + w)]) * 0.5
            on = int(round(attack_index(n["f"], n["on"]) / ra))
        else:
            y, r = shifted(0.0)
            y = y.copy()
            on = int(round(attack_index(n["f"], n["on"]) / r))
        # damper
        hs = on + int(hold * sr)
        if hs < y.shape[1]:
            y[:, hs:] *= np.exp(-np.arange(y.shape[1] - hs) / (rel * sr))
        return y * g, on                   # `on` (attack) goes exactly on the note start

    def render(self, events, n, sr, rng, track=None):
        y = np.zeros((2, n))
        for ev in expand_chords(events):
            k = self.voice_key(ev)
            v = self._cache.get(k)
            if v is None:
                v = self._cache[k] = self.voice(ev, sr, rng)
            dsp.place(y, v[0], ev.start - v[1])
        if self.width != 1.0:
            y = dsp.ms_width(y, self.width)
        if self.bright:
            # the AB-miked concert grand is dark next to a band: shelf + presence (a bright rock/saloon piano)
            y = eq(y, sr, [("peak", 250, 0.8, -1.5), ("hs", 2500, 0.7, self.bright), ("peak", 4500, 1.0, self.bright * 0.5)])
        return y * self.level


# =========================================================================== guitar cab IRs
CAB_PRESETS = {
    # name: [(ir, weight), ...]  (weights mix mics on the same cab, like blending an SM57 and a ribbon/421)
    "greenback": [("g12h75_sm57", 1.0), ("g12h75_md421", 0.5)],      # G12H-75 Creamback 4x12: AC/DC-ish
    "v30": [("v30_sm57", 1.0), ("v30_n22", 0.5)],                    # Vintage 30 4x12: tighter, more upper-mid
    "g12h150": [("g12h150_sm57", 1.0), ("g12h150_md421", 0.5)],
    "greenback_dark": [("g12h75_sm57_dark", 1.0), ("g12h75_n22", 0.4)],
    "v30_dark": [("v30_sm57_dark", 1.0), ("v30_md421", 0.4)],
}


CAB_EQ = [("peak", 200, 0.9, -2.0), ("peak", 520, 1.0, -2.5), ("peak", 2600, 0.8, 2.5)]   # real 4x12s: +5 dB 125-250 Hz, darker 2-4 kHz than our synth cab


def cab_fir(preset: str | list, lp_hz: float | None = 9000.0, sr: int = sc.SR, tone=CAB_EQ) -> np.ndarray:
    """Mono FIR from a preset name, an IR name, or [(ir, weight), ...]. Unit gain at 300 Hz-3 kHz.
    tone: EQ baked into the IR (default CAB_EQ; None = the raw IR)."""
    spec = CAB_PRESETS.get(preset, [(preset, 1.0)]) if isinstance(preset, str) else preset
    cabs = sc.section("cab")
    h = None
    for name, w in spec:
        x = wav(cabs[name]["f"])[0] * cabs[name]["gain"]
        h = w * x if h is None else h + w * x
    if lp_hz:
        h = dsp.filt(h, "lp", lp_hz, sr, 0.6)
    if tone:
        h = eq(np.concatenate([h, np.zeros(2048)]), sr, tone)
    H = np.abs(np.fft.rfft(h, 16384))
    fr = np.fft.rfftfreq(16384, 1 / sr)
    band = (fr > 300) & (fr < 3000)
    return h / math.sqrt(np.mean(H[band] ** 2))


class IRRhythmGuitar(RhythmGuitar):
    """RhythmGuitar (same DI + amp) through real cab IRs: cabs = (take-L preset, take-R preset)."""

    def __init__(self, cabs=("greenback", "v30"), cab_lp=9000.0, **kw):
        super().__init__(**kw, cab_firs=[cab_fir(c, cab_lp) for c in cabs])


class IRLeadGuitar(LeadGuitar):
    def __init__(self, cab="greenback", cab_lp=9000.0, **kw):
        super().__init__(**kw, cab_fir=cab_fir(cab, cab_lp))


# =========================================================================== gang shouts
class SampledGangShouts(Instrument):
    """Gang shouts built from real recordings. event.piece = word; params: voices (int, default `voices`),
    stretch (>1 = longer word: longer takes + slightly lower/slower playback).

    A hit layers `group_layers` real GROUP recordings (several people each; doubled hard L/R, different takes or a
    pitch-shifted copy) + a SOLO gang (voices-2 single-voice takes, each pitch-shifted N(0, pitch_spread) semitones,
    0-15 ms late, spread across the stereo field). Like the synth GangShouts, the result is self-calibrated so the
    gang envelope reaches 50 % exactly on the beat (the /h/ is pre-rolled). Words not in the cache use `fallback`
    (the formant-synth GangShouts); `synth_blend` > 0 adds some of the synth gang under the samples."""
    mono = False
    variants = 4
    lane_kind = "GangShouts"      # beat map: same 'shouts' lane as the synth gang
    PRE = 0.25        # s of pre-roll before the beat (longest take onset is ~0.2 s)

    def __init__(self, voices: int = 10, spread: float = 0.85, level: float = 1.0, group_layers: int = 2,
                 pitch_spread: float = 0.9, synth_blend: float = 0.0, fallback: Instrument | None = None):
        super().__init__()
        self.voices = voices
        self.spread = spread
        self.level = level
        self.group_layers = group_layers
        self.pitch_spread = pitch_spread
        self.synth_blend = synth_blend
        self.fallback = fallback or GangShouts(voices=voices)
        self.words = sc.section("shouts")

    def voice_key(self, ev):
        return (ev.piece.upper(), int(ev.params.get("voices", self.voices)), round(float(ev.params.get("stretch", 1.0)), 2))

    def _take(self, t, rate, sr):
        x = wav(t["f"])
        y = resample_ratio(x, rate)
        return y, t["on50"] / rate

    def voice(self, ev, sr, rng):
        word = ev.piece.upper()
        takes = self.words[word]
        nv = int(ev.params.get("voices", self.voices))
        stretch = float(ev.params.get("stretch", 1.0))
        slow = stretch ** -0.25                        # stretch 1.3 -> ~-1.1 semitone, 7 % longer
        groups = [t for t in takes if t["kind"] == "group"]
        solos = [t for t in takes if t["kind"] == "solo"]
        if stretch > 1.05:                             # prefer the longer takes for stretched words
            groups = sorted(groups, key=lambda t: -t["len"])[: max(2, len(groups) // 2 + 1)]
            solos = sorted(solos, key=lambda t: -t["len"])[: max(3, len(solos) // 2 + 1)]
        pre = int(self.PRE * sr)
        parts = []   # (stereo sig, on50 offset, delay, gain)
        # --- group layers, doubled L/R
        if groups:
            n_g = min(self.group_layers, 2 * len(groups))
            order = list(rng.permutation(len(groups)))
            for j in range(n_g):
                t = groups[order[j % len(groups)]]
                again = j >= len(groups)
                rate = slow * 2 ** (rng.normal(0, 0.25) / 12 + (0.35 if again else 0) * (1 if j % 2 else -1) / 12)
                y, o = self._take(t, rate, sr)
                side = -1 if j % 2 == 0 else 1
                w = 0.55 + 0.35 * self.spread
                m = 0.5 * (y[0] + y[1])
                sde = 0.5 * (y[0] - y[1])
                y = np.stack([m * (1 - side * w) + sde, m * (1 + side * w) - sde])
                late = 0 if j == 0 else int(rng.uniform(0.003, 0.012) * sr)
                parts.append((y, o, late, 1.0))
        # --- solo gang
        n_s = (max(2, nv - 4) if groups else nv) if solos else 0
        if solos:
            order = list(rng.permutation(len(solos)))
            for j in range(n_s):
                t = solos[order[j % len(solos)]]
                reuse = j // len(solos)
                st = float(np.clip(rng.normal(0, self.pitch_spread) + (1.2 * (1 if reuse % 2 else -1) if reuse else 0), -2.5, 2.5))
                rate = slow * 2 ** (st / 12)
                y, o = self._take(t, rate, sr)
                mono = y.mean(axis=0)
                pan = float(rng.uniform(-self.spread, self.spread))
                late = int(min(abs(rng.normal(0, 0.007)), 0.018) * sr)
                gain = rng.uniform(0.6, 1.0) * (0.75 if groups else 1.0)
                parts.append((dsp.to_stereo(mono, pan) * math.sqrt(2), o, late, gain))
        n = max(pre - int(o) + late + y.shape[1] for y, o, late, _ in parts) + 1
        out = np.zeros((2, n))
        tot = 0.0
        for y, o, late, g in parts:
            dsp.place(out, y * g, pre - int(round(o)) + late)
            tot += g * g
        out /= math.sqrt(max(tot, 1.0))
        # real shouts are far brighter than the formant synth: keep body, soften the 3-8 kHz edge
        out = eq(out, sr, [("hp", 120, 0.7), ("peak", 250, 1.0, 1.5), ("peak", 3200, 1.0, -1.5), ("hs", 6000, 0.7, -3.0),
                           ("lp", 11000, 0.7)])
        if self.synth_blend > 0:
            syn = self.fallback.voice(ev, sr, rng) / max(ev.vel, 1e-3)
            spre = int(0.1 * sr * stretch)
            s_out = np.zeros((2, max(n, pre - spre + syn.shape[1])))
            s_out[:, :n] = out
            dsp.place(s_out, syn * self.synth_blend * np.max(np.abs(out)) / (np.max(np.abs(syn)) + 1e-9), pre - spre)
            out = s_out
        # self-calibrate: gang envelope reaches 50 % of its (attack) peak exactly at `pre`
        env = np.abs(signal.hilbert(out.mean(axis=0)))
        sm = int(0.0005 * sr)
        env = np.convolve(env, np.ones(sm) / sm, mode="same")
        head = env[: pre + int(0.1 * sr)]      # same window as analyze.isolated_lane_alignment
        cross = int(np.nonzero(head >= 0.5 * head.max())[0][0])
        shift = cross - pre
        if shift > 0:
            out = out[:, shift:]
        elif shift < 0:
            out = np.pad(out, ((0, 0), (-shift, 0)))
        return out * ev.vel

    def render(self, events, n, sr, rng, track=None):
        out = np.zeros((2, n))
        fb = [e for e in events if e.piece.upper() not in self.words]
        pre = int(self.PRE * sr)
        for i, ev in enumerate(e for e in events if e.piece.upper() in self.words):
            k = (self.voice_key(ev), i % self.variants)
            sig = self._cache.get(k)
            if sig is None:
                sig = self._cache[k] = self.voice(ev, sr, rng)
            dsp.place(out, sig, ev.start - pre)
        if fb:
            out += self.fallback.render(fb, n, sr, rng, track)
        return out * self.level
