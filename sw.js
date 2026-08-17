"use strict";

// Development kill switch: GitHub Pages is still changing quickly, so stale
// offline caches are more dangerous than useful. Retire any existing Scratch
// Practice service worker, remove its caches, and reload controlled pages once
// so they come back from the network with one coherent build.
self.addEventListener("install",event=>{
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(
      keys
        .filter(key=>key.startsWith("scratch-practice-"))
        .map(key=>caches.delete(key))
    );

    await self.registration.unregister();

    const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    await Promise.all(clients.map(async client=>{
      try{
        await client.navigate(client.url);
      }catch(error){
        console.warn("Scratch Practice reload after SW retirement failed:",error);
      }
    }));
  })());
});

// Intentionally no fetch handler: every request goes directly to the network.
