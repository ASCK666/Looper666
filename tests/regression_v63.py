from pathlib import Path
import os, sys, tempfile, wave, struct, math

try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed')
    sys.exit(0)

ROOT=Path(__file__).resolve().parents[1]

def make_wav(path: Path, seconds=.35, hz=220, amp=.2):
    rate=44100
    frames=max(1,int(rate*seconds))
    with wave.open(str(path),'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        out=[]
        for i in range(frames):
            v=int(amp*32767*math.sin(2*math.pi*hz*i/rate))
            out.append(struct.pack('<h',v))
        wf.writeframes(b''.join(out))

html=(ROOT/'index.html').read_text(encoding='utf-8')
for rel in ['./css/base.css']:
    css=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<link rel="stylesheet" href="{rel}">',f'<style>{css}</style>')
for rel in ['./js/bootstrap.js','./js/core.js','./js/looper.js','./js/practice.js','./js/chopper.js','./js/drums.js','./js/events.js']:
    js=(ROOT/rel[2:]).read_text(encoding='utf-8')
    html=html.replace(f'<script src="{rel}" defer></script>',f'<script>{js}</script>')
    html=html.replace(f'<script src="{rel}"></script>',f'<script>{js}</script>')

with tempfile.TemporaryDirectory() as td:
    td=Path(td)
    beat_a=td/'beat-a.wav'
    beat_b=td/'beat-b.wav'
    sample=td/'sample.wav'
    kick_dir=td/'kick-lib'; kick_dir.mkdir()
    snare_dir=td/'snare-lib'; snare_dir.mkdir()
    hat_dir=td/'hat-lib'; hat_dir.mkdir()
    kick=kick_dir/'kick.wav'
    snare=snare_dir/'snare.wav'
    hat=hat_dir/'hat.wav'
    make_wav(beat_a,.31,180)
    make_wav(beat_b,.29,205)
    make_wav(sample,.55,330,.35)
    make_wav(kick,.12,80,.45)
    make_wav(snare,.10,190,.35)
    make_wav(hat,.06,720,.25)

    chromium=os.environ.get('CHROMIUM','/usr/bin/chromium')
    with sync_playwright() as p:
        browser=p.chromium.launch(
            headless=True,
            executable_path=chromium,
            args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']
        )
        context=browser.new_context()
        page=context.new_page()
        page.set_default_timeout(15000)
        page_errors=[]
        console_errors=[]
        page.on('pageerror',lambda e:page_errors.append(str(e)))
        page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
        page.set_content(html,wait_until='load',timeout=15000)
        page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)

        # 1) SAVE must validate before any filesystem picker.
        page.evaluate('''() => {
          window.__pickerCalls=0;
          window.showDirectoryPicker=async()=>{ window.__pickerCalls++; throw new Error('picker should not open'); };
          beatDirectoryHandle=null;
          sampleBuffer=null;
          loopGridEvents=new Array(16).fill(0);
        }''')
        page.evaluate("document.getElementById('addFlipLibrary').click()")
        page.wait_for_function("document.getElementById('beatSaveStatus').textContent.includes('Charge un sample')")
        assert page.evaluate('window.__pickerCalls') == 0

        # 2) MASTER dB readout must be logarithmic.
        page.evaluate('''() => {
          const el=document.getElementById('masterVolume');
          el.value='25';
          el.dispatchEvent(new Event('input',{bubbles:true}));
        }''')
        assert page.locator('#masterDb').inner_text() == '-12.0 dB'

        # 3) Stereo conditioner must not cancel anti-phase channels.
        stereo=page.evaluate('''() => {
          const b=new AudioBuffer({length:44100,sampleRate:44100,numberOfChannels:2});
          const l=b.getChannelData(0),r=b.getChannelData(1);
          for(let i=0;i<b.length;i++){
            const x=.95*Math.sin(2*Math.PI*440*i/44100);
            l[i]=x; r[i]=-x;
          }
          return analyzeSampleCondition(b);
        }''')
        assert stereo['peakDb'] > -1.0, stereo
        assert stereo['rmsDb'] > -5.0, stereo
        assert stereo['trimDb'] <= -2.5, stereo

        # 4) Loop finalizer must eliminate the circular sample jump and leave middle untouched.
        loopcheck=page.evaluate('''() => {
          const b=new AudioBuffer({length:12000,sampleRate:44100,numberOfChannels:1});
          const d=b.getChannelData(0);
          d.fill(.123);
          d[0]=.9; d[d.length-1]=-.8;
          const middleBefore=d[6000];
          finalizeLoopBuffer(b,3);
          return {jump:Math.abs(d[0]-d[d.length-1]),middleDelta:Math.abs(d[6000]-middleBefore)};
        }''')
        assert loopcheck['jump'] < 1e-7, loopcheck
        assert loopcheck['middleDelta'] == 0, loopcheck

        # 5) Reverb impulse itself is deterministic.
        reverb=page.evaluate('''() => {
          const a=new OfflineAudioContext(2,88200,44100);
          const b=new OfflineAudioContext(2,88200,44100);
          const impulseA=makeReverbImpulse(a,'plate');
          const impulseB=makeReverbImpulse(b,'plate');
          let max=0;
          for(let ch=0;ch<2;ch++){
            const dataA=impulseA.getChannelData(ch), dataB=impulseB.getChannelData(ch);
            for(let i=0;i<dataA.length;i+=17)max=Math.max(max,Math.abs(dataA[i]-dataB[i]));
          }
          return max;
        }''')
        assert reverb == 0, reverb

        # Import two LOOPER beats.
        page.set_input_files('#beatFiles',[str(beat_a),str(beat_b)])
        page.wait_for_function("document.querySelectorAll('#library .track .danger').length >= 2 && deckBuffer !== null",timeout=10000)

        # 6) NEXT/PREV preserves transport state.
        page.click('#stopBeat')
        before=page.evaluate('currentTrack.id')
        page.click('#nextBeat')
        page.wait_for_function('(id) => currentTrack?.id !== id',arg=before)
        after=page.evaluate('currentTrack.id')
        assert after != before
        assert page.evaluate('deckSource === null') is True

        page.click('#playBeat')
        page.wait_for_function('deckSource !== null')
        before_playing=page.evaluate('currentTrack.id')
        page.click('#prevBeat')
        page.wait_for_function('(id) => currentTrack?.id !== id && deckSource !== null',arg=before_playing)
        after_playing=page.evaluate('currentTrack.id')
        assert after_playing != before_playing
        assert page.evaluate('deckSource !== null') is True
        page.click('#stopBeat')

        # 7) Closing PRACTICE must stop the hidden timer.
        page.click('#practiceOverlayOpen')
        page.click('#startPractice')
        page.wait_for_function('practiceTimer !== null')
        page.click('#practiceOverlayClose')
        assert page.evaluate('practiceTimer === null') is True
        assert page.locator('#practice.overlayOpen').count() == 0
        page.click('#stopBeat')

        # 8) Deleting the currently loaded imported beat fully unloads the deck.
        # Ensure current row is visible/active, then delete its own X button.
        page.wait_for_function("document.querySelector('#library .track.active .danger') !== null")
        page.locator('#library .track.active .danger').click()
        page.wait_for_function('currentTrack === null && deckBuffer === null')
        assert page.locator('#deckTrack').inner_text() == 'Aucun beat chargé'
        page.click('#playBeat')
        page.wait_for_timeout(120)
        assert page.evaluate('deckSource === null') is True

        # 9) Real CHOPPER sample import and PITCH rerender while playing.
        page.click('[data-tab="chopper"]')
        page.set_input_files('#sampleFile',str(sample))
        page.wait_for_function("document.getElementById('chopStatus').textContent.includes('SAMPLE READY')",timeout=10000)
        page.evaluate('''() => {
          document.getElementById('drumMode').value='off';
          currentDrumSelection=null;
          loopGridEvents=new Array(16).fill(0);
          loopGridEvents[0]=1;
          renderLoopGrid();
        }''')
        page.evaluate('playCurrentBeat()')
        page.wait_for_function('isLoopPlaying === true && renderedFlip !== null',timeout=15000)
        page.evaluate('window.__oldRenderedFlip=renderedFlip')
        page.evaluate('''() => {
          const el=document.getElementById('samplePitch');
          el.value='3';
          el.dispatchEvent(new Event('input',{bubbles:true}));
          el.dispatchEvent(new Event('change',{bubbles:true}));
        }''')
        page.wait_for_function('renderedFlip !== window.__oldRenderedFlip',timeout=15000)
        assert page.evaluate('isLoopPlaying === true && samplePitchSemitones === 3') is True
        page.click('#stopFlip')

        # 10) Two complete renders with SNARE REVERB must be identical.
        render_diff=page.evaluate('''async() => {
          const hit=new AudioBuffer({length:1800,sampleRate:44100,numberOfChannels:1});
          const d=hit.getChannelData(0);
          for(let i=0;i<d.length;i++)d[i]=Math.sin(2*Math.PI*190*i/44100)*Math.exp(-i/400)*.4;
          currentDrumSelection={
            mode:'classic',patternId:'TEST',patternName:'TEST',
            kicks:[],snares:[4],ghosts:[],hatSteps:[],
            kickVelocity:{},snareVelocity:{4:1},hatVelocity:{},
            hatSwing:0,hatOn:.2,hatOff:.15,snareDelay:0,kickNudge:{},
            kick:{name:'k',buffer:hit},snare:{name:'s',buffer:hit},hat:{name:'h',buffer:hit}
          };
          document.getElementById('snareReverbOn').checked=true;
          document.getElementById('snareReverbType').value='plate';
          document.getElementById('snareReverbMix').value='35';
          document.getElementById('punchMode').value='off';
          const events=new Array(16).fill(0); events[0]=1; events[8]=1;
          const a=await renderSequence(events,sampleBuffer,markers);
          const b=await renderSequence(events,sampleBuffer,markers);
          let max=0,sum=0;
          for(let ch=0;ch<2;ch++){
            const da=a.getChannelData(ch),db=b.getChannelData(ch);
            for(let i=0;i<da.length;i+=31){
              const diff=Math.abs(da[i]-db[i]);
              if(diff>max)max=diff; sum+=diff;
            }
          }
          let jump=0;
          for(let ch=0;ch<a.numberOfChannels;ch++){
            const d=a.getChannelData(ch);
            jump=Math.max(jump,Math.abs(d[0]-d[d.length-1]));
          }
          return {max,sum,jump};
        }''')
        assert render_diff['max'] < 1e-7 and render_diff['sum'] < 1e-6, render_diff
        assert render_diff['jump'] < 1e-7, render_diff

        # 11) Drum library fallback imports still work after all fixes.
        page.set_input_files('#kickFolderFallback',str(kick_dir))
        page.set_input_files('#snareFolderFallback',str(snare_dir))
        page.set_input_files('#hatFolderFallback',str(hat_dir))
        page.wait_for_function("drumFolderFiles.kick.length===1 && drumFolderFiles.snare.length===1 && drumFolderFiles.hat.length===1")

        assert not page_errors, page_errors
        assert not console_errors, console_errors
        assert page.evaluate('window.__SP.errors.length') == 0, page.evaluate('window.__SP.errors')
        context.close()
        browser.close()

print('OK: V63 regressions — loop edge, stereo conditioner, deterministic reverb, master dB, pitch rerender, delete unload, save validation, practice close, PREV/NEXT state, drum folders')
