"use strict";

(() => {
  function dispatchInput(input, final = false){
    input.dispatchEvent(new Event("input", {bubbles:true}));
    if(final) input.dispatchEvent(new Event("change", {bubbles:true}));
  }

  function makeKnob(input, readout, options = {}){
    if(!input || input.dataset.knobReady === "1") return;

    input.dataset.knobReady = "1";
    input.classList.add("knobSource");

    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const step = Number(input.step) || 1;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "samplerKnob";
    button.setAttribute("role", "slider");
    button.setAttribute("aria-label", options.label || "Control");
    button.setAttribute("aria-valuemin", String(min));
    button.setAttribute("aria-valuemax", String(max));
    button.title = "Drag up/down • wheel • arrows";
    input.insertAdjacentElement("afterend", button);

    if(readout) readout.classList.add("knobReadout");

    const clamp = value => Math.min(max, Math.max(min, value));
    const snap = value => Math.round(value / step) * step;

    const update = () => {
      const value = Number(input.value);
      const ratio = (value - min) / (max - min || 1);
      const angle = -135 + (270 * ratio);

      button.style.setProperty("--knob-angle", `${angle}deg`);
      button.setAttribute("aria-valuenow", String(value));
      button.setAttribute(
        "aria-valuetext",
        options.format ? options.format(value) : String(value)
      );

      if(readout){
        readout.textContent = options.format ? options.format(value) : String(value);
      }
    };

    const setValue = (value, final = false) => {
      input.value = String(snap(clamp(value)));
      update();
      dispatchInput(input, final);
    };

    let startY = 0;
    let startValue = 0;
    let dragging = false;

    button.addEventListener("pointerdown", event => {
      dragging = true;
      startY = event.clientY;
      startValue = Number(input.value);
      button.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    button.addEventListener("pointermove", event => {
      if(!dragging) return;
      const delta = (startY - event.clientY) * (max - min) / 150;
      setValue(startValue + delta);
    });

    button.addEventListener("pointerup", event => {
      if(!dragging) return;
      dragging = false;
      if(button.hasPointerCapture(event.pointerId)){
        button.releasePointerCapture(event.pointerId);
      }
      dispatchInput(input, true);
    });

    button.addEventListener("pointercancel", () => {
      dragging = false;
    });

    button.addEventListener("wheel", event => {
      event.preventDefault();
      setValue(Number(input.value) + (event.deltaY < 0 ? step : -step), true);
    }, {passive:false});

    button.addEventListener("keydown", event => {
      let next = null;

      if(event.key === "ArrowUp" || event.key === "ArrowRight") next = Number(input.value) + step;
      if(event.key === "ArrowDown" || event.key === "ArrowLeft") next = Number(input.value) - step;
      if(event.key === "Home") next = min;
      if(event.key === "End") next = max;
      if(next === null) return;

      event.preventDefault();
      setValue(next, true);
    });

    button.addEventListener("dblclick", () => {
      if(options.resetValue !== undefined){
        setValue(options.resetValue, true);
      }
    });

    input.addEventListener("input", update);
    input.addEventListener("change", update);
    update();
  }

  function makeZoomControls(input){
    if(!input || document.querySelector("#chopper .samplerZoomControls")) return null;

    const controls = document.createElement("div");
    controls.className = "samplerZoomControls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Sample waveform zoom");

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "btn";
    minus.textContent = "−";
    minus.title = "Zoom out";
    minus.setAttribute("aria-label", "Zoom out");

    const readout = document.createElement("span");
    readout.className = "samplerZoomReadout";

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "btn";
    plus.textContent = "+";
    plus.title = "Zoom in";
    plus.setAttribute("aria-label", "Zoom in");

    const fit = document.createElement("button");
    fit.type = "button";
    fit.className = "btn zoomFit";
    fit.textContent = "FIT";
    fit.title = "Show full sample";

    controls.append(minus, readout, plus, fit);

    const min = Number(input.min) || 1;
    const max = Number(input.max) || 24;

    const update = () => {
      readout.textContent = `ZOOM ${Number(input.value) || 1}×`;
    };

    const setZoom = value => {
      input.value = String(Math.min(max, Math.max(min, Math.round(value))));
      dispatchInput(input, true);
      update();
    };

    minus.addEventListener("click", () => setZoom((Number(input.value) || 1) - 1));
    plus.addEventListener("click", () => setZoom((Number(input.value) || 1) + 1));
    fit.addEventListener("click", () => {
      setZoom(1);
      const scroll = document.getElementById("waveScroll");
      if(scroll){
        scroll.value = "0";
        dispatchInput(scroll, true);
      }
    });

    input.addEventListener("input", update);
    input.addEventListener("change", update);
    update();
    return controls;
  }

  function arrangeChopper(){
    const screen = document.querySelector("#chopper .samplerScreenModule");
    const controls = document.querySelector("#chopper .samplerControlModule");
    const pads = document.querySelector("#chopper .samplerPadsModule");
    const waveform = document.querySelector("#chopper .samplerScreen");

    if(!screen || !controls || !pads || !waveform) return;

    if(!screen.querySelector(".samplerWaveToolbar")){
      const toolbar = document.createElement("div");
      toolbar.className = "samplerWaveToolbar";

      const actions = controls.querySelector(".samplerActionRow");
      const selects = controls.querySelector(".samplerSelectRow");
      if(actions) toolbar.appendChild(actions);
      if(selects) toolbar.appendChild(selects);
      screen.insertBefore(toolbar, waveform);

      for(const id of ["sampleFile", "waveZoom"]){
        const node = document.getElementById(id);
        if(node) screen.appendChild(node);
      }

      const advancedSettings = controls.querySelector(".advancedBox");
      if(advancedSettings){
        const fineRow = document.createElement("div");
        fineRow.className = "samplerFineRow";
        fineRow.appendChild(advancedSettings);

        const zoomControls = makeZoomControls(document.getElementById("waveZoom"));
        if(zoomControls) fineRow.appendChild(zoomControls);
        screen.insertBefore(fineRow, waveform);
      }
    }

    const performanceControls =
      controls.querySelector(".friendlyControls") ||
      document.querySelector("#chopper .friendlyControls");

    if(performanceControls && !performanceControls.classList.contains("padPerformanceControls")){
      performanceControls.classList.add("padPerformanceControls");
      const padGrid = pads.querySelector("#pads");
      if(padGrid) pads.insertBefore(performanceControls, padGrid);
    }

    makeKnob(
      document.getElementById("samplePitch"),
      document.getElementById("samplePitchReadout"),
      {
        label: "Sample pitch",
        resetValue: 0,
        format: value => `${value > 0 ? "+" : ""}${value} st`
      }
    );

    makeKnob(
      document.getElementById("sampleVolume"),
      document.getElementById("sampleVolumeReadout"),
      {
        label: "Sample volume",
        resetValue: 80,
        format: value => `${Math.round(value)}%`
      }
    );
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", arrangeChopper, {once:true});
  }else{
    arrangeChopper();
  }
})();
