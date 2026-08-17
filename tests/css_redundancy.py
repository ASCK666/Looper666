from pathlib import Path
from collections import defaultdict
import re
from css_parser import parse_stylesheet

ROOT=Path(__file__).resolve().parents[1]
CSS_FILES=[ROOT/'css/base.css',ROOT/'css/clean-ui.css']
CSS='\n'.join(path.read_text(encoding='utf-8') for path in CSS_FILES)
PROJECT='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in ROOT.rglob('*') if p.is_file() and p.suffix.lower() in {'.css','.html','.js'})
rules,keyframes=parse_stylesheet(CSS)

# Every design token defined by the runtime CSS cascade must have a consumer.
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

# Detect exact-selector declarations that can no longer win in the actual CSS
# load order (base.css followed by clean-ui.css). The check stays conservative:
# it does not try to infer selector overlap like a browser.
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

# Temporary diagnostic: materialize a byte-exact cleanup candidate for the large
# base stylesheet. This block and its artifact step are removed before merge.
if dead:
    base_path=ROOT/'css/base.css'
    patched=base_path.read_text(encoding='utf-8')
    old_header=(
        '/* Scratch Practice - GENERATED production stylesheet.\n'
        '   Edit css/src/*.css, then run: python tools/build_css.py\n'
        '   Global fragment order is preserved by @sp-order markers. */'
    )
    new_header=(
        '/* Scratch Practice - maintained runtime base stylesheet.\n'
        '   There is no CSS generator pipeline; edit this file directly. */'
    )
    assert old_header in patched
    patched=patched.replace(old_header,new_header,1)

    def drop_first_rule_properties(source,selector,properties):
        pattern=re.compile(r'('+re.escape(selector)+r'\s*\{)(.*?)(\n\})',re.S)
        match=pattern.search(source)
        assert match,f'rule not found: {selector}'
        wanted=set(properties)
        removed=set()
        kept=[]
        for line in match.group(2).splitlines(keepends=True):
            stripped=line.lstrip()
            name=stripped.split(':',1)[0].strip() if ':' in stripped else ''
            if name in wanted and name not in removed:
                removed.add(name)
                continue
            kept.append(line)
        assert removed==wanted,(selector,removed,wanted)
        body=''.join(kept)
        return source[:match.start()]+match.group(1)+body+match.group(3)+source[match.end():]

    removals={
        '.machine':['display','gap'],
        '.stableTop':['grid-template-columns','gap','min-height','padding'],
        '.stableBrand':['display'],
        '.headerDeckPill':['display'],
        '.headerMasterInner':['grid-template-columns','gap'],
        '.headerMasterBox':['width','height'],
        '.headerMasterBox:after':['top','left','height','transform-origin'],
        '.headerMeterScale':['display'],
        '#chopper .samplerDeck':['gap','padding'],
    }
    for selector,properties in removals.items():
        patched=drop_first_rule_properties(patched,selector,properties)
    base_path.write_text(patched,encoding='utf-8')
    print(f'WROTE_CSS_CLEANUP_CANDIDATE={base_path}')

assert not dead,f'fully shadowed declarations remain in runtime CSS cascade: {dead[:30]}'
print(f'OK: CSS redundancy — {len(defs)} used custom properties, no unused keyframes, no fully-shadowed declarations across runtime CSS')
