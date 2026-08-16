"use strict";
window.__SP={version:"112-dev-no-sw",ready:false,errors:[]};
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

// Transitional loaders: only resources absent from index.html belong here.
// Once the static load chain is versioned, these calls can move there and this
// bootstrap can return to boot/error responsibilities only.
const DEV_ASSET_VERSION=Date.now();
const versioned=path=>`${path}?v=${DEV_ASSET_VERSION}`;

function loadVersionedScript(path){
  const script=document.createElement("script");
  script.src=versioned(path);
  script.defer=true;
  document.head.appendChild(script);
}

function loadVersionedStyle(path){
  const link=document.createElement("link");
  link.rel="stylesheet";
  link.href=versioned(path);
  document.head.appendChild(link);
}

loadVersionedScript("./js/chopper-layout.js");
loadVersionedStyle("./css/deck-motion-fix.css");
