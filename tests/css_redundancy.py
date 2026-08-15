from pathlib import Path
from collections import defaultdict
import re
from css_parser import parse_stylesheet

ROOT=Path(__file__).resolve().parents[1]
CSS=(ROOT/'css/base.css').read_text(encoding='utf-8')
PROJECT='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in ROOT.rglob('*') if p.is_file() and p.suffix.lower() in {'.css','.html','.js'})
rules,keyframes=parse_stylesheet(CSS)

# Every design token must have a consumer.
defs=set(re.findall(r'(--[\w-]+)\s*:',CSS))
refs=set(re.findall(r'var\(\s*(--[\w-]+)',PROJECT))
unused_vars=sorted(defs-refs)
assert not unused_vars,f'unused custom properties: {unused_vars}'

# Every keyframe must be referenced outside its definition.
unused_frames=[]
for name,line in keyframes:
    if len(re.findall(r'(?<![\w-])'+re.escape(name)+r'(?![\w-])',PROJECT)) <= 1:
        unused_frames.append((name,line))
assert not unused_frames,f'unused keyframes: {unused_frames}'

# Detect exact-selector declarations that can no longer win. The check stays
# conservative: it does not try to infer selector overlap like a browser.
occ=defaultdict(list)
for rule_index,rule in enumerate(rules):
    for declaration_index,declaration in enumerate(rule.declarations):
        for branch in rule.selectors:
            occ[(rule.context,branch,declaration.name)].append((rule_index,declaration_index,declaration))

dead=[]
for rule_index,rule in enumerate(rules):
    for declaration_index,declaration in enumerate(rule.declarations):
        shadowed_for_every_branch=all(
            any(
                (later_rule>rule_index or (later_rule==rule_index and later_declaration>declaration_index))
                and (not declaration.important or later.important)
                for later_rule,later_declaration,later in occ[(rule.context,branch,declaration.name)]
            )
            for branch in rule.selectors
        )
        if shadowed_for_every_branch:
            dead.append((rule.line,', '.join(rule.selectors),declaration.name))

assert not dead,f'fully shadowed declarations remain: {dead[:20]}'
print(f'OK: CSS redundancy — {len(defs)} used custom properties, no unused keyframes, no fully-shadowed declarations')
