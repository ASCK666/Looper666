from pathlib import Path
import contextlib
import http.server
import socketserver
import threading

try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed')
    raise SystemExit(0)

ROOT=Path(__file__).resolve().parents[1]
ARTIFACTS=ROOT/'test-artifacts'
ARTIFACTS.mkdir(exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

with contextlib.ExitStack() as stack:
    handler=lambda *a,**kw: QuietHandler(*a,directory=str(ROOT),**kw)
    server=socketserver.TCPServer(('127.0.0.1',0),handler)
    stack.callback(server.server_close)
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    stack.callback(server.shutdown)
    port=server.server_address[1]

    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1536,'height':1200},device_scale_factor=1)
        console_errors=[]
        page_errors=[]
        failed=[]
        page.on('console',lambda msg: console_errors.append(msg.text) if msg.type=='error' else None)
        page.on('pageerror',lambda err: page_errors.append(str(err)))
        page.on('requestfailed',lambda req: failed.append(f'{req.url}: {req.failure}'))
        page.goto(f'http://127.0.0.1:{port}/index.html',wait_until='networkidle',timeout=30000)
        page.wait_for_function("window.__SP?.ready === true",timeout=10000)
        page.wait_for_function("document.querySelector('.looper-faceplate')?.naturalWidth === 1536",timeout=10000)

        info=page.evaluate('''() => {
          const looper=document.getElementById('looper');
          const face=document.querySelector('.looper-faceplate');
          const ids=['prevBeat','playBeat','stopBeat','nextBeat','autoLooperToggle','importFolderBtn','importBeatsBtn'];
          const readouts=['asset-header-state-readout','asset-track-readout','asset-state-readout','asset-speed-percent-readout','asset-loop-readout','asset-speed-level-readout'];
          return {
            looper:looper.getBoundingClientRect().toJSON(),
            faceplates:document.querySelectorAll('.looper-faceplate').length,
            faceSrc:face?.getAttribute('src')||'',
            faceSize:[face?.naturalWidth||0,face?.naturalHeight||0],
            tracks:document.querySelectorAll('#library .track').length,
            controls:ids.map(id=>{const el=document.getElementById(id),b=el.getBoundingClientRect(),cs=getComputedStyle(el);return {id,w:b.width,h:b.height,display:cs.display,visibility:cs.visibility,opacity:parseFloat(cs.opacity),handler:typeof el.onclick};}),
            readouts:readouts.map(cls=>{const el=document.querySelector('.'+cls),cs=getComputedStyle(el);return [cls,cs.backgroundColor];}),
            appErrors:window.__SP?.errors||[]
          };
        }''')

        assert info['looper']['width']>600 and info['looper']['height']>350, info
        assert info['faceplates']==1, info
        assert info['faceSrc']=='./assets/looper-ui/faceplate.webp', info
        assert info['faceSize']==[1536,1024], info
        assert info['tracks']==0, info
        assert all(c['display']!='none' and c['visibility']=='visible' and c['opacity']>.5 and c['w']>20 and c['h']>20 and c['handler']=='function' for c in info['controls']), info
        expected={cls:'rgba(0, 0, 0, 0)' for cls in [
          'asset-header-state-readout',
          'asset-track-readout',
          'asset-state-readout',
          'asset-speed-percent-readout',
          'asset-loop-readout',
          'asset-speed-level-readout',
        ]}
        assert dict(info['readouts'])==expected, info['readouts']
        assert not info['appErrors'], info
        assert not page_errors, page_errors
        assert not failed, failed

        page.click('#tapeCounterReset')
        page.click('#stopBeat')
        with page.expect_file_chooser(timeout=3000):
            page.click('#importBeatsBtn')

        page.locator('#looper').screenshot(path=str(ARTIFACTS/'looper-render.png'))
        page.screenshot(path=str(ARTIFACTS/'full-render.png'),full_page=True)
        browser.close()

print('OK: approved faceplate.webp is mounted, dynamic deck readouts are transparent, and primary controls execute click paths')
