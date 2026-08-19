#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'assets/looper-ui/overlay.css'
ASSET = ROOT / 'assets/looper-ui/cassette/cassette-static.webp'

EXPECTED_ASSET_SHA256 = 'caf2f5596ae081b58d6860e8a5d54c184c764ad003188421b159293be2ed1508'
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

print('OK: cassette asset checksum and reel axes are locked to historic centres')
