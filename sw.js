<<<<<<< HEAD
const CACHE='reset90-v40';
const ASSETS=['./index.html','./styles.css?v=32','./cloud.js?v=34','./app.js?v=40','./manifest.webmanifest','./icons/icon-192.png?v=7','./icons/icon-512.png?v=7'];
=======
const CACHE='reset90-v39';
const ASSETS=['./index.html','./styles.css?v=31','./cloud.js?v=33','./app.js?v=39','./manifest.webmanifest','./icons/icon-192.png?v=7','./icons/icon-512.png?v=7'];
>>>>>>> 81e830edc515e27ae3704d2211598f8768f84717

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

<<<<<<< HEAD
async function staleWhileRevalidate(request,fallbackUrl){
  const cached=await caches.match(request);
  const refresh=fetch(request,{cache:'no-cache'}).then(async response=>{
=======
async function networkFirst(request,fallbackUrl){
  try{
    const response=await fetch(request,{cache:'no-store'});
>>>>>>> 81e830edc515e27ae3704d2211598f8768f84717
    if(response&&response.ok){
      const cache=await caches.open(CACHE);
      cache.put(request,response.clone()).catch(()=>{});
    }
    return response;
<<<<<<< HEAD
  }).catch(()=>null);
  if(cached){refresh.catch(()=>{});return cached}
  const response=await refresh;
  if(response)return response;
  if(fallbackUrl){const fallback=await caches.match(fallbackUrl);if(fallback)return fallback}
  throw new Error('offline');
=======
  }catch(error){
    const cached=await caches.match(request);
    if(cached)return cached;
    if(fallbackUrl){
      const fallback=await caches.match(fallbackUrl);
      if(fallback)return fallback;
    }
    throw error;
  }
>>>>>>> 81e830edc515e27ae3704d2211598f8768f84717
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
<<<<<<< HEAD
    event.respondWith(staleWhileRevalidate(request,'./index.html'));
=======
    event.respondWith(networkFirst(request,'./index.html'));
>>>>>>> 81e830edc515e27ae3704d2211598f8768f84717
    return;
  }

  if(request.destination==='script'||request.destination==='style'){
<<<<<<< HEAD
    event.respondWith(staleWhileRevalidate(request));
=======
    event.respondWith(networkFirst(request));
>>>>>>> 81e830edc515e27ae3704d2211598f8768f84717
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
