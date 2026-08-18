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

        info=page.evaluate('''() => {
          const looper=document.getElementById('looper');
          const r=looper.getBoundingClientRect();
          const ids=['prevBeat','playBeat','stopBeat','nextBeat','autoLooperToggle','importFolderBtn','importBeatsBtn'];
          return {
            looper:{width:r.width,height:r.height,display:getComputedStyle(looper).display},
            faceplates:document.querySelectorAll('.looper-faceplate').length,
            tracks:document.querySelectorAll('#library .track').length,
            emptyText:document.querySelector('#library .libraryEmptyMessage')?.textContent||'',
            controls:ids.map(id=>{
              const el=document.getElementById(id),b=el.getBoundingClientRect(),cs=getComputedStyle(el);
              return {id,w:b.width,h:b.height,display:cs.display,visibility:cs.visibility,opacity:parseFloat(cs.opacity),handler:typeof el.onclick};
            }),
            appErrors:window.__SP?.errors||[]
          };
        }''')

        assert info['looper']['display']!='none' and info['looper']['width']>600 and info['looper']['height']>300, info
        assert info['faceplates']==0, info
        assert info['tracks']==0, info
        assert 'Aucun résultat' in info['emptyText'], info
        assert all(c['display']!='none' and c['visibility']=='visible' and c['opacity']>.5 and c['w']>20 and c['h']>20 and c['handler']=='function' for c in info['controls']), info

        page.click('#tapeCounterReset')
        page.click('#stopBeat')
        with page.expect_file_chooser(timeout=3000):
            page.click('#importBeatsBtn')
        assert not info['appErrors'], info
        assert not page_errors, page_errors
        assert not failed, failed

        page.locator('#looper').screenshot(path=str(ARTIFACTS/'looper-render.png'))
        page.screenshot(path=str(ARTIFACTS/'full-render.png'),full_page=True)
        browser.close()

print('OK: real Looper DOM is visible, empty crate is truthful, and primary controls execute click paths over HTTP')
