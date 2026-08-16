"use strict";

// ----------------------------
// Tab + events
// ----------------------------
function switchTab(name){
  if(!["looper","chopper"].includes(name)) return;

  document.querySelectorAll(".mainModeTabs .tab").forEach(x=>{
    const active=x.dataset.tab===name;
    x.classList.toggle("active",active);
    x.setAttribute("aria-selected",active?"true":"false");
  });

  $("looper").classList.toggle("active",name==="looper");
  $("chopper").classList.toggle("active",name==="chopper");

  try{localStorage.setItem("scratch-practice-main-tab",name)}catch{}

  if(name==="chopper"){
    requestAnimationFrame(()=>{
      if(typeof drawWave==="function")drawWave();
      if(typeof renderPads==="function")renderPads();
      if(typeof renderLoopGrid==="function")renderLoopGrid();
      if(typeof renderDrumEditor==="function")renderDrumEditor();
    });
  }else{
    requestAnimationFrame(()=>{
      if(typeof refreshLibrary==="function")refreshLibrary();
      if(typeof refreshCassetteUI==="function")refreshCassetteUI();
    });
  }
}
document.querySelectorAll(".mainModeTabs .tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));

try{
  const savedMainTab=localStorage.getItem("scratch-practice-main-tab");
  if(savedMainTab==="chopper")switchTab("chopper");
  else switchTab("looper");
}catch{
  switchTab("looper");
}


$("headerCrateToggle").onclick=()=>{
  switchTab("looper");
  const crate=$("looper").querySelector(".beatCratePanel");
  crate.animate(
    [{boxShadow:"0 0 0 rgba(226,173,95,0)"},{boxShadow:"0 0 24px rgba(226,173,95,.14)"},{boxShadow:"0 0 0 rgba(226,173,95,0)"}],
    {duration:520,easing:"ease-out"}
  );
};

$("practiceOverlayOpen").onclick=()=>$("practice").classList.add("overlayOpen");
$("practiceOverlayClose").onclick=()=>{
  stopPractice();
  $("practice").classList.remove("overlayOpen");
};

let cassetteDoorTimer=null;

function openFilePicker(id){
  const input=$(id);
  input.value="";
  input.click();
}

function beatImportSummary(label,result){
  const issues=result.tooLarge+result.decodeErrors+result.skipped;
  const beatLabel=label==="IMPORT" ? ` beat${result.total>1?"s":""}` : "";
  const ignored=issues ? ` • ${issues} ignoré${issues>1?"s":""}` : "";
  return `${label} • ${result.imported}/${result.total}${beatLabel}${ignored}`;
}

async function handleBeatImport(files,label){
  try{
    const result=await importBeatFiles(files);
    updateBeatFolderStatus(beatImportSummary(label,result));
  }catch(error){
    console.error(`${label}:`,error);
    updateBeatFolderStatus(`${label} ERROR • ${safeErrorMessage(error)}`);
  }
}

function pulseCassetteDoor(){
  const deck=$("looperDropzoneBtn");
  if(!deck)return;
  deck.classList.remove("ejecting");
  void deck.offsetWidth;
  deck.classList.add("ejecting");
  if(cassetteDoorTimer)clearTimeout(cassetteDoorTimer);
  cassetteDoorTimer=setTimeout(()=>{
    deck.classList.remove("ejecting");
    cassetteDoorTimer=null;
  },760);
}

$("cassetteDoorEject").onclick=(ev)=>{
  ev.stopPropagation();
  if(deckSource)stopDeck();
  pulseCassetteDoor();
  openFilePicker("beatFiles");
};

// The V95 deck no longer renders the legacy tape counter. Keep this binding
// optional so removing Looper-only markup can never abort the rest of events.js.
const tapeCounterResetButton=$("tapeCounterReset");
if(tapeCounterResetButton){
  tapeCounterResetButton.onclick=(ev)=>{
    ev.stopPropagation();
    resetTapeCounter();
  };
}

$("looperDropzoneBtn").addEventListener("dragover",ev=>{
  ev.preventDefault();
  $("looperDropzoneBtn").classList.add("dragging");
});
$("looperDropzoneBtn").addEventListener("dragleave",()=>{
  $("looperDropzoneBtn").classList.remove("dragging");
});
$("looperDropzoneBtn").addEventListener("drop",async ev=>{
  ev.preventDefault();
  $("looperDropzoneBtn").classList.remove("dragging");
  const files=[...ev.dataTransfer.files].filter(isAudioFile);
  if(!files.length)return;
  await handleBeatImport(files,"IMPORT");
});

$("importBeatsBtn").onclick=()=>openFilePicker("beatFiles");
$("importFolderBtn").onclick=()=>openFilePicker("beatFolder");
$("beatFiles").onchange=()=>handleBeatImport($("beatFiles").files,"IMPORT");
$("beatFolder").onchange=()=>handleBeatImport($("beatFolder").files,"FOLDER IMPORT");
$("librarySearch").oninput=()=>refreshLibrary(false);
$("libraryOrder").onchange=()=>refreshLibrary(false);
const deckTransportControlIds=["prevBeat","playBeat","stopBeat","nextBeat","autoLooperToggle"];
deckTransportControlIds.forEach(id=>{
  $(id)?.addEventListener("click",ev=>ev.stopPropagation());
});

function runLooperAction(label,action){
  const report=error=>{
    console.error(`${label}:`,error);
    updateBeatFolderStatus(`${label} ERROR • ${safeErrorMessage(error)}`);
  };
  try{
    Promise.resolve(action()).catch(report);
  }catch(error){
    report(error);
  }
}

$("autoLooperToggle").onclick=toggleAutoLooper;
$("playBeat").onclick=()=>runLooperAction("PLAY",playDeck);
$("stopBeat").onclick=()=>stopDeck();
$("prevBeat").onclick=()=>runLooperAction("PREV",()=>selectRelative(-1));
$("nextBeat").onclick=()=>runLooperAction("NEXT",()=>selectRelative(1));

$("newPattern").onclick=makePractice;
$("startPractice").onclick=startPractice;

$("loadSampleBtn").onclick=()=>openFilePicker("sampleFile");
$("sampleFile").onchange=async()=>{
  stopChopAudition();
  const file=$("sampleFile").files[0];
  if(!file)return;

  try{
    $("chopStatus").textContent="LOADING SAMPLE…";
    assertLocalFileSize(file,MAX_SAMPLE_FILE_BYTES,"sample");
    sampleBuffer=await decodeFile(file);
    sampleName=file.name;
    sampleConditionProfile=analyzeSampleCondition(sampleBuffer);
    samplePitchSemitones=0;
    $("samplePitch").value=0;
    $("sampleBpm").value=90;
    transients=detectTransients(sampleBuffer);
    $("waveZoom").value=1;
    $("waveScroll").value=0;
    setMarkers(Number($("sliceCount").value)||16);
    autoPlaceMarkers();
    refreshSamplePitchUI();
    renderPads();
    $("chopStatus").textContent=`SAMPLE READY • ${file.name} • ${sampleConditionProfile.label}`;
  }catch(e){
    console.error("Sample load:",e);
    $("chopStatus").textContent=`SAMPLE ERROR • ${safeErrorMessage(e)}`;
  }
};
$("sliceCount").onchange=()=>{
  stopChopAudition();
  autoPlaceMarkers();
};
$("masterVolume").oninput=()=>{
  masterVolumePercent=Number($("masterVolume").value)||0;
  refreshMasterVolumeUI();
};

$("sampleVolume").oninput=()=>{
  sampleVolumePercent=Number($("sampleVolume").value)||0;
  $("sampleVolumeReadout").textContent=`${sampleVolumePercent}%`;
  if(chopAuditionGain)chopAuditionGain.gain.value=sampleVolumeGain()*sampleConditionTrimGain();
};

async function rerenderPreviewMode(mode=lastPreviewMode){
  if(mode==="drums"){
    renderedFlip=await renderDrumsOnly();
    lastPreviewMode="drums";
    await playRendered(renderedFlip);
    return true;
  }

  if(mode==="full" && sampleBuffer){
    const events=gridEventsForRender();
    if(events.some(Boolean)){
      renderedFlip=await renderSequence(events);
      lastPreviewMode="full";
      await playRendered(renderedFlip);
      return true;
    }
  }

  return false;
}

$("sampleVolume").onchange=async()=>{
  // If the full loop is already playing, rebuild once when the user releases
  // the fader so sample/drum balance updates immediately.
  if(isLoopPlaying && lastPreviewMode==="full" && sampleBuffer){
    try{
      await rerenderPreviewMode("full");
    }catch(error){
      $("chopStatus").textContent=`VOLUME ERROR: ${safeErrorMessage(error)}`;
    }
  }
};

$("samplePitch").oninput=()=>{
  samplePitchSemitones=Number($("samplePitch").value)||0;
  stopChopAudition();
  refreshMarkerEditor();
  refreshSamplePitchUI();
  drawWave();
};
$("samplePitch").onchange=async()=>{
  if(isLoopPlaying && lastPreviewMode==="full" && sampleBuffer){
    try{
      if(await rerenderPreviewMode("full")){
        $("chopStatus").textContent=`PITCH ${samplePitchSemitones>0?"+":""}${samplePitchSemitones} st ✓`;
      }
    }catch(error){
      $("chopStatus").textContent=`PITCH ERROR: ${safeErrorMessage(error)}`;
    }
  }
};
$("clearGrid").onclick=clearLoopGrid;
$("autoMarkers").onclick=()=>{
  stopChopAudition();
  autoPlaceMarkers();
};

$("waveZoom").oninput=drawWave;
$("waveScroll").oninput=drawWave;
$("gridDivision").onchange=drawWave;
$("transientRadius").onchange=drawWave;
$("snareReverbMix").oninput=()=>{
  $("snareReverbMixReadout").textContent=`${$("snareReverbMix").value}%`;
};

$("punchMode").onchange=async()=>{
  refreshPunchUI();
  renderedFlip=null; // never keep a preview rendered with an older PUNCH preset

  if(!isLoopPlaying){
    $("chopStatus").textContent=`PUNCH ${$("punchMode").value.toUpperCase()} • READY`;
    return;
  }

  try{
    await rerenderPreviewMode();
    $("chopStatus").textContent=`PUNCH ${$("punchMode").value.toUpperCase()} ✓`;
  }catch(error){
    $("chopStatus").textContent=`PUNCH ERROR: ${safeErrorMessage(error)}`;
  }
};

$("drumEditView").onchange=()=>{
  renderDrumEditor();
};

$("clearDrumEdits").onclick=async()=>{
  try{
    await ensureDrumSelection();
    currentDrumSelection.kicks=[];
    currentDrumSelection.snares=[];
    currentDrumSelection.ghosts=[];
    currentDrumSelection.hatSteps=[];
    currentDrumSelection.kickVelocity={};
    currentDrumSelection.snareVelocity={};
    currentDrumSelection.hatVelocity={};
    markDrumSelectionEdited();
    renderDrumEditor();
    await rerenderAfterDrumEdit();
    $("chopStatus").textContent="DRUMS CLEARED ✓";
  }catch(e){
    $("chopStatus").textContent="DRUM EDIT ERROR: "+e.message;
  }
};

$("newDrums").onclick=async()=>{
  stopChopAudition();
  try{
    const wasPlaying=isLoopPlaying;
    const modeBefore=lastPreviewMode;

    await generateDrumSelection(true);

    // If a loop is already playing, rebuild it immediately so the user
    // actually hears NEW DRUMS without having to press STOP/PLAY.
    if(wasPlaying){
      await rerenderPreviewMode(modeBefore);
    }

    $("chopStatus").textContent="NEW DRUMS ✓";
  }catch(error){
    $("chopStatus").textContent=`DRUM ERROR: ${safeErrorMessage(error)}`;
  }
};

$("playDrumsOnly").onclick=async()=>{
  stopChopAudition();
  try{
    const selection=await ensureDrumSelection();
    renderedFlip=await renderDrumsOnly();
    lastPreviewMode="drums";
    $("chopStatus").textContent=`DRUMS • ${$("sampleBpm").value} BPM • ${selection.mode.toUpperCase()}`;
    await playRendered(renderedFlip);
  }catch(e){
    $("chopStatus").textContent="DRUM ERROR: "+e.message;
  }
};
async function playCurrentBeat(){
  stopChopAudition();
  try{
    const events=gridEventsForRender();
    await ensureDrumSelection();
    renderedFlip=await renderSequence(events);
    lastPreviewMode="full";
    $("chopStatus").textContent=`READY • ${events.filter(Boolean).length} chop triggers • ${samplePitchSemitones>0?"+":""}${samplePitchSemitones} st`;
    await playRendered(renderedFlip);
  }catch(e){
    $("chopStatus").textContent="ERROR: "+e.message;
  }
}

function stopCurrentBeat(){
  if(flipSource){
    try{flipSource.stop()}catch{}
    flipSource=null;
  }

  isLoopPlaying=false;
  lastPreviewMode=null;
  loopPlayheadState=null;
  loopPlayheadStartedAt=0;

  if(chopAuditionSource){
    startPlayheadAnimation();
  }else{
    stopPlayheadAnimation(true);
  }
}

$("previewFlip").onclick=playCurrentBeat;
$("stopFlip").onclick=stopCurrentBeat;
document.addEventListener("keydown",async ev=>{
  if(ev.code!=="Space" || ev.repeat)return;

  const target=ev.target;
  const tag=target?.tagName?.toLowerCase();
  const interactive=
    tag==="input" || tag==="textarea" || tag==="select" || tag==="button" || tag==="a" ||
    target?.isContentEditable || target?.closest?.('[role="button"],[role="slider"]');
  if(interactive)return;
  if($("practice")?.classList.contains("overlayOpen"))return;

  ev.preventDefault();

  if($("looper")?.classList.contains("active")){
    if(deckSource)stopDeck();
    else await playDeck();
    return;
  }

  if(!$("chopper")?.classList.contains("active"))return;
  if(isLoopPlaying){
    stopCurrentBeat();
    $("chopStatus").textContent="STOP";
    return;
  }
  await playCurrentBeat();
});
function validateCurrentBeatForSave(){
  if(!sampleBuffer)throw new Error("Charge un sample avant de sauvegarder");
  const events=gridEventsForRender();
  if(!events.some(Boolean))throw new Error("Place au moins un PAD sur la grille");
  return events;
}

async function renderCurrentBeatForSave(events=validateCurrentBeatForSave()){
  // Always render the CURRENT grid/settings. SAVE never reuses a stale preview.
  return await renderSequence(events);
}

async function prepareBeatFolderFromSaveGesture(){
  // File/directory permission prompts must originate directly from the SAVE click.
  // Do this before the heavier OfflineAudioContext render.
  if(beatDirectoryHandle && await beatFolderPermission("readwrite")==="granted")return true;
  return ensureBeatDirectoryWriteAccess();
}

$("saveBeat").onclick=async()=>{
  let oldText=null;
  try{
    // Validate synchronously before opening the directory picker.
    const events=validateCurrentBeatForSave();
    const writeAccess=await prepareBeatFolderFromSaveGesture();
    if(!writeAccess)return;

    const renderPromise=renderCurrentBeatForSave(events);
    oldText=$("saveBeat").textContent;
    $("saveBeat").disabled=true;
    $("saveBeat").textContent="RENDERING…";
    $("chopStatus").textContent="RENDERING BEAT…";

    const rendered=await renderPromise;
    const wav=audioBufferToWav(rendered);
    const blob=new Blob([wav],{type:"audio/wav"});
    const saved=await saveBlobToBeatDirectory(blob,sampleName||"SCRATCH_BEAT");
    $("chopStatus").textContent=`SAVED • ${saved.filename} • K:\\beat_scratch`;
  }catch(e){
    console.error(e);
    const msg=safeErrorMessage(e);
    $("chopStatus").textContent="SAVE ERROR: "+msg;
    setBeatSaveStatus("SAVE ERROR: "+msg,"error");
  }finally{
    if(oldText!==null)$("saveBeat").textContent=oldText;
    $("saveBeat").disabled=false;
  }
};

$("exportWav").onclick=()=>{
  if(!renderedFlip){$("chopStatus").textContent="Render first";return}
  const wav=audioBufferToWav(renderedFlip);
  downloadBeatFallback(new Blob([wav],{type:"audio/wav"}),"scratch-practice.wav");
};

window.__SP.ready=true;