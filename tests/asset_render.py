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
          const glow=document.querySelector('.asset-cassette-glow');
          const layer=getComputedStyle(glow);
          const leftReel=getComputedStyle(glow,'::before');
          const rightReel=getComputedStyle(glow,'::after');
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
            reelCount:document.querySelectorAll('.asset-cassette-glow').length,
            reelAsset:[leftReel.backgroundImage,rightReel.backgroundImage],
            reelStopped:[leftReel.animationPlayState,rightReel.animationPlayState,leftReel.opacity,rightReel.opacity],
            cassetteLayer:[layer.backgroundColor,layer.backgroundImage,layer.boxShadow,layer.filter,layer.mixBlendMode,layer.opacity],
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
        assert info['reelCount']==1, info
        assert all('cassette-reel-overlay.svg' in value for value in info['reelAsset']), info['reelAsset']
        assert info['reelStopped']==['paused','paused','0','0'], info['reelStopped']
        assert info['cassetteLayer']==['rgba(0, 0, 0, 0)','none','none','none','normal','1'], info['cassetteLayer']
        assert not info['appErrors'], info
        assert not page_errors, page_errors
        assert not failed, failed

        def reel_centers():
            return page.evaluate('''() => {
              const looper=document.getElementById('looper');
              const glow=document.querySelector('.asset-cassette-glow');
              const lb=looper.getBoundingClientRect();
              const gb=glow.getBoundingClientRect();
              return ['::before','::after'].map(which=>{
                const cs=getComputedStyle(glow,which);
                const left=parseFloat(cs.left),top=parseFloat(cs.top),width=parseFloat(cs.width),height=parseFloat(cs.height);
                return [(gb.left-lb.left+left+width/2)/lb.width,(gb.top-lb.top+top+height/2)/lb.height];
              });
            }''')

        centers_large=reel_centers()
        page.set_viewport_size({'width':1000,'height':900})
        page.wait_for_timeout(100)
        centers_small=reel_centers()
        assert all(abs(a-b)<.004 for pair_a,pair_b in zip(centers_large,centers_small) for a,b in zip(pair_a,pair_b)), (centers_large,centers_small)
        page.set_viewport_size({'width':1536,'height':1200})

        page.evaluate('''() => {
          deckBuffer=new AudioBuffer({numberOfChannels:1,length:44100,sampleRate:44100});
          document.getElementById('deckTrack').textContent='motion-test.wav';
          refreshCassetteUI();
        }''')
        page.click('#playBeat')
        page.wait_for_function("deckSource !== null && document.getElementById('looper').classList.contains('asset-playing')",timeout=5000)
        page.wait_for_function("parseFloat(getComputedStyle(document.querySelector('.asset-cassette-glow'),'::before').opacity) > .5",timeout=1000)
        playing=page.evaluate('''() => {
          const glow=document.querySelector('.asset-cassette-glow');
          const left=getComputedStyle(glow,'::before');
          const right=getComputedStyle(glow,'::after');
          return [left.animationPlayState,right.animationPlayState,left.opacity,right.opacity,left.animationDuration,right.animationDuration,left.transform,right.transform];
        }''')
        assert playing[0:2]==['running','running'], playing
        assert all(float(v)>.5 for v in playing[2:4]), playing
        assert all(value!='none' for value in playing[6:8]), playing
        cassette_layer_playing=page.evaluate('''() => {
          const cs=getComputedStyle(document.querySelector('.asset-cassette-glow'));
          return [cs.backgroundColor,cs.backgroundImage,cs.boxShadow,cs.filter,cs.mixBlendMode,cs.opacity];
        }''')
        assert cassette_layer_playing==info['cassetteLayer'], (info['cassetteLayer'],cassette_layer_playing)
        page.locator('#looper').screenshot(path=str(ARTIFACTS/'looper-reels-playing.png'))
        page.wait_for_timeout(320)
        moved=page.evaluate('''() => {
          const glow=document.querySelector('.asset-cassette-glow');
          return [getComputedStyle(glow,'::before').transform,getComputedStyle(glow,'::after').transform];
        }''')
        assert moved!=playing[6:8], (playing[6:8],moved)

        page.click('#autoLooperToggle')
        page.wait_for_function("document.getElementById('looper').dataset.speedLevel === '1'",timeout=3000)
        sped=page.evaluate('''() => {
          const glow=document.querySelector('.asset-cassette-glow');
          return [getComputedStyle(glow,'::before').animationDuration,getComputedStyle(glow,'::after').animationDuration];
        }''')
        assert sped!=playing[4:6], (playing,sped)

        for _ in range(2):
            page.click('#stopBeat')
            page.wait_for_function("deckSource === null && !document.getElementById('looper').classList.contains('asset-playing')",timeout=3000)
            page.wait_for_function("parseFloat(getComputedStyle(document.querySelector('.asset-cassette-glow'),'::before').opacity) < .01",timeout=1000)
            stopped=page.evaluate('''() => {
              const glow=document.querySelector('.asset-cassette-glow');
              return [getComputedStyle(glow,'::before').animationPlayState,getComputedStyle(glow,'::after').animationPlayState,getComputedStyle(glow,'::before').opacity,getComputedStyle(glow,'::after').opacity,document.querySelectorAll('.asset-cassette-glow').length];
            }''')
            assert stopped==['paused','paused','0','0',1], stopped
            page.click('#playBeat')
            page.wait_for_function("deckSource !== null && document.getElementById('looper').classList.contains('asset-playing')",timeout=3000)
            page.wait_for_function("parseFloat(getComputedStyle(document.querySelector('.asset-cassette-glow'),'::before').opacity) > .5",timeout=1000)

        page.click('#stopBeat')
        page.wait_for_function("deckSource === null && !document.getElementById('looper').classList.contains('asset-playing')",timeout=3000)
        page.wait_for_function("parseFloat(getComputedStyle(document.querySelector('.asset-cassette-glow'),'::before').opacity) < .01",timeout=1000)
        page.click('#tapeCounterReset')
        with page.expect_file_chooser(timeout=3000):
            page.click('#importBeatsBtn')

        page.locator('#looper').screenshot(path=str(ARTIFACTS/'looper-render.png'))
        page.screenshot(path=str(ARTIFACTS/'full-render.png'),full_page=True)
        assert not page_errors,page_errors
        assert not failed,failed
        context_errors=page.evaluate('window.__SP?.errors||[]')
        assert not context_errors,context_errors
        browser.close()

print('OK: faceplate and cassette body stay fixed; only reel mechanisms visibly rotate with PLAY/STOP, speed and responsive alignment')
