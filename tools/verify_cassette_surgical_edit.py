#!/usr/bin/env python3
"""Verify that a Looper cassette reconstruction is surgically bounded.

The baseline canvas is fixed at 1536x1024. The candidate mask below is
conservative: it covers only the visible cassette body area and explicitly
excludes the lower foreground support.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw

CANVAS = (1536, 1024)

# Conservative cassette body polygon in native faceplate coordinates.
# This is the only region where faceplate pixels may differ during the
# cassette-removal/reconstruction phase unless the mask is explicitly revised.
CASSETTE_EDIT_POLYGON = [
    (503, 137),
    (1044, 137),
    (1050, 145),
    (1050, 374),
    (1040, 386),
    (507, 386),
    (497, 376),
    (497, 148),
]

# Hard keep-out: current foreground support that occludes the lower cassette.
SUPPORT_KEEPOUT = (483, 387, 1067, 453)


def build_allowed_mask() -> np.ndarray:
    mask = Image.new("L", CANVAS, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(CASSETTE_EDIT_POLYGON, fill=255)
    # Explicitly clear support keep-out even though polygon already stops above it.
    draw.rectangle(SUPPORT_KEEPOUT, fill=0)
    return np.asarray(mask) > 0


def load_rgba(path: Path) -> np.ndarray:
    image = Image.open(path).convert("RGBA")
    if image.size != CANVAS:
        raise ValueError(f"{path}: expected {CANVAS[0]}x{CANVAS[1]}, got {image.size[0]}x{image.size[1]}")
    return np.asarray(image)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("before", type=Path, help="approved baseline faceplate")
    parser.add_argument("after", type=Path, help="candidate edited faceplate")
    parser.add_argument("--write-mask", type=Path, help="write the current allowed mask as PNG")
    args = parser.parse_args()

    allowed = build_allowed_mask()
    if args.write_mask:
        Image.fromarray((allowed.astype(np.uint8) * 255), "L").save(args.write_mask)

    before = load_rgba(args.before)
    after = load_rgba(args.after)

    changed = np.any(after != before, axis=2)
    outside = changed & ~allowed

    changed_total = int(changed.sum())
    changed_inside = int((changed & allowed).sum())
    changed_outside = int(outside.sum())

    print(f"changed_total={changed_total}")
    print(f"changed_inside_allowed={changed_inside}")
    print(f"changed_outside_allowed={changed_outside}")

    if changed_outside:
        ys, xs = np.where(outside)
        print(
            "FAIL: pixels changed outside approved cassette mask; "
            f"outside_bbox=x{xs.min()}..{xs.max()},y{ys.min()}..{ys.max()}",
            file=sys.stderr,
        )
        return 1

    print("PASS: 0 changed pixels outside approved cassette mask")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
