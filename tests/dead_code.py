from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
RUNTIME_DIRS = (ROOT / "js", ROOT / "css")
RUNTIME_SUFFIXES = {".js", ".css"}
problems = []

# Keep index.html as the explicit runtime manifest. For this small static project,
# every maintained JS/CSS file must be loaded there; replaced files must be deleted
# in the same update instead of surviving as dormant runtime code.
html = (ROOT / "index.html").read_text(encoding="utf-8")
referenced = set()
for value in re.findall(r'\b(?:src|href)=["\']([^"\']+)["\']', html):
    if value.startswith(("http://", "https://", "data:", "#", "mailto:", "blob:")):
        continue
    clean = value.split("#", 1)[0].split("?", 1)[0]
    target = (ROOT / clean.lstrip("./")).resolve()
    if target.suffix not in RUNTIME_SUFFIXES:
        continue
    referenced.add(target)
    if not target.exists():
        problems.append(f"Runtime reference missing from index.html: {value}")

runtime_files = {
    path.resolve()
    for directory in RUNTIME_DIRS
    for path in directory.rglob("*")
    if path.is_file() and path.suffix in RUNTIME_SUFFIXES
}

for orphan in sorted(runtime_files - referenced):
    problems.append(
        f"Dead runtime file: {orphan.relative_to(ROOT)} is not loaded by index.html; "
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
print("OK: runtime JS/CSS is explicit in index.html and retired update paths stay removed")
