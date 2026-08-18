from pathlib import Path
from http.server import SimpleHTTPRequestHandler
import os, sys, tempfile, wave, struct, math

try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed')
    sys.exit(0)

ROOT=Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def make_wav(path: Path, seconds=.25, hz=220):
    rate=44100
    frames=max(1,int(rate*seconds))
    with wave.open(str(path),'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        data=[]
        for i in range(frames):
            v=int(0.18*32767*math.sin(2*math.pi*hz*i/rate))
            data.append(struct.pack('<h',v))
        wf.writeframes(b''.join(data))

html=(ROOT/'index.html').read_text(encoding='utf-8')
for rel in ['./css/base.css','./css/clean-ui.css']:
    css=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<link rel="stylesheet" href="{rel}">',f'<style>{css}</style>')
asset_css=(ROOT/'assets'/'looper-ui'/'overlay.css').read_text(encoding='utf-8')
html=html.replace('</head>',f'<style>{asset_css}</style></head>')
html=html.replace('<section id="looper" class="screen active">','<section id="looper" class="screen active asset-ui">')
for rel in ['./js/bootstrap.js','./js/core.js','./js/looper.js','./js/practice.js','./js/chopper.js','./js/drums.js','./js/events.js']:
    js=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<script src="{rel}" defer></script>',f'<script>{js}</script>')
    html=html.replace(f'<script src="{rel}"></script>',f'<script>{js}</script>')

with tempfile.TemporaryDirectory() as td:
    td=Path(td)
    beat=td/'test-beat.wav'
    sample=td/'test-sample.wav'
    xss=td/'"><img src=x onerror=window.__sp_xss=1>.wav'
    make_wav(beat,.30,180)
    make_wav(sample,.42,330)
    make_wav(xss,.18,440)

    chromium=os.environ.get('CHROMIUM','/usr/bin/chromium')
    with sync_playwright() as p:
        browser=p.chromium.launch(
            headless=True,
            executable_path=chromium,
            args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']
        )
        context=browser.new_context()
        page=context.new_page()
        page_errors=[]
        console_errors=[]
        page.on('pageerror',lambda e:page_errors.append(str(e)))
        page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
        page.set_content(html,wait_until='load',timeout=15000)
        page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
        page.evaluate('''() => {
          const looper=document.getElementById('looper');
          installLooperAssetReadouts(looper);
          installAssetSpeedControl();
        }''')
        page.wait_for_function("document.querySelector('.asset-speed-level-readout') !== null",timeout=5000)

        assert page.evaluate('window.__SP.errors.length') == 0, page.evaluate('window.__SP.errors')
        assert not page_errors, page_errors
        assert not console_errors, console_errors

        # Existing live controls stay in the DOM and are wired behind transparent hotspots.
        for rid in ['tapeCounterReset','playBeat','stopBeat','prevBeat','nextBeat','importBeatsBtn','importFolderBtn','loadSampleBtn','kickFolderBtn','snareFolderBtn','hatFolderBtn','autoLooperToggle','deckTransportState','deckSpeedReadout','looperVu']:
            assert page.locator('#'+rid).count()==1, rid
        handlers=page.evaluate('''() => ({
          play:typeof document.getElementById('playBeat').onclick,
          stop:typeof document.getElementById('stopBeat').onclick,
          reset:typeof document.getElementById('tapeCounterReset').onclick,
          sample:typeof document.getElementById('loadSampleBtn').onclick,
          kick:typeof document.getElementById('kickFolderBtn').onclick,
          speed:typeof document.getElementById('autoLooperToggle').onclick
        })''')
        assert all(v=='function' for v in handlers.values()), handlers

        # Approved asset mode suppresses the retired drawn hardware while preserving HTML hit areas.
        chrome=page.evaluate('''() => {
          const looper=document.getElementById('looper');
          const play=getComputedStyle(document.getElementById('playBeat'));
          const reset=document.getElementById('tapeCounterReset').getBoundingClientRect();
          const legacyMechanism=getComputedStyle(document.querySelector('.cassetteMechanismCrop'));
          const legacyReadout=getComputedStyle(document.querySelector('.deckReadout'));
          return {
            asset:looper.classList.contains('asset-ui'),
            ratio:looper.getBoundingClientRect().width/looper.getBoundingClientRect().height,
            playBackground:play.backgroundImage,
            playOpacity:parseFloat(play.opacity),
            resetW:reset.width,
            resetH:reset.height,
            mechanismDisplay:legacyMechanism.display,
            readoutDisplay:legacyReadout.display
          };
        }''')
        assert chrome['asset'] is True, chrome
        assert abs(chrome['ratio']-1.5)<.03,chrome
        assert chrome['playBackground']=='none' and chrome['playOpacity']<.01,chrome
        assert chrome['resetW']>8 and chrome['resetH']>8,chrome
        assert chrome['mechanismDisplay']=='none' and chrome['readoutDisplay']=='none',chrome

        # The requested live overlays are HTML and sit on the faceplate coordinate system.
        overlays=page.evaluate('''() => {
          const looper=document.getElementById('looper').getBoundingClientRect();
          const box=sel=>{
            const r=document.querySelector(sel).getBoundingClientRect();
            return {x:(r.left-looper.left)/looper.width,y:(r.top-looper.top)/looper.height,w:r.width/looper.width,h:r.height/looper.height};
          };
          return {
            track:box('.asset-track-readout'),
            state:box('.asset-state-readout'),
            loops:box('.asset-loop-readout'),
            speed:box('.asset-speed-level-readout'),
            play:box('#playBeat'),
            speedButton:box('#autoLooperToggle'),
            loadLibrary:box('#importFolderBtn'),
            loadBeat:box('#importBeatsBtn')
          };
        }''')
        def near(value,target,tol=.02):
            return abs(value-target)<=tol
        assert near(overlays['track']['x'],.0515) and near(overlays['state']['x'],.0515),overlays
        assert near(overlays['loops']['x'],.757) and near(overlays['speed']['x'],.7615),overlays
        assert near(overlays['play']['x'],.3555) and near(overlays['speedButton']['x'],.6555),overlays
        assert near(overlays['loadLibrary']['x'],.8655) and near(overlays['loadBeat']['x'],.8655),overlays

        # Real LOOPER import -> live readout -> PLAY/STOP.
        page.set_input_files('#beatFiles',str(beat))
        page.wait_for_function("document.getElementById('deckTrack').textContent === 'test-beat.wav'",timeout=10000)
        page.wait_for_function("document.querySelector('.asset-track-readout').textContent === 'TEST-BEAT.WAV'",timeout=5000)
        assert page.locator('#deckTransportState').inner_text() == 'READY'
        assert page.locator('.asset-state-readout').inner_text() == 'READY'
        assert page.locator('#library .track').count()>=1
        page.click('#playBeat')
        page.wait_for_function('deckSource !== null')
        page.wait_for_function("document.querySelector('.asset-state-readout').textContent === 'PLAYING'")
        assert page.locator('#looper.asset-playing').count()==1
        page.click('#stopBeat')
        page.wait_for_function('deckSource === null')
        page.wait_for_function("document.querySelector('.asset-state-readout').textContent === 'READY'")

        # Manual SPEED +1 contract: 0 -> +1 -> ... -> +5 -> 0, with real playback rate.
        speed=page.locator('.asset-speed-level-readout')
        assert speed.inner_text()=='0'
        sequence=[]
        for level in range(1,6):
            page.click('#autoLooperToggle')
            sequence.append(speed.inner_text())
            expected=100+level
            assert page.evaluate(f'autoLooperSpeedPercent === {expected}') is True
        page.click('#autoLooperToggle')
        sequence.append(speed.inner_text())
        assert sequence==['+1','+2','+3','+4','+5','0'],sequence
        assert page.evaluate('autoLooperSpeedPercent === 100 && autoLooperEnabledState === false') is True

        # Backlight intensity follows speed state and RESET clears it and the visible loop count.
        page.click('#autoLooperToggle')
        page.wait_for_function("parseFloat(getComputedStyle(document.querySelector('.asset-speed-glow')).opacity) > 0")
        glow_on=page.evaluate("parseFloat(getComputedStyle(document.querySelector('.asset-speed-glow')).opacity)")
        assert glow_on>0,glow_on
        page.click('#tapeCounterReset')
        assert speed.inner_text()=='0'
        assert page.locator('.asset-loop-readout').inner_text()=='0 / 8'
        page.wait_for_function("parseFloat(getComputedStyle(document.querySelector('.asset-speed-glow')).opacity) < 0.01")
        glow_off=page.evaluate("parseFloat(getComputedStyle(document.querySelector('.asset-speed-glow')).opacity)")
        assert glow_off<.01,glow_off

        # Space shortcut follows active mode, but not while a text input has focus.
        page.evaluate('document.activeElement && document.activeElement.blur()')
        page.keyboard.press('Space')
        page.wait_for_function('deckSource !== null')
        page.keyboard.press('Space')
        page.wait_for_function('deckSource === null')
        page.focus('#librarySearch')
        page.keyboard.press('Space')
        page.wait_for_timeout(120)
        assert page.evaluate('deckSource === null') is True
        page.fill('#librarySearch','')

        # Real CHOPPER sample import remains unchanged.
        page.click('[data-tab="chopper"]')
        assert page.locator('#chopper.active').count()==1
        page.set_input_files('#sampleFile',str(sample))
        page.wait_for_function("document.getElementById('chopStatus').textContent.includes('SAMPLE READY')",timeout=10000)
        assert page.evaluate("sampleName === 'test-sample.wav' && sampleBuffer !== null") is True

        # Filename XSS regression test: malicious-looking local names remain plain text.
        page.click('[data-tab="looper"]')
        page.set_input_files('#beatFiles',str(xss))
        page.wait_for_timeout(500)
        assert page.evaluate('window.__sp_xss') is None
        assert page.locator('#library img').count()==0

        # Windows-safe output filenames remain unchanged.
        assert page.evaluate("safeBeatFilename('CON.wav')") == '_CON'
        assert page.evaluate("safeBeatFilename('hello?.wav')") == 'hello_'

        assert page.locator('#appBootError.visible').count()==0
        context.close()
        browser.close()

print('OK: browser startup, asset faceplate hotspots/readouts/backlights, manual SPEED +1 cycle, real imports, transport, shortcuts and filename-XSS regression')
