const CACHE='drivers-lounge-routing-first-v1';
const ROUTING_SHELL=['/navigation','/assets/routing/routing.css','/assets/routing/app.mjs','/assets/routing/core.mjs'];
const PERMIT_SHELL=['/permitted-loads','/assets/permits/permit-trip.css','/assets/permits/app.mjs','/assets/permits/core.mjs','/assets/permits/drafts.mjs','/assets/permits/walkthrough.mjs','/assets/permits/hazmat.mjs','/assets/permits/hazmat-ui.mjs','/assets/permits/hazmat-sources.mjs','/assets/permits/import.mjs','/assets/permits/provider.mjs','/assets/permits/qr-scan.mjs','/assets/permits/qr-worker.mjs','/assets/permits/storage.mjs','/assets/permits/examples.mjs','/assets/permits/crew.mjs','/assets/permits/launch.mjs','/assets/vendor/jsQR-1.4.0.js','/assets/backend.js'];
const REFERENCE_SHELL=['/compliance','/assets/compliance/reference.css','/assets/compliance/app.mjs','/assets/compliance/core.mjs','/assets/compliance/glossary.mjs','/assets/compliance/rules.mjs','/assets/compliance/sources.mjs','/assets/compliance/states.mjs'];
const DRIVER_SHELL=['/start','/assets/driver/driver.css','/assets/driver/model.mjs','/assets/driver/app.mjs'];
const SHELL=['/offline','/manifest.webmanifest','/assets/drivers-lounge-logo.png','/assets/rc1-design-system.css',...ROUTING_SHELL,...PERMIT_SHELL,...REFERENCE_SHELL,...DRIVER_SHELL];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('drivers-lounge-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));

self.addEventListener('message',event=>{
 if(!['reference-cache-status','driver-cache-status','routing-cache-status'].includes(event.data?.type)||!event.ports?.[0])return;
 const routing=event.data.type==='routing-cache-status',driver=event.data.type==='driver-cache-status';
 const key=routing?'routingReady':driver?'driverReady':'referenceReady';
 const paths=routing?ROUTING_SHELL:driver?[...DRIVER_SHELL,...ROUTING_SHELL,...PERMIT_SHELL,...REFERENCE_SHELL]:REFERENCE_SHELL;
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  const entries=await Promise.all(paths.map(path=>cache.match(path)));
  event.ports[0].postMessage({[key]:entries.every(Boolean)});
 }).catch(()=>event.ports[0].postMessage({[key]:false})));
});

self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==location.origin||url.pathname==='/config.js'||url.pathname.startsWith('/api/'))return;
 // The route-planning shell is cached for recovery and parked review. Provider responses,
 // route calculations, private account data, crew data and map tiles are never cached here.
 if(event.request.mode==='navigate'){
  const page=['/navigation','/navigation.html'].includes(url.pathname)&&!url.search?'/navigation':
   ['/compliance','/compliance.html'].includes(url.pathname)?'/compliance':
   ['/permitted-loads','/permitted-loads.html'].includes(url.pathname)&&!url.search?'/permitted-loads':
   ['/start','/start.html'].includes(url.pathname)&&!url.search?'/start':null;
  if(page){
   event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(page,copy)))}
    return response;
   }).catch(()=>caches.match(page).then(response=>response||caches.match('/offline'))));return;
  }
  event.respondWith(fetch(event.request).catch(()=>caches.match('/offline')));return;
 }
 if(!['style','script','worker','image','font','manifest'].includes(event.request.destination))return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok&&url.origin===location.origin){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}
  return response;
 }).catch(()=>caches.match(event.request)));
});
