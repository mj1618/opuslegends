"""JIM (stomp arrangement) v1 -- our own instrumental hard-rock stomp-boogie take on "You Don't Mess Around with Jim".

164 BPM, E, triplet shuffle (swing ratio 0.67). 97 bars: pickup bar 0 + bars 1-96 (DESIGN.md §7), then a ring-out tail.
Melody material comes from jim_transcription.json (notes only; there are NO lyrics anywhere in this repo).
Deviations from §7 and the gameplay grid are documented in jim_arrangement_notes.md.

    0 pickup | 1-8 intro | 9-24 verse 1 | 25-32 chorus 1 | 33-48 verse 2 (cave, slide + call/response)
    | 49-56 chorus 2 | 57-64 stomp break | 65-72 build | 73-88 final chorus x2 | 89-92 outro gauntlet
    | 93-94 breath | 95-96 finale (final hit on 96 b3)

Stems (buses route into them): base (drums, bass, guitars, keys, fx), lead, shouts, bonus.

Render:  python3 tools/music/render.py tools/music/songs/jim.py
"""
from __future__ import annotations

import json
import math
import os

from producer.score import Score, parse_flags
from producer.dsp import note as N
from producer.patterns import walking_boogie, piano_tremolo, piano_gliss, triplet_run

from instruments.bass import Bass
from instruments.keys import Organ
from instruments.vocals import Crowd
from instruments.fx import Bell, SfxKit
from instruments.palette import Palette

HERE = os.path.dirname(os.path.abspath(__file__))
MASTER = dict(target_lufs=-14.0, ceiling_db=-1.0, glue=dict(thresh=-14.0, ratio=1.6),
              master_eq=[("peak", 2100, 0.8, -1.0)])
MASTER_STEMS = ("base", "lead", "shouts")   # the in-game default mix; 'bonus' is the BIG CATCH add-on layer
STEMS_AT_MASTER_LEVEL = True                # stems carry the master gain: base+lead+shouts == master (no soft clip)
ENCODE = {"ogg": 5, "mp3": 4, "stems": 4}   # Vorbis q5 ~160 kbps, LAME V4 ~165 kbps, stems q4 ~128 kbps
MELODY_TRACKS = ["lead", "lead_harm", "piano"]
END_FADE_S = 1.6                            # the final chord + gong ring ~5.5 s, faded over the last 1.6 s

# ---------------------------------------------------------------------------------------------------------------
# INSTRUMENT PALETTE: the only place that decides which voice plays each part. Drums, piano, guitar cabs and gang
# shouts are SAMPLED (instruments/palette.py; falls back to synth if the sample cache is missing).
# JIM_SAMPLES=0 renders the all-synth palette.
USE_SAMPLES = os.environ.get("JIM_SAMPLES", "1") != "0"
P = Palette(use_samples=USE_SAMPLES)
# cowbell in key (B4): the sampled VCSL cowbell sits at ~471 Hz, the synth one at 545 Hz
COWBELL = {"tune": 1.049 if P.sampled("drums") else 0.906}


def palette():
    return {
        "kit": P.kit,                                      # drums + stomp (synth) + cowbell + claps (+ gong, perc)
        "bass": lambda **kw: Bass(**kw),
        "gtr": P.rhythm_guitar,                            # fuzz rhythm guitar (double-tracked, real cab IRs)
        "lead": P.lead_guitar,                             # lead / harmony / slide guitars
        "piano": P.piano,                                  # honky-tonk (sampled grand + chorus)
        "organ": lambda **kw: Organ(**kw),
        "shouts": P.shouts,                                # real group + solo shouts
        "crowd": lambda **kw: Crowd(**kw),
        "bell": lambda kind="vibes", **kw: Bell(kind, **kw),        # call/response riff: jukebox vibes (synth)
        "sfx": lambda **kw: SfxKit(**kw),                  # riser, roar, synth gong fallback
    }

E_MIXO = [0, 2, 4, 5, 7, 9, 10]
KEY = {"root": 40, "name": "E", "scale": E_MIXO, "scaleName": "mixolydian", "blueNotes": [3, 6],
       "note": "E mixolydian; the melody bends the blue 3rd (G) and uses A# as a passing note"}
SCALE_OF = {"E": [0, 2, 4, 5, 7, 9, 10], "A": [5, 7, 9, 10, 0, 2, 3], "B": [7, 9, 11, 0, 2, 4, 5]}


def B(bar, beat=1.0):
    """absolute beat of (song bar, 1-based beat in bar)"""
    return bar * 4 + beat - 1


def pos(bar, beat):
    """1-based beat in bar with transcription fractions: .33 -> triplet 1/3 (exact), .67 / .5 -> the
    swung 'and' (notated .5, performed at .67 by the score swing), .25/.75 = 16ths."""
    b = float(beat)
    whole = math.floor(b + 1e-6)
    fr = b - whole
    for want, f in ((0.0, 0.0), (0.25, 0.25), (0.33, 1 / 3), (0.5, 0.5), (0.67, 0.5), (0.75, 0.75), (1.0, 1.0)):
        if abs(fr - want) < 0.03:
            fr = f
            break
    return bar * 4 + (whole - 1) + fr


def mel(bar, spec, tr=0):
    """'beat:PITCH:dur[/flags] ...' -> [(abs beat, midi, dur, params)]; beats may exceed 4 (next bar)."""
    out = []
    for tok in spec.split():
        main, _, fl = tok.partition("/")
        b, p, d = main.split(":")
        out.append((pos(bar, b), N(p) + tr, float(d), parse_flags(fl)))
    return out


def shift(notes, beats=0.0, semis=0):
    return [(b + beats, p + semis, d, dict(pr)) for b, p, d, pr in notes]


TR = json.load(open(os.path.join(HERE, "jim_transcription.json")))


def chorus_notes(tail=False, pickup=True):
    """Canonical chorus melody (relBeat 0 = C1 beat 1), an octave up (vocal E3-D4 -> E4-D5), shaped for the lead.
    C5 beat 2 gets a lead fill (stop-time), phrase ends are held longer. tail=True adds the tag pickup."""
    out = []
    for n in TR["melody"]["chorusCanonical"]["notes"]:
        r, m, d, c = n["relBeat"], n["midi"] + 12, n["dur"], n.get("comment", "")
        if r < 0 and not pickup:
            continue
        if r >= 30 and not tail:
            continue
        if r >= 32:
            continue
        w = math.floor(r + 1e-6)
        fr = r - w
        f = 1 / 3 if abs(fr - 0.33) < 0.03 else (0.5 if abs(fr - 0.67) < 0.03 else 0.0)
        pr = {}
        if "scoop" in c:
            pr.update(slide=-2 if m % 12 != 11 else -1, slide_time=0.06)
        elif "slide down" in c:
            pr.update(slide=3, slide_time=0.09)
        elif "bend up" in c:
            pr.update(slide=-1, slide_time=0.05)
        elif "fall from" in c:
            pr.update(slide=3, slide_time=0.05)
        if r in (4.0, 12.0):
            d = 1.6                                 # hold the line tails (stabs come on beat 3)
        if r == 16.0:
            d = 0.9                                 # make room for the stop-time fill on C5 beat 2
        if r == 29.0:
            d = 0.9
        out.append((w + f, m, d, pr))
    # C5 beat 2 (silence): lead fill, E blues triplet run down into the A on beat 3
    out += [(17.0, N("E5"), 0.3, {}), (17 + 1 / 3, N("D5"), 0.3, {}), (17 + 2 / 3, N("B4"), 0.3, {})]
    return sorted(out, key=lambda x: x[0])


TAG = "3:G4:.67 3.67:A4:.33 4:A4:.67 4.67:A#4:.33 5:B4:1/slide=-2,slide_time=0.06 6:A4:.67 6.67:G4:.33 7:A4:.67 " \
      "7.67:G4:.33 8:G4:.67 8.67:E4:1.4/vib"       # pickup on beat 3 of bar X, tag in bar X+1


def verse_notes(verse, lo, hi, bar_shift, tr=12):
    """Transcribed verse melody (notes only), orig song bars/beats -> ours; lo/hi = (bar, beatInBar) bounds."""
    out = []
    for ph in TR["melody"]["verses"][verse]["phrases"]:
        for n in ph:
            k = (n["bar"], round(n["beatInBar"], 2))
            if lo <= k < hi:
                out.append((pos(n["bar"] + bar_shift, n["beatInBar"]), n["midi"] + tr, n["dur"], {}))
    out.sort(key=lambda x: x[0])
    # sung line -> guitar: legato up to the next note inside a phrase (gap <= 1.2 beats), never overlapping
    res = []
    for i, (b, p, d, pr) in enumerate(out):
        nxt = out[i + 1][0] if i + 1 < len(out) else b + d
        gap = nxt - b
        res.append((b, p, gap * 0.95 if gap <= 1.2 else max(d, 0.5), pr))
    return res


def build() -> Score:
    s = Score("jim", "JIM (stomp arrangement)", bpm=164, key="E2", scale="mixolydian", swing_ratio=0.67,
              pre_roll=0.25, tail=5.2, artist="OpusLegends synth band (arr. of J. Croce)")

    sec = lambda name, bars, label, energy: s.section(name, bars, label, energy, key=KEY)
    sec("pickup", 1, "Pickup: cowbell + stomp count-in, HEY on 4", 0.3)
    sec("intro", 8, "Intro: riff + stomp (1-4), full band + tag teaser (5-8)", 0.55)
    sec("verse1a", 8, "Verse 1a: piano melody over the riff", 0.6)
    sec("verse1b", 8, "Verse 1b: stomp on every beat, lead melody", 0.7)
    sec("chorus1", 8, "Chorus 1", 0.85)
    sec("verse2a", 8, "Verse 2a: sea cave, slide-guitar held notes", 0.45)
    sec("verse2b", 8, "Verse 2b: stalactite call/response", 0.6)
    sec("chorus2", 8, "Chorus 2 (cave)", 0.9)
    sec("stompbreak", 8, "Stomp break (player slots)", 0.7)
    sec("build", 8, "Build: tom roll doubling, riff climbs, silence on 72 b3-4", 0.85)
    sec("final1", 8, "Final chorus A: THE DROP (Arch Falls), drum fill 79-80", 1.0)
    sec("final2", 8, "Final chorus B: biggest crash (whale), Big Jim wakes", 1.0)
    sec("outro", 4, "Outro gauntlet: double time", 1.0)
    sec("breath", 2, "Breath: stomp + piano", 0.35)
    sec("finale", 2, "Finale: hits, final hit on 96 b3", 1.0)

    # ------------------------------------------------------------------ buses (processing) -> stems
    s.bus("drums", stem="base", parallel=dict(thresh=-30, ratio=8, attack_ms=1.0, release_ms=70, knee=4, makeup=10, mix=0.35),
          comp=dict(thresh=-14, ratio=2.5, attack_ms=8, release_ms=90))
    s.bus("bass", stem="base")
    s.bus("guitars", stem="base", comp=dict(thresh=-18, ratio=2, attack_ms=15, release_ms=120))
    s.bus("keys", stem="base", comp=dict(thresh=-20, ratio=2, attack_ms=10, release_ms=120))
    s.bus("fx", stem="base")
    s.bus("lead", stem="lead", comp=dict(thresh=-20, ratio=2, attack_ms=10, release_ms=120))
    s.bus("shouts", stem="shouts", comp=dict(thresh=-18, ratio=2, attack_ms=5, release_ms=100))
    s.bus("bonus", stem="bonus")

    # ------------------------------------------------------------------ tracks
    I = palette()
    sd = P.sampled("drums")    # the sampled kit is darker: no top-shelf cut (see README, sampled palette demo)
    kit = s.track("drums", I["kit"](levels={"cowbell": 0.36, "hat": 0.34, "openhat": 0.24, "floortom": 0.6}),
                  bus="drums", gameplay=True, lufs=-17, sends={"room": 0.32, "plate": 0.04},
                  eq=[("ls", 55, 0.7, -2.5)] + ([] if sd else [("hs", 11000, 0.7, -4)]), humanize={"vel": 0.05})
    cave = s.track("drums_cave", I["kit"](levels={"cowbell": 0.3, "hat": 0.3, "floortom": 0.75}), bus="drums",
                   gameplay=True, lufs=-19, sends={"room": 0.2, "hall": 0.3},
                   eq=[] if sd else [("hs", 10000, 0.7, -5)], humanize={"vel": 0.05})
    bass = s.track("bass", I["bass"](drive=0.6), bus="bass", gameplay=True, lane="bass", lufs=-19,
                   eq=[("peak", 130, 0.9, 3), ("peak", 1000, 1.0, -3), ("lp", 3000)],
                   comp=dict(thresh=-20, ratio=4, attack_ms=6, release_ms=70))
    gtr = s.track("gtr", I["gtr"](voicing="fuzz", gain=1.0, spread=0.9, presence=0.5), bus="guitars",
                  gameplay=True, accent_lane="gtrRiff", lufs=-16.5,
                  eq=[("hp", 75), ("peak", 140, 1.0, 1.5), ("peak", 320, 1.0, -3), ("peak", 1800, 0.9, 2.0),
                      ("peak", 3000, 1.0, 1.5), ("lp", 9500)],
                  sends={"room": 0.08})
    pcomp = s.track("piano_comp", I["piano"](), bus="keys", humanize={"timing_ms": 4, "vel": 0.08}, lufs=-23,
                    eq=[("hp", 90), ("peak", 250, 1.0, -2)], sends={"plate": 0.1})
    org = s.track("organ", I["organ"](drawbars="888600000", drive=0.6), bus="keys", humanize={"timing_ms": 3}, lufs=-26,
                  eq=[("hp", 120)], sends={"hall": 0.1})
    ghost = s.track("bell_ghost", I["bell"](), bus="fx", gameplay=True, lane="riff", lufs=-39.5,
                    sends={"hall": 0.25})
    slotg = s.track("slot_ghost", I["kit"](), bus="fx", lufs=-30, sends={"room": 0.25})   # BOOM / CLANG ghosts
    risers = s.track("risers", I["sfx"](), bus="fx", lufs=-26, sends={"hall": 0.2})
    gongs = s.track("gongs", I["sfx"](), bus="fx", lufs=-21, sends={"hall": 0.25})

    lead = s.track("lead", I["lead"](gain=1.0), bus="lead", gameplay=True, lane="melody", lufs=-18.5, pan=0.08,
                   comp=dict(thresh=-22, ratio=3, attack_ms=10, release_ms=100),
                   eq=[("hp", 160), ("peak", 1300, 1.0, 1.0), ("peak", 2600, 1.2, -2.5), ("hs", 6000, 0.7, -2)],
                   sends={"delay": 0.14, "plate": 0.18})
    harm = s.track("lead_harm", I["lead"](gain=0.95), bus="lead", lufs=-21, pan=-0.3,
                   comp=dict(thresh=-22, ratio=3, attack_ms=10, release_ms=100),
                   eq=[("hp", 200), ("peak", 3200, 1.0, -2)], sends={"delay": 0.12, "plate": 0.2})
    pno = s.track("piano", I["piano"](synth=dict(bright=1.1)), bus="lead", gameplay=True, lane="piano", lufs=-20.5,
                  humanize={"vel": 0.06}, eq=[("hp", 150), ("peak", 3000, 1.0, 1.0)], sends={"plate": 0.14})
    slide = s.track("slide", I["lead"](voicing="crunch", gain=0.75), bus="lead", gameplay=True, lane="sustains",
                    lufs=-19, pan=-0.12, eq=[("hp", 180), ("peak", 2200, 1.0, 1.5)],
                    sends={"plate": 0.25, "hall": 0.2, "delay": 0.1})
    bell = s.track("bell", I["bell"](), bus="lead", gameplay=True, lane="riff", lufs=-21.5, pan=0.1,
                   sends={"hall": 0.25, "delay": 0.08})

    hey = s.track("shouts", I["shouts"](voices=10), bus="shouts", gameplay=True, lufs=-19.5,
                  sends={"room": 0.3, "hall": 0.2})
    hey_cave = s.track("shouts_cave", I["shouts"](voices=12), bus="shouts", gameplay=True, lufs=-20,
                       sends={"room": 0.2, "hall": 0.45, "arena": 0.15})
    hey_big = s.track("shouts_big", I["shouts"](voices=14, synth=dict(high_voices=3)), bus="shouts", gameplay=True, lufs=-19,
                      sends={"room": 0.25, "hall": 0.2, "arena": 0.2})
    crowd = s.track("crowd", I["crowd"](), bus="shouts", gameplay=True, lufs=-27, sends={"hall": 0.35})

    b_harm = s.track("bonus_harm", I["lead"](gain=0.9), bus="bonus", lufs=-22, pan=-0.45,
                     eq=[("hp", 220), ("peak", 3200, 1.0, -2)], sends={"delay": 0.15, "plate": 0.22})
    b_org = s.track("bonus_organ", I["organ"](drawbars="008808006", drive=0.5), bus="bonus", humanize={"timing_ms": 3},
                    lufs=-27, eq=[("hp", 200)], sends={"hall": 0.15})
    b_pno = s.track("bonus_piano", I["piano"](synth=dict(bright=1.15)), bus="bonus", humanize={"timing_ms": 3, "vel": 0.08},
                    lufs=-26, eq=[("hp", 250)], sends={"plate": 0.15}, pan=0.3)

    s.describe("gtrRiff", "fuzz boogie riff accents (rhythm guitar '>' notes); world: chalk calves off the cliffs")
    s.describe("riff", "Call/response riff notes (jukebox vibes). role=call (bell in the lead stem, bars 41/43/45/47) or response "
                       "(ghost at -18 dB in the base stem: bars 42/44/46/48 answer the call 1 bar earlier; 89-90 = "
                       "outro reprise with noCall). callBeat = the matching call note; pair = call bar")
    s.describe("sustains", "held notes = foam-skim ribbons (slide guitar). beat..endBeat, pitch = MIDI", ends=True)
    s.describe("piano", "honky-tonk piano melody, answers, runs and glisses (lead stem); world: herring leaps")
    s.describe("slots", "stomp-break player slots: the band's big accent is only a ghost in the base stem here. "
                        "sound = boom (oil drum) | clang (bell buoy); chain = boom-boom-CLANG phrase id")
    s.describe("cue", "set-piece cues (name)")
    s.describe("fillAccents", "accents of the 2-bar drum fill (79-80) where the last arches fall")

    # ------------------------------------------------------------------ harmony
    H = {0: "E", **{b: "E" for b in range(1, 16)}, 16: "E7", 17: "A7", 18: "A7", 19: "A7", 20: "A7", 21: "B7",
         22: "A7", 23: "E", 24: "E"}
    CH = ["A7", "E7", "A7", "E7", "A7", "A7", "B7", "E"]
    for c0 in (25, 49, 73, 81):
        for i, c in enumerate(CH):
            H[c0 + i] = c
    for b in range(33, 41):
        H[b] = "E"
    H[40] = "E7"
    H.update({41: "A7", 42: "A7", 43: "A7", 44: "A7", 45: "B7", 46: "B7", 47: "E", 48: "E"})
    for b in range(57, 67):
        H[b] = "E"
    H.update({67: "A7", 68: "A7", 69: "B7", 70: "B7", 71: "B7", 72: "E"})
    for b in range(89, 95):
        H[b] = "E"
    H.update({95: "B7", 96: "E"})
    prev = None
    for b in range(0, 97):
        if H[b] != prev:
            s.chord(B(b), H[b])
            prev = H[b]
    # beat-level labels where the band plays unison power-chord slams (so pitched SFX never clash with them):
    # chorus bar 7 walkdown B-A-G(held)-F#, the finale walkdown, and the pre-chorus walk-ups E E F# G# -> A7
    for c7 in (31, 55, 87, 95):
        for bb, ch in ((1, "B5"), (2, "A5"), (3, "G5")) + (((4, "F#5"),) if c7 == 95 else ()):
            s.chord(B(c7, bb), ch)
        if c7 != 95:
            s.chord(B(c7 + 1), "E")
    for wu in (24, 48):
        s.chord(B(wu, 3), "F#5")
        s.chord(B(wu, 4), "G#5")
    s.chord(B(72, 2), "G#5")
    s.chord(B(79), "B5")      # 79-80 drum fill under hook A: keep SFX on roots/fifths
    s.chord(B(80), "E5")

    def chord_root(beat):
        return H[int(beat // 4)][0]

    def harm3(p, beat):
        """diatonic third above p in the mixolydian scale of the chord at `beat`"""
        sc = SCALE_OF[chord_root(beat)]
        for iv in (3, 4):
            if (p + iv - 40) % 12 in sc:
                return p + iv
        return p + 3

    def play(tr, notes, vel=0.85, auto=True, **extra):
        for b, p, d, pr in notes:
            prm = dict(extra)
            if auto and not any(k in pr for k in ("vib", "bend", "fall")):
                if d >= 0.9:
                    prm.update(vib=0.28, vib_delay=0.12)
                elif (p - 40) % 12 == 3 and d >= 0.5:          # blue 3rd: curl it up a little
                    prm.update(bend=0.35, bend_at=0.03, bend_time=0.12)
            prm.update(pr)
            tr.note(b, p, d, vel * (0.9 if d < 0.34 else 1.0), **prm)

    def play_harm(tr, notes, vel=0.8, oct_=0, **extra):
        play(tr, [(b, harm3(p, b) + oct_, d, pr) for b, p, d, pr in notes], vel, **extra)

    # ------------------------------------------------------------------ figures
    def riff(bar, root="E2", which=0, vel=0.86, pm_all=False, bass_too=True, bvel=0.84):
        """The 'Crabbe riff', 2 bars, built from the song's boogie bass walk (E-E-B-D#-E / E-G#-A-A#-B-D-B).
        Guitar in octaves (accents as power chords), bass an octave under except the low B-D#-E dip (unison)."""
        r = int(N(root))
        b0 = B(bar)
        if which == 0:
            g = [(0, [r, r + 7, r + 12], 0.5, True, False), (0.5, [r, r + 12], 0.5, False, True),
                 (1.0, [r, r + 12], 0.5, False, True), (2.0, [r - 5, r + 7], 0.5, False, False),
                 (2.5, [r - 1, r + 11], 0.5, False, False), (3.0, [r, r + 7, r + 12], 0.5, True, False),
                 (3.5, [r, r + 12], 0.5, False, True)]
            bl = [(0, r - 12, 0.5), (0.5, r - 12, 0.5), (1.0, r - 12, 0.5), (2.0, r - 5, 0.5), (2.5, r - 1, 0.5),
                  (3.0, r, 0.5), (3.5, r - 12, 0.5)]
        else:
            g = [(0, [r, r + 7, r + 12], 0.5, True, False), (0.5, [r + 4, r + 16], 0.5, False, False),
                 (1.0, [r + 5, r + 17], 0.5, False, False), (1.5, [r + 6, r + 18], 0.5, False, False),
                 (2.0, [r + 7, r + 14, r + 19], 1.0, True, False), (3.0, [r + 10, r + 22], 0.5, False, False),
                 (3.5, [r + 7, r + 19], 0.5, False, False)]
            bl = [(0, r - 12, 0.5), (0.5, r - 8, 0.5), (1.0, r - 7, 0.5), (1.5, r - 6, 0.5), (2.0, r - 5, 1.0),
                  (3.0, r - 2, 0.5), (3.5, r - 5, 0.5)]
        for o, ps, d, acc, pm in g:
            gtr.note(b0 + o, ps, d, min(1.0, vel + (0.12 if acc else 0.0)) * (0.85 if pm else 1.0),
                     pm=(pm or (pm_all and not acc)), accent=acc)
        if bass_too:
            for o, p, d in bl:
                bass.note(b0 + o, p, d, bvel + (0.08 if o == 0 else 0.0))

    def boogie(bar, root, beats=4, vel=0.8, pm=True, start_beat=1.0, bass_line=None, bvel=0.8):
        """chuck-boogie dyads 5-5-6-6-b7-b7-6-6 (swung 8ths)"""
        r = int(N(root))
        shape = [7, 7, 9, 9, 10, 10, 9, 9]
        b0 = B(bar, start_beat)
        for i in range(int(beats * 2)):
            acc = i == 0
            gtr.note(b0 + i * 0.5, [r, r + shape[i % 8]], 0.5, vel + (0.12 if acc else 0.0), pm=(pm and not acc),
                     accent=acc)

    def climb_A7(bar, vel=0.9, gt=True, bs=True, lh=True):
        """chorus A7 bar: A . A C# D D# -> E, band unison (the song's bass climb)"""
        b0 = B(bar)
        seq = [(0, 45, 1.0, True), (1.0, 45, 0.5, False), (1.5, 49, 0.5, False), (2.0, 50, 0.5, False),
               (2.5, 51, 0.5, False), (3.0, 52, 1.0, True)]
        for o, p, d, acc in seq:
            if gt:
                ch = [p, p + 7, p + 12] if acc else [p, p + 12]
                gtr.note(b0 + o, ch, d, vel + (0.08 if acc else 0), accent=acc, pm=(o == 1.0))
            if bs:
                bass.note(b0 + o, p - 12, d, 0.85 + (0.08 if acc else 0))
            if lh:
                pcomp.note(b0 + o, [p - 12, p], d * 0.9, 0.62)

    def e7_bar(bar, vel=0.82, stabs=False):
        """chorus E7 bar: guitar boogie, bass E . E G# B . E G (song figure); stabs on 3 + 4 if asked"""
        b0 = B(bar)
        if stabs:
            boogie(bar, "E2", beats=2, vel=vel)
            for o in (2.0, 3.0):
                gtr.note(b0 + o, [40, 47, 50, 56], 0.45, 1.0, accent=True)
                bass.note(b0 + o, 28, 0.45, 0.95)
                pcomp.note(b0 + o, [N("E3"), N("D4"), N("G#4"), N("B4"), N("E5")], 0.4, 0.8)
            bass.seq(b0, "E1:1 E1:0.5 G#1:0.5", vel=0.84)
        else:
            boogie(bar, "E2", beats=4, vel=vel)
            bass.seq(b0, "E1:1 E1:0.5 G#1:0.5 B1:1 E1:0.5 G1:0.5", vel=0.84)

    def pno_shuffle(bar, chord, beats=4, vel=0.55, lh=True, start=1.0):
        """piano comp: LH octave on 1 + 3, RH chord on 2 + 4 and the swung 'and' before them"""
        vo = {"E": (["E4", "G#4", "B4"], "E2"), "E7": (["D4", "G#4", "B4"], "E2"),
              "A7": (["G4", "C#5", "E5"], "A1"), "B7": (["F#4", "A4", "D#5"], "B1")}[chord]
        rh, lo = [N(x) for x in vo[0]], N(vo[1])
        b0 = B(bar, start)
        for k in range(int(beats)):
            if k % 2 == 0 and lh:
                pcomp.note(b0 + k, [lo, lo + 12], 0.9, vel + 0.05)
            else:
                pcomp.note(b0 + k, rh, 0.4, vel)
            pcomp.note(b0 + k + 0.5, rh, 0.3, vel * 0.7)

    def pno_pump(bar, chord, beats=4, vel=0.46):
        """chorus piano: LH boogie octaves, RH chords on every swung 8th"""
        vo = {"E": ["E4", "G#4", "B4", "E5"], "E7": ["D4", "G#4", "B4", "E5"], "A7": ["E4", "G4", "C#5", "E5"],
              "B7": ["D#4", "F#4", "A4", "B4"]}[chord]
        rh = [N(x) for x in vo]
        for i in range(int(beats * 2)):
            pcomp.note(B(bar) + i * 0.5, rh, 0.28, vel * (1.0 if i % 2 == 0 else 0.78))

    def organ_bar(tr, bar, chord, beats=3.9, vel=0.55, high=False):
        v = {"E": ["E3", "G#3", "B3", "E4"], "E7": ["E3", "G#3", "B3", "D4"], "A7": ["E3", "G3", "C#4", "A3"],
             "B7": ["D#3", "F#3", "A3", "B3"]}[chord]
        ps = [N(x) + (12 if high else 0) for x in v]
        tr.note(B(bar), ps, beats, vel)

    def shout(tr, bar, beat, word="HEY", vel=0.95, **x):
        extra = {f"x_{k}": v for k, v in x.items() if k not in ("voices", "stretch")}
        for k in ("voices", "stretch"):
            if k in x:
                extra[k] = x[k]
        tr.hit(B(bar, beat), word, vel, **extra)

    def slam(bar, beat, chord_notes, bass_note, crash=True, vel=1.0, ring=0.6, pno_notes=None):
        b = B(bar, beat)
        kit.hit(b, "kick", vel)
        kit.hit(b, "stomp", vel, gang=3)
        kit.hit(b, "floortom", vel * 0.95)
        if crash:
            kit.hit(b, "crash", vel * 0.95)
        gtr.note(b, chord_notes, ring, vel, accent=True)
        bass.note(b, bass_note, ring, vel * 0.95)
        if pno_notes:
            pcomp.note(b, pno_notes, ring, vel * 0.85)

    # drum grooves ----------------------------------------------------------------------------
    def g_verse(bar, n=1, k=kit, cow=True):
        k.pattern(B(bar), bars=n, steps=8, kick="X...X.o.", snare="..X...X.", floortom="x...x...",
                  stomp="X...X...", params={"cowbell": COWBELL, "stomp": {"gang": 2}},
                  **({"cowbell": "x.o.x.o."} if cow else {}))

    def g_flats(bar, n=1):
        kit.pattern(B(bar), bars=n, steps=8, stomp="X.x.X.x.", kick="X...X...", snare="..X...X.",
                    openhat=".x.x.x.x", cowbell="x.x.x.x.", floortom="o...o...",
                    params={"cowbell": COWBELL, "stomp": {"gang": 2}})

    def g_chorus(bar, n=1, big=False):
        kit.pattern(B(bar), bars=n, steps=8, kick="X..xX...", snare="..X...X.", floortom="x.x.x.x.",
                    stomp="X...X...", cowbell="XoxoXoxo", **({"ride": "x.x.x.x."} if not big else {"openhat": "x.x.x.x."}),
                    hat=".o.o.o.o", params={"cowbell": COWBELL, "stomp": {"gang": 4 if big else 2}})

    def fill(bar, kind="snare"):
        b3 = B(bar, 3)
        if kind == "snare":
            kit.pattern(b3, bars=0.5, steps=12, snare="..oxoX")
        elif kind == "toms":
            kit.pattern(b3, bars=0.5, steps=12, snare="o.o...", tom="..xx..", floortom="....xX")
        elif kind == "big":
            kit.pattern(b3, bars=0.5, steps=12, snare="xoxx..", tom="....x.", floortom=".....X", kick="X.....")

    # ================================================================== PICKUP (bar 0)
    kit.pattern(B(0), steps=4, cowbell="xxxX", stomp="XxX.", params={"cowbell": COWBELL, "stomp": {"gang": 3}})
    kit.hit(B(0, 4), "stomp", 1.0, gang=4)
    shout(hey, 0, 4, "HEY", 1.0, phrase="count")
    s.mark("cue", B(0), name="count_in")

    # ================================================================== INTRO (1-8)
    for i in range(4):                                     # 1-4: riff alone + stomp
        riff(1 + i, "E2", i % 2, vel=0.88, bass_too=False)
        kit.pattern(B(1 + i), steps=8, stomp="X.x.X.x.", params={"stomp": {"gang": 2}})
    kit.pattern(B(4, 3), bars=0.5, steps=12, floortom="x.xx.x", snare="....xX")
    shout(hey, 4, 4, "HEY", 0.95, phrase="intro")
    s.mark("cue", B(5), name="breaker_rises")
    for i in range(4):                                     # 5-8: full band
        bar = 5 + i
        riff(bar, "E2", i % 2, vel=0.86)
        g_chorus(bar, big=False)
        pno_shuffle(bar, "E", vel=0.55)
        organ_bar(b_org, bar, "E", high=True, vel=0.5)
    kit.hit(B(5), "crash", 0.95)
    fill(8, "toms")
    shout(hey, 8, 4, "HEY", 0.95, phrase="intro")
    # tag teaser on the lead (7-8), pickup in 6
    tag = mel(6, TAG)
    play(lead, tag, 0.82)
    play_harm(b_harm, tag, 0.7)
    # piano answer after the tag
    triplet_run(pno, B(8, 2), ["B5", "A5", "G5", "E5", "D5", "B4"], vel=0.7)
    for i in range(4):
        piano_tremolo(b_pno, B(5 + i), ["G#5", "B5"], ["E6"], beats=4, vel=0.45)

    # ================================================================== VERSE 1a (9-16): piano melody, lead answers
    for i in range(8):
        bar = 9 + i
        root = "E2"
        riff(bar, root, i % 2, vel=0.8, pm_all=True, bvel=0.8)
        g_verse(bar)
        pno_shuffle(bar, "E7" if bar == 16 else "E", vel=0.5)
        organ_bar(b_org, bar, "E7" if bar == 16 else "E", vel=0.45)
    fill(12, "snare")
    fill(16, "toms")
    # turnaround stab + HEY on 16 b4
    gtr.note(B(16, 4), [40, 47, 50, 56], 0.5, 1.0, accent=True)
    bass.note(B(16, 4), 28, 0.5, 0.95)
    kit.hit(B(16, 4), "crash", 0.9)
    kit.hit(B(16, 4), "kick", 1.0)
    shout(hey, 16, 4, "HEY", 0.95, phrase="turn")
    v1a = verse_notes("verse1", (5, 0), (12, 3.5), 4)
    play(pno, v1a, 0.64, auto=False)
    play(pno, [(b, p + 12, d, pr) for b, p, d, pr in v1a], 0.42, auto=False)
    play(b_pno, [(b, p + 24, d, pr) for b, p, d, pr in v1a], 0.5, auto=False)
    # lead guitar answers in the melody gaps
    play(lead, mel(10, "3:G4:.5 3.5:A4:.5 4:B4:.5/bend=1,bend_at=0.02 4.5:G4:.5"), 0.6)
    play(lead, mel(12, "2.5:E5:.5 3:D5:.5 3.5:B4:.5 4:A4:.5 4.5:G4:.5/bend=0.5"), 0.6)

    # ================================================================== VERSE 1b (17-24): stomp every beat, lead melody
    v1b_roots = {17: "A2", 18: "A2", 19: "A2", 20: "A2", 21: "B2", 22: "A2", 23: "E2"}
    for bar in range(17, 24):
        r = v1b_roots[bar]
        riff(bar, r, (bar - 17) % 2 if bar < 21 else 0, vel=0.84, bvel=0.84)
        g_flats(bar)
        pno_shuffle(bar, H[bar], vel=0.5)
        organ_bar(b_org, bar, H[bar], vel=0.45)
    # 24: pre-chorus walk-up E E F# G# (band unison quarters) -> A7; stab + HEY on 4
    g_flats(24)
    for k, (p, pb) in enumerate([(40, 28), (40, 28), (42, 30), (44, 32)]):
        gtr.note(B(24, 1 + k), [p, p + 7, p + 12], 0.7, 0.92 + 0.03 * k, accent=True)
        bass.note(B(24, 1 + k), pb, 0.7, 0.9)
        pcomp.note(B(24, 1 + k), [pb + 12, pb + 24], 0.6, 0.6)
    kit.hit(B(24, 4), "crash", 0.9)
    shout(hey, 24, 4, "HEY", 0.95, phrase="turn")
    fill(20, "snare")
    fill(22, "toms")
    kit.hit(B(21), "crash", 0.85)
    v1b = verse_notes("verse1", (12, 3.5), (20, 2.0), 4)
    play(lead, v1b, 0.84)
    play_harm(b_harm, v1b, 0.68)
    # piano answers: run in the 20 gap, gliss into the chorus
    triplet_run(pno, B(20, 2), ["E6", "D6", "B5", "A5", "G5", "E5"], vel=0.66)
    piano_gliss(pno, B(24, 2), "E4", "E6", beats=1.75, vel=0.62)

    # ================================================================== CHORUS (template)
    def chorus(c0, level=1, shouts_tr=hey, voices=10, final_fill=False, end="stop", tag_pickup=False,
               pickup=True):
        """8-bar chorus from bar c0 (C1). level 1 = chorus 1, 2 = chorus 2 (cave, piano doubling, organ),
        3 = final (harmony guitar, crash every downbeat, crowd). final_fill: C7-C8 = 2-bar drum fill."""
        big = level >= 3
        C = lambda i: c0 + i - 1
        vv = 0.95 if level == 1 else 1.0
        # --- band
        for i in (1, 3):
            climb_A7(C(i))
            g_chorus(C(i), big=big)
            pno_pump(C(i), "A7")
        for i in (2, 4):
            e7_bar(C(i), stabs=True)
            g_chorus(C(i), big=big)
            pno_pump(C(i), "E7", beats=2)
            for bb in (3, 4):
                kit.hit(B(C(i), bb), "crash" if bb == 3 else "china" if big else "crash", 0.85)
                if bb == 4:                       # beat 3 already has the groove's kick
                    kit.hit(B(C(i), bb), "kick", 1.0)
                shout(shouts_tr, C(i), bb, "HEY", vv, phrase="stab", voices=voices)
        # C5: stop-time: hit + HEY on 1 and 3, silence on 2 and 4 (lead fills)
        for bb in (1, 3):
            slam(C(5), bb, [45, 52, 55, 61], 33, crash=True, pno_notes=[N("A2"), N("G4"), N("C#5"), N("E5")])
            shout(shouts_tr, C(5), bb, "HEY", vv, phrase="stop", voices=voices)
        keep = ("lead", "lead_harm", "bonus_harm", "shouts")
        s.stop(B(C(5), 1.75), 1.25, keep=keep)
        s.stop(B(C(5), 3.75), 1.25, keep=keep)
        # C6: HEY on every beat, hits on 1-3 (stop-time), band back in on 4
        for bb in (1, 2, 3):
            slam(C(6), bb, [45, 52, 55, 61], 33, crash=(bb == 1), pno_notes=[N("A2"), N("G4"), N("C#5"), N("E5")])
            shout(shouts_tr, C(6), bb, "HEY", vv, phrase="stop", voices=voices)
            if bb < 3:
                s.stop(B(C(6), bb + 0.75), 0.25, keep=keep)
        s.stop(B(C(6), 3.75), 0.25, keep=keep)
        shout(shouts_tr, C(6), 4, "HEY", vv, phrase="stop", voices=voices)
        # beat 4: band back in: B7 pickup stab + snare triplet into the walkdown
        gtr.note(B(C(6), 4), [47, 54, 59], 0.6, 0.95, accent=True)
        bass.note(B(C(6), 4), 35, 0.6, 0.9)
        kit.hit(B(C(6), 4), "kick", 1.0)
        kit.pattern(B(C(6), 4), bars=0.25, steps=12, snare="xxX")
        # C7-C8: HUP HUP HEY(held) walkdown slams, HUP HUP HEY
        if not final_fill:
            slam(C(7), 1, [47, 54, 59], 35, pno_notes=[N("B1"), N("B2"), N("B3"), N("B4")])
            slam(C(7), 2, [45, 52, 57], 33, crash=False, pno_notes=[N("A1"), N("A2"), N("A3"), N("A4")])
            slam(C(7), 3, [43, 50, 55, 59], 31, ring=1.9, pno_notes=[N("G1"), N("G2"), N("G3"), N("G4")])
            bass.note(B(C(7), 4), 30, 0.9, 0.8)                     # F# under the held G
            kit.pattern(B(C(7), 3), bars=0.5, steps=12, ride="x.xx.x", snare="....ox")
            for bb in (1, 2, 3):
                slam(C(8), bb, [40, 47, 52, 56], 28, crash=(bb != 2), ring=0.6 if bb < 3 else 0.9,
                     pno_notes=[N("E2"), N("E3"), N("G#3"), N("B3"), N("E4")])
        else:
            # 79-80: 2-bar drum fill replaces the band; accents on the HUP HUP HEY beats
            for bar in (C(7), C(8)):
                for bb in (1, 2, 3):
                    kit.hit(B(bar, bb), "kick", 1.0)
                    kit.hit(B(bar, bb), "floortom", 1.0)
                    kit.hit(B(bar, bb), "stomp", 1.0, gang=4)
                    kit.hit(B(bar, bb), "crash" if bb != 2 else "china", 0.95)
                    s.mark("fillAccents", B(bar, bb), bar=bar, beatInBar=bb)
                kit.pattern(B(bar, 1), bars=0.5, steps=12, snare=".ox.ox", tom="......")
                kit.pattern(B(bar, 3), bars=0.5, steps=12, tom=".xx...", floortom="...xx.", snare="......")
            kit.pattern(B(C(8), 3), bars=0.5, steps=16, snare=".2345678", params={"snare": {"straight": True}})
            kit.hit(B(C(8), 4.75), "tom", 0.9, straight=True)
        for bb, w in ((1, "HUP"), (2, "HUP"), (3, "HEY")):
            shout(shouts_tr, C(7), bb, w, vv, phrase="hup", i=bb, **({"hold": 2} if bb == 3 else {}), voices=voices)
            shout(shouts_tr, C(8), bb, w, vv, phrase="hup", i=bb, voices=voices)
        if end == "stop":            # C8 beat 4 silence (32, 56)
            s.stop(B(C(8), 4), 1.0, keep=())
        elif end == "fill" and not final_fill:
            fill(C(8), "big")
        # crashes on the line starts; bigger choruses crash every downbeat
        for i in ((1, 3) if level == 1 else (1, 2, 3, 4)):
            kit.hit(B(C(i)), "crash", 0.95)
        # --- melody
        mnotes = chorus_notes(tail=tag_pickup, pickup=pickup)
        mn = [(B(c0) + r, p, d, pr) for r, p, d, pr in mnotes]
        play(lead, mn, 0.88 if level < 3 else 0.92)
        if level >= 2:
            # piano doubles the hook lines an octave up (C1-C4 + C7-C8), answers in the gaps
            dbl = [(b, p + 12, d, pr) for b, p, d, pr in mn if b < B(C(5)) or b >= B(C(7))]
            play(pno, dbl, 0.62, auto=False)
            organ = [(C(i), CH[i - 1]) for i in range(1, 9)]
            for bar, ch in organ:
                organ_bar(org, bar, ch, vel=0.55 if level == 2 else 0.62)
        if level >= 3:
            play_harm(harm, mn, 0.8)
            play(b_harm, [(b, p + 12, d, pr) for b, p, d, pr in mn], 0.62)
        else:
            play_harm(b_harm, mn, 0.7)
        # piano answers in the line gaps (C2, C4)
        triplet_run(pno, B(C(2), 2), ["E6", "D6", "B5", "A5", "G5", "E5"], vel=0.64)
        triplet_run(pno, B(C(4), 2), ["B5", "A5", "G5", "E5", "D5", "B4"], vel=0.64)
        for i in range(1, 9):
            organ_bar(b_org, C(i), CH[i - 1], vel=0.5, high=True)
            if i in (1, 3, 5):
                piano_tremolo(b_pno, B(C(i)), ["A5", "C#6"], ["E6"], beats=4, vel=0.42)

    # ================================================================== CHORUS 1 (25-32)
    chorus(25, level=1, shouts_tr=hey, voices=10)
    s.mark("cue", B(33), name="cave")

    # ================================================================== VERSE 2a (33-40): cave, slide sustains
    for i in range(8):
        bar = 33 + i
        cave.pattern(B(bar), steps=8, floortom="X...x...", stomp="X.......", rimshot="..o...o.", hat="o.o.o.o.",
                     params={"stomp": {"gang": 2}})
    cave.hit(B(33), "crash", 0.8)
    for (bar, n, p) in ((33, 8, "E1"), (35, 4, "E1"), (36, 8, "E1"), (38, 4, "E1"), (39, 7, "E1")):
        bass.note(B(bar), p, n - 0.1, 0.8)
    for bar, p in ((33, "B4"), (36, "D5"), (39, "E5")):
        slide.note(B(bar), p, 7.0, 0.85, slide=-2, slide_time=0.28, vib=0.3, vib_rate=4.6, vib_delay=0.5)
    # piano drips in the gaps (verse motif), guitars creep back in 37-40
    play(pno, mel(35, "1:A5:.33 1.33:A#5:.67 2:A5:.33 2.33:B5:.67 3:A5:.67 3.67:G5:1"), 0.5, auto=False)
    play(pno, mel(38, "1:G5:.33 1.33:B5:.67 2:A5:.33 2.33:G5:.67 3:G#5:.67 3.67:G5:.33 4:E5:1"), 0.5, auto=False)
    for bar in range(37, 41):
        for k in range(8):
            gtr.note(B(bar) + k * 0.5, [40, 47], 0.5, 0.5 + 0.04 * (bar - 37), pm=True)
    for bar in range(33, 41):
        organ_bar(b_org, bar, "E", vel=0.4)
    gtr.note(B(40, 4), [40, 47, 50, 56], 0.5, 1.0, accent=True)
    bass.note(B(40, 4), 28, 0.5, 0.95)
    cave.hit(B(40, 4), "crash", 0.9)
    cave.hit(B(40, 4), "kick", 1.0)
    cave.pattern(B(40, 3), bars=0.25, steps=12, snare="oxx")
    shout(hey_cave, 40, 4, "HEY", 0.95, phrase="turn")

    # ================================================================== VERSE 2b (41-48): stalactite call/response
    calls = {41: ("A7", "1:A4:1 2:C#5:1 3:D5:1 4:D#5:1"),
             43: ("A7", "1:E5:1 2:D5:1 3:C#5:1 4:A4:1"),
             45: ("B7", "1:B4:.5 1.5:B4:.5 3:C#5:.5 3.5:D#5:.5"),
             47: ("E", "1:E5:.5 1.5:E5:.5 2:G#5:.5 3:A5:.5 3.5:A#5:.5 4:B5:.5")}
    for bar, (ch, spec) in calls.items():
        ns = mel(bar, spec)
        for b, p, d, pr in ns:
            bell.note(b, p, d, 0.85, damp=0.35, x_role="call", x_pair=bar)
            ghost.note(b + 4, p, d, 0.85, damp=0.35, x_role="response", x_pair=bar, x_callBeat=round(b, 4))
        s.mute_bus("lead", B(bar + 1), 4.0)
    for bar in range(41, 49):
        cave.pattern(B(bar), steps=8, kick="X...X...", snare="..x...x.", hat="x.x.x.x.", stomp="X...X...",
                     floortom="o.o.o.o.", cowbell="x...x...", params={"cowbell": COWBELL, "stomp": {"gang": 2}})
        rr = int(N({"A7": "A1", "B7": "B1", "E": "E1"}[H[bar]]))
        if bar != 48:       # verse pedal: root quarters with a swung fifth approach (the song's figure)
            for o, p, d in ((0, rr, 1), (1, rr, 1), (2, rr, 0.5), (2.5, rr + 7, 0.5), (3, rr, 0.5), (3.5, rr + 7, 0.5)):
                bass.note(B(bar) + o, p, d, 0.8 if o == 0 else 0.74)
        for k in range(8 if bar != 48 else 6):
            groot = int(N({"A7": "A2", "B7": "B2", "E": "E2"}[H[bar]]))
            gtr.note(B(bar) + k * 0.5, [groot, groot + 7], 0.5, 0.62 if k % 2 == 0 else 0.5, pm=True)
        pno_shuffle(bar, H[bar], vel=0.42, lh=True)
        organ_bar(b_org, bar, H[bar], vel=0.42)
    # 48: pre-chorus walk-up E E F# G# (bass + gtr), stab + HEY on 4
    bass.seq(B(48), "E1:1 E1:1 F#1:1 G#1:1", vel=0.86)
    kit_hits = [(B(48, 4), "crash"), (B(48, 4), "kick")]
    for b, pc in kit_hits:
        cave.hit(b, pc, 0.95)
    gtr.note(B(48, 4), [44, 51, 56], 0.5, 1.0, accent=True)
    shout(hey_cave, 48, 4, "HEY", 0.95, phrase="turn")
    cave.pattern(B(48, 3), bars=0.25, steps=12, snare="oxx")

    # ================================================================== CHORUS 2 (49-56): cave, bigger
    chorus(49, level=2, shouts_tr=hey_cave, voices=12)

    # ================================================================== STOMP BREAK (57-64)
    s.mark("cue", B(57), name="stomp_break")
    for i in range(8):
        bar = 57 + i
        kit.pattern(B(bar), steps=8, floortom="X.x.X.xx", stomp="X...X...", cowbell="xxxxxxxx", clap="..X...X.",
                    kick="X...X...", params={"cowbell": COWBELL, "stomp": {"gang": 3}})
        if i >= 4:
            kit.pattern(B(bar), steps=8, hat="x.x.x.x.")
    kit.hit(B(57), "crash", 0.95)
    crowd.hit(B(57), "cheer", 0.7, dur=4.0)
    # player slots: the band's big accents are only ghosts in the base stem
    slots = [(57, 3, "boom", None), (58, 3, "clang", None), (59, 3, "boom", None), (60, 1, "boom", None),
             (60, 3, "clang", None), (61, 2, "boom", "c61"), (61, 3, "boom", "c61"), (61, 4, "clang", "c61"),
             (62, 3, "boom", None), (63, 2, "boom", "c63"), (63, 3, "boom", "c63"), (63, 4, "clang", "c63"),
             (64, 1, "clang", None)]
    for bar, bb, snd, chain in slots:
        b = B(bar, bb)
        # ghosts of the player's BOOM / CLANG one-shots (same voices: concert bass drum / anvil when sampled)
        if snd == "boom":
            slotg.hit(b, "bassdrum" if sd else "floortom", 0.9)
        else:
            slotg.hit(b, "anvil" if sd else "ridebell", 0.9)
        s.mark("slots", b, sound=snd, **({"chain": chain} if chain else {}), bar=bar, beatInBar=bb)
    # chants (flavour; the level decides which are claw targets)
    for bar, bb in ((57, 1), (58, 1), (59, 1), (60, 4), (61, 1), (62, 1), (62, 4), (63, 1), (64, 3), (64, 4)):
        shout(hey, bar, bb, "HEY", 0.9, phrase="chant")
    # 57-60: bass hits on the downbeats; 61-64: riff creeps back (muted), piano swells
    for bar in range(57, 61):
        bass.note(B(bar), "E1", 1.5, 0.85)
        bass.note(B(bar, 3), "E1", 0.5, 0.6)
    for i, bar in enumerate(range(61, 65)):
        riff(bar, "E2", i % 2, vel=0.7 + 0.05 * i, pm_all=True, bvel=0.75)
    # (automation holds its first/last value outside the points: open the filter explicitly before 61)
    gtr.automate("lpf", [(0.0, 20000.0), (B(61) - 0.02, 20000.0), (B(61), 700.0), (B(64, 4), 3500.0),
                         (B(65) - 0.01, 3500.0), (B(65), 1200.0), (B(71), 16000.0), (B(73), 20000.0)])
    piano_tremolo(pcomp, B(63), ["E3", "B3"], ["E4", "G#4"], beats=8, vel=0.45)
    kit.pattern(B(64, 3), bars=0.5, steps=12, snare="xxxxxX", tom="x..x..")

    # ================================================================== BUILD (65-72)
    s.mark("cue", B(65), name="build")
    broots = {65: "E2", 66: "E2", 67: "A2", 68: "A2", 69: "B2", 70: "B2"}
    for bar in range(65, 71):
        riff(bar, broots[bar], (bar - 65) % 2, vel=0.84 + 0.02 * (bar - 65), bvel=0.84)
        # big hit on every downbeat
        kit.hit(B(bar), "crash", 0.9 + 0.015 * (bar - 65))
        kit.hit(B(bar), "kick", 1.0)
        kit.hit(B(bar), "stomp", 1.0, gang=4)
        kit.pattern(B(bar), steps=8, snare="..x...x.", cowbell="x.x.x.x.", params={"cowbell": COWBELL})
        pno_shuffle(bar, H[bar], vel=0.5 + 0.02 * (bar - 65))
    # tom roll doubles every 2 bars: quarters -> 8ths -> 16ths -> roll
    kit.pattern(B(65), bars=2, steps=4, floortom="xxxx")
    kit.pattern(B(67), bars=2, steps=8, floortom="xxxxxxxx", tom="........")
    kit.pattern(B(69), bars=2, steps=16, floortom="x.x.x.x.x.x.x.x.", tom=".x.x.x.x.x.x.x.x",
                params={"floortom": {"straight": True}, "tom": {"straight": True}})
    # 71: roll (32nds, crescendo) on B7, riff climbs chromatically
    kit.pattern(B(71), steps=32, snare="3334444455556666777788889999XXXX", params={"snare": {"straight": True}})
    kit.pattern(B(71), steps=8, floortom="X.x.x.x.")          # no kick/bass in the roll bar: the drop brings the bottom back
    kit.hit(B(71), "crash", 1.0)
    kit.hit(B(71), "stomp", 1.0, gang=4)
    bass.note(B(71), "B1", 0.9, 0.9)
    for k, p in enumerate([35, 36, 37, 38, 39, 40, 41, 42]):   # B C C# D D# E F F#  (8ths), guitars alone
        gtr.note(B(71) + k * 0.5, [p + 12, p + 19, p + 24], 0.5, 0.86 + 0.015 * k, accent=(k % 2 == 0))
    piano_tremolo(pcomp, B(71), ["B3", "D#4", "F#4"], ["B4", "D#5", "F#5"], beats=4, vel=0.6)
    # 72: b1 HEY + hit, b2 HEY + hit, then TOTAL silence b3-4 (the keystone KRAK is the player's)
    for bb, (gch, bn) in ((1, ([40, 47, 52, 56], 28)), (2, ([44, 51, 56], 32))):
        slam(72, bb, gch, bn, crash=True, ring=0.7, pno_notes=[N("E2"), N("E3"), N("G#3"), N("B3"), N("E4")])
    s.stop(B(72, 3), 2.0, kind="stop", keep=(), total=True, fade_ms=40)
    s.mark("cue", B(72, 4), name="keystone_krak", note="player claws the keystone into the silence")
    # HEY chant grows every bar (count + voices)
    chant = {65: [1], 66: [1], 67: [1, 3], 68: [1, 3], 69: [1, 2, 3], 70: [1, 2, 3], 71: [1, 2, 3, 4], 72: [1, 2]}
    for bar, beats in chant.items():
        for bb in beats:
            shout(hey, bar, bb, "HEY", min(1.0, 0.82 + 0.025 * (bar - 65)), phrase="build",
                  voices=8 + (bar - 65))
    risers.hit(B(69), "riser", 0.9, dur=B(72, 3) - B(69) - 0.05)
    # organ swell + leslie ramp (base), piano gliss (lead)
    for bar in range(65, 72):
        organ_bar(org, bar, H[bar], vel=0.4 + 0.04 * (bar - 65))
    org.automate("leslie", [(B(65), 0.0), (B(69), 0.0), (B(70), 1.0)])
    org.automate("gain_db", [(0.0, 0.0), (B(65) - 0.02, 0.0), (B(65), -6.0), (B(71, 4), 0.0), (B(73), 0.0)])
    # lead: verse-3 material (the fight verse's D peak), sequenced up with the harmony
    vm = mel(65, "1:B4:.5 1.5:G#4:.5 2:A4:.5 2.5:G4:.5 3:A4:.5 3.5:G4:.5 4:E4:.5 4.5:A#4:.5 "
                 "5:D5:1/slide=-2,slide_time=0.05 6:D5:.5 6.5:D5:.5 7:B4:.5 7.5:A4:.5 8:B4:1")
    for k, st in enumerate((0, 5, 7)):
        seg = shift(vm, beats=8 * k, semis=st)
        play(lead, seg, 0.85 + 0.03 * k)
        play_harm(b_harm, seg, 0.66)
    play(lead, mel(71, "1:A5:3.9/bend=2,bend_at=0.15,bend_time=0.25,vib=0.4,vib_delay=0.6"), 0.95, auto=False)
    play(b_harm, mel(71, "1:F#5:3.9/bend=2,bend_at=0.15,bend_time=0.25,vib=0.4,vib_delay=0.6"), 0.75, auto=False)
    play(lead, mel(72, "1:E5:.9/vib 2:G#5:.9/vib"), 0.95, auto=False)
    triplet_run(pno, B(70, 3), ["E5", "F#5", "G#5", "A5", "B5", "C#6"], vel=0.66)

    # ================================================================== FINAL CHORUS (73-88)
    s.mark("cue", B(73), name="drop")
    for bar in range(73, 79):
        s.mark("cue", B(bar), name="domino", i=bar - 72)
    kit.hit(B(73), "china", 1.0)
    (kit if sd else gongs).hit(B(73), "gong", 1.0)   # THE DROP: one big gong (sampled VCSL gong when available)
    crowd.hit(B(73), "cheer", 0.95, dur=5.0)
    crowd.hit(B(73), "roar", 0.55, dur=22.0)
    chorus(73, level=3, shouts_tr=hey_big, voices=14, final_fill=True, end="fill", pickup=False)
    # lead over the fill: Hook A is in the chorus melody already; add the pickup into 81 line 1
    # slide sustains (skim ribbons) doubling the line tails
    for bar, p, n in ((74, "F#4", 2.0), (76, "E4", 2.0)):
        slide.note(B(bar), p, n, 0.85, slide=-2, slide_time=0.12, vib=0.3, vib_rate=5.0, vib_delay=0.3)
    s.mark("cue", B(81), name="whale", note="biggest crash of the song")
    kit.hit(B(81), "china", 1.0)                   # + the chorus's own crash/kick/stomp on 81 b1
    kit.hit(B(81), "clash" if sd else "crash", 1.0)  # orchestral clash cymbals: the biggest crash of the song
    crowd.hit(B(81), "cheer", 1.0, dur=4.0)
    crowd.hit(B(81), "roar", 0.55, dur=11.5)
    risers.hit(B(79), "riser", 0.8, dur=B(81) - B(79) - 0.02)
    chorus(81, level=3, shouts_tr=hey_big, voices=14, end="hold", tag_pickup=True)
    for bar, p, n in ((81, "A3", 3.5), (82, "F#4", 2.0), (84, "E4", 2.0)):
        slide.note(B(bar), p, n, 0.88, slide=-3 if bar == 81 else -2, slide_time=0.3 if bar == 81 else 0.12,
                   vib=0.32, vib_rate=4.6, vib_delay=0.4)
    # 88 b3-4: big sustained E chord + low roar swell (Big Jim wakes); overrides the C8 drum pickup
    s.mark("cue", B(88, 3), name="bigjim_wakes")
    gtr.note(B(88, 3), [40, 47, 52, 56, 59], 1.95, 1.0, accent=True, let=0.1)
    bass.note(B(88, 3), 28, 1.95, 1.0)
    org.note(B(88, 3), [N("E3"), N("G#3"), N("B3"), N("E4")], 1.95, 0.7)
    risers.hit(B(88, 3), "roar", 1.0, dur=2 * 60 / 164)
    kit.pattern(B(88, 3), bars=0.5, steps=16, floortom="xxxxxxxX", params={"floortom": {"straight": True}})
    org.automate("leslie", [(B(73), 1.0)])

    # ================================================================== OUTRO GAUNTLET (89-92): double time
    s.mark("cue", B(89), name="gauntlet")
    for bar in range(89, 93):
        kit.pattern(B(bar), steps=8, kick="X.x.X.x.", snare="x.X.x.X.", floortom="xxxxxxxx", cowbell="XxXxXxXx",
                    stomp="X.X.X.X.", openhat=".x.x.x.x", params={"cowbell": COWBELL, "stomp": {"gang": 3}})
        kit.hit(B(bar), "crash", 0.95)
        boogie(bar, "E2", vel=0.9, pm=False)
        bass.seq(B(bar), "E1:0.5 E1:0.5 E2:0.5 E1:0.5 E1:0.5 E1:0.5 E2:0.5 D2:0.5", vel=0.88)
        pno_pump(bar, "E")
        organ_bar(org, bar, "E", vel=0.6)
        organ_bar(b_org, bar, "E", vel=0.5, high=True)
        piano_tremolo(b_pno, B(bar), ["G#5", "B5"], ["E6"], beats=4, vel=0.45)
    for bar in (89, 90):
        for bb in (1, 2, 3, 4):
            shout(hey_big, bar, bb, "HEY", 1.0, phrase="gauntlet", voices=14)
    for bar in (91, 92):
        for bb, w in ((1, "HUP"), (2, "HUP"), (3, "HEY")):
            shout(hey_big, bar, bb, w, 1.0, phrase="hup", i=bb, voices=14)
    # stalactite reprise, no call: ghost in the base, one note per beat (the 41 riff shape, on E)
    for k, p in enumerate(["E5", "G#5", "A5", "A#5", "B5", "A5", "G#5", "E5"]):
        ghost.note(B(89) + k, N(p), 1.0, 0.85, damp=0.35, x_role="response", x_noCall=True, x_pair=89)
    # lead: the tag (Hook B) twice; pickups at 88 b3 (in the chorus) and 90 b3
    t2 = mel(90, TAG)
    play(lead, t2, 0.92)
    play_harm(b_harm, t2, 0.7)
    play_harm(harm, t2, 0.72)
    tag1 = [(b, p, d, pr) for b, p, d, pr in mel(88, TAG) if b >= B(89)]
    play(lead, tag1, 0.92)
    play_harm(harm, tag1, 0.72)
    play_harm(b_harm, tag1, 0.7)
    play(lead, mel(92, "3:G4:.67 3.67:A4:.33 4:A4:.67 4.67:A#4:.33"), 0.85)

    # ================================================================== BREATH (93-94): stomp + piano only
    for bar in (93, 94):
        kit.pattern(B(bar), steps=4, stomp="X.X.", params={"stomp": {"gang": 3}})
        pcomp.note(B(bar), [N("E2"), N("E3")], 1.9, 0.5)
        pcomp.note(B(bar, 3), [N("E2"), N("B2"), N("E3")], 1.9, 0.45)
    ptag = [(b, p, d, pr) for b, p, d, pr in mel(92, TAG) if b >= B(93)]
    play(pno, [(b, p + 12, d, pr) for b, p, d, pr in ptag], 0.66, auto=False)
    play(pno, ptag, 0.5, auto=False)
    piano_gliss(pno, B(94, 3), "E4", "E6", beats=1.75, vel=0.6)
    crowd.hit(B(93), "cheer", 0.7, dur=2.8)

    # ================================================================== FINALE (95-96)
    s.mark("cue", B(95), name="fold")
    walk = [([47, 54, 59], 35, "B"), ([45, 52, 57], 33, "A"), ([43, 50, 55], 31, "G"), ([42, 49, 54], 30, "F#")]
    for k, (gch, bn, nm) in enumerate(walk):
        pn = int(N(nm + "2"))
        slam(95, k + 1, gch, bn, crash=(k % 2 == 0), ring=0.7, pno_notes=[pn - 12, pn, pn + 12])
        s.mark("cue", B(95, k + 1), name="panel_fold", panel=k + 1)
    for bb, w in ((1, "HUP"), (2, "HUP")):
        slam(96, bb, [40, 47, 52, 56], 28, crash=False, ring=0.6, pno_notes=[N("E2"), N("E3"), N("G#3"), N("B3")])
        shout(hey_big, 96, bb, w, 1.0, phrase="final", i=bb, voices=16)
        s.mark("cue", B(96, bb), name="panel_fold", panel=4 + bb)
    # FINAL HIT 96 b3
    h = B(96, 3)
    s.mark("cue", h, name="final_hit")
    shout(hey_big, 96, 3, "HEY", 1.0, phrase="final", i=3, voices=16)
    for p in ("kick", "crash", "china", "floortom"):
        kit.hit(h, p, 1.0)
    kit.hit(h, "stomp", 1.0, gang=5)
    gtr.note(h, [40, 47, 52, 56, 59, 64], 5.5, 1.0, accent=True, let=0.4)
    bass.note(h, 28, 5.5, 1.0)
    pcomp.note(h, [N("E1"), N("E2"), N("B2"), N("E3"), N("G#3"), N("B3"), N("E4")], 4.5, 0.95)
    org.note(h, [N("E3"), N("G#3"), N("B3"), N("D4"), N("E4")], 5.0, 0.7)
    b_org.note(h, [N("E4"), N("G#4"), N("B4"), N("E5")], 5.0, 0.6)
    crowd.hit(h + 0.5, "cheer", 1.0, dur=4.0)
    crowd.hit(h, "roar", 0.8, dur=5.0)
    # lead: hook A over the walkdown, then the final E
    hookA = [(B(95) + r - 24, p, d, pr) for r, p, d, pr in chorus_notes() if 24 <= r < 30]
    play(lead, hookA, 0.95)
    play_harm(harm, hookA, 0.75)
    play_harm(b_harm, hookA, 0.7)
    lead.note(h, N("E5"), 5.5, 1.0, vib=0.35, vib_delay=0.4, slide=-2, slide_time=0.08)
    harm.note(h, N("G#5"), 5.5, 0.8, vib=0.35, vib_delay=0.4, slide=-2, slide_time=0.08)
    b_harm.note(h, N("B5"), 5.5, 0.7, vib=0.35, vib_delay=0.4)
    piano_gliss(pno, h + 0.25, "E4", "E7", beats=0.7, vel=0.6)
    for bar in (95, 96):
        organ_bar(b_org, bar, H[bar], vel=0.5, high=True)
    # ------------------------------------------------------------------ section dynamics (fader rides)
    def ride(tr, pts):
        """pts: [(bar, dB) step at that bar's downbeat | (bar, dB, 'ramp') linear from the previous point]"""
        out = []
        cur = pts[0][1]
        for p in pts:
            b = B(p[0])
            if len(p) > 2 and p[2] == "ramp":
                out.append((b, p[1]))
            else:
                out += [(b - 0.02, cur), (b, p[1])]
            cur = p[1]
        tr.automate("gain_db", out)

    # the build stops ~2 dB short of the drop, so bar 73 is a real step up after the silence
    ride(kit, [(0, 0.0), (9, -4.5), (17, -2.5), (25, -1.0), (33, 0.0), (49, 0.0), (57, -1.0), (65, -5.5),
               (72, -2.0, "ramp"), (73, 1.0), (89, 0.5), (93, -1.0), (95, 0.5)])
    ride(gtr, [(0, 0.0), (5, -1.0), (9, -5.5), (17, -3.5), (24, -1.5), (25, -1.0), (33, -9.0), (37, -9.0),
               (41, -5.0, "ramp"), (41, -5.0), (49, 0.0), (57, -2.0), (65, -6.5), (72, -2.5, "ramp"), (73, 1.0)])
    ride(bass, [(0, 0.0), (9, -3.0), (17, -2.0), (25, -0.5), (33, -4.0), (41, -3.5), (49, 0.0), (57, -1.0),
                (65, -4.0), (72, -1.5, "ramp"), (73, 0.5)])
    ride(cave, [(0, -3.0), (41, -3.5), (49, 0.0)])
    ride(pcomp, [(0, 0.0), (9, -2.0), (25, -1.5), (33, -3.0), (49, -1.5), (57, 0.0), (73, -1.0), (89, 0.0)])
    ride(lead, [(0, 0.0), (17, -1.5), (25, 0.0), (65, -1.0), (73, 0.5), (89, -0.5), (95, 0.5)])
    ride(slide, [(0, -3.0), (73, 0.0)])
    ride(pno, [(0, 0.0), (9, -1.5), (17, 0.0), (25, -1.0), (57, 0.0), (73, -1.0), (93, 0.0)])
    return s
