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
    for rel in ['./css/base.css','./css/clean-ui.css']:
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
      rows:document.querySelectorAll('#loopGrid .matrixRowLabel').length,
      timelineWidth:document.getElementById('sampleTimelineCanvas').width,
      playheadWidth:document.getElementById('sampleTimelinePlayheadCanvas').width,
      gridWidth:document.getElementById('loopGrid').scrollWidth
    })''')
    assert state['markers']==17,state
    assert state['pads']==16 and state['rows']==16 and state['cells']==256,state
    assert state['timelineWidth']==max(830,state['gridWidth']),state
    assert state['playheadWidth']==state['timelineWidth'],state
    # The sequence timeline must draw the actual source range selected by each trigger.
    page.evaluate('''() => {
      const original=drawBufferRange;
      window.__timelineRanges=[];
      drawBufferRange=function(context,buffer,startSec,endSec,x,width,height){
        if(context===sampleTimeline2d){
          window.__timelineRanges.push({startSec,endSec,x,width});
        }
        return original(context,buffer,startSec,endSec,x,width,height);
      };
    }''')
    timeline_empty=page.evaluate("document.getElementById('sampleTimelineCanvas').toDataURL()")
    first_pad_step0=page.locator('#loopGrid .matrixCell:not(.unavailable)').nth(0)
    first_pad_step0.click();page.wait_for_timeout(20)
    assert page.evaluate('loopGridEvents[0]===1') is True
    first_range=page.evaluate('window.__timelineRanges.at(-1)')
    first_marker=page.evaluate('markers[0]')
    assert abs(first_range['startSec']-first_marker)<1e-9,(first_range,first_marker)
    timeline_active=page.evaluate("document.getElementById('sampleTimelineCanvas').toDataURL()")
    assert timeline_active!=timeline_empty
    # Replacing the trigger at the same musical time must restart the visible waveform from the new chop marker.
    second_pad_step0=page.locator('#loopGrid .matrixCell:not(.unavailable)').nth(16)
    page.evaluate('window.__timelineRanges=[]')
    second_pad_step0.click();page.wait_for_timeout(20)
    assert page.evaluate('loopGridEvents[0]===2') is True
    second_range=page.evaluate('window.__timelineRanges.at(-1)')
    second_marker=page.evaluate('markers[1]')
    assert abs(second_range['startSec']-second_marker)<1e-9,(second_range,second_marker)
    assert second_range['startSec']>first_range['startSec'],(first_range,second_range)
    page.fill('#sampleBpm','120');page.dispatch_event('#sampleBpm','input');page.wait_for_timeout(20)
    timeline_bpm=page.evaluate("document.getElementById('sampleTimelineCanvas').toDataURL()")
    assert timeline_bpm!=timeline_active
    # Current grid contract: right-click removes the trigger and the timeline returns to its empty state.
    second_pad_step0.click(button='right');page.wait_for_timeout(20)
    assert page.evaluate('loopGridEvents.every(v=>v===0)') is True
    timeline_cleared=page.evaluate("document.getElementById('sampleTimelineCanvas').toDataURL()")
    assert timeline_cleared!=timeline_bpm
    # The musical playhead uses the existing loop transport/RAF, keeps moving through silent sample gaps, and clears on STOP.
    first_pad_step0.click();page.wait_for_timeout(20)
    playhead_pixels='''() => {
      const canvas=document.getElementById('sampleTimelinePlayheadCanvas');
      const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let count=0,minX=canvas.width,maxX=-1;
      for(let i=3;i<data.length;i+=4){
        if(data[i]===0)continue;
        const pixel=(i-3)/4;
        const x=pixel%canvas.width;
        count++;
        if(x<minX)minX=x;
        if(x>maxX)maxX=x;
      }
      return {count,minX,maxX,width:canvas.width,height:canvas.height};
    }'''
    assert page.evaluate(playhead_pixels)['count']==0
    page.click('#previewFlip')
    page.wait_for_function('isLoopPlaying === true && loopPlayheadState !== null',timeout=5000)
    page.wait_for_function('''() => {
      const c=document.getElementById('sampleTimelinePlayheadCanvas');
      const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      for(let i=3;i<d.length;i+=4)if(d[i]!==0)return true;
      return false;
    }''',timeout=5000)
    first_playhead=page.evaluate(playhead_pixels)
    page.wait_for_timeout(140)
    second_playhead=page.evaluate(playhead_pixels)
    assert first_playhead['count']>0 and second_playhead['count']>0,(first_playhead,second_playhead)
    assert second_playhead['minX']>first_playhead['minX'],(first_playhead,second_playhead)
    page.click('#stopFlip');page.wait_for_timeout(30)
    assert page.evaluate('isLoopPlaying === false && loopPlayheadState === null') is True
    assert page.evaluate(playhead_pixels)['count']==0
    # Essential controls must remain physically clickable after CSS changes.
    boxes=page.evaluate('''() => ['loadSampleBtn','autoMarkers','previewFlip','stopFlip','addFlipLibrary','clearGrid'].map(id=>{
      const r=document.getElementById(id).getBoundingClientRect();return {id,w:r.width,h:r.height};
    })''')
    assert all(x['w']>20 and x['h']>20 for x in boxes),boxes
    assert not errors,errors
    page.close();browser.close()
print('OK: Chopper UI — sample import/volume/pitch, triggered-source timeline/playhead, AUTO CHOP, 16 pads, 16x16 grid and place/clear')
