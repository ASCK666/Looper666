"use strict";

let cassetteDoorTimer=null;

function beatImportSummary(label,result){
  const issues=result.tooLarge+result.decodeErrors+result.skipped;
  const beatLabel=label==="IMPORT" ? ` beat${result.total>1?"s":""}` : "";
  const ignored=issues ? ` • ${issues} ignoré${issues>1?"s":""}` : "";
  return `${label} • ${result.imported}/${result.total}${beatLabel}${ignored}`;
}

async function handleBeatImport(files,label){
  try{
    const result=await importBeatFiles(files);
    updateBeatFolderStatus(beatImportSummary(label,result));
  }catch(error){
    console.error(`${label}:`,error);
    updateBeatFolderStatus(`${label} ERROR • ${safeErrorMessage(error)}`);
  }
}

function pulseCassetteDoor(){
  const deck=$("looperDropzoneBtn");
  if(!deck)return;
  deck.classList.remove("ejecting");
  void deck.offsetWidth;
  deck.classList.add("ejecting");
  if(cassetteDoorTimer)clearTimeout(cassetteDoorTimer);
  cassetteDoorTimer=setTimeout(()=>{
    deck.classList.remove("ejecting");
    cassetteDoorTimer=null;
  },760);
}

function runLooperAction(label,action){
  const report=error=>{
    console.error(`${label}:`,error);
    updateBeatFolderStatus(`${label} ERROR • ${safeErrorMessage(error)}`);
  };
  try{
    Promise.resolve(action()).catch(report);
  }catch(error){
    report(error);
  }
}

$("headerCrateToggle").onclick=()=>{
  switchTab("looper");
  const crate=$("looper").querySelector(".beatCratePanel");
  crate.animate(
    [{boxShadow:"0 0 0 rgba(226,173,95,0)"},{boxShadow:"0 0 24px rgba(226,173,95,.14)"},{boxShadow:"0 0 0 rgba(226,173,95,0)"}],
    {duration:520,easing:"ease-out"}
  );
};

$("looperDropzoneBtn").addEventListener("dragover",ev=>{
  ev.preventDefault();
  $("looperDropzoneBtn").classList.add("dragging");
});
$("looperDropzoneBtn").addEventListener("dragleave",()=>{
  $("looperDropzoneBtn").classList.remove("dragging");
});
$("looperDropzoneBtn").addEventListener("drop",async ev=>{
  ev.preventDefault();
  $("looperDropzoneBtn").classList.remove("dragging");
  const files=[...ev.dataTransfer.files].filter(isAudioFile);
  if(!files.length)return;
  await handleBeatImport(files,"IMPORT");
});

$("importBeatsBtn").onclick=()=>{
  pulseCassetteDoor();
  openFilePicker("beatFiles");
};
$("importFolderBtn").onclick=()=>openFilePicker("beatFolder");
$("beatFiles").onchange=()=>handleBeatImport($("beatFiles").files,"IMPORT");
$("beatFolder").onchange=()=>handleBeatImport($("beatFolder").files,"FOLDER IMPORT");
$("librarySearch").oninput=()=>refreshLibrary(false);
$("libraryOrder").onchange=()=>refreshLibrary(false);

const deckTransportControlIds=["prevBeat","playBeat","stopBeat","nextBeat","autoLooperToggle"];
deckTransportControlIds.forEach(id=>{
  $(id)?.addEventListener("click",ev=>ev.stopPropagation());
});

$("autoLooperToggle").onclick=toggleAutoLooper;
$("playBeat").onclick=()=>runLooperAction("PLAY",playDeck);
$("stopBeat").onclick=()=>stopDeck();
$("prevBeat").onclick=()=>runLooperAction("PREV",()=>selectRelative(-1));
$("nextBeat").onclick=()=>runLooperAction("NEXT",()=>selectRelative(1));
