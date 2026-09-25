const CACHE='drivers-lounge-rc2-permit-v5';
const PERMIT_SHELL=['/permitted-loads','/assets/permits/permit-trip.css','/assets/permits/app.mjs','/assets/permits/core.mjs','/assets/permits/hazmat.mjs','/assets/permits/hazmat-ui.mjs','/assets/permits/hazmat-sources.mjs','/assets/permits/import.mjs','/assets/permits/provider.mjs','/assets/permits/qr-scan.mjs','/assets/permits/qr-worker.mjs','/assets/permits/storage.mjs','/assets/permits/examples.mjs','/assets/permits/crew.mjs','/assets/vendor/jsQR-1.4.0.js','/assets/backend.js'];
const SHELL=['/offline','/manifest.webmanifest','/assets/drivers-lounge-logo.png','/assets/rc1-design-system.css',...PERMIT_SHELL];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('drivers-lounge-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==location.origin||url.pathname==='/config.js'||url.pathname.startsWith('/api/'))return;
 // Only the static permit shell is cached as a page. Private permits use the device wallet.
 // Never cache account pages, callback URLs, API responses or remote crew data.
 if(event.request.mode==='navigate'){
  if(['/permitted-loads','/permitted-loads.html'].includes(url.pathname)&&!url.search){
   event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('/permitted-loads',copy)))}return response}).catch(()=>caches.match('/permitted-loads')));return;
  }
  event.respondWith(fetch(event.request).catch(()=>caches.match('/offline')));return;
 }
 if(!['style','script','worker','image','font','manifest'].includes(event.request.destination))return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)))}
  return response;
 }).catch(()=>caches.match(event.request)));
});
