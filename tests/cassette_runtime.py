#!/usr/bin/env python3
"""Protect the responsive layered-cassette insertion contract."""

from pathlib import Path
from PIL import Image

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

faceplate = Image.open(ROOT / "assets" / "looper-ui" / "faceplate.webp").convert("RGBA")
assert faceplate.size == (1536, 1024), "Faceplate registration changed"
button_regions = [
    (392, 468, 535, 566), (544, 468, 688, 566), (696, 468, 840, 566),
    (849, 468, 993, 566), (1003, 468, 1149, 566),
    (1325, 99, 1492, 221), (1325, 233, 1492, 364),
]
alpha = faceplate.getchannel("A")
assert all(alpha.crop(box).getextrema()[0] == 0 for box in button_regions), "Every main button must expose transparent light channels"
outside = Image.new("L", faceplate.size, 255)
for box in button_regions:
    outside.paste(0, box)
assert Image.composite(alpha, Image.new("L", faceplate.size, 255), outside).getextrema()[0] == 255, "Transparency leaked outside button regions"

legacy_label_region = faceplate.crop((560, 154, 993, 191)).convert("L")
legacy_label_mean = sum(value * count for value, count in enumerate(legacy_label_region.histogram())) / (255 * legacy_label_region.width * legacy_label_region.height)
assert legacy_label_mean < 0.35, "The obsolete fallback cassette banner/text returned"

cavity = Image.open(ROOT / "assets" / "looper-ui" / "cassette-cavity.png").convert("RGBA")
assert cavity.getchannel("A").getextrema() == (255, 255), "Cassette cavity must block fallback V-shaped bands"

OVERLAY = (ROOT / "assets" / "looper-ui" / "overlay.css").read_text(encoding="utf-8")
BOOTSTRAP = (ROOT / "js" / "bootstrap.js").read_text(encoding="utf-8")
assert ".asset-button-light" in OVERLAY and "installButtonBacklights" in BOOTSTRAP, "CSS button backlights are not installed"
assert "--speed-light-level" in OVERLAY + BOOTSTRAP, "Speed lamp intensity is not CSS-controlled"
assert "Math.min(50,speedLevel+1)" in BOOTSTRAP and "Math.min(50,Number(level)" in BOOTSTRAP, "Speed must expose exactly 50 incremental clicks"
assert 'addAssetReadout(looper,"asset-cassette-label-readout","")' in BOOTSTRAP, "Cassette label must start without a legacy loading banner"
assert ".cassette-runtime-backlight::before" in CSS and ".cassette-runtime-backlight::after" in CSS and "opacity:.64" in CSS, "The restrained idle habitacle backlight is missing"
assert "--asset-lamp:#f4e28a" in OVERLAY and "asset-play-idle-glow" in OVERLAY, "Play must pulse in the shared yellow-gold lamp palette while idle"

print("OK: cassette runtime — clean fallback, shiny habitacle, V-band blocker and progressive CSS button lamps")
