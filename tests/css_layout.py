from pathlib import Path
import re, sys
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed')
    sys.exit(0)

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="manifest"[^>]*>','',html)
for rel in ['./css/base.css','./css/clean-ui.css']:
    css=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<link rel="stylesheet" href="{rel}">',f'<style>{css}</style>')
html=re.sub(r'src="assets/[^"]+"','src=""',html)
for rel in ['./js/bootstrap.js','./js/core.js','./js/looper.js','./js/practice.js','./js/chopper.js','./js/drums.js','./js/events.js']:
    js=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<script src="{rel}" defer></script>',f'<script>{js}</script>')

chromium='/usr/bin/chromium'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    for width,height in [(1440,1100),(820,1000),(520,900)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='load',timeout=20000)
        page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
        page.wait_for_timeout(120)

        metrics=page.evaluate('''() => ({
          bodyW:document.body.scrollWidth,
          viewportW:innerWidth,
          machine:document.querySelector('.machine').getBoundingClientRect().toJSON(),
          looper:document.getElementById('looper').getBoundingClientRect().toJSON(),
          library:document.getElementById('library').getBoundingClientRect().toJSON(),
          crate:document.querySelector('.beatCratePanel').getBoundingClientRect().toJSON(),
          deck:document.querySelector('.looperMainPanel').getBoundingClientRect().toJSON(),
          tracks:document.querySelectorAll('#library .track').length,
          faceplates:document.querySelectorAll('.looper-faceplate').length
        })''')
        assert metrics['machine']['width'] > 300, metrics
        assert metrics['looper']['width'] > 300 and metrics['looper']['height'] > 200, metrics
        assert metrics['library']['width'] > 180 and metrics['crate']['width'] > 200 and metrics['deck']['width'] > 250, metrics
        assert metrics['tracks']==0 and metrics['faceplates']==0, metrics
        assert metrics['bodyW'] <= metrics['viewportW'] + 2, metrics

        controls=page.evaluate('''() => ['tapeCounterReset','cassetteDoorEject','prevBeat','playBeat','stopBeat','nextBeat','autoLooperToggle','importBeatsBtn','importFolderBtn'].map(id=>{
          const el=document.getElementById(id),r=el.getBoundingClientRect(),cs=getComputedStyle(el);
          return {id,w:r.width,h:r.height,display:cs.display,visibility:cs.visibility,opacity:parseFloat(cs.opacity),handler:typeof el.onclick};
        })''')
        assert all(x['display']!='none' and x['visibility']=='visible' and x['opacity']>.5 and x['w']>18 and x['h']>18 and x['handler']=='function' for x in controls), controls

        page.click('#tapeCounterReset')
        page.click('#stopBeat')
        page.click('[data-tab="chopper"]')
        page.wait_for_timeout(100)
        assert page.locator('#chopper.active').count()==1
        page.click('[data-tab="looper"]')
        page.click('#practiceOverlayOpen')
        page.wait_for_timeout(50)
        assert page.locator('#practice.overlayOpen').count()==1
        page.click('#practiceOverlayClose')
        assert not errors, errors
        page.close()
    browser.close()

print('OK: native Looper UI stays visible and clickable with a truthful empty crate across responsive layouts')
