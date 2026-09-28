"""The TOKEN VOICE lanes (iteration 6): what a collected token sings, measured against the record.

Castle Rock's lums play the tune. Our tokens sing the vocal melody two octaves up in a honky-tonk-piano/bell voice, but
the singer is speech-like: a note the transcription calls A3 is often sung 30-60 cents flat (a blue bend), and a
fixed-pitch bell doubling a note the singer is bending sounds out of tune. So every melody note is MEASURED against the
record (pYIN on the isolated vocal stem) and gets a mode:

  double    the singer sits within AGREE_CENTS of the transcribed note (in the band's own tuning): the token doubles
            it, two octaves up
  measured  the singer sits within AGREE_CENTS of a DIFFERENT semitone (<= 2 away): the record wins, the token doubles
            what is actually sung
  harmony   the singer is between semitones (a bend), the pitch can't be measured (a spoken syllable, the gang in a
            chorus) or the note is out of the vocal's range: the token plays a CHORD TONE a third (else a sixth /
            fourth / fifth) above the melody note instead, so it follows the tune's contour and can't clash

Choruses repeat the same canonical melody, so their measurements are POOLED across the four choruses (the choruses
get nearly the same token part: a memorable line, not four different ones; a scoop at one instance's attack still
turns that instance to harmony). The outro's tag hook (every 2 bars) is added from the canonical chorus notes and
pooled among the outro repeats (sung higher there). Between phrases the game plays chord tones (audio/tokenMelody.ts).

`piano_lane`: the record's own piano hits (onsets in the demucs piano stem): the bar pianist goon plays these.
No lyrics anywhere: pitch and timing only.
"""
from __future__ import annotations

import os

import numpy as np

from .timegrid import TimeGrid

#: the token voice sounds this many semitones above the sung note (E3-D4 -> E5-D6: above the vocal's formants)
TOKEN_OCTAVE = 24
#: a doubled note must sit within this many cents of the singer (in the band's tuning); wider = a bend -> harmony
AGREE_CENTS = 35.0
#: a doubled note's attack (the first 0.3 beat) may scoop from at most this far (cents)
ATTACK_CENTS = 60.0
#: token register (MIDI): notes above are dropped an octave
REG_LO, REG_HI = 72, 93
#: song bars where the four choruses start (transcription)
CHORUS_BARS = (23, 52, 81, 98)
#: the outro's tag hook: its B lands on these song bars (pickup two beats earlier)
OUTRO_TAG_BARS = (108, 110, 112, 114, 116)


def vocal_pitch(vocals, sr, cache=None):
    """pYIN on the vocal stem: (frame file-times, MIDI float with NaN where unvoiced). Cached in `cache` (npz)."""
    if cache and os.path.exists(cache):
        d = np.load(cache)
        return d["ft"], d["midi"]
    import librosa
    y = librosa.resample(vocals, orig_sr=sr, target_sr=16000)
    f0, _, _ = librosa.pyin(y, fmin=70, fmax=700, sr=16000, frame_length=1024, hop_length=160)
    ft = librosa.times_like(f0, sr=16000, hop_length=160)
    midi = 12 * np.log2(np.where(np.isfinite(f0), f0, np.nan) / 440.0) + 69
    if cache:
        np.savez(cache, ft=ft, midi=midi)
    return ft, midi


def band_tuning(bass_lane):
    """the band's tuning (cents vs A440): median pitchCents of the bass notes"""
    c = [e["pitchCents"] for e in bass_lane if "pitchCents" in e]
    return float(np.median(c)) if c else 0.0


def outro_tag_notes(TR):
    """the tag hook (chorus relBeats 30..36) repeated in the outro, in song beats"""
    out = []
    for bar in OUTRO_TAG_BARS:
        c0 = (bar - 1) * 4 - 32                   # relBeat 32 (the B) lands on the bar's downbeat
        for n in TR["melody"]["chorusCanonical"]["notes"]:
            if n["relBeat"] >= 30:
                out.append({"beat": c0 + n["relBeat"], "pitch": n["midi"], "durBeats": n["dur"], "section": "outro",
                            "rel": n["relBeat"]})
    return out


def _measure(midi, fbeat, b0, dur):
    """(voiced pitch frames (MIDI float) of the note's middle or None, voiced fraction)"""
    pad = 0.15 * dur if dur >= 0.4 else 0.05
    sel = (fbeat >= b0 + pad) & (fbeat < b0 + dur - pad)
    if not sel.any():
        return None, 0.0
    m = midi[sel]
    v = np.isfinite(m)
    if v.sum() < 3:
        return None, float(v.mean())
    return m[v], float(v.mean())


def _chord_at(harm, beat):
    cur = harm[0]
    for h in harm:
        if h["beat"] <= beat + 1e-6:
            cur = h
        else:
            break
    return cur


#: E mixolydian pitch classes (the key; the blue notes G and A# are only doubled where the transcription has them)
SCALE_PCS = {4, 6, 8, 9, 11, 1, 2}


def harmony_note(p, harm, beat, root=40, sung=None, prev=None):
    """the chord tone NEAREST the melody note `p` (+ TOKEN_OCTAVE) that is at least a minor third from it (and >= 2.4
    semitones from what the singer actually sings, `sung`: MIDI floats, his note and his attack): small steps keep the token line on the tune's
    contour, and >= ~3 semitones from the singer means his bends (+-50 cents) can't rub against it. Ties go to the
    note nearer the previous token (`prev`: voice leading), then to the one above."""
    tones = _chord_at(harm, beat)["tones"]
    pcs = {(root + t) % 12 for t in tones}
    base = p + TOKEN_OCTAVE
    ref = prev if prev is not None else base
    best = None
    for c in range(base - 11, base + 12):
        if c % 12 not in pcs or abs(c - base) < 3 or any(abs(c - (x + TOKEN_OCTAVE)) < 2.4 for x in (sung or [])):
            continue
        score = abs(c - base) + 0.35 * abs(c - ref) - (0.1 if c > base else 0)
        if best is None or score < best[0]:
            best = (score, c)
    c = best[1] if best else base
    while c > REG_HI:
        c -= 12
    while c < REG_LO:
        c += 12
    return int(c)


def token_part(notes, ft, midi, G: TimeGrid, harm, tuning_cents, root=40):
    """Measure each melody note (song beats) against the record and give it a token pitch + mode (see module doc).
    `notes`: dicts with beat, pitch, durBeats, section (+ `rel` for canonical chorus/outro notes)."""
    fbeat = G.file_time_to_beat(ft)
    meas = []
    for n in notes:
        mm, vf = _measure(midi, fbeat, n["beat"], n["durBeats"])
        if mm is not None:
            mm = mm - 12 * np.round((mm - n["pitch"]) / 12)      # pYIN octave slips -> the sung octave
        # the ATTACK (the first 0.3 beat, where the token's bell rings loudest): a scoop from far below rubs there
        sel = (fbeat >= n["beat"]) & (fbeat < n["beat"] + min(0.3, n["durBeats"]))
        att = midi[sel][np.isfinite(midi[sel])]
        att = att - 12 * np.round((att - n["pitch"]) / 12) if len(att) >= 2 else None
        meas.append((mm, vf, att))
    # pool the canonical chorus notes (+ the outro tags) by their relBeat
    pools = {}
    apools = {}
    for n, (mm, vf, att) in zip(notes, meas):
        key = _canon_key(n)
        if key is not None and mm is not None and vf >= 0.4:
            pools.setdefault(key, []).append(mm)
            if att is not None:
                apools.setdefault(key, []).append(att)
    out = []
    prev = None
    for n, (mm, vf, att) in zip(notes, meas):
        key = _canon_key(n)
        frames = np.concatenate(pools[key]) if key is not None and key in pools else (mm if mm is not None and vf >= 0.4 else None)
        # the attack check uses THIS instance where it was measured (a scoop is a performance detail), else the pool
        afr = att if att is not None and len(att) >= 2 else (np.concatenate(apools[key]) if key is not None and key in apools else None)
        p = int(n["pitch"])
        mode, pitch, med, off = "harmony", None, None, None
        if frames is not None and len(frames) >= 3:
            med = float(np.median(frames))
            tuned = med - tuning_cents / 100.0              # in the band's tuning
            near = int(round(tuned))
            off = abs(tuned - near) * 100
            # ... and he spends most of the note there (a scoop into it is fine, a glide through it isn't)
            held = float(np.mean(np.abs(frames - tuning_cents / 100.0 - near) <= 0.5))
            # (a measured note that isn't the transcribed one must be in the key: a bell on a sung blue note rings wrong)
            # ... and his attack isn't a scoop from more than ATTACK_CENTS away (the bell rings loudest there)
            a_ok = afr is None or len(afr) < 2 or abs(float(np.median(afr)) - tuning_cents / 100.0 - near) * 100 <= ATTACK_CENTS
            if off <= AGREE_CENTS and held >= 0.5 and a_ok and (near == p or (abs(near - p) <= 2 and near % 12 in SCALE_PCS)):
                mode, pitch = ("double" if near == p else "measured"), near + TOKEN_OCTAVE
        if pitch is None:
            sung = [x - tuning_cents / 100.0 for x in (med, float(np.median(afr)) if afr is not None and len(afr) >= 2 else None)
                    if x is not None and abs(x - p) <= 6]
            pitch = harmony_note(p, harm, n["beat"], root, sung, prev)
        while pitch > REG_HI:
            pitch -= 12
        prev = pitch
        ev = G.ev(n["beat"], endBeat=round(n["beat"] + n["durBeats"], 4), durBeats=n["durBeats"], pitch=int(pitch),
                  sung=p, mode=mode, section=n.get("section"))
        if med is not None:
            ev["measured"] = round(med, 2)
            ev["cents"] = round(off) if off is not None else None
        out.append(ev)
    return out


def _canon_key(n):
    sec = n.get("section") or ""
    if "rel" in n:                                  # the outro's tag repeats: pooled among themselves (sung higher)
        return ("o", round(float(n["rel"]), 2))
    if sec.startswith("chorus"):
        ci = int(sec[6:]) - 1
        return ("c", round(n["beat"] - (CHORUS_BARS[ci] - 1) * 4, 2))
    return None


def phrase_stats(part):
    """per-section agreement: note count, fraction doubled (double + measured), harmony"""
    st = {}
    for e in part:
        s = st.setdefault(e.get("section") or "?", {"notes": 0, "double": 0, "measured": 0, "harmony": 0})
        s["notes"] += 1
        s[e["mode"]] += 1
    for s in st.values():
        s["doubledFrac"] = round((s["double"] + s["measured"]) / max(1, s["notes"]), 2)
    return st


def piano_lane(piano, sr, G: TimeGrid, floor_db=20.0):
    """the record's piano hits: onsets in the demucs piano stem within `floor_db` of its loud moments.
    vel 0..1 (level), pos = on | and | trip (lanes._pos_label)."""
    import librosa
    from .lanes import _pos_label
    hop = 256
    oenv = librosa.onset.onset_strength(y=piano, sr=sr, hop_length=hop)
    on = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop, units="samples")
    rms = librosa.feature.rms(y=piano, frame_length=2048, hop_length=hop)[0]
    db = 20 * np.log10(rms + 1e-9)
    ref = float(np.percentile(db, 99))
    out = []
    for s in on:
        fr = int(s // hop)
        lvl = float(db[min(fr + 4, len(db) - 1)])
        if lvl < ref - floor_db:
            continue
        b = float(G.file_time_to_beat(s / sr))
        if b < 0:
            continue
        pos = _pos_label(b - np.floor(b))
        out.append(G.ev(b, vel=round(float(np.clip(1 + (lvl - ref) / floor_db, 0.05, 1.0)), 2), **({"pos": pos} if pos else {})))
    return out
