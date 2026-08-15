#!/usr/bin/env python3
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'css'/'src'
OUT=ROOT/'css'/'base.css'
pat=re.compile(r'/\*\s*@sp-order\s+(\d+)\s*\*/\s*')
items=[]
for path in sorted(SRC.glob('*.css')):
    text=path.read_text(encoding='utf-8')
    matches=list(pat.finditer(text))
    for i,m in enumerate(matches):
        end=matches[i+1].start() if i+1<len(matches) else len(text)
        block=text[m.end():end].strip()
        if block:
            items.append((int(m.group(1)),path.name,block))
orders=[x[0] for x in items]
if len(orders)!=len(set(orders)):
    dup=sorted({x for x in orders if orders.count(x)>1})
    raise SystemExit(f'Duplicate @sp-order values: {dup}')
items.sort(key=lambda x:x[0])
header='/* Scratch Practice - GENERATED production stylesheet.\n   Edit css/src/*.css, then run: python tools/build_css.py\n   Global fragment order is preserved by @sp-order markers. */\n\n'
out=header+'\n\n'.join(block for _,_,block in items)+'\n'
OUT.write_text(out,encoding='utf-8')
print(f'Built {OUT.relative_to(ROOT)} from {len(items)} ordered fragments ({len(out.splitlines())} lines).')
