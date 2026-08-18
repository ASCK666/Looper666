"use strict";
window.__SP={version:"100-pixel-aligned-crate-truth",ready:false,errors:[]};
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

function installLooperAlignmentFixes(){
  if(document.getElementById("looperAlignmentFixes"))return;
  const style=document.createElement("style");
  style.id="looperAlignmentFixes";
  style.textContent=`
#looper.asset-ui .looper-faceplate{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:fill!important;display:block!important;z-index:0!important;pointer-events:none!important}
#looper.asset-ui .beatCrateControls>div{display:contents!important}
#looper.asset-ui .beatCrateControls label{display:none!important}
#looper.asset-ui #library{grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-rows:repeat(3,minmax(0,1fr))!important;gap:1.15%!important}
#looper.asset-ui #library::before{display:none!important}
#looper.asset-ui #library .cassetteRackColumn{display:contents!important}
#looper.asset-ui #library .cassetteRackSlot{display:block!important;position:relative!important;min-width:0!important;min-height:0!important;overflow:hidden!important}
#looper.asset-ui #library .cassetteRackSlot.asset-slot-empty{display:block!important;background:linear-gradient(180deg,#0a0806,#070605)!important;box-shadow:inset 0 0 0 1px rgba(226,173,95,.04)!important}
#looper.asset-ui #library .cassetteRackSlot.asset-page-hidden{display:none!important}
#looper.asset-ui #library .cassetteRackSlot::after{content:"";position:absolute;z-index:1;left:29.6%;top:5%;width:69.1%;height:90%;background:#080705;pointer-events:none}
#looper.asset-ui #library .cassetteRackSlot.asset-slot-empty::before{content:"";position:absolute;z-index:3;inset:0;background:#080705;pointer-events:none}
#looper.asset-ui #library .track{position:relative!important;z-index:4!important}
#looper.asset-ui #library .trackMeta{left:31%!important;top:7%!important;width:65%!important;height:86%!important;background:#080705!important;padding:0 2%!important;z-index:5!important}
#looper.asset-ui #library .trackSource{display:none!important}
#looper.asset-ui #library .track>.btn{position:absolute!important;right:1%!important;top:18%!important;width:8%!important;height:64%!important;z-index:7!important;opacity:.001!important;color:transparent!important;background:transparent!important;border:0!important;box-shadow:none!important}

/* Pixel-aligned masks over only the baked changing text. */
#looper.asset-ui .asset-header-state-readout{left:5.15%!important;top:13.72%!important;width:7.5%!important;height:3.05%!important;padding:0 .12%!important;background:#090705!important;font-size:clamp(6px,.82vw,13px)!important;align-items:center!important}
#looper.asset-ui .asset-track-readout{left:5.15%!important;top:17.70%!important;width:18.55%!important;height:3.75%!important;padding:0 .15%!important;background:#090705!important;font-size:clamp(7px,1.12vw,18px)!important;align-items:center!important}
#looper.asset-ui .asset-state-readout{left:5.15%!important;top:28.35%!important;width:10.9%!important;height:3.75%!important;padding:0 .12%!important;background:#090705!important;font-size:clamp(7px,1.1vw,18px)!important;align-items:center!important}
#looper.asset-ui .asset-speed-percent-readout{left:18.38%!important;top:28.35%!important;width:5.9%!important;height:3.75%!important;padding:0 .25%!important;background:#090705!important;font-size:clamp(7px,1.05vw,17px)!important;justify-content:flex-end!important;align-items:center!important}

/* Faceplate owns “/ 8”; HTML replaces exactly the baked loop digit. */
#looper.asset-ui .asset-loop-readout{left:76.62%!important;top:15.02%!important;width:2.72%!important;height:4.08%!important;padding:0!important;background:#090705!important;justify-content:center!important;align-items:center!important;font-size:clamp(10px,1.85vw,30px)!important}
/* Replace the complete baked +2 group at its original position. */
#looper.asset-ui .asset-speed-level-readout{left:77.62%!important;top:27.08%!important;width:4.18%!important;height:4.18%!important;padding:0!important;background:#090705!important;justify-content:center!important;align-items:center!important;font-size:clamp(10px,1.85vw,30px)!important}

/* Mask only the printed title inside the existing paper label, preserving its edges. */
#looper.asset-ui .asset-cassette-label-readout{left:43.95%!important;top:14.62%!important;width:12.25%!important;height:3.02%!important;padding:0 .35%!important;color:#24170d!important;background-image:radial-gradient(circle at 12% 31%,rgba(255,255,255,.18) 0 .45px,transparent .7px),radial-gradient(circle at 66% 71%,rgba(94,68,42,.08) 0 .55px,transparent .8px),linear-gradient(180deg,#e5d4b9 0%,#dec8a7 50%,#d9c19f 100%)!important;background-size:12px 10px,17px 14px,100% 100%!important;border-radius:0!important;box-shadow:none!important;text-shadow:none!important;font:italic 600 clamp(7px,1vw,16px)/1 Georgia,serif!important;justify-content:center!important;align-items:center!important}

#looper.asset-ui #librarySearch{left:23.0%!important;top:60.55%!important;width:14.95%!important;height:3.55%!important;background:#090705!important;border-color:rgba(226,173,95,.42)!important}
#looper.asset-ui #libraryOrder{left:42.9%!important;top:60.55%!important;width:10.75%!important;height:3.55%!important;background:#090705!important;border-color:rgba(226,173,95,.42)!important}
#looper.asset-ui .asset-page-readout{left:44.1%!important;top:90.6%!important;width:11.8%!important;height:5.7%!important;background:#080705!important}
`;
  document.head.appendChild(style);
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
  const cassetteLabel=addAssetReadout(looper,"asset-cassette-label-readout","NO BEAT");
  for(const className of ["asset-cassette-glow","asset-speed-glow","asset-speed-button-glow"]){
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
    cassetteLabel.textContent=value==="NO BEAT LOADED"?"NO BEAT":value;
    queueMicrotask(()=>{void ensureCurrentTrackInCrate();});
  };
  const syncState=()=>{
    const value=(sourceState?.textContent||"EMPTY").trim();
    headerState.textContent=value;
    state.textContent=value;
    looper.classList.toggle("asset-playing",value==="PLAYING");
  };
  if(sourceTrack)new MutationObserver(syncTrack).observe(sourceTrack,{childList:true,subtree:true,characterData:true});
  if(sourceState)new MutationObserver(syncState).observe(sourceState,{childList:true,subtree:true,characterData:true});
  syncTrack();
  syncState();
  looper.__assetReadouts={headerState,track,state,speedPercent,loops,speedLevel,cassetteLabel};
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
    const idx=typeof relativeTrackIndex==="function"
      ? relativeTrackIndex(rows,currentId,delta)
      : 0;
    await switchTrack(rows[idx]);
  };
  void ensureCurrentTrackInCrate();
}

function loadLooperAsset(){
  const looper=document.getElementById("looper");
  if(!looper)return;
  installLooperAlignmentFixes();
  looper.classList.add("asset-ui");
  ensureLooperFaceplate(looper);
  installLooperAssetReadouts(looper);
  installAssetLibraryPager(looper);
}

function installAssetSpeedControl(){
  const looper=document.getElementById("looper");
  const button=document.getElementById("autoLooperToggle");
  const resetButton=document.getElementById("tapeCounterReset");
  if(!looper||!button||!looper.__assetReadouts)return;
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
window.addEventListener("load",()=>{
  installAssetSpeedControl();
  installCrateTruthTransport();
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
