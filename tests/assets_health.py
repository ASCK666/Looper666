#!/usr/bin/env python3
"""Reject retired visual assets that silently inflate deployable archives."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
EXPECTED_VISUALS = {
    "cassette-mechanism-pixel-v84.png",
    "cassette-reel-pixel-v81.png",
    "deck-black-ui-texture.png",
}

actual_visuals = {
    path.name
    for path in ASSETS.iterdir()
    if path.is_file()
}
unexpected = sorted(actual_visuals - EXPECTED_VISUALS)
missing = sorted(EXPECTED_VISUALS - actual_visuals)

if missing or unexpected:
    if missing:
        print(f"FAIL: missing production assets: {', '.join(missing)}")
    if unexpected:
        print(f"FAIL: untracked top-level assets: {', '.join(unexpected)}")
    sys.exit(1)

print("OK: asset health — 3 production visuals, no retired deck artwork")
