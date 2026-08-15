"use strict";

// ----------------------------
// Practice generator
// ----------------------------
const TECH={
  beginner:[
    {name:"BABY FLOW",tokens:["→","←","·","·"]},
    {name:"FORWARD / BACK",tokens:["→","·","←","·"]},
    {name:"STAB BASICS",tokens:["S","·","S","·"]}
  ],
  intermediate:[
    {name:"CHIRP FLOW",tokens:["C","C","·","C"]},
    {name:"TRANSFORMER",tokens:["→X","O","←X","O"]},
    {name:"CHIRP + BABY",tokens:["C","·","→","←"]},
    {name:"STAB / CHIRP",tokens:["S","·","C","C"]}
  ],
  advanced:[
    {name:"TRANSFORM BURST",tokens:["→X","OX","←X","OX"]},
    {name:"CHIRP / TRANSFORM",tokens:["C","→X","O","←X"]},
    {name:"SYNCOPATED STABS",tokens:["S","·","S","C"]},
    {name:"COMBO FLOW",tokens:["C","S","→X","←O"]}
  ]
};
let practicePattern=null,practiceStep=0,practiceTimer=null,practiceCyclesDone=0;

function makePractice(){
  const level=$("practiceLevel").value;
  const sub=Number($("practiceSub").value);
  const bars=Number($("practiceBars").value);
  const base=TECH[level][Math.floor(Math.random()*TECH[level].length)];
  const slotsPerBar=sub===16?16:8;
  const total=slotsPerBar*bars;
  const tokens=[];
  while(tokens.length<total){
    const pattern=[...base.tokens];
    if(level!=="beginner"&&Math.random()<.35) pattern.reverse();
    tokens.push(...pattern);
  }
  practicePattern={name:base.name,tokens:tokens.slice(0,total),sub,bars};
  $("practiceName").textContent=practicePattern.name;
  $("practiceNotation").textContent=practicePattern.tokens.join(" ");
  renderPracticeGrid();
}

function renderPracticeGrid(){
  const box=$("practiceGrid");box.textContent="";
  if(!practicePattern)return;
  practicePattern.tokens.forEach((t,i)=>{
    const s=document.createElement("span");s.textContent=t;s.classList.toggle("now",i===practiceStep);box.appendChild(s);
  });
}

function stopPractice(){
  clearTimeout(practiceTimer);practiceTimer=null;practiceStep=0;practiceCyclesDone=0;renderPracticeGrid();$("practiceCount").textContent="READY";
}

function tickPractice(){
  if(!practicePattern)return;
  renderPracticeGrid();
  const bpm=clamp(Number($("practiceTempo").value)||80,40,220);
  const subdivision=practicePattern.sub;
  const slotsPerBeat=subdivision===16?4:2;
  const ms=60000/bpm/slotsPerBeat;
  $("practiceCount").textContent=`${bpm} BPM PRACTICE • ${practiceCyclesDone+1}/${$("patternCycles").value}`;
  practiceStep++;
  if(practiceStep>=practicePattern.tokens.length){
    practiceStep=0;practiceCyclesDone++;
    const cycles=Number($("patternCycles").value)||4;
    if(practiceCyclesDone>=cycles){
      practiceCyclesDone=0;
      if($("practiceAuto").value==="up"){
        $("practiceTempo").value=clamp(Number($("practiceTempo").value)+2,40,220);
      }
      makePractice();
    }
  }
  practiceTimer=setTimeout(tickPractice,ms);
}

async function startPractice(){
  if(!practicePattern)makePractice();
  if(deckBuffer&&!deckSource)await playDeck();
  stopPractice();tickPractice();
}
