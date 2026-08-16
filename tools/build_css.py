#!/usr/bin/env python3
"""Legacy CSS builder.

The current branch ships explicit component stylesheets from css/.  The older
css/src generation pipeline is intentionally disabled unless that source tree is
restored.  Failing before opening css/base.css prevents an obsolete debug
command from erasing production CSS.
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "css" / "src"
OUT = ROOT / "css" / "base.css"

if not SRC.is_dir():
    raise SystemExit(
        "CSS build disabled: css/src/ is not present on this branch. "
        "Edit the explicit stylesheets under css/ instead; css/base.css was not modified."
    )

pattern = re.compile(r"/\*\s*@sp-order\s+(\d+)\s*\*/\s*")
items = []
for path in sorted(SRC.glob("*.css")):
    text = path.read_text(encoding="utf-8")
    matches = list(pattern.finditer(text))
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        block = text[match.end():end].strip()
        if block:
            items.append((int(match.group(1)), path.name, block))

if not items:
    raise SystemExit("CSS build aborted: css/src/ contains no @sp-order fragments; css/base.css was not modified.")

orders = [item[0] for item in items]
if len(orders) != len(set(orders)):
    duplicates = sorted({value for value in orders if orders.count(value) > 1})
    raise SystemExit(f"Duplicate @sp-order values: {duplicates}")

items.sort(key=lambda item: item[0])
header = (
    "/* Scratch Practice - GENERATED production stylesheet.\n"
    "   Edit css/src/*.css, then run: python tools/build_css.py\n"
    "   Global fragment order is preserved by @sp-order markers. */\n\n"
)
output = header + "\n\n".join(block for _, _, block in items) + "\n"
OUT.write_text(output, encoding="utf-8")
print(f"Built {OUT.relative_to(ROOT)} from {len(items)} ordered fragments ({len(output.splitlines())} lines).")
