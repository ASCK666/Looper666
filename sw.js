"use strict";
const CACHE="scratch-practice-v108";
const ASSETS=[
  "./",
  "./index.html",
  "./manifest.json",
  "./css/base.css",
  "./css/looper-polish.css",
  "./css/deck-refactor.css",
  "./css/deck-motion-fix.css",
  "./css/clean-ui.css",
  "./js/bootstrap.js",
  "./js/core.js",
  "./js/looper.js",
  "./js/looper-polish.js",
  "./js/deck-refactor.js",
  "./js/practice.js",
  "./js/chopper.js",
  "./js/drums.js",
  "./js/events.js",
  "./assets/cassette-mechanism-pixel-v95.png",
  "./assets/cassette-mechanism-pixel-v84.png",
  "./assets/cassette-reel-pixel-v81.png",
  "./assets/deck-black-ui-texture.png",
  "./assets/deck-buttons-backlight-idle.png",
  "./assets/deck-button-prev-backlight-active.png",
  "./assets/deck-button-play-backlight-active.png",
  "./assets/deck-button-stop-backlight-active.png",
  "./assets/deck-button-next-backlight-active.png",
  "./assets/deck-button-auto-backlight-active.png",
  "./assets/beats/stack-piano-horns-85-asharp-minor.wav",
  "./assets/beats/violin-piano-92-bflat-minor.wav",
  "./assets/beats/stack-violin-piano-89-c-minor.wav"
];
const STATIC_PATHS=new Set(ASSETS.map(path=>new URL(path,self.location.href).pathname));
const INDEX_URL=new URL("./index.html",self.location.href).href;

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

function networkFirst(request,cacheKey=request){
  return fetch(request).then(response=>{
    if(response.ok && response.type==="basic"){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(cacheKey,copy));
    }
    return response;
  }).catch(()=>caches.match(cacheKey,{ignoreSearch:true}));
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==="navigate"){
    event.respondWith(networkFirst(request,INDEX_URL));
    return;
  }

  if(!STATIC_PATHS.has(url.pathname))return;

  // During active UI development, always ask the network first so a newly
  // deployed CSS/JS/image is visible immediately. Cache remains the offline
  // fallback instead of becoming a stale source of truth.
  event.respondWith(networkFirst(request,request));
});
