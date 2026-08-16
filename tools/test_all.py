#!/usr/bin/env python3
"""Run the maintained, non-destructive project checks."""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

# Keep this list short and trustworthy. Historical version-regression scripts and
# the retired css/src builder are intentionally not part of the maintained suite.
STEPS = [
    ["tests/resource_paths.py"],
    ["tests/assets_health.py"],
    ["tests/audio_assets.py"],
    ["tests/js_health.py"],
    ["tests/core_unit.js"],
    ["tests/css_health.py"],
    ["tests/css_redundancy.py"],
    ["tests/http_smoke.py"],
    ["tests/browser_smoke.py"],
    ["tests/chopper_ui.py"],
]

for args in STEPS:
    path = ROOT / args[0]
    print(f"\n=== {args[0]} ===", flush=True)
    command = ["node", str(path), *args[1:]] if path.suffix == ".js" else [sys.executable, str(path), *args[1:]]
    subprocess.run(command, cwd=ROOT, check=True)

print("\nALL MAINTAINED PROJECT CHECKS PASSED")
