"""The palette demo score rendered with the SAMPLED instruments (real drums/percussion, Salamander piano with a
honky-tonk chorus, real 4x12 cab IRs on the guitars, gang shouts layered from real recordings).
Needs the sample cache: python3 tools/music/instruments/sample_cache.py (see tools/music/SAMPLES.md).

Render:  python3 tools/music/render.py tools/music/songs/palette_demo_sampled.py
"""
import importlib.util
import os

_spec = importlib.util.spec_from_file_location("palette_demo", os.path.join(os.path.dirname(os.path.abspath(__file__)), "palette_demo.py"))
_demo = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_demo)

MASTER = _demo.MASTER


def build():
    return _demo.build(use_samples=True, id="palette_demo_sampled", title="Palette Demo (stomp boogie, sampled)")
