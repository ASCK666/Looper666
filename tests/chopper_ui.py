from pathlib import Path
import math,re,struct,sys,tempfile,wave
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed');sys.exit(0)
ROOT=Path(__file__).resolve().parents[1]

def make_wav(path,duration=.55,freq=220,sr=44100):
    n=int(duration*sr)
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr)
        frames=bytearray()
        for i in range(n):
            # transient-rich but deterministic source for the chopper.
            env=.8 if (i%(sr//8)) < 1800 else .25
            v=max(-1,min(1,env*math.sin(2*math.pi*freq*i/sr)))
            frames += struct.pack('<h',int(v*32767))
        w.writeframes(frames)

def inline_project():
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    html=re.sub(r'<link rel="manifest"[^>]*>','',html)
    for rel in ['./css/base.css']:
        css=(ROOT/rel[2:]).read_text(encoding='utf-8')
        html=html.replace(f'<link rel="stylesheet" href="{rel}">',f'<style>{css}</style>')
    html=re.sub(r'src="assets/[^"]+"','src=""',html)
    for rel in ['./js/bootstrap.js','./js/core.js','./js/looper.js','./js/practice.js','./js/chopper.js','./js/drums.js','./js/events.js']:
        js=(ROOT/rel[2:]).read_text(encoding='utf-8')
        html=html.replace(f'<script src="{rel}" defer></script>',f'<script>{js}</script>')
        html=html.replace(f'<script src="{rel}"></script>',f'<script>{js}</script>')
    return html

with tempfile.TemporaryDirectory() as td, sync_playwright() as p:
    sample=Path(td)/'chopper-ui.wav';make_wav(sample)
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1280,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(inline_project(),wait_until='load',timeout=20000)
    page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
    page.click('[data-tab="chopper"]')
    page.set_input_files('#sampleFile',str(sample));page.wait_for_timeout(150)
    assert page.evaluate('sampleBuffer !== null && sampleName === "chopper-ui.wav"')
    # SAMPLE VOL is one Chopper operation: state, readout and active audition gain stay aligned.
    page.fill('#sampleVolume','37');page.dispatch_event('#sampleVolume','input')
    assert page.evaluate('sampleVolumePercent')==37
    assert page.locator('#sampleVolumeReadout').inner_text()=='37%'
    volume=page.evaluate('''() => {
      const previous=chopAuditionGain;
      chopAuditionGain={gain:{value:-1}};
      updateSampleVolume(42);
      const result={actual:chopAuditionGain.gain.value,expected:sampleVolumeGain()*sampleConditionTrimGain()};
      chopAuditionGain=previous;
      return result;
    }''')
    assert abs(volume['actual']-volume['expected'])<1e-9,volume
    # SAMPLE PITCH is one Chopper operation: state/UI update and any active audition stops.
    page.evaluate('''() => {
      window.__pitchAuditionStopped=false;
      chopAuditionSource={stop(){window.__pitchAuditionStopped=true;}};
      chopAuditionGain={gain:{value:1}};
      chopAuditionPad=0;
    }''')
    page.fill('#samplePitch','-5');page.dispatch_event('#samplePitch','input')
    pitch=page.evaluate('''() => ({
      semitones:samplePitchSemitones,
      readout:document.getElementById('samplePitchReadout').textContent,
      info:document.getElementById('sampleInfo').textContent,
      auditionStopped:window.__pitchAuditionStopped,
      sourceCleared:chopAuditionSource===null,
      gainCleared:chopAuditionGain===null
    })''')
    assert pitch['semitones']==-5,pitch
    assert pitch['readout']=='-5 st' and '-5 st' in pitch['info'],pitch
    assert pitch['auditionStopped'] and pitch['sourceCleared'] and pitch['gainCleared'],pitch
    # AUTO CHOP must still populate the sixteen-pad workstation.
    page.click('#autoMarkers');page.wait_for_timeout(50)
    state=page.evaluate('''() => ({
      markers:markers.length,
      pads:document.querySelectorAll('#pads .pad').length,
      cells:document.querySelectorAll('#loopGrid .matrixCell').length,
      rows:document.querySelectorAll('#loopGrid .matrixRowLabel').length
    })''')
    assert state['markers']==17,state
    assert state['pads']==16 and state['rows']==16 and state['cells']==256,state
    # Current grid contract: click places one pad, right-click removes it.
    cell=page.locator('#loopGrid .matrixCell:not(.unavailable)').first
    cell.click();page.wait_for_timeout(20)
    assert page.evaluate('loopGridEvents.some(v=>v>0)') is True
    cell.click(button='right');page.wait_for_timeout(20)
    assert page.evaluate('loopGridEvents.every(v=>v===0)') is True
    # Essential controls must remain physically clickable after CSS changes.
    boxes=page.evaluate('''() => ['loadSampleBtn','autoMarkers','previewFlip','stopFlip','addFlipLibrary','clearGrid'].map(id=>{
      const r=document.getElementById(id).getBoundingClientRect();return {id,w:r.width,h:r.height};
    })''')
    assert all(x['w']>20 and x['h']>20 for x in boxes),boxes
    assert not errors,errors
    page.close();browser.close()
print('OK: Chopper UI — sample import/volume/pitch, AUTO CHOP, 16 pads, 16x16 grid, place/clear and clickable controls')
