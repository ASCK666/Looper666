from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]


def replace_once(text,old,new,label):
    count=text.count(old)
    assert count==1,f'{label}: expected exactly one match, found {count}'
    return text.replace(old,new,1)


def remove_div_block(text,start_marker):
    start=text.index(start_marker)
    pos=start
    depth=0
    token=re.compile(r'<div\b|</div>')
    while True:
        m=token.search(text,pos)
        assert m,f'unclosed div block: {start_marker}'
        if m.group(0).startswith('<div'):
            depth+=1
        else:
            depth-=1
            if depth==0:
                end=m.end()
                if end<len(text) and text[end]=='\n': end+=1
                return text[:start]+text[end:]
        pos=m.end()


# Idempotent second workflow run after the patch commit.
index_path=ROOT/'index.html'
if 'drumLibrariesPanel' not in index_path.read_text(encoding='utf-8'):
    print('Cleanup already applied; nothing to patch.')
    raise SystemExit(0)

# index.html: one editor-owned load path; keep only functional fallbacks and shared status.
text=index_path.read_text(encoding='utf-8')
marker='          <div id="drumEditor" class="drumEditor"></div>\n'
replacement=marker+'''          <div id="chopStatus" class="status drumEditStatus" aria-live="polite">READY</div>\n          <input id="kickFolderFallback" class="hidden" type="file" accept="audio/*" webkitdirectory multiple>\n          <input id="snareFolderFallback" class="hidden" type="file" accept="audio/*" webkitdirectory multiple>\n          <input id="hatFolderFallback" class="hidden" type="file" accept="audio/*" webkitdirectory multiple>\n'''
text=replace_once(text,marker,replacement,'index editor insertion')
text=remove_div_block(text,'        <div class="drumLibrariesPanel" id="drumLibrariesPanel">')
text=remove_div_block(text,'        <div class="outputMeterPanel">')
assert text.count('id="chopStatus"')==1
for rid in ['kickFolderFallback','snareFolderFallback','hatFolderFallback']:
    assert text.count(f'id="{rid}"')==1,rid
for stale in ['drumLibrariesPanel','loadDrumLibraryCTA','drumLibrarySlot','outputMeterPanel','masterVuVertical','folderStatus']:
    assert stale not in text,stale
index_path.write_text(text,encoding='utf-8')

# drums.js: remove CTA/status-card ownership and report folder actions through chopStatus only.
path=ROOT/'js/drums.js'
text=path.read_text(encoding='utf-8')
start=text.index('function drumLibraryIsLoaded(kind){')
end=text.index('async function randomAudioFileFromDirectory(kind,excludeName=null){')
new_block=r'''async function chooseDrumFolder(kind){
  const button=$(`${kind}FolderBtn`);
  if(button)button.disabled=true;

  try{
    // Native directory handle when available.
    if(window.isSecureContext && "showDirectoryPicker" in window){
      try{
        const handle=await window.showDirectoryPicker({id:`scratch-${kind}-folder`,mode:"read"});

        const entries=[];
        for await(const entry of handle.values()){
          if(entry.kind==="file" && audioExt.test(entry.name)){
            entries.push(entry);
            if(entries.length>=MAX_DRUM_FOLDER_FILES)break;
          }
        }
        const count=entries.length;

        if(!count){
          $("chopStatus").textContent=`${kind.toUpperCase()} • NO COMPATIBLE AUDIO FILE`;
          return;
        }

        drumDirectoryHandles[kind]=handle;
        drumDirectoryEntries[kind]=entries;
        drumFolderFiles[kind]=[];
        $("chopStatus").textContent=`${kind.toUpperCase()} • ${handle.name} • ${count} SOUNDS • LOADING…`;
        await refreshDrumsAfterFolderChange(kind,count,handle.name);
        return;
      }catch(e){
        if(e && e.name==="AbortError")return;
        console.warn("Directory picker fallback:",e);
      }
    }

    // file:// / browsers without File System Access API.
    // webkitdirectory remains the functional fallback.
    const input=$(`${kind}FolderFallback`);
    input.value="";
    input.click();
  }finally{
    if(button)button.disabled=false;
  }
}

async function setFallbackDrumFolder(kind,fileList){
  const files=[...fileList]
    .filter(isAudioFile)
    .filter(f=>f.size<=MAX_DRUM_FILE_BYTES)
    .slice(0,MAX_DRUM_FOLDER_FILES);

  if(!files.length){
    $("chopStatus").textContent=`${kind.toUpperCase()} • NO COMPATIBLE AUDIO FILE`;
    return false;
  }

  drumDirectoryHandles[kind]=null;
  drumDirectoryEntries[kind]=[];
  drumFolderFiles[kind]=files;

  const rootName=(files[0].webkitRelativePath||"").split("/")[0] || "local folder";
  $("chopStatus").textContent=`${kind.toUpperCase()} • ${rootName} • ${files.length} SOUNDS • LOADING…`;
  await refreshDrumsAfterFolderChange(kind,files.length,rootName);
  return true;
}

async function refreshDrumsAfterFolderChange(kind,count,origin){
  // A folder selection should have an audible result immediately.
  // Preserve the current groove family, but reroll the sound files now.
  if($("drumMode").value==="off"){
    $("chopStatus").textContent=`${kind.toUpperCase()} • ${origin} • ${count} SOUNDS • READY`;
    return;
  }

  const wasPlaying=isLoopPlaying;
  const modeBefore=lastPreviewMode;

  try{
    await generateDrumSelection(true);

    if(wasPlaying){
      if(modeBefore==="drums"){
        renderedFlip=await renderDrumsOnly();
        lastPreviewMode="drums";
        await playRendered(renderedFlip);
      }else if(modeBefore==="full" && sampleBuffer){
        const events=gridEventsForRender();
        if(events.some(Boolean)){
          renderedFlip=await renderSequence(events,sampleBuffer,markers,samplePitchRate());
          lastPreviewMode="full";
          await playRendered(renderedFlip);
        }
      }
    }

    const selected={
      kick:currentDrumSelection?.kick?.name,
      snare:currentDrumSelection?.snare?.name,
      hat:currentDrumSelection?.hat?.name
    }[kind] || "ready";
    $("chopStatus").textContent=`${kind.toUpperCase()} • ${selected} ✓`;
  }catch(e){
    $("chopStatus").textContent=`${kind.toUpperCase()} ERROR: ${e.message}`;
  }
}

'''
text=text[:start]+new_block+text[end:]
old='''    const origin=drumDirectoryHandles[kind]?.name ||\n      ((file.webkitRelativePath||"").split("/")[0]) ||\n      "local folder";\n    $(`${kind}FolderStatus`).textContent=`${origin} • active: ${file.name}`;\n'''
text=replace_once(text,old,'','drums active folder status')
for stale in ['FolderStatus','refreshLoadDrumLibraryCTA','nextMissingDrumLibrary','drumLibraryIsLoaded','loadDrumLibraryCTA']:
    assert stale not in text,stale
path.write_text(text,encoding='utf-8')

# events.js: remove retired CTA listener/init; keep only real fallback input handlers.
path=ROOT/'js/events.js'
text=path.read_text(encoding='utf-8')
old='''$("loadDrumLibraryCTA").onclick=async()=>{\n  const kind=nextMissingDrumLibrary();\n  if(kind) await chooseDrumFolder(kind);\n};\n'''
text=replace_once(text,old,'','events CTA listener')
text=replace_once(text,'  ["drum-library-cta",refreshLoadDrumLibraryCTA],\n','','events CTA init')
assert 'loadDrumLibraryCTA' not in text
assert 'refreshLoadDrumLibraryCTA' not in text
path.write_text(text,encoding='utf-8')

# core.js: retire only the duplicate lower display; analyser/header meters stay live.
path=ROOT/'js/core.js'
text=path.read_text(encoding='utf-8')
for old,label in [
    ('  build("masterVuVertical",20);\n','core meter build'),
    ('    paintMeter("masterVuVertical",dbToBarCount(masterDb,20),now);\n','core meter paint'),
    ('    paintMeter("masterVuVertical",0,now);\n','core meter clear'),
]:
    text=replace_once(text,old,'',label)
assert 'masterVuVertical' not in text
path.write_text(text,encoding='utf-8')

# base.css: remove every presentation path owned only by the retired panel/meter.
path=ROOT/'css/base.css'
text=path.read_text(encoding='utf-8')
start=text.index('.controlPanel {\n  grid-area: auto !important;')
end=text.index('\n\n.controlPanel > .stableTitle',start)
text=text[:start]+'''.controlPanel {
  grid-area: auto !important;
  display: grid !important;
  grid-template-columns: minmax(0,1fr) 305px !important;
  grid-template-areas:
    "title title"
    "selector fx"
    "current punch"
    "editor punch" !important;
  align-items: start;
  gap: 8px 14px !important;
  padding: 12px 16px !important;
}'''+text[end:]

start=text.index('.outputMeterPanel {')
end=text.index('/* --- Groove selection / FX',start)
text=text[:start]+text[end:]

for old,new,label in [
    ('.headerVu i, .verticalVu i {','.headerVu i {','meter base selector'),
    ('.headerVu i.on.low, .verticalVu i.on.low {','.headerVu i.on.low {','meter low selector'),
    ('.headerVu i.on.mid, .verticalVu i.on.mid {','.headerVu i.on.mid {','meter mid selector'),
    ('.headerVu i.on.high, .verticalVu i.on.high {','.headerVu i.on.high {','meter high selector'),
    ('.headerVu i.peakHold, .verticalVu i.peakHold {','.headerVu i.peakHold {','meter peak selector'),
    ('.help, .folderStatus, .status {','.help, .status {','folder status generic selector'),
    ('.title, .currentDrumsTitle, .drumLibraryCopy b, label {','.title, .currentDrumsTitle, label {','library title selector'),
]:
    text=replace_once(text,old,new,label)

start=text.index('\n.verticalVu {')
end=text.index('\n#practice {',start)
text=text[:start]+text[end:]

start=text.index('/* --- Local drum libraries ------------------------------------------------ */')
end=text.index('/* Component-owned responsive behavior. */',start)
text=text[:start]+'''.drumEditStatus {
  min-height: 18px !important;
  margin-top: 8px;
  padding: 4px 6px !important;
  overflow: hidden;
  border: 0 !important;
  color: #7f8d96 !important;
  background: transparent !important;
  font: 800 8px/1.35 var(--font-mono);
  white-space: nowrap;
  text-overflow: ellipsis;
}

'''+text[end:]

text=re.sub(r'\n@keyframes loadLibraryNudge \{.*?\n\}\n','\n',text,count=1,flags=re.S)
assert 'loadLibraryNudge' not in text
text=replace_once(text,'    grid-template-columns: minmax(0,1fr) 280px 105px !important;\n','    grid-template-columns: minmax(0,1fr) 280px !important;\n','responsive drum columns')
text=replace_once(text,'''@media (max-width:980px) {\n  .drumLibraryGrid {\n    grid-template-columns: 1fr !important;\n  }\n\n}\n\n''','','retired library responsive block')
text=replace_once(text,'''      "editor"\n      "fx"\n      "punch"\n      "libraries"\n      "meter" !important;''','''      "editor"\n      "fx"\n      "punch" !important;''','mobile drum areas')
text=replace_once(text,'''\n  .drumLibrariesHead {\n    align-items: flex-start;\n    flex-direction: column;\n  }\n''','','retired mobile library head')
for stale in [
    'drumLibrariesPanel','drumLibrariesHead','drumLibraryGrid','drumLibrarySlot','drumLibraryIcon',
    'drumLibraryCopy','loadDrumLibrary','outputMeterPanel','verticalMeter','verticalVu','verticalScale',
    'folderStatus','loadLibraryNudge'
]:
    assert stale not in text,stale
path.write_text(text,encoding='utf-8')

# Browser contract: compact row loaders remain; duplicate panel/meter must be absent.
path=ROOT/'tests/drum_ui.py'
text=path.read_text(encoding='utf-8')
text=replace_once(text,'''    # The drum machine must expose the complete editor/library surface.\n    for sel in ['.controlPanel','.drumSelector','.snareFx','.currentDrums','.drumEditBox','#drumEditor','#drumLibrariesPanel']:\n        assert page.locator(sel).count()>=1, sel\n    assert page.locator('#drumEditor .drumEditStep').count()==48\n    assert page.locator('#drumEditor .drumEditHeadStep').count()==16\n    assert page.locator('#drumEditor .drumEditLibraryButton').count()==3\n    assert page.locator('.drumLibrarySlot').count()==3\n''','''    # The drum machine exposes one editor-owned path for loading and editing drums.\n    for sel in ['.controlPanel','.drumSelector','.snareFx','.currentDrums','.drumEditBox','#drumEditor','#chopStatus']:\n        assert page.locator(sel).count()>=1, sel\n    assert page.locator('#drumEditor .drumEditStep').count()==48\n    assert page.locator('#drumEditor .drumEditHeadStep').count()==16\n    assert page.locator('#drumEditor .drumEditLibraryButton').count()==3\n''','drum test surface')
start=text.index('    # Per-part library controls are the compact row labels themselves.')
end=text.index('    assert not errors, errors',start)
replacement='''    # Per-part folder loading exists only on the compact row labels.\n    for rid,label in [('kickFolderBtn','KICK'),('snareFolderBtn','SNARE'),('hatFolderBtn','HI-HAT')]:\n        control=page.locator('#'+rid)\n        assert control.count()==1, rid\n        assert control.inner_text()==label, (rid,control.inner_text())\n        assert control.evaluate("el=>el.closest('#drumEditor')!==null"), rid\n        assert control.evaluate("el=>typeof el.onclick==='function'"), rid\n        box=control.bounding_box()\n        assert box and 18<=box['width']<=60 and 10<=box['height']<=20, (rid,box)\n        assert control.is_enabled(), rid\n    for rid in ['kickFolderFallback','snareFolderFallback','hatFolderFallback']:\n        fallback=page.locator('#'+rid)\n        assert fallback.count()==1, rid\n        assert fallback.evaluate("el=>el.closest('.drumEditBox')!==null"), rid\n        assert fallback.is_hidden(), rid\n    assert page.locator('#chopStatus').evaluate("el=>el.closest('.drumEditBox')!==null")\n    for retired in ['#drumLibrariesPanel','#loadDrumLibraryCTA','.drumLibrarySlot','.drumLibraryButton','.outputMeterPanel','#masterVuVertical']:\n        assert page.locator(retired).count()==0, retired\n    assert page.locator('#masterVolume').count()==1\n\n'''
text=text[:start]+replacement+text[end:]
text=text.replace('FX/PUNCH, libraries and mobile stacking','FX/PUNCH, single-path drum loading and mobile stacking')
path.write_text(text,encoding='utf-8')

# Master contract: keep actual gain/header meter and retire only the duplicate lower display.
path=ROOT/'tests/punch_master.py'
text=path.read_text(encoding='utf-8')
needle="    page.click('[data-tab=\"chopper\"]')\n\n    page.evaluate('ensureAudio()')\n"
replacement="    page.click('[data-tab=\"chopper\"]')\n    assert page.locator('#masterVuVertical').count()==0\n    assert page.locator('#vu').count()==1\n\n    page.evaluate('ensureAudio()')\n"
text=replace_once(text,needle,replacement,'master duplicate test')
path.write_text(text,encoding='utf-8')

project='\n'.join((ROOT/p).read_text(encoding='utf-8') for p in ['index.html','js/core.js','js/drums.js','js/events.js','css/base.css'])
for stale in ['drumLibrariesPanel','loadDrumLibraryCTA','masterVuVertical','outputMeterPanel','verticalVu']:
    assert stale not in project,stale

print('Surgical drum UI cleanup applied.')
