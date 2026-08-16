from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
problems = []
html = (ROOT / "index.html").read_text(encoding="utf-8")

# HTML local href/src references.
for value in re.findall(r'\b(?:src|href)=["\']([^"\']+)["\']', html):
    if value.startswith(("http://", "https://", "data:", "#", "mailto:")):
        continue
    target = (ROOT / value.lstrip("./")).resolve()
    if not target.exists():
        problems.append(f"HTML missing: {value} -> {target}")

# Resolve url(...) from every stylesheet actually loaded by index.html.
stylesheets = re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\']', html, flags=re.I)
for value in stylesheets:
    if value.startswith(("http://", "https://", "data:")):
        continue
    css = (ROOT / value.lstrip("./")).resolve()
    if not css.exists():
        continue
    text = css.read_text(encoding="utf-8")
    for raw in re.findall(r"url\(([^)]+)\)", text, flags=re.I):
        asset = raw.strip().strip('"\'')
        if not asset or asset.startswith(("data:", "http://", "https://", "#")):
            continue
        target = (css.parent / asset).resolve()
        if not target.exists():
            problems.append(f"CSS missing: {css.name}: {asset} -> {target}")

# Service worker paths still have to point at real files even while SW is disabled in dev mode.
sw = (ROOT / "sw.js").read_text(encoding="utf-8")
for value in re.findall(r'["\'](\./[^"\']+)["\']', sw):
    if value == "./":
        continue
    target = (ROOT / value[2:]).resolve()
    if not target.exists():
        problems.append(f"SW missing: {value} -> {target}")

assert not problems, "\n".join(problems)
print(f"OK: resource paths — HTML and {len(stylesheets)} deployed stylesheets resolve locally")
