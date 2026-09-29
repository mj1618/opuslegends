"""Compact sample cache for the sampled instruments.

The raw downloaded libraries live in ``tools/music/samples/`` (gigabytes, gitignored, see
``tools/music/SAMPLES.md``). Renders never touch them: this module extracts, mixes down, trims and
resamples only the notes/hits we play into ``tools/music/samples_cache/`` (48 kHz 16-bit stereo WAVs
+ ``index.json``, gitignored, ~350 MB), so loading is fast.

    python3 tools/music/instruments/sample_cache.py                 # build everything that is missing
    python3 tools/music/instruments/sample_cache.py kit piano --force

Sections: ``kit`` (DrumGizmo DRSKit multi-mic -> stereo), ``perc`` (VCSL cowbell/claps/tambourine/
shakers/gong/concert bass drum/anvil/clash cymbals), ``piano`` (Salamander Grand V3), ``cab``
(Science Amplification 4x12 IRs), ``shouts`` (Freesound CC0/CC-BY HEY/HUP/HO/HA/YEAH/WHOA takes).

Every one-shot is trimmed so its transient starts ~1 ms into the file (``on`` = sample index of the
first transient, ``on50`` = where the envelope first reaches 50 % of peak, used by the shouts to put the
perceptual onset on the beat).
"""
from __future__ import annotations

import glob
import json
import math
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
MUSIC = os.path.dirname(HERE)
SAMPLES = os.path.join(MUSIC, "samples")
CACHE = os.path.join(MUSIC, "samples_cache")
SR = 48000


# --------------------------------------------------------------------------- io
def decode(path: str, sr: int = SR, channels: int | None = None) -> np.ndarray:
    """Any audio file -> float64 (ch, n) at sr via ffmpeg (handles 24-bit, ogg, mp3, multichannel)."""
    if channels is None:
        p = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels",
                            "-of", "csv=p=0", path], capture_output=True, text=True, check=True)
        channels = int(p.stdout.strip().split(",")[0])
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", str(channels),
                        "-ar", str(sr), "-"], capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).reshape(-1, channels).T.astype(np.float64)


def write(rel: str, x: np.ndarray, sr: int = SR) -> str:
    path = os.path.join(CACHE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    x = np.atleast_2d(x)
    if x.shape[0] == 1:
        x = np.vstack([x, x])
    y = np.clip(x.T, -1, 1)
    wavfile.write(path, sr, np.round(y * 32767).astype(np.int16))
    return rel


def read(rel: str) -> np.ndarray:
    """Cached WAV -> float64 (2, n)."""
    sr, d = wavfile.read(os.path.join(CACHE, rel))
    assert sr == SR, (rel, sr)
    return d.T.astype(np.float64) / 32767.0


def load_index() -> dict:
    p = os.path.join(CACHE, "index.json")
    if not os.path.exists(p):
        raise FileNotFoundError("sample cache missing: run `python3 tools/music/instruments/sample_cache.py` "
                                "(needs the libraries in tools/music/samples/, see tools/music/SAMPLES.md)")
    with open(p) as f:
        return json.load(f)


def section(name: str) -> dict:
    idx = load_index()
    if name not in idx:
        raise FileNotFoundError(f"sample cache has no '{name}' section: run "
                                f"`python3 tools/music/instruments/sample_cache.py {name}`")
    return idx[name]


# --------------------------------------------------------------------------- helpers
def env_db(m: np.ndarray, sr: int = SR, win_ms: float = 1.0) -> np.ndarray:
    h = max(1, int(win_ms * 1e-3 * sr))
    return 10 * np.log10(np.convolve(m ** 2, np.ones(h) / h, "same") + 1e-14)


def transient_start(x: np.ndarray, rel_db: float = -32.0, ref: np.ndarray | None = None) -> int:
    """First sample whose short-time level is within rel_db of the peak (on `ref` channel(s) if given)."""
    m = np.abs(ref if ref is not None else x).max(axis=0) if (ref if ref is not None else x).ndim == 2 else np.abs(ref if ref is not None else x)
    e = env_db(m, win_ms=0.5)
    idx = np.nonzero(e > e.max() + rel_db)[0]
    return int(idx[0]) if len(idx) else 0


def on50(x: np.ndarray, sr: int = SR, search_s: float | None = None) -> int:
    """Where the (Hilbert, 0.5 ms smoothed) envelope first reaches 50 % of its peak."""
    m = x.mean(axis=0) if x.ndim == 2 else x
    env = np.abs(signal.hilbert(m))
    sm = max(1, int(0.0005 * sr))
    env = np.convolve(env, np.ones(sm) / sm, mode="same")
    head = env if search_s is None else env[: int(search_s * sr)]
    return int(np.nonzero(head >= 0.5 * head.max())[0][0])


def trim(x: np.ndarray, start: int, max_s: float, pre_ms: float = 1.0, fade_ms: float = 150.0, floor_db: float = -70.0,
         sr: int = SR) -> tuple[np.ndarray, int]:
    """Cut from (start - pre) to where the tail falls below floor_db (max max_s), fade in/out.
    Returns (y, index of `start` in y)."""
    pre = int(pre_ms * 1e-3 * sr)
    a = max(0, start - pre)
    y = x[:, a: a + int(max_s * sr)].copy()
    m = np.abs(y).max(axis=0)
    e = env_db(m, win_ms=20)
    above = np.nonzero(e > e.max() + floor_db)[0]
    end = min(y.shape[1], int(above[-1]) + int(0.02 * sr)) if len(above) else y.shape[1]
    y = y[:, :end]
    fi = min(start - a, int(0.0005 * sr))
    if fi > 1:
        y[:, :fi] *= np.linspace(0, 1, fi)
    fo = min(int(fade_ms * 1e-3 * sr), y.shape[1] // 3)
    if fo > 1:
        y[:, -fo:] *= np.linspace(1, 0, fo) ** 2
    return y, start - a


def peak_db(x):
    return float(20 * np.log10(np.max(np.abs(x)) + 1e-12))


def rms_db(x, n=None):
    x = x[:, :n] if n else x
    return float(10 * np.log10(np.mean(x ** 2) + 1e-14))


# =========================================================================== KIT (DrumGizmo DRSKit)
# DRSKit 2.1 (Jes Eiler / DRSDrums kit, recorded by the DrumGizmo team): 13 mics - AmbL AmbR Kdrum_back Kdrum_front
# Hihat OHL OHR Ride Snare_bottom Snare_top Tom1 Tom2 Tom3. Its left/right are the DRUMMER's; we swap the stereo pairs
# (OH, Amb) to AUDIENCE perspective like RockKit (hi-hat right, floor tom + main crash left).
# Each piece = its own close mic(s) panned to the piece's position + overheads + ambience (other close mics are
# left out, so no phasey bleed stack).
OH = {"OHL": 0.55, "OHR": 0.55, "AmbL": 0.3, "AmbR": 0.3}
KIT_PIECES = {
    # piece: (DRSKit instrument, {mic: gain}, close-mic pan (audience), max seconds, velocity layers, rr per layer)
    "kick": ("Kdrum_without_contact", {"Kdrum_back": 1.0, "Kdrum_front": 0.7, "OHL": 0.2, "OHR": 0.2, "AmbL": 0.25, "AmbR": 0.25}, 0.0, 1.0, 6, 4),
    "snare": ("Snare", {"Snare_top": 1.0, "Snare_bottom": 0.4, **OH}, 0.02, 1.2, 6, 4),
    "sidestick": ("Snare_rim", {"Snare_top": 1.0, "Snare_bottom": 0.3, **OH}, 0.02, 1.2, 3, 4),
    "tom": ("Tom1", {"Tom1": 1.0, **OH}, 0.15, 2.0, 4, 3),
    "tom2": ("Tom2", {"Tom2": 1.0, **OH}, -0.25, 2.2, 4, 3),
    "floortom": ("Tom3", {"Tom3": 1.0, **OH}, -0.4, 2.4, 4, 3),
    "hat": ("Hihat_closed", {"Hihat": 0.8, "OHL": 0.5, "OHR": 0.5, "AmbL": 0.15, "AmbR": 0.15}, 0.35, 0.8, 5, 4),
    "halfhat": ("Hihat_semi_open", {"Hihat": 0.8, "OHL": 0.5, "OHR": 0.5, "AmbL": 0.15, "AmbR": 0.15}, 0.35, 1.5, 3, 3),
    "openhat": ("Hihat_open", {"Hihat": 0.8, "OHL": 0.5, "OHR": 0.5, "AmbL": 0.15, "AmbR": 0.15}, 0.35, 2.5, 3, 3),
    "hatfoot": ("Hihat_foot", {"Hihat": 0.8, "OHL": 0.5, "OHR": 0.5, "AmbL": 0.15, "AmbR": 0.15}, 0.35, 0.6, 2, 3),
    "crash": ("Crash_right_shank", {"OHL": 1.0, "OHR": 1.0, "AmbL": 0.35, "AmbR": 0.35}, -0.45, 4.5, 3, 3),
    "china": ("Crash_left_shank", {"OHL": 1.0, "OHR": 1.0, "AmbL": 0.35, "AmbR": 0.35}, 0.5, 4.0, 3, 3),   # trashy Giant Beat
    "ride": ("Ride_tip", {"Ride": 0.6, "OHL": 0.8, "OHR": 0.8, "AmbL": 0.25, "AmbR": 0.25}, -0.45, 3.0, 3, 4),
    "ridebell": ("Ride_tip_bell", {"Ride": 0.7, "OHL": 0.8, "OHR": 0.8, "AmbL": 0.25, "AmbR": 0.25}, -0.45, 3.0, 3, 3),
}
SWAP_LR = True     # drummer -> audience perspective for the stereo pairs


def _find_drumgizmo_kit():
    roots = sorted(glob.glob(os.path.join(SAMPLES, "DRSKit*", "**", "*.xml"), recursive=True))
    kits = [p for p in roots if ET.parse(p).getroot().tag == "drumkit"]
    if not kits:
        raise FileNotFoundError("DRSKit not found under tools/music/samples/ (unzip DRSKit2_1.zip there)")
    kits.sort(key=lambda p: ("no_whiskers" not in os.path.basename(p).lower(), "full" not in os.path.basename(p).lower()))
    return kits[0]


def build_kit(index: dict):
    kit_xml = _find_drumgizmo_kit()
    kit_dir = os.path.dirname(kit_xml)
    root = ET.parse(kit_xml).getroot()
    insts = {}
    for inst in root.iter("instrument"):
        name = inst.get("name")
        f = inst.get("file")
        cmap = {cm.get("in"): cm.get("out") for cm in inst.iter("channelmap")}
        insts[name] = (os.path.join(kit_dir, f), cmap)
    print(f"  drumgizmo kit {os.path.relpath(kit_xml, SAMPLES)}: {len(insts)} instruments: {', '.join(insts)}")
    out = {}
    for piece, (rx, mics, pan, max_s, n_layers, n_rr) in KIT_PIECES.items():
        name = rx
        if name not in insts:
            print(f"  ! DRSKit has no instrument {name} (for {piece})")
            continue
        ipath, cmap = insts[name]
        iroot = ET.parse(ipath).getroot()
        samples = []
        for s in iroot.iter("sample"):
            files = {}
            for af in s.iter("audiofile"):
                ch = cmap.get(af.get("channel"), af.get("channel"))
                files[ch] = (os.path.join(os.path.dirname(ipath), af.get("file")), int(af.get("filechannel", "1")) - 1)
            power = float(s.get("power", "0") or 0)
            samples.append((power, files))
        samples.sort(key=lambda s: s[0])
        if not samples:
            continue
        # pick n_layers x n_rr samples spread over the (log) power range, loudest layer = the hardest hits
        pw = np.array([s[0] for s in samples])
        lp = np.log(np.maximum(pw, 1e-9))
        targets = np.linspace(np.percentile(lp, 8), lp.max(), n_layers)
        chosen = []
        taken = set()
        for li, tl in enumerate(targets):
            order = np.argsort(np.abs(lp - tl))
            k = [int(i) for i in order if int(i) not in taken][:n_rr]
            taken.update(k)
            chosen.append(k)
        # render each chosen sample to stereo
        layer_list = []
        file_cache: dict = {}
        for li, ks in enumerate(chosen):
            for rr, k in enumerate(ks):
                power, files = samples[k]
                chans = {}
                for mic, (fp, fch) in files.items():
                    if mic not in mics:
                        continue
                    if fp not in file_cache:
                        file_cache.clear()
                        file_cache[fp] = decode(fp)
                    chans[mic] = file_cache[fp][fch]
                if not chans:
                    continue
                n = max(len(v) for v in chans.values())
                st = np.zeros((2, n))
                close = np.zeros(n)
                for mic, g in mics.items():
                    if mic not in chans:
                        continue
                    v = chans[mic]
                    if mic in ("OHL", "AmbL"):
                        st[1 if SWAP_LR else 0, :len(v)] += g * v
                    elif mic in ("OHR", "AmbR"):
                        st[0 if SWAP_LR else 1, :len(v)] += g * v
                    else:
                        close[:len(v)] += g * v
                # close mics panned to the piece's (audience-perspective) position, equal power
                a = (pan + 1) * math.pi / 4
                st[0] += close * math.cos(a) * math.sqrt(2) * 0.8
                st[1] += close * math.sin(a) * math.sqrt(2) * 0.8
                ref = np.stack([close, close]) if np.any(close) else st
                t0 = transient_start(st, -30, ref=ref)
                y, on = trim(st, t0, max_s, pre_ms=1.0, fade_ms=120 if max_s < 2 else 400)
                rel = write(f"kit/{piece}/L{li}_rr{rr}.wav", y)
                layer_list.append({"f": rel, "layer": li, "rr": rr, "power": power, "on": on, "rms": rms_db(y, int(0.1 * SR)),
                                   "peak": peak_db(y)})
        # velocity of a layer = its loudness relative to the loudest layer (dB -> 0..1 over a 30 dB range)
        lay_rms = {li: float(np.mean([e["rms"] for e in layer_list if e["layer"] == li])) for li in {e["layer"] for e in layer_list}}
        top = max(lay_rms.values())
        for e in layer_list:
            e["vel"] = round(float(np.clip(1 + (lay_rms[e["layer"]] - top) / 30.0, 0.05, 1.0)), 3)
        out[piece] = {"source": f"DRSKit/{name}", "hits": layer_list}
        print(f"  kit {piece:9s} <- {name:22s} {len(layer_list)} hits, vel {min(e['vel'] for e in layer_list):.2f}..1")
    index["kit"] = out


# =========================================================================== PERC (VCSL)
VCSL = os.path.join(SAMPLES, "VCSL")
PERC = {
    # piece: [(glob, vel)]   vel = nominal velocity layer the file stands for
    "cowbell": [("**/Cowbells/Cowbell1_Muted_v2*.wav", 0.35), ("**/Cowbells/Cowbell1_Muted_v3*.wav", 0.5),
                ("**/Cowbells/Cowbell1_Normal_v2*.wav", 0.55), ("**/Cowbells/Cowbell1_Normal_v3*.wav", 0.75),
                ("**/Cowbells/Cowbell1_Hit_v2*.wav", 0.7), ("**/Cowbells/Cowbell1_Hit_v3*.wav", 0.85),
                ("**/Cowbells/Cowbell1_Hit_v4*.wav", 1.0)],
    "cowbell2": [("**/Cowbells/Cowbell2_Muted_v2*.wav", 0.4), ("**/Cowbells/Cowbell2_Muted_v3*.wav", 0.6),
                 ("**/Cowbells/Cowbell2_Normal_v2*.wav", 0.7), ("**/Cowbells/Cowbell2_Normal_v3*.wav", 1.0)],
    "clap": [("**/Claps/SoloClap_vl1.wav", 0.25), ("**/Claps/SoloClap_vl2.wav", 0.4), ("**/Claps/SoloClap_vl3.wav", 0.55),
             ("**/Claps/SoloClap_vl4.wav", 0.7)] + [(f"**/Claps/Clap_rr{i}.wav", 1.0) for i in range(1, 7)],
    "tamb": [("**/Tambourine 1/Tamb1_Hit_v1*.wav", 0.55), ("**/Tambourine 1/Tamb1_Hit_v2*.wav", 1.0),
             ("**/Tambourine 2/Tamb2_Hit_v1*.wav", 0.55), ("**/Tambourine 2/Tamb2_Hit_v2*.wav", 1.0)],
    "tambshake": [("**/Tambourine 1/Tamb1_Shake*.wav", 1.0), ("**/Tambourine 2/Tamb2_Shake*.wav", 1.0)],
    "shaker": [("**/Shaker, Small/Mid_ShakerDouble_Down*.wav", 1.0), ("**/Shaker, Small/Mid_ShakerDouble_Up*.wav", 0.7),
               ("**/Shaker, Small/Mid_Shaker_Slap*.wav", 1.0), ("**/Shaker, Large/LShaker_Hit*.wav", 0.85)],
    "gong": [("**/Gong 1/gong_p.wav", 0.3), ("**/Gong 1/gong_mf.wav", 0.6), ("**/Gong 1/gong_f.wav", 0.8),
             ("**/Gong 1/gong_2_f.wav", 0.8), ("**/Gong 1/gong_fff.wav", 1.0)],
    "bassdrum": [(f"**/Bass Drum 1/BDrumNew_hit_v{v}_rr*_Sum.wav", vv) for v, vv in ((2, 0.3), (3, 0.5), (5, 0.75), (7, 1.0))],
    "anvil": [(f"**/Anvil/Anvil_Hit{h}_v{v}*.wav", vv) for h in (1, 2, 3) for v, vv in ((1, 0.4), (2, 0.7), (3, 1.0))],
    "clash": [("**/Clash Cymbals 1/cymbal_crash1_mp*.wav", 0.45), ("**/Clash Cymbals 1/cymbal_crash1_mf*.wav", 0.7),
              ("**/Clash Cymbals 1/cymbal_crash1_ff*.wav", 1.0)],
}
PERC_MAX_S = {"gong": 8.0, "clash": 5.0, "bassdrum": 3.0, "anvil": 2.0, "tambshake": 1.2, "cowbell": 1.2, "cowbell2": 1.2}


def build_perc(index: dict):
    out = {}
    for piece, spec in PERC.items():
        hits = []
        for g, vel in spec:
            files = sorted(glob.glob(os.path.join(VCSL, g), recursive=True))
            if not files:
                print(f"  ! perc {piece}: no files for {g}")
            for fp in files:
                x = decode(fp)
                if x.shape[0] == 1:
                    x = np.vstack([x, x])
                t0 = transient_start(x, -30)
                y, on = trim(x, t0, PERC_MAX_S.get(piece, 1.0), pre_ms=1.0, fade_ms=200)
                k = len(hits)
                rel = write(f"perc/{piece}/{k:02d}.wav", y)
                hits.append({"f": rel, "vel": vel, "on": on, "src": os.path.relpath(fp, SAMPLES), "rms": rms_db(y, int(0.1 * SR)),
                             "peak": peak_db(y)})
        if hits:
            out[piece] = {"source": "VCSL", "hits": hits}
            print(f"  perc {piece:9s} {len(hits)} hits")
    index["perc"] = out


# =========================================================================== PIANO (Salamander Grand V3)
SAL_LAYERS = [2, 4, 6, 8, 10, 12, 14, 16]              # of 16; enough dynamics for a band mix
SAL_VEL_HI = {1: 26, 2: 34, 3: 36, 4: 43, 5: 46, 6: 50, 7: 56, 8: 64, 9: 72, 10: 80, 11: 88, 12: 96, 13: 104, 14: 112,
              15: 120, 16: 127}
NOTE_RX = re.compile(r"^([A-G]#?)(\d)v(\d+)\.(ogg|wav|flac)$")
PC = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def build_piano(index: dict):
    d = next(iter(glob.glob(os.path.join(SAMPLES, "SalamanderGrandPiano*", "**", "A4v8.*"), recursive=True)), None)
    if d is None:
        raise FileNotFoundError("Salamander Grand Piano not found under tools/music/samples/")
    d = os.path.dirname(d)
    notes = []
    for f in sorted(os.listdir(d)):
        m = NOTE_RX.match(f)
        if not m:
            continue
        name, octv, layer = m.group(1), int(m.group(2)), int(m.group(3))
        if layer not in SAL_LAYERS:
            continue
        midi = 12 * (octv + 1) + PC[name]
        notes.append((midi, layer, os.path.join(d, f)))
    out = []
    for midi, layer, fp in sorted(notes):
        x = decode(fp)
        t0 = transient_start(x, -40)
        max_s = float(np.interp(midi, [21, 48, 72, 96, 108], [9.0, 7.0, 5.0, 3.0, 2.0]))
        y, on = trim(x, t0, max_s, pre_ms=2.0, fade_ms=400, floor_db=-60)
        rel = write(f"piano/{midi:03d}_v{layer:02d}.wav", y)
        out.append({"f": rel, "midi": midi, "layer": layer, "vel": SAL_VEL_HI[layer] / 127.0, "on": on,
                    "rms": rms_db(y, int(0.2 * SR))})
    index["piano"] = {"source": "Salamander Grand Piano V3 (Yamaha C5)", "notes": out}
    print(f"  piano: {len(out)} samples ({len({o['midi'] for o in out})} keys x {len(SAL_LAYERS)} layers)")


# =========================================================================== CAB IRs
CAB_IRS = {
    # name: glob under samples/cab_ir
    "g12h75_sm57": "**/Science 4x12 G12H-75 SM57 Brighter.wav",
    "g12h75_sm57_dark": "**/Science 4x12 G12H-75 SM57 Darker.wav",
    "g12h75_md421": "**/Science 4x12 G12H-75 MD 421-U Brighter.wav",
    "g12h75_n22": "**/Science 4x12 G12H-75 N22 Brighter.wav",
    "v30_sm57": "**/Science 4x12 V30 SM57 Brighter.wav",
    "v30_sm57_dark": "**/Science 4x12 V30 SM57 Darker.wav",
    "v30_md421": "**/Science 4x12 V30 MD 421-U Brighter.wav",
    "v30_n22": "**/Science 4x12 V30 N22 Brighter.wav",
    "g12h150_sm57": "**/Science 4x12 G12H-150 SM57 Brighter.wav",
    "g12h150_md421": "**/Science 4x12 G12H-150 MD 421-U Brighter.wav",
}


def build_cab(index: dict):
    out = {}
    for name, g in CAB_IRS.items():
        files = sorted(glob.glob(os.path.join(SAMPLES, "cab_ir", g), recursive=True))
        if not files:
            print(f"  ! cab {name}: not found ({g})")
            continue
        x = decode(files[0]).mean(axis=0)
        t0 = max(0, int(np.argmax(np.abs(x))) - 48)
        x = x[t0: t0 + 8192]          # 170 ms: the cab + close-mic room; everything later is noise
        f = int(0.03 * SR)
        x[-f:] *= np.linspace(1, 0, f) ** 2
        # normalise to unit gain in the 300 Hz - 3 kHz band (so swapping IRs keeps the amp level)
        H = np.abs(np.fft.rfft(x, 16384))
        fr = np.fft.rfftfreq(16384, 1 / SR)
        band = (fr > 300) & (fr < 3000)
        x /= math.sqrt(np.mean(H[band] ** 2))
        rel = write(f"cab/{name}.wav", np.stack([x, x]) * 0.25)
        out[name] = {"f": rel, "gain": 4.0, "src": os.path.relpath(files[0], SAMPLES)}
    index["cab"] = out
    print(f"  cab: {len(out)} IRs")


# =========================================================================== SHOUTS (Freesound CC0 / CC-BY)
FS = os.path.join(SAMPLES, "freesound")
# (freesound id, approximate onset seconds or None = whole file, max length s, kind 'group'|'solo')
# Onsets come from the envelope/formant survey (see SAMPLES.md): e.g. 764268 is a group chanting
# "HUP two three four" - the HUP syllables are the /ʌ/ (F1~690, F2~1250 Hz) peaks every ~1.73 s.
# (freesound id, start s, max length s, "group"|"solo"[, "f" = a woman's voice]). Iteration 8 (the "demonic HEY"
# playtest note): dropped the processed / reverberant / growled takes (698872 "Hey huge", 416507 stadium chant,
# 86212 "BRRRRR-HEY", 368824 screaming with a breaking voice, 179326 a long scream, 345431 a drawn-out "heyyy", and
# Mafon2's double "hey-hey"s; every kept take transcribes as a single "Hey!" with Whisper); added a bright CC0 group of
# guys (jukkis111, 3 takes), women's HEYs (AmeAngelofSin, Legnalegna55) and vikuserro's "Ey!". SampledGangShouts uses
# one take per performer per hit.
SHOUT_TAKES = {
    "HEY": [
        (527740, 0.0, 0.7, "group"), (57204, 0.0, 0.8, "group"), (653386, 0.37, 1.0, "group"),
        (45603, 0.0, 0.5, "group"), (45604, 0.0, 0.5, "group"), (45605, 0.0, 0.45, "group"),
        (545949, 0.17, 0.6, "solo"), (546512, 0.97, 0.6, "solo"), (246304, 0.08, 0.5, "solo"),
        (362665, 6.35, 0.5, "solo", "f"), (362665, 8.58, 0.55, "solo", "f"), (537816, 0.0, 0.5, "solo", "f"),
    ] + [(634720, t, 0.42, "solo") for t in (1.295, 3.33, 5.745, 7.13, 9.795, 10.07, 11.31, 12.8, 13.53, 15.83, 20.40,
                                              24.545, 26.925, 28.10, 28.585, 31.295, 34.485, 44.29)],   # clean single HEYs
    # the marching squad only (a double-tracked gang of real men); the two solo HUPs were chesty / boomy (iteration 8)
    "HUP": [(764268, t - 0.2, 0.46, "group") for t in (1.195, 2.985, 4.655, 6.375, 8.115, 9.890, 11.525)],
    "HO": [(160769, t - 0.02, 0.5, "solo") for t in (0.295, 1.0, 2.195, 2.915, 4.715, 9.265, 14.41, 16.73, 21.475,
                                                      23.57, 25.095, 28.54)],
    "HA": [(623441, 0.29, 0.5, "solo"), (209187, 0.0, 0.45, "solo"), (160769, 22.28, 0.5, "solo"),
           (160769, 17.74, 0.5, "solo"), (368824, 0.0, 0.45, "solo")],
    "YEAH": [(99636, 0.0, 1.5, "group"), (340363, 0.0, 1.4, "solo"), (440035, 0.62, 1.2, "solo"),
             (621374, 1.84, 1.6, "group")],
    "WHOA": [(543778, t - 0.02, 1.0, "solo") for t in (0.0, 1.515, 3.075, 5.005, 6.6, 8.385, 10.315, 11.915, 15.545)]
            + [(621374, 1.84, 1.8, "group")],
}


def build_shouts(index: dict):
    man = json.load(open(os.path.join(FS, "manifest.json")))
    out = {}
    decoded = {}
    for word, takes in SHOUT_TAKES.items():
        lst = []
        for sid, t, max_s, kind, *tag in takes:
            if sid not in decoded:
                fp = os.path.join(FS, f"{sid}.mp3")
                if not os.path.exists(fp):
                    print(f"  ! shout source {sid} missing")
                    decoded[sid] = None
                    continue
                x = decode(fp)
                decoded[sid] = np.vstack([x, x]) if x.shape[0] == 1 else x[:2]
            x = decoded[sid]
            if x is None:
                continue
            # never run into the next take of the same file (fast "hey hey hey" runs)
            nxt = [tk[1] for tk in takes if tk[0] == sid and tk[1] > t + 0.05]
            if nxt:
                max_s = min(max_s, min(nxt) - t - 0.03)
            a = max(0, int(t * SR))
            seg = x[:, a: a + int((max_s + 0.1) * SR)]
            # start = quietest point before the main peak (skips the tail of a previous word), then the first
            # sample within 30 dB of the peak after it (keeps the breathy /h/)
            e = env_db(np.abs(seg).max(axis=0), win_ms=5)
            pk = int(np.argmax(e[: int(min(0.35, max_s) * SR)]))
            lo = int(np.argmin(e[:pk + 1])) if pk > 0 else 0
            after = np.nonzero(e[lo:pk + 1] > e[pk] - 30)[0]
            t0 = lo + (int(after[0]) if len(after) else 0)
            y, on = trim(seg, t0, max_s - (t0 / SR), pre_ms=10.0, fade_ms=80, floor_db=-45)
            y = y - y.mean(axis=1, keepdims=True)
            y /= np.max(np.abs(y)) + 1e-9
            y *= 0.9
            o50 = on50(y, search_s=min(0.25, y.shape[1] / SR))
            rel = write(f"shouts/{word}/{kind}_{sid}_{len(lst):02d}.wav", y)
            lst.append({"f": rel, "kind": kind, "on": on, "on50": o50, "len": y.shape[1] / SR, "id": sid,
                        "license": man.get(str(sid), {}).get("license"), "author": man.get(str(sid), {}).get("user"),
                        **({"voice": "f"} if "f" in tag else {})})
        out[word] = lst
        print(f"  shouts {word:5s} {sum(e['kind'] == 'group' for e in lst)} group + {sum(e['kind'] == 'solo' for e in lst)} solo takes")
    index["shouts"] = out


# --------------------------------------------------------------------------- CLI
BUILDERS = {"perc": build_perc, "piano": build_piano, "cab": build_cab, "shouts": build_shouts, "kit": build_kit}


def main(argv):
    force = "--force" in argv
    want = [a for a in argv if not a.startswith("--")] or list(BUILDERS)
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, "index.json")
    index = json.load(open(p)) if os.path.exists(p) else {}
    for name in want:
        if name in index and not force:
            print(f"{name}: cached (use --force to rebuild)")
            continue
        print(f"{name}: building")
        try:
            BUILDERS[name](index)
        except FileNotFoundError as e:
            print(f"  skipped: {e}")
            continue
        with open(p, "w") as f:
            json.dump(index, f, indent=1)
    sz = sum(os.path.getsize(f) for f in glob.glob(os.path.join(CACHE, "**", "*.wav"), recursive=True))
    print(f"cache: {CACHE} ({sz / 1e6:.0f} MB)")


if __name__ == "__main__":
    main(sys.argv[1:])
