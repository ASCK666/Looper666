#!/usr/bin/env python3
from pathlib import Path
import subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
steps=[
  ['tests/resource_paths.py'],
  ['tests/dead_code.py'],
  ['tests/assets_health.py'],
  ['tests/cassette_alignment.py'],
  ['tests/validate.py'],
  ['tests/js_health.py'],
  ['tests/core_unit.js'],
  ['tests/regression_v63.py'],
  ['tests/css_health.py'],
  ['tests/css_redundancy.py'],
  ['tests/css_layout.py'],
  ['tests/header_responsive.py'],
  ['tests/chopper_ui.py'],
  ['tests/chopper_sampler_layout.py'],
  ['tests/drum_ui.py'],
  ['tests/punch_master.py'],
  ['tests/http_smoke.py'],
  ['tests/browser_smoke.py'],
  ['tests/asset_render.py'],
]
for args in steps:
    path=ROOT/args[0]
    print(f'\n=== {args[0]} ===',flush=True)
    command=['node',str(path),*args[1:]] if path.suffix=='.js' else [sys.executable,str(path),*args[1:]]
    subprocess.run(command,cwd=ROOT,check=True)
print('\nALL PROJECT CHECKS PASSED')
