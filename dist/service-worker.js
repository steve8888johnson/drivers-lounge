
const CACHE='drivers-lounge-v5';
const CORE=['/','/assets/styles.css','/assets/app.js','/assets/navigation.js','/assets/navigation.css','/assets/navigation-v5.js','/assets/navigation-v5.css','/assets/drivers-lounge-logo.png','/road-tools','/navigation','/community'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/'))));
});
