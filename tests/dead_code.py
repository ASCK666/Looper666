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

# Bootstrap intentionally loads the verified cassette runtime after the faceplate
# is mounted. Treat those explicit local constants as part of the runtime manifest.
bootstrap = (ROOT / "js" / "bootstrap.js").read_text(encoding="utf-8")
for value in re.findall(r'["\'](\./[^"\']+\.(?:js|css))["\']', bootstrap):
    target = (ROOT / value.lstrip("./")).resolve()
    referenced.add(target)
    if not target.exists():
        problems.append(f"Runtime reference missing from bootstrap.js: {value}")

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

# Runtime CSS is maintained directly. The current maintainer documentation must
# not advertise the retired generator/source layout either. Historical review
# notes are intentionally excluded because they describe past versions.
css_contract_files = [
    *sorted((ROOT / "css").rglob("*.css")),
    ROOT / "README.txt",
    ROOT / "docs" / "ARCHITECTURE.md",
    ROOT / "docs" / "CSS_WORKFLOW.md",
]
for contract_file in css_contract_files:
    text = contract_file.read_text(encoding="utf-8")
    for stale_path in ("css/src/", "tools/build_css.py"):
        if stale_path in text:
            problems.append(
                f"Stale CSS generation path {stale_path!r} found in {contract_file.relative_to(ROOT)}"
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
print("OK: runtime JS/CSS is explicit, current docs reject retired CSS generation paths and retired update paths stay removed")
