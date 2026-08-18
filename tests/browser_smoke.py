from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os, sys, tempfile, threading, wave, struct, math

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

        assert page.evaluate('window.__SP.errors.length') == 0, page.evaluate('window.__SP.errors')
        assert not page_errors, page_errors
        assert not console_errors, console_errors

        # Critical controls are present and wired.
        for rid in ['cassetteDoorEject','tapeCounter','tapeCounterReset','playBeat','loadSampleBtn','kickFolderBtn','snareFolderBtn','hatFolderBtn','autoLooperToggle','deckTransportState','deckSpeedReadout','deckAutoReadout','looperVu']:
            assert page.locator('#'+rid).count()==1, rid
        handlers=page.evaluate('''() => ({
          play:typeof document.getElementById('playBeat').onclick,
          eject:typeof document.getElementById('cassetteDoorEject').onclick,
          counterReset:typeof document.getElementById('tapeCounterReset').onclick,
          sample:typeof document.getElementById('loadSampleBtn').onclick,
          kick:typeof document.getElementById('kickFolderBtn').onclick,
          auto:typeof document.getElementById('autoLooperToggle').onclick
        })''')
        assert all(v=='function' for v in handlers.values()), handlers

        # Generated faceplates are the single static hardware layer on desktop.
        faceplates=page.evaluate('''() => ({
          deck:getComputedStyle(document.querySelector('.cassetteDeck')).backgroundImage,
          crate:getComputedStyle(document.querySelector('.beatCratePanel')).backgroundImage
        })''')
        assert 'looper-deck-faceplate-retro.webp' in faceplates['deck'],faceplates
        assert 'looper-beat-crate-retro.webp' in faceplates['crate'],faceplates
        chrome=page.evaluate('''() => {
          const readout=getComputedStyle(document.querySelector('.deckReadout'));
          const mechanism=getComputedStyle(document.querySelector('.cassetteMechanismCrop'));
          const play=getComputedStyle(document.getElementById('playBeat'));
          const library=getComputedStyle(document.querySelector('.library'));
          return {
            readoutBackground:readout.backgroundImage,
            readoutBorder:readout.borderTopWidth,
            mechanismBackground:mechanism.backgroundImage,
            mechanismBorder:mechanism.borderTopWidth,
            playBackground:play.backgroundImage,
            playShadow:play.boxShadow,
            libraryBackground:library.backgroundImage,
            legacyDeckImage:getComputedStyle(document.querySelector('.cassetteDeckImage')).display,
            legacyDoorImage:getComputedStyle(document.querySelector('.cassetteDoorPanel')).display
          };
        }''')
        assert chrome['readoutBackground']=='none' and chrome['readoutBorder']=='0px',chrome
        assert chrome['mechanismBackground']=='none' and chrome['mechanismBorder']=='0px',chrome
        assert chrome['playBackground']=='none' and chrome['playShadow']=='none',chrome
        assert chrome['libraryBackground']=='none',chrome
        assert chrome['legacyDeckImage']=='none' and chrome['legacyDoorImage']=='none',chrome

        # Desktop HTML is pinned to the artwork coordinate system, not the retired grid.
        geometry=page.evaluate('''() => {
          const deck=document.querySelector('.cassetteDeck').getBoundingClientRect();
          const crate=document.querySelector('.beatCratePanel').getBoundingClientRect();
          const box=(selector,parent) => {
            const r=document.querySelector(selector).getBoundingClientRect();
            return {
              x:(r.left-parent.left)/parent.width,
              y:(r.top-parent.top)/parent.height,
              w:r.width/parent.width,
              h:r.height/parent.height
            };
          };
          return {
            deckRatio:deck.width/deck.height,
            readout:box('.deckReadout',deck),
            mechanism:box('.cassetteMechanismCrop',deck),
            counter:box('.tapeCounterModule',deck),
            prev:box('#prevBeat',deck),
            play:box('#playBeat',deck),
            stop:box('#stopBeat',deck),
            next:box('#nextBeat',deck),
            auto:box('#autoLooperToggle',deck),
            folder:box('#importFolderBtn',deck),
            beat:box('#importBeatsBtn',deck),
            crateRatio:crate.width/crate.height,
            library:box('.library',crate)
          };
        }''')
        def near(value,target,tol=.012):
            return abs(value-target) <= tol
        assert near(geometry['deckRatio'],1358/529,.02),geometry
        assert near(geometry['readout']['x'],.1679) and near(geometry['readout']['y'],.1550),geometry['readout']
        assert near(geometry['mechanism']['x'],.3100) and near(geometry['mechanism']['y'],.2476),geometry['mechanism']
        assert near(geometry['mechanism']['w'],.3697) and near(geometry['mechanism']['h'],.4461),geometry['mechanism']
        assert near(geometry['counter']['x'],.1405) and near(geometry['counter']['y'],.4310),geometry['counter']
        expected_buttons={
            'prev':(.2305,.7278,.1008,.1626),
            'play':(.3424,.7278,.1010,.1626),
            'stop':(.4536,.7278,.1010,.1626),
            'next':(.5648,.7278,.1010,.1626),
            'auto':(.6760,.7278,.1100,.1626),
            'folder':(.7342,.3554,.1082,.1360),
            'beat':(.7342,.5180,.1082,.1360),
        }
        for name,(x,y,w,h) in expected_buttons.items():
            actual=geometry[name]
            assert near(actual['x'],x,.015) and near(actual['y'],y,.015),(name,actual)
            assert near(actual['w'],w,.018) and near(actual['h'],h,.018),(name,actual)
        assert near(geometry['crateRatio'],1358/320,.03),geometry
        assert near(geometry['library']['x'],.0235) and near(geometry['library']['y'],.331,.018),geometry['library']

        # Real LOOPER import -> load -> PLAY/STOP.
        page.set_input_files('#beatFiles',str(beat))
        page.wait_for_function("document.getElementById('deckTrack').textContent === 'test-beat.wav'",timeout=10000)
        assert page.locator('#cassetteBeatName').inner_text() == 'TEST-BEAT.WAV'
        assert page.locator('#deckTransportState').inner_text() == 'READY'
        assert page.locator('#deckSpeedReadout').inner_text() == '100%'
        assert page.locator('#library .track').count()>=1
        page.click('#playBeat')
        page.wait_for_function('deckSource !== null')
        assert page.locator('#deckTransportState').inner_text() == 'PLAYING'
        assert page.locator('.cassetteDeck.playing').count() == 1
        reel_animation=page.evaluate('''() => ({
          left:getComputedStyle(document.querySelector('.cassetteReelLeft')).animationName,
          right:getComputedStyle(document.querySelector('.cassetteReelRight')).animationName,
          leftOpacity:parseFloat(getComputedStyle(document.querySelector('.cassetteReelLeft')).opacity),
          rightOpacity:parseFloat(getComputedStyle(document.querySelector('.cassetteReelRight')).opacity)
        })''')
        assert reel_animation['left']=='frontDeckSpin' and reel_animation['right']=='frontDeckSpin',reel_animation
        assert reel_animation['leftOpacity']>.9 and reel_animation['rightOpacity']>.9,reel_animation
        page.wait_for_timeout(1250)
        running_counter=page.locator('#tapeCounter').get_attribute('aria-label')
        assert running_counter != 'Compteur de bande 0000', running_counter
        page.click('#stopBeat')
        page.wait_for_function('deckSource === null')
        assert page.locator('#deckTransportState').inner_text() == 'READY'
        frozen_counter=page.locator('#tapeCounter').get_attribute('aria-label')
        page.wait_for_timeout(250)
        assert page.locator('#tapeCounter').get_attribute('aria-label') == frozen_counter
        page.click('#tapeCounterReset')
        assert page.locator('#tapeCounter').get_attribute('aria-label') == 'Compteur de bande 0000'

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

        # AUTO SPEED is a five-position hardware cycle: OFF -> 8 -> 4 -> 2 -> 1 -> OFF.
        auto=page.locator('#autoLooperToggle')
        assert auto.get_attribute('data-auto-step') == '0'
        assert auto.get_attribute('aria-pressed') == 'false'
        assert page.locator('#deckAutoReadout').inner_text() == 'OFF'
        off_glow=page.evaluate("getComputedStyle(document.getElementById('autoLooperToggle'),'::before').borderTopColor")
        auto_states=[
            ('1','true','1/8'),
            ('2','true','1/4'),
            ('3','true','1/2'),
            ('4','true','1/1'),
            ('0','false','OFF'),
        ]
        step4_glow=None
        for step,pressed,readout in auto_states:
            page.click('#autoLooperToggle')
            assert auto.get_attribute('data-auto-step') == step
            assert auto.get_attribute('aria-pressed') == pressed
            assert page.locator('#deckAutoReadout').inner_text() == readout
            if step=='4':
                step4_glow=page.evaluate("getComputedStyle(document.getElementById('autoLooperToggle'),'::before').borderTopColor")
        assert step4_glow and step4_glow != off_glow,(off_glow,step4_glow)
        assert page.evaluate('autoLooperEnabledState === false && autoLooperModeIndex === 0 && autoLooperSpeedPercent === 100') is True

        # Real CHOPPER sample import.
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
        assert '<img' in page.locator('#library').inner_text()

        # Windows-safe output filenames.
        assert page.evaluate("safeBeatFilename('CON.wav')") == '_CON'
        assert page.evaluate("safeBeatFilename('hello?.wav')") == 'hello_'

        assert page.locator('#appBootError.visible').count()==0
        context.close()
        browser.close()

print('OK: browser startup, faceplate geometry, cassette reels, tape counter, real imports, transport, shortcuts, five-state AUTO SPEED and filename-XSS regression')