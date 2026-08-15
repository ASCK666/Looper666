from pathlib import Path
import re, sys
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed');sys.exit(0)
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="manifest"[^>]*>','',html)
css=(ROOT/'css/base.css').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="./css/base.css">',f'<style>{css}</style>')
html=re.sub(r'src="assets/[^"]+"','src=""',html)
for rel in ['./js/bootstrap.js','./js/core.js','./js/looper.js','./js/practice.js','./js/chopper.js','./js/drums.js','./js/events.js']:
    js=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<script src="{rel}" defer></script>',f'<script>{js}</script>')
    html=html.replace(f'<script src="{rel}"></script>',f'<script>{js}</script>')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width,height in [(1440,1200),(820,1200),(520,1200)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='load',timeout=20000)
        page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
        page.add_style_tag(content='*,*::before,*::after{animation:none!important;transition:none!important}')
        page.click('[data-tab="chopper"]');page.wait_for_timeout(80)
        data=page.evaluate('''() => {
          const box=s=>document.querySelector(s).getBoundingClientRect();
          const pads=[...document.querySelectorAll('#pads .pad')].map(x=>x.getBoundingClientRect().toJSON());
          const upper=getComputedStyle(document.querySelector('.samplerUpperDeck')).gridTemplateColumns;
          const perf=getComputedStyle(document.querySelector('.samplerPerformanceDeck')).gridTemplateColumns;
          const screen=box('.samplerScreenModule'),control=box('.samplerControlModule');
          const padPanel=box('.samplerPadsModule'),seq=box('.samplerSequenceModule');
          const wrap=document.querySelector('.loopGridWrap');
          return {pads,upper,perf,screen:screen.toJSON(),control:control.toJSON(),padPanel:padPanel.toJSON(),seq:seq.toJSON(),bodyW:document.body.scrollWidth,viewportW:innerWidth,scrollable:wrap.scrollWidth>=wrap.clientWidth};
        }''')
        assert len(data['pads'])==16,data
        assert all(x['width']>35 and x['height']>35 for x in data['pads']),data['pads']
        # 4 physical pads per row: pad 1..4 align, pad 5 starts a new row.
        assert abs(data['pads'][0]['top']-data['pads'][3]['top'])<2,data['pads'][:5]
        assert data['pads'][4]['top']>data['pads'][0]['bottom']-2,data['pads'][:5]
        if width>1180:
            assert data['control']['left']>=data['screen']['right']-2,data
        else:
            assert data['control']['top']>=data['screen']['bottom']-2,data
        if width>1000:
            assert data['seq']['left']>=data['padPanel']['right']-2,data
        else:
            assert data['seq']['top']>=data['padPanel']['bottom']-2,data
        assert data['bodyW']<=data['viewportW']+2,data
        assert data['scrollable'],data
        assert not errors,errors
        page.close()
    browser.close()
print('OK: Chopper sampler layout — 4x4 pads, screen/control hierarchy, sequence and responsive stacking')
