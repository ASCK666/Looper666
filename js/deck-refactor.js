"use strict";

(() => {
  const LOOP_BATCH = 8;
  const DECK_ASSET_V95 = "assets/cassette-mechanism-pixel-v95.png";
  const DECK_ASSET_FALLBACK = "assets/cassette-mechanism-pixel-v84.png";
  const $id = id => document.getElementById(id);
  let installed = false;

  function prepareDeckAsset(){
    const images=[...document.querySelectorAll(".cassetteDeckImage,.cassetteDoorPanel")];
    images.forEach(img=>{
      if(img.dataset.deckAssetPrepared==="1")return;
      img.dataset.deckAssetPrepared="1";
      img.addEventListener("error",()=>{
        if(!img.src.endsWith("cassette-mechanism-pixel-v84.png"))img.src=DECK_ASSET_FALLBACK;
      });
      img.src=DECK_ASSET_V95;
    });
  }

  function buildLoopCounter(){
    const grid=document.querySelector(".deckHardwareGrid");
    if(!grid || grid.querySelector(".loopCounterModule"))return;

    const module=document.createElement("aside");
    module.className="loopCounterModule";
    module.setAttribute("aria-label","Compteur de boucles");
    module.innerHTML=`
      <small class="loopCounterLabel">LOOP</small>
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

  function removeLegacyHardware(){
    const legacy=document.querySelector(".tapeCounterModule");
    if(legacy)legacy.remove();

    let bridge=$id("deckLegacyBridge");
    if(!bridge){
      bridge=document.createElement("span");
      bridge.id="deckLegacyBridge";
      bridge.hidden=true;
      bridge.setAttribute("aria-hidden","true");
      bridge.innerHTML='<span id="cassetteDoorEject"></span><span id="cassetteDoorAction"></span>';
      document.body.appendChild(bridge);
    }
  }

  function disableLegacyTapeCounterEngine(){
    try{
      if(typeof stopTapeCounter==="function")stopTapeCounter();
      if(typeof startTapeCounter==="function")startTapeCounter=()=>{};
      if(typeof stopTapeCounter==="function")stopTapeCounter=()=>{};
      if(typeof resetTapeCounter==="function")resetTapeCounter=()=>{};
      if(typeof refreshTapeCounter==="function")refreshTapeCounter=()=>{};
    }catch(error){
      console.warn("Scratch Practice: legacy tape counter cleanup skipped",error);
    }
  }

  function refreshDeckState(){
    try{
      if(typeof refreshCassetteUI==="function")refreshCassetteUI();
    }catch(error){
      console.warn("Scratch Practice: cassette UI refresh failed",error);
    }
    refreshLoopCounter();
    refreshHint();
  }

  function boot(){
    if(installed)return true;
    if(!document.querySelector(".deckHardwareGrid"))return false;
    if(typeof refreshCassetteUI!=="function")return false;

    installed=true;
    removeLegacyHardware();
    disableLegacyTapeCounterEngine();
    prepareDeckAsset();
    buildLoopCounter();
    refreshDeckState();

    setInterval(refreshDeckState,120);
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(boot() || attempts>120)clearInterval(timer);
  },25);
})();
