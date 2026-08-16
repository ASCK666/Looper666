from pathlib import Path
from collections import defaultdict
import re
from css_parser import parse_stylesheet

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
PROJECT = "\n".join(
    path.read_text(encoding="utf-8", errors="ignore")
    for path in ROOT.rglob("*")
    if path.is_file() and path.suffix.lower() in {".css", ".html", ".js"}
)

stylesheets = [
    ROOT / href.lstrip("./")
    for href in re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\']', HTML, flags=re.I)
    if not href.startswith(("http://", "https://", "data:"))
]
combined = "\n".join(path.read_text(encoding="utf-8") for path in stylesheets)
rules, keyframes = parse_stylesheet(combined)

# Every design token defined by the deployed CSS stack must have a consumer.
definitions = set(re.findall(r"(--[\w-]+)\s*:", combined))
references = set(re.findall(r"var\(\s*(--[\w-]+)", PROJECT))
unused_vars = sorted(definitions - references)
assert not unused_vars, f"unused custom properties: {unused_vars}"

unused_frames = []
for name, line in keyframes:
    if len(re.findall(r"(?<![\w-])" + re.escape(name) + r"(?![\w-])", PROJECT)) <= 1:
        unused_frames.append((name, line))
assert not unused_frames, f"unused keyframes: {unused_frames}"

# Conservative exact-selector shadow detection across the deployed cascade.
occurrences = defaultdict(list)
for rule_index, rule in enumerate(rules):
    for declaration_index, declaration in enumerate(rule.declarations):
        for branch in rule.selectors:
            occurrences[(rule.context, branch, declaration.name)].append(
                (rule_index, declaration_index, declaration)
            )

shadowed = []
for rule_index, rule in enumerate(rules):
    for declaration_index, declaration in enumerate(rule.declarations):
        shadowed_for_every_branch = all(
            any(
                (later_rule > rule_index or (later_rule == rule_index and later_decl > declaration_index))
                and (not declaration.important or later.important)
                for later_rule, later_decl, later in occurrences[(rule.context, branch, declaration.name)]
            )
            for branch in rule.selectors
        )
        if shadowed_for_every_branch:
            shadowed.append((rule.line, ", ".join(rule.selectors), declaration.name))

assert not shadowed, f"fully shadowed declarations remain: {shadowed[:20]}"
print(
    f"OK: CSS redundancy — {len(stylesheets)} deployed stylesheets, "
    f"{len(definitions)} used custom properties, no unused keyframes or exact shadowing"
)
