"use strict";
window.__SP={version:"96-visible-faceplate",ready:false,errors:[]};
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
#looper.asset-ui #library .cassetteRackSlot.asset-slot-empty{display:block!important}
#looper.asset-ui #library .cassetteRackSlot.asset-page-hidden{display:none!important}
#looper.asset-ui #library .cassetteRackSlot::after{content:"";position:absolute;z-index:0;left:30%;top:7%;width:68%;height:86%;background:rgba(8,7,5,.97);pointer-events:none}
#looper.asset-ui #library .track{position:relative!important;z-index:1!important}
#looper.asset-ui #library .trackMeta{left:31%!important;top:8%!important;width:61%!important;height:84%!important;background:transparent!important;padding:0 2%!important}
#looper.asset-ui #library .trackSource,#looper.asset-ui #library .track>.btn{z-index:2!important;background:transparent!important}
#looper.asset-ui .asset-cassette-label-readout{left:38.9%!important;top:13.25%!important;width:26.1%!important;height:5.05%!important;font-size:clamp(7px,1.02vw,17px)!important}
#looper.asset-ui .asset-header-state-readout{left:5.25%!important;top:12.35%!important;width:9.2%!important;height:4.0%!important;background:#090705!important;font-size:clamp(6px,.82vw,13px)!important}
#looper.asset-ui .asset-track-readout{left:5.25%!important;top:17.6%!important;width:18.8%!important;height:3.2%!important;background:#090705!important;font-size:clamp(7px,1.12vw,18px)!important}
#looper.asset-ui .asset-state-readout{left:5.25%!important;top:28.6%!important;width:8.4%!important;height:3.2%!important;background:#090705!important;font-size:clamp(7px,1.1vw,18px)!important}
#looper.asset-ui .asset-speed-percent-readout{left:18.4%!important;top:28.6%!important;width:5.4%!important;height:3.2%!important;background:#090705!important;font-size:clamp(7px,1.05vw,17px)!important}
#looper.asset-ui #librarySearch{left:23.1%!important;top:60.75%!important;width:14.6%!important;height:3.15%!important}
#looper.asset-ui #libraryOrder{left:43.35%!important;top:60.75%!important;width:9.4%!important;height:3.15%!important}
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
  const el=document.createElement("div");el.className=`asset-readout ${className}`;el.textContent=text;el.setAttribute("aria-hidden","true");looper.appendChild(el);return el;
}

function installLooperAssetReadouts(looper){
  if(looper.querySelector(".asset-track-readout"))return;
  const headerState=addAssetReadout(looper,"asset-header-state-readout","EMPTY");
  const track=addAssetReadout(looper,"asset-track-readout","NO BEAT LOADED");
  const state=addAssetReadout(looper,"asset-state-readout","EMPTY");
  const speedPercent=addAssetReadout(looper,"asset-speed-percent-readout","100.0");
  const loops=addAssetReadout(looper,"asset-loop-readout","0 / 8");
  const speedLevel=addAssetReadout(looper,"asset-speed-level-readout","0");
  const cassetteLabel=addAssetReadout(looper,"asset-cassette-label-readout","NO BEAT");
  for(const className of ["asset-cassette-glow","asset-speed-glow","asset-speed-button-glow"]){const glow=document.createElement("div");glow.className=className;glow.setAttribute("aria-hidden","true");looper.appendChild(glow);}
  const sourceTrack=document.getElementById("cassetteBeatName"),sourceState=document.getElementById("deckTransportState");
  const syncTrack=()=>{const value=(sourceTrack?.textContent||"NO BEAT LOADED").trim();track.textContent=value;cassetteLabel.textContent=value==="NO BEAT LOADED"?"NO BEAT":value;};
  const syncState=()=>{const value=(sourceState?.textContent||"EMPTY").trim();headerState.textContent=value;state.textContent=value;looper.classList.toggle("asset-playing",value==="PLAYING");};
  if(sourceTrack)new MutationObserver(syncTrack).observe(sourceTrack,{childList:true,subtree:true,characterData:true});
  if(sourceState)new MutationObserver(syncState).observe(sourceState,{childList:true,subtree:true,characterData:true});
  syncTrack();syncState();
  looper.__assetReadouts={headerState,track,state,speedPercent,loops,speedLevel,cassetteLabel};
}

function installAssetLibraryPager(looper){
  if(looper.querySelector(".asset-page-readout"))return;
  const library=document.getElementById("library");if(!library)return;
  const readout=addAssetReadout(looper,"asset-page-readout","1 / 1");
  const prev=document.createElement("button"),next=document.createElement("button");
  prev.type=next.type="button";prev.className="asset-page-button asset-page-prev";next.className="asset-page-button asset-page-next";
  prev.setAttribute("aria-label","Page précédente de la Beat Crate");next.setAttribute("aria-label","Page suivante de la Beat Crate");looper.append(prev,next);
  let page=0;
  const paint=()=>{
    const slots=[...library.querySelectorAll(".cassetteRackSlot")];
    const trackCount=library.querySelectorAll(".cassetteRackSlot .track").length;
    const pages=Math.max(1,Math.ceil(trackCount/9));
    page=Math.max(0,Math.min(page,pages-1));
    slots.forEach((slot,index)=>{
      slot.classList.toggle("asset-slot-empty",!slot.querySelector(".track"));
      slot.classList.toggle("asset-page-hidden",Math.floor(index/9)!==page);
    });
    readout.textContent=`${page+1} / ${pages}`;prev.disabled=pages<=1;next.disabled=pages<=1;
  };
  prev.onclick=()=>{page=Math.max(0,page-1);paint();};
  next.onclick=()=>{const pages=Math.max(1,Math.ceil(library.querySelectorAll(".cassetteRackSlot .track").length/9));page=Math.min(pages-1,page+1);paint();};
  new MutationObserver(()=>{page=0;paint();}).observe(library,{childList:true,subtree:true});paint();
}

function loadLooperAsset(){const looper=document.getElementById("looper");if(!looper)return;installLooperAlignmentFixes();looper.classList.add("asset-ui");ensureLooperFaceplate(looper);installLooperAssetReadouts(looper);installAssetLibraryPager(looper);}

function installAssetSpeedControl(){
  const looper=document.getElementById("looper"),button=document.getElementById("autoLooperToggle"),resetButton=document.getElementById("tapeCounterReset");
  if(!looper||!button||!looper.__assetReadouts)return;
  const readouts=looper.__assetReadouts;let speedLevel=0,loopBaseUnits=typeof tapeCounterUnits==="number"?tapeCounterUnits:0;
  const paintSpeed=()=>{readouts.speedLevel.textContent=speedLevel?`+${speedLevel}`:"0";readouts.speedPercent.textContent=(100+speedLevel).toFixed(1);looper.dataset.speedLevel=String(speedLevel);looper.style.setProperty("--asset-glow",speedLevel?String(.08+speedLevel*.10):"0");button.dataset.speedLevel=String(speedLevel);button.setAttribute("aria-pressed",speedLevel?"true":"false");button.setAttribute("aria-label",`Speed +1, niveau ${speedLevel?`+${speedLevel}`:"0"}`);button.title=`SPEED ${speedLevel?`+${speedLevel}`:"0"}`;};
  const paintLoops=()=>{if(!deckBuffer||typeof tapeCounterUnits!=="number"){readouts.loops.textContent="0 / 8";return;}const sourceUnits=Math.max(0,tapeCounterUnits-loopBaseUnits),completed=Math.floor(sourceUnits/Math.max(.01,deckBuffer.duration||.01)),visible=completed===0?0:((completed-1)%8)+1;readouts.loops.textContent=`${visible} / 8`;};
  const applySpeedLevel=level=>{speedLevel=Math.max(0,Math.min(5,Number(level)||0));autoLooperEnabledState=false;autoLooperModeIndex=0;autoLooperSpeedPercent=100+speedLevel;stopAutoLooperProgress();if(deckSource)deckSource.playbackRate.value=deckRate();refreshCassetteUI();paintSpeed();};
  button.onclick=event=>{event.stopPropagation();applySpeedLevel((speedLevel+1)%6);};
  if(resetButton){const nativeReset=resetButton.onclick;resetButton.onclick=event=>{if(typeof nativeReset==="function")nativeReset.call(resetButton,event);loopBaseUnits=typeof tapeCounterUnits==="number"?tapeCounterUnits:0;applySpeedLevel(0);paintLoops();};}
  const trackName=document.getElementById("cassetteBeatName");if(trackName)new MutationObserver(()=>{loopBaseUnits=typeof tapeCounterUnits==="number"?tapeCounterUnits:0;if(autoLooperSpeedPercent===100&&speedLevel!==0)applySpeedLevel(0);paintLoops();}).observe(trackName,{childList:true,subtree:true,characterData:true});
  setInterval(paintLoops,100);paintSpeed();paintLoops();
}

loadLooperAsset();window.addEventListener("load",()=>installAssetSpeedControl(),{once:true});

document.querySelectorAll("[data-range-knob]").forEach(knob=>{const input=document.getElementById(knob.dataset.rangeKnob);if(!input)return;const valueDescriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");const sync=()=>{const min=Number(input.min)||0,max=Number(input.max)||100,value=Number(input.value)||0,pct=max===min?0:(value-min)/(max-min)*100;knob.style.setProperty("--knob-pct",String(Math.max(0,Math.min(100,pct))));};input.addEventListener("input",sync);if(valueDescriptor?.get&&valueDescriptor?.set)Object.defineProperty(input,"value",{configurable:true,get(){return valueDescriptor.get.call(this);},set(value){valueDescriptor.set.call(this,value);sync();}});sync();});
if("serviceWorker" in navigator)navigator.serviceWorker.getRegistrations().then(registrations=>Promise.all(registrations.map(registration=>registration.unregister()))).catch(error=>console.warn("Scratch Practice SW cleanup failed:",error));
if("caches" in window)caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("scratch-practice-")).map(key=>caches.delete(key)))).catch(error=>console.warn("Scratch Practice cache cleanup failed:",error));
