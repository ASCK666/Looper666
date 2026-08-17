"use strict";
window.__SP={version:"93-dev-no-sw",ready:false,errors:[]};
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
