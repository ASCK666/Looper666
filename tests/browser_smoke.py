from pathlib import Path
import os, sys, tempfile, wave, struct, math
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed')
    sys.exit(0)

ROOT=Path(__file__).resolve().parents[1]

def make_wav(path: Path, seconds=.25, hz=220):
    rate=44100
    frames=max(1,int(rate*seconds))
    with wave.open(str(path),'wb') as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(rate)
        wf.writeframes(b''.join(struct.pack('<h',int(.18*32767*math.sin(2*math.pi*hz*i/rate))) for i in range(frames)))

html=(ROOT/'index.html').read_text(encoding='utf-8')
for rel in ['./css/base.css','./css/clean-ui.css']:
    css=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<link rel="stylesheet" href="{rel}">',f'<style>{css}</style>')
for rel in ['./js/bootstrap.js','./js/core.js','./js/looper.js','./js/practice.js','./js/chopper.js','./js/drums.js','./js/events.js']:
    js=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<script src="{rel}" defer></script>',f'<script>{js}</script>')
    html=html.replace(f'<script src="{rel}"></script>',f'<script>{js}</script>')

with tempfile.TemporaryDirectory() as td:
    td=Path(td)
    beat=td/'test-beat.wav'; sample=td/'test-sample.wav'; xss=td/'"><img src=x onerror=window.__sp_xss=1>.wav'
    make_wav(beat,.30,180); make_wav(sample,.42,330); make_wav(xss,.18,440)
    chromium=os.environ.get('CHROMIUM','/usr/bin/chromium')
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
        context=browser.new_context(); page=context.new_page()
        page_errors=[]; console_errors=[]
        page.on('pageerror',lambda e:page_errors.append(str(e)))
        page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
        page.set_content(html,wait_until='load',timeout=15000)
        page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)

        assert page.evaluate('window.__SP.errors.length')==0
        assert not page_errors and not console_errors,(page_errors,console_errors)
        assert page.locator('.looper-faceplate').count()==0
        assert page.locator('#library .track').count()==0
        assert 'Aucun résultat' in page.locator('#library').inner_text()

        for rid in ['tapeCounterReset','playBeat','stopBeat','prevBeat','nextBeat','importBeatsBtn','importFolderBtn','loadSampleBtn','kickFolderBtn','snareFolderBtn','hatFolderBtn','autoLooperToggle','deckTransportState','deckSpeedReadout','looperVu']:
            assert page.locator('#'+rid).count()==1,rid
        handlers=page.evaluate('''() => ['playBeat','stopBeat','tapeCounterReset','loadSampleBtn','kickFolderBtn','autoLooperToggle','importBeatsBtn','importFolderBtn'].map(id=>typeof document.getElementById(id).onclick)''')
        assert all(v=='function' for v in handlers),handlers

        visible=page.evaluate('''() => ['playBeat','stopBeat','prevBeat','nextBeat','autoLooperToggle','importBeatsBtn','importFolderBtn'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),c=getComputedStyle(e);return [id,r.width,r.height,c.display,c.visibility,parseFloat(c.opacity)]})''')
        assert all(v[1]>20 and v[2]>6 and v[3]!='none' and v[4]=='visible' and v[5]>.5 for v in visible),visible

        page.set_input_files('#beatFiles',str(beat))
        page.wait_for_function("document.getElementById('deckTrack').textContent === 'test-beat.wav'",timeout=10000)
        assert page.locator('#deckTransportState').inner_text()=='READY'
        assert page.locator('#library .track').count()==1
        page.click('#playBeat'); page.wait_for_function('deckSource !== null')
        assert page.locator('#deckTransportState').inner_text()=='PLAYING'
        page.click('#stopBeat'); page.wait_for_function('deckSource === null')

        initial_mode=page.evaluate('autoLooperModeIndex')
        page.click('#autoLooperToggle')
        assert page.evaluate('autoLooperModeIndex') != initial_mode
        assert page.evaluate('autoLooperEnabledState === true') is True
        page.click('#tapeCounterReset')

        page.evaluate('document.activeElement && document.activeElement.blur()')
        page.keyboard.press('Space'); page.wait_for_function('deckSource !== null')
        page.keyboard.press('Space'); page.wait_for_function('deckSource === null')
        page.focus('#librarySearch'); page.keyboard.press('Space'); page.wait_for_timeout(120)
        assert page.evaluate('deckSource === null') is True
        page.fill('#librarySearch','')

        page.click('[data-tab="chopper"]')
        page.set_input_files('#sampleFile',str(sample))
        page.wait_for_function("document.getElementById('chopStatus').textContent.includes('SAMPLE READY')",timeout=10000)
        assert page.evaluate("sampleName === 'test-sample.wav' && sampleBuffer !== null") is True

        page.click('[data-tab="looper"]')
        page.set_input_files('#beatFiles',str(xss)); page.wait_for_timeout(500)
        assert page.evaluate('window.__sp_xss') is None
        assert page.locator('#library img').count()==0
        assert page.evaluate("safeBeatFilename('CON.wav')")=='_CON'
        assert page.evaluate("safeBeatFilename('hello?.wav')")=='hello_'
        assert page.locator('#appBootError.visible').count()==0
        context.close(); browser.close()

print('OK: browser startup, real visible Looper controls, truthful empty crate, imports, transport, auto loop, shortcuts and filename-XSS regression')
