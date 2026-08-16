"use strict";

$("practiceOverlayOpen").onclick=()=>$("practice").classList.add("overlayOpen");
$("practiceOverlayClose").onclick=()=>{
  stopPractice();
  $("practice").classList.remove("overlayOpen");
};

$("newPattern").onclick=makePractice;
$("startPractice").onclick=startPractice;
