"use strict";

// ----------------------------
// Chopper waveform + markers
// ----------------------------
const canvas=$("waveCanvas");
const c2d=canvas.getContext("2d");
const playheadCanvas=$("playheadCanvas");
const ph2d=playheadCanvas.getContext("2d");

function samplePitchRate(){
  return Math.pow(2,samplePitchSemitones/12);
}

function sourceToDisplayTime(sourceSec){
  return sourceSec/samplePitchRate();
}

function displayToSourceTime(displaySec){
  return displaySec*samplePitchRate();
}

function effectiveSampleDuration(){
  return sampleBuffer ? sampleBuffer.duration/samplePitchRate() : 0;
}

function dbToGain(db){
  return Math.pow(10,db/20);
}

function analyzeSampleCondition(buffer){
  if(!buffer || !buffer.length){
    return {label:"NONE",trimDb:0,highPassHz:30,bodyCutDb:0,rmsDb:-120,crestDb:99,peakDb:-120,clippingRatio:0,lowMidRatio:0};
  }

  const channels=buffer.numberOfChannels;
  const len=buffer.length;
  const stride=Math.max(1,Math.floor(len/350000));
  const effectiveSr=buffer.sampleRate/stride;
  const a45=1-Math.exp(-2*Math.PI*45/effectiveSr);
  const a220=1-Math.exp(-2*Math.PI*220/effectiveSr);
  const lp45=Array(channels).fill(0);
  const lp220=Array(channels).fill(0);
  let peak=0,sumSq=0,sumLow=0,sumLowMidBase=0,count=0,clipped=0;

  // Analyze channels independently. Averaging L+R first can completely hide
  // a loud stereo source when the channels are out of phase.
  for(let i=0;i<len;i+=stride){
    for(let ch=0;ch<channels;ch++){
      const x=buffer.getChannelData(ch)[i]||0;
      const ax=Math.abs(x);
      if(ax>peak)peak=ax;
      if(ax>=.995)clipped++;
      const sq=x*x;
      sumSq+=sq;
      lp45[ch]+=a45*(x-lp45[ch]);
      lp220[ch]+=a220*(x-lp220[ch]);
      sumLow+=lp45[ch]*lp45[ch];
      sumLowMidBase+=lp220[ch]*lp220[ch];
      count++;
    }
  }

  const rms=Math.sqrt(sumSq/Math.max(1,count));
  const rmsDb=20*Math.log10(Math.max(rms,1e-8));
  const peakDb=20*Math.log10(Math.max(peak,1e-8));
  const crestDb=20*Math.log10(Math.max(peak,1e-8)/Math.max(rms,1e-8));
  const clippingRatio=clipped/Math.max(1,count);
  const lowMidEnergy=Math.max(0,sumLowMidBase-sumLow);
  const lowMidRatio=lowMidEnergy/Math.max(sumSq,1e-9);

  let label="CLEAN";
  if(crestDb<5.5)label="LIMITED";
  else if(clippingRatio>.001 || (rmsDb>-9.5 && peakDb>-.4))label="HOT";
  else if(crestDb<8.5 || rmsDb>-11)label="DENSE";

  // Never boost a source. Only create headroom when the source already
  // arrives mastered/hot. The existing SAMPLE VOL remains the user's control.
  let trimDb=0;
  if(rmsDb>-8)trimDb=-4;
  else if(rmsDb>-10)trimDb=-2.5;
  else if(rmsDb>-12)trimDb=-1;
  if(crestDb<7)trimDb-=.75;
  if(clippingRatio>.001)trimDb-=.75;
  trimDb=clamp(trimDb,-5,0);

  // Boom-bap friendly cleanup: remove inaudible rumble from every source,
  // and only carve body if the source is abnormally concentrated below 220 Hz.
  const bodyCutDb=lowMidRatio>.50?-2.0:(lowMidRatio>.40?-1.0:0);

  return {
    label,trimDb,highPassHz:30,bodyCutDb,
    rmsDb,crestDb,peakDb,clippingRatio,lowMidRatio
  };
}

function sampleConditionTrimGain(){
  return dbToGain(sampleConditionProfile?.trimDb||0);
}

function makeSampleConditioner(audioContext,destination,baseGain=1){
  const trim=audioContext.createGain();
  trim.gain.value=baseGain*sampleConditionTrimGain();

  const hp=audioContext.createBiquadFilter();
  hp.type="highpass";
  hp.frequency.value=sampleConditionProfile?.highPassHz||30;
  hp.Q.value=.707;

  const body=audioContext.createBiquadFilter();
  body.type="peaking";
  body.frequency.value=175;
  body.Q.value=.75;
  body.gain.value=sampleConditionProfile?.bodyCutDb||0;

  trim.connect(hp);
  hp.connect(body);
  body.connect(destination);
  return {input:trim,gain:trim,hp,body};
}

function sampleConditionSummary(){
  const p=sampleConditionProfile;
  if(!sampleBuffer || !p)return "";
  const trim=p.trimDb<-.05?` • trim ${p.trimDb.toFixed(1)} dB`:"";
  const body=p.bodyCutDb<-.05?` • body ${p.bodyCutDb.toFixed(1)} dB`:"";
  return ` • CONDITION ${p.label}${trim}${body} • HP ${Math.round(p.highPassHz)} Hz`;
}

function refreshSamplePitchUI(){
  const st=samplePitchSemitones;
  $("samplePitchReadout").textContent=`${st>0?"+":""}${st} st`;
  if(sampleBuffer){
    const effective=effectiveSampleDuration();
    $("sampleInfo").textContent=
      `${sampleName} • original ${sampleBuffer.duration.toFixed(2)} s • pitched ${effective.toFixed(2)} s • ${st>0?"+":""}${st} st${sampleConditionSummary()}`;
  }
}

function sampleVolumeGain(){
  return clamp(sampleVolumePercent/100,0,1);
}

function masterVolumeGain(){
  return clamp(masterVolumePercent/100,0,1);
}

function refreshMasterVolumeUI(){
  const readout=$("masterVolumeReadout");
  if(readout) readout.textContent=`${masterVolumePercent}%`;
  if(liveBus)liveBus.gain.value=masterVolumeGain();
  const gain=masterVolumeGain();
  const db=(gain<=0)? "-∞ dB" : `${(20*Math.log10(gain)).toFixed(1)} dB`;
  if($("masterDb")) $("masterDb").textContent=db;
  document.documentElement.style.setProperty("--masterpct", String(masterVolumePercent));
}

async function loadChopperSample(file){
  stopChopAudition();
  if(!file)return false;

  try{
    $("chopStatus").textContent="LOADING SAMPLE…";
    assertLocalFileSize(file,MAX_SAMPLE_FILE_BYTES,"sample");
    sampleBuffer=await decodeFile(file);
    sampleName=file.name;
    sampleConditionProfile=analyzeSampleCondition(sampleBuffer);
    samplePitchSemitones=0;
    $("samplePitch").value=0;
    $("sampleBpm").value=90;
    transients=detectTransients(sampleBuffer);
    $("waveZoom").value=1;
    $("waveScroll").value=0;
    setMarkers(Number($("sliceCount").value)||16);
    autoPlaceMarkers();
    refreshSamplePitchUI();
    renderPads();
    $("chopStatus").textContent=`SAMPLE READY • ${file.name} • ${sampleConditionProfile.label}`;
    return true;
  }catch(error){
    console.error("Sample load:",error);
    $("chopStatus").textContent=`SAMPLE ERROR • ${safeErrorMessage(error)}`;
    return false;
  }
}

function viewWindow(){
  if(!sampleBuffer)return {start:0,dur:1,end:1};
  const zoom=Math.max(1,Number($("waveZoom").value)||1);
  const total=effectiveSampleDuration();
  const dur=total/zoom;
  const maxStart=Math.max(0,total-dur);
  const scroll=(Number($("waveScroll").value)||0)/1000;
  const start=maxStart*scroll;
  return {start,dur,end:start+dur};
}

function refreshMarkerEditor(){
  selectedMarker=clamp(selectedMarker,0,Math.max(0,markers.length-1));
}

function setMarkers(count){
  if(!sampleBuffer)return;
  count=clamp(Math.round(Number(count)||8),1,16);
  const dur=sampleBuffer.duration;
  markers=Array.from({length:count+1},(_,i)=>dur*i/count);
  markers[0]=0;
  markers[markers.length-1]=dur;
  selectedMarker=0;
  refreshMarkerEditor();
  drawWave();
  renderPads();
  $("sampleInfo").textContent=`${count} chops • marqueurs réguliers`;
}

function autoPlaceMarkers(){
  if(!sampleBuffer)return;

  const count=clamp(Math.round(Number($("sliceCount").value)||8),1,16);
  const mode=$("snapMode").value;
  const dur=sampleBuffer.duration;
  const minGap=Math.min(.012,Math.max(.002,dur/(count*20)));

  if(mode!=="transient" || !transients.length){
    setMarkers(count);
    $("sampleInfo").textContent=`${count} chops • ${mode==="grid"?"grille":"répartition régulière"}`;
    return;
  }

  // Build exactly N chops. Each internal target chooses the closest usable
  // transient, while enforcing strict marker order. If there is no usable
  // transient near a target, keep the regular target instead.
  const chosen=[0];
  const usable=transients
    .filter(t=>t>minGap && t<dur-minGap)
    .sort((a,b)=>a-b);

  for(let i=1;i<count;i++){
    const target=dur*i/count;
    const lo=chosen[chosen.length-1]+minGap;
    const hi=dur-(count-i)*minGap;

    let best=clamp(target,lo,hi);
    let bestD=Infinity;

    for(const t of usable){
      if(t<lo||t>hi)continue;
      const d=Math.abs(t-target);
      if(d<bestD){
        bestD=d;
        best=t;
      }
    }

    chosen.push(clamp(best,lo,hi));
  }

  chosen.push(dur);
  markers=chosen;
  selectedMarker=0;
  refreshMarkerEditor();
  drawWave();
  renderPads();
  $("sampleInfo").textContent=`${count} chops • transients détectés ✓`;
}

function drawWave(){
  const w=canvas.width,h=canvas.height;
  c2d.clearRect(0,0,w,h);
  c2d.fillStyle="#12100d";c2d.fillRect(0,0,w,h);

  if(!sampleBuffer){
    c2d.fillStyle="#d6b777";c2d.font="15px monospace";
    c2d.fillText("LOAD SAMPLE",20,h/2);
    return;
  }

  const vw=viewWindow();
  const rate=samplePitchRate();
  const data=sampleBuffer.getChannelData(0),sr=sampleBuffer.sampleRate;

  // Convert visible pitched/playback time back to source samples.
  const first=Math.floor(displayToSourceTime(vw.start)*sr);
  const last=Math.min(data.length,Math.ceil(displayToSourceTime(vw.end)*sr));
  const samples=Math.max(1,last-first);
  const step=Math.max(1,Math.floor(samples/w));

  c2d.strokeStyle="#d7a455";
  c2d.lineWidth=1;
  c2d.beginPath();
  for(let x=0;x<w;x++){
    let min=1,max=-1;
    const start=first+x*step;
    const end=Math.min(last,start+step);
    for(let i=start;i<end;i++){
      const v=data[i];
      if(v<min)min=v;
      if(v>max)max=v;
    }
    const y1=(1-max)*h/2;
    const y2=(1-min)*h/2;
    c2d.moveTo(x,y1);c2d.lineTo(x,y2);
  }
  c2d.stroke();

  c2d.font="12px monospace";
  markers.forEach((sourceT,i)=>{
    const t=sourceToDisplayTime(sourceT);
    if(t<vw.start||t>vw.end)return;
    const x=(t-vw.start)/vw.dur*w;
    c2d.strokeStyle=i===selectedMarker?"#fff1a8":(i===0||i===markers.length-1?"#ffc04c":"#ff795a");
    c2d.lineWidth=i===selectedMarker?3:2;
    c2d.beginPath();c2d.moveTo(x,0);c2d.lineTo(x,h);c2d.stroke();
    if(i<markers.length-1){
      c2d.fillStyle="#ead9b9";
      c2d.fillText(String(i+1),x+4,18);
    }
  });

  c2d.fillStyle="#d6b777";
  c2d.font="10px monospace";
  c2d.fillText(
    `${samplePitchSemitones>0?"+":""}${samplePitchSemitones} st • ${vw.start.toFixed(3)}s — ${vw.end.toFixed(3)}s • total ${effectiveSampleDuration().toFixed(3)}s`,
    10,h-8
  );
}

function nearestTransient(sec){
  if(!transients.length)return sec;let best=sec,d=Infinity;
  for(const t of transients){const z=Math.abs(t-sec);if(z<d){d=z;best=t;}}
  const radius=(Number($("transientRadius").value)||80)/1000;
  return d<=radius?best:sec;
}

function applySnap(sec){
  const mode=$("snapMode").value;
  if(mode==="transient")return nearestTransient(sec);
  if(mode==="grid"){
    const bpm=Math.max(40,Number($("sampleBpm").value)||90);
    const div=Math.max(.015625,Number($("gridDivision").value)||.0625);
    const grid=60/bpm*div;
    const display=sourceToDisplayTime(sec);
    return displayToSourceTime(Math.round(display/grid)*grid);
  }
  return sec;
}

function markerBounds(i){
  const gap=.001;
  if(i===0)return [0,Math.max(0,markers[1]-gap)];
  if(i===markers.length-1)return [markers[i-1]+gap,sampleBuffer.duration];
  return [markers[i-1]+gap,markers[i+1]-gap];
}

function moveMarker(i,sec,snap=true){
  if(!sampleBuffer||i<0||i>=markers.length)return;
  if(snap)sec=applySnap(sec);
  const [lo,hi]=markerBounds(i);markers[i]=clamp(sec,lo,hi);selectedMarker=i;refreshMarkerEditor();drawWave();renderPads();
}

function markerFromEvent(ev){
  const r=canvas.getBoundingClientRect(),vw=viewWindow();
  const ratio=clamp((ev.clientX-r.left)/r.width,0,1);const sec=displayToSourceTime(vw.start+ratio*vw.dur);
  let best=-1,d=Infinity;for(let i=0;i<markers.length;i++){const z=Math.abs(markers[i]-sec);if(z<d){d=z;best=i;}}
  return {index:best,sec,px:d/vw.dur*canvas.width};
}

canvas.addEventListener("pointerdown",ev=>{
  if(!sampleBuffer)return;const m=markerFromEvent(ev);if(m.index<0)return;
  selectedMarker=m.index;refreshMarkerEditor();drawWave();
  if(m.px<24){draggingMarker=m.index;canvas.setPointerCapture(ev.pointerId);}
});
canvas.addEventListener("pointermove",ev=>{
  if(draggingMarker<0||!sampleBuffer)return;
  const r=canvas.getBoundingClientRect(),vw=viewWindow();
  const displaySec=vw.start+clamp((ev.clientX-r.left)/r.width,0,1)*vw.dur;
  // Manual drag is intentionally FREE: once the user moves a chop, it stays
  // exactly where it was placed. SNAP is for AUTO CHOP / explicit placement,
  // not for fighting manual corrections.
  moveMarker(draggingMarker,displayToSourceTime(displaySec),false);
});
canvas.addEventListener("pointerup",()=>{draggingMarker=-1;});
canvas.addEventListener("pointercancel",()=>{draggingMarker=-1;});
canvas.addEventListener("wheel",ev=>{
  if(!sampleBuffer)return;
  ev.preventDefault();

  const z=Number($("waveZoom").value)||1;
  $("waveZoom").value=clamp(z+(ev.deltaY<0?1:-1),1,24);

  // Keep the mouse position roughly anchored while zooming.
  const r=canvas.getBoundingClientRect();
  const mouseRatio=clamp((ev.clientX-r.left)/r.width,0,1);
  const total=effectiveSampleDuration();
  const newZoom=Number($("waveZoom").value)||1;
  const visibleDur=total/newZoom;
  const maxStart=Math.max(0,total-visibleDur);

  if(maxStart>0){
    const oldView=viewWindow();
    const focusTime=oldView.start+mouseRatio*oldView.dur;
    const desiredStart=clamp(focusTime-mouseRatio*visibleDur,0,maxStart);
    $("waveScroll").value=Math.round(desiredStart/maxStart*1000);
  }else{
    $("waveScroll").value=0;
  }

  drawWave();
},{passive:false});



function clearPlayhead(){
  ph2d.clearRect(0,0,playheadCanvas.width,playheadCanvas.height);
}

function buildLoopPlayheadState(){
  if(!sampleBuffer)return null;

  const bpm=Math.max(40,Number($("sampleBpm").value)||90);
  const stepDur=(60/bpm)/2;
  const targetDur=8*60/bpm;
  const pitchRate=samplePitchRate();
  const events=gridEventsForRender();

  const placed=[];
  for(let step=0;step<16;step++){
    const chop=Number(events[step])||0;
    if(chop>=1 && chop<markers.length){
      placed.push({step,chop});
    }
  }

  if(!placed.length)return null;

  const segments=[];
  for(let i=0;i<placed.length;i++){
    const ev=placed[i];
    const startTime=ev.step*stepDur;
    const nextTime=i+1<placed.length
      ? placed[i+1].step*stepDur
      : targetDur;

    const sampleStart=markers[ev.chop-1];
    const available=Math.max(0,sampleBuffer.duration-sampleStart);
    const maxAudible=available/pitchRate;
    const endTime=Math.min(targetDur,nextTime,startTime+maxAudible);

    if(endTime>startTime){
      segments.push({
        pad:ev.chop-1,
        startTime,
        endTime,
        sampleStart
      });
    }
  }

  return {
    duration:targetDur,
    pitchRate,
    segments
  };
}

function currentPlayheadInfo(){
  if(!ctx || !sampleBuffer)return null;

  // Clicking a pad has priority over the loop display while the pad audition
  // is sounding.
  if(chopAuditionSource){
    const sourcePos=Math.min(
      sampleBuffer.duration,
      chopAuditionOffset + Math.max(0,ctx.currentTime-chopAuditionStartedAt)*samplePitchRate()
    );

    return {
      time:sourceToDisplayTime(sourcePos),
      pad:chopAuditionPad,
      mode:"pad"
    };
  }

  if(!isLoopPlaying || lastPreviewMode!=="full" || !loopPlayheadState){
    return null;
  }

  const dur=Math.max(.001,loopPlayheadState.duration);
  const loopTime=((ctx.currentTime-loopPlayheadStartedAt)%dur+dur)%dur;
  const segment=loopPlayheadState.segments.find(
    seg=>loopTime>=seg.startTime && loopTime<seg.endTime
  );

  // There can be a silent gap if a chop reaches the physical end of the
  // sample before the next grid trigger. In that gap no sample is playing,
  // so the waveform playhead deliberately disappears.
  if(!segment){
    return {
      time:null,
      pad:-1,
      mode:"loop"
    };
  }

  const sourcePos=Math.min(
    sampleBuffer.duration,
    segment.sampleStart +
      (loopTime-segment.startTime)*loopPlayheadState.pitchRate
  );

  return {
    time:sourceToDisplayTime(sourcePos),
    pad:segment.pad,
    mode:"loop"
  };
}

function startPlayheadAnimation(){
  if(chopPlayheadRAF){
    cancelAnimationFrame(chopPlayheadRAF);
  }
  chopPlayheadRAF=requestAnimationFrame(drawPlayhead);
}

function stopPlayheadAnimation(clear=true){
  if(chopPlayheadRAF){
    cancelAnimationFrame(chopPlayheadRAF);
    chopPlayheadRAF=0;
  }
  if(clear){
    setActivePad(-1);
    clearPlayhead();
  }
}

function drawPlayhead(){
  clearPlayhead();

  const info=currentPlayheadInfo();
  if(!info){
    chopPlayheadRAF=0;
    setActivePad(-1);
    return;
  }

  setActivePad(info.pad);

  const t=info.time;
  if(t!==null){
    let vw=viewWindow();
    const zoom=Math.max(1,Number($("waveZoom").value)||1);

    if(zoom>1 && (t<vw.start || t>vw.end)){
      const visibleDur=effectiveSampleDuration()/zoom;
      const maxStart=Math.max(.0001,effectiveSampleDuration()-visibleDur);
      const desiredStart=clamp(t-visibleDur*.25,0,maxStart);
      $("waveScroll").value=Math.round(desiredStart/maxStart*1000);
      drawWave();
      vw=viewWindow();
    }

    const w=playheadCanvas.width,h=playheadCanvas.height;
    if(t>=vw.start && t<=vw.end){
      const x=(t-vw.start)/vw.dur*w;

      ph2d.save();
      ph2d.strokeStyle="#e2ad5f";
      ph2d.lineWidth=2;
      ph2d.shadowColor="rgba(226,173,95,.62)";
      ph2d.shadowBlur=8;
      ph2d.beginPath();
      ph2d.moveTo(x,0);
      ph2d.lineTo(x,h);
      ph2d.stroke();

      // Small cap makes the position readable without adding a time label.
      ph2d.fillStyle="#d48643";
      ph2d.beginPath();
      ph2d.moveTo(x-5,0);
      ph2d.lineTo(x+5,0);
      ph2d.lineTo(x,7);
      ph2d.closePath();
      ph2d.fill();
      ph2d.restore();
    }
  }

  chopPlayheadRAF=requestAnimationFrame(drawPlayhead);
}

function setActivePad(index){
  document.querySelectorAll("#pads .pad").forEach((pad,i)=>{
    pad.classList.toggle("hit",i===index);
  });
}

function stopChopAudition(){
  if(chopAuditionSource){
    const old=chopAuditionSource;
    chopAuditionSource=null;
    try{old.stop()}catch{}
  }

  chopAuditionPad=-1;
  chopAuditionGain=null;

  // If the sequenced beat is still running, immediately fall back to its
  // playhead instead of clearing the waveform.
  if(isLoopPlaying && lastPreviewMode==="full" && loopPlayheadState){
    startPlayheadAnimation();
  }else{
    stopPlayheadAnimation(true);
  }
}

function renderPads(){
  const box=$("pads");
  if(!box)return;
  box.textContent="";

  const availableCount=Math.min(16,Math.max(0,markers.length-1));
  const count=16;

  for(let i=0;i<count;i++){
    const button=document.createElement("button");
    const available=i<availableCount;

    button.className=`pad${available?"":" unavailable"}`;
    button.textContent=String(i+1);
    button.disabled=!available;
    button.title=available
      ? `Slice ${i+1} • click = audition`
      : `PAD ${i+1} • charge un sample pour l'activer`;

    if(available){
      button.onclick=()=>previewSlice(i,button);
    }

    box.appendChild(button);
  }

  if($("loopGrid"))renderLoopGrid();
}

async function previewSlice(i,button){
  if(!sampleBuffer||i<0||i>=markers.length-1)return;
  await ensureAudio();
  stopChopAudition();

  const start=clamp(markers[i],0,Math.max(0,sampleBuffer.duration-.001));
  const s=ctx.createBufferSource();
  s.buffer=sampleBuffer;
  s.playbackRate.value=samplePitchRate();
  const previewOutput=ctx.createGain();
  connectLive(previewOutput);
  const conditioner=makeSampleConditioner(ctx,previewOutput,sampleVolumeGain());
  s.connect(conditioner.input);

  chopAuditionSource=s;
  chopAuditionGain=conditioner.gain;
  chopAuditionPad=i;
  chopAuditionOffset=start;
  chopAuditionStartedAt=ctx.currentTime;

  setActivePad(i);
  s.onended=()=>{
    if(chopAuditionSource===s){
      chopAuditionSource=null;
      chopAuditionPad=-1;
      chopAuditionGain=null;

      if(isLoopPlaying && lastPreviewMode==="full" && loopPlayheadState){
        startPlayheadAnimation();
      }else{
        stopPlayheadAnimation(true);
      }
    }
  };

  // No slice-duration stop: play from this cue all the way to the end.
  s.start(0,start);
  startPlayheadAnimation();
}

function ensureGridEvents(){
  const old=loopGridEvents.slice();
  loopGridEvents=new Array(16).fill(0);
  for(let i=0;i<Math.min(old.length,16);i++){
    const pad=Number(old[i])||0;
    loopGridEvents[i]=(pad>=1 && pad<=Math.max(1,markers.length-1))?pad:0;
  }
}

function stepLabel(step){
  const beat=Math.floor((step%8)/2)+1;
  return step%2===0 ? String(beat) : "&";
}

function renderLoopGrid(){
  ensureGridEvents();
  const grid=$("loopGrid");
  grid.textContent="";

  const corner=document.createElement("div");
  corner.className="matrixCorner";
  grid.appendChild(corner);

  for(let step=0;step<16;step++){
    const head=document.createElement("div");
    const beatStart=step%2===0;
    const barStart=step===0||step===8;
    head.className=`matrixHead${beatStart?" beatStart":""}${barStart?" barStart":""}`;
    head.textContent=stepLabel(step);
    head.title=`Bar ${step<8?1:2} • ${stepLabel(step)}`;
    grid.appendChild(head);
  }

  const availableCount=Math.min(16,Math.max(0,markers.length-1));
  const padCount=16;

  for(let pad=1;pad<=padCount;pad++){
    const available=pad<=availableCount;

    const label=document.createElement("button");
    label.className=`matrixRowLabel${available?"":" unavailable"}`;
    label.textContent=`PAD ${pad}`;
    label.disabled=!available;
    label.title=available
      ? `Audition PAD ${pad}`
      : `PAD ${pad} • charge un sample pour l'activer`;

    if(available){
      label.onclick=()=>{
        const p=document.querySelectorAll("#pads .pad")[pad-1];
        previewSlice(pad-1,p||label);
      };
    }

    grid.appendChild(label);

    for(let step=0;step<16;step++){
      const cell=document.createElement("button");
      const beatStart=step%2===0;
      const barStart=step===0||step===8;
      const active=available && loopGridEvents[step]===pad;

      cell.className=`matrixCell${beatStart?" beatStart":""}${barStart?" barStart":""}${active?" active":""}${available?"":" unavailable"}`;
      cell.disabled=!available;
      cell.title=available
        ? `PAD ${pad} • Bar ${step<8?1:2} • ${stepLabel(step)}`
        : `PAD ${pad} indisponible`;

      if(available){
        cell.onclick=()=>{
          // Monophonic column. Clicking an already active cell does nothing,
          // so a browser double-click cannot erase it.
          if(loopGridEvents[step]!==pad){
            loopGridEvents[step]=pad;
            renderLoopGrid();
          }
        };
        cell.ondblclick=(ev)=>{
          ev.preventDefault();
          ev.stopPropagation();
        };
        cell.oncontextmenu=(ev)=>{
          ev.preventDefault();
          if(loopGridEvents[step]===pad){
            loopGridEvents[step]=0;
            renderLoopGrid();
          }
        };
      }

      grid.appendChild(cell);
    }
  }
}

function clearLoopGrid(){
  loopGridEvents=new Array(16).fill(0);
  renderLoopGrid();
}

function gridEventsForRender(){
  ensureGridEvents();
  return loopGridEvents.slice();
}

function synthHit(kind,rate){
  const dur=kind==="kick"?.22:kind==="snare"?.16:.07;
  const len=Math.floor(dur*rate);
  const out=new Float32Array(len);
  for(let i=0;i<len;i++){
    const t=i/rate,env=Math.exp(-t*(kind==="kick"?18:kind==="snare"?24:55));
    if(kind==="kick"){
      const base=92+Math.random()*26;
      const f=base-(42+Math.random()*18)*(t/dur);
      out[i]=Math.sin(2*Math.PI*f*t)*env*.85;
    }else if(kind==="snare"){
      const noise=(Math.random()*2-1)*.65;
      out[i]=(noise+Math.sin(2*Math.PI*190*t)*.35)*env*.55;
    }else{
      out[i]=(Math.random()*2-1)*env*.25;
    }
  }
  return out;
}

function sampleDensity(buffer){
  const data=buffer.getChannelData(0),hop=1024;let hits=0,total=0,prev=0;
  for(let i=0;i+hop<data.length;i+=hop){
    let e=0;for(let j=0;j<hop;j++){const v=data[i+j];e+=v*v;}
    e=Math.sqrt(e/hop);if(e-prev>.025)hits++;prev=e;total++;
  }
  return total?clamp(hits/total*5,0,1):.5;
}

// 30 original hip-hop grooves reconstructed from common programming
// principles: syncopated kicks, 2/4 backbeats, ghost snares, MPC-style swing,
// late claps/snares, and off-grid "drunk" timing. No source MIDI is copied.