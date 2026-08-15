"use strict";
window.__SP={version:"95",ready:false,errors:[]};
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

const chopperLayoutScript=document.createElement("script");
chopperLayoutScript.src="./js/chopper-layout.js";
chopperLayoutScript.defer=true;
document.head.appendChild(chopperLayoutScript);

const looperPolishStyle=document.createElement("link");
looperPolishStyle.rel="stylesheet";
looperPolishStyle.href="./css/looper-polish.css";
document.head.appendChild(looperPolishStyle);

const looperPolishScript=document.createElement("script");
looperPolishScript.src="./js/looper-polish.js";
looperPolishScript.defer=true;
document.head.appendChild(looperPolishScript);

const deckRefactorStyle=document.createElement("link");
deckRefactorStyle.rel="stylesheet";
deckRefactorStyle.href="./css/deck-refactor.css";
document.head.appendChild(deckRefactorStyle);

const deckRefactorScript=document.createElement("script");
deckRefactorScript.src="./js/deck-refactor.js";
deckRefactorScript.defer=true;
document.head.appendChild(deckRefactorScript);
