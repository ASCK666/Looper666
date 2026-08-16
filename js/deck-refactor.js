"use strict";

(() => {
  const LOOP_BATCH = 8;
  const FLASH_MS = 150;

  const DECK_ASSET = "assets/cassette-mechanism-pixel-v95.png";
  const DECK_ASSET_FALLBACK = "assets/cassette-mechanism-pixel-v84.png";
  const BACKLIGHT_IDLE = "assets/deck-buttons-backlight-idle.png";

  // Visual state for the five transport controls declared directly in index.html.
  // looper-events.js binds behavior by these IDs later in the boot chain.
  const TRANSPORT_CONTROLS = [
    {
      id: "prevBeat",
      backlight: "assets/deck-button-prev-backlight-active.png"
    },
    {
      id: "playBeat",
      backlight: "assets/deck-button-play-backlight-active.png",
      latched: true
    },
    {
      id: "stopBeat",
      backlight: "assets/deck-button-stop-backlight-active.png"
    },
    {
      id: "nextBeat",
      backlight: "assets/deck-button-next-backlight-active.png"
    },
    {
      id: "autoLooperToggle",
      backlight: "assets/deck-button-auto-backlight-active.png",
      latched: true
    }
  ];

  const $id = id => document.getElementById(id);

  let installed = false;
  let stateObserver = null;
  let flashTimer = null;

  function deckHost(){
    return document.querySelector("#looper .cassetteDeckStage") ||
      document.querySelector("#looper .cassetteMechanismCrop");
  }

  function prepareDeckArtwork(){
    const image = document.querySelector("#looper .cassetteDeckImage");
    if(!image || image.dataset.deckAssetPrepared === "1") return;

    image.dataset.deckAssetPrepared = "1";
    image.addEventListener("error", () => {
      if(!image.src.endsWith("cassette-mechanism-pixel-v84.png")){
        image.src = DECK_ASSET_FALLBACK;
      }
    });
    image.src = DECK_ASSET;

    // V95 already contains the door artwork. Keep the assembly only as the
    // coordinate parent for reels, glass and the printed cassette label.
    document.querySelector("#looper .cassetteDoorPanel")?.remove();
  }

  function makeOverlay(src, className){
    const image = document.createElement("img");
    image.className = className;
    image.src = src;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.draggable = false;
    image.addEventListener("error", () => image.classList.add("missing"), {once:true});
    return image;
  }

  function buildBacklights(host){
    if(!host || host.querySelector(".deckBacklightLayer")) return;

    const layer = document.createElement("div");
    layer.className = "deckBacklightLayer";
    layer.setAttribute("aria-hidden", "true");
    layer.appendChild(makeOverlay(BACKLIGHT_IDLE, "deckBacklight deckBacklightIdle"));

    for(const control of TRANSPORT_CONTROLS){
      const overlay = makeOverlay(control.backlight, "deckBacklight deckBacklightActive");
      overlay.dataset.target = control.id;
      layer.appendChild(overlay);
    }

    host.appendChild(layer);
  }

  function flashBacklight(controlId){
    const control = TRANSPORT_CONTROLS.find(item => item.id === controlId);
    if(control?.latched) return;

    const overlay = document.querySelector(`.deckBacklightActive[data-target="${controlId}"]`);
    if(!overlay) return;

    overlay.classList.add("is-on");
    if(flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      overlay.classList.remove("is-on");
      flashTimer = null;
    }, FLASH_MS);
  }

  function wireTransport(host){
    const transport = host?.querySelector(".artworkTransport");
    if(!transport || transport.dataset.deckWired === "1") return Boolean(transport);

    transport.dataset.deckWired = "1";
    transport.addEventListener("pointerenter", event => {
      const button = event.target.closest?.(".artworkTransportHit");
      if(!button) return;
      document.querySelector(`.deckBacklightActive[data-target="${button.id}"]`)
        ?.classList.add("is-hover");
    }, true);

    transport.addEventListener("pointerleave", event => {
      const button = event.target.closest?.(".artworkTransportHit");
      if(!button) return;
      document.querySelector(`.deckBacklightActive[data-target="${button.id}"]`)
        ?.classList.remove("is-hover");
    }, true);

    // Capture phase keeps visual feedback independent from the transport handlers
    // that looper-events.js attaches to the static buttons later in the boot chain.
    transport.addEventListener("click", event => {
      const button = event.target.closest?.(".artworkTransportHit");
      if(button) flashBacklight(button.id);
    }, true);

    return true;
  }

  function buildLoopCounter(host){
    if(!host || host.querySelector(".loopCounterModule--integrated")) return;

    const module = document.createElement("aside");
    module.className = "loopCounterModule loopCounterModule--integrated";
    module.setAttribute("aria-label", "Compteur de boucles");
    module.innerHTML = `
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

  function refreshTransportState(){
    const playing = document.querySelector("#looper .cassetteDeck")?.classList.contains("playing");
    const autoButton = $id("autoLooperToggle");
    const autoEnabled = autoButton?.classList.contains("active") || false;

    $id("playBeat")?.classList.toggle("active", Boolean(playing));
    document.querySelector('.deckBacklightActive[data-target="playBeat"]')
      ?.classList.toggle("is-on", Boolean(playing));
    document.querySelector('.deckBacklightActive[data-target="autoLooperToggle"]')
      ?.classList.toggle("is-on", autoEnabled);
  }

  function refreshLoopCounter(){
    const current = $id("loopCounterCurrent");
    const windowElement = document.querySelector("#looper .loopCounterWindow");
    if(!current || !windowElement) return;

    let count = 0;
    try{
      if(typeof autoLooperLoopCount !== "undefined") count = Number(autoLooperLoopCount) || 0;
    }catch{}

    count = ((count % LOOP_BATCH) + LOOP_BATCH) % LOOP_BATCH;
    current.textContent = String(count).padStart(2, "0");
    windowElement.setAttribute("aria-label", `${count} boucle${count > 1 ? "s" : ""} sur ${LOOP_BATCH}`);
    windowElement.classList.toggle(
      "active",
      document.querySelector("#looper .cassetteDeck")?.classList.contains("playing") || false
    );
  }

  function refreshHint(){
    const hint = $id("cassetteHint");
    if(!hint) return;

    const loaded = typeof deckBuffer !== "undefined" && Boolean(deckBuffer);
    const playing = typeof deckSource !== "undefined" && Boolean(deckSource);
    hint.textContent = !loaded ? "LOAD A BEAT TO START" : playing ? "PLAYING" : "READY • PRESS PLAY";
  }

  function refreshDeckState(){
    refreshLoopCounter();
    refreshHint();
    refreshTransportState();
  }

  function observeDeckState(){
    stateObserver?.disconnect();
    stateObserver = new MutationObserver(refreshDeckState);

    const deck = document.querySelector("#looper .cassetteDeck");
    if(deck) stateObserver.observe(deck, {attributes:true, attributeFilter:["class"]});

    const autoButton = $id("autoLooperToggle");
    if(autoButton){
      stateObserver.observe(autoButton, {attributes:true, attributeFilter:["class", "aria-pressed"]});
    }

    window.addEventListener("sp:auto-looper-state", refreshDeckState);
  }

  function boot(){
    if(installed) return true;
    if(typeof refreshCassetteUI !== "function") return false;

    const host = deckHost();
    if(!host || !host.querySelector(".artworkTransport")) return false;

    installed = true;
    prepareDeckArtwork();
    buildBacklights(host);
    wireTransport(host);
    buildLoopCounter(host);

    refreshCassetteUI();
    refreshDeckState();
    observeDeckState();
    return true;
  }

  if(boot()) return;

  let attempts = 0;
  const bootTimer = setInterval(() => {
    attempts += 1;
    if(boot() || attempts > 120) clearInterval(bootTimer);
  }, 25);
})();