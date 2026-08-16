"use strict";
window.__SP={version:"114-dev-no-sw",ready:false,errors:[]};
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

// DEV MODE: do not let a service worker hide freshly deployed GitHub Pages
// changes. Remove every registration for this origin and purge Scratch Practice
// caches on each boot. PWA/offline support can be restored once the UI settles.
if("serviceWorker" in navigator){
  navigator.serviceWorker.getRegistrations()
    .then(regs=>Promise.all(regs.map(reg=>reg.unregister())))
    .catch(error=>console.warn("Scratch Practice SW cleanup failed:",error));
}
if("caches" in window){
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key.startsWith("scratch-practice-")).map(key=>caches.delete(key))))
    .catch(error=>console.warn("Scratch Practice cache cleanup failed:",error));
}

/*
 * CHOPPER DOM CONTRACT
 * --------------------
 * The current HTML came from a simplified UI pass, while chopper.js/events.js
 * still use the established control IDs. Normalize that markup before deferred
 * application scripts bind their events. This is intentionally centralized so
 * the compatibility layer can disappear when index.html is cleaned up.
 */
function normalizeChopperMarkup(){
  const chopper=document.getElementById("chopper");
  if(!chopper)return;

  const rename=(from,to)=>{
    if(document.getElementById(to))return document.getElementById(to);
    const element=document.getElementById(from);
    if(element)element.id=to;
    return element;
  };

  rename("markerSnap","snapMode");
  rename("pitch","samplePitch");
  rename("pitchVal","samplePitchReadout");
  rename("sampleVol","sampleVolume");
  rename("sampleVolVal","sampleVolumeReadout");
  rename("sequenceGrid","loopGrid");
  rename("seqPlay","previewFlip");
  rename("seqStop","stopFlip");
  rename("seqClear","clearGrid");
  rename("seqRecord","addFlipLibrary");

  const snapMode=document.getElementById("snapMode");
  if(snapMode){
    [...snapMode.options].forEach(option=>{
      if(option.value==="off")option.value="free";
      if(option.value==="zero")option.value="transient";
    });
  }

  const screen=chopper.querySelector(".samplerScreenModule")||chopper;
  const controls=chopper.querySelector(".samplerControlModule")||chopper;

  const ensureElement=(id,tag="span",parent=controls)=>{
    let element=document.getElementById(id);
    if(element)return element;
    element=document.createElement(tag);
    element.id=id;
    element.className="compatHidden";
    parent.appendChild(element);
    return element;
  };

  const sampleBpm=ensureElement("sampleBpm","input");
  sampleBpm.type="number";
  sampleBpm.min="40";
  sampleBpm.max="220";
  sampleBpm.step="0.1";
  sampleBpm.value=sampleBpm.value||"90";

  const gridDivision=ensureElement("gridDivision","select");
  if(!gridDivision.options.length){
    gridDivision.innerHTML='<option value="0.0625" selected>1/16 beat</option>';
  }

  const transientRadius=ensureElement("transientRadius","select");
  if(!transientRadius.options.length){
    transientRadius.innerHTML='<option value="80" selected>80 ms</option>';
  }

  let chopStatus=document.getElementById("chopStatus");
  if(!chopStatus){
    chopStatus=document.createElement("div");
    chopStatus.id="chopStatus";
    chopStatus.className="status drumEngineStatus";
    chopStatus.textContent="READY";
    screen.appendChild(chopStatus);
  }

  const defaults={
    snareReverbMix:["input","25"],
    punchMode:["select","warm"],
    drumEditView:["select","16"],
    drumMode:["select","auto"],
    snareReverbType:["select","plate"]
  };
  for(const [id,[tag,value]] of Object.entries(defaults)){
    const element=ensureElement(id,tag);
    if(tag==="input"){
      element.type="range";
      element.value=value;
    }else if(!element.options.length){
      element.innerHTML=`<option value="${value}" selected>${value}</option>`;
    }
  }

  const snareReverbOn=ensureElement("snareReverbOn","input");
  snareReverbOn.type="checkbox";
  ensureElement("snareReverbMixReadout").textContent="25%";
  ensureElement("punchDesc");
  ensureElement("beatSaveStatus");
  ensureElement("drumEditor");
  ensureElement("drumSelectionStatus");
  ensureElement("currentKick");
  ensureElement("currentSnare");
  ensureElement("currentHat");
  ensureElement("currentPattern");

  for(const id of ["clearDrumEdits","newDrums","playDrumsOnly"]){
    ensureElement(id,"button").type="button";
  }

  let libraryCta=document.getElementById("loadDrumLibraryCTA");
  if(!libraryCta){
    libraryCta=ensureElement("loadDrumLibraryCTA","button");
    libraryCta.innerHTML='<span class="loadDrumLibraryArrow"></span><span><b></b><small></small></span>';
  }

  for(const kind of ["kick","snare","hat"]){
    ensureElement(`${kind}FolderStatus`);
    ensureElement(`${kind}FolderBtn`,"button").type="button";
    const fallback=ensureElement(`${kind}FolderFallback`,"input");
    fallback.type="file";
    fallback.multiple=true;
  }
}

normalizeChopperMarkup();

// Transitional loader: chopper-layout.js is the last resource still absent from
// index.html. Once the static load chain is versioned, this can move there too.
const DEV_ASSET_VERSION=Date.now();
const script=document.createElement("script");
script.src=`./js/chopper-layout.js?v=${DEV_ASSET_VERSION}`;
script.defer=true;
document.head.appendChild(script);
