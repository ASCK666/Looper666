#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname,"..");
const sandbox = {
  ArrayBuffer,
  Blob,
  DataView,
  Date,
  Float32Array,
  Math,
  Map,
  Number,
  String,
  Uint32Array,
  clearInterval,
  clearTimeout,
  console,
  document:{
    getElementById:()=>null,
    createElement:()=>({}),
    documentElement:{style:{setProperty:()=>{}}}
  },
  performance:{now:()=>1000},
  requestAnimationFrame:()=>1,
  setInterval,
  setTimeout
};
sandbox.globalThis=sandbox;
vm.createContext(sandbox);

for(const file of ["js/core.js","js/looper.js"]){
  vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),sandbox,{filename:file});
}

const evaluate=source=>vm.runInContext(source,sandbox);

assert.equal(evaluate("clamp(12,0,10)"),10);
assert.equal(evaluate("clamp(-1,0,10)"),0);
assert.equal(evaluate("shortName('abcdef',4)"),"abc…");
assert.equal(evaluate("safeErrorMessage({message:'bad\\nmessage'})"),"bad message");
assert.equal(evaluate("dbToBarCount(-42,16)"),0);
assert.equal(evaluate("dbToBarCount(-21,16)"),8);
assert.equal(evaluate("dbToBarCount(0,16)"),16);
assert.equal(evaluate("updateMasterVolume(0);masterVolumeGain()"),0);
assert.equal(evaluate("updateMasterVolume(25);masterVolumeGain()"),.25);
assert.equal(evaluate("updateMasterVolume(150);masterVolumeGain()"),1);
assert.equal(evaluate("isAudioFile({name:'BEAT.WAV',type:''})"),true);
assert.equal(evaluate("isAudioFile({name:'notes.txt',type:'text/plain'})"),false);
assert.throws(
  ()=>evaluate("assertLocalFileSize({size:11},10,'beat')"),
  /beat trop volumineux/
);

assert.equal(evaluate("safeBeatFilename('CON.wav')"),"_CON");
assert.equal(evaluate("safeBeatFilename('  beat:name?.wav  ')") ,"beat_name_");
assert.equal(evaluate("beatCacheId('TRACK.WAV')"),"beat-folder-cache:track.wav");
assert.match(evaluate("timestampForFilename()"),/^\d{8}-\d{6}-\d{3}$/);
assert.equal(evaluate("transactionError({error:{name:'AbortError'}},{error:{name:'QuotaExceededError'}},'fallback').name"),"QuotaExceededError");
assert.equal(evaluate("beatSpineTone({id:'same'})===beatSpineTone({id:'same'})"),true);
assert.equal(evaluate("beatSpineTone({id:'same'})>=0 && beatSpineTone({id:'same'})<5"),true);
assert.equal(evaluate("isFolderBeat({source:'beat-folder-cache'})"),true);
assert.equal(evaluate("isFolderBeat({source:'bundled'})"),false);
assert.equal(evaluate("MIN_RACK_COLUMNS"),3);
assert.equal(evaluate("RACK_SLOTS_PER_COLUMN"),4);
assert.equal(evaluate("AUTO_LOOP_BATCH"),8);
assert.equal(evaluate("relativeTrackIndex([{id:'a'},{id:'b'}],null,1)"),0);
assert.equal(evaluate("relativeTrackIndex([{id:'a'},{id:'b'}],null,-1)"),1);
assert.equal(evaluate("relativeTrackIndex([{id:'a'},{id:'b'}],'a',1)"),1);
assert.equal(evaluate("visibleLibraryRows([{name:'Zulu',source:'user'},{name:'Alpha',source:'user'}],'','name')[0].name"),"Alpha");
assert.equal(evaluate("visibleLibraryRows([{name:'Older',created:1},{name:'Newer',created:2}],'','recent')[0].name"),"Newer");
assert.equal(evaluate("visibleLibraryRows([{name:'Kick'},{name:'Snare'}],' sna ','name').length"),1);
assert.equal(evaluate("visibleLibraryRows([{name:'Zulu'},{name:'Alpha'}],'','name').map(row=>row.name).join(',')"),"Alpha,Zulu");
assert.equal(evaluate("formatTapeCounter(0)"),"0000");
assert.equal(evaluate("formatTapeCounter(128.9)"),"0128");
assert.equal(evaluate("formatTapeCounter(10003)"),"0003");

sandbox.mockBuffer={
  numberOfChannels:1,
  sampleRate:8000,
  length:2,
  getChannelData:()=>new Float32Array([-1,1])
};
const blob=evaluate("bufferToBlob(mockBuffer)");
assert.equal(blob.type,"audio/wav");
assert.equal(blob.size,48);

blob.arrayBuffer().then(bytes=>{
  const view=new DataView(bytes);
  const ascii=(start,length)=>String.fromCharCode(
    ...new Uint8Array(bytes,start,length)
  );
  assert.equal(ascii(0,4),"RIFF");
  assert.equal(ascii(8,4),"WAVE");
  assert.equal(view.getUint32(24,true),8000);
  assert.equal(view.getUint16(22,true),1);
  console.log("OK: core unit tests — utilities, tape counter, real crate rows and WAV export");
}).catch(error=>{
  console.error(error);
  process.exitCode=1;
});
