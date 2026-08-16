from pathlib import Path
import re
from css_parser import parse_stylesheet

ROOT=Path(__file__).resolve().parents[1]
CSS=(ROOT/'css/base.css').read_text(encoding='utf-8')
SOURCE='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in [ROOT/'index.html',*sorted((ROOT/'js').glob('*.js'))])
TOKENS=set(re.findall(r'[A-Za-z_][A-Za-z0-9_-]*',SOURCE))

rules,keyframes=parse_stylesheet(CSS)
selectors=[selector for rule in rules for selector in rule.selectors]

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

dead=[selector for selector in selectors if impossible(selector)]
assert not dead,dead[:20]
assert len(CSS.splitlines()) < 2900,len(CSS.splitlines())
assert rules,'no CSS rules parsed'
print(f'OK: CSS health — {len(CSS.splitlines())} lines, {len(selectors)} selector branches, 0 unreachable selector branches, dependency-free parser')
