"use strict";

(() => {
  const LOOP_BATCH = 8;
  const DECK_ASSET_V95 = "assets/cassette-mechanism-pixel-v95.png";
  const DECK_ASSET_FALLBACK = "assets/cassette-mechanism-pixel-v84.png";
  const $id = id => document.getElementById(id);
  let installed = false;
  let intervalId = null;

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

  function findDeckHost(){
    return document.querySelector("#looper .cassetteDeckStage") ||
      document.querySelector("#looper .cassetteMechanismCrop") ||
      document.querySelector(".cassetteDeckStage") ||
      document.querySelector(".cassetteMechanismCrop");
  }

  function removeDetachedCounter(){
    document.querySelectorAll(".loopCounterModule, .tapeCounterModule").forEach(el=>el.remove());
  }

  function buildLoopCounter(){
    const host=findDeckHost();
    if(!host)return;

    const module=document.createElement("aside");
    module.className="loopCounterModule loopCounterModule--integrated";
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
    host.appendChild(module);
  }

  function buildArtworkTransport(){
    const host=findDeckHost();
    if(!host || host.querySelector(".artworkTransport"))return;

    const transport=document.createElement("div");
    transport.className="artworkTransport";
    transport.setAttribute("role","group");
    transport.setAttribute("aria-label","Transport du Looper");
    transport.innerHTML=`
      <button class="artworkTransportHit artworkTransportPrev" type="button" data-target="prevBeat" aria-label="Beat précédent"></button>
      <button class="artworkTransportHit artworkTransportPlay" type="button" data-target="playBeat" aria-label="Lecture"></button>
      <button class="artworkTransportHit artworkTransportStop" type="button" data-target="stopBeat" aria-label="Stop"></button>
      <button class="artworkTransportHit artworkTransportNext" type="button" data-target="nextBeat" aria-label="Beat suivant"></button>
      <button class="artworkTransportHit artworkTransportAuto" type="button" data-target="autoLooperToggle" aria-label="Accélération automatique" aria-pressed="false"></button>
    `;

    transport.addEventListener("click",event=>{
      const hit=event.target.closest(".artworkTransportHit");
      if(!hit)return;
      event.preventDefault();
      event.stopPropagation();
      $id(hit.dataset.target)?.click();
    });

    host.appendChild(transport);
  }

  function refreshArtworkTransport(){
    const auto=$id("autoLooperToggle");
    const artworkAuto=document.querySelector(".artworkTransportAuto");
    if(artworkAuto && auto){
      artworkAuto.setAttribute("aria-pressed",auto.getAttribute("aria-pressed")||"false");
      artworkAuto.classList.toggle("active",auto.classList.contains("active"));
    }
    const play=document.querySelector(".artworkTransportPlay");
    if(play)play.classList.toggle("active",!!document.querySelector(".cassetteDeck.playing"));
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
    removeDetachedCounter();

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
    refreshArtworkTransport();
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
    buildArtworkTransport();
    document.querySelector(".deckTransport")?.classList.add("deckTransport--legacy");
    refreshDeckState();

    if(intervalId)clearInterval(intervalId);
    intervalId=setInterval(refreshDeckState,120);
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(boot() || attempts>120)clearInterval(timer);
  },25);
})();
