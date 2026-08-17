#!/usr/bin/env python3
"""Validate current runtime structure without freezing historical implementation details."""

from collections import Counter
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
RUNTIME_FILES = [
    ROOT / "js" / "bootstrap.js",
    ROOT / "js" / "core.js",
    ROOT / "js" / "looper.js",
    ROOT / "js" / "practice.js",
    ROOT / "js" / "chopper.js",
    ROOT / "js" / "drums.js",
    ROOT / "js" / "events.js",
]
JS = "\n".join(path.read_text(encoding="utf-8") for path in RUNTIME_FILES)
SW = (ROOT / "sw.js").read_text(encoding="utf-8")

failures = []

def require(name, condition, detail=""):
    if not condition:
        failures.append(f"{name}{': ' + detail if detail else ''}")

# Only current deployable runtime files belong here. Feature-level behavior is
# covered by the focused browser/regression tests in this suite.
for rel in [
    "index.html",
    "manifest.json",
    "sw.js",
    "css/base.css",
    "js/bootstrap.js",
    "js/core.js",
    "js/looper.js",
    "js/practice.js",
    "js/chopper.js",
    "js/drums.js",
    "js/events.js",
    "assets/cassette-mechanism-pixel-v84.png",
    "assets/cassette-reel-pixel-v81.png",
    "assets/deck-black-ui-texture.png",
]:
    require(f"file {rel}", (ROOT / rel).is_file())

ids = re.findall(r'\bid="([^"]+)"', HTML)
duplicates = sorted(name for name, count in Counter(ids).items() if count > 1)
require("no duplicate ids", not duplicates, ", ".join(duplicates))

literal_dom_refs = sorted(set(re.findall(r'\$\("([^"]+)"\)', JS)))
missing_refs = [name for name in literal_dom_refs if f'id="{name}"' not in HTML]
require("all literal $() DOM refs exist", not missing_refs, ", ".join(missing_refs))

# Every classic runtime script must remain syntactically valid on its own.
for path in [*RUNTIME_FILES, ROOT / "sw.js"]:
    proc = subprocess.run(
        ["node", "--check", str(path)],
        capture_output=True,
        text=True,
    )
    require(f"node --check {path.name}", proc.returncode == 0, proc.stderr.strip())

# Generic security/runtime invariants. A worker that intercepts requests must
# retain the same-origin and bounded-cache guards. During active Pages UI work,
# a no-fetch retirement worker is also valid but must explicitly purge/unregister.
sw_intercepts_fetch = bool(re.search(r'addEventListener\s*\(\s*["\']fetch["\']', SW))
if sw_intercepts_fetch:
    require("service worker same-origin guard", "url.origin!==self.location.origin" in SW)
    require("service worker bounded cache", "STATIC_PATHS.has(url.pathname)" in SW)
else:
    require("service worker retirement unregister", "self.registration.unregister()" in SW)
    require("service worker retirement cache purge", "scratch-practice-" in SW and "caches.keys()" in SW)

require("no eval", "eval(" not in JS)
require("no dynamic Function constructor", "new Function" not in JS)
require("no document.write", "document.write" not in JS)
require("no insertAdjacentHTML", "insertAdjacentHTML" not in JS)
require("no remote application URLs", not re.search(r"https?://", HTML + JS))

inner_html = [m.group(0) for m in re.finditer(r"\.innerHTML\s*=\s*([^;]+);", JS)]
unsafe_inner_html = [
    expr for expr in inner_html
    if not re.search(r"innerHTML\s*=\s*[\"']{2}", expr)
]
require("innerHTML only clears trusted UI", not unsafe_inner_html, "; ".join(unsafe_inner_html))

# Keep the few cross-cutting safety guards that are not implementation-location
# contracts and are cheap to verify statically.
for token in ["MAX_BEAT_FILE_BYTES", "MAX_SAMPLE_FILE_BYTES", "MAX_DRUM_FILE_BYTES"]:
    require(f"local file guard {token}", token in JS)
require("local UUID fallback", "function localId()" in JS)
require("Windows filename hardening", "CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]" in JS)

if failures:
    for failure in failures:
        print(f"FAIL: {failure}")
    sys.exit(1)

print(
    "OK: runtime contract — deployable files, DOM refs, JS syntax and generic security guards"
)
