"use strict";

// ----------------------------
// IndexedDB beat library
// ----------------------------
const BEAT_DB_NAME="scratch-practice-station";
const BEAT_DB_VERSION=3;
const BEAT_STORE_NAME="beats";
const BEAT_FOLDER_CACHE_PREFIX="beat-folder-cache:";

// Physical rack and transport contracts live here so rendering, timing and
// tests share the same values instead of repeating UI magic numbers.
const MIN_RACK_COLUMNS=3;
const RACK_SLOTS_PER_COLUMN=4;
const AUTO_LOOP_BATCH=8;
const AUTO_SPEED_INCREMENT_PERCENT=1;
const AUTO_SPEED_MAX_PERCENT=200;
const AUTO_PROGRESS_INTERVAL_MS=200;
const SUPPLY_REEL_CYCLE_SECONDS=2.91;
const TAKEUP_REEL_CYCLE_SECONDS=1.46;

// Keep the cassette view beside the Looper state it renders. This function is
// deliberately presentation-only: transport changes remain in playDeck(),
// stopDeck() and toggleAutoLooper(), which makes UI refreshes safe to repeat.
function refreshCassetteUI(){
  const zone=$("looperDropzoneBtn");
  const name=$("cassetteBeatName");
  const hint=$("cassetteHint");
  const transportState=$("deckTransportState");
  const speedReadout=$("deckSpeedReadout");
  const autoReadout=$("deckAutoReadout");
  if(!zone || !name || !hint) return;

  const currentName=($("deckTrack")?.textContent || "NO BEAT LOADED").trim();
  name.textContent=shortName(currentName.toUpperCase(),32);

  const loaded=!!deckBuffer;
  const playing=!!deckSource;

  zone.classList.toggle("loaded",loaded);
  zone.classList.toggle("playing",playing);
  if(transportState)transportState.textContent=!loaded ? "EMPTY" : playing ? "PLAYING" : "READY";
  if(speedReadout)speedReadout.textContent=`${autoLooperSpeedPercent}%`;
  if(autoReadout)autoReadout.textContent=autoLooperEnabledState ? "ON" : "OFF";

  if(!loaded){
    hint.textContent="LOAD A BEAT TO START";
  }else if(playing){
    hint.textContent="PLAYING";
  }else{
    hint.textContent="READY • PRESS PLAY";
  }
}

// V61 stability: IndexedDB can be blocked by browser/privacy context. In that
// case the app continues to work for the current session instead of breaking
// LOOPER/CHOPPER/DRUM event binding during startup.
const memoryBeatStore=new Map();
let dbFallbackMode=false;
let dbPromise=null;
let storeLampTimer=null;

function enableDbFallback(error){
  dbFallbackMode=true;
  const reason=error?.message||String(error||"IndexedDB unavailable");
  console.warn("Scratch Practice: IndexedDB unavailable, using session memory:",reason);
}

function openDb(){
  if(dbPromise)return dbPromise;
  const attempt=new Promise((resolve,reject)=>{
    let req;
    let settled=false;
    const fail=error=>{
      if(settled)return;
      settled=true;
      reject(error);
    };

    try{ req=indexedDB.open(BEAT_DB_NAME,BEAT_DB_VERSION); }
    catch(error){ fail(error); return; }
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(BEAT_STORE_NAME))db.createObjectStore(BEAT_STORE_NAME,{keyPath:"id"});
    };
    req.onsuccess=()=>{
      const db=req.result;
      if(settled){ db.close(); return; }
      settled=true;
      db.onversionchange=()=>{ try{db.close()}catch{} dbPromise=null; };
      resolve(db);
    };
    req.onerror=()=>fail(req.error||new Error("IndexedDB open failed"));
    req.onblocked=()=>fail(new Error("IndexedDB upgrade blocked by another tab"));
  });
  dbPromise=attempt;
  // A synchronous indexedDB.open() failure happens before the outer assignment.
  // Clear the cached promise from a microtask so a later call may retry cleanly.
  void attempt.catch(()=>{ if(dbPromise===attempt)dbPromise=null; });
  return attempt;
}

function transactionError(tx,request,message){
  let requestFailure=null;
  try{ requestFailure=request?.error||null; }catch{}
  return requestFailure||tx?.error||new Error(message);
}

async function runBeatStoreTransaction(mode,operation){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(BEAT_STORE_NAME,mode);
    let request;
    try{
      request=operation(tx.objectStore(BEAT_STORE_NAME));
    }catch(error){
      try{tx.abort()}catch{}
      reject(error);
      return;
    }
    tx.oncomplete=()=>resolve(request?.result);
    // Request errors are more specific than transaction AbortError values
    // (notably QuotaExceededError, which keeps persistent rows visible).
    tx.onabort=()=>reject(transactionError(tx,request,"IndexedDB transaction aborted"));
    tx.onerror=()=>reject(transactionError(tx,request,"IndexedDB transaction failed"));
  });
}

function flashStoreLamp(){
  if(storeLampTimer)clearTimeout(storeLampTimer);
  setLamp("lampStore",true);
  storeLampTimer=setTimeout(()=>{
    storeLampTimer=null;
    setLamp("lampStore",false);
  },250);
}

async function dbPut(row,{flashLamp=true}={}){
  if(dbFallbackMode){
    memoryBeatStore.set(row.id,row);
  }else{
    try{
      await runBeatStoreTransaction("readwrite",store=>store.put(row));
      memoryBeatStore.delete(row.id);
    }catch(e){
      // Quota exhaustion must not hide the existing persistent library.
      if(e?.name==="QuotaExceededError"){
        console.warn("Scratch Practice: storage quota reached; keeping item in session memory");
        memoryBeatStore.set(row.id,row);
      }else{
        enableDbFallback(e);
        memoryBeatStore.set(row.id,row);
      }
    }
  }
  if(flashLamp)flashStoreLamp();
}

async function dbDelete(id){
  memoryBeatStore.delete(id);
  if(dbFallbackMode)return;
  try{
    await runBeatStoreTransaction("readwrite",store=>store.delete(id));
  }catch(e){
    console.warn("Scratch Practice: persistent delete failed",e);
  }
}

async function dbAll(){
  if(dbFallbackMode)return [...memoryBeatStore.values()];
  try{
    const persistent=await runBeatStoreTransaction("readonly",store=>store.getAll())||[];
    // Session-memory rows (e.g. quota overflow) overlay persistent rows by id.
    const merged=new Map(persistent.map(row=>[row.id,row]));
    for(const [id,row] of memoryBeatStore)merged.set(id,row);
    return [...merged.values()];
  }catch(e){
    enableDbFallback(e);
    return [...memoryBeatStore.values()];
  }
}

function beatCacheId(name){
  return `${BEAT_FOLDER_CACHE_PREFIX}${String(name).toLowerCase()}`;
}

async function cacheBeatDirectoryFile(file){
  await dbPut({
    id:beatCacheId(file.name),
    name:file.name,
    blob:file,
    created:file.lastModified||Date.now(),
    duration:null,
    source:"beat-folder-cache"
  },{flashLamp:false});
}

async function clearBeatDirectoryCache(){
  const rows=await dbAll();
  for(const row of rows){
    if(String(row.id||"").startsWith(BEAT_FOLDER_CACHE_PREFIX)){
      await dbDelete(row.id);
    }
  }
}


let visibleLibraryRowsState=[];
let beatDirectoryHandle=null;
let beatDirectoryRows=[];
let trackLoadSequence=0;
let deckTransportSequence=0;
const DEFAULT_BEATS=[
  {
    id:"bundled:stack-piano-horns-85",
    name:"Stack Piano + Horns • 85 BPM • A♯m",
    label:"Stack Piano + Horns",
    url:"./assets/beats/stack-piano-horns-85-asharp-minor.wav",
    duration:5.393265,
    bpm:85,
    key:"A♯m",
    created:1786647106000,
    source:"bundled"
  },
  {
    id:"bundled:violin-piano-92",
    name:"Violin + Piano • 92 BPM • B♭m",
    label:"Violin + Piano",
    url:"./assets/beats/violin-piano-92-bflat-minor.wav",
    duration:5.217392,
    bpm:92,
    key:"B♭m",
    created:1786629195000,
    source:"bundled"
  },
  {
    id:"bundled:stack-violin-piano-89",
    name:"Stack Violin + Piano • 89 BPM • Cm",
    label:"Stack Violin + Piano",
    url:"./assets/beats/stack-violin-piano-89-c-minor.wav",
    duration:5.333333,
    bpm:89,
    key:"Cm",
    created:1786637686000,
    source:"bundled"
  }
];


function beatFolderSupported(){
  return "showDirectoryPicker" in window;
}

async function beatFolderPermission(mode="read"){
  if(!beatDirectoryHandle)return "denied";
  if(!beatDirectoryHandle.queryPermission)return "granted";
  try{
    return await beatDirectoryHandle.queryPermission({mode});
  }catch{
    return "denied";
  }
}

function updateBeatFolderStatus(text){
  const el=$("beatImportStatus");
  if(el)el.textContent=text;
}

async function normalizeBeatDirectoryHandle(selectedHandle){
  if(!selectedHandle)throw new Error("Aucun dossier sélectionné");

  if(selectedHandle.name.toLowerCase()==="beat_scratch"){
    return selectedHandle;
  }

  // If the user selected K:\ (or another parent), only accept it if the
  // required beat_scratch child really exists. Never silently save elsewhere.
  try{
    return await selectedHandle.getDirectoryHandle("beat_scratch",{create:false});
  }catch{
    throw new Error('Sélectionne exactement K:\\beat_scratch (ou K:\\ contenant déjà beat_scratch)');
  }
}

async function scanBeatDirectory(){
  if(!beatDirectoryHandle){
    beatDirectoryRows=[];
    return beatDirectoryRows;
  }

  const permission=await beatFolderPermission("read");
  if(permission!=="granted"){
    updateBeatFolderStatus("K:\\beat_scratch • autorisation requise • CONNECT");
    return beatDirectoryRows;
  }

  try{
    const nextRows=[];
    const cacheCandidates=[];
    let skippedLarge=0;
    let cacheBytes=0;

    for await(const entry of beatDirectoryHandle.values()){
      if(entry.kind!=="file" || !audioExt.test(entry.name))continue;
      const file=await entry.getFile();
      if(file.size>MAX_BEAT_FILE_BYTES){ skippedLarge++; continue; }

      nextRows.push({
        id:`beat-folder:${entry.name}`,
        name:entry.name,
        blob:file,
        created:file.lastModified||0,
        duration:null,
        source:"beat-folder"
      });

      if(cacheCandidates.length<MAX_BEAT_CACHE_FILES && cacheBytes+file.size<=MAX_BEAT_CACHE_BYTES){
        cacheCandidates.push(file);
        cacheBytes+=file.size;
      }
    }

    // Only replace the old cache after a complete successful directory scan.
    beatDirectoryRows=nextRows;
    await clearBeatDirectoryCache();
    let cached=0;
    for(const file of cacheCandidates){
      try{ await cacheBeatDirectoryFile(file); cached++; }
      catch(e){ console.warn("Beat cache stopped:",e); break; }
    }

    const extras=[];
    if(skippedLarge)extras.push(`${skippedLarge} trop volumineux ignoré${skippedLarge>1?"s":""}`);
    if(cached<nextRows.length)extras.push(`cache ${cached}/${nextRows.length}`);
    updateBeatFolderStatus(`K:\\beat_scratch • ${nextRows.length} beats • connecté${extras.length?` • ${extras.join(" • ")}`:""}`);
  }catch(e){
    updateBeatFolderStatus("K:\\beat_scratch • scan error");
    console.warn("Beat folder scan:",e);
  }

  return beatDirectoryRows;
}
async function connectBeatDirectory(mode="read"){
  if(!beatFolderSupported()){
    updateBeatFolderStatus("Chrome/Edge requis pour l'accès direct au dossier");
    return false;
  }

  const pickerMode=mode==="readwrite"?"readwrite":"read";
  try{
    const selected=await window.showDirectoryPicker({
      id:"scratch-beat-folder",
      mode:pickerMode
    });

    beatDirectoryHandle=await normalizeBeatDirectoryHandle(selected);
    await scanBeatDirectory();
    await refreshLibrary(false);
    return true;
  }catch(e){
    if(e?.name!=="AbortError"){
      updateBeatFolderStatus(`Folder error: ${e.message}`);
      setBeatSaveStatus(`FOLDER ERROR: ${e.message}`,"error");
    }
    return false;
  }
}

async function ensureBeatDirectoryWriteAccess(){
  if(beatDirectoryHandle){
    let permission=await beatFolderPermission("readwrite");
    if(permission!=="granted" && beatDirectoryHandle.requestPermission){
      try{
        permission=await beatDirectoryHandle.requestPermission({mode:"readwrite"});
      }catch{}
    }
    if(permission==="granted")return true;
  }
  return connectBeatDirectory("readwrite");
}

function safeBeatFilename(name){
  let out=String(name||"SCRATCH_BEAT")
    .replace(/\.[^.]+$/," ")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g,"_")
    .replace(/\s+/g," ")
    .trim()
    .replace(/[ .]+$/g,"")
    .slice(0,90);

  // Windows device names remain reserved even with an extension.
  if(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(out))out=`_${out}`;
  return out || "SCRATCH_BEAT";
}
function timestampForFilename(){
  const d=new Date();
  const p=n=>String(n).padStart(2,"0");
  const ms=String(d.getMilliseconds()).padStart(3,"0");
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${ms}`;
}

function setBeatSaveStatus(text,state=""){
  const el=$("beatSaveStatus");
  el.textContent=text;
  el.classList.toggle("error",state==="error");
  el.classList.toggle("ok",state==="ok");
}

function downloadBeatFallback(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

async function saveBlobToBeatDirectory(blob,baseName){
  const ok=await ensureBeatDirectoryWriteAccess();
  if(!ok)throw new Error("dossier K:\\beat_scratch non autorisé");

  const filename=`${safeBeatFilename(baseName)}_${timestampForFilename()}.wav`;
  const fileHandle=await beatDirectoryHandle.getFileHandle(filename,{create:true});
  const writable=await fileHandle.createWritable({keepExistingData:false});
  try{
    await writable.write(blob);
    await writable.close();
  }catch(error){
    try{ await writable.abort(); }catch{}
    throw error;
  }

  const savedFile=await fileHandle.getFile();
  if(!savedFile || savedFile.size<44){
    throw new Error("le fichier créé est vide");
  }

  // Cache the just-written beat immediately, then rescan the real folder.
  await cacheBeatDirectoryFile(savedFile);
  await scanBeatDirectory();
  await refreshLibrary(false);

  return {
    filename,
    size:savedFile.size,
    directory:"K:\\beat_scratch"
  };
}

async function importBeatFiles(files){
  const selected=[...(files||[])];
  const items=selected.filter(isAudioFile);
  const loadRequest=++trackLoadSequence;
  let firstImported=null;
  let imported=0;
  let skipped=selected.length-items.length;
  let tooLarge=0;
  let decodeErrors=0;

  for(const file of items){
    try{
      if(file.size>MAX_BEAT_FILE_BYTES){ tooLarge++; continue; }
      const buffer=await decodeFile(file);
      const row={
        id:localId(),
        name:file.name,
        blob:file,
        created:Date.now(),
        duration:buffer.duration,
        source:"user-import"
      };
      await dbPut(row);
      imported++;
      if(!firstImported)firstImported={row,buffer};
    }catch(e){
      decodeErrors++;
      console.warn("Import skip",file.name,e);
    }
  }

  // LOAD -> ready immediately. Do not autoplay: user still decides with PLAY.
  if(firstImported && loadRequest===trackLoadSequence){
    if(deckSource)stopDeck();
    commitLoadedTrack(firstImported.row,firstImported.buffer);
  }
  await refreshLibrary(false);
  return {imported,skipped,tooLarge,decodeErrors,total:selected.length};
}
function beatSpineTone(row){
  const seed=String(row?.id||row?.name||"");
  let hash=0;
  for(let i=0;i<seed.length;i++)hash=(hash*31+seed.charCodeAt(i))>>>0;
  return hash%5;
}

function isFolderBeat(row){
  return row.source==="beat-folder"||row.source==="beat-folder-cache";
}

function isBundledBeat(row){
  return row.source==="bundled";
}

function relativeTrackIndex(rows,currentId,delta){
  if(!rows.length)return -1;
  let currentIndex=rows.findIndex(row=>row.id===currentId);
  if(currentIndex<0)currentIndex=delta>0?-1:0;
  return (currentIndex+delta+rows.length)%rows.length;
}

function createBeatSpine(row){
  const el=document.createElement("div");
  el.className="track"+(currentTrack?.id===row.id?" active":"");
  el.dataset.spineTone=String(beatSpineTone(row));

  const meta=document.createElement("button");
  meta.className="trackMeta";
  meta.type="button";
  meta.setAttribute("aria-label",`Charger ${row.label||shortName(row.name)}`);
  const b=document.createElement("b");
  b.textContent=row.label||shortName(row.name);
  const sm=document.createElement("small");
  const folderSource=isFolderBeat(row);
  const bundledSource=isBundledBeat(row);
  sm.textContent=bundledSource
    ? `${row.duration.toFixed(1)} s • INCLUDED • ${row.bpm} BPM • ${row.key}`
    : folderSource
    ? `${row.duration?row.duration.toFixed(1):"?"} s • LOCAL LIBRARY`
    : `${row.duration?row.duration.toFixed(1):"?"} s • USER IMPORT`;
  meta.append(b,sm);

  let right;
  if(folderSource||bundledSource){
    right=document.createElement("span");
    right.className="trackSource"+(bundledSource?" bundled":"");
    right.textContent=bundledSource?"IN":"LIB";
    right.title=bundledSource?"Beat inclus dans l'application":"Beat protégé de la bibliothèque locale";
  }else{
    right=document.createElement("button");
    right.className="btn danger";
    right.type="button";
    right.setAttribute("aria-label",`Supprimer ${shortName(row.name)}`);
    right.textContent="×";
    right.onclick=async ev=>{
      ev.stopPropagation();
      const deletingCurrent=currentTrack?.id===row.id;
      if(deletingCurrent){
        stopDeck();
        currentTrack=null;
        deckBuffer=null;
        $("deckTrack").textContent="Aucun beat chargé";
        $("deckInfo").textContent="Importe un WAV/MP3 pour commencer.";
        refreshCassetteUI();
      }
      await dbDelete(row.id);
      await refreshLibrary(false);
    };
  }

  const load=()=>switchTrack(row).catch(error=>{
    console.error("Beat load:",error);
    updateBeatFolderStatus(`LOAD ERROR • ${safeErrorMessage(error)}`);
  });
  meta.onclick=()=>{ void load(); };
  el.onclick=event=>{
    if(event.target.closest?.("button"))return;
    void load();
  };
  el.append(meta,right);
  return el;
}

function mergeLibraryRows(dbRows){
  const cachedRows=dbRows.filter(row=>row.source==="beat-folder-cache");
  const normalRows=dbRows.filter(row=>row.source!=="beat-folder-cache");
  const liveNames=new Set(beatDirectoryRows.map(row=>row.name.toLowerCase()));
  const cachedOnly=cachedRows.filter(row=>!liveNames.has(row.name.toLowerCase()));
  const folderNames=new Set([
    ...beatDirectoryRows.map(row=>row.name.toLowerCase()),
    ...cachedOnly.map(row=>row.name.toLowerCase())
  ]);

  return [
    ...DEFAULT_BEATS,
    ...beatDirectoryRows,
    ...cachedOnly,
    ...normalRows.filter(row=>!folderNames.has(row.name.toLowerCase()))
  ];
}

function visibleLibraryRows(rows,query,order){
  const normalizedQuery=String(query||"").trim().toLowerCase();
  return rows
    .filter(row=>!normalizedQuery||row.name.toLowerCase().includes(normalizedQuery))
    .sort((a,b)=>{
      const bundledFirst=Number(isBundledBeat(b))-Number(isBundledBeat(a));
      if(bundledFirst)return bundledFirst;
      if(order==="recent")return (b.created||0)-(a.created||0);
      return a.name.localeCompare(b.name);
    });
}

function createCassetteRackColumn(rows,columnIndex){
  const column=document.createElement("div");
  column.className="cassetteRackColumn";
  column.setAttribute("aria-label",`Colonne ${columnIndex+1}`);

  for(let slotIndex=0;slotIndex<RACK_SLOTS_PER_COLUMN;slotIndex++){
    const slot=document.createElement("div");
    slot.className="cassetteRackSlot";
    const row=rows[columnIndex*RACK_SLOTS_PER_COLUMN+slotIndex];
    if(row)slot.appendChild(createBeatSpine(row));
    column.appendChild(slot);
  }
  return column;
}

function renderLibraryRows(rows){
  const box=$("library");
  const columnCount=Math.max(MIN_RACK_COLUMNS,Math.ceil(rows.length/RACK_SLOTS_PER_COLUMN));
  const content=[];
  box.style.setProperty("--rack-columns",String(columnCount));

  for(let columnIndex=0;columnIndex<columnCount;columnIndex++){
    content.push(createCassetteRackColumn(rows,columnIndex));
  }

  if(!rows.length){
    const message=document.createElement("div");
    message.className="libraryEmptyMessage";
    message.textContent="Aucun résultat. Importe un beat ou efface la recherche.";
    content.push(message);
  }
  box.replaceChildren(...content);
}

async function refreshLibrary(rescanDirectory=true){
  let dbRows=await dbAll();

  if(rescanDirectory && beatDirectoryHandle && await beatFolderPermission("read")==="granted"){
    await scanBeatDirectory();
    dbRows=await dbAll();
  }

  const mergedRows=mergeLibraryRows(dbRows);
  visibleLibraryRowsState=visibleLibraryRows(
    mergedRows,
    $("librarySearch").value,
    $("libraryOrder").value
  );
  renderLibraryRows(visibleLibraryRowsState);
}

async function decodeTrackAudio(row){
  if(!row)throw new Error("Beat introuvable");
  await ensureAudio();
  let bytes;
  if(row.blob){
    assertLocalFileSize(row.blob,MAX_BEAT_FILE_BYTES,"beat");
    bytes=await row.blob.arrayBuffer();
  }else if(row.url){
    const response=await fetch(row.url,{cache:"force-cache"});
    if(!response.ok)throw new Error(`Beat inclus indisponible (${response.status})`);
    bytes=await response.arrayBuffer();
  }else{
    throw new Error("Source audio introuvable");
  }
  return await ctx.decodeAudioData(bytes);
}

function commitLoadedTrack(row,decoded){
  currentTrack=row;
  deckBuffer=decoded;
  row.duration=deckBuffer.duration;

  // Imported beats start at original speed.
  autoLooperSpeedPercent=100;
  stopAutoLooperProgress();
  $("deckTrack").textContent=row.name;
  $("deckInfo").textContent=`${deckBuffer.duration.toFixed(1)} s • original speed`;
  refreshCassetteUI();
}

async function loadTrack(row,{preservePlayback=false}={}){
  const request=++trackLoadSequence;
  const decoded=await decodeTrackAudio(row);
  if(request!==trackLoadSequence)return false;

  // Read the transport state after decoding: a STOP pressed during a slow
  // decode must stay stopped, while an active deck should resume the new beat.
  const resumePlayback=preservePlayback && !!deckSource;
  if(resumePlayback)stopDeck();
  commitLoadedTrack(row,decoded);
  if(resumePlayback)await playDeck();
  await refreshLibrary(false);
  return true;
}

async function switchTrack(row){
  return loadTrack(row,{preservePlayback:true});
}

function deckRate(){
  return autoLooperSpeedPercent / 100;
}

function refreshAutoLooperCompact(){
  const btn=$("autoLooperToggle");
  const status=$("autoLooperCompactStatus");
  const deck=$("looperDropzoneBtn");
  const speed=$("deckSpeedReadout");
  const auto=$("deckAutoReadout");
  if(!btn || !status) return;

  // Compact cassette tape moves at 4.75 cm/s. Keep the visual reels tied to
  // the actual deck playback rate instead of using a decorative fixed spin.
  if(deck){
    const rate=Math.max(.01,deckRate());
    deck.style.setProperty("--supply-reel-cycle",`${(SUPPLY_REEL_CYCLE_SECONDS/rate).toFixed(3)}s`);
    deck.style.setProperty("--takeup-reel-cycle",`${(TAKEUP_REEL_CYCLE_SECONDS/rate).toFixed(3)}s`);
  }

  btn.classList.toggle("active",autoLooperEnabledState);
  btn.setAttribute("aria-pressed",autoLooperEnabledState ? "true" : "false");
  if(speed)speed.textContent=`${autoLooperSpeedPercent}%`;
  if(auto)auto.textContent=autoLooperEnabledState ? "ON" : "OFF";

  status.textContent=autoLooperEnabledState
    ? `ON • ${autoLooperLoopCount}/${AUTO_LOOP_BATCH} LOOPS`
    : `OFF • +${AUTO_SPEED_INCREMENT_PERCENT}% / ${AUTO_LOOP_BATCH} LOOPS`;
}

function resetAutoLooperProgress(){
  autoLooperSourceSeconds=0;
  autoLooperLoopCount=0;
  autoLooperLastCtxTime=ctx?.currentTime||0;
  refreshAutoLooperCompact();
}

function stopAutoLooperProgress(){
  if(autoLooperTimer){
    clearInterval(autoLooperTimer);
    autoLooperTimer=null;
  }
  autoLooperLastCtxTime=0;
  autoLooperSourceSeconds=0;
  autoLooperLoopCount=0;
  refreshAutoLooperCompact();
}

function applyAutoLooperIncrement(){
  if(autoLooperSpeedPercent>=AUTO_SPEED_MAX_PERCENT)return;

  autoLooperSpeedPercent=Math.min(
    AUTO_SPEED_MAX_PERCENT,
    autoLooperSpeedPercent+AUTO_SPEED_INCREMENT_PERCENT
  );
  if(deckSource){
    deckSource.playbackRate.value=deckRate();
  }
  refreshAutoLooperCompact();
}

function startAutoLooperProgress(){
  if(autoLooperTimer) clearInterval(autoLooperTimer);
  resetAutoLooperProgress();

  autoLooperTimer=setInterval(()=>{
    if(!deckSource || !deckBuffer || !ctx) return;

    const now=ctx.currentTime;
    const delta=Math.max(0,now-autoLooperLastCtxTime);
    autoLooperLastCtxTime=now;
    autoLooperSourceSeconds += delta * deckRate();

    const dur=Math.max(.01,deckBuffer.duration);
    while(autoLooperSourceSeconds>=dur){
      autoLooperSourceSeconds-=dur;
      autoLooperLoopCount++;

      if(autoLooperLoopCount>=AUTO_LOOP_BATCH){
        autoLooperLoopCount=0;
        if(autoLooperEnabledState){
          applyAutoLooperIncrement();
        }
      }
    }

    refreshAutoLooperCompact();
  },AUTO_PROGRESS_INTERVAL_MS);
}

function toggleAutoLooper(){
  autoLooperEnabledState=!autoLooperEnabledState;

  if(autoLooperEnabledState){
    if(deckSource)startAutoLooperProgress();
    else resetAutoLooperProgress();
  }else{
    stopAutoLooperProgress();
    autoLooperSpeedPercent=100;
    if(deckSource)deckSource.playbackRate.value=1;
  }

  refreshAutoLooperCompact();
}

async function playDeck(){
  const request=++deckTransportSequence;
  if(!deckBuffer){
    $("cassetteHint").textContent="LOAD A BEAT FIRST";
    return false;
  }

  const buffer=deckBuffer;
  await ensureAudio();
  if(request!==deckTransportSequence || buffer!==deckBuffer)return false;
  stopDeck({cancelPendingPlay:false});

  deckSource=ctx.createBufferSource();
  deckOutputGain=ctx.createGain();
  deckOutputGain.gain.value=1;

  deckSource.buffer=buffer;
  deckSource.loop=true;
  deckSource.playbackRate.value=deckRate();
  deckSource.connect(deckOutputGain);
  deckOutputGain.connect(liveBus);

  deckSource.start(0);
  if(autoLooperEnabledState)startAutoLooperProgress();
  else stopAutoLooperProgress();
  setLamp("lampPlay",true);
  ensureMeterElements();
  startMeterAnimation();
  refreshCassetteUI();
  return true;
}

function stopDeck({cancelPendingPlay=true}={}){
  if(cancelPendingPlay)deckTransportSequence++;
  stopAutoLooperProgress();
  if(deckSource){
    try{deckSource.stop()}catch{}
    try{deckSource.disconnect()}catch{}
    deckSource=null;
  }
  if(deckOutputGain){
    try{deckOutputGain.disconnect()}catch{}
    deckOutputGain=null;
  }
  setLamp("lampPlay",false);
  refreshCassetteUI();
}


async function selectRelative(delta){
  if(!visibleLibraryRowsState.length)return;
  const idx=relativeTrackIndex(visibleLibraryRowsState,currentTrack?.id,delta);
  await switchTrack(visibleLibraryRowsState[idx]);
}