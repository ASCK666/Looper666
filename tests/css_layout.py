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
for rel in ['./css/base.css','./css/clean-ui.css']:
    css=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<link rel="stylesheet" href="{rel}">',f'<style>{css}</style>')

asset_css=(ROOT/'assets'/'looper-ui'/'overlay.css').read_text(encoding='utf-8')
html=html.replace('</head>',f'<style>{asset_css}</style></head>')
html=html.replace('<section id="looper" class="screen active">','<section id="looper" class="screen active asset-ui">')

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
        page.evaluate('''() => {
          const looper=document.getElementById('looper');
          installLooperAssetReadouts(looper);
          installAssetLibraryPager(looper);
          installAssetSpeedControl();
        }''')
        page.wait_for_timeout(120)

        metrics=page.evaluate('''() => ({
          bodyW:document.body.scrollWidth,
          viewportW:innerWidth,
          machine:document.querySelector('.machine').getBoundingClientRect().toJSON(),
          looper:document.getElementById('looper').getBoundingClientRect().toJSON(),
          library:document.getElementById('library').getBoundingClientRect().toJSON(),
          track:document.querySelector('.asset-track-readout').getBoundingClientRect().toJSON(),
          state:document.querySelector('.asset-state-readout').getBoundingClientRect().toJSON(),
          loops:document.querySelector('.asset-loop-readout').getBoundingClientRect().toJSON(),
          speed:document.querySelector('.asset-speed-level-readout').getBoundingClientRect().toJSON()
        })''')
        assert metrics['machine']['width'] > 300, metrics
        assert metrics['looper']['width'] > 300 and metrics['looper']['height'] > 200, metrics
        assert abs(metrics['looper']['width']/metrics['looper']['height'] - 1.5) < .03, metrics
        assert metrics['library']['width'] > 200 and metrics['library']['height'] > 70, metrics
        assert metrics['track']['width'] > 40 and metrics['state']['width'] > 30, metrics
        assert metrics['loops']['width'] > 20 and metrics['speed']['width'] > 20, metrics
        assert metrics['bodyW'] <= metrics['viewportW'] + 2, metrics

        inside=page.evaluate('''() => {
          const deck=document.getElementById('looper').getBoundingClientRect();
          return ['tapeCounterReset','prevBeat','playBeat','stopBeat','nextBeat','autoLooperToggle','importBeatsBtn','importFolderBtn'].map(id=>{
            const r=document.getElementById(id).getBoundingClientRect();
            return {id,ok:r.left>=deck.left-1&&r.top>=deck.top-1&&r.right<=deck.right+1&&r.bottom<=deck.bottom+1,w:r.width,h:r.height};
          });
        }''')
        assert all(x['ok'] and x['w']>8 and x['h']>8 for x in inside), inside

        # Empty structural slots stay rendered so their CSS masks can cover baked
        # placeholder labels; only real track rows count as visible library data.
        rack=page.evaluate('''() => {
          const slots=[...document.querySelectorAll('#library .cassetteRackSlot')];
          const tracks=[...document.querySelectorAll('#library .track')];
          const firstMeta=document.querySelector('#library .trackMeta');
          return {
            columns:document.querySelectorAll('#library .cassetteRackColumn').length,
            slots:slots.length,
            visibleSlots:slots.filter(x=>getComputedStyle(x).display!='none').length,
            tracks:tracks.length,
            visibleTracks:tracks.filter(x=>getComputedStyle(x).display!='none').length,
            metaOpacity:firstMeta?parseFloat(getComputedStyle(firstMeta).opacity):0,
            metaColor:firstMeta?getComputedStyle(firstMeta).color:'',
            page:document.querySelector('.asset-page-readout')?.textContent||'',
            prev:document.querySelector('.asset-page-prev')?.getBoundingClientRect().width||0,
            next:document.querySelector('.asset-page-next')?.getBoundingClientRect().width||0
          };
        }''')
        assert rack['columns'] >= 3 and rack['slots'] >= 12 and rack['tracks'] >= 3, rack
        assert rack['visibleSlots'] >= 9, rack
        assert rack['visibleTracks'] == min(rack['tracks'],9), rack
        assert rack['metaOpacity'] > .9 and rack['metaColor'] not in ('rgba(0, 0, 0, 0)','transparent'), rack
        assert rack['page'] == '1 / 1' and rack['prev'] > 8 and rack['next'] > 8, rack

        search=page.evaluate('''() => {
          const el=document.getElementById('librarySearch'),cs=getComputedStyle(el);
          return {opacity:parseFloat(cs.opacity),color:cs.color,caret:cs.caretColor,w:el.getBoundingClientRect().width};
        }''')
        assert search['opacity'] > .9 and search['w'] > 40, search
        assert search['color'] not in ('rgba(0, 0, 0, 0)','transparent'), search

        sequence=[]
        for _ in range(6):
            page.click('#autoLooperToggle')
            sequence.append(page.locator('.asset-speed-level-readout').inner_text())
        assert sequence == ['+1','+2','+3','+4','+5','0'], sequence
        page.click('#autoLooperToggle')
        page.click('#tapeCounterReset')
        assert page.locator('.asset-speed-level-readout').inner_text() == '0'

        page.evaluate("document.getElementById('deckTransportState').textContent='PLAYING'")
        page.wait_for_timeout(30)
        state=page.evaluate('''() => ({
          text:document.querySelector('.asset-state-readout').textContent,
          header:document.querySelector('.asset-header-state-readout').textContent,
          playing:document.getElementById('looper').classList.contains('asset-playing')
        })''')
        assert state == {'text':'PLAYING','header':'PLAYING','playing':True}, state

        page.click('[data-tab="chopper"]')
        page.wait_for_timeout(180)
        chop=page.evaluate('''() => ({
          chopper:getComputedStyle(document.getElementById('chopper')).display,
          looper:getComputedStyle(document.getElementById('looper')).display,
          wave:document.getElementById('waveCanvas').getBoundingClientRect().toJSON(),
          pads:document.getElementById('pads').getBoundingClientRect().toJSON(),
          grid:document.getElementById('loopGrid').getBoundingClientRect().toJSON(),
          drums:document.querySelector('.drumEditBox').getBoundingClientRect().toJSON()
        })''')
        assert chop['chopper'] != 'none' and chop['looper'] == 'none', chop
        assert chop['wave']['width'] > 200 and chop['wave']['height'] > 40, chop
        assert chop['pads']['width'] > 200, chop
        assert chop['grid']['width'] > 200, chop
        assert chop['drums']['width'] > 200, chop

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

print('OK: CSS layout — approved Looper faceplate, truthful rack overlays, manual speed selector, Chopper and Practice overlay')
