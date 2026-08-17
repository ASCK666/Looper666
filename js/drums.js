"use strict";

const DRUM_PATTERNS={
  classic:[
    {id:"BB01",name:"SUBWAY HEADNOD",kicks:[0,6,8,14],snares:[4,12],ghosts:[],hats:[0,1,2,3,4,5,6,7],hatSwing:.034,hatOn:.31,hatOff:.24,snareDelay:.008},
    {id:"BB02",name:"UPTOWN POCKET",kicks:[0,7,8,11,14],snares:[4,12],ghosts:[15],hats:[0,1,2,3,4,5,6,7],hatSwing:.036,hatOn:.31,hatOff:.23,snareDelay:.010},
    {id:"BB03",name:"DUST ON THE ONE",kicks:[0,5,8,13],snares:[4,12],ghosts:[7],hats:[0,1,2,3,4,5,6,7],hatSwing:.032,hatOn:.32,hatOff:.25,snareDelay:.007},
    {id:"BB04",name:"BOROUGH BOUNCE",kicks:[0,6,8,11],snares:[4,12],ghosts:[15],hats:[0,1,2,3,4,5,6,7],hatSwing:.038,hatOn:.30,hatOff:.23,snareDelay:.011},
    {id:"BB05",name:"FIRE ESCAPE",kicks:[0,3,8,10,14],snares:[4,12],ghosts:[],hats:[0,1,2,3,4,5,6,7],hatSwing:.033,hatOn:.32,hatOff:.24,snareDelay:.006},
    {id:"BB06",name:"CRATE WALK",kicks:[0,2,7,8,14],snares:[4,12],ghosts:[11],hats:[0,1,2,3,4,5,6,7],hatSwing:.035,hatOn:.31,hatOff:.24,snareDelay:.009},
    {id:"BB07",name:"LATE TRAIN",kicks:[0,6,9,14],snares:[4,12],ghosts:[3],hats:[0,1,2,3,4,5,6,7],hatSwing:.040,hatOn:.30,hatOff:.22,snareDelay:.013},
    {id:"BB08",name:"WHITE LABEL",kicks:[0,3,6,8,13,15],snares:[4,12],ghosts:[],hats:[0,1,2,3,4,5,6,7],hatSwing:.034,hatOn:.31,hatOff:.24,snareDelay:.009},
    {id:"BB09",name:"BASEMENT LOOP",kicks:[0,5,8,10,14],snares:[4,12],ghosts:[15],hats:[0,1,2,3,4,5,6,7],hatSwing:.037,hatOn:.30,hatOff:.23,snareDelay:.012},
    {id:"BB10",name:"HEADNOD 94",kicks:[0,7,8,14,15],snares:[4,12],ghosts:[11],hats:[0,1,2,3,4,5,6,7],hatSwing:.035,hatOn:.32,hatOff:.24,snareDelay:.010}
  ],
  sparse:[
    {id:"DS01",name:"DUSTY TWO",kicks:[0,8],snares:[4,12],ghosts:[15],hats:[0,1,2,3,4,5,6,7],hatSwing:.042,hatOn:.29,hatOff:.21,snareDelay:.013},
    {id:"DS02",name:"EMPTY POCKET",kicks:[0,7,8],snares:[4,12],ghosts:[],hats:[0,1,2,4,5,6],hatSwing:.039,hatOn:.30,hatOff:.22,snareDelay:.010},
    {id:"DS03",name:"TAPE GAP",kicks:[0,8,14],snares:[4,12],ghosts:[7],hats:[0,1,2,3,4,5,6,7],hatSwing:.044,hatOn:.28,hatOff:.20,snareDelay:.015},
    {id:"DS04",name:"BACK ROOM",kicks:[0,3,8],snares:[4,12],ghosts:[11,15],hats:[0,2,3,4,6,7],hatSwing:.041,hatOn:.29,hatOff:.21,snareDelay:.014},
    {id:"DS05",name:"LOW CEILING",kicks:[0,6,8],snares:[4,12],ghosts:[15],hats:[0,1,2,4,5,6,7],hatSwing:.043,hatOn:.30,hatOff:.21,snareDelay:.012},
    {id:"DS06",name:"ONE LAMP",kicks:[0,8,11],snares:[4,12],ghosts:[3],hats:[0,1,3,4,5,7],hatSwing:.046,hatOn:.28,hatOff:.20,snareDelay:.016}
  ],
  hard:[
    {id:"HD01",name:"CONCRETE KNOCK",kicks:[0,3,6,8,11,14],snares:[4,12],ghosts:[],hats:[0,1,2,3,4,5,6,7],hatSwing:.030,hatOn:.33,hatOff:.25,snareDelay:.006},
    {id:"HD02",name:"STEEL DOOR",kicks:[0,2,6,8,10,14],snares:[4,12],ghosts:[15],hats:[0,1,2,3,4,5,6,7],hatSwing:.032,hatOn:.34,hatOff:.25,snareDelay:.007},
    {id:"HD03",name:"BLOCK PRESSURE",kicks:[0,3,7,8,10,14],snares:[4,12],ghosts:[11],hats:[0,1,2,3,4,5,6,7],hatSwing:.031,hatOn:.33,hatOff:.24,snareDelay:.005},
    {id:"HD04",name:"STAIRWELL",kicks:[0,2,6,8,10,13,15],snares:[4,12],ghosts:[],hats:[0,1,2,3,4,5,6,7],hatSwing:.029,hatOn:.34,hatOff:.26,snareDelay:.006},
    {id:"HD05",name:"CIPHER KNOCK",kicks:[0,5,7,8,11,14,15],snares:[4,12],ghosts:[3],hats:[0,1,2,3,4,5,6,7],hatSwing:.033,hatOn:.33,hatOff:.24,snareDelay:.008}
  ],
  wonky:[
    {id:"WK01",name:"DRUNK WALK",kicks:[0,6,8,14],snares:[4,12],ghosts:[7,15],hats:[0,1,2,3,4,5,6,7],hatSwing:.052,hatOn:.30,hatOff:.20,snareDelay:.022,kickNudge:{6:.014,14:-.012}},
    {id:"WK02",name:"LOOSE BRICKS",kicks:[0,3,8,11,14],snares:[4,12],ghosts:[15],hats:[0,1,2,3,4,5,6,7],hatSwing:.049,hatOn:.29,hatOff:.20,snareDelay:.027,kickNudge:{3:-.010,11:.016,14:-.008}},
    {id:"WK03",name:"TILTED MPC",kicks:[0,5,8,13],snares:[4,12],ghosts:[7,15],hats:[0,1,2,3,4,5,6,7],hatSwing:.056,hatOn:.30,hatOff:.19,snareDelay:.020,kickNudge:{5:.012,13:.020}},
    {id:"WK04",name:"SIDEWALK LEAN",kicks:[0,7,9,14],snares:[4,12],ghosts:[3,11],hats:[0,1,2,3,4,5,6,7],hatSwing:.047,hatOn:.31,hatOff:.21,snareDelay:.025,kickNudge:{7:-.014,9:.012}},
    {id:"WK05",name:"BROKEN CLOCK",kicks:[0,2,6,8,13,15],snares:[4,12],ghosts:[11],hats:[0,1,2,3,4,5,6,7],hatSwing:.054,hatOn:.29,hatOff:.19,snareDelay:.030,kickNudge:{2:.009,6:-.012,13:.017}}
  ],
  west:[
    {id:"WC01",name:"SUNSET ROLL",kicks:[0,3,8,10,14],snares:[4,12],ghosts:[],hats:[0,1,2,3,4,5,6,7],hatSwing:.020,hatOn:.31,hatOff:.26,snareDelay:.004},
    {id:"WC02",name:"BOULEVARD",kicks:[0,2,8,11,14],snares:[4,12],ghosts:[15],hats:[0,1,2,3,4,5,6,7],hatSwing:.018,hatOn:.32,hatOff:.27,snareDelay:.003},
    {id:"WC03",name:"LOWRIDER STEP",kicks:[0,6,8,10,13],snares:[4,12],ghosts:[],hats:[0,1,2,3,4,5,6,7],hatSwing:.022,hatOn:.31,hatOff:.26,snareDelay:.005},
    {id:"WC04",name:"PALM SHADE",kicks:[0,3,7,8,14],snares:[4,12],ghosts:[11],hats:[0,1,2,3,4,5,6,7],hatSwing:.019,hatOn:.32,hatOff:.27,snareDelay:.004}
  ]
};

function randomIndex(length){
  if(length<=1)return 0;
  if(globalThis.crypto?.getRandomValues){
    const n=new Uint32Array(1);
    crypto.getRandomValues(n);
    return n[0]%length;
  }
  return Math.floor(Math.random()*length);
}

function autoDrumStyle(density,previousMode=null){
  let pool;
  if(density>.68){
    pool=["sparse","sparse","classic","wonky","west"];
  }else if(density<.30){
    pool=["hard","classic","classic","wonky","west"];
  }else{
    pool=["classic","classic","sparse","hard","wonky","west"];
  }

  if(previousMode){
    const alternatives=pool.filter(x=>x!==previousMode);
    if(alternatives.length)pool=alternatives;
  }
  return pool[randomIndex(pool.length)];
}

function drumPattern(requested,density,previous=null,forceDifferent=false){
  let mode=requested;
  if(mode==="auto"){
    mode=autoDrumStyle(density,forceDifferent?previous?.mode:null);
  }

  const list=DRUM_PATTERNS[mode]||DRUM_PATTERNS.classic;
  let candidates=list;

  if(forceDifferent && previous?.patternId){
    const different=list.filter(p=>p.id!==previous.patternId);
    if(different.length)candidates=different;
  }

  const picked=candidates[randomIndex(candidates.length)];
  return {...picked,mode,kickNudge:{...(picked.kickNudge||{})}};
}

async function chooseDrumFolder(kind){
  const button=$(`${kind}FolderBtn`);
  if(button)button.disabled=true;

  try{
    // Native directory handle when available.
    if(window.isSecureContext && "showDirectoryPicker" in window){
      try{
        const handle=await window.showDirectoryPicker({id:`scratch-${kind}-folder`,mode:"read"});

        const entries=[];
        for await(const entry of handle.values()){
          if(entry.kind==="file" && audioExt.test(entry.name)){
            entries.push(entry);
            if(entries.length>=MAX_DRUM_FOLDER_FILES)break;
          }
        }
        const count=entries.length;

        if(!count){
          $("drumStatus").textContent=`${kind.toUpperCase()} • NO COMPATIBLE AUDIO FILE`;
          return;
        }

        drumDirectoryHandles[kind]=handle;
        drumDirectoryEntries[kind]=entries;
        drumFolderFiles[kind]=[];
        $("drumStatus").textContent=`${kind.toUpperCase()} • ${handle.name} • ${count} SOUNDS • LOADING…`;
        await refreshDrumsAfterFolderChange(kind,count,handle.name);
        return;
      }catch(e){
        if(e && e.name==="AbortError")return;
        console.warn("Directory picker fallback:",e);
      }
    }

    // file:// / browsers without File System Access API.
    // webkitdirectory remains the functional fallback.
    const input=$(`${kind}FolderFallback`);
    input.value="";
    input.click();
  }finally{
    if(button)button.disabled=false;
  }
}

async function setFallbackDrumFolder(kind,fileList){
  const files=[...fileList]
    .filter(isAudioFile)
    .filter(f=>f.size<=MAX_DRUM_FILE_BYTES)
    .slice(0,MAX_DRUM_FOLDER_FILES);

  if(!files.length){
    $("drumStatus").textContent=`${kind.toUpperCase()} • NO COMPATIBLE AUDIO FILE`;
    return false;
  }

  drumDirectoryHandles[kind]=null;
  drumDirectoryEntries[kind]=[];
  drumFolderFiles[kind]=files;

  const rootName=(files[0].webkitRelativePath||"").split("/")[0] || "local folder";
  $("drumStatus").textContent=`${kind.toUpperCase()} • ${rootName} • ${files.length} SOUNDS • LOADING…`;
  await refreshDrumsAfterFolderChange(kind,files.length,rootName);
  return true;
}

async function refreshDrumsAfterFolderChange(kind,count,origin){
  // A folder selection should have an audible result immediately.
  // Preserve the current groove family, but reroll the sound files now.
  if($("drumMode").value==="off"){
    $("drumStatus").textContent=`${kind.toUpperCase()} • ${origin} • ${count} SOUNDS • READY`;
    return;
  }

  const wasPlaying=isLoopPlaying;
  const modeBefore=lastPreviewMode;

  try{
    await generateDrumSelection(true);

    if(wasPlaying){
      if(modeBefore==="drums"){
        renderedFlip=await renderDrumsOnly();
        lastPreviewMode="drums";
        await playRendered(renderedFlip);
      }else if(modeBefore==="full" && sampleBuffer){
        const events=gridEventsForRender();
        if(events.some(Boolean)){
          renderedFlip=await renderSequence(events,sampleBuffer,markers,samplePitchRate());
          lastPreviewMode="full";
          await playRendered(renderedFlip);
        }
      }
    }

    const selected={
      kick:currentDrumSelection?.kick?.name,
      snare:currentDrumSelection?.snare?.name,
      hat:currentDrumSelection?.hat?.name
    }[kind] || "ready";
    $("drumStatus").textContent=`${kind.toUpperCase()} • ${selected} ✓`;
  }catch(e){
    $("drumStatus").textContent=`${kind.toUpperCase()} ERROR: ${e.message}`;
  }
}

async function randomAudioFileFromDirectory(kind,excludeName=null){
  const handle=drumDirectoryHandles[kind];

  if(handle){
    if(handle.queryPermission){
      let permission=await handle.queryPermission({mode:"read"});
      if(permission!=="granted" && handle.requestPermission){
        permission=await handle.requestPermission({mode:"read"});
      }
      if(permission!=="granted")throw new Error(`${kind.toUpperCase()} folder permission denied`);
    }

    const handles=drumDirectoryEntries[kind]||[];
    if(!handles.length)return null;

    const different=excludeName?handles.filter(h=>h.name!==excludeName):handles;
    const pool=different.length?different:handles;
    const maxAttempts=Math.min(12,pool.length);
    for(let attempt=0;attempt<maxAttempts;attempt++){
      const file=await pool[randomIndex(pool.length)].getFile();
      if(file.size<=MAX_DRUM_FILE_BYTES)return file;
    }
    throw new Error(`${kind.toUpperCase()} library: fichiers sélectionnés trop volumineux`);
  }

  const files=drumFolderFiles[kind]||[];
  if(!files.length)return null;

  const different=excludeName?files.filter(f=>f.name!==excludeName):files;
  const pool=different.length?different:files;
  return pool[randomIndex(pool.length)];
}


function makeSynthBuffer(kind,rate){
  const mono=synthHit(kind,rate);
  const b=ctx.createBuffer(1,mono.length,rate);
  b.copyToChannel(mono,0);
  return b;
}

async function loadSelectedDrum(kind,rate,excludeName=null){
  const file=await randomAudioFileFromDirectory(kind,excludeName);
  if(file){
    const key=`${kind}:${file.name}:${file.size}:${file.lastModified}`;
    if(!drumDecodeCache.has(key)){
      drumDecodeCache.set(key,await decodeFile(file));
      if(drumDecodeCache.size>24){
        const first=drumDecodeCache.keys().next().value;
        drumDecodeCache.delete(first);
      }
    }
    return {
      buffer:drumDecodeCache.get(key),
      name:file.name
    };
  }
  return {
    buffer:makeSynthBuffer(kind,rate),
    name:`SYNTH-${Math.floor(performance.now())}-${randomIndex(999)}`
  };
}

function drumSelectionSignature(sel){
  if(!sel||sel.mode==="off")return "OFF";
  return [
    sel.patternId||"",
    sel.mode,
    sel.kick?.name||"",
    sel.snare?.name||"",
    sel.hat?.name||""
  ].join("|");
}

function drumVelocityMap(lane){
  if(!currentDrumSelection)return {};

  if(lane==="kick"){
    if(!currentDrumSelection.kickVelocity)currentDrumSelection.kickVelocity={};
    return currentDrumSelection.kickVelocity;
  }

  if(lane==="snare"){
    if(!currentDrumSelection.snareVelocity)currentDrumSelection.snareVelocity={};
    return currentDrumSelection.snareVelocity;
  }

  if(lane==="hat"){
    if(!currentDrumSelection.hatVelocity)currentDrumSelection.hatVelocity={};
    return currentDrumSelection.hatVelocity;
  }

  return {};
}

function drumStepVelocity(lane,step){
  const map=drumVelocityMap(lane);
  const value=Number(map[step]);
  return Number.isFinite(value)?clamp(value,.10,1):1;
}

function setDrumStepVelocity(lane,step,value){
  const map=drumVelocityMap(lane);
  map[step]=clamp(Number(value)||1,.10,1);
}

function removeDrumStepVelocity(lane,step){
  const map=drumVelocityMap(lane);
  delete map[step];
}

function drumArrayForLane(lane){
  if(!currentDrumSelection)return [];
  if(lane==="kick")return currentDrumSelection.kicks;
  if(lane==="snare")return currentDrumSelection.snares;
  if(lane==="hat"){
    if(!currentDrumSelection.hatSteps){
      currentDrumSelection.hatSteps=(currentDrumSelection.hats||[]).map(x=>x*2);
    }
    return currentDrumSelection.hatSteps;
  }
  return [];
}

function markDrumSelectionEdited(){
  if(!currentDrumSelection || currentDrumSelection.mode==="off")return;
  if(currentDrumSelection.patternId!=="EDIT"){
    currentDrumSelection.patternName=`${currentDrumSelection.patternName} / CUSTOM`;
  }
  currentDrumSelection.patternId="EDIT";
  currentDrumSelection.ghosts=(currentDrumSelection.ghosts||[]).filter(
    step=>!currentDrumSelection.snares.includes(step)
  );
  $("currentPattern").textContent=`EDIT • ${currentDrumSelection.patternName}`;
  $("drumSelectionStatus").textContent="Groove modifié manuellement • NEW DRUMS pour repartir d'un nouveau pattern.";
}

async function rerenderPreviewMode(mode=lastPreviewMode){
  if(mode==="drums"){
    renderedFlip=await renderDrumsOnly();
    lastPreviewMode="drums";
    await playRendered(renderedFlip);
    return true;
  }

  if(mode==="full" && sampleBuffer){
    const events=gridEventsForRender();
    if(events.some(Boolean)){
      renderedFlip=await renderSequence(events,sampleBuffer,markers,samplePitchRate());
      lastPreviewMode="full";
      await playRendered(renderedFlip);
      return true;
    }
  }

  return false;
}

async function rerenderAfterDrumEdit(){
  if(!isLoopPlaying)return false;
  return await rerenderPreviewMode();
}

async function clearDrumEdits(){
  try{
    await ensureDrumSelection();
    currentDrumSelection.kicks=[];
    currentDrumSelection.snares=[];
    currentDrumSelection.ghosts=[];
    currentDrumSelection.hatSteps=[];
    currentDrumSelection.kickVelocity={};
    currentDrumSelection.snareVelocity={};
    currentDrumSelection.hatVelocity={};
    markDrumSelectionEdited();
    renderDrumEditor();
    await rerenderAfterDrumEdit();
    $("drumStatus").textContent="DRUMS CLEARED ✓";
  }catch(e){
    $("drumStatus").textContent="DRUM EDIT ERROR: "+e.message;
  }
}

async function generateNewDrums(){
  stopChopAudition();
  try{
    const wasPlaying=isLoopPlaying;
    const modeBefore=lastPreviewMode;

    await generateDrumSelection(true);

    if(wasPlaying){
      await rerenderPreviewMode(modeBefore);
    }

    $("drumStatus").textContent="NEW DRUMS ✓";
  }catch(error){
    $("drumStatus").textContent=`DRUM ERROR: ${safeErrorMessage(error)}`;
  }
}

function renderDrumEditor(){
  const grid=$("drumEditor");
  if(!grid)return;
  grid.textContent="";

  const view=Number($("drumEditView")?.value)||16;
  const visibleSteps=view===8 ? 8 : 16;
  const stepScale=view===8 ? 2 : 1;
  grid.classList.toggle("view8",view===8);
  grid.classList.toggle("view16",view===16);

  const corner=document.createElement("div");
  grid.appendChild(corner);

  for(let visualStep=0;visualStep<visibleSteps;visualStep++){
    const actualStep=visualStep*stepScale;
    const h=document.createElement("div");
    h.className="drumEditHeadStep";

    if(view===8){
      const beat=Math.floor(visualStep/2)+1;
      h.textContent=visualStep%2===0?String(beat):"&";
    }else{
      const withinBeat=actualStep%4;
      h.textContent=withinBeat===0
        ? String(Math.floor(actualStep/4)+1)
        : withinBeat===2
          ? "&"
          : "·";
    }

    grid.appendChild(h);
  }

  const lanes=[
    ["kick","KICK"],
    ["snare","SNARE"],
    ["hat","HI-HAT"]
  ];

  for(const [lane,labelText] of lanes){
    const loadButton=document.createElement("button");
    loadButton.type="button";
    loadButton.id=`${lane}FolderBtn`;
    loadButton.className="drumEditLibraryButton";
    loadButton.textContent=labelText;
    loadButton.title=`Charger le dossier ${labelText}`;
    loadButton.setAttribute("aria-label",`Charger le dossier ${labelText}`);
    loadButton.onclick=()=>chooseDrumFolder(lane);
    grid.appendChild(loadButton);

    const arr=drumArrayForLane(lane);

    for(let visualStep=0;visualStep<visibleSteps;visualStep++){
      const step=visualStep*stepScale;
      const cell=document.createElement("button");
      const active=arr.includes(step);
      const velocity=active?drumStepVelocity(lane,step):1;
      const percent=Math.round(velocity*100);

      cell.className=`drumEditStep ${lane}${step%4===0?" beat":""}${active?" active":""}`;
      cell.title=active
        ? `${labelText} • ${percent}% • molette = volume • clic = enlever`
        : `${labelText} • clic = ajouter à 100%`;

      if(active){
        cell.style.setProperty("--stepVelocity",String(velocity));
        cell.setAttribute("data-velocity",`${percent}%`);
        cell.setAttribute("aria-label",`${labelText} step ${visualStep+1}, volume ${percent}%`);
      }

      cell.onclick=async()=>{
        if(!currentDrumSelection || currentDrumSelection.mode==="off"){
          try{
            await generateDrumSelection(false);
          }catch(e){
            $("drumStatus").textContent="DRUM ERROR: "+e.message;
            return;
          }
        }

        const values=drumArrayForLane(lane);
        const index=values.indexOf(step);

        if(index>=0){
          values.splice(index,1);
          removeDrumStepVelocity(lane,step);
        }else{
          values.push(step);
          values.sort((a,b)=>a-b);
          setDrumStepVelocity(lane,step,1);
        }

        markDrumSelectionEdited();
        renderDrumEditor();

        try{
          await rerenderAfterDrumEdit();
          $("drumStatus").textContent=`EDIT ${labelText} ✓`;
        }catch(e){
          $("drumStatus").textContent="DRUM EDIT ERROR: "+e.message;
        }
      };

      cell.addEventListener("wheel",async ev=>{
        if(!currentDrumSelection || currentDrumSelection.mode==="off")return;
        if(!drumArrayForLane(lane).includes(step))return;

        ev.preventDefault();

        const current=drumStepVelocity(lane,step);
        const direction=ev.deltaY>0 ? -1 : 1;
        const next=clamp(
          Math.round((current + direction*.05)*20)/20,
          .10,
          1
        );

        if(next===current)return;

        setDrumStepVelocity(lane,step,next);
        markDrumSelectionEdited();
        renderDrumEditor();

        try{
          await rerenderAfterDrumEdit();
          $("drumStatus").textContent=`${labelText} ${Math.round(next*100)}%`;
        }catch(e){
          $("drumStatus").textContent="DRUM VELOCITY ERROR: "+e.message;
        }
      },{passive:false});

      grid.appendChild(cell);
    }
  }
}

function updateDrumSelectionUI(){
  if(!currentDrumSelection){
    $("drumSelectionStatus").textContent="Pas encore sélectionnée — le premier PLAY en choisira une.";
    $("currentKick").textContent="KICK —";
    $("currentSnare").textContent="SNARE —";
    $("currentHat").textContent="HAT —";
    $("currentPattern").textContent="PATTERN —";
    renderDrumEditor();
    return;
  }

  if(currentDrumSelection.mode==="off"){
    $("drumSelectionStatus").textContent="Batterie désactivée. NEW DRUMS pour changer.";
    $("currentKick").textContent="KICK —";
    $("currentSnare").textContent="SNARE —";
    $("currentHat").textContent="HAT —";
    $("currentPattern").textContent="PATTERN OFF";
    renderDrumEditor();
    return;
  }

  $("drumSelectionStatus").textContent=`Sélection #${drumGenerationNumber} verrouillée jusqu\'à NEW DRUMS.`;
  $("currentKick").textContent=`KICK ${currentDrumSelection.kick.name}`;
  $("currentSnare").textContent=`SNARE ${currentDrumSelection.snare.name}`;
  $("currentHat").textContent=`HAT ${currentDrumSelection.hat.name}`;
  $("currentPattern").textContent=`${currentDrumSelection.patternId} • ${currentDrumSelection.patternName}`;
  renderDrumEditor();
}

async function generateDrumSelection(forceDifferent=false){
  await ensureAudio();
  const requested=$("drumMode").value;
  const previous=currentDrumSelection;
  const previousSignature=drumSelectionSignature(previous);

  if(requested==="off"){
    currentDrumSelection={mode:"off",patternId:"OFF",patternName:"OFF",kicks:[],snares:[],ghosts:[],hats:[],hatSteps:[],kickVelocity:{},snareVelocity:{},hatVelocity:{},kick:null,snare:null,hat:null};
    updateDrumSelectionUI();
    return currentDrumSelection;
  }

  const density=sampleBuffer ? sampleDensity(sampleBuffer) : .5;
  const rate=44100;

  async function buildOne(){
    const pat=drumPattern(requested,density,previous,forceDifferent);
    const prevKick=forceDifferent ? previous?.kick?.name || null : null;
    const prevSnare=forceDifferent ? previous?.snare?.name || null : null;
    const prevHat=forceDifferent ? previous?.hat?.name || null : null;

    const [kick,snare,hat]=await Promise.all([
      loadSelectedDrum("kick",rate,prevKick),
      loadSelectedDrum("snare",rate,prevSnare),
      loadSelectedDrum("hat",rate,prevHat)
    ]);

    return {
      mode:pat.mode,
      patternId:pat.id,
      patternName:pat.name,
      kicks:[...pat.kicks],
      snares:[...(pat.snares||[4,12])],
      ghosts:[...(pat.ghosts||[])],
      hats:[...(pat.hats||[0,1,2,3,4,5,6,7])],
      hatSteps:[...(pat.hats||[0,1,2,3,4,5,6,7])].map(x=>x*2),
      kickVelocity:Object.fromEntries((pat.kicks||[]).map(step=>[step,1])),
      snareVelocity:Object.fromEntries((pat.snares||[4,12]).map(step=>[step,1])),
      hatVelocity:Object.fromEntries((pat.hats||[0,1,2,3,4,5,6,7]).map(x=>[x*2,1])),
      hatSwing:pat.hatSwing??.034,
      hatOn:pat.hatOn??.31,
      hatOff:pat.hatOff??.24,
      snareDelay:pat.snareDelay??.008,
      kickNudge:{...(pat.kickNudge||{})},
      kick,
      snare,
      hat
    };
  }

  let next=await buildOne();

  if(forceDifferent && previous && drumSelectionSignature(next)===previousSignature){
    next=await buildOne();
  }

  currentDrumSelection=next;
  drumGenerationNumber++;
  updateDrumSelectionUI();
  return currentDrumSelection;
}

async function ensureDrumSelection(){
  if(!currentDrumSelection)await generateDrumSelection(false);
  return currentDrumSelection;
}

function punchSettings(){
  const mode=$("punchMode")?.value||"warm";
  const presets={
    off:{
      mode:"off"
    },
    // V60: PUNCH is now deliberately conservative. The previous values
    // compressed the full sample+drums bus too early and then drove a
    // waveshaper, which could turn a good source into a dense/dirty export.
    warm:{
      mode:"warm",
      threshold:-12,
      knee:12,
      ratio:1.5,
      attack:.035,
      release:.20,
      drive:1.03,
      makeup:1.00,
      ceiling:.97
    },
    knock:{
      mode:"knock",
      threshold:-14,
      knee:10,
      ratio:1.8,
      attack:.030,
      release:.13,
      drive:1.08,
      makeup:1.01,
      ceiling:.965
    },
    hard:{
      mode:"hard",
      threshold:-18,
      knee:8,
      ratio:2.6,
      attack:.018,
      release:.10,
      drive:1.18,
      makeup:1.02,
      ceiling:.95
    }
  };
  return presets[mode]||presets.warm;
}

function makeSoftClipCurve(drive=1.35){
  const n=4096;
  const curve=new Float32Array(n);
  const norm=Math.tanh(drive)||1;
  for(let i=0;i<n;i++){
    const x=(i/(n-1))*2-1;
    curve[i]=Math.tanh(x*drive)/norm;
  }
  return curve;
}

function makePunchMaster(offline){
  const preset=punchSettings();
  const input=offline.createGain();

  if(preset.mode==="off"){
    input.connect(offline.destination);
    return {input,mode:"off"};
  }

  // Glue compressor: slow enough to keep the front of kick/snare alive.
  const comp=offline.createDynamicsCompressor();
  comp.threshold.value=preset.threshold;
  comp.knee.value=preset.knee;
  comp.ratio.value=preset.ratio;
  comp.attack.value=preset.attack;
  comp.release.value=preset.release;

  // Gentle saturation / soft clipping to catch peaks musically before limiting.
  const clip=offline.createWaveShaper();
  clip.curve=makeSoftClipCurve(preset.drive);
  clip.oversample="4x";

  const makeup=offline.createGain();
  makeup.gain.value=preset.makeup;

  // Final peak catcher. Web Audio has no dedicated brickwall limiter node,
  // so a high-ratio DynamicsCompressorNode is used as the last safety stage.
  const limiter=offline.createDynamicsCompressor();
  limiter.threshold.value=-.8;
  limiter.knee.value=1;
  limiter.ratio.value=12;
  limiter.attack.value=.003;
  limiter.release.value=.080;

  const ceiling=offline.createGain();
  ceiling.gain.value=preset.ceiling;

  input.connect(comp);
  comp.connect(clip);
  clip.connect(makeup);
  makeup.connect(limiter);
  limiter.connect(ceiling);
  ceiling.connect(offline.destination);

  return {input,mode:preset.mode};
}

function refreshPunchUI(){
  const mode=$("punchMode").value;
  const descriptions={
    off:"OFF • aucun traitement master.",
    warm:"WARM • glue très légère, transitoires préservées, safety limiter.",
    knock:"KNOCK • plus d'impact sans écraser le bus sample + drums.",
    hard:"HARD • compression audible mais nettement moins destructive qu'avant."
  };
  $("punchDesc").textContent=descriptions[mode]||descriptions.knock;
}

function snareReverbSettings(){
  return {
    on:$("snareReverbOn").checked,
    type:$("snareReverbType").value,
    mix:clamp((Number($("snareReverbMix").value)||0)/100,0,.70)
  };
}

function deterministicNoise(seed){
  let state=(seed>>>0)||0x6d2b79f5;
  return ()=>{
    state=(state+0x6D2B79F5)>>>0;
    let t=state;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

function reverbSeed(type,sampleRate){
  let h=2166136261>>>0;
  const text=`scratch-practice:${type}:${sampleRate}`;
  for(let i=0;i<text.length;i++){
    h^=text.charCodeAt(i);
    h=Math.imul(h,16777619)>>>0;
  }
  return h;
}

function makeReverbImpulse(offline,type){
  const rate=offline.sampleRate;
  const preset={
    room:{seconds:.55,decay:5.4,dark:.16},
    plate:{seconds:1.15,decay:3.8,dark:.08},
    dark:{seconds:1.55,decay:3.2,dark:.44}
  }[type] || {seconds:1.15,decay:3.8,dark:.08};

  const length=Math.max(1,Math.floor(rate*preset.seconds));
  const impulse=offline.createBuffer(2,length,rate);
  const random=deterministicNoise(reverbSeed(type,rate));

  for(let ch=0;ch<2;ch++){
    const data=impulse.getChannelData(ch);
    let lp=0;
    for(let i=0;i<length;i++){
      const t=i/length;
      const env=Math.pow(1-t,preset.decay);
      const noise=(random()*2-1);
      lp=lp*(preset.dark)+noise*(1-preset.dark);
      data[i]=lp*env*(ch===0?1:.96);
    }
  }
  return impulse;
}

function makeSnareBus(offline,destination=offline.destination){
  const fx=snareReverbSettings();
  if(!fx.on || fx.mix<=0){
    return {input:destination};
  }

  const input=offline.createGain();
  const dry=offline.createGain();
  const wet=offline.createGain();
  const conv=offline.createConvolver();

  conv.buffer=makeReverbImpulse(offline,fx.type);
  dry.gain.value=1-fx.mix*.45;
  wet.gain.value=fx.mix;

  input.connect(dry).connect(destination);
  input.connect(conv).connect(wet).connect(destination);
  return {input};
}

function renderSelectedDrums(offline,selection,bpm,bars,targetDur,destination=offline.destination){
  if(!selection || selection.mode==="off")return;

  const kick=selection.kick.buffer;
  const snare=selection.snare.buffer;
  const hat=selection.hat.buffer;
  const beat=60/bpm;
  const snareBus=makeSnareBus(offline,destination);

  const add=(buf,time,gain,target=destination)=>{
    if(time<0||time>=targetDur)return;
    const s=offline.createBufferSource();
    s.buffer=buf;
    const g=offline.createGain();
    g.gain.value=gain;
    s.connect(g).connect(target);
    s.start(time);
  };

  for(let bar=0;bar<bars;bar++){
    const base=bar*4*beat;

    for(const step of selection.snares){
      const t=base+step*beat/4+selection.snareDelay*beat;
      const velocity=clamp(Number(selection.snareVelocity?.[step]??1),.10,1);
      add(snare,t,.72*velocity,snareBus.input);
    }

    for(const step of selection.ghosts){
      const t=base+step*beat/4+selection.snareDelay*beat*.55;
      add(snare,t,.18,snareBus.input);
    }

    for(const step of selection.kicks){
      const nudge=Number(selection.kickNudge?.[step]||0);
      const t=base+step*beat/4+nudge*beat;
      const velocity=clamp(Number(selection.kickVelocity?.[step]??1),.10,1);
      const gain=(step===0?.86:.80)*velocity;
      add(kick,t,gain);
    }

    const hatSteps=selection.hatSteps || (selection.hats||[]).map(x=>x*2);
    for(const step of hatSteps){
      // 16-step editor. The classic eighth-note "and" is step 2 mod 4:
      // keep it slightly late and slightly quieter.
      const isAnd=step%4===2;
      const isSixteenth=step%2===1;
      const t=base+step*beat/4+(isAnd?selection.hatSwing*beat:0);
      const baseGain=isAnd
        ? selection.hatOff
        : isSixteenth
          ? Math.max(.12,selection.hatOff*.78)
          : selection.hatOn;
      const velocity=clamp(Number(selection.hatVelocity?.[step]??1),.10,1);
      add(hat,t,baseGain*velocity);
    }
  }
}

function finalizeLoopBuffer(buffer,fadeMs=3){
  if(!buffer || !buffer.length || buffer.length<4)return buffer;
  const frames=Math.min(
    Math.max(2,Math.round(buffer.sampleRate*fadeMs/1000)),
    Math.max(2,Math.floor(buffer.length/8))
  );

  for(let ch=0;ch<buffer.numberOfChannels;ch++){
    const data=buffer.getChannelData(ch);
    // Force both sides of the circular boundary to meet at the same value,
    // then return to the untouched audio over only a few milliseconds.
    const edgeSamples=Math.min(4,frames);
    let startMean=0,endMean=0;
    for(let i=0;i<edgeSamples;i++){
      startMean+=data[i];
      endMean+=data[data.length-1-i];
    }
    const boundary=(startMean+endMean)/(2*edgeSamples);

    const startOriginal=new Float32Array(frames);
    const endOriginal=new Float32Array(frames);
    startOriginal.set(data.subarray(0,frames));
    endOriginal.set(data.subarray(data.length-frames));

    for(let i=0;i<frames;i++){
      const t=frames===1?1:i/(frames-1);
      data[i]=boundary*(1-t)+startOriginal[i]*t;
      data[data.length-frames+i]=endOriginal[i]*(1-t)+boundary*t;
    }
  }
  return buffer;
}

async function renderDrumsOnly(){
  const selection=await ensureDrumSelection();
  const bpm=Math.max(40,Number($("sampleBpm").value)||90);
  const bars=2;
  const targetDur=8*60/bpm;
  const rate=44100;
  const offline=new OfflineAudioContext(2,Math.ceil(targetDur*rate),rate);
  const master=makePunchMaster(offline);

  renderSelectedDrums(offline,selection,bpm,bars,targetDur,master.input);
  return finalizeLoopBuffer(await offline.startRendering());
}

async function renderSequence(events,sourceBuffer,cueMarkers,pitchRate){
  if(!sourceBuffer)throw new Error("Charge un sample");
  const bpm=Math.max(40,Number($("sampleBpm").value)||90);
  const stepDur=(60/bpm)/2; // eighth note
  const bars=2;
  const targetDur=8*60/bpm; // 2 bars x 4 beats
  const rate=44100;
  const offline=new OfflineAudioContext(2,Math.ceil(targetDur*rate),rate);
  const master=makePunchMaster(offline);
  const sampleConditioner=makeSampleConditioner(offline,master.input,.72*sampleVolumeGain());

  const placed=[];
  for(let step=0;step<16;step++){
    const chop=Number(events[step])||0;
    if(chop>=1 && chop<cueMarkers.length)placed.push({step,chop});
  }
  if(!placed.length)throw new Error("Place au moins un PAD sur la grille");

  // Monophonic chop lane: a pad plays from its cue until the next active
  // eighth-note trigger, or until the sample itself ends.
  for(let e=0;e<placed.length;e++){
    const ev=placed[e];
    const startTime=ev.step*stepDur;
    const nextTime=e+1<placed.length?placed[e+1].step*stepDur:targetDur;
    const idx=ev.chop-1;
    const sampleStart=cueMarkers[idx];
    const available=Math.max(.01,sourceBuffer.duration-sampleStart);
    const wanted=Math.max(.01,nextTime-startTime);

    const src=offline.createBufferSource();
    src.buffer=sourceBuffer;
    src.playbackRate.value=pitchRate;
    src.connect(sampleConditioner.input);
    src.start(startTime,sampleStart);

    const maxAudible=available/pitchRate;
    src.stop(Math.min(targetDur,startTime+Math.min(wanted,maxAudible)));
  }

  const selection=await ensureDrumSelection();
  renderSelectedDrums(offline,selection,bpm,bars,targetDur,master.input);
  return finalizeLoopBuffer(await offline.startRendering());
}

async function playRendered(buffer){
  await ensureAudio();

  if(flipSource){
    try{flipSource.stop()}catch{}
  }

  flipSource=ctx.createBufferSource();
  flipSource.buffer=buffer;
  flipSource.loop=true;
  connectLive(flipSource);
  flipSource.start();
  isLoopPlaying=true;

  if(lastPreviewMode==="full" && sampleBuffer){
    loopPlayheadState=buildLoopPlayheadState();
    loopPlayheadStartedAt=ctx.currentTime;
    startPlayheadAnimation();
  }else{
    loopPlayheadState=null;
    loopPlayheadStartedAt=0;
    if(!chopAuditionSource){
      stopPlayheadAnimation(true);
    }
  }
}

async function playDrumsPreview(){
  stopChopAudition();
  try{
    const selection=await ensureDrumSelection();
    renderedFlip=await renderDrumsOnly();
    lastPreviewMode="drums";
    $("drumStatus").textContent=`DRUMS • ${$("sampleBpm").value} BPM • ${selection.mode.toUpperCase()}`;
    await playRendered(renderedFlip);
  }catch(e){
    $("drumStatus").textContent="DRUM ERROR: "+e.message;
  }
}

function stopCurrentBeat(){
  if(flipSource){
    try{flipSource.stop()}catch{}
    flipSource=null;
  }

  isLoopPlaying=false;
  lastPreviewMode=null;
  loopPlayheadState=null;
  loopPlayheadStartedAt=0;

  if(chopAuditionSource){
    startPlayheadAnimation();
  }else{
    stopPlayheadAnimation(true);
  }
}
