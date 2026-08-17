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
$("tapeCounterReset").onclick=(ev)=>{
  ev.stopPropagation();
  resetTapeCounter();
};
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
$("sampleFile").onchange=()=>loadChopperSample($("sampleFile").files[0]);
$("sliceCount").onchange=()=>{
  stopChopAudition();
  autoPlaceMarkers();
};
$("masterVolume").oninput=()=>{
  masterVolumePercent=Number($("masterVolume").value)||0;
  refreshMasterVolumeUI();
};

$("sampleVolume").oninput=()=>updateSampleVolume($("sampleVolume").value);

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

$("samplePitch").oninput=()=>updateSamplePitch($("samplePitch").value);
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

$("clearDrumEdits").onclick=clearDrumEdits;
$("newDrums").onclick=generateNewDrums;

$("playDrumsOnly").onclick=playDrumsPreview;
async function playCurrentBeat(){
  stopChopAudition();
  try{
    const events=gridEventsForRender();
    await ensureDrumSelection();
    renderedFlip=await renderSequence(events,sampleBuffer,markers,samplePitchRate());
    lastPreviewMode="full";
    $("chopStatus").textContent=`READY • ${events.filter(Boolean).length} chop triggers • ${samplePitchSemitones>0?"+":""}${samplePitchSemitones} st`;
    await playRendered(renderedFlip);
  }catch(e){
    $("chopStatus").textContent="ERROR: "+e.message;
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
  return await renderSequence(events,sampleBuffer,markers,samplePitchRate());
}

async function prepareBeatFolderFromSaveGesture(){
  // File/directory permission prompts must originate directly from the SAVE click.
  // Do this before the heavier OfflineAudioContext render.
  if(!beatFolderSupported()){
    return {direct:false,reason:"File System Access indisponible"};
  }

  if(!beatDirectoryHandle){
    const connected=await connectBeatDirectory("readwrite");
    return {direct:connected,reason:connected?"":"dossier non sélectionné"};
  }

  let permission=await beatFolderPermission("readwrite");
  if(permission!=="granted" && beatDirectoryHandle.requestPermission){
    try{
      permission=await beatDirectoryHandle.requestPermission({mode:"readwrite"});
    }catch(e){
      return {direct:false,reason:e?.message||"autorisation refusée"};
    }
  }

  return {
    direct:permission==="granted",
    reason:permission==="granted"?"":"autorisation écriture refusée"
  };
}

$("addFlipLibrary").onclick=async()=>{
  const btn=$("addFlipLibrary");
  btn.disabled=true;
  setBeatSaveStatus("Préparation de la sauvegarde…");

  let access={direct:false,reason:""};
  try{
    // Cheap musical validation must happen before any filesystem prompt.
    const events=validateCurrentBeatForSave();

    // Ask/restore filesystem permission before the heavier render, while the
    // click still counts as a user gesture in Chromium.
    access=await prepareBeatFolderFromSaveGesture();

    setBeatSaveStatus("Rendu du beat actuel…");
    const buffer=await renderCurrentBeatForSave(events);
    renderedFlip=buffer;

    const blob=bufferToBlob(buffer);
    const base=`FLIP_${safeBeatFilename(sampleName||"sample")}`;
    const fallbackFilename=`${safeBeatFilename(base)}_${timestampForFilename()}.wav`;

    if(access.direct){
      setBeatSaveStatus(`Écriture dans ${beatDirectoryHandle.name}…`);
      const saved=await saveBlobToBeatDirectory(blob,base);
      const kb=Math.max(1,Math.round(saved.size/1024));
      setBeatSaveStatus(`SAVED ✓ ${saved.directory}\\${saved.filename} • ${kb} KB`,"ok");
      $("chopStatus").textContent=`SAVED ✓ ${saved.filename}`;
    }else{
      // Never pretend the K: save worked. Still preserve the beat as a WAV.
      downloadBeatFallback(blob,fallbackFilename);
      setBeatSaveStatus(`K:\\beat_scratch non accessible (${access.reason}). WAV sauvegardé dans Téléchargements à la place.`,"error");
      $("chopStatus").textContent="DIRECT FOLDER SAVE FAILED • WAV DOWNLOADED";
    }
  }catch(e){
    setBeatSaveStatus(`SAVE ERROR: ${safeErrorMessage(e)}`,"error");
    $("chopStatus").textContent=`SAVE ERROR: ${safeErrorMessage(e)}`;
  }finally{
    btn.disabled=false;
  }
};
$("loadDrumLibraryCTA").onclick=async()=>{
  const kind=nextMissingDrumLibrary();
  if(kind) await chooseDrumFolder(kind);
};
$("kickFolderFallback").onchange=async()=>{await setFallbackDrumFolder("kick",$("kickFolderFallback").files);};
$("snareFolderFallback").onchange=async()=>{await setFallbackDrumFolder("snare",$("snareFolderFallback").files);};
$("hatFolderFallback").onchange=async()=>{await setFallbackDrumFolder("hat",$("hatFolderFallback").files);};
function reportInitFailure(name,error){
  console.error(`INIT ${name}:`,error);
  if(window.__SP?.report)window.__SP.report(`INIT ${name}`,error);
}

function safeInit(name,fn){
  try{ return fn(); }
  catch(error){ reportInitFailure(name,error); return null; }
}

[
  ["meters",ensureMeterElements],
  ["practice",makePractice],
  ["drum-selection",updateDrumSelectionUI],
  ["drum-library-cta",refreshLoadDrumLibraryCTA],
  ["auto-looper",refreshAutoLooperCompact],
  ["tape-counter",refreshTapeCounter],
  ["master-volume",refreshMasterVolumeUI],
  ["punch",refreshPunchUI],
  ["loop-grid",renderLoopGrid],
  ["waveform",drawWave]
].forEach(([name,fn])=>safeInit(name,fn));

Promise.resolve()
  .then(()=>refreshLibrary(false))
  .catch(error=>{
    reportInitFailure("beat-library",error);
    return refreshLibrary(false).catch(e=>reportInitFailure("beat-library-fallback",e));
  })
  .finally(()=>{
    if(window.__SP){
      window.__SP.ready=true;
      document.documentElement.dataset.appReady="1";
    }
  });
