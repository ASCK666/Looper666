#!/usr/bin/env python3
"""Small dependency-free JavaScript hygiene checks."""

from collections import Counter
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
JS_FILES = sorted((ROOT / "js").glob("*.js")) + [ROOT / "sw.js"]
RUNTIME = "\n".join(path.read_text(encoding="utf-8") for path in JS_FILES)

function_pattern = re.compile(
    r"^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(", re.MULTILINE
)
top_level_binding_pattern = re.compile(
    r"^(?:const|let)\s+([A-Za-z_$][\w$]*)\b", re.MULTILINE
)

functions = [
    (path, name)
    for path in JS_FILES
    for name in function_pattern.findall(path.read_text(encoding="utf-8"))
]
function_counts = Counter(name for _, name in functions)
duplicate_functions = sorted(name for name, count in function_counts.items() if count > 1)

dead_functions = sorted(
    f"{path.relative_to(ROOT)}:{name}"
    for path, name in functions
    if len(re.findall(rf"\b{re.escape(name)}\b", RUNTIME)) == 1
)

bindings = [
    (path, name)
    for path in JS_FILES
    for name in top_level_binding_pattern.findall(path.read_text(encoding="utf-8"))
]
dead_bindings = sorted(
    f"{path.relative_to(ROOT)}:{name}"
    for path, name in bindings
    if len(re.findall(rf"\b{re.escape(name)}\b", RUNTIME)) == 1
)

forbidden = {
    "debugger statement": re.compile(r"\bdebugger\s*;"),
    "console.log": re.compile(r"\bconsole\.log\s*\("),
    "TODO/FIXME marker": re.compile(r"\b(?:TODO|FIXME)\b"),
    "legacy tape-counter runtime": re.compile(
        r"\b(?:tapeCounterUnits|tapeCounterTimer|tapeCounterLastCtxTime|"
        r"formatTapeCounter|refreshTapeCounter|resetTapeCounter|"
        r"startTapeCounter|stopTapeCounter|TAPE_COUNTER_INTERVAL_MS|"
        r"STANDARD_TAPE_SPEED_CM_PER_SECOND|TAPE_COUNTER_CM_PER_UNIT)\b"
    ),
    "hidden AUTO status bridge": re.compile(r"\bautoLooperCompactStatus\b"),
}
forbidden_hits = [name for name, pattern in forbidden.items() if pattern.search(RUNTIME)]

failures = []
if duplicate_functions:
    failures.append(f"duplicate function declarations: {', '.join(duplicate_functions)}")
if dead_functions:
    failures.append(f"unreferenced function declarations: {', '.join(dead_functions)}")
if dead_bindings:
    failures.append(f"unreferenced top-level bindings: {', '.join(dead_bindings)}")
if forbidden_hits:
    failures.append(f"forbidden debug/runtime residue: {', '.join(forbidden_hits)}")

if failures:
    for failure in failures:
        print(f"FAIL: {failure}")
    sys.exit(1)

print(
    "OK: JavaScript health — "
    f"{len(functions)} functions, {len(bindings)} top-level bindings, no dead declarations"
)
