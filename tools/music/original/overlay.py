"""Reward overlay layers over the ORIGINAL recording (our own audio, sampled palette), on its per-beat tempo map.

Three stems the game fades in with the crowd meter:
  shouts   gang HEY!/HUP! only in the vocal's gaps (collision-checked against the transcribed melody, the outro tag
           and detected phrases), at the song's natural punctuation: verse phrase-end fills, pre-chorus walk-ups
           (HUP HUP HEY), chorus line tails, turnaround stabs, breakdown, outro call/response with the tag.
  stomps   stomps on the kick hits + hand claps on the snare hits, locked to the drummer's ACTUAL hit times
           (lanes kick/snare), arranged per section (stop-time bars thin out, walkdowns/turnarounds hit every beat,
           the breakdown gets the Black Betty stomp).
  cowbell  cowbell (tuned to B4) on the beats in choruses/tags/verse 3/outro, swung 8ths in the breakdown.
Events are built in ORIGINAL song beats; the renderer places them at file times (a 60 BPM Score, 1 beat = 1 s).
"""
from __future__ import annotations

import math

import numpy as np

SWUNG = 0.5   # notated 'and' (placed at the measured swing ratio by `at()`)


class Place:
    def __init__(self, G, lanes, form, n_beats, swing):
        self.G = G
        self.n_beats = n_beats
        self.swing = swing
        self.kick = np.array([e["beat"] for e in lanes.get("kick", []) if e["pos"] == "on"])
        self.snare = np.array([e["beat"] for e in lanes.get("snare", []) if e["pos"] == "on"])
        self.sec = {}
        for s in form:
            for b in range(s["bars"][0], s["bars"][1] + 1):
                self.sec[b] = s["name"]
        self.form = {s["name"]: s["bars"] for s in form}
        self.bass_out = set()
        for e in lanes.get("bassOut", []):
            for b in range(int(e["beat"]), int(e["endBeat"])):
                self.bass_out.add(b)
        # vocal occupancy (beats): melody notes, outro tag spans, detected breakdown/outro phrases
        occ = [(e["beat"], e["beat"] + max(0.3, e["durBeats"])) for e in lanes.get("melody", [])]
        occ += [(e["beat"], e["endBeat"]) for e in lanes.get("hooks", []) if e.get("outroRepeat")]
        # detected phrases only for the breakdown (the outro's vocal is the tag, covered by the hookB spans)
        occ += [(e["beat"], e["endBeat"]) for e in lanes.get("vocalPhrases", [])
                if e.get("source") == "detected" and e["bar"] < 107]
        self.occ = sorted(occ)
        self.shouts, self.stomps, self.claps, self.cow = [], [], [], []

    # ---------------------------------------------------------------- helpers
    def B(self, bar, beat=1.0):
        """song bar (1-based) + 1-based beat -> song beat"""
        return (bar - 1) * 4 + (beat - 1)

    def at(self, b):
        """notated beat (x.5 = swung 'and') -> performed beat on the grid"""
        k = math.floor(b)
        f = b - k
        if abs(f - 0.5) < 1e-6:
            return k + self.swing
        return b

    def locked(self, b, lane):
        """snap an on-beat position to the drummer's actual hit (kick/snare lanes) within 0.08 beat"""
        arr = self.kick if lane == "kick" else self.snare
        if len(arr):
            j = int(np.argmin(np.abs(arr - b)))
            if abs(arr[j] - b) < 0.08:
                return float(arr[j])
        return float(b)

    def vocal_free(self, b, before=0.02, after=0.6):
        for a, e in self.occ:
            if a > b + after:
                break
            if e > b - before and a < b + after:
                return False
        return True

    def shout(self, b, word="HEY", vel=0.95, voices=12, phrase="", force=False):
        if b >= self.n_beats:
            return
        if force or self.vocal_free(b):
            self.shouts.append((b, word, vel, voices, phrase))

    def stomp(self, b, vel=0.85, gang=2):
        if b < self.n_beats:
            self.stomps.append((self.locked(b, "kick") if abs(b - round(b)) < 1e-6 else b, vel, gang))

    def clap(self, b, vel=0.7):
        if b < self.n_beats:
            self.claps.append((self.locked(b, "snare") if abs(b - round(b)) < 1e-6 else b, vel))

    def cowbell(self, b, vel=0.6):
        if b < self.n_beats:
            self.cow.append((self.locked(b, "kick" if int(round(b)) % 2 == 0 else "snare")
                             if abs(b - round(b)) < 1e-6 else b, vel))

    # ---------------------------------------------------------------- arrangement
    def build(self, fade_bar=116):
        last_bar = min(self.n_beats // 4, 119)
        for bar in range(1, last_bar + 1):
            sec = self.sec.get(bar, "outro")
            base = "".join(c for c in sec if not c.isdigit())
            first, lastb = self.form[sec]
            rel = bar - first            # 0-based bar inside the section
            b1 = self.B(bar)
            if bar >= fade_bar:          # the original fades: the overlay thins out and stops
                if bar == fade_bar:
                    self.stomp(b1, 0.6)
                    self.clap(b1 + 1, 0.5)
                continue
            stop_time = b1 in self.bass_out and (b1 + 2) in self.bass_out
            if base == "intro":
                self.stomp(b1, 0.7)
                self.stomp(b1 + 2, 0.65)
                if rel >= 2:
                    self.clap(b1 + 1, 0.55)
                    self.clap(b1 + 3, 0.6)
                if rel == 3:
                    self.shout(self.B(bar, 4), "HEY", 0.9, 10, "intro")
            elif base == "verse":
                if stop_time:
                    self.stomp(b1, 0.7)
                    self.clap(b1 + 1, 0.45)
                else:
                    self.stomp(b1, 0.75)
                    self.stomp(b1 + 2, 0.7)
                    self.clap(b1 + 1, 0.55)
                    self.clap(b1 + 3, 0.6)
                if sec == "verse3":           # the boogie verse: cowbell drives it
                    for k in range(4):
                        self.cowbell(b1 + k, 0.55 if k else 0.7)
                # phrase ends: the drummer's fill bars (every 4th bar) get a HEY on beat 4 if the vocal is free
                if (rel + 1) % 4 == 0:
                    self.shout(self.B(bar, 4), "HEY", 0.9, 10, "phrase_end")
            elif base == "prechorus":
                if bar == lastb:              # the walk-up E E F# G#: stomp every beat, HUP HUP HEY into the chorus
                    for k in range(4):
                        self.stomp(b1 + k, 0.8 + 0.05 * k, 3)
                        self.clap(b1 + k, 0.6)
                    self.shout(self.B(bar, 1), "HUP", 0.9, 10, "walkup")
                    self.shout(self.B(bar, 2), "HUP", 0.9, 10, "walkup")
                    self.shout(self.B(bar, 3), "HEY", 1.0, 12, "walkup")
                else:
                    self.stomp(b1, 0.8)
                    self.stomp(b1 + 2, 0.75)
                    self.clap(b1 + 1, 0.6)
                    self.clap(b1 + 3, 0.65)
            elif base == "chorus":
                big = sec == "chorus4"
                v = 12 if not big else 16
                if rel == 6:                  # hook A: the band's B-A-G-F# walkdown hits -> everyone slams
                    for k in range(4):
                        self.stomp(b1 + k, 0.95, 4)
                        self.clap(b1 + k, 0.8)
                        self.cowbell(b1 + k, 0.8)
                else:
                    self.stomp(b1, 0.9, 3 if big else 2)
                    self.stomp(b1 + 2, 0.85, 3 if big else 2)
                    self.clap(b1 + 1, 0.75)
                    self.clap(b1 + 3, 0.8)
                    for k in range(4):
                        self.cowbell(b1 + k, 0.75 if k == 0 else 0.6)
                    if big:
                        for k in range(4):
                            self.cowbell(self.at(b1 + k + SWUNG), 0.4)
                if rel in (1, 3):             # line tails: HEY in the gap (collision-checked)
                    for bb in (2, 3, 4):
                        self.shout(self.B(bar, bb), "HEY", 0.95, v, "chorus_gap")
            elif base == "tag":
                self.stomp(b1, 0.85, 2)
                self.stomp(b1 + 2, 0.8)
                self.clap(b1 + 1, 0.7)
                self.clap(b1 + 3, 0.75)
                for k in range(4):
                    self.cowbell(b1 + k, 0.6)
            elif base == "turnaround":        # B7 stabs on every beat: stomp + clap on every beat
                for k in range(4):
                    self.stomp(b1 + k, 0.85, 3)
                    self.clap(b1 + k, 0.7)
                if rel == 0:
                    self.shout(self.B(bar, 1), "HEY", 1.0, 12, "turnaround")
                    self.shout(self.B(bar, 3), "HEY", 1.0, 12, "turnaround")
                else:
                    self.shout(self.B(bar, 1), "HUP", 0.95, 12, "turnaround")
                    self.shout(self.B(bar, 2), "HUP", 0.95, 12, "turnaround")
                    self.shout(self.B(bar, 3), "HEY", 1.0, 12, "turnaround")
            elif base == "breakdown":         # the Black Betty stomp
                self.stomp(b1, 0.95, 4)
                self.stomp(self.at(b1 + 1 + SWUNG), 0.7, 2)
                self.stomp(b1 + 2, 0.9, 4)
                self.clap(b1 + 1, 0.8)
                self.clap(b1 + 3, 0.85)
                for k in range(4):
                    self.cowbell(b1 + k, 0.6)
                    self.cowbell(self.at(b1 + k + SWUNG), 0.4)
                if rel % 2 == 1:
                    self.shout(self.B(bar, 4), "HEY", 1.0, 12, "breakdown")
            elif base == "outro":
                self.stomp(b1, 0.85, 3)
                self.stomp(b1 + 2, 0.8, 2)
                self.clap(b1 + 1, 0.7)
                self.clap(b1 + 3, 0.75)
                for k in range(4):
                    self.cowbell(b1 + k, 0.6)
                if bar % 2 == 1 and bar >= 109:   # answer the tag: HEY HEY in its gap
                    self.shout(self.B(bar, 1), "HEY", 1.0, 14, "tag_answer")
                    self.shout(self.B(bar, 2), "HEY", 1.0, 14, "tag_answer")
        return self
