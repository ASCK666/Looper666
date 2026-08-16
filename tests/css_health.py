from pathlib import Path
import re
from css_parser import parse_stylesheet

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SOURCE = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in [ROOT / "index.html", *sorted((ROOT / "js").glob("*.js"))])
TOKENS = set(re.findall(r"[A-Za-z_][A-Za-z0-9_-]*", SOURCE))

stylesheets = [
    ROOT / href.lstrip("./")
    for href in re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\']', HTML, flags=re.I)
    if not href.startswith(("http://", "https://", "data:"))
]


def impossible(selector):
    required = (
        re.findall(r"[#.]([A-Za-z_][\w-]*)", selector)
        + re.findall(r"\[\s*([A-Za-z_][\w-]*)", selector)
    )

    def known(token):
        if token in TOKENS:
            return True
        if token.startswith("data-"):
            parts = token[5:].split("-")
            dataset_name = parts[0] + "".join(part.title() for part in parts[1:])
            return dataset_name in TOKENS
        return False

    return any(not known(token) for token in required)


problems = []
selector_count = 0
for css in stylesheets:
    text = css.read_text(encoding="utf-8")
    rules, _ = parse_stylesheet(text)
    if not rules:
        problems.append(f"{css.name}: no CSS rules parsed")
        continue
    selectors = [selector for rule in rules for selector in rule.selectors]
    selector_count += len(selectors)
    dead = [selector for selector in selectors if impossible(selector)]
    if dead:
        problems.append(f"{css.name}: unreachable selectors: {dead[:20]}")

assert not problems, "\n".join(problems)
print(f"OK: CSS health — {len(stylesheets)} deployed stylesheets, {selector_count} selector branches")
