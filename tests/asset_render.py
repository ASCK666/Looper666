from pathlib import Path
import contextlib
import http.server
import socketserver
import threading
import time

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
        page.wait_for_function("document.querySelector('.looper-faceplate')?.naturalWidth > 0",timeout=15000)
        page.wait_for_function("document.getElementById('looper')?.classList.contains('asset-ready')",timeout=5000)

        info=page.evaluate('''() => {
          const looper=document.getElementById('looper');
          const img=document.querySelector('.looper-faceplate');
          const r=looper.getBoundingClientRect();
          const ir=img.getBoundingClientRect();
          const css=getComputedStyle(img);
          return {
            ready:looper.classList.contains('asset-ready'),
            loadError:looper.classList.contains('asset-load-error'),
            naturalWidth:img.naturalWidth,
            naturalHeight:img.naturalHeight,
            looper:{x:r.x,y:r.y,width:r.width,height:r.height},
            image:{x:ir.x,y:ir.y,width:ir.width,height:ir.height,display:css.display,opacity:css.opacity},
            appErrors:window.__SP?.errors||[],
            state:document.querySelector('.asset-state-readout')?.textContent,
            speed:document.querySelector('.asset-speed-level-readout')?.textContent,
            tracks:document.querySelectorAll('#library .track').length
          };
        }''')

        assert info['ready'] and not info['loadError'], info
        assert (info['naturalWidth'],info['naturalHeight'])==(1536,1024), info
        assert info['image']['display']!='none' and float(info['image']['opacity'])>.95, info
        assert abs(info['image']['width']-info['looper']['width'])<2, info
        assert abs(info['image']['height']-info['looper']['height'])<2, info
        assert info['looper']['width']>900 and info['looper']['height']>600, info
        assert info['state'] in {'EMPTY','READY','STOPPED','PLAYING'}, info
        assert info['speed']=='0', info
        assert info['tracks']>=3, info
        assert not info['appErrors'], info
        assert not page_errors, page_errors
        assert not failed, failed

        looper=page.locator('#looper')
        looper.screenshot(path=str(ARTIFACTS/'looper-render.png'))
        page.screenshot(path=str(ARTIFACTS/'full-render.png'),full_page=True)
        browser.close()

print('OK: approved Looper faceplate loads as a real 1536x1024 image and is visibly rendered over HTTP')
