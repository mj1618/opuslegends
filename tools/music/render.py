#!/usr/bin/env python3
"""Render a score file to master + stems + beatmap.json + analysis.

usage:
  python3 tools/music/render.py tools/music/songs/palette_demo.py            # -> assets/audio/palette_demo.*
  python3 tools/music/render.py SONG.py --name foo --out assets/audio --no-stems --no-encode

A score file defines `build() -> producer.score.Score` and may define `MASTER = {...}`
(kwargs for Mixer.master: target_lufs, ceiling_db, glue, master_eq, clip_db).

Outputs
  <out>/<name>.ogg, <out>/<name>.mp3            encoded master (Vorbis q6 / LAME V2)
  <out>/<name>.beatmap.json                      beat map (schema: tools/music/README.md)
  <out>/stems/<name>/<stem>.ogg                  stems (sum == pre-master mix)
  tools/music/build/<name>/*.wav                 float WAV master/premaster/stems (gitignored)
  tools/music/reports/<name>.analysis.json|.png  mix analysis + spectrogram
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

import numpy as np  # noqa: E402
from scipy import signal  # noqa: E402
from scipy.io import wavfile  # noqa: E402

from producer import analyze, beatmap  # noqa: E402
from producer.mix import Mixer  # noqa: E402


def load_song(path):
    spec = importlib.util.spec_from_file_location("song_module", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def write_wav(path, x, sr):
    wavfile.write(path, sr, np.ascontiguousarray(x.T.astype(np.float32)))


def encode(wav, out, fmt):
    if fmt == "ogg":
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "6", out]
    elif fmt == "mp3":
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libmp3lame", "-q:a", "2", out]
    else:
        raise ValueError(fmt)
    subprocess.run(cmd, check=True)


def decode(path, sr):
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(sr), "-"],
                       capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).reshape(-1, 2).T


def measure_offset(ref, dec, sr, seconds=6.0):
    """Lag (samples) of decoded file vs. master; + = decoded audio is late."""
    n = int(seconds * sr)
    a = ref.mean(axis=0)[:n]
    b = dec.mean(axis=0)[:n]
    c = signal.correlate(b, a, mode="full", method="fft")
    lag = int(np.argmax(c)) - (len(a) - 1)
    return lag


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("song")
    ap.add_argument("--name")
    ap.add_argument("--out", default=os.path.join(ROOT, "assets", "audio"))
    ap.add_argument("--no-stems", action="store_true")
    ap.add_argument("--no-encode", action="store_true")
    ap.add_argument("--no-analysis", action="store_true")
    args = ap.parse_args()

    t0 = time.time()
    mod = load_song(args.song)
    score = mod.build()
    name = args.name or score.id
    sr = score.sr
    build_dir = os.path.join(HERE, "build", name)
    rep_dir = os.path.join(HERE, "reports")
    os.makedirs(build_dir, exist_ok=True)
    os.makedirs(rep_dir, exist_ok=True)
    os.makedirs(args.out, exist_ok=True)
    print(f"render {name}: {score.length_bars} bars @ {score.bpm} BPM, {score.n_samples / sr:.1f}s, {len(score.tracks)} tracks")

    mixer = Mixer(score, keep_tracks=not args.no_analysis)
    stems = mixer.render()
    premaster = sum(stems.values())
    master = mixer.master(stems, **getattr(mod, "MASTER", {}))
    print(f"  mixed in {time.time() - t0:.1f}s; master stats {json.dumps({k: round(v, 2) if isinstance(v, float) else v for k, v in mixer.stats['master'].items()})}")

    wav = os.path.join(build_dir, f"{name}.wav")
    write_wav(wav, master, sr)
    write_wav(os.path.join(build_dir, f"{name}_premaster.wav"), premaster, sr)
    for k, v in stems.items():
        write_wav(os.path.join(build_dir, f"stem_{k}.wav"), v, sr)

    files = {}
    rel = lambda p: os.path.relpath(p, ROOT)
    if not args.no_encode:
        for fmt in ("ogg", "mp3"):
            outp = os.path.join(args.out, f"{name}.{fmt}")
            encode(wav, outp, fmt)
            dec = decode(outp, sr)
            lag = measure_offset(master, dec, sr)
            files[fmt] = {"path": rel(outp), "audioOffset": round(score.pre_roll + lag / sr, 6),
                          "decoderLagSamples": lag, "bytes": os.path.getsize(outp)}
            print(f"  {fmt}: {os.path.getsize(outp) / 1024:.0f} KB, ffmpeg-decoded lag {lag} samples")
        if not args.no_stems:
            sd = os.path.join(args.out, "stems", name)
            os.makedirs(sd, exist_ok=True)
            for k in stems:
                encode(os.path.join(build_dir, f"stem_{k}.wav"), os.path.join(sd, f"{k}.ogg"), "ogg")
            files["stems"] = {k: rel(os.path.join(sd, f"{k}.ogg")) for k in stems}

    ml = mixer.stats["master"]
    bm = beatmap.build(score, files=files, loudness={"integratedLufs": round(ml["final_lufs"], 2),
                                                    "truePeakDb": round(ml["true_peak_db"], 2)},
                       source=rel(os.path.abspath(args.song)))
    bm_path = os.path.join(args.out, f"{name}.beatmap.json")
    beatmap.write(bm_path, bm)
    print(f"  beatmap: {rel(bm_path)}  lanes: " + ", ".join(f"{k}={v['count']}" for k, v in bm["laneInfo"].items()))

    if not args.no_analysis:
        lane_align = analyze.isolated_lane_alignment(score)
        rep = analyze.analyze(master, sr, stems, bm, master_wav_path=wav,
                              png_path=os.path.join(rep_dir, f"{name}.spectrogram.png"), premaster=premaster,
                              lane_align=lane_align, tracks=mixer.tracks)
        rep["mixer"] = mixer.stats
        with open(os.path.join(rep_dir, f"{name}.analysis.json"), "w") as f:
            json.dump(rep, f, indent=1, default=float)
        analyze.print_report(rep)
    print(f"done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
