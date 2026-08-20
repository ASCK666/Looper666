"use strict";

/*
  Production cassette runtime.
  Nothing mounts unless the frozen binary package first passes verifyAssetPackage().
*/

window.CassetteLayerRuntime=(()=>{
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
    cavity:{name:"cassette-cavity.png",width:554,height:250,alphaBBox:[0,0,554,250],sha256:"43c918622e23f0ba55280afaa3e88caa23ee2595991a49b6116d624f910bb52b"},
    leftReel:{name:"cassette-reel-left.png",width:154,height:154,alphaBBox:[0,0,154,154],sha256:"b1daef2f88a9d8e79c97b89ebcc7cb974703a4d240436928013e83786ab1c03e"},
    rightReel:{name:"cassette-reel-right.png",width:154,height:154,alphaBBox:[0,0,154,154],sha256:"6043c1b1c5a8bd5aba8386595c58cc251fcabd3b54646ca71b517ced16602daa"},
    shell:{name:"cassette-shell.png",width:554,height:250,alphaBBox:[0,0,554,250],sha256:"7abb476bf3bfa3bbb137949691ffca31ddcc176415d1314d3df0787de9ace70a"},
    support:{name:"cassette-support-foreground.png",width:585,height:67,alphaBBox:[0,0,585,67],sha256:"def9953347a1c2caadf7b7336a1e42509653a3f53ee01fc632222e0fea0588e9"},
    glass:{name:"cassette-glass-habitacle.png",width:604,height:278,alphaBBox:[0,0,604,278],sha256:"813ad24a3fb287f37069afe75f4803f4c00497143b075b21543507f75eed3061"}
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
  let verifiedSources=null;

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
    looper.classList.remove("cassette-runtime-inserting");
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

  function releaseVerifiedSources(){
    if(verifiedSources){
      Object.values(verifiedSources).forEach(src=>URL.revokeObjectURL(src));
    }
    verifiedSources=null;
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

    return {key,name:expected.name,url,width,height,alphaBBox,sha256:hash,objectUrl:URL.createObjectURL(blob),ok:true};
  }

  async function verifyAssetPackage({assetBase=DEFAULT_ASSET_BASE,assets={}}={}){
    if(mounted)throw new Error("Cassette layered runtime: unmount before verifying another package");
    const names={...DEFAULT_ASSETS,...assets};
    const url=name=>`${assetBase}${name}`;
    releaseVerifiedSources();
    verified=false;
    verificationReport=null;
    verifiedConfig=null;

    const rows=[];
    try{
      for(const key of Object.keys(EXPECTED)){
        if(names[key]!==EXPECTED[key].name){
          throw new Error(`Cassette package filename mismatch for ${key}: expected ${EXPECTED[key].name}`);
        }
        rows.push(await verifyOne(key,url(names[key]),EXPECTED[key]));
      }
    }catch(error){
      rows.forEach(row=>URL.revokeObjectURL(row.objectUrl));
      throw error;
    }

    verifiedSources=Object.fromEntries(rows.map(row=>[row.key,row.objectUrl]));
    verified=true;
    verifiedConfig={assetBase,names};
    verificationReport={
      ok:true,
      checkedAt:new Date().toISOString(),
      assets:rows.map(({objectUrl,...row})=>row)
    };
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

    if(!verifiedSources)throw new Error("Cassette layered runtime: verified asset sources unavailable");
    const source=key=>verifiedSources[key];

    stage=document.createElement("div");
    stage.className="cassette-runtime-stage";
    stage.setAttribute("aria-hidden","true");

    cartridge=makeLayer("cassette-runtime-cartridge");
    cartridge.append(
      makeImg("cassette-runtime-reel cassette-runtime-reel-left",source("leftReel")),
      makeImg("cassette-runtime-reel cassette-runtime-reel-right",source("rightReel")),
      makeImg("cassette-runtime-asset cassette-runtime-shell",source("shell"))
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
      makeImg("cassette-runtime-asset cassette-runtime-cavity",source("cavity")),
      aperture,
      makeLayer("cassette-runtime-backlight"),
      makeImg("cassette-runtime-asset cassette-runtime-glass",source("glass")),
      makeImg("cassette-runtime-asset cassette-runtime-support",source("support"))
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

  function setPlaybackRate(rate=1){
    if(!looper)looper=document.getElementById("looper");
    if(!looper)return;
    const safeRate=Math.max(.01,Number(rate)||1);
    looper.style.setProperty("--cassette-left-period",`${(1.848/safeRate).toFixed(3)}s`);
    looper.style.setProperty("--cassette-right-period",`${(1.842/safeRate).toFixed(3)}s`);
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
        "cassette-runtime-inserting"
      );
    }
    stage=null;
    cartridge=null;
    cassetteLabel=null;
    cassetteLabelNextSibling=null;
    looper=null;
    mounted=false;
    verified=false;
    verifiedConfig=null;
    releaseVerifiedSources();
  }

  return {
    verifyAssetPackage,
    mount,
    unmount,
    setEnabled,
    setPlaying,
    setBacklight,
    animateInsertion,
    setPlaybackRate,
    syncFromCurrentLooperState,
    isMounted:()=>mounted,
    isVerified:()=>verified,
    verificationReport:()=>verificationReport
  };
})();
