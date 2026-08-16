"use strict";

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
