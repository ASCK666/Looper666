from pathlib import Path
import re
from css_parser import parse_stylesheet

ROOT=Path(__file__).resolve().parents[1]
CSS_FILES=[ROOT/'css/base.css',ROOT/'css/clean-ui.css']
SOURCE='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in [ROOT/'index.html',*sorted((ROOT/'js').glob('*.js'))])
TOKENS=set(re.findall(r'[A-Za-z_][A-Za-z0-9_-]*',SOURCE))
LINE_BUDGETS={'base.css':2900,'clean-ui.css':500}

def impossible(selector):
    # Tokens inside :not(...) are exclusions, not requirements for a selector
    # to match. Ignoring them prevents valid selectors from being flagged dead
    # merely because the excluded class/attribute no longer exists.
    required_selector=re.sub(r':not\([^)]*\)','',selector)
    required=(re.findall(r'[#.]([A-Za-z_][\w-]*)',required_selector)
              +re.findall(r'\[\s*([A-Za-z_][\w-]*)',required_selector))
    def known(token):
        if token in TOKENS: return True
        if token.startswith('data-'):
            parts=token[5:].split('-')
            dataset_name=parts[0]+''.join(part.title() for part in parts[1:])
            return dataset_name in TOKENS
        return False
    return any(not known(token) for token in required)

assert not impossible('.trackSource:not(.class-that-does-not-exist)')
assert impossible('.class-that-does-not-exist')

total_lines=0
total_selectors=0
for path in CSS_FILES:
    css=path.read_text(encoding='utf-8')
    rules,keyframes=parse_stylesheet(css)
    selectors=[selector for rule in rules for selector in rule.selectors]
    dead=[selector for selector in selectors if impossible(selector)]
    assert not dead,f'{path.name}: unreachable selector branches: {dead[:20]}'
    lines=len(css.splitlines())
    assert lines < LINE_BUDGETS[path.name],f'{path.name}: {lines} lines exceeds budget {LINE_BUDGETS[path.name]}'
    assert rules,f'{path.name}: no CSS rules parsed'
    total_lines+=lines
    total_selectors+=len(selectors)

print(f'OK: CSS health — {total_lines} lines, {total_selectors} selector branches across all runtime CSS, 0 unreachable selector branches')
