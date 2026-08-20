#!/usr/bin/env python3
"""Protect the responsive layered-cassette insertion contract."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "assets" / "looper-ui" / "cassette-runtime.staged.css").read_text(encoding="utf-8")
RUNTIME = (ROOT / "js" / "cassette-runtime.staged.js").read_text(encoding="utf-8")
LOOPER = (ROOT / "js" / "looper.js").read_text(encoding="utf-8")

required_css = [
    ".cassette-runtime-cavity-backdrop",
    ".cassette-runtime-aperture",
    ".cassette-runtime-cartridge",
    ".cassette-runtime-glass { z-index:8; }",
    ".cassette-runtime-support { z-index:9; }",
    "@keyframes cassette-runtime-insert",
    "@keyframes cassette-runtime-eject",
    "@media (max-width:760px)",
    "@media (prefers-reduced-motion:reduce)",
]
missing_css = [token for token in required_css if token not in CSS]
assert not missing_css, f"Missing cassette CSS contract: {', '.join(missing_css)}"

for token in [
    'makeLayer("cassette-runtime-cartridge")',
    'cartridge.appendChild(cassetteLabel)',
    'const aperture=makeLayer("cassette-runtime-aperture")',
    "aperture.appendChild(cartridge)",
    'makeLayer("cassette-runtime-cavity-backdrop")',
    'glass:"cassette-glass-habitacle.png"',
    'makeImg("cassette-runtime-full-layer cassette-runtime-glass",url(names.glass))',
    "animateInsertion",
    "animateEjection",
]:
    assert token in RUNTIME, f"Missing cassette runtime contract: {token}"

assert "tapePath:" not in RUNTIME, "Legacy tape-path PNG must not remain in the runtime integrity gate"
assert "tape-strand" not in CSS + RUNTIME, "Converging tape strands must stay removed"
assert "cassette-runtime-glass::" not in CSS, "Glass reflections must come from the transparent asset, not CSS pseudo-elements"
assert RUNTIME.index('makeImg("cassette-runtime-full-layer cassette-runtime-glass"') < RUNTIME.index('makeImg("cassette-runtime-full-layer cassette-runtime-support"'), "The lower support must mount after and mask the glass"
assert "CassetteLayerRuntimeStaged?.animateInsertion?.()" in LOOPER, "Loaded beats must trigger cassette insertion"
assert "clip-path:inset(10.83984375%" in CSS, "Cartridge motion must stay clipped to the full habitacle aperture"

print("OK: cassette runtime — fixed habitacle mask, moving cartridge and transparent glass asset")
