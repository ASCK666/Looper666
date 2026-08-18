"use strict";
window.__SP={version:"94-asset-ui",ready:false,errors:[]};
window.__SP.report=(scope,error)=>{
  const message=error?.message||String(error||"Unknown error");
  const item={scope,message,time:new Date().toISOString()};
  window.__SP.errors.push(item);
  const el=document.getElementById("appBootError");
  if(el){
    el.textContent=`${scope}: ${message}`;
    el.classList.add("visible");
  }
};
window.addEventListener("error",event=>{
  window.__SP.report("RUNTIME",event.error||event.message);
});
window.addEventListener("unhandledrejection",event=>{
  window.__SP.report("PROMISE",event.reason);
});

// The approved Looper artwork is the visual surface. CSS/HTML only provide
// hit areas, live readouts and lighting; the artwork itself is never redrawn.
const looperAssetCss=document.createElement("link");
looperAssetCss.rel="stylesheet";
looperAssetCss.href="./assets/looper-ui/overlay.css";
document.head.appendChild(looperAssetCss);

const LOOPER_ASSET_PARTS=[
  "./assets/looper-ui/part00",
  "./assets/looper-ui/part01",
  "./assets/looper-ui/part02",
  "./assets/looper-ui/part03",
  "./assets/looper-ui/part04"
];
let looperAssetObjectUrl="";

function addAssetReadout(looper,className,text=""){
  const el=document.createElement("div");
  el.className=`asset-readout ${className}`;
  el.textContent=text;
  el.setAttribute("aria-hidden","true");
  looper.appendChild(el);
  return el;
}

function installLooperAssetReadouts(looper){
  if(looper.querySelector(".asset-track-readout"))return;
  const track=addAssetReadout(looper,"asset-track-readout","NO BEAT LOADED");
  const state=addAssetReadout(looper,"asset-state-readout","READY");
  const speedPercent=addAssetReadout(looper,"asset-speed-percent-readout","100.0");
  const loops=addAssetReadout(looper,"asset-loop-readout","0 / 8");
  const speedLevel=addAssetReadout(looper,"asset-speed-level-readout","0");

  for(const className of ["asset-cassette-glow","asset-speed-glow","asset-speed-button-glow"]){
    const glow=document.createElement("div");
    glow.className=className;
    glow.setAttribute("aria-hidden","true");
    looper.appendChild(glow);
  }

  const sourceTrack=document.getElementById("cassetteBeatName");
  const sourceState=document.getElementById("deckTransportState");
  const syncTrack=()=>{ track.textContent=(sourceTrack?.textContent||"NO BEAT LOADED").trim(); };
  const syncState=()=>{
    const value=(sourceState?.textContent||"READY").trim();
    state.textContent=value;
    looper.classList.toggle("asset-playing",value==="PLAYING");
  };
  if(sourceTrack)new MutationObserver(syncTrack).observe(sourceTrack,{childList:true,subtree:true,characterData:true});
  if(sourceState)new MutationObserver(syncState).observe(sourceState,{childList:true,subtree:true,characterData:true});
  syncTrack();
  syncState();

  looper.__assetReadouts={track,state,speedPercent,loops,speedLevel};
}

async function loadLooperAsset(){
  const looper=document.getElementById("looper");
  if(!looper)return;
  try{
    const parts=await Promise.all(LOOPER_ASSET_PARTS.map(async url=>{
      const response=await fetch(url,{cache:"no-store"});
      if(!response.ok)throw new Error(`Looper asset part unavailable (${response.status})`);
      return (await response.text()).trim();
    }));
    const binary=atob(parts.join(""));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const blob=new Blob([bytes],{type:"image/webp"});
    if(looperAssetObjectUrl)URL.revokeObjectURL(looperAssetObjectUrl);
    looperAssetObjectUrl=URL.createObjectURL(blob);
    looper.style.setProperty("--looper-asset-url",`url("${looperAssetObjectUrl}")`);
    installLooperAssetReadouts(looper);
    looper.classList.add("asset-ui");
  }catch(error){
    console.warn("Scratch Practice: approved Looper asset could not be loaded; keeping legacy surface.",error);
  }
}

function installAssetSpeedControl(){
  const looper=document.getElementById("looper");
  const button=document.getElementById("autoLooperToggle");
  const resetButton=document.getElementById("tapeCounterReset");
  if(!looper||!button||!looper.__assetReadouts)return;

  const readouts=looper.__assetReadouts;
  let speedLevel=0;
  let loopCount=0;
  let loopSourceSeconds=0;
  let loopLastCtxTime=0;
  let wasPlaying=false;

  const paintSpeed=()=>{
    readouts.speedLevel.textContent=speedLevel?`+${speedLevel}`:"0";
    readouts.speedPercent.textContent=(100+speedLevel).toFixed(1);
    looper.dataset.speedLevel=String(speedLevel);
    looper.style.setProperty("--asset-glow",speedLevel?String(.08+speedLevel*.10):"0");
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

  button.addEventListener("click",event=>{
    // Six-state manual speed selector: 0 -> +1 ... +5 -> 0.
    event.preventDefault();
    event.stopImmediatePropagation();
    applySpeedLevel((speedLevel+1)%6);
  },true);

  if(resetButton){
    resetButton.addEventListener("click",event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      loopCount=0;
      loopSourceSeconds=0;
      readouts.loops.textContent="0 / 8";
      applySpeedLevel(0);
    },true);
  }

  const trackName=document.getElementById("cassetteBeatName");
  if(trackName){
    new MutationObserver(()=>{
      // A newly loaded beat always starts at original speed.
      if(autoLooperSpeedPercent===100 && speedLevel!==0)applySpeedLevel(0);
    }).observe(trackName,{childList:true,subtree:true,characterData:true});
  }

  setInterval(()=>{
    const playing=!!deckSource && !!deckBuffer && !!ctx;
    if(!playing){
      if(wasPlaying){
        loopCount=0;
        loopSourceSeconds=0;
        readouts.loops.textContent="0 / 8";
      }
      wasPlaying=false;
      loopLastCtxTime=ctx?.currentTime||0;
      return;
    }

    const now=ctx.currentTime;
    if(!wasPlaying){
      wasPlaying=true;
      loopCount=0;
      loopSourceSeconds=0;
      loopLastCtxTime=now;
      readouts.loops.textContent="0 / 8";
      return;
    }

    const delta=Math.max(0,now-loopLastCtxTime);
    loopLastCtxTime=now;
    loopSourceSeconds+=delta*deckRate();
    const duration=Math.max(.01,deckBuffer.duration||.01);
    while(loopSourceSeconds>=duration){
      loopSourceSeconds-=duration;
      loopCount++;
      if(loopCount>8)loopCount=1;
      readouts.loops.textContent=`${loopCount} / 8`;
    }
  },100);

  paintSpeed();
}

void loadLooperAsset();
window.addEventListener("load",()=>{
  // Deferred runtime files are initialized by now. If the image assembled
  // slightly later, wait for the asset-ui class before wiring its behavior.
  const tryInstall=()=>{
    const looper=document.getElementById("looper");
    if(looper?.classList.contains("asset-ui")){
      installAssetSpeedControl();
      return;
    }
    setTimeout(tryInstall,60);
  };
  tryInstall();
},{once:true});

// Visual-only knob binding: native range inputs remain the single source of truth.
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
  if(valueDescriptor?.get && valueDescriptor?.set){
    Object.defineProperty(input,"value",{
      configurable:true,
      get(){return valueDescriptor.get.call(this);},
      set(value){valueDescriptor.set.call(this,value);sync();}
    });
  }
  sync();
});

// Development mode: always retire stale service workers/caches before they can
// hide a freshly deployed GitHub Pages build behind old JavaScript.
if("serviceWorker" in navigator){
  navigator.serviceWorker.getRegistrations()
    .then(registrations=>Promise.all(registrations.map(registration=>registration.unregister())))
    .catch(error=>console.warn("Scratch Practice SW cleanup failed:",error));
}

if("caches" in window){
  caches.keys()
    .then(keys=>Promise.all(
      keys
        .filter(key=>key.startsWith("scratch-practice-"))
        .map(key=>caches.delete(key))
    ))
    .catch(error=>console.warn("Scratch Practice cache cleanup failed:",error));
}
