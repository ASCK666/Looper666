"use strict";
window.__SP={version:"110-dev-no-sw",ready:false,errors:[]};
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

// During active UI development, use a fresh query token on every reload.
// This avoids stale CSS/JS from the browser/CDN cache without hand-bumping a
// version number for each visual tweak.
const DEV_ASSET_VERSION=Date.now();
const versioned=path=>`${path}?v=${DEV_ASSET_VERSION}`;

const chopperLayoutScript=document.createElement("script");
chopperLayoutScript.src=versioned("./js/chopper-layout.js");
chopperLayoutScript.defer=true;
document.head.appendChild(chopperLayoutScript);

const looperPolishStyle=document.createElement("link");
looperPolishStyle.rel="stylesheet";
looperPolishStyle.href=versioned("./css/looper-polish.css");
document.head.appendChild(looperPolishStyle);

const looperPolishScript=document.createElement("script");
looperPolishScript.src=versioned("./js/looper-polish.js");
looperPolishScript.defer=true;
document.head.appendChild(looperPolishScript);

const deckRefactorStyle=document.createElement("link");
deckRefactorStyle.rel="stylesheet";
deckRefactorStyle.href=versioned("./css/deck-refactor.css");
document.head.appendChild(deckRefactorStyle);

const deckMotionStyle=document.createElement("link");
deckMotionStyle.rel="stylesheet";
deckMotionStyle.href=versioned("./css/deck-motion-fix.css");
document.head.appendChild(deckMotionStyle);

const deckRefactorScript=document.createElement("script");
deckRefactorScript.src=versioned("./js/deck-refactor.js");
deckRefactorScript.defer=true;
document.head.appendChild(deckRefactorScript);