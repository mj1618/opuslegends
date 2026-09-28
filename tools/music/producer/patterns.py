"""Idiomatic stomp-boogie figures as helpers (all return the next free beat).

Pitches are MIDI numbers or note names; `root` = chord root on the low strings (e.g. 'E2').
"""
from __future__ import annotations

from .dsp import note


def power(root, fifth=True, octave=True):
    r = note(root)
    out = [r]
    if fifth:
        out.append(r + 7)
    if octave:
        out.append(r + 12)
    return out


def boogie_guitar(tr, start, root, bars=1, pm=True, accent_first=True, sixth_only=False, vel=0.8):
    """Chuck-Berry/boogie dyads in 8ths: 5-5-6-6-(b7-b7)-6-6 on the low strings."""
    r = note(root)
    shape = [7, 7, 9, 9, 7, 7, 9, 9] if sixth_only else [7, 7, 9, 9, 10, 10, 9, 9]
    b = start
    for bar in range(bars):
        for i, iv in enumerate(shape):
            acc = accent_first and i == 0
            tr.note(b, [r, r + iv], 0.5, vel + (0.15 if acc else 0.0), pm=(pm and not acc), accent=acc)
            b += 0.5
    return b


def pump_bass(tr, start, root, beats=4, vel=0.8, accent_every=4, octave_pop=False):
    """Straight pumping 8ths (hard-rock), optional octave pop on the 'and' of 4."""
    r = note(root)
    b = start
    for i in range(int(beats * 2)):
        p = r + 12 if (octave_pop and i == beats * 2 - 1) else r
        tr.note(b, p, 0.5, vel + (0.1 if i % accent_every == 0 else 0.0))
        b += 0.5
    return b


def walking_boogie(tr, start, root, bars=1, vel=0.8, pitch_offset=0):
    """Boogie-woogie walking line: 1 3 5 6 b7 6 5 3 in 8ths."""
    r = note(root) + pitch_offset
    b = start
    for _ in range(bars):
        for iv in [0, 4, 7, 9, 10, 9, 7, 4]:
            tr.note(b, r + iv, 0.5, vel)
            b += 0.5
    return b


def piano_boogie_lh(tr, start, root, bars=1, vel=0.7):
    """Left-hand boogie in octaves (root + octave doubling of the walking line)."""
    r = note(root)
    b = start
    for _ in range(bars):
        for iv in [0, 4, 7, 9, 10, 9, 7, 4]:
            tr.note(b, [r + iv, r + iv + 12], 0.45, vel)
            b += 0.5
    return b


def piano_tremolo(tr, start, low, high, beats=2.0, rate=1 / 3, vel=0.75):
    """Jerry-Lee-style right-hand tremolo between two chord shapes (lists of pitches).
    rate in beats per stroke: 1/3 = 8th triplets (shuffle), 0.25 = 16ths (straight songs)."""
    b = start
    i = 0
    while b < start + beats - 1e-9:
        shape = low if i % 2 == 0 else high
        tr.note(b, shape, rate * 0.9, vel * (1.0 if i % 4 == 0 else 0.85))
        b += rate
        i += 1
    return b


def piano_gliss(tr, start, lo, hi, beats=1.0, vel=0.7, white_only=True, down=False):
    """Glissando across white keys between two pitches over `beats`."""
    whites = {0, 2, 4, 5, 7, 9, 11}
    lo_n, hi_n = int(note(lo)), int(note(hi))
    keys = [p for p in range(lo_n, hi_n + 1) if (p % 12 in whites) or not white_only]
    if down:
        keys = keys[::-1]
    step = beats / len(keys)
    for i, p in enumerate(keys):
        tr.note(start + i * step, p, step * 1.5, vel * (0.75 + 0.25 * i / len(keys)), straight=True)
    return start + beats


def triplet_run(tr, start, pitches, vel=0.75, beat_div=3):
    """Pitches in 8th-note triplets (or other beat divisions)."""
    step = 1.0 / beat_div
    for i, p in enumerate(pitches):
        tr.note(start + i * step, p, step * 0.95, vel)
    return start + len(pitches) * step
