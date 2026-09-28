"""Palette demo: a ~31 s generic stomp-boogie shuffle (original material, E, 164 BPM, triplet swing) that shows
off the instrument palette and the beat-map lanes.

    stomp intro (2) -> riff (8, lead hook in bars 5-8) -> piano fills (4) -> shout hits (2, stop-time)
    -> drum break (2) -> finale (2) -> final hit (1)

Render:  python3 tools/music/render.py tools/music/songs/palette_demo.py
         python3 tools/music/render.py tools/music/songs/palette_demo_sampled.py   # same score, sampled instruments
"""
from producer.score import Score
from producer.patterns import boogie_guitar, pump_bass, walking_boogie, piano_boogie_lh, piano_tremolo, piano_gliss, triplet_run
from instruments.bass import Bass
from instruments.keys import Organ
from instruments.palette import Palette
from instruments.vocals import Crowd

MASTER = dict(target_lufs=-14.0, ceiling_db=-1.0)


def build(use_samples=False, id="palette_demo", title="Palette Demo (stomp boogie)") -> Score:
    P = Palette(use_samples)
    s = Score(id, title, bpm=164, key="E2", scale="mixolydian", swing_ratio=0.67,
              pre_roll=0.25, tail=2.2, artist="OpusLegends synth band")

    intro = s.section("intro", 2, "Stomp intro", energy=0.35)
    riff = s.section("riff", 8, "Riff + lead hook", energy=0.8)
    piano = s.section("piano", 4, "Piano fills", energy=0.6)
    shout = s.section("shouts", 2, "Shout hits (stop-time)", energy=0.9)
    brk = s.section("break", 2, "Drum break", energy=0.7)
    fin = s.section("finale", 2, "Finale", energy=1.0)
    end = s.section("end", 1, "Final hit", energy=0.5)

    # ---------------------------------------------------------------- buses (= stems)
    s.bus("drums", parallel=dict(thresh=-30, ratio=8, attack_ms=1.0, release_ms=70, knee=4, makeup=10, mix=0.35),
          comp=dict(thresh=-14, ratio=2.5, attack_ms=8, release_ms=90))
    s.bus("guitars", comp=dict(thresh=-18, ratio=2, attack_ms=15, release_ms=120))
    s.bus("keys", comp=dict(thresh=-20, ratio=2, attack_ms=10, release_ms=120))

    # ---------------------------------------------------------------- tracks
    kit = s.track("drums", P.kit(), bus="drums", gameplay=True, lufs=-17, sends={"room": 0.35, "plate": 0.05},
                  eq=[("hs", 11000, 0.7, -4)] if not P.sampled("drums") else [],     # tame synth fizz; real cymbals need their air
                  humanize={"vel": 0.05})
    bass = s.track("bass", Bass(drive=0.6), bus="bass", gameplay=True, lane="bass", lufs=-19.5,
                   eq=[("peak", 130, 0.9, 3)], comp=dict(thresh=-20, ratio=4, attack_ms=6, release_ms=70))
    gtr = s.track("gtr", P.rhythm_guitar(voicing="crunch", gain=1.1, spread=0.9, presence=0.0), bus="guitars", gameplay=True,
                  accent_lane="riff", lufs=-16, eq=[("hp", 75), ("peak", 140, 1.0, 1.5), ("peak", 320, 1.0, -2.5), ("lp", 10000)],
                  sends={"room": 0.08})
    lead = s.track("lead", P.lead_guitar(gain=1.0), bus="lead", gameplay=True, lane="melody", lufs=-18, pan=0.08,
                   comp=dict(thresh=-22, ratio=3, attack_ms=10, release_ms=100),
                   eq=[("hp", 150), ("peak", 3000, 1.0, -1.5)], sends={"delay": 0.22, "plate": 0.22})
    plh = s.track("piano_lh", P.piano(), bus="keys", humanize={"timing_ms": 4, "vel": 0.08}, lufs=-24,
                  eq=[("hp", 70)], sends={"plate": 0.12})
    prh = s.track("piano_rh", P.piano(), bus="keys", gameplay=True, lane="melody", humanize={"vel": 0.06},
                  lufs=-19.5, eq=[("hp", 120)], sends={"plate": 0.15})
    org = s.track("organ", Organ(drawbars="888500000", drive=0.6), bus="keys", humanize={"timing_ms": 3}, lufs=-25,
                  sends={"hall": 0.12})
    hey = s.track("shouts", P.shouts(voices=10), bus="vox", gameplay=True, lufs=-21,
                  sends={"room": 0.3, "hall": 0.22})
    crowd = s.track("crowd", Crowd(), bus="vox", gameplay=True, lufs=-26, sends={"hall": 0.35})

    # ---------------------------------------------------------------- harmony
    for bar, ch in [(0, "E7"), (6, "A7"), (8, "E7"), (9, "B7"), (10, "E7"), (12, "A7"), (13, "B7"),
                    (14, "E5"), (16, "E5"), (18, "E7"), (19, "B7"), (20, "E5")]:
        s.chord(s.b(bar), ch)

    # ================================================================ INTRO (bars 0-1): stomp + claps + cowbell
    kit.pattern(intro.start, bars=2, steps=8, stomp="X..xX...", clap="..X...X.", cowbell="X.x.X.x.",
                floortom="x...x...")
    for b in (intro.bar(0), intro.bar(0, 2), intro.bar(1), intro.bar(1, 2)):
        kit.hit(b, "stomp", 0.9, gang=3)
    hey.hit(intro.bar(0, 3), "HEY", 0.9)
    # pickup lick (guitar + bass unison): G A A# B -> riff
    gtr.seq(intro.bar(1, 2), ">G2+D3:0.5 >A2+E3:0.5 >A#2+F3:0.5 >B2+F#3:0.5", vel=0.85)
    bass.seq(intro.bar(1, 2), "G1:0.5 A1:0.5 A#1:0.5 B1:0.5", vel=0.85)
    kit.pattern(intro.bar(1, 2), bars=0.5, steps=12, snare="oxoxxX")
    kit.hit(intro.bar(1, 3), "tom", 0.8)
    kit.hit(intro.bar(1, 3.5), "floortom", 0.9)
    hey.hit(intro.bar(1, 2), "WHOA", 0.85, stretch=1.3)

    # ================================================================ RIFF (bars 2-9)
    roots = ["E2", "E2", "E2", "E2", "A2", "A2", "E2", "B2"]
    for i, r in enumerate(roots):
        bb = riff.bar(i)
        last_of_pair = i % 2 == 1
        if last_of_pair and r == "E2":
            # 2-beat boogie then the chromatic climb lick
            for k, iv in enumerate([7, 7, 9, 9]):
                gtr.note(bb + k * 0.5, ["E2", 40 + iv], 0.5, 0.9 if k == 0 else 0.78, pm=(k != 0), accent=(k == 0))
            gtr.seq(bb + 2, ">G2+D3:0.5 >A2+E3:0.5 >A#2+F3:0.5 >B2+F#3:0.5", vel=0.85)
            bass.seq(bb, "E1:0.5 E1:0.5 E1:0.5 E1:0.5 G1:0.5 A1:0.5 A#1:0.5 B1:0.5", vel=0.82)
        else:
            boogie_guitar(gtr, bb, r, bars=1, pm=True)
            pump_bass(bass, bb, {"E2": "E1", "A2": "A1", "B2": "B1"}[r], beats=4, octave_pop=(i == 7))
        kit.pattern(bb, steps=8, kick="X..xX...", snare="..X...X.", floortom="x.x.x.x.", cowbell="Xoxoxoxo",
                    hat="..x...x.")
        kit.hit(bb, "stomp", 0.85, gang=2)
        kit.hit(bb + 2, "stomp", 0.8, gang=2)
        if i % 4 == 0:
            kit.hit(bb, "crash", 0.9)
        if i in (1, 3, 5):
            hey.hit(bb + 3, "HEY", 0.9)
    hey.hit(riff.bar(7, 2), "HEY", 0.9)
    hey.hit(riff.bar(7, 3), "HEY", 1.0)
    kit.pattern(riff.bar(7, 2), bars=0.5, steps=12, snare="...xxX", tom="xxx...")
    # organ pad
    for i, ch in enumerate([["E3", "G#3", "B3", "D4"]] * 4 + [["A3", "C#4", "E4", "G4"]] * 2 + [["E3", "G#3", "B3", "D4"]] + [["B2", "D#3", "F#3", "A3"]]):
        org.note(riff.bar(i), ch, 3.9, 0.55)
    # lead hook (bars 4-7 of the riff)
    lead.seq(riff.bar(4), "r:0.5 E4:0.5 G4:0.5 A4:1.0/vib r:0.5 G4:0.5 E4:0.5", vel=0.85)
    lead.seq(riff.bar(5), "A4:1.5/bend2,vib G4:0.5 E4:0.5 D4:0.5 E4:1.0/vib", vel=0.85)
    lead.seq(riff.bar(6), "r:0.5 B3:0.5 D4:0.5 E4:0.5 G4:0.5 E4:0.5 D4:0.5 B3:0.5", vel=0.8)
    lead.seq(riff.bar(7), "D#4:1/slide-2 F#4:1 A4:1/vib B4:1/bend1,vib", vel=0.88)

    # ================================================================ PIANO FILLS (bars 10-13)
    proots = ["E2", "E2", "A2", "B2"]
    for i, r in enumerate(proots):
        bb = piano.bar(i)
        rr = {"E2": 40, "A2": 45, "B2": 47}[r]
        gtr.note(bb, [rr, rr + 7, rr + 12], 0.75, 0.95, accent=True)          # stab on 1
        gtr.note(bb + 1.5, [rr, rr + 7, rr + 12], 0.4, 0.85, accent=True)    # and on the & of 2
        walking_boogie(bass, bb, {40: "E1", 45: "A1", 47: "B1"}[rr], bars=1, vel=0.8)
        piano_boogie_lh(plh, bb, {40: "E2", 45: "A2", 47: "B2"}[rr], bars=1, vel=0.62)
        kit.pattern(bb, steps=8, kick="X...X.x.", snare="..X...X.", hat="xoxoxoxo")
        org.note(bb, [rr + 12, rr + 16, rr + 19, rr + 22], 3.9, 0.45)
    # right hand: tremolo, triplet runs, gliss (the melody lane for this section)
    piano_tremolo(prh, piano.bar(0), ["G#4", "B4", "E5"], ["B4", "E5", "G#5"], beats=2, vel=0.8)
    triplet_run(prh, piano.bar(0, 2), ["G5", "G#5", "E5", "D5", "B4", "A4"], vel=0.78)
    prh.seq(piano.bar(1), "G4+B4:0.5 G#4+B4+E5:1 r:0.5 D5:0.5 E5:0.5 G5:0.5 E5:0.5", vel=0.8)
    piano_tremolo(prh, piano.bar(2), ["A4", "C#5", "E5"], ["C#5", "E5", "A5"], beats=2, vel=0.8)
    triplet_run(prh, piano.bar(2, 2), ["G5", "E5", "C#5", "A4", "G4", "E4"], vel=0.78)
    prh.seq(piano.bar(3), "D#5+F#5+A5:0.5 r:0.5 D#5+F#5+A5:0.5 r:0.5", vel=0.85)
    piano_gliss(prh, piano.bar(3, 2), "E4", "E6", beats=1.75, vel=0.7)
    org.automate("leslie", [(piano.bar(3), 0.0), (piano.bar(3, 0.1), 1.0), (shout.start, 1.0), (shout.start + 0.1, 0.0)])
    kit.pattern(piano.bar(3, 2), bars=0.5, steps=12, snare="oxoxo.", tom="....x.", floortom=".....x")

    # ================================================================ SHOUT HITS (bars 14-15, stop-time)
    hits = [shout.bar(0), shout.bar(0, 2), shout.bar(1), shout.bar(1, 1), shout.bar(1, 2)]
    for h in hits:
        kit.hit(h, "kick", 1.0)
        kit.hit(h, "stomp", 1.0, gang=3)
        kit.hit(h, "crash", 0.95)
        kit.hit(h, "floortom", 0.95)
        gtr.note(h, ["E2", "B2", "E3"], 0.7, 1.0, accent=True)
        bass.note(h, "E1", 0.7, 0.95)
        plh.note(h, ["E1", "E2"], 0.7, 0.9)
        prh.note(h, ["E4", "G#4", "B4", "E5"], 0.7, 0.9)
        org.note(h, ["E3", "G#3", "B3", "E4"], 0.7, 0.8)
        hey.hit(h, "HEY", 1.0, voices=12)
    s.stop(shout.bar(0, 0.75), 1.25)
    s.stop(shout.bar(0, 2.75), 1.25)
    s.stop(shout.bar(1, 0.75), 0.25)
    s.stop(shout.bar(1, 1.75), 0.25)
    s.stop(shout.bar(1, 2.75), 0.25)
    # pickup into the break: WHOA + snare
    hey.hit(shout.bar(1, 3), "WHOA", 0.95, voices=12, stretch=1.2)
    kit.pattern(shout.bar(1, 3), bars=0.25, steps=12, snare="xxX")

    # ================================================================ DRUM BREAK (bars 16-17)
    kit.pattern(brk.start, bars=2, steps=8, floortom="X.x.X.xx", stomp="X...X...", cowbell="xxxxxxxx",
                snare="..X...X.", kick="X..xX...")
    kit.hit(brk.start, "crash", 0.9)
    crowd.hit(brk.start, "cheer", 0.9, dur=6.0)
    kit.pattern(brk.bar(1, 2), bars=0.5, steps=12, snare="345678", tom="...x..", floortom=".....X")
    kit.pattern(brk.bar(1, 3), bars=0.25, steps=12, snare="89X")
    hey.hit(brk.bar(1, 0), "HO", 0.9)
    hey.hit(brk.bar(1, 1), "HO", 0.9)

    # ================================================================ FINALE (bars 18-19)
    for i, r in enumerate(["E2", "B2"]):
        bb = fin.bar(i)
        boogie_guitar(gtr, bb, r, bars=1, pm=False, vel=0.85)
        pump_bass(bass, bb, {"E2": "E1", "B2": "B1"}[r], beats=4, octave_pop=True)
        kit.pattern(bb, steps=8, kick="X..xX..x", snare="..X...X.", floortom="x.x.x.x.", cowbell="XxXxXxXx",
                    openhat="x.x.x.x.")
        kit.hit(bb, "crash", 1.0)
        kit.hit(bb, "stomp", 0.9, gang=3)
        piano_tremolo(prh, bb, ["E5", "G#5"], ["B5", "E6"], beats=4, vel=0.6)
        org.note(bb, [52, 56, 59, 62] if r == "E2" else [47, 51, 54, 57], 3.9, 0.55)
    org.automate("leslie", [(fin.start, 1.0)])
    lead.seq(fin.bar(0), "B4:0.5 D5:0.5 E5:3/bend2,bend_at=0.12,vib", vel=0.95)
    lead.seq(fin.bar(1), "D5:0.5 B4:0.5 A4:0.5 G4:0.5 E4:1 B4:1/bend1,vib", vel=0.9)
    hey.hit(fin.bar(0, 3), "HEY", 0.95)
    hey.hit(fin.bar(1, 3), "YEAH", 0.95)
    kit.pattern(fin.bar(1, 2), bars=0.5, steps=12, tom="xxx...", floortom="...xxX")

    # ================================================================ FINAL HIT (bar 20)
    h = end.start
    for p in ("kick", "crash", "china", "floortom"):
        kit.hit(h, p, 1.0)
    kit.hit(h, "stomp", 1.0, gang=4)
    gtr.note(h, ["E2", "B2", "E3", "G#3"], 3.5, 1.0, accent=True, let=0.5)
    bass.note(h, "E1", 3.5, 1.0)
    plh.note(h, ["E1", "E2"], 3.0, 1.0)
    prh.note(h, ["E4", "G#4", "B4", "E5"], 3.0, 0.95)
    org.note(h, ["E3", "G#3", "B3", "D4", "E4"], 3.5, 0.7)
    lead.note(h, "E5", 3.5, 0.95, vib=0.3)
    hey.hit(h, "HEY", 1.0, voices=14)
    crowd.hit(h + 0.5, "cheer", 0.8, dur=3.0)
    return s
