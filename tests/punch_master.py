from pathlib import Path
import re, sys
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print("SKIP: playwright is not installed")
    sys.exit(0)

ROOT=Path(__file__).resolve().parents[1]
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

chromium='/usr/bin/chromium'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])

    for width in [621,700,820,980,1024,1240,1440]:
        page=browser.new_page(viewport={'width':width,'height':1900})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='load',timeout=20000)
        page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
        page.add_style_tag(content='*,*::before,*::after{animation:none!important;transition:none!important}')
        page.click('[data-tab="chopper"]')
        page.wait_for_timeout(40)
        page.locator('#punchMode').scroll_into_view_if_needed()
        page.wait_for_timeout(20)
        geo=page.evaluate("""() => {
          const rv=document.querySelector('.snareFx:not(.punchFx)').getBoundingClientRect();
          const pf=document.querySelector('.punchFx').getBoundingClientRect();
          const ps=document.querySelector('#punchMode').getBoundingClientRect();
          const e=document.elementFromPoint(ps.left+ps.width/2,ps.top+ps.height/2);
          return {rv:rv.toJSON(),pf:pf.toJSON(),punchHit:e&&e.id};
        }""")
        assert geo['pf']['top'] >= geo['rv']['bottom']-1, (width,geo)
        assert geo['punchHit']=='punchMode', (width,geo)
        page.locator('#masterVolume').scroll_into_view_if_needed()
        page.wait_for_timeout(20)
        master_hit=page.evaluate("""() => {
          const r=document.querySelector('#masterVolume').getBoundingClientRect();
          const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
          return e&&e.id;
        }""")
        assert master_hit=='masterVolume', (width,master_hit)
        assert not errors, errors
        page.close()

    page=browser.new_page(viewport={'width':1440,'height':1700})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load',timeout=20000)
    page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
    page.click('[data-tab="chopper"]')

    page.evaluate('ensureAudio()')
    box=page.locator('#masterVolume').bounding_box()
    assert box and box['width']>20 and box['height']>20
    before=float(page.input_value('#masterVolume'))
    y=box['y']+box['height']/2
    page.mouse.move(box['x']+box['width']*.8,y)
    page.mouse.down()
    page.mouse.move(box['x']+box['width']*.2,y,steps=5)
    page.mouse.up()
    page.wait_for_timeout(100)
    after=float(page.input_value('#masterVolume'))
    assert after != before, (before,after)
    gain=page.evaluate('liveBus.gain.value')
    assert abs(gain-after/100) < .015, (after,gain)

    result=page.evaluate("""async () => {
      await ensureAudio();
      sampleBuffer=ctx.createBuffer(2,44100*2,44100);
      for(let c=0;c<2;c++){
        const d=sampleBuffer.getChannelData(c);
        for(let i=0;i<d.length;i++){
          const t=i/44100;
          let v=.72*Math.sin(2*Math.PI*110*t)+.26*Math.sin(2*Math.PI*440*t);
          if(i%11025<50)v+=.8*Math.exp(-(i%11025)/12);
          d[i]=Math.max(-.99,Math.min(.99,v));
        }
      }
      sampleName='punch-test.wav';
      markers=[0,.5,1,1.5];
      sampleConditionProfile={label:'CLEAN',trimDb:0,highPassHz:30,bodyCutDb:0,rmsDb:-10,crestDb:10,peakDb:-.1,clippingRatio:0,lowMidRatio:0};
      document.getElementById('sampleBpm').value='90';
      document.getElementById('drumMode').value='off';
      currentDrumSelection=null;
      await generateDrumSelection(false);
      const ev=Array(16).fill(0); ev[0]=1; ev[4]=2; ev[8]=3; ev[12]=1;
      const stats={};
      for(const mode of ['off','warm','knock','hard']){
        document.getElementById('punchMode').value=mode;
        const b=await renderSequence(ev,sampleBuffer,markers,samplePitchRate());
        let sum=0,peak=0,n=0,checksum=0;
        for(let c=0;c<b.numberOfChannels;c++){
          const d=b.getChannelData(c);
          for(let i=0;i<d.length;i++){
            const a=Math.abs(d[i]); peak=Math.max(peak,a); sum+=d[i]*d[i]; n++;
            if(i<8192)checksum+=a*(i+1)*(c+1);
          }
        }
        stats[mode]={rms:Math.sqrt(sum/n),peak,checksum};
      }
      return stats;
    }""")
    assert abs(result['off']['checksum']-result['warm']['checksum']) > 100, result
    assert abs(result['warm']['checksum']-result['knock']['checksum']) > 10, result
    assert abs(result['knock']['checksum']-result['hard']['checksum']) > 1, result

    page.evaluate("renderedFlip={stale:true}; isLoopPlaying=false")
    page.select_option('#punchMode','knock')
    page.dispatch_event('#punchMode','change')
    page.wait_for_timeout(50)
    assert page.evaluate('renderedFlip===null') is True
    assert 'PUNCH KNOCK' in page.locator('#chopStatus').inner_text().upper()

    assert not errors, errors
    page.close()
    browser.close()

print('OK: PUNCH/MASTER — no FX overlap, clickable controls, real master gain and real audio preset differences')
