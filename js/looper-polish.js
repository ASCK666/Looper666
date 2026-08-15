"use strict";

(() => {
  const AUTO_SPEED_LEVEL_MAX = 5;
  let autoSpeedLevel = 0;
  let originalApplyAutoLooperIncrement = null;
  let originalRefreshCassetteUI = null;
  let installed = false;

  function cleanBeatTitle(){
    const row = currentTrack || null;
    const raw = String(row?.label || row?.name || $("deckTrack")?.textContent || "NO BEAT").trim();
    return raw
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/\s*•\s*\d{2,3}\s*BPM.*$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "NO BEAT";
  }

  function beatBpm(){
    const row = currentTrack || null;
    if(Number.isFinite(Number(row?.bpm))) return Math.round(Number(row.bpm));
    const raw = String(row?.name || $("deckTrack")?.textContent || "");
    const match = raw.match(/(?:^|\D)(\d{2,3})\s*BPM\b/i);
    return match ? Number(match[1]) : null;
  }

  function ensurePrintedLabel(){
    const door = document.querySelector("#looper .cassetteDoorAssembly");
    if(!door) return null;
    let label = door.querySelector(".cassettePrintedLabel");
    if(label) return label;

    label = document.createElement("div");
    label.className = "cassettePrintedLabel";
    label.setAttribute("aria-hidden", "true");
    label.innerHTML = '<span class="cassettePrintedTitle"></span><span class="cassettePrintedBpm"></span>';

    const glass = door.querySelector(".cassetteDoorGlass");
    if(glass) door.insertBefore(label, glass);
    else door.appendChild(label);
    return label;
  }

  function refreshPrintedLabel(){
    const label = ensurePrintedLabel();
    if(!label) return;
    const title = label.querySelector(".cassettePrintedTitle");
    const bpm = label.querySelector(".cassettePrintedBpm");
    const loaded = !!deckBuffer;
    if(title) title.textContent = loaded ? cleanBeatTitle().toUpperCase() : "NO BEAT";
    const value = loaded ? beatBpm() : null;
    if(bpm) bpm.textContent = value ? `${value} BPM` : "";
  }

  function refreshAutoSpeedButton(){
    const btn = $("autoLooperToggle");
    if(!btn) return;
    const level = autoSpeedLevel;
    const span = btn.querySelector(":scope > span");
    const strong = btn.querySelector(":scope > strong");
    if(span) span.textContent = level ? `+${level}` : "OFF";
    if(strong) strong.textContent = "AUTO SPEED";
    btn.classList.toggle("active", level > 0);
    btn.setAttribute("aria-pressed", level > 0 ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      level
        ? `Auto speed plus ${level} pour cent toutes les ${AUTO_LOOP_BATCH} boucles`
        : "Auto speed désactivé"
    );
    btn.title = level
      ? `AUTO +${level}% / ${AUTO_LOOP_BATCH} LOOPS`
      : "AUTO SPEED OFF";
  }

  function setAutoSpeedLevel(nextLevel){
    const level = Math.max(0, Math.min(AUTO_SPEED_LEVEL_MAX, Number(nextLevel) || 0));
    autoSpeedLevel = level;

    if(level === 0){
      if(autoLooperEnabledState) toggleAutoLooper();
      else {
        autoLooperSpeedPercent = 100;
        if(deckSource) deckSource.playbackRate.value = 1;
        stopAutoLooperProgress();
      }
    }else if(!autoLooperEnabledState){
      toggleAutoLooper();
    }

    refreshAutoSpeedButton();
  }

  function cycleAutoSpeed(){
    const next = autoSpeedLevel >= AUTO_SPEED_LEVEL_MAX ? 0 : autoSpeedLevel + 1;
    setAutoSpeedLevel(next);
  }

  function installAutoSpeed(){
    const btn = $("autoLooperToggle");
    if(!btn) return;

    originalApplyAutoLooperIncrement = applyAutoLooperIncrement;
    applyAutoLooperIncrement = function incrementalAutoSpeed(){
      const steps = Math.max(1, autoSpeedLevel || 1);
      for(let i = 0; i < steps; i++) originalApplyAutoLooperIncrement();
      refreshAutoSpeedButton();
    };

    btn.onclick = cycleAutoSpeed;
    autoSpeedLevel = autoLooperEnabledState ? 1 : 0;
    refreshAutoSpeedButton();
  }

  function installCassetteLabelRefresh(){
    refreshPrintedLabel();
    originalRefreshCassetteUI = refreshCassetteUI;
    refreshCassetteUI = function refreshCassetteUIWithPrintedLabel(){
      const result = originalRefreshCassetteUI.apply(this, arguments);
      refreshPrintedLabel();
      refreshAutoSpeedButton();
      return result;
    };
  }

  function boot(){
    if(installed) return;
    installed = true;
    installAutoSpeed();
    installCassetteLabelRefresh();
    refreshPrintedLabel();
    refreshAutoSpeedButton();
  }

  function waitForLooper(attempt = 0){
    const ready =
      typeof toggleAutoLooper === "function" &&
      typeof applyAutoLooperIncrement === "function" &&
      typeof refreshCassetteUI === "function" &&
      typeof $ === "function";

    if(ready){
      boot();
      return;
    }

    if(attempt < 80) setTimeout(() => waitForLooper(attempt + 1), 25);
    else console.warn("Scratch Practice: Looper polish could not attach to the deck engine.");
  }

  waitForLooper();
})();
