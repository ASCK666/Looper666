from pathlib import Path
import re, sys
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed'); sys.exit(0)
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="manifest"[^>]*>','',html)
for rel in ['./css/base.css','./css/clean-ui.css']:
    css=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<link rel="stylesheet" href="{rel}">',f'<style>{css}</style>')
html=re.sub(r'src="assets/[^"]+"','src=""',html)
for rel in ['./js/bootstrap.js','./js/core.js','./js/looper.js','./js/practice.js','./js/chopper.js','./js/drums.js','./js/events.js']:
    js=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<script src="{rel}" defer></script>',f'<script>{js}</script>').replace(f'<script src="{rel}"></script>',f'<script>{js}</script>')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.set_content(html,wait_until='domcontentloaded',timeout=20000)
    page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
    for width in [1440,1240,1180,1161,1160,1100,1020,981,980,820,620,520,420]:
        page.set_viewport_size({'width':width,'height':900})
        page.wait_for_timeout(20)
        data=page.evaluate('''()=>{
          const top=document.querySelector('.stableTop').getBoundingClientRect().toJSON();
          const visible=['.headerActions','.headerMaster'].map(s=>({s,r:document.querySelector(s).getBoundingClientRect().toJSON()}));
          const hidden=['.stableBrand','.headerDeckPill'].map(s=>({s,display:getComputedStyle(document.querySelector(s)).display,r:document.querySelector(s).getBoundingClientRect().toJSON()}));
          return {top,visible,hidden,scroll:document.documentElement.scrollWidth,inner:innerWidth};
        }''')
        assert data['scroll'] <= data['inner']+2,(width,data)
        for item in data['visible']:
            r=item['r']; top=data['top']
            assert r['width']>0 and r['height']>0,(width,item,data)
            assert r['left'] >= top['left']-1,(width,item,data)
            assert r['right'] <= top['right']+1,(width,item,data)
        for item in data['hidden']:
            assert item['display']=='none' and item['r']['width']==0 and item['r']['height']==0,(width,item,data)
    page.close()
    browser.close()
print('OK: header responsive — actual runtime header fits from 420px to 1440px and retired chrome stays hidden')
