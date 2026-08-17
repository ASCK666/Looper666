from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "index.html"
RUNTIME_DIRS = (ROOT / "js", ROOT / "css")
RUNTIME_SUFFIXES = {".js", ".css"}
problems = []


def is_external(value):
    return value.startswith(("http://", "https://", "data:", "#", "mailto:", "blob:"))


def resolve_runtime_ref(source, value):
    clean = value.split("#", 1)[0].split("?", 1)[0].strip()
    if not clean or is_external(clean):
        return None

    if clean.startswith("/"):
        target = ROOT / clean.lstrip("/")
    else:
        target = source.parent / clean

    target = target.resolve()
    try:
        target.relative_to(ROOT)
    except ValueError:
        return None

    return target if target.suffix in RUNTIME_SUFFIXES else None


def runtime_refs(source):
    text = source.read_text(encoding="utf-8")
    values = []

    if source.suffix == ".html":
        values.extend(re.findall(r'\b(?:src|href)=["\']([^"\']+)["\']', text))
    else:
        values.extend(
            re.findall(r'["\']([^"\']+\.(?:js|css)(?:[?#][^"\']*)?)["\']', text)
        )

    refs = []
    for value in values:
        target = resolve_runtime_ref(source, value)
        if target is not None:
            refs.append(target)
    return refs


# Runtime source files must be reachable from index.html. Replaced JS/CSS must be
# removed in the same update instead of being left behind as dormant files.
reachable = set()
queue = [ENTRY]
visited = set()
while queue:
    source = queue.pop()
    if source in visited or not source.exists():
        continue
    visited.add(source)

    for target in runtime_refs(source):
        if not target.exists():
            problems.append(f"Runtime reference missing: {source.relative_to(ROOT)} -> {target.relative_to(ROOT)}")
            continue
        if target not in reachable:
            reachable.add(target)
            queue.append(target)

runtime_files = {
    path.resolve()
    for directory in RUNTIME_DIRS
    for path in directory.rglob("*")
    if path.is_file() and path.suffix in RUNTIME_SUFFIXES
}

for orphan in sorted(runtime_files - reachable):
    problems.append(
        f"Dead runtime file: {orphan.relative_to(ROOT)} is not reachable from index.html; "
        "delete replaced code in the same update"
    )

# Retired mechanisms must stay retired globally, not only in the file where a
# previous regression happened. sw.js remains at the project root intentionally
# as a retirement worker for old clients, but application JS must never register it.
for script in sorted((ROOT / "js").rglob("*.js")):
    text = script.read_text(encoding="utf-8")
    if "serviceWorker.register" in text:
        problems.append(
            f"Retired service worker registration found in {script.relative_to(ROOT)}"
        )

assert not problems, "\n".join(problems)
print("OK: runtime JS/CSS is reachable and retired update paths stay removed")
