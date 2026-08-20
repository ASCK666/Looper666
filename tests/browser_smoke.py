from pathlib import Path
import contextlib, http.server, socketserver, threading, os, sys, tempfile, wave, struct, math
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

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*_args):
        pass

with tempfile.TemporaryDirectory() as td, contextlib.ExitStack() as stack:
    td=Path(td)
    beat=td/'test-beat.wav'; sample=td/'test-sample.wav'; xss=td/'"><img src=x onerror=window.__sp_xss=1>.wav'
    make_wav(beat,.30,180); make_wav(sample,.42,330); make_wav(xss,.18,440)

    handler=lambda *a,**kw: QuietHandler(*a,directory=str(ROOT),**kw)
    server=socketserver.TCPServer(('127.0.0.1',0),handler)
    stack.callback(server.server_close)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    stack.callback(server.shutdown)
    port=server.server_address[1]

    chromium=os.environ.get('CHROMIUM','/usr/bin/chromium')
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
        context=browser.new_context(); page=context.new_page()
        page_errors=[]; console_errors=[]
        page.on('pageerror',lambda e:page_errors.append(str(e)))
        page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
        page.goto(f'http://127.0.0.1:{port}/index.html',wait_until='networkidle',timeout=30000)
        page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
        page.wait_for_function("document.querySelector('.looper-faceplate')?.naturalWidth === 1536",timeout=10000)

        assert page.evaluate('window.__SP.errors.length')==0
        assert not page_errors,page_errors
        assert page.locator('.looper-faceplate').count()==1
        assert page.locator('.looper-faceplate').get_attribute('src')=='./assets/looper-ui/faceplate.webp'
        assert page.locator('#library .track').count()==0

        for rid in ['tapeCounterReset','playBeat','stopBeat','prevBeat','nextBeat','importBeatsBtn','importFolderBtn','loadSampleBtn','kickFolderBtn','snareFolderBtn','hatFolderBtn','autoLooperToggle','deckTransportState']:
            assert page.locator('#'+rid).count()==1,rid
        handlers=page.evaluate('''() => ['playBeat','stopBeat','tapeCounterReset','loadSampleBtn','kickFolderBtn','autoLooperToggle','importBeatsBtn','importFolderBtn'].map(id=>typeof document.getElementById(id).onclick)''')
        assert all(v=='function' for v in handlers),handlers

        visible=page.evaluate('''() => ['playBeat','stopBeat','prevBeat','nextBeat','autoLooperToggle','importBeatsBtn','importFolderBtn'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),c=getComputedStyle(e);return [id,r.width,r.height,c.display,c.visibility,parseFloat(c.opacity)]})''')
        assert all(v[1]>20 and v[2]>20 and v[3]!='none' and v[4]=='visible' and v[5]>.5 for v in visible),visible

        page.set_input_files('#beatFiles',str(beat))
        page.wait_for_function("document.getElementById('cassetteBeatName').textContent === 'test-beat.wav'",timeout=10000)
        page.wait_for_function("document.querySelector('.asset-track-readout')?.textContent === 'test-beat.wav'",timeout=10000)
        assert page.locator('#library .track').count()==1
        page.click('#playBeat'); page.wait_for_function('deckSource !== null')
        page.wait_for_function("document.querySelector('.asset-state-readout')?.textContent === 'PLAYING'",timeout=5000)
        page.click('#stopBeat'); page.wait_for_function('deckSource === null')

        before=page.locator('.asset-speed-percent-readout').inner_text()
        page.click('#autoLooperToggle')
        page.wait_for_function("document.querySelector('.asset-speed-percent-readout')?.textContent === '101.0'",timeout=3000)
        assert before=='100.0'
        assert page.evaluate('autoLooperSpeedPercent')==101
        page.click('#tapeCounterReset')
        assert page.locator('.asset-speed-percent-readout').inner_text()=='100.0'

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

print('OK: faceplate.webp, HTML transport hotspots, imports, play/stop, speed control, shortcuts and filename-XSS regression')
