
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const toast=(msg)=>{const el=$('#map-toast'); if(!el)return; el.textContent=msg; el.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>el.hidden=true,2800)};
const loading=(on)=>{const el=$('#map-loading'); if(el)el.hidden=!on};
const map=L.map('truck-map',{zoomControl:false}).setView([33.6,-97.1],7);
L.control.zoom({position:'bottomright'}).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);

let routeLine, startMarker, endMarker, currentLocation;
const groups={scales:L.layerGroup().addTo(map),parking:L.layerGroup().addTo(map),fuel:L.layerGroup().addTo(map),weather:L.layerGroup().addTo(map),restrictions:L.layerGroup().addTo(map),repairs:L.layerGroup()};
const markerData=[
 {type:'scales',lat:33.77,lng:-97.14,title:'I-35 Gainesville Inspection Station',detail:'Likely open · 90% confidence'},
 {type:'parking',lat:33.63,lng:-97.16,title:"Love's Travel Stop",detail:'23 spaces reported'},
 {type:'fuel',lat:34.17,lng:-97.14,title:'Pilot Travel Center',detail:'Diesel $3.49'},
 {type:'weather',lat:34.51,lng:-97.02,title:'Crosswind advisory',detail:'Gusts up to 35 mph'},
 {type:'restrictions',lat:34.83,lng:-97.24,title:'Construction restriction',detail:'Right lane closed'},
 {type:'parking',lat:34.64,lng:-97.16,title:'Ardmore overnight parking',detail:'Likely open'},
 {type:'scales',lat:35.14,lng:-97.49,title:'I-35 Norman scale',detail:'Status unknown'},
 {type:'fuel',lat:35.23,lng:-97.48,title:'TA Express',detail:'Diesel $3.55'},
 {type:'repairs',lat:34.29,lng:-97.13,title:'Mobile diesel repair',detail:'24-hour callout'}
];
const colors={scales:'#f59e0b',parking:'#2563eb',fuel:'#16a34a',weather:'#7c3aed',restrictions:'#dc2626',repairs:'#64748b'};
const icons={scales:'⚖️',parking:'🅿️',fuel:'⛽',weather:'🌦️',restrictions:'⚠️',repairs:'🔧'};
function icon(type){return L.divIcon({className:'',html:`<div class="commercial-marker marker-${type}">${icons[type]}</div>`,iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-18]})}
markerData.forEach(x=>L.marker([x.lat,x.lng],{icon:icon(x.type)}).bindPopup(`<strong>${x.title}</strong><br><small>${x.detail}</small>`).addTo(groups[x.type]));

async function geocode(q){
 const url=`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
 const res=await fetch(url,{headers:{'Accept-Language':'en-US'}});
 if(!res.ok)throw new Error('Location lookup failed');
 const data=await res.json(); if(!data[0])throw new Error(`Could not find ${q}`);
 return {lat:+data[0].lat,lng:+data[0].lon,label:data[0].display_name};
}
async function route(a,b){
 const url=`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=true`;
 const res=await fetch(url); if(!res.ok)throw new Error('Routing service unavailable');
 const data=await res.json(); if(!data.routes||!data.routes[0])throw new Error('No route found');
 return data.routes[0];
}
function formatDuration(seconds){const h=Math.floor(seconds/3600),m=Math.round((seconds%3600)/60);return `${h}h ${m}m`}
function updateSummary(r){
 const miles=r.distance/1609.344, duration=r.duration;
 $('#route-distance').textContent=`${Math.round(miles)} mi`;
 $('#route-duration').textContent=formatDuration(duration);
 const arrival=new Date(Date.now()+duration*1000);
 $('#route-arrival').textContent=arrival.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
 $('#route-title').textContent=$('#prefer-interstates').checked?'Recommended commercial corridor':'Fastest available corridor';
 const isHaz=$('#load-type').value==='Hazmat', isOver=$('#load-type').value==='Oversize';
 const risk=isOver?62:isHaz?43:24;
 $('#risk-fill').style.width=`${risk}%`;
 $('#risk-fill').style.background=risk>55?'#ef4444':risk>35?'#f97316':'#35c879';
 $('#risk-text').textContent=risk>55?'Elevated restriction risk':risk>35?'Moderate restriction risk':'Low restriction risk';
 $('#route-confidence').textContent=isOver?'68% confidence':isHaz?'78% confidence':'87% confidence';
 $('#route-confidence').className='badge '+(isOver?'red':isHaz?'orange':'green');
}
async function calculate(){
 const oq=$('#origin').value.trim(), dq=$('#destination').value.trim();
 if(!oq||!dq){toast('Enter an origin and destination');return}
 loading(true);
 try{
   const [a,b]=await Promise.all([geocode(oq),geocode(dq)]);
   const r=await route(a,b);
   if(routeLine)map.removeLayer(routeLine); if(startMarker)map.removeLayer(startMarker); if(endMarker)map.removeLayer(endMarker);
   routeLine=L.geoJSON(r.geometry,{style:{color:'#f6b900',weight:7,opacity:.95}}).addTo(map);
   startMarker=L.marker([a.lat,a.lng]).bindPopup(`<strong>Origin</strong><br>${a.label}`).addTo(map);
   endMarker=L.marker([b.lat,b.lng]).bindPopup(`<strong>Destination</strong><br>${b.label}`).addTo(map);
   map.fitBounds(routeLine.getBounds(),{padding:[45,45]});
   updateSummary(r);
   $('#gps-status').textContent='Route ready';
   localStorage.setItem('dl-nav-route',JSON.stringify({origin:oq,destination:dq,ts:Date.now()}));
   toast('Route calculated. Verify official truck restrictions.');
 }catch(err){toast(err.message||'Route calculation failed')}
 finally{loading(false)}
}
$('#calculate-route').addEventListener('click',calculate);
$('#clear-route').addEventListener('click',()=>{if(routeLine)map.removeLayer(routeLine); if(startMarker)map.removeLayer(startMarker); if(endMarker)map.removeLayer(endMarker); routeLine=startMarker=endMarker=null; map.setView([33.6,-97.1],7); toast('Route cleared')});
$('#swap-route').addEventListener('click',()=>{const o=$('#origin'),d=$('#destination'),v=o.value;o.value=d.value;d.value=v});
function locate(){
 if(!navigator.geolocation){toast('Location is not supported in this browser');return}
 $('#gps-status').textContent='Locating…';
 navigator.geolocation.getCurrentPosition(pos=>{
   const lat=pos.coords.latitude,lng=pos.coords.longitude;
   if(currentLocation)map.removeLayer(currentLocation);
   currentLocation=L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:3,fillColor:'#2d7ff9',fillOpacity:1}).bindPopup('Your current location').addTo(map);
   map.setView([lat,lng],12); $('#gps-status').textContent='GPS located'; toast('Current location found');
 },()=>{$('#gps-status').textContent='GPS permission needed';toast('Allow location access to use GPS')},{enableHighAccuracy:true,timeout:10000});
}
$('#locate-map').addEventListener('click',locate);
$('#use-location').addEventListener('click',()=>{locate();$('#origin').value='Current location';if(currentLocation){const p=currentLocation.getLatLng();$('#origin').dataset.lat=p.lat;$('#origin').dataset.lng=p.lng}});
$('#fit-route').addEventListener('click',()=>{routeLine?map.fitBounds(routeLine.getBounds(),{padding:[40,40]}):map.fitBounds(L.featureGroup(Object.values(groups).flatMap(g=>g.getLayers())).getBounds(),{padding:[30,30]})});
$$('[data-layer]').forEach(c=>c.addEventListener('change',()=>{const g=groups[c.dataset.layer];c.checked?g.addTo(map):map.removeLayer(g)}));
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{$$('[data-mode]').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(b.dataset.mode==='nearby')map.setZoom(Math.max(map.getZoom(),9));if(b.dataset.mode==='alerts')toast('Showing weather and restriction alerts')}));
$$('[data-accordion]').forEach(b=>b.addEventListener('click',()=>{const c=$('#'+b.dataset.accordion),open=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!open));c.hidden=open}));
$('#refresh-advice').addEventListener('click',()=>{
 const advice=$('#ai-recommendation'),load=$('#load-type').value;
 const options={
  'General freight':'I-35 remains the best balance of drive time, fuel and services. Reserve parking near Ardmore before the evening rush.',
  'Hazmat':'Review hazmat tunnel and urban restrictions before departure. Keep the I-35 corridor and verify every inspection station.',
  'Oversize':'Permit verification is required. Avoid urban shortcuts and confirm bridge clearances and construction widths before travel.',
  'RV / Power only':'I-35 offers the strongest service coverage. Check crosswinds and reserve pull-through parking ahead.'
 };
 advice.textContent=options[load];toast('Recommendation refreshed');
});
window.addEventListener('online',()=>{$('#network-status').textContent='Online map';toast('Connection restored')});
window.addEventListener('offline',()=>{$('#network-status').textContent='Offline cache';toast('Offline mode: cached map content only')});
const saved=JSON.parse(localStorage.getItem('dl-nav-route')||'null');if(saved){$('#origin').value=saved.origin;$('#destination').value=saved.destination}
setTimeout(()=>map.invalidateSize(),150);
})();
