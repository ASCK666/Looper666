"use strict";

// Cross-app wiring only. Feature-specific bindings are loaded as static scripts
// after this file so they can reuse switchTab() and openFilePicker().
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

function openFilePicker(id){
  const input=$(id);
  input.value="";
  input.click();
}

function reportInitFailure(name,error){
  console.error(`INIT ${name}:`,error);
  if(window.__SP?.report)window.__SP.report(`INIT ${name}`,error);
}

function safeInit(name,fn){
  try{ return fn(); }
  catch(error){ reportInitFailure(name,error); return null; }
}

function bindSharedEvents(){
  document.querySelectorAll(".mainModeTabs .tab").forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));

  try{
    const savedMainTab=localStorage.getItem("scratch-practice-main-tab");
    if(savedMainTab==="chopper")switchTab("chopper");
    else switchTab("looper");
  }catch{
    switchTab("looper");
  }

  $("masterVolume").oninput=()=>{
    masterVolumePercent=Number($("masterVolume").value)||0;
    refreshMasterVolumeUI();
  };

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
}

function initializeAppUI(){
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

  return Promise.resolve()
    .then(()=>refreshLibrary(false))
    .catch(error=>{
      reportInitFailure("beat-library",error);
      return refreshLibrary(false).catch(e=>reportInitFailure("beat-library-fallback",e));
    });
}

async function bootSharedEvents(){
  try{
    bindSharedEvents();
    await initializeAppUI();
    if(window.__SP){
      window.__SP.ready=true;
      document.documentElement.dataset.appReady="1";
    }
  }catch(error){
    reportInitFailure("events",error);
  }
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",bootSharedEvents,{once:true});
}else{
  bootSharedEvents();
}
