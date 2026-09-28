"""Per-song instrument switch: synthesized palette vs sampled (real-recording) alternatives.

    from instruments.palette import Palette
    P = Palette(use_samples=True)                        # everything sampled that can be
    P = Palette(use_samples={"drums", "piano", "cab"})   # pick per family; the rest stays synthesized
    P = Palette(use_samples=False)                       # the original all-synth palette (default)

    kit   = s.track("drums", P.kit(), ...)                               # RockKit        | SampledKit
    gtr   = s.track("gtr", P.rhythm_guitar(voicing="crunch", gain=1.1), ...)  # RhythmGuitar | IRRhythmGuitar
    lead  = s.track("lead", P.lead_guitar(gain=1.0), ...)                # LeadGuitar     | IRLeadGuitar
    piano = s.track("piano", P.piano(), ...)                             # HonkyTonkPiano | SampledPiano(honky=..)
    hey   = s.track("shouts", P.shouts(voices=10), ...)                  # GangShouts     | SampledGangShouts

Families: "drums", "piano", "cab" (guitar cab IRs, rhythm + lead), "shouts". Constructor kwargs are passed to
whichever class is chosen; kwargs meant for only one side go in `synth=`/`sampled=` dicts, e.g.
`P.piano(sampled=dict(honky=10), synth=dict(detune_cents=11))`. If the sample cache is missing, sampled
families fall back to synth with a warning (so a fresh checkout still renders) unless `strict=True`.
"""
from __future__ import annotations

import sys

FAMILIES = ("drums", "piano", "cab", "shouts")


class Palette:
    def __init__(self, use_samples: bool | set | list | tuple | dict = False, strict: bool = False):
        if use_samples is True:
            fam = set(FAMILIES)
        elif not use_samples:
            fam = set()
        elif isinstance(use_samples, dict):
            fam = {k for k, v in use_samples.items() if v}
        else:
            fam = set(use_samples)
        bad = fam - set(FAMILIES)
        if bad:
            raise ValueError(f"unknown sample families {bad}; use {FAMILIES}")
        self.fam = fam
        self.strict = strict

    def sampled(self, family: str) -> bool:
        return family in self.fam

    def _make(self, family, synth_cls, sampled_cls, kw, synth, sampled):
        if family in self.fam:
            try:
                return sampled_cls(**{**kw, **(sampled or {})})
            except FileNotFoundError as e:
                if self.strict:
                    raise
                print(f"[palette] {family}: samples unavailable ({e}); using the synthesized instrument", file=sys.stderr)
        return synth_cls(**{**kw, **(synth or {})})

    def kit(self, synth=None, sampled=None, **kw):
        from .drums import RockKit
        from .sampled import SampledKit
        return self._make("drums", RockKit, SampledKit, kw, synth, sampled)

    def piano(self, synth=None, sampled=None, **kw):
        from .keys import HonkyTonkPiano
        from .sampled import SampledPiano
        sampled = {"honky": 9.0, **(sampled or {})}
        return self._make("piano", HonkyTonkPiano, SampledPiano, kw, synth, sampled)

    def rhythm_guitar(self, synth=None, sampled=None, **kw):
        from .guitar import RhythmGuitar
        from .sampled import IRRhythmGuitar
        return self._make("cab", RhythmGuitar, IRRhythmGuitar, kw, synth, sampled)

    def lead_guitar(self, synth=None, sampled=None, **kw):
        from .guitar import LeadGuitar
        from .sampled import IRLeadGuitar
        return self._make("cab", LeadGuitar, IRLeadGuitar, kw, synth, sampled)

    def shouts(self, synth=None, sampled=None, **kw):
        from .vocals import GangShouts
        from .sampled import SampledGangShouts
        return self._make("shouts", GangShouts, SampledGangShouts, kw, synth, sampled)
