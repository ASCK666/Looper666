"use strict";

/*
  Staged cassette runtime.
  IMPORTANT: this file is intentionally NOT loaded by index.html yet.
  Nothing mounts unless CassetteLayerRuntimeStaged.mount() is called explicitly.
*/

window.CassetteLayerRuntimeStaged=(()=>{
  const DEFAULT_ASSET_BASE="./assets/looper-ui/";
  const DEFAULT_ASSETS={
    cavity:"cassette-cavity.png",
    leftReel:"cassette-reel-left.png",
    rightReel:"cassette-reel-right.png",
    shell:"cassette-shell.png",
    support:"cassette-support-foreground.png",
    glass:"cassette-glass-habitacle.png"
  };

  let mounted=false;
  let looper=null;
  let stage=null;

  function makeImg(className,src){
    const img=document.createElement("img");
    img.className=className;
    img.src=src;
    img.alt="";
    img.setAttribute("aria-hidden","true");
    img.draggable=false;
    img.decoding="async";
    return img;
  }

  function makeLayer(className){
    const el=document.createElement("div");
    el.className=className;
    el.setAttribute("aria-hidden","true");
    return el;
  }

  function mount({assetBase=DEFAULT_ASSET_BASE,assets={}}={}){
    if(mounted)return stage;
    looper=document.getElementById("looper");
    if(!looper)throw new Error("Cassette layered runtime: #looper not found");

    const names={...DEFAULT_ASSETS,...assets};
    const url=name=>`${assetBase}${name}`;

    stage=document.createElement("div");
    stage.className="cassette-runtime-stage";
    stage.setAttribute("aria-hidden","true");

    stage.append(
      makeImg("cassette-runtime-full-layer cassette-runtime-cavity",url(names.cavity)),
      makeImg("cassette-runtime-reel cassette-runtime-reel-left",url(names.leftReel)),
      makeImg("cassette-runtime-reel cassette-runtime-reel-right",url(names.rightReel)),
      makeImg("cassette-runtime-full-layer cassette-runtime-shell",url(names.shell)),
      makeLayer("cassette-runtime-backlight"),
      makeImg("cassette-runtime-full-layer cassette-runtime-support",url(names.support)),
      makeImg("cassette-runtime-full-layer cassette-runtime-glass",url(names.glass))
    );

    looper.appendChild(stage);
    mounted=true;
    return stage;
  }

  function setEnabled(enabled){
    if(!looper)looper=document.getElementById("looper");
    if(!looper)return;
    looper.classList.toggle("cassette-layered-runtime-enabled",!!enabled);
  }

  function setPlaying(playing){
    if(!looper)looper=document.getElementById("looper");
    if(!looper)return;
    looper.classList.toggle("cassette-runtime-playing",!!playing);
  }

  function setBacklight(on){
    if(!looper)looper=document.getElementById("looper");
    if(!looper)return;
    looper.classList.toggle("cassette-runtime-light-on",!!on);
  }

  function syncFromCurrentLooperState(){
    if(!looper)looper=document.getElementById("looper");
    if(!looper)return;
    setPlaying(looper.classList.contains("asset-playing"));
    setBacklight(looper.classList.contains("asset-playing"));
  }

  function unmount(){
    stage?.remove();
    if(looper){
      looper.classList.remove(
        "cassette-layered-runtime-enabled",
        "cassette-runtime-playing",
        "cassette-runtime-light-on"
      );
    }
    stage=null;
    looper=null;
    mounted=false;
  }

  return {
    mount,
    unmount,
    setEnabled,
    setPlaying,
    setBacklight,
    syncFromCurrentLooperState,
    isMounted:()=>mounted
  };
})();
