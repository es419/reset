const CACHE='reset90-v40';
const ASSETS=['./index.html','./styles.css?v=32','./cloud.js?v=34','./app.js?v=40','./manifest.webmanifest','./icons/icon-192.png?v=7','./icons/icon-512.png?v=7'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

async function staleWhileRevalidate(request,fallbackUrl){
  const cached=await caches.match(request);
  const refresh=fetch(request,{cache:'no-cache'}).then(async response=>{
    if(response&&response.ok){
      const cache=await caches.open(CACHE);
      cache.put(request,response.clone()).catch(()=>{});
    }
    return response;
  }).catch(()=>null);
  if(cached){refresh.catch(()=>{});return cached}
  const response=await refresh;
  if(response)return response;
  if(fallbackUrl){const fallback=await caches.match(fallbackUrl);if(fallback)return fallback}
  throw new Error('offline');
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(staleWhileRevalidate(request,'./index.html'));
    return;
  }

  if(request.destination==='script'||request.destination==='style'){
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>cached||fetch(request).then(response=>{
      if(response&&response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
      }
      return response;
    }))
  );
});
