#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'assets/looper-ui/overlay.css'
ASSET = ROOT / 'assets/looper-ui/cassette/cassette-static.webp'
LABEL_ASSET = ROOT / 'assets/looper-ui/cassette/cassette-label-occlusion.webp'

EXPECTED_ASSET_SHA256 = 'c5dd70a125e77b220d454e8b822a6fac0b18459674a3c852ec7bc61053f50db7'
EXPECTED_LABEL_SHA256 = '22c91b51ff6c7615c5cb31766331ff6084fcc575ee36930224ff68308df50cdb'
EXPECTED_CENTERS = ((648.0, 249.0), (894.0, 249.0))
CANVAS = (1536.0, 1024.0)

css = CSS.read_text()
marker = '/* Layered cassette cutover: static cabin/cassette layer + exact faceplate reel crops. */'
assert marker in css
tail = css[css.rfind(marker):]

container = re.search(
    r'#looper\.asset-ui \.asset-cassette-glow\{\s*'
    r'left:([0-9.]+)%;\s*top:([0-9.]+)%;\s*'
    r'width:([0-9.]+)%;\s*height:([0-9.]+)%;',
    tail,
    re.S,
)
reels = re.search(
    r'#looper\.asset-ui \.asset-cassette-glow::before,\s*'
    r'#looper\.asset-ui \.asset-cassette-glow::after\{\s*'
    r'top:([0-9.]+)%;\s*width:([0-9.]+)%;',
    tail,
    re.S,
)
left = re.search(r'\.asset-cassette-glow::before\{left:([0-9.]+)%\}', tail)
right = re.search(r'\.asset-cassette-glow::after\{left:([0-9.]+)%\}', tail)
assert container and reels and left and right

left_pct, top_pct, width_pct, height_pct = map(float, container.groups())
reel_top_pct, reel_width_pct = map(float, reels.groups())
left_reel_pct = float(left.group(1))
right_reel_pct = float(right.group(1))

x0 = CANVAS[0] * left_pct / 100.0
y0 = CANVAS[1] * top_pct / 100.0
cw = CANVAS[0] * width_pct / 100.0
ch = CANVAS[1] * height_pct / 100.0
rw = cw * reel_width_pct / 100.0
rh = rw
ry = y0 + ch * reel_top_pct / 100.0 + rh / 2.0

centers = (
    (x0 + cw * left_reel_pct / 100.0 + rw / 2.0, ry),
    (x0 + cw * right_reel_pct / 100.0 + rw / 2.0, ry),
)

for actual, expected in zip(centers, EXPECTED_CENTERS):
    assert abs(actual[0] - expected[0]) < 0.05, (centers, EXPECTED_CENTERS)
    assert abs(actual[1] - expected[1]) < 0.05, (centers, EXPECTED_CENTERS)

digest = hashlib.sha256(ASSET.read_bytes()).hexdigest()
assert digest == EXPECTED_ASSET_SHA256, (digest, EXPECTED_ASSET_SHA256)

label_digest = hashlib.sha256(LABEL_ASSET.read_bytes()).hexdigest()
assert label_digest == EXPECTED_LABEL_SHA256, (label_digest, EXPECTED_LABEL_SHA256)

label_marker = '/* Cassette label occlusion: sticker plate above tape, below dynamic title. */'
assert label_marker in css
label_tail = css[css.rfind(label_marker):]
label_layer = re.search(
    r'#looper\.asset-ui::after\{\s*content:"";\s*position:absolute;\s*z-index:8;\s*'
    r'left:35\.7421875%;\s*top:14\.84375%;\s*width:28\.2552083333%;\s*height:4\.4921875%;',
    label_tail,
    re.S,
)
assert label_layer
assert 'cassette-label-occlusion.webp' in label_tail
assert '.asset-readout' in css and 'z-index:9' in css

print('OK: cassette/reel axes and sticker occlusion layer are locked to canonical geometry')
