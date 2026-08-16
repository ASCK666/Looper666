from pathlib import Path
import re, sys
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print('SKIP: playwright is not installed')
    sys.exit(0)

ROOT=Path(__file__).resolve().parents[1]
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

chromium='/usr/bin/chromium'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
    page=browser.new_page(viewport={'width':1440,'height':1500})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load',timeout=20000)
    page.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
    page.add_style_tag(content='*,*::before,*::after{animation:none!important;transition:none!important}')
    page.click('[data-tab="chopper"]')
    page.wait_for_timeout(100)

    # The drum machine must expose the complete editor/library surface.
    for sel in ['.controlPanel','.drumSelector','.snareFx','.currentDrums','.drumEditBox','#drumEditor','#drumLibrariesPanel']:
        assert page.locator(sel).count()>=1, sel
    assert page.locator('#drumEditor .drumEditStep').count()==48
    assert page.locator('#drumEditor .drumEditHeadStep').count()==16
    assert page.locator('#drumEditor .drumEditLabel').count()==3
    assert page.locator('.drumLibrarySlot').count()==3

    # NEW DRUMS must create a real selection and keep the editor usable.
    page.click('#newDrums')
    page.wait_for_function('currentDrumSelection !== null',timeout=10000)
    assert page.evaluate('currentDrumSelection.mode !== "off"') is True
    assert 'PATTERN' not in page.locator('#currentPattern').inner_text() or page.locator('#currentPattern').inner_text()!='PATTERN —'

    # Drums-only PLAY is one renderer-owned transition and must stop any active chop audition first.
    page.evaluate('''() => {
      window.__drumsPreviewAuditionStopped=false;
      chopAuditionSource={stop(){window.__drumsPreviewAuditionStopped=true;}};
      chopAuditionGain={gain:{value:1}};
      chopAuditionPad=0;
    }''')
    page.click('#playDrumsOnly')
    page.wait_for_function('isLoopPlaying === true && lastPreviewMode === "drums" && renderedFlip !== null',timeout=10000)
    preview=page.evaluate('''() => ({
      auditionStopped:window.__drumsPreviewAuditionStopped,
      sourceCleared:chopAuditionSource===null,
      gainCleared:chopAuditionGain===null,
      status:document.getElementById('chopStatus').textContent,
      bpm:document.getElementById('sampleBpm').value,
      mode:currentDrumSelection.mode.toUpperCase()
    })''')
    assert preview['auditionStopped'] and preview['sourceCleared'] and preview['gainCleared'],preview
    assert preview['status']==f"DRUMS • {preview['bpm']} BPM • {preview['mode']}",preview

    # NEW DRUMS while playing must reroll the selection and replace the live preview without stopping transport.
    page.evaluate('''() => {
      window.__drumsBeforeNew={
        signature:drumSelectionSignature(currentDrumSelection),
        generation:drumGenerationNumber,
        buffer:renderedFlip,
        source:flipSource
      };
      window.__newDrumsAuditionStopped=false;
      chopAuditionSource={stop(){window.__newDrumsAuditionStopped=true;}};
      chopAuditionGain={gain:{value:1}};
      chopAuditionPad=0;
    }''')
    page.click('#newDrums')
    page.wait_for_function('''() =>
      drumGenerationNumber > window.__drumsBeforeNew.generation &&
      renderedFlip !== window.__drumsBeforeNew.buffer &&
      flipSource !== window.__drumsBeforeNew.source &&
      isLoopPlaying === true &&
      lastPreviewMode === "drums"
    ''',timeout=10000)
    rerolled=page.evaluate('''() => ({
      selectionChanged:drumSelectionSignature(currentDrumSelection)!==window.__drumsBeforeNew.signature,
      auditionStopped:window.__newDrumsAuditionStopped,
      sourceCleared:chopAuditionSource===null,
      gainCleared:chopAuditionGain===null,
      status:document.getElementById('chopStatus').textContent
    })''')
    assert rerolled['selectionChanged'],rerolled
    assert rerolled['auditionStopped'] and rerolled['sourceCleared'] and rerolled['gainCleared'],rerolled
    assert rerolled['status']=='NEW DRUMS ✓',rerolled

    # Editing while a drums-only preview is playing must rebuild the buffer and keep transport running.
    page.evaluate('window.__drumPreviewBeforeEdit=renderedFlip')
    page.locator('#drumEditor .drumEditStep.snare').last.click()
    page.wait_for_function('renderedFlip !== window.__drumPreviewBeforeEdit && isLoopPlaying === true && lastPreviewMode === "drums"',timeout=10000)
    page.click('#stopFlip')
    page.wait_for_function('isLoopPlaying === false && flipSource === null && lastPreviewMode === null && loopPlayheadState === null && loopPlayheadStartedAt === 0',timeout=5000)
    assert page.evaluate('renderedFlip !== null') is True

    # Clicking a drum cell toggles it, and wheel velocity changes an active step.
    cell=page.locator('#drumEditor .drumEditStep.kick').first
    before='active' in (cell.get_attribute('class') or '').split()
    cell.click()
    page.wait_for_timeout(80)
    cell=page.locator('#drumEditor .drumEditStep.kick').first
    after='active' in (cell.get_attribute('class') or '').split()
    assert before != after
    if not after:
        cell.click(); page.wait_for_timeout(80)
        cell=page.locator('#drumEditor .drumEditStep.kick').first
    old=cell.get_attribute('data-velocity')
    cell.dispatch_event('wheel',{'deltaY':100})
    page.wait_for_timeout(120)
    cell=page.locator('#drumEditor .drumEditStep.kick').first
    new=cell.get_attribute('data-velocity')
    assert old != new and new is not None

    # 8TH / 16TH view switching must rebuild the editor correctly.
    page.select_option('#drumEditView','8')
    page.wait_for_timeout(60)
    assert page.locator('#drumEditor .drumEditStep').count()==24
    assert page.locator('#drumEditor .drumEditHeadStep').count()==8
    page.select_option('#drumEditView','16')
    page.wait_for_timeout(60)
    assert page.locator('#drumEditor .drumEditStep').count()==48

    # Clear means clear; reverb and PUNCH controls still respond.
    page.click('#clearDrumEdits')
    page.wait_for_timeout(100)
    assert page.locator('#drumEditor .drumEditStep.active').count()==0
    page.fill('#snareReverbMix','40')
    page.dispatch_event('#snareReverbMix','input')
    assert page.locator('#snareReverbMixReadout').inner_text()=='40%'
    page.select_option('#punchMode','knock')
    page.dispatch_event('#punchMode','change')
    page.wait_for_timeout(80)
    assert 'KNOCK' in page.locator('#punchDesc').inner_text().upper()

    # Geometry: the local library buttons must remain visible/clickable.
    for rid in ['kickFolderBtn','snareFolderBtn','hatFolderBtn','loadDrumLibraryCTA']:
        box=page.locator('#'+rid).bounding_box()
        assert box and box['width']>80 and box['height']>=30, (rid,box)
        assert page.locator('#'+rid).is_enabled(), rid

    assert not errors, errors
    page.close()

    # Mobile regression: the old three-column grid squeezed the editor to ~60 px
    # and made PUNCH overlap the taller reverb panel. The component now stacks.
    mobile=browser.new_page(viewport={'width':520,'height':1800})
    mobile_errors=[]
    mobile.on('pageerror',lambda e:mobile_errors.append(str(e)))
    mobile.set_content(html,wait_until='load',timeout=20000)
    mobile.wait_for_function('window.__SP && window.__SP.ready === true',timeout=10000)
    mobile.add_style_tag(content='*,*::before,*::after{animation:none!important;transition:none!important}')
    mobile.click('[data-tab="chopper"]')
    mobile.wait_for_timeout(100)
    mobile_geo=mobile.evaluate("""() => {
      const panel=document.querySelector('.controlPanel').getBoundingClientRect();
      const selector=document.querySelector('.drumSelector').getBoundingClientRect();
      const reverb=document.querySelector('.snareFx:not(.punchFx)').getBoundingClientRect();
      const punch=document.querySelector('.punchFx').getBoundingClientRect();
      const editor=document.querySelector('.drumEditBox').getBoundingClientRect();
      return {panel:panel.toJSON(),selector:selector.toJSON(),reverb:reverb.toJSON(),punch:punch.toJSON(),editor:editor.toJSON(),columns:getComputedStyle(document.querySelector('.controlPanel')).gridTemplateColumns};
    }""")
    assert mobile_geo['selector']['width']>300, mobile_geo
    assert mobile_geo['editor']['width']>300, mobile_geo
    assert mobile_geo['punch']['top']>=mobile_geo['reverb']['bottom']-1, mobile_geo
    assert len(mobile_geo['columns'].split())==1, mobile_geo
    assert not mobile_errors, mobile_errors
    mobile.close()
    browser.close()

print('OK: Drum UI — selection, renderer-owned drums PLAY/NEW/rerender/stop, 16/8 step editor, toggle/velocity, clear, FX/PUNCH, libraries and mobile stacking')
