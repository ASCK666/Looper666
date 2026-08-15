"use strict";

(()=>{
  const STYLE_ID="chopper-layout-v93";

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      #chopper .samplerUpperDeck{grid-template-columns:1fr!important}
      #chopper .samplerControlModule{display:none!important}
      #chopper .sampleConditionHelp{display:none!important}

      #chopper .samplerWaveToolbar{
        display:grid;
        grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr);
        gap:8px;
        margin:0 0 8px;
        padding:9px;
        border:1px solid #382f26;
        border-radius:5px;
        background:linear-gradient(180deg,#100d0a,#080605);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.018);
      }
      #chopper .samplerWaveToolbar .samplerActionRow,
      #chopper .samplerWaveToolbar .samplerSelectRow{margin:0!important}
      #chopper .samplerWaveToolbar .samplerActionRow .btn{min-height:44px!important}
      #chopper .samplerWaveToolbar .samplerSelectRow>div{padding:7px!important}
      #chopper .samplerWaveToolbar label{margin-top:0!important}

      #chopper .samplerFineRow{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        align-items:center;
        gap:8px;
        margin:0 0 8px;
      }
      #chopper .samplerFineRow .advancedBox{margin:0!important}
      #chopper .samplerControlLegend{display:none!important}

      #chopper .samplerZoomControls{
        display:grid;
        grid-template-columns:36px minmax(54px,auto) 36px auto;
        align-items:center;
        gap:4px;
        min-height:38px;
        padding:4px;
        border:1px solid #382f26;
        border-radius:5px;
        background:linear-gradient(180deg,#100d0a,#080605);
      }
      #chopper .samplerZoomControls .btn{
        min-width:36px;
        min-height:30px!important;
        padding:5px 7px!important;
        border-color:#3b3127!important;
        color:#d7bf96!important;
        background:#090705!important;
        font:900 10px/1 var(--font-mono)!important;
      }
      #chopper .samplerZoomControls .zoomFit{min-width:46px}
      #chopper .samplerZoomReadout{
        min-width:54px;
        color:#e5c98f;
        text-align:center;
        font:900 9px/1 var(--font-mono);
        letter-spacing:.5px;
      }

      #chopper .samplerPadsModule .samplerSectionTitle,
      #chopper .samplerPadsModule .samplerModuleHint{display:none!important}
      #chopper .padPerformanceControls{
        display:grid!important;
        grid-template-columns:minmax(150px,1fr) 92px 92px!important;
        gap:8px!important;
        align-items:stretch;
        margin:0 0 10px!important;
        padding:8px!important;
        border:1px solid #382f26;
        border-radius:5px;
        background:linear-gradient(180deg,#100d0a,#080605);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.018);
      }
      #chopper .padPerformanceControls>div{
        min-width:0!important;
        min-height:72px;
        padding:7px!important;
        border:1px solid #302820!important;
        border-radius:4px!important;
        background:#090705!important;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
      }
      #chopper .padPerformanceControls>div:first-child{
        min-height:72px;
        display:grid!important;
        grid-template-columns:auto minmax(72px,110px);
        align-content:center;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }
      #chopper .padPerformanceControls label{
        width:100%;
        margin:0 0 6px!important;
        color:#9d8b71;
        text-align:center;
        font:800 8px/1 var(--font-mono);
        letter-spacing:.7px;
      }
      #chopper .padPerformanceControls>div:first-child label{
        width:auto;
        margin:0!important;
        text-align:left;
        white-space:nowrap;
      }
      #chopper .padPerformanceControls #sampleBpm{
        width:100%;
        min-height:36px;
        padding:5px 7px;
        color:#efe1c7;
        border-color:#3b3127;
        background:#070605;
        text-align:center;
        font:900 13px/1 var(--font-mono);
      }
      #chopper .samplerKnob{
        --knob-angle:0deg;
        position:relative;
        width:46px;
        height:46px;
        flex:0 0 46px;
        padding:0;
        border:1px solid #4a4035;
        border-radius:50%;
        background:radial-gradient(circle at 34% 30%,#3a342c 0,#211d18 37%,#0e0c0a 72%,#050403 100%);
        box-shadow:inset 0 1px rgba(255,255,255,.09),0 5px 10px rgba(0,0,0,.36);
        touch-action:none;
        cursor:ns-resize;
      }
      #chopper .samplerKnob:before{
        content:"";
        position:absolute;
        inset:-5px;
        border:1px solid #2d2721;
        border-radius:50%;
        pointer-events:none;
      }
      #chopper .samplerKnob:after{
        content:"";
        position:absolute;
        left:50%;
        top:5px;
        width:2px;
        height:13px;
        border-radius:2px;
        background:var(--accent);
        box-shadow:0 0 5px rgba(226,173,95,.28);
        transform-origin:50% 18px;
        transform:translateX(-50%) rotate(var(--knob-angle));
        pointer-events:none;
      }
      #chopper .samplerKnob:focus-visible{outline:1px solid var(--accent);outline-offset:3px}
      #chopper .knobSource{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        min-height:0!important;
        opacity:0!important;
        pointer-events:none!important;
      }
      #chopper .knobReadout{
        margin-top:6px;
        color:#d9c29b;
        font:800 8px/1 var(--font-mono);
        letter-spacing:.4px;
      }

      #chopper .pads .pad{
        border-color:#4a3a29!important;
        background:linear-gradient(180deg,#1a140d,#0d0906)!important;
        box-shadow:
          inset 0 0 18px rgba(226,173,95,.055),
          inset 0 1px 0 rgba(255,238,204,.025),
          0 0 7px rgba(226,173,95,.035)!important;
        transition:box-shadow .12s ease,border-color .12s ease,filter .12s ease,transform .08s ease!important;
      }
      #chopper .pads .pad:first-child{
        border-color:#76562f!important;
        box-shadow:
          inset 0 0 24px rgba(226,173,95,.13),
          inset 0 1px 0 rgba(255,238,204,.05),
          0 0 10px rgba(226,173,95,.10)!important;
        filter:brightness(1.08);
      }
      #chopper .pads .pad:hover,
      #chopper .pads .pad:focus-visible{
        border-color:#8d6938!important;
        box-shadow:inset 0 0 28px rgba(226,173,95,.17),0 0 12px rgba(226,173,95,.12)!important;
      }
      #chopper .pads .pad:active{
        transform:translateY(1px) scale(.99);
        filter:brightness(1.22);
        box-shadow:inset 0 0 34px rgba(226,173,95,.27),0 0 15px rgba(226,173,95,.18)!important;
      }

      @media(max-width:760px){
        #chopper .samplerWaveToolbar{grid-template-columns:1fr}
        #chopper .padPerformanceControls{grid-template-columns:minmax(130px,1fr) 82px 82px!important}
      }
      @media(max-width:520px){
        #chopper .samplerWaveToolbar .samplerActionRow,
        #chopper .samplerWaveToolbar .samplerSelectRow{grid-template-columns:1fr 1fr!important}
        #chopper .samplerFineRow{grid-template-columns:1fr}
        #chopper .samplerZoomControls{grid-template-columns:36px 1fr 36px auto}
        #chopper .padPerformanceControls{grid-template-columns:minmax(120px,1fr) 74px 74px!important;padding:6px!important;gap:6px!important}
        #chopper .padPerformanceControls>div{min-height:68px;padding:5px!important}
        #chopper .padPerformanceControls>div:first-child{grid-template-columns:1fr;gap:5px}
        #chopper .padPerformanceControls>div:first-child label{text-align:center}
        #chopper .samplerKnob{width:42px;height:42px;flex-basis:42px}
      }
    `;
    document.head.appendChild(style);
  }

  function dispatchInput(input,final=false){
    input.dispatchEvent(new Event("input",{bubbles:true}));
    if(final)input.dispatchEvent(new Event("change",{bubbles:true}));
  }

  function makeKnob(input,readout,options={}){
    if(!input||input.dataset.knobReady==="1")return;
    input.dataset.knobReady="1";
    input.classList.add("knobSource");

    const min=Number(input.min)||0;
    const max=Number(input.max)||100;
    const step=Number(input.step)||1;
    const button=document.createElement("button");
    button.type="button";
    button.className="samplerKnob";
    button.setAttribute("role","slider");
    button.setAttribute("aria-label",options.label||"Control");
    button.setAttribute("aria-valuemin",String(min));
    button.setAttribute("aria-valuemax",String(max));
    button.title="Drag up/down • wheel • arrows";
    input.insertAdjacentElement("afterend",button);

    if(readout)readout.classList.add("knobReadout");

    const clamp=v=>Math.min(max,Math.max(min,v));
    const snap=v=>Math.round(v/step)*step;
    const update=()=>{
      const value=Number(input.value);
      const t=(value-min)/(max-min||1);
      const angle=-135+(270*t);
      button.style.setProperty("--knob-angle",`${angle}deg`);
      button.setAttribute("aria-valuenow",String(value));
      button.setAttribute("aria-valuetext",options.format?options.format(value):String(value));
      if(readout)readout.textContent=options.format?options.format(value):String(value);
    };
    const setValue=(value,final=false)=>{
      input.value=String(snap(clamp(value)));
      update();
      dispatchInput(input,final);
    };

    let startY=0;
    let startValue=0;
    let dragging=false;
    button.addEventListener("pointerdown",event=>{
      dragging=true;
      startY=event.clientY;
      startValue=Number(input.value);
      button.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    button.addEventListener("pointermove",event=>{
      if(!dragging)return;
      const delta=(startY-event.clientY)*(max-min)/150;
      setValue(startValue+delta,false);
    });
    button.addEventListener("pointerup",event=>{
      if(!dragging)return;
      dragging=false;
      if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);
      dispatchInput(input,true);
    });
    button.addEventListener("pointercancel",()=>{dragging=false});
    button.addEventListener("wheel",event=>{
      event.preventDefault();
      setValue(Number(input.value)+(event.deltaY<0?step:-step),true);
    },{passive:false});
    button.addEventListener("keydown",event=>{
      let next=null;
      if(event.key==="ArrowUp"||event.key==="ArrowRight")next=Number(input.value)+step;
      if(event.key==="ArrowDown"||event.key==="ArrowLeft")next=Number(input.value)-step;
      if(event.key==="Home")next=min;
      if(event.key==="End")next=max;
      if(next===null)return;
      event.preventDefault();
      setValue(next,true);
    });
    button.addEventListener("dblclick",()=>{
      if(options.resetValue!==undefined)setValue(options.resetValue,true);
    });
    input.addEventListener("input",update);
    input.addEventListener("change",update);
    update();
  }

  function makeZoomControls(input){
    if(!input||document.querySelector("#chopper .samplerZoomControls"))return null;
    const wrap=document.createElement("div");
    wrap.className="samplerZoomControls";
    wrap.setAttribute("role","group");
    wrap.setAttribute("aria-label","Sample waveform zoom");

    const minus=document.createElement("button");
    minus.type="button";
    minus.className="btn";
    minus.textContent="−";
    minus.title="Zoom out";
    minus.setAttribute("aria-label","Zoom out");

    const readout=document.createElement("span");
    readout.className="samplerZoomReadout";

    const plus=document.createElement("button");
    plus.type="button";
    plus.className="btn";
    plus.textContent="+";
    plus.title="Zoom in";
    plus.setAttribute("aria-label","Zoom in");

    const fit=document.createElement("button");
    fit.type="button";
    fit.className="btn zoomFit";
    fit.textContent="FIT";
    fit.title="Show full sample";

    wrap.append(minus,readout,plus,fit);

    const min=Number(input.min)||1;
    const max=Number(input.max)||24;
    const update=()=>{readout.textContent=`ZOOM ${Number(input.value)||1}×`;};
    const setZoom=value=>{
      input.value=String(Math.min(max,Math.max(min,Math.round(value))));
      dispatchInput(input,true);
      update();
    };
    minus.addEventListener("click",()=>setZoom((Number(input.value)||1)-1));
    plus.addEventListener("click",()=>setZoom((Number(input.value)||1)+1));
    fit.addEventListener("click",()=>{
      setZoom(1);
      const scroll=document.getElementById("waveScroll");
      if(scroll){
        scroll.value="0";
        dispatchInput(scroll,true);
      }
    });
    input.addEventListener("input",update);
    input.addEventListener("change",update);
    update();
    return wrap;
  }

  function arrangeChopper(){
    const screen=document.querySelector("#chopper .samplerScreenModule");
    const controls=document.querySelector("#chopper .samplerControlModule");
    const pads=document.querySelector("#chopper .samplerPadsModule");
    const wave=document.querySelector("#chopper .samplerScreen");
    if(!screen||!controls||!pads||!wave)return;

    injectStyles();

    if(!screen.querySelector(".samplerWaveToolbar")){
      const toolbar=document.createElement("div");
      toolbar.className="samplerWaveToolbar";
      const actions=controls.querySelector(".samplerActionRow");
      const selects=controls.querySelector(".samplerSelectRow");
      if(actions)toolbar.appendChild(actions);
      if(selects)toolbar.appendChild(selects);
      screen.insertBefore(toolbar,wave);

      ["sampleFile","waveZoom"].forEach(id=>{
        const node=document.getElementById(id);
        if(node)screen.appendChild(node);
      });

      const fine=controls.querySelector(".advancedBox");
      if(fine){
        const fineRow=document.createElement("div");
        fineRow.className="samplerFineRow";
        fineRow.appendChild(fine);
        const zoomControls=makeZoomControls(document.getElementById("waveZoom"));
        if(zoomControls)fineRow.appendChild(zoomControls);
        screen.insertBefore(fineRow,wave);
      }
    }

    const performance=controls.querySelector(".friendlyControls")||document.querySelector("#chopper .friendlyControls");
    if(performance&&!performance.classList.contains("padPerformanceControls")){
      performance.classList.add("padPerformanceControls");
      const padsGrid=pads.querySelector("#pads");
      if(padsGrid)pads.insertBefore(performance,padsGrid);
    }

    makeKnob(
      document.getElementById("samplePitch"),
      document.getElementById("samplePitchReadout"),
      {label:"Sample pitch",resetValue:0,format:value=>`${value>0?"+":""}${value} st`}
    );
    makeKnob(
      document.getElementById("sampleVolume"),
      document.getElementById("sampleVolumeReadout"),
      {label:"Sample volume",resetValue:80,format:value=>`${Math.round(value)}%`}
    );
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",arrangeChopper,{once:true});
  else arrangeChopper();
})();
