#!/usr/bin/env python3
"""Protect the responsive layered-cassette insertion contract."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "assets" / "looper-ui" / "cassette-runtime.css").read_text(encoding="utf-8")
RUNTIME = (ROOT / "js" / "cassette-runtime.js").read_text(encoding="utf-8")
LOOPER = (ROOT / "js" / "looper.js").read_text(encoding="utf-8")

required_css = [
    ".cassette-runtime-cavity-backdrop",
    ".cassette-runtime-aperture",
    ".cassette-runtime-cartridge",
    ".cassette-runtime-glass {",
    ".cassette-runtime-support {",
    "@keyframes cassette-runtime-insert",
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
    'makeImg("cassette-runtime-asset cassette-runtime-glass",source("glass"))',
    "objectUrl:URL.createObjectURL(blob)",
    "releaseVerifiedSources",
    "setPlaybackRate",
    "animateInsertion",
]:
    assert token in RUNTIME, f"Missing cassette runtime contract: {token}"

assert "tapePath:" not in RUNTIME, "Legacy tape-path PNG must not remain in the runtime integrity gate"
assert "tape-strand" not in CSS + RUNTIME, "Converging tape strands must stay removed"
assert "cassette-runtime-full-layer" not in CSS + RUNTIME, "Cropped assets must not decode as full-canvas layers"
assert "cassette-runtime-glass::" not in CSS, "Glass reflections must come from the transparent asset, not CSS pseudo-elements"
assert RUNTIME.index('makeImg("cassette-runtime-asset cassette-runtime-glass"') < RUNTIME.index('makeImg("cassette-runtime-asset cassette-runtime-support"'), "The lower support must mount after and mask the glass"
assert 'width:554,height:250,alphaBBox:[0,0,554,250]' in RUNTIME, "Cassette shell/cavity assets must stay cropped"
assert 'width:604,height:278,alphaBBox:[0,0,604,278]' in RUNTIME, "Habitacle glass asset must stay cropped"
assert "CassetteLayerRuntime?.animateInsertion?.()" in LOOPER, "Loaded beats must trigger cassette insertion"
assert "clip-path:inset(10.83984375%" in CSS, "Cartridge motion must stay clipped to the full habitacle aperture"

print("OK: cassette runtime — fixed habitacle mask, moving cartridge and transparent glass asset")
