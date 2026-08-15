from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
problems=[]

# HTML local href/src references.
html=(ROOT/'index.html').read_text(encoding='utf-8')
for val in re.findall(r'\b(?:src|href)=["\']([^"\']+)["\']', html):
    if val.startswith(('http://','https://','data:','#','mailto:')):
        continue
    target=(ROOT/val.lstrip('./')).resolve()
    if not target.exists():
        problems.append(f'HTML missing: {val} -> {target}')

# Relative CSS url(...) values must resolve relative to the CSS file, not index.html.
for css in [ROOT/'css'/'base.css']:
    text=css.read_text(encoding='utf-8')
    for raw in re.findall(r'url\(([^)]+)\)', text, flags=re.I):
        val=raw.strip().strip('"\'')
        if not val or val.startswith(('data:','http://','https://','#')):
            continue
        target=(css.parent/val).resolve()
        if not target.exists():
            problems.append(f'CSS missing: {css.name}: {val} -> {target}')

# Service worker precache paths.
sw=(ROOT/'sw.js').read_text(encoding='utf-8')
for val in re.findall(r'["\'](\./[^"\']+)["\']', sw):
    if val=='./':
        continue
    target=(ROOT/val[2:]).resolve()
    if not target.exists():
        problems.append(f'SW missing: {val} -> {target}')

assert not problems, '\n'.join(problems)
print('OK: local HTML/CSS/service-worker resource paths resolve to real files')
