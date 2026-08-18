from pathlib import Path
import contextlib, http.server, socketserver, threading, sys
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed')
    sys.exit(0)

ROOT=Path(__file__).resolve().parents[1]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*_args):
        pass

with contextlib.ExitStack() as stack:
    handler=lambda *a,**kw: QuietHandler(*a,directory=str(ROOT),**kw)
    server=socketserver.TCPServer(('127.0.0.1',0),handler)
    stack.callback(server.server_close)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    stack.callback(server.shutdown)
    port=server.server_address[1]

    chromium='/usr/bin/chromium'
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
        for width,height in [(1440,1100),(820,1000),(520,900)]:
            page=browser.new_page(viewport={'width':width,'height':height})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(f'http://127.0.0.1:{port}/index.html',wait_until='networkidle',timeout=30000)
            page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
            page.wait_for_function("document.querySelector('.looper-faceplate')?.naturalWidth === 1536",timeout=10000)

            metrics=page.evaluate('''() => {
              const looper=document.getElementById('looper'),face=document.querySelector('.looper-faceplate');
              const lr=looper.getBoundingClientRect(),fr=face.getBoundingClientRect();
              return {bodyW:document.body.scrollWidth,viewportW:innerWidth,looper:lr.toJSON(),face:fr.toJSON(),faceplates:document.querySelectorAll('.looper-faceplate').length,tracks:document.querySelectorAll('#library .track').length};
            }''')
            assert metrics['faceplates']==1 and metrics['tracks']==0,metrics
            assert metrics['looper']['width']>300 and metrics['looper']['height']>190,metrics
            assert abs(metrics['looper']['width']/metrics['looper']['height']-1.5)<.03,metrics
            assert abs(metrics['face']['width']-metrics['looper']['width'])<2 and abs(metrics['face']['height']-metrics['looper']['height'])<2,metrics
            assert metrics['bodyW']<=metrics['viewportW']+2,metrics

            controls=page.evaluate('''() => ['prevBeat','playBeat','stopBeat','nextBeat','autoLooperToggle','importBeatsBtn','importFolderBtn'].map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect(),cs=getComputedStyle(el);return {id,w:r.width,h:r.height,display:cs.display,visibility:cs.visibility,opacity:parseFloat(cs.opacity),handler:typeof el.onclick};})''')
            assert all(x['display']!='none' and x['visibility']=='visible' and x['opacity']>.5 and x['w']>18 and x['h']>18 and x['handler']=='function' for x in controls),controls

            page.click('#tapeCounterReset')
            page.click('#stopBeat')
            page.click('[data-tab="chopper"]'); page.wait_for_timeout(80)
            assert page.locator('#chopper.active').count()==1
            page.click('[data-tab="looper"]'); page.wait_for_timeout(80)
            assert page.locator('#looper.active .looper-faceplate').count()==1
            assert not errors,errors
            page.close()
        browser.close()

print('OK: faceplate-only Looper stays aligned and its real HTML controls remain clickable across responsive layouts')
