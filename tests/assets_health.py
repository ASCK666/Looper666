#!/usr/bin/env python3
"""Verify the visual assets required by the current deck UI."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

REQUIRED_VISUALS = {
    "cassette-mechanism-pixel-v95.png",
    "cassette-mechanism-pixel-v84.png",  # fallback while the refactor settles
    "cassette-reel-pixel-v81.png",
    "deck-black-ui-texture.png",
    "deck-buttons-backlight-idle.png",
    "deck-button-prev-backlight-active.png",
    "deck-button-play-backlight-active.png",
    "deck-button-stop-backlight-active.png",
    "deck-button-next-backlight-active.png",
    "deck-button-auto-backlight-active.png",
}

missing = sorted(name for name in REQUIRED_VISUALS if not (ASSETS / name).is_file())
assert not missing, f"missing production visual assets: {missing}"

empty = sorted(name for name in REQUIRED_VISUALS if (ASSETS / name).stat().st_size == 0)
assert not empty, f"empty production visual assets: {empty}"

print(f"OK: asset health — {len(REQUIRED_VISUALS)} current deck/reel/backlight assets present")
