const CACHE='drivers-lounge-rc2-scan-intake-20261016';
const PERMIT_SHELL=['/permitted-loads','/assets/permits/permit-trip.css','/assets/permits/app.mjs','/assets/permits/core.mjs','/assets/permits/drafts.mjs','/assets/permits/walkthrough.mjs','/assets/permits/hazmat.mjs','/assets/permits/hazmat-ui.mjs','/assets/permits/hazmat-sources.mjs','/assets/permits/import.mjs','/assets/permits/intake.mjs','/assets/permits/qr-flow.mjs','/assets/permits/provider.mjs','/assets/permits/qr-scan.mjs','/assets/permits/qr-worker.mjs','/assets/permits/storage.mjs','/assets/permits/examples.mjs','/assets/permits/crew.mjs','/assets/vendor/jsQR-1.4.0.js','/assets/backend.js'];
PERMIT_SHELL.push('/assets/truck-setup-account.mjs','/assets/truck-setup-sync.mjs','/assets/truck-setup-account.css','/assets/truck-setup-memory.js','/assets/permits/saved-setup.mjs','/assets/permits/gps-watch.mjs','/assets/permits/route-sketch.mjs','/assets/permits/route-coverage.mjs');
PERMIT_SHELL.push('/assets/permits/pdf-scan.mjs','/assets/permits/map-review.mjs','/assets/permits/map-review-ui.mjs','/assets/vendor/leaflet-1.9.4/leaflet.js','/assets/vendor/leaflet-1.9.4/leaflet.css','/assets/vendor/pdfjs-6.4.299/pdf.min.mjs','/assets/vendor/pdfjs-6.4.299/pdf.worker.min.mjs');
PERMIT_SHELL.push("/assets/permits/pdf-route-review.mjs","/assets/permits/pdf-route-review-ui.mjs","/assets/permits/road-evidence.mjs","/assets/permits/road-evidence-ui.mjs");
PERMIT_SHELL.push('/assets/permits/document-intake.mjs');
const REFERENCE_SHELL=['/compliance','/assets/compliance/reference.css','/assets/compliance/app.mjs','/assets/compliance/core.mjs','/assets/compliance/glossary.mjs','/assets/compliance/rules.mjs','/assets/compliance/sources.mjs','/assets/compliance/states.mjs'];
PERMIT_SHELL.push('/assets/permits/launch.mjs','/assets/permits/preparation.mjs','/assets/permits/guidance.mjs','/assets/trip-preparation.js');
PERMIT_SHELL.push('/permit-phone-check','/assets/permits/speech.mjs','/assets/permits/phone-check.mjs','/assets/permits/phone-check-core.mjs','/assets/permits/phone-check.css');
const DRIVER_SHELL=['/start','/assets/driver/driver.css','/assets/driver/model.mjs','/assets/driver/app.mjs'];
const SHELL=['/offline','/manifest.webmanifest','/assets/drivers-lounge-logo.png','/assets/rc1-design-system.css',...PERMIT_SHELL,...REFERENCE_SHELL,...DRIVER_SHELL];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('drivers-lounge-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{
 if(!['reference-cache-status','driver-cache-status'].includes(event.data?.type)||!event.ports?.[0])return;
 const driver=event.data.type==='driver-cache-status',key=driver?'driverReady':'referenceReady',paths=driver?[...DRIVER_SHELL,...PERMIT_SHELL,...REFERENCE_SHELL]:REFERENCE_SHELL;
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  const entries=await Promise.all(paths.map(path=>cache.match(path)));
  event.ports[0].postMessage({[key]:entries.every(Boolean)});
 }).catch(()=>event.ports[0].postMessage({[key]:false})));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==location.origin||url.pathname==='/config.js'||url.pathname.startsWith('/api/'))return;
 // Only the public reference and static permit shells are cached as pages. Private permits use the device wallet.
 // Never cache account pages, callback URLs, API responses or remote crew data.
 if(event.request.mode==='navigate'){
  const page=['/permit-phone-check','/permit-phone-check.html'].includes(url.pathname)&&!url.search?'/permit-phone-check':['/compliance','/compliance.html'].includes(url.pathname)?'/compliance':(['/permitted-loads','/permitted-loads.html'].includes(url.pathname)&&!url.search?'/permitted-loads':(['/start','/start.html'].includes(url.pathname)&&!url.search?'/start':null));
  if(page){
   event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(page,copy)))}return response}).catch(()=>caches.match(page)));return;
  }
  event.respondWith(fetch(event.request).catch(()=>caches.match('/offline')));return;
 }
 if(!['style','script','worker','image','font','manifest'].includes(event.request.destination))return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)))}
  return response;
 }).catch(()=>caches.match(event.request)));
});
