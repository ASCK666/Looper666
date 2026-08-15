"use strict";

// DEV KILL SWITCH.
// GitHub Pages is currently used for rapid UI iteration, so stale offline
// caches are more harmful than useful. This worker removes Scratch Practice
// caches and unregisters itself as soon as it becomes active.
self.addEventListener("install",event=>{
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("scratch-practice-")).map(key=>caches.delete(key)));
    await self.registration.unregister();
    const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of clients){
      client.postMessage({type:"SCRATCH_PRACTICE_SW_RETIRED"});
    }
  })());
});

// Do not intercept requests while retiring. Everything comes directly from
// GitHub Pages/network in development mode.
