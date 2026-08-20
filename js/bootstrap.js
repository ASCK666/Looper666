"use strict";
window.__SP={version:"108-css-button-backlights",ready:false,errors:[]};
window.__SP.report=(scope,error)=>{
  const message=error?.message||String(error||"Unknown error");
  const item={scope,message,time:new Date().toISOString()};
  window.__SP.errors.push(item);
  const el=document.getElementById("appBootError");
  if(el){el.textContent=`${scope}: ${message}`;el.classList.add("visible");}
};
window.addEventListener("error",event=>window.__SP.report("RUNTIME",event.error||event.message));
window.addEventListener("unhandledrejection",event=>window.__SP.report("PROMISE",event.reason));

const LOOPER_FACEPLATE_URL="./assets/looper-ui/faceplate.webp";
const CASSETTE_RUNTIME_CSS_URL="./assets/looper-ui/cassette-runtime.css";
const CASSETTE_RUNTIME_JS_URL="./js/cassette-runtime.js";
const LOOPER_DIRECT_CONTROL_IDS=[
  "librarySearch","libraryOrder","library",
  "prevBeat","playBeat","stopBeat","nextBeat","autoLooperToggle",
  "importFolderBtn","importBeatsBtn","tapeCounterReset",
  "beatFiles","beatFolder",
  "cassetteBeatName","deckTransportState","beatImportStatus"
];

function looperOverlayReady(looper){
  return getComputedStyle(looper).getPropertyValue("--asset-amber").trim()!=="";
}

function mountLooperRuntimeControls(looper){
  if(looper.dataset.runtimeMounted==="1")return;
  for(const id of LOOPER_DIRECT_CONTROL_IDS){
    const el=document.getElementById(id);
    if(el)looper.appendChild(el);
  }
  looper.dataset.runtimeMounted="1";
}

function ensureLooperFaceplate(looper){
  let image=looper.querySelector(".looper-faceplate");
  if(image)return image;
  image=document.createElement("img");
  image.className="looper-faceplate";
  image.src=LOOPER_FACEPLATE_URL;
  image.alt="";
  image.setAttribute("aria-hidden","true");
  image.draggable=false;
  image.decoding="sync";
  image.onload=()=>{looper.classList.add("asset-ready");looper.classList.remove("asset-load-error");};
  image.onerror=()=>{
    looper.classList.remove("asset-ready");looper.classList.add("asset-load-error");
    if(location.protocol!=="about:"&&location.protocol!=="data:")window.__SP.report("LOOPER ASSET",new Error("Approved Looper faceplate failed to load"));
  };
  looper.prepend(image);
  if(image.complete&&image.naturalWidth>0)image.onload();
  return image;
}

function addAssetReadout(looper,className,text=""){
  const el=document.createElement("div");
  el.className=`asset-readout ${className}`;
  el.textContent=text;
  el.setAttribute("aria-hidden","true");
  looper.appendChild(el);
  return el;
}

function currentCrateRows(){
  const looper=document.getElementById("looper");
  return Array.isArray(looper?.__assetCrateVisibleRows)?looper.__assetCrateVisibleRows:[];
}

async function ensureCurrentTrackInCrate(){
  if(typeof currentTrack==="undefined"||!currentTrack)return;
  if(typeof visibleLibraryRowsState==="undefined")return;
  const looper=document.getElementById("looper");
  if(!looper)return;
  let index=visibleLibraryRowsState.findIndex(row=>row.id===currentTrack.id);
  if(index<0){
    const search=document.getElementById("librarySearch");
    if(search?.value&&typeof refreshLibrary==="function"){
      search.value="";
      await refreshLibrary(false);
      index=visibleLibraryRowsState.findIndex(row=>row.id===currentTrack.id);
    }
  }
  if(index>=0)looper.__assetShowCrateRow?.(currentTrack.id);
}

function installLooperAssetReadouts(looper){
  if(looper.querySelector(".asset-track-readout"))return;
  const headerState=addAssetReadout(looper,"asset-header-state-readout","EMPTY");
  const track=addAssetReadout(looper,"asset-track-readout","NO BEAT LOADED");
  const state=addAssetReadout(looper,"asset-state-readout","EMPTY");
  const speedPercent=addAssetReadout(looper,"asset-speed-percent-readout","100.0");
  const loops=addAssetReadout(looper,"asset-loop-readout","0");
  const speedLevel=addAssetReadout(looper,"asset-speed-level-readout","0");
  const cassetteLabel=addAssetReadout(looper,"asset-cassette-label-readout","AUCUN BEAT");
  for(const className of ["asset-cassette-glow","asset-speed-glow"]){
    const glow=document.createElement("div");
    glow.className=className;
    glow.setAttribute("aria-hidden","true");
    looper.appendChild(glow);
  }
  const sourceTrack=document.getElementById("cassetteBeatName");
  const sourceState=document.getElementById("deckTransportState");
  const syncTrack=()=>{
    const value=(sourceTrack?.textContent||"NO BEAT LOADED").trim();
    track.textContent=value;
    const empty=/^(AUCUN BEAT|NO BEAT)/i.test(value);
    cassetteLabel.textContent=empty?"AUCUN BEAT":(value.length>22?`${value.slice(0,21)}…`:value);
    queueMicrotask(()=>{void ensureCurrentTrackInCrate();});
  };
  const syncState=()=>{
    const value=(sourceState?.textContent||"EMPTY").trim();
    headerState.textContent=value;
    state.textContent=value;
    looper.classList.toggle("asset-playing",value==="PLAYING");
    window.CassetteLayerRuntime?.syncFromCurrentLooperState?.();
  };
  if(sourceTrack)new MutationObserver(syncTrack).observe(sourceTrack,{childList:true,subtree:true,characterData:true});
  if(sourceState)new MutationObserver(syncState).observe(sourceState,{childList:true,subtree:true,characterData:true});
  syncTrack();
  syncState();
  looper.__assetReadouts={headerState,track,state,speedPercent,loops,speedLevel,cassetteLabel};
}

function installButtonBacklights(looper){
  if(looper.querySelector(".asset-button-light"))return;
  const controlIds=[
    "prevBeat","playBeat","stopBeat","nextBeat","autoLooperToggle",
    "importFolderBtn","importBeatsBtn"
  ];

  for(const controlId of controlIds){
    const button=document.getElementById(controlId);
    if(!button)continue;
    const light=document.createElement("span");
    light.className="asset-button-light";
    light.dataset.control=controlId;
    light.setAttribute("aria-hidden","true");
    looper.appendChild(light);

    const reasons=new Set();
    const paint=()=>{
      const hot=reasons.size>0;
      light.classList.toggle("is-hot",hot);
      button.classList.toggle("asset-backlight-hot",hot);
    };
    const setReason=(reason,on)=>{
      if(on)reasons.add(reason);
      else reasons.delete(reason);
      paint();
    };
    const releasePointer=()=>{
      setReason("pressed",false);
      light.classList.remove("is-pressed");
    };

    button.addEventListener("pointerenter",()=>setReason("hover",true));
    button.addEventListener("pointerleave",()=>{setReason("hover",false);releasePointer();});
    button.addEventListener("pointerdown",()=>{setReason("pressed",true);light.classList.add("is-pressed");});
    button.addEventListener("pointerup",releasePointer);
    button.addEventListener("pointercancel",releasePointer);
    button.addEventListener("focus",()=>setReason("focus",true));
    button.addEventListener("blur",()=>setReason("focus",false));
    button.addEventListener("click",()=>{
      light.classList.remove("is-pulse");
      void light.offsetWidth;
      light.classList.add("is-pulse");
      setTimeout(()=>light.classList.remove("is-pulse"),260);
    });
  }
}

function installAssetLibraryPager(looper){
  if(looper.querySelector(".asset-page-readout"))return;
  const library=document.getElementById("library");
  if(!library)return;
  const readout=addAssetReadout(looper,"asset-page-readout","1 / 1");
  const prev=document.createElement("button");
  const next=document.createElement("button");
  prev.type=next.type="button";
  prev.className="asset-page-button asset-page-prev";
  next.className="asset-page-button asset-page-next";
  prev.setAttribute("aria-label","Page précédente de la Beat Crate");
  next.setAttribute("aria-label","Page suivante de la Beat Crate");
  looper.append(prev,next);

  let page=0;
  const paint=()=>{
    const slots=[...library.querySelectorAll(".cassetteRackSlot")];
    const tracks=[...library.querySelectorAll(".cassetteRackSlot .track")];
    const trackCount=tracks.length;
    const pages=Math.max(1,Math.ceil(trackCount/9));
    page=Math.max(0,Math.min(page,pages-1));
    slots.forEach((slot,index)=>{
      slot.classList.toggle("asset-slot-empty",!slot.querySelector(".track"));
      slot.classList.toggle("asset-page-hidden",Math.floor(index/9)!==page);
    });
    if(typeof visibleLibraryRowsState!=="undefined"){
      looper.__assetCrateVisibleRows=tracks
        .map((track,index)=>({track,row:visibleLibraryRowsState[index]}))
        .filter(item=>item.row&&getComputedStyle(item.track.closest(".cassetteRackSlot")).display!=="none")
        .map(item=>item.row);
    }
    readout.textContent=`${page+1} / ${pages}`;
    prev.disabled=pages<=1;
    next.disabled=pages<=1;
  };
  looper.__assetShowCrateRow=rowId=>{
    if(typeof visibleLibraryRowsState==="undefined")return false;
    const index=visibleLibraryRowsState.findIndex(row=>row.id===rowId);
    if(index<0)return false;
    page=Math.floor(index/9);
    paint();
    return true;
  };
  prev.onclick=()=>{page=Math.max(0,page-1);paint();};
  next.onclick=()=>{
    const pages=Math.max(1,Math.ceil(library.querySelectorAll(".cassetteRackSlot .track").length/9));
    page=Math.min(pages-1,page+1);
    paint();
  };
  new MutationObserver(()=>{page=0;paint();}).observe(library,{childList:true,subtree:true});
  paint();
}

function installCrateTruthTransport(){
  if(typeof selectRelative!=="function"||typeof switchTrack!=="function")return;
  selectRelative=async delta=>{
    const rows=currentCrateRows();
    if(!rows.length)return;
    const currentId=typeof currentTrack!=="undefined"?currentTrack?.id:null;
    const idx=typeof relativeTrackIndex==="function"?relativeTrackIndex(rows,currentId,delta):0;
    await switchTrack(rows[idx]);
  };
  void ensureCurrentTrackInCrate();
}

function ensureCassetteRuntimeStyles(){
  if(document.querySelector('link[data-cassette-runtime="1"]'))return;
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=CASSETTE_RUNTIME_CSS_URL;
  link.dataset.cassetteRuntime="1";
  document.head.appendChild(link);
}

function loadCassetteRuntimeScript(){
  if(window.CassetteLayerRuntime)return Promise.resolve(window.CassetteLayerRuntime);
  const existing=document.querySelector('script[data-cassette-runtime="1"]');
  if(existing){
    return new Promise((resolve,reject)=>{
      existing.addEventListener("load",()=>resolve(window.CassetteLayerRuntime),{once:true});
      existing.addEventListener("error",()=>reject(new Error("Cassette runtime script failed to load")),{once:true});
    });
  }
  return new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src=CASSETTE_RUNTIME_JS_URL;
    script.dataset.cassetteRuntime="1";
    script.onload=()=>resolve(window.CassetteLayerRuntime);
    script.onerror=()=>reject(new Error("Cassette runtime script failed to load"));
    document.head.appendChild(script);
  });
}

async function activateCassetteLayerRuntime(){
  ensureCassetteRuntimeStyles();
  const runtime=await loadCassetteRuntimeScript();
  if(!runtime)throw new Error("Cassette layered runtime unavailable after script load");
  await runtime.verifyAssetPackage();
  runtime.mount();
  runtime.syncFromCurrentLooperState();
  runtime.setEnabled(true);
}

async function activateCassetteLayerRuntimeSafely(){
  try{
    await activateCassetteLayerRuntime();
  }catch(error){
    window.CassetteLayerRuntime?.unmount?.();
    window.__SP.report("CASSETTE RUNTIME",error);
  }
}

function loadLooperAsset(){
  const looper=document.getElementById("looper");
  if(!looper||!looperOverlayReady(looper))return;
  looper.classList.add("asset-ui");
  mountLooperRuntimeControls(looper);
  ensureLooperFaceplate(looper);
  installButtonBacklights(looper);
  installLooperAssetReadouts(looper);
  installAssetLibraryPager(looper);
}

function installAssetSpeedControl(){
  const looper=document.getElementById("looper");
  const button=document.getElementById("autoLooperToggle");
  const resetButton=document.getElementById("tapeCounterReset");
  if(!looper||!looperOverlayReady(looper)||!button||!looper.__assetReadouts)return;
  const readouts=looper.__assetReadouts;
  let speedLevel=0;
  let loopBaseUnits=typeof tapeCounterUnits==="number"?tapeCounterUnits:0;
  const paintSpeed=()=>{
    readouts.speedLevel.textContent=speedLevel?`+${speedLevel}`:"0";
    readouts.speedPercent.textContent=(100+speedLevel).toFixed(1);
    looper.dataset.speedLevel=String(speedLevel);
    looper.style.setProperty("--asset-glow",speedLevel?String(.08+speedLevel*.10):"0");
    button.dataset.speedLevel=String(speedLevel);
    button.setAttribute("aria-pressed",speedLevel?"true":"false");
    button.setAttribute("aria-label",`Speed +1, niveau ${speedLevel?`+${speedLevel}`:"0"}`);
    button.title=`SPEED ${speedLevel?`+${speedLevel}`:"0"}`;
  };
  const paintLoops=()=>{
    if(!deckBuffer||typeof tapeCounterUnits!=="number"){
      readouts.loops.textContent="0";
      return;
    }
    const sourceUnits=Math.max(0,tapeCounterUnits-loopBaseUnits);
    const completed=Math.floor(sourceUnits/Math.max(.01,deckBuffer.duration||.01));
    const visible=completed===0?0:((completed-1)%8)+1;
    readouts.loops.textContent=String(visible);
  };
  const applySpeedLevel=level=>{
    speedLevel=Math.max(0,Math.min(5,Number(level)||0));
    autoLooperEnabledState=false;
    autoLooperModeIndex=0;
    autoLooperSpeedPercent=100+speedLevel;
    stopAutoLooperProgress();
    if(deckSource)deckSource.playbackRate.value=deckRate();
    refreshCassetteUI();
    paintSpeed();
  };
  button.onclick=event=>{event.stopPropagation();applySpeedLevel((speedLevel+1)%6);};
  if(resetButton){
    const nativeReset=resetButton.onclick;
    resetButton.onclick=event=>{
      if(typeof nativeReset==="function")nativeReset.call(resetButton,event);
      loopBaseUnits=typeof tapeCounterUnits==="number"?tapeCounterUnits:0;
      applySpeedLevel(0);
      paintLoops();
    };
  }
  const trackName=document.getElementById("cassetteBeatName");
  if(trackName)new MutationObserver(()=>{
    loopBaseUnits=typeof tapeCounterUnits==="number"?tapeCounterUnits:0;
    if(autoLooperSpeedPercent===100&&speedLevel!==0)applySpeedLevel(0);
    paintLoops();
  }).observe(trackName,{childList:true,subtree:true,characterData:true});
  setInterval(paintLoops,100);
  paintSpeed();
  paintLoops();
}

loadLooperAsset();
void activateCassetteLayerRuntimeSafely();
window.addEventListener("load",()=>{
  installAssetSpeedControl();
  if(looperOverlayReady(document.getElementById("looper")))installCrateTruthTransport();
},{once:true});

document.querySelectorAll("[data-range-knob]").forEach(knob=>{
  const input=document.getElementById(knob.dataset.rangeKnob);
  if(!input)return;
  const valueDescriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");
  const sync=()=>{
    const min=Number(input.min)||0;
    const max=Number(input.max)||100;
    const value=Number(input.value)||0;
    const pct=max===min?0:(value-min)/(max-min)*100;
    knob.style.setProperty("--knob-pct",String(Math.max(0,Math.min(100,pct))));
  };
  input.addEventListener("input",sync);
  if(valueDescriptor?.get&&valueDescriptor?.set){
    Object.defineProperty(input,"value",{
      configurable:true,
      get(){return valueDescriptor.get.call(this);},
      set(value){valueDescriptor.set.call(this,value);sync();}
    });
  }
  sync();
});

if("serviceWorker" in navigator){
  navigator.serviceWorker.getRegistrations()
    .then(registrations=>Promise.all(registrations.map(registration=>registration.unregister())))
    .catch(error=>console.warn("Scratch Practice SW cleanup failed:",error));
}
if("caches" in window){
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key.startsWith("scratch-practice-")).map(key=>caches.delete(key))))
    .catch(error=>console.warn("Scratch Practice cache cleanup failed:",error));
}
