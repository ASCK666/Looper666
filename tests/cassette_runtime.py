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
    ".cassette-runtime-glass::before",
    ".cassette-runtime-glass::after",
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
    'makeLayer("cassette-runtime-glass")',
    "animateInsertion",
    "animateEjection",
]:
    assert token in RUNTIME, f"Missing cassette runtime contract: {token}"

assert "tapePath:" not in RUNTIME, "Legacy tape-path PNG must not remain in the runtime integrity gate"
assert "tape-strand" not in CSS + RUNTIME, "Converging tape strands must stay removed"
assert "glass:" not in RUNTIME, "Glass is CSS-owned and must not remain in the binary integrity gate"
assert "CassetteLayerRuntimeStaged?.animateInsertion?.()" in LOOPER, "Loaded beats must trigger cassette insertion"
assert "clip-path:inset(11.5234375%" in CSS, "Cartridge motion must stay clipped to the fixed glass aperture"

print("OK: cassette runtime — opaque cavity, fixed aperture, moving cartridge and edge-anchored CSS glass")
