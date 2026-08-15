from pathlib import Path
import re, sys
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed')
    sys.exit(0)

ROOT=Path(__file__).resolve().parents[1]

# Inline project resources so the test does not depend on localhost/file:// permissions.
html=(ROOT/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="manifest"[^>]*>','',html)
for rel in ['./css/base.css']:
    css=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<link rel="stylesheet" href="{rel}">',f'<style>{css}</style>')
# Broken images are fine here: geometry is fixed by CSS aspect-ratio.
html=re.sub(r'src="assets/[^"]+"','src=""',html)
for rel in ['./js/bootstrap.js','./js/core.js','./js/looper.js','./js/practice.js','./js/chopper.js','./js/drums.js','./js/events.js']:
    js=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<script src="{rel}" defer></script>',f'<script>{js}</script>')
    html=html.replace(f'<script src="{rel}"></script>',f'<script>{js}</script>')

chromium='/usr/bin/chromium'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    for width,height in [(1440,1100),(820,1000),(520,900)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='load',timeout=20000)
        page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
        page.wait_for_timeout(180)

        # Core shell must actually occupy the viewport without accidental horizontal overflow.
        metrics=page.evaluate('''() => ({
          bodyW:document.body.scrollWidth,
          viewportW:innerWidth,
          machine:document.querySelector('.machine').getBoundingClientRect().toJSON(),
          looper:document.getElementById('looper').getBoundingClientRect().toJSON(),
          deck:document.querySelector('.cassetteDeckStage').getBoundingClientRect().toJSON(),
          mechanism:document.querySelector('.cassetteMechanismCrop').getBoundingClientRect().toJSON(),
          transport:document.querySelector('.deckTransport').getBoundingClientRect().toJSON(),
          crate:document.querySelector('.beatCratePanel').getBoundingClientRect().toJSON()
        })''')
        assert metrics['machine']['width'] > 300, metrics
        assert metrics['looper']['height'] > 300, metrics
        assert metrics['deck']['width'] > 250 and metrics['deck']['height'] > 150, metrics
        assert abs(metrics['mechanism']['width']-metrics['transport']['width']) <= 1, metrics
        assert metrics['crate']['width'] > 220 and metrics['crate']['height'] > 250, metrics
        assert metrics['bodyW'] <= metrics['viewportW'] + 2, metrics

        # Transport and loading controls must sit inside the unified cassette deck.
        inside=page.evaluate('''() => {
          const deck=document.querySelector('.cassetteDeck').getBoundingClientRect();
          return ['cassetteDoorEject','tapeCounterReset','prevBeat','playBeat','stopBeat','nextBeat','autoLooperToggle','importBeatsBtn','importFolderBtn'].map(id=>{
            const r=document.getElementById(id).getBoundingClientRect();
            return {id,ok:r.left>=deck.left-1&&r.top>=deck.top-1&&r.right<=deck.right+1&&r.bottom<=deck.bottom+1,w:r.width,h:r.height};
          });
        }''')
        assert all(x['ok'] and x['w']>20 and x['h']>20 for x in inside), inside

        rack=page.evaluate('''() => ({
          columns:document.querySelectorAll('#library .cassetteRackColumn').length,
          slots:document.querySelectorAll('#library .cassetteRackSlot').length,
          tracks:document.querySelectorAll('#library .track').length,
          spine:(()=>{const r=document.querySelector('#library .track').getBoundingClientRect();return r.width/r.height})()
        })''')
        assert rack['columns'] >= 3 and rack['slots'] >= 12 and rack['tracks'] >= 3, rack
        assert 6.15 <= rack['spine'] <= 6.65, rack

        # Chopper must reveal its real workstation blocks and hide the looper.
        page.click('[data-tab="chopper"]')
        page.wait_for_timeout(180)
        chop=page.evaluate('''() => ({
          chopper:getComputedStyle(document.getElementById('chopper')).display,
          looper:getComputedStyle(document.getElementById('looper')).display,
          wave:document.getElementById('waveCanvas').getBoundingClientRect().toJSON(),
          pads:document.getElementById('pads').getBoundingClientRect().toJSON(),
          grid:document.getElementById('loopGrid').getBoundingClientRect().toJSON(),
          drums:document.getElementById('drumLibrariesPanel').getBoundingClientRect().toJSON()
        })''')
        assert chop['chopper'] != 'none' and chop['looper'] == 'none', chop
        assert chop['wave']['width'] > 200 and chop['wave']['height'] > 40, chop
        assert chop['pads']['width'] > 200, chop
        assert chop['grid']['width'] > 200, chop
        assert chop['drums']['width'] > 200, chop

        # Practice overlay should layer above the workstation and close cleanly.
        page.click('#practiceOverlayOpen')
        page.wait_for_timeout(80)
        practice=page.evaluate('''() => {
          const e=document.getElementById('practice'),cs=getComputedStyle(e),r=e.getBoundingClientRect();
          return {display:cs.display,position:cs.position,z:parseInt(cs.zIndex||'0',10),w:r.width,h:r.height};
        }''')
        assert practice['display'] != 'none' and practice['w']>250 and practice['h']>200, practice
        page.click('#practiceOverlayClose')
        assert page.locator('#practice.overlayOpen').count() == 0

        assert not errors, errors
        page.close()
    browser.close()

print('OK: CSS layout — unified deck width, cassette rack, Chopper and Practice overlay')
