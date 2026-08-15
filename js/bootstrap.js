"use strict";
window.__SP={version:"108",ready:false,errors:[]};
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

// Always register/update the worker explicitly. Older builds could leave a
// previously-installed worker controlling the app without ever asking it to
// update, which made GitHub Pages look permanently stale on mobile.
if("serviceWorker" in navigator){
  window.addEventListener("load",async()=>{
    try{
      const reg=await navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"});
      await reg.update();
    }catch(error){
      console.warn("Scratch Practice service worker update failed:",error);
    }
  });
}

const chopperLayoutScript=document.createElement("script");
chopperLayoutScript.src="./js/chopper-layout.js?v=108";
chopperLayoutScript.defer=true;
document.head.appendChild(chopperLayoutScript);

const looperPolishStyle=document.createElement("link");
looperPolishStyle.rel="stylesheet";
looperPolishStyle.href="./css/looper-polish.css?v=108";
document.head.appendChild(looperPolishStyle);

const looperPolishScript=document.createElement("script");
looperPolishScript.src="./js/looper-polish.js?v=108";
looperPolishScript.defer=true;
document.head.appendChild(looperPolishScript);

const deckRefactorStyle=document.createElement("link");
deckRefactorStyle.rel="stylesheet";
deckRefactorStyle.href="./css/deck-refactor.css?v=108";
document.head.appendChild(deckRefactorStyle);

const deckMotionStyle=document.createElement("link");
deckMotionStyle.rel="stylesheet";
deckMotionStyle.href="./css/deck-motion-fix.css?v=108";
document.head.appendChild(deckMotionStyle);

const deckRefactorScript=document.createElement("script");
deckRefactorScript.src="./js/deck-refactor.js?v=108";
deckRefactorScript.defer=true;
document.head.appendChild(deckRefactorScript);
