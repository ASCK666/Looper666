"use strict";

(() => {
  const LOOP_BATCH = 8;
  const $id = id => document.getElementById(id);

  function buildLoopCounter(){
    const grid=document.querySelector(".deckHardwareGrid");
    if(!grid || grid.querySelector(".loopCounterModule"))return;

    const module=document.createElement("aside");
    module.className="loopCounterModule";
    module.setAttribute("aria-label","Compteur de boucles");
    module.innerHTML=`
      <small class="loopCounterLabel">LOOP COUNTER</small>
      <div class="loopCounterWindow" role="timer" aria-live="off" aria-label="0 boucle sur ${LOOP_BATCH}">
        <span id="loopCounterCurrent" class="loopCounterDigits">00</span>
        <span class="loopCounterSlash">/</span>
        <span class="loopCounterTotal">08</span>
      </div>
      <div class="loopCounterLegend"><span>CURRENT</span><span>TOTAL</span></div>
    `;

    const mechanism=document.querySelector(".deckMechanismColumn");
    grid.insertBefore(module,mechanism || grid.firstChild);
  }

  function refreshLoopCounter(){
    const current=$id("loopCounterCurrent");
    const windowEl=document.querySelector(".loopCounterWindow");
    if(!current || !windowEl)return;

    let count=0;
    try{
      if(typeof autoLooperLoopCount!=="undefined")count=Number(autoLooperLoopCount)||0;
    }catch{}
    count=((count%LOOP_BATCH)+LOOP_BATCH)%LOOP_BATCH;
    current.textContent=String(count).padStart(2,"0");
    windowEl.setAttribute("aria-label",`${count} boucle${count>1?"s":""} sur ${LOOP_BATCH}`);
    windowEl.classList.toggle("active",!!document.querySelector(".cassetteDeck.playing"));
  }

  function refreshHint(){
    const hint=$id("cassetteHint");
    if(!hint)return;
    const loaded=typeof deckBuffer!=="undefined" && !!deckBuffer;
    const playing=typeof deckSource!=="undefined" && !!deckSource;
    hint.textContent=!loaded ? "LOAD A BEAT TO START" : playing ? "PLAYING" : "READY • PRESS PLAY";
  }

  function boot(){
    if(!document.querySelector(".deckHardwareGrid"))return false;
    buildLoopCounter();
    refreshHint();
    refreshLoopCounter();

    // Keep the legacy tape-counter DOM alive during this first refactor stage:
    // refreshCassetteUI() still references its eject/action nodes. It is only
    // hidden visually here; the hard code deletion comes in the next step so
    // cassette playing/loaded classes and reel animation cannot regress.
    setInterval(()=>{
      refreshLoopCounter();
      refreshHint();
    },120);
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(boot() || attempts>80)clearInterval(timer);
  },25);
})();
