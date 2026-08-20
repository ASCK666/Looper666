"use strict";

/*
  Staged cassette runtime.
  IMPORTANT: this file is intentionally NOT loaded by index.html yet.
  Nothing mounts unless the frozen binary package first passes verifyAssetPackage().
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

  const EXPECTED={
    cavity:{name:"cassette-cavity.png",width:1536,height:1024,alphaBBox:[497,137,1051,387],sha256:"b5e897e4be61695fa5e5c6ab628f9322b5c06e7a16b2f33bcfbdb97412e1517f"},
    leftReel:{name:"cassette-reel-left.png",width:154,height:154,alphaBBox:[0,0,154,154],sha256:"b1daef2f88a9d8e79c97b89ebcc7cb974703a4d240436928013e83786ab1c03e"},
    rightReel:{name:"cassette-reel-right.png",width:154,height:154,alphaBBox:[0,0,154,154],sha256:"6043c1b1c5a8bd5aba8386595c58cc251fcabd3b54646ca71b517ced16602daa"},
    shell:{name:"cassette-shell.png",width:1536,height:1024,alphaBBox:[497,137,1051,387],sha256:"006ab4bfc5a9684caf7f3ab32cfa8d0b72097ff8ea3e2d3c1b2d7bbb02b983ba"},
    support:{name:"cassette-support-foreground.png",width:1536,height:1024,alphaBBox:[483,387,1068,454],sha256:"ff751dd7eda90e2389ab856fa7a90b2d5a5dba72031aae29e0e6548ba0b1e75b"},
    glass:{name:"cassette-glass-habitacle.png",width:1536,height:1024,alphaBBox:[477,111,1081,389],sha256:"0a717dca8848ec032c9861d19e74af951bfdf31a23c1a19ef9aa567ed3fde83e"}
  };

  let mounted=false;
  let verified=false;
  let verificationReport=null;
  let looper=null;
  let stage=null;
  let cartridge=null;
  let cassetteLabel=null;
  let cassetteLabelNextSibling=null;
  let motionTimer=null;
  let verifiedConfig=null;

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

  function restartMotion(className,duration){
    if(!mounted||!looper||!cartridge)return false;
    if(motionTimer)clearTimeout(motionTimer);
    looper.classList.remove("cassette-runtime-inserting","cassette-runtime-ejecting");
    void cartridge.offsetWidth;
    looper.classList.add(className);
    motionTimer=setTimeout(()=>{
      looper?.classList.remove(className);
      motionTimer=null;
    },duration);
    return true;
  }

  function bytesToHex(bytes){
    return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
  }

  async function sha256Hex(buffer){
    if(!globalThis.crypto?.subtle)throw new Error("Cassette asset verification requires Web Crypto SHA-256 support");
    return bytesToHex(await crypto.subtle.digest("SHA-256",buffer));
  }

  async function decodeBlob(blob){
    if(typeof createImageBitmap==="function")return createImageBitmap(blob);
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(blob);
      const img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Image decode failed"));};
      img.src=url;
    });
  }

  function alphaBBoxOfImage(image,width,height){
    const canvas=document.createElement("canvas");
    canvas.width=width;
    canvas.height=height;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw new Error("2D canvas unavailable for cassette alpha-bounds verification");
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(image,0,0,width,height);
    const data=ctx.getImageData(0,0,width,height).data;
    let minX=width,minY=height,maxX=-1,maxY=-1;
    for(let y=0;y<height;y++){
      for(let x=0;x<width;x++){
        if(data[(y*width+x)*4+3]===0)continue;
        if(x<minX)minX=x;
        if(y<minY)minY=y;
        if(x>maxX)maxX=x;
        if(y>maxY)maxY=y;
      }
    }
    return maxX<0?null:[minX,minY,maxX+1,maxY+1];
  }

  function sameArray(a,b){
    return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>value===b[index]);
  }

  async function verifyOne(key,url,expected){
    const response=await fetch(url,{cache:"no-store"});
    if(!response.ok)throw new Error(`${expected.name}: HTTP ${response.status}`);
    const buffer=await response.arrayBuffer();
    const hash=await sha256Hex(buffer);
    if(hash!==expected.sha256)throw new Error(`${expected.name}: SHA-256 mismatch`);

    const blob=new Blob([buffer],{type:"image/png"});
    const image=await decodeBlob(blob);
    const width=image.naturalWidth||image.width;
    const height=image.naturalHeight||image.height;
    if(width!==expected.width||height!==expected.height){
      image.close?.();
      throw new Error(`${expected.name}: expected ${expected.width}x${expected.height}, got ${width}x${height}`);
    }

    const alphaBBox=alphaBBoxOfImage(image,width,height);
    image.close?.();
    if(!sameArray(alphaBBox,expected.alphaBBox)){
      throw new Error(`${expected.name}: alpha bounds mismatch (${JSON.stringify(alphaBBox)})`);
    }

    return {key,name:expected.name,url,width,height,alphaBBox,sha256:hash,ok:true};
  }

  async function verifyAssetPackage({assetBase=DEFAULT_ASSET_BASE,assets={}}={}){
    const names={...DEFAULT_ASSETS,...assets};
    const url=name=>`${assetBase}${name}`;
    verified=false;
    verificationReport=null;
    verifiedConfig=null;

    const rows=[];
    for(const key of Object.keys(EXPECTED)){
      if(names[key]!==EXPECTED[key].name){
        throw new Error(`Cassette package filename mismatch for ${key}: expected ${EXPECTED[key].name}`);
      }
      rows.push(await verifyOne(key,url(names[key]),EXPECTED[key]));
    }

    verified=true;
    verifiedConfig={assetBase,names};
    verificationReport={ok:true,checkedAt:new Date().toISOString(),assets:rows};
    return verificationReport;
  }

  function mount({assetBase=DEFAULT_ASSET_BASE,assets={}}={}){
    if(mounted)return stage;
    if(!verified||!verifiedConfig)throw new Error("Cassette layered runtime: verifyAssetPackage() must pass before mount()");

    const names={...DEFAULT_ASSETS,...assets};
    if(assetBase!==verifiedConfig.assetBase||Object.keys(EXPECTED).some(key=>names[key]!==verifiedConfig.names[key])){
      throw new Error("Cassette layered runtime: mount configuration differs from verified package");
    }

    looper=document.getElementById("looper");
    if(!looper)throw new Error("Cassette layered runtime: #looper not found");

    const url=name=>`${assetBase}${name}`;

    stage=document.createElement("div");
    stage.className="cassette-runtime-stage";
    stage.setAttribute("aria-hidden","true");

    cartridge=makeLayer("cassette-runtime-cartridge");
    cartridge.append(
      makeImg("cassette-runtime-reel cassette-runtime-reel-left",url(names.leftReel)),
      makeImg("cassette-runtime-reel cassette-runtime-reel-right",url(names.rightReel)),
      makeImg("cassette-runtime-full-layer cassette-runtime-shell",url(names.shell))
    );

    cassetteLabel=looper.querySelector(".asset-cassette-label-readout");
    if(cassetteLabel){
      cassetteLabelNextSibling=cassetteLabel.nextSibling;
      cartridge.appendChild(cassetteLabel);
    }

    const aperture=makeLayer("cassette-runtime-aperture");
    aperture.appendChild(cartridge);

    stage.append(
      makeLayer("cassette-runtime-cavity-backdrop"),
      makeImg("cassette-runtime-full-layer cassette-runtime-cavity",url(names.cavity)),
      aperture,
      makeLayer("cassette-runtime-backlight"),
      makeImg("cassette-runtime-full-layer cassette-runtime-glass",url(names.glass)),
      makeImg("cassette-runtime-full-layer cassette-runtime-support",url(names.support))
    );

    looper.appendChild(stage);
    mounted=true;
    return stage;
  }

  function setEnabled(enabled){
    if(enabled&&(!verified||!mounted))throw new Error("Cassette layered runtime: verified package must be mounted before activation");
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

  function animateInsertion(){
    return restartMotion("cassette-runtime-inserting",620);
  }

  function animateEjection(){
    return restartMotion("cassette-runtime-ejecting",520);
  }

  function syncFromCurrentLooperState(){
    if(!looper)looper=document.getElementById("looper");
    if(!looper)return;
    setPlaying(looper.classList.contains("asset-playing"));
    setBacklight(looper.classList.contains("asset-playing"));
  }

  function unmount(){
    if(motionTimer)clearTimeout(motionTimer);
    motionTimer=null;
    if(cassetteLabel&&looper){
      if(cassetteLabelNextSibling?.parentNode===looper)looper.insertBefore(cassetteLabel,cassetteLabelNextSibling);
      else looper.appendChild(cassetteLabel);
    }
    stage?.remove();
    if(looper){
      looper.classList.remove(
        "cassette-layered-runtime-enabled",
        "cassette-runtime-playing",
        "cassette-runtime-light-on",
        "cassette-runtime-inserting",
        "cassette-runtime-ejecting"
      );
    }
    stage=null;
    cartridge=null;
    cassetteLabel=null;
    cassetteLabelNextSibling=null;
    looper=null;
    mounted=false;
  }

  return {
    verifyAssetPackage,
    mount,
    unmount,
    setEnabled,
    setPlaying,
    setBacklight,
    animateInsertion,
    animateEjection,
    syncFromCurrentLooperState,
    isMounted:()=>mounted,
    isVerified:()=>verified,
    verificationReport:()=>verificationReport
  };
})();
