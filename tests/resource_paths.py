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

# Service worker references must resolve when present.
sw=(ROOT/'sw.js').read_text(encoding='utf-8')
for val in re.findall(r'["\'](\./[^"\']+)["\']', sw):
    if val=='./':
        continue
    target=(ROOT/val[2:]).resolve()
    if not target.exists():
        problems.append(f'SW missing: {val} -> {target}')

# GitHub Pages development contract: do not let an old worker combine a fresh
# HTML shell with stale JavaScript. The worker must retire itself and never
# intercept fetches; bootstrap also cleans registrations/caches defensively.
if re.search(r'addEventListener\s*\(\s*["\']fetch["\']', sw):
    problems.append('SW must not intercept fetches while Pages is in development mode')
for token in ['caches.keys()', 'self.registration.unregister()', 'client.navigate(client.url)']:
    if token not in sw:
        problems.append(f'SW retirement missing: {token}')

bootstrap=(ROOT/'js'/'bootstrap.js').read_text(encoding='utf-8')
for token in ['navigator.serviceWorker.getRegistrations()', 'caches.keys()']:
    if token not in bootstrap:
        problems.append(f'Bootstrap stale-cache cleanup missing: {token}')

assert not problems, '\n'.join(problems)
print('OK: local resource paths resolve and Pages development mode cannot serve stale app caches')
