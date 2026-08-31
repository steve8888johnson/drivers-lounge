const CACHE='drivers-lounge-rc2-v2';
const SHELL=['/','/dashboard','/account','/offline','/manifest.webmanifest','/assets/drivers-lounge-logo.png','/assets/rc1-design-system.css','/assets/rc1-design-system.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;
// Never serve cached API/config data that could make road, carrier, load or account information appear current.
if(url.pathname==='/config.js'||url.pathname.startsWith('/api/'))return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(r=>r||caches.match('/offline')||caches.match('/'))));return;}
event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok&&['style','script','image','font','manifest'].includes(event.request.destination)){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}return response;})));});