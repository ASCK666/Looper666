"use strict";

$("snareReverbMix").oninput=()=>{
  $("snareReverbMixReadout").textContent=`${$("snareReverbMix").value}%`;
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

$("loadDrumLibraryCTA").onclick=async()=>{
  const kind=nextMissingDrumLibrary();
  if(kind) await chooseDrumFolder(kind);
};
$("kickFolderBtn").onclick=()=>chooseDrumFolder("kick");
$("kickFolderFallback").onchange=async()=>{await setFallbackDrumFolder("kick",$("kickFolderFallback").files);};
$("snareFolderBtn").onclick=()=>chooseDrumFolder("snare");
$("snareFolderFallback").onchange=async()=>{await setFallbackDrumFolder("snare",$("snareFolderFallback").files);};
$("hatFolderBtn").onclick=()=>chooseDrumFolder("hat");
$("hatFolderFallback").onchange=async()=>{await setFallbackDrumFolder("hat",$("hatFolderFallback").files);};
