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
