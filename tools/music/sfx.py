#!/usr/bin/env python3
"""Render the game's one-shots (theme-neutral set) with the SAME voices the song uses, in the song's key.

    python3 tools/music/sfx.py [--song tools/music/songs/jim.py] [--out assets/audio/sfx]

Writes mono Vorbis files + manifest.json. Every entry has:
  id, file, category, desc, durationSec, onsetSec (where the perceptual attack is, i.e. 50 % of the envelope peak:
  schedule the file at beatTime - onsetSec to land on a beat), peakDb, loudnessLufs (max momentary, 400 ms),
  mixGainDb (suggested playback gain against the song master at -14 LUFS), and midi/note/degree for pitched sounds.
Pitched sets follow the song's key (E mixolydian, root E = MIDI 40): degree = scale index (0 = E), octave from note.
Voices/drums/piano/guitar come from the song's palette (sampled when the cache exists; --synth for all-synth).
Theme (70s grindhouse pool hustler): pool balls + THE BREAK SHOT, cue whooshes, jukebox vibes/pinball chimes,
audience, projector/film, Big Jim, one big gong (the drop).
Loops ('loop': true) are exactly periodic: play them with loop=true and no crossfade.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

import numpy as np  # noqa: E402
from scipy import signal  # noqa: E402
from scipy.io import wavfile  # noqa: E402

from producer import dsp, loudness  # noqa: E402
from producer.score import Resolved  # noqa: E402
from instruments.palette import Palette  # noqa: E402
from instruments.vocals import GangShouts, Crowd  # noqa: E402
from instruments import fx  # noqa: E402

SR = 48000
BPM = 164.0
SPB = 60.0 / BPM
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
E_MIXO = [0, 2, 4, 5, 7, 9, 10]


def nn(m):
    m = int(round(m))
    return f"{NAMES[m % 12]}{m // 12 - 1}"


def degree(m):
    rel = (int(round(m)) - 40) % 12
    return E_MIXO.index(rel) if rel in E_MIXO else None


def ev(pitch=None, piece=None, dur_beats=1.0, vel=0.9, at=0.05, **params):
    """one event at `at` seconds into the render buffer (shouts need ~0.25 s of pre-roll room)"""
    d = dur_beats * SPB
    return Resolved(0.0, 0.0, 0.0, int(at * SR), d, int(d * SR), pitch, vel, piece, params, SPB)


def render(inst, events, seconds, seed=1):
    n = int(seconds * SR)
    y = inst.render(events, n, SR, np.random.default_rng(seed), None)
    y = y.mean(axis=0) if y.ndim == 2 else y
    return y


def finish(y, fade_ms=15.0, lead_ms=2.0, floor_db=-60.0, loop=False):
    """trim leading silence (keep lead_ms), trim tail below floor, fade out, normalise peak to -1 dBFS.
    y: mono (n,) or stereo (2, n). loop=True: untouched apart from the gain."""
    if loop:
        return y / (np.max(np.abs(y)) + 1e-12) * 10 ** (-1 / 20)
    a = np.abs(y) if y.ndim == 1 else np.max(np.abs(y), axis=0)
    pk = a.max() + 1e-12
    thr = pk * 10 ** (floor_db / 20)
    nz = np.nonzero(a > thr)[0]
    s0 = max(0, int(nz[0]) - int(lead_ms * 1e-3 * SR))
    env = dsp.onepole_lp(a, 30, SR)
    tail = np.nonzero(env > thr)[0]
    s1 = min(y.shape[-1], int(tail[-1]) + int(0.02 * SR))
    y = y[..., s0:s1].copy()
    f = min(y.shape[-1] // 4, int(fade_ms * 1e-3 * SR))
    if f > 1:
        y[..., -f:] *= np.linspace(1, 0, f) ** 2
    y = y / (np.max(np.abs(y)) + 1e-12) * 10 ** (-1 / 20)
    return y


def onset_sec(y, frac=0.5):
    y = y if y.ndim == 1 else y.mean(axis=0)
    env = np.abs(signal.hilbert(y))
    env = np.convolve(env, np.ones(24) / 24, mode="same")
    head = env[: min(len(env), int(0.25 * SR))]
    return float(np.nonzero(head >= frac * head.max())[0][0]) / SR


def peak_near(y, f0, lo=0.85, hi=1.15):
    """strongest spectral peak within [lo, hi] * f0 (early part of the sound)"""
    y = y if y.ndim == 1 else y.mean(axis=0)
    a = int(np.argmax(np.abs(y) > 0.05 * np.max(np.abs(y))))
    seg = y[a + int(0.005 * SR): a + int(0.3 * SR)]
    seg = seg * np.hanning(len(seg))
    n = 1 << 19
    S = np.abs(np.fft.rfft(seg, n))
    f = np.fft.rfftfreq(n, 1 / SR)
    sel = (f > f0 * lo) & (f < f0 * hi)
    return float(f[sel][np.argmax(S[sel])])


def momentary_max(y):
    """max momentary (400 ms) loudness of a one-shot (mono = centred source)"""
    st = np.stack([y, y]) * math.sqrt(0.5) if y.ndim == 1 else y
    if st.shape[1] < int(0.45 * SR):
        st = np.pad(st, ((0, 0), (0, int(0.45 * SR) - st.shape[1])))
    return float(np.max(loudness.momentary_lufs(st, SR)))


class Writer:
    def __init__(self, out, q=4):
        self.out = out
        self.q = q
        self.items = []
        os.makedirs(out, exist_ok=True)

    def add(self, sid, y, category, desc, target_lufs, stereo=False, loop=False, **meta):
        if not stereo and y.ndim == 2:
            y = y.mean(axis=0)
        y = finish(y, loop=loop, **meta.pop("_finish", {}))
        wav = os.path.join(HERE, "build", "sfx", f"{sid}.wav")
        os.makedirs(os.path.dirname(wav), exist_ok=True)
        wavfile.write(wav, SR, np.ascontiguousarray(y.T).astype(np.float32))
        path = os.path.join(self.out, f"{sid}.ogg")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "2" if stereo else "1", "-c:a",
                        "libvorbis", "-q:a", str(self.q), path], check=True)
        L = momentary_max(y)
        item = {"id": sid, "file": os.path.relpath(path, ROOT), "category": category, "desc": desc,
                "channels": 2 if stereo else 1, **({"loop": True} if loop else {}),
                "durationSec": round(y.shape[-1] / SR, 3), "onsetSec": round(onset_sec(y), 4),
                "peakDb": -1.0, "loudnessLufs": round(L, 1), "mixGainDb": round(target_lufs - L, 1),
                "bytes": os.path.getsize(path), **meta}
        if "midi" in item:
            item["note"] = nn(item["midi"])
            d = degree(item["midi"])
            if d is not None:
                item["degree"] = d
        self.items.append(item)
        return item


def riff_pitches(song_path):
    spec = importlib.util.spec_from_file_location("song_module", song_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    sc = mod.build()
    ps = set()
    for name, tr in sc.tracks.items():
        if tr.lane == "riff":
            for e in tr.events:
                ps.add(int(round(float(np.atleast_1d(e.pitch)[0]))))
    return sorted(ps), sc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--song", default=os.path.join(HERE, "songs", "jim.py"))
    ap.add_argument("--out", default=os.path.join(ROOT, "assets", "audio", "sfx"))
    ap.add_argument("--q", type=int, default=3)
    ap.add_argument("--synth", action="store_true", help="all-synth voices (default: sampled where the song is)")
    args = ap.parse_args()
    W = Writer(args.out, args.q)
    rp, sc = riff_pitches(args.song)
    P = Palette(use_samples=not args.synth)
    sd = P.sampled("drums")
    R = lambda k: np.random.default_rng(k)

    # ------------------------------------------------------------------ voices (same shouts as the song)
    for i, (stretch, seed) in enumerate([(1.0, 11), (0.95, 23), (1.08, 37)]):
        g = P.shouts(voices=2, sampled=dict(group_layers=0, pitch_spread=0.4, spread=0.15),
                     synth=dict(high_voices=0, spread=0.2))
        y = render(g, [ev(piece="HEY", vel=1.0, voices=2, stretch=stretch, at=0.3)], 1.0, seed)
        W.add(f"hey_{i + 1}", y, "voice", f"hero HEY! variant {i + 1} (strike / on-beat action); vowel lands at onsetSec",
              -17.0)
    g = P.shouts(voices=10)
    W.add("hey_crowd", render(g, [ev(piece="HEY", vel=1.0, voices=10, at=0.3)], 1.1, 5), "voice",
          "audience HEY! layer (doubles the hero HEY when the crowd meter is high)", -18.0, stereo=True)
    for i, (stretch, seed) in enumerate([(1.0, 41), (0.93, 53)]):
        g = P.shouts(voices=3, sampled=dict(group_layers=1, pitch_spread=0.5, spread=0.3),
                     synth=dict(high_voices=1, spread=0.25))
        W.add(f"hup_{i + 1}", render(g, [ev(piece="HUP", vel=1.0, voices=3, stretch=stretch, at=0.3)], 0.8, seed),
              "voice", f"HUP! variant {i + 1} (the short syllables of HUP-HUP-HEY)", -18.0)
    g = GangShouts(voices=18, high_voices=6, spread=0.9)
    W.add("crowd_ooh", render(g, [ev(piece="OOH", vel=1.0, voices=18)], 1.6, 21), "crowd",
          "audience 'OOOH' (death): falls in pitch", -19.0, stereo=True)
    W.add("crowd_roar_loop", fx.crowd_roar_loop(4 * SR, SR, R(7)), "crowd", "audience roar bed, 4 s seamless loop "
          "(scale with the crowd meter)", -24.0, stereo=True, loop=True)
    cheer = Crowd().voice(ev(piece="cheer", dur_beats=2.6 / SPB, vel=1.0), SR, R(8))
    cheer = cheer * np.clip(np.arange(cheer.shape[1]) / (1.1 * SR), 0.15, 1.0)
    W.add("crowd_cheer_swell", cheer, "crowd", "audience cheer swell (rises over ~1 s)", -18.0, stereo=True,
          _finish={"fade_ms": 400.0})
    for tier, (dur, lv) in enumerate(((1.6, 0.6), (2.4, 0.8), (3.2, 1.0)), 1):
        cr = Crowd(people=10 + 12 * tier).voice(ev(piece="cheer", dur_beats=dur / SPB, vel=lv), SR, R(50 + tier))
        cr = cr * np.clip(np.arange(cr.shape[1]) / (0.5 * dur * SR), 0.2, 1.0)
        W.add(f"crowd_swell_{tier}", cr, "crowd", f"audience cheer swell, tier {tier} of 3 (crowd meter)",
              -24.0 + 3 * tier, stereo=True, _finish={"fade_ms": 300.0})
    W.add("crowd_applause", fx.applause(1.0, SR, R(9), dur=3.5), "crowd", "big applause (3.5 s)", -20.0, stereo=True,
          _finish={"fade_ms": 400.0})
    W.add("popcorn", fx.popcorn(1.0, SR, R(22)), "crowd", "popcorn pops (audience flavour)", -26.0)

    # ------------------------------------------------------------------ player
    kit = P.kit()
    cb0 = 470.8 if sd else 545.0 * 1.0     # fundamental of the (sampled VCSL | synth) cowbell at tune 1
    for nm, midi in (("tonk_lo", 71), ("tonk_hi", 76)):
        target = 440 * 2 ** ((midi - 69) / 12)
        tune = target / cb0
        for _ in range(4):      # sampled takes differ in pitch: calibrate the tune on the actual render
            y = render(P.kit(), [ev(piece="cowbell", vel=0.85, tune=tune)], 0.8, 3)
            got = peak_near(y, target)
            tune *= target / got
        W.add(nm, y, "hop", f"hop cowbell tonk ({nn(midi)}), the song's cowbell; alternate lo/hi; LOW in the mix",
              -26.0, midi=midi)
    for nm, midi in (("tok_lo", 76), ("tok_hi", 83)):
        W.add(nm, fx.woodblock(0.9, SR, R(20 + midi), 440 * 2 ** ((midi - 69) / 12)), "hop",
              f"hop woodblock 'tok' ({nn(midi)}); alternate lo/hi; LOW in the mix", -26.0, midi=midi)
    lg = P.lead_guitar(voicing="crunch", gain=0.75)
    for m in [p for p in range(57, 77) if (p - 40) % 12 in E_MIXO]:
        y = render(lg, [ev(pitch=float(m), dur_beats=3.2 / SPB, vel=0.85, slide=-2, slide_time=0.2, vib=0.3,
                           vib_rate=4.6, vib_delay=0.45)], 3.6, 7)
        W.add(f"slide_{nn(m).replace('#', 's')}", y, "sustain",
              "slide-guitar held note (slides in from a tone below); 3.2 s, no loop: fade it out on release and "
              "play slide_release", -21.0, midi=m, _finish={"fade_ms": 120.0})
    W.add("slide_release", fx.scrape(0.9, SR, R(9)), "sustain", "pick-scrape 'zzip' on release", -22.0)
    W.add("cue_whoosh_short", fx.whoosh(1.0, SR, R(13), dur=0.22), "player", "pool-cue swing whoosh, short", -20.0)
    W.add("cue_whoosh_long", fx.whoosh(1.0, SR, R(14), dur=0.55), "player", "pool-cue swing whoosh, long", -20.0)
    wt = np.zeros(int(0.45 * SR))
    w = fx.whoosh(0.8, SR, R(23), dur=0.2)
    wt[: len(w)] += w
    th = fx.wood(1.0, SR, R(24), "thock")
    k = int(0.19 * SR)
    wt[k:k + len(th)] += th[: len(wt) - k]
    W.add("cue_whoosh_thwack", wt, "player", "cue swing into a wooden thwack (the hit lands 0.19 s in)", -18.0)
    for m in [p for p in range(76, 89) if (p - 40) % 12 in E_MIXO]:
        W.add(f"chime_{nn(m).replace('#', 's')}", fx.bell_voice("pinball", float(m), 0.9, SR, R(m)), "pitched",
              "pinball/jukebox bell 'ding' per scale degree (Perfect / pickup accents)", -22.0, midi=m)
    for m in rp:
        W.add(f"riffbell_{nn(m).replace('#', 's')}", fx.bell_voice("vibes", float(m), 0.85, SR, R(m + 100)), "riff",
              "call/response riff note = the song's jukebox-vibes 'bell' track voice; one per riff-lane pitch; the "
              "player plays these in the response bars", -20.0, midi=m)
    pno = P.piano(synth=dict(bright=1.1))
    for m in [p for p in range(64, 89) if (p - 40) % 12 in E_MIXO]:
        y = render(pno, [ev(pitch=float(m), dur_beats=0.9, vel=0.75)], 1.4, m)
        W.add(f"piano_{nn(m).replace('#', 's')}", y, "pitched", "honky-tonk piano ladder note (pickups climb the "
              "current chord); the song's piano", -22.0, midi=m, _finish={"fade_ms": 60.0})

    # ------------------------------------------------------------------ world
    y = render(kit, [ev(piece="bassdrum" if sd else "floortom", vel=1.0)], 2.0, 60)
    W.add("slot_boom", y, "world", "stomp-break BOOM (concert bass drum); the song keeps a ghost of it on the slots",
          -15.0, stereo=True, _finish={"fade_ms": 200.0})
    y = render(kit, [ev(piece="anvil" if sd else "ridebell", vel=1.0)], 1.5, 61)
    W.add("slot_clang", y, "world", "stomp-break CLANG (anvil); ghosted in the song", -16.0, stereo=True,
          _finish={"fade_ms": 200.0})
    if sd:
        y = render(kit, [ev(piece="gong", vel=1.0, tune=1.035)], 6.0, 62)
    else:
        y = fx.gong(1.0, SR, R(1), "big")
    W.add("gong_big", y, "world", "the one big gong (the song hits it on the drop, bar 73)", -16.0, stereo=True,
          _finish={"fade_ms": 400.0})
    W.add("bench_thunk", fx.wood(1.0, SR, R(5), "thunk"), "world", "bench see-saw thunk", -18.0)
    W.add("bench_creak", fx.creak(0.9, SR, R(27)), "world", "bench see-saw creak", -22.0)
    W.add("rim_clack", fx.clack(0.9, SR, R(4), hard=False), "world", "dry wooden rim clack, one beat before a slam", -24.0)
    W.add("press_slam", fx.slam(1.0, SR, R(28)), "world", "heavy press slam (after rim_clack)", -14.0)
    wind = np.zeros(int(0.42 * SR))
    snap = fx.film_snap(0.7, SR, R(29))
    wind[: len(snap)] += 0.6 * snap
    hy = render(GangShouts(voices=1, high_voices=0, spread=0.0), [ev(piece="HUP", vel=1.0, voices=1, stretch=1.25)], 0.4, 30)
    hy = np.interp(np.arange(0, len(hy), 0.94), np.arange(len(hy)), hy)       # rising ~1 semitone
    k = int(0.12 * SR)
    wind[k:k + len(hy)] += hy[: len(wind) - k]
    W.add("enforcer_windup", wind, "world", "enforcer wind-up: lapel snap + rising 'hup' (one beat before the jab)", -18.0)
    W.add("jab_clack", fx.clack(1.0, SR, R(31), True), "world", "enforcer jab clack (cue on cue)", -18.0)
    W.add("unison_clack", fx.clack(1.0, SR, R(32), True), "world", "unison CLACK (your strike meets its echo)", -16.0)
    W.add("steam_burst", fx.steam(1.0, SR, R(33)), "world", "steam burst", -20.0)
    W.add("krak", fx.krak(1.0, SR, R(12)), "impact", "generic big KRAK impact (crack + debris)", -14.0)
    W.add("slowmo_whoosh", fx.slowmo_whoosh(1.0, SR, R(34)), "world", "slow-mo whoosh (after the break shot)", -20.0)

    # ------------------------------------------------------------------ pool
    for i in range(3):
        W.add(f"ball_clack_{i + 1}", fx.ball_clack(1.0, SR, R(70 + i)), "pool", f"pool-ball clack, variant {i + 1}", -20.0)
    W.add("ball_pocket", fx.ball_pocket(1.0, SR, R(73)), "pool", "ball drops into a pocket", -20.0)
    W.add("break_shot", fx.break_shot(1.0, SR, R(16)), "impact", "THE BREAK SHOT: cue-tip crack + the rack exploding + "
          "thump. The player's hit into the total silence on bar 72 beat 4 (the drop's trigger); the rack hit lands "
          "25 ms after the tip (see onsetSec)", -13.0)

    # ------------------------------------------------------------------ film (grindhouse theatre)
    W.add("projector_loop", fx.projector_loop(2 * SR, SR, R(10)), "film", "16 mm projector clatter, 24 fps, 2 s "
          "seamless loop", -28.0, loop=True)
    W.add("leader_beep", fx.leader_beep(0.8, SR, R(35)), "film", "countdown-leader beep (1 kHz, one 24 fps frame)",
          -24.0, midi=83)
    W.add("burn_flare", fx.burn_flare(1.0, SR, R(36)), "film", "cigarette-burn flare (changeover dot)", -22.0)
    W.add("frame_slip", fx.frame_slip(1.0, SR, R(37)), "film", "frame-slip roll (bar 81)", -18.0)
    W.add("film_burn", fx.film_burn(1.0, SR, R(12)), "film", "film burning in the gate (sizzle + pops)", -22.0)
    W.add("burn_sizzle_loop", fx.burn_loop(2 * SR, SR, R(38)), "film", "burn sizzle, 2 s seamless loop", -26.0, loop=True)
    W.add("rewind_chatter", fx.rewind(1.0, SR, R(39)), "film", "rewind chatter (respawn)", -20.0)
    W.add("iris_slam", fx.iris_slam(1.0, SR, R(40)), "film", "iris slam (the final iris-out)", -15.0)
    W.add("film_snap", fx.film_snap(1.0, SR, R(41)), "film", "film snap (breaks), then film_flap_loop", -18.0)
    W.add("film_flap", fx.film_flap(1.0, SR, R(11)), "film", "film end flapping on the reel, slowing down", -22.0)
    W.add("film_flap_loop", fx.flap_loop(SR, SR, R(42)), "film", "film end flap-flap, 1 s seamless loop (18 flaps)",
          -24.0, loop=True)
    W.add("theatre_ambience_loop", fx.theatre_ambience(8 * SR, SR, R(44)), "ambience", "cold-open cinema ambience: "
          "audience murmur + far projector, 8 s seamless loop", -28.0, stereo=True, loop=True)

    # ------------------------------------------------------------------ Big Jim
    W.add("bigjim_roar", fx.bluff_roar(1.0, SR, R(17)), "bigjim", "Big Jim's bluff roar (bark + long falling roar)", -16.0)
    W.add("bigjim_fist_slam", fx.fist_slam(1.0, SR, R(18)), "bigjim", "Big Jim's fist slams the table (balls jump)", -14.0)
    W.add("bigjim_lens_crack", fx.lens_crack(1.0, SR, R(43)), "bigjim", "Big Jim cracks the lens (glass crack + tinkle)",
          -16.0)

    man = {"schema": "opuslegends.sfx/1", "generator": "tools/music/sfx.py", "song": sc.id, "bpm": BPM,
           "key": {"root": 40, "name": "E", "scale": E_MIXO, "scaleName": "mixolydian"}, "sampleRate": SR,
           "palette": "sampled" if not args.synth else "synth",
           "notes": "Vorbis q3, peak -1 dBFS. mixGainDb = suggested gain vs the song master (-14 LUFS). onsetSec = "
                    "time from file start to the perceptual attack: to land ON a beat, start the file onsetSec early. "
                    "Loops are exactly periodic. Theme: 70s grindhouse pool hustler.",
           "sounds": W.items}
    with open(os.path.join(args.out, "manifest.json"), "w") as f:
        json.dump(man, f, indent=1)
        f.write("\n")
    tot = sum(i["bytes"] for i in W.items)
    print(f"{len(W.items)} one-shots, {tot / 1024:.0f} KB -> {os.path.relpath(args.out, ROOT)}/manifest.json")
    for i in W.items:
        print(f"  {i['id']:22s} {i['durationSec']:5.2f}s onset {i['onsetSec'] * 1000:5.1f} ms  {i['loudnessLufs']:6.1f} LUFS  "
              f"gain {i['mixGainDb']:+5.1f}  {i['bytes'] / 1024:5.1f} KB  {i.get('note', '')}")


if __name__ == "__main__":
    main()
