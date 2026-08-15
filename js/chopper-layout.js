"use strict";

(()=>{
  const STYLE_ID="chopper-layout-v92";

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      #chopper .samplerUpperDeck{grid-template-columns:1fr!important}
      #chopper .samplerControlModule{display:none!important}

      #chopper .samplerWaveToolbar{
        display:grid;
        grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr);
        gap:8px;
        margin:0 0 10px;
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
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-top:8px;
      }
      #chopper .samplerFineRow .advancedBox{flex:1;margin:0!important}
      #chopper .samplerFineRow .samplerControlLegend{margin:0!important;white-space:nowrap}

      #chopper .samplerPadsModule .samplerSectionTitle{margin-bottom:8px!important}
      #chopper .padPerformanceControls{
        display:grid!important;
        grid-template-columns:minmax(120px,1fr) 92px 92px!important;
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
        min-height:78px;
        padding:7px!important;
        border:1px solid #302820!important;
        border-radius:4px!important;
        background:#090705!important;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
      }
      #chopper .padPerformanceControls>div:first-child{align-items:stretch}
      #chopper .padPerformanceControls label{
        width:100%;
        margin:0 0 6px!important;
        color:#9d8b71;
        text-align:center;
        font:800 8px/1 var(--font-mono);
        letter-spacing:.7px;
      }
      #chopper .padPerformanceControls>div:first-child label{text-align:left}
      #chopper .padPerformanceControls #sampleBpm{
        min-height:40px;
        color:#efe1c7;
        border-color:#3b3127;
        background:#070605;
        text-align:center;
        font:900 14px/1 var(--font-mono);
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

      @media(max-width:760px){
        #chopper .samplerWaveToolbar{grid-template-columns:1fr}
        #chopper .padPerformanceControls{grid-template-columns:minmax(110px,1fr) 82px 82px!important}
      }
      @media(max-width:520px){
        #chopper .samplerWaveToolbar .samplerActionRow,
        #chopper .samplerWaveToolbar .samplerSelectRow{grid-template-columns:1fr 1fr!important}
        #chopper .padPerformanceControls{grid-template-columns:1fr 78px 78px!important;padding:6px!important;gap:6px!important}
        #chopper .padPerformanceControls>div{min-height:72px;padding:5px!important}
        #chopper .samplerKnob{width:42px;height:42px;flex-basis:42px}
        #chopper .samplerFineRow{align-items:stretch;flex-direction:column}
        #chopper .samplerFineRow .samplerControlLegend{white-space:normal}
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
      const legend=controls.querySelector(".samplerControlLegend");
      if(fine||legend){
        const fineRow=document.createElement("div");
        fineRow.className="samplerFineRow";
        if(fine)fineRow.appendChild(fine);
        if(legend)fineRow.appendChild(legend);
        screen.appendChild(fineRow);
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
