(function(){const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];const B=window.DLBackend;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const family=t=>t?.startsWith('scale_')?'scale':t?.startsWith('parking_')?'parking':['high_wind','weather'].includes(t)?'weather':t;const toast=m=>{const e=$('#map-toast');e.textContent=m;e.hidden=false;$('#route-status').textContent=m;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2800)},loading=x=>$('#map-loading').hidden=!x;
function syncGeneralNavigation(){
 const origin=$('#origin')?.value.trim()||'',destination=$('#destination')?.value.trim()||'',restricted=$('#oversize')?.checked||$('#hazmat')?.checked,start=$('#start-navigation');
 if(!start)return;
 if(origin&&destination&&!restricted){start.href='https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin,destination,travelmode:'driving'});start.hidden=false;start.textContent='Open general navigation';}
 else{start.hidden=true;start.removeAttribute('href');}
}
['origin','destination'].forEach(id=>document.getElementById(id)?.addEventListener('input',syncGeneralNavigation));
['oversize','hazmat'].forEach(id=>document.getElementById(id)?.addEventListener('change',syncGeneralNavigation));
syncGeneralNavigation();
if(!window.L){$('#route-status').textContent='The interactive map could not load. You can still enter an origin and destination and open general navigation below.';$('#calculate-route').disabled=true;return}async function requestJson(url,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(url,{...options,signal:controller.signal});if(!response.ok)throw Error(response.status===429?'The map service is busy. Wait a minute and try again.':'The map service is unavailable. Please try again shortly.');return await response.json()}catch(error){if(error.name==='AbortError')throw Error('The map service timed out. Check your connection and try again.');if(error instanceof TypeError)throw Error('Could not reach the map service. Check your connection or browser blocking settings.');throw error}finally{clearTimeout(timer)}}const map=L.map('truck-map',{zoomControl:false,preferCanvas:true}).setView([39,-98],4);window.DLNavigationMap=map;L.control.zoom({position:'bottomright'}).addTo(map);const base=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map),dark=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,attribution:'© OpenStreetMap © CARTO'});let isDark=false,routeLine,altLine,startMarker,endMarker,currentLocation,currentLocationApproximate=false,reports=[],activeRoute=null,navigationWatch=null,navigationStep=0,lastVoiceStep=-1,lastRerouteAt=0,offRouteHits=0,rerouting=false,wakeLock=null;const groups={parking:L.layerGroup().addTo(map),scales:L.layerGroup().addTo(map),weather:L.layerGroup().addTo(map),events:L.layerGroup().addTo(map)};const ico={parking:'🅿️',scale:'⚖️',weather:'🌦️',crash:'💥',construction:'🚧',hazard:'⚠️'},clr={parking:'#2563eb',scale:'#f59e0b',weather:'#7c3aed',crash:'#dc2626',construction:'#f97316',hazard:'#dc2626'};function markerIcon(t){return L.divIcon({className:'',html:`<div class="commercial-marker" style="background:${clr[t]||'#64748b'}">${ico[t]||'•'}</div>`,iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-17]})}function ahead(){const el=$('#nav-ahead-list');const recent=reports.filter(r=>(!r.expires_at||new Date(r.expires_at)>new Date())).slice(0,6);el.innerHTML=recent.length?recent.map(r=>`<div class="nav-ahead-item"><span>${ico[family(r.report_type)]||'⚠️'}</span><div><strong>${esc(String(r.report_type||'Road report').replace(/_/g,' '))}</strong><small>${esc(r.note||'Driver report')}</small></div><b>${new Date(r.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</b></div>`).join(''):'<div class="nav-ahead-item"><span>🛰️</span><div><strong>No recent located reports</strong><small>Community reports will appear here.</small></div></div>'}async function loadReports(){if(!B?.configured)return;try{reports=await B.list('road_reports',{eq:{status:'active'},limit:200,order:'created_at'});Object.values(groups).forEach(g=>g.clearLayers());reports.filter(r=>(!r.expires_at||new Date(r.expires_at)>new Date())&&r.latitude!=null&&r.longitude!=null).forEach(r=>{const t=family(r.report_type),group=t==='scale'?groups.scales:t==='parking'?groups.parking:t==='weather'?groups.weather:groups.events;L.marker([r.latitude,r.longitude],{icon:markerIcon(t)}).bindPopup(`<strong>${esc(String(r.report_type||'report').replace(/_/g,' '))}</strong><br><small>${esc(r.note||'Driver-submitted report')}</small>`).addTo(group)});ahead()}catch(e){console.debug('Road reports unavailable',e)}}async function geo(q){if(q==='Current location'){if(currentLocation){const p=currentLocation.getLatLng();return{lat:p.lat,lng:p.lng,label:q}}throw Error('Current location is unavailable. Allow location access or type your starting address.')}const d=await requestJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`,{headers:{'Accept-Language':'en-US'}});if(!d[0])throw Error(`Could not find ${q}`);return{lat:+d[0].lat,lng:+d[0].lon,label:d[0].display_name}}async function routing(a,b){const d=await requestJson(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`);if(!d.routes?.[0])throw Error('No route found');return d.routes}const ft=s=>Math.floor(Math.round(s/60)/60)+'h '+(Math.round(s/60)%60)+'m';function metrics(r){const miles=Math.round(r.distance/1609.344),arr=new Date(Date.now()+r.duration*1000),arrival=arr.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});$('#route-distance').textContent=$('#route-distance-bottom').textContent=`${miles} mi`;$('#route-duration').textContent=ft(r.duration);$('#route-arrival').textContent=$('#route-arrival-bottom').textContent=arrival;const step=r.legs?.[0]?.steps?.find(s=>s.name&&s.distance>50);if(step){$('#next-maneuver').textContent=`${step.maneuver?.instruction||'Continue'} ${step.name?'on '+step.name:''}`.trim();$('#maneuver-distance').textContent=`${Math.max(1,Math.round(step.distance/1609.344))} mi`}}let calculating=false;async function calc(){if(calculating)return;const profileErrors=validateProfile();if(profileErrors.length){$('#profile-editor').hidden=false;toast(profileErrors[0]);return}const o=$('#origin').value.trim(),d=$('#destination').value.trim();if(!o||!d)return toast('Enter origin and destination');calculating=true;stopInAppNavigation('');activeRoute=null;$('#calculate-route').disabled=true;loading(true);$('#start-navigation').hidden=true;$('#in-app-navigation').hidden=true;$('#route-status').textContent='Finding places and building your route preview…';try{const a=await geo(o);await new Promise(resolve=>setTimeout(resolve,1100));const b=await geo(d),rs=await routing(a,b),r=rs[0];[routeLine,altLine,startMarker,endMarker].forEach(x=>x&&map.removeLayer(x));if(rs[1])altLine=L.geoJSON(rs[1].geometry,{style:{color:'#2c7df6',weight:5,opacity:.55,dashArray:'8 10'}}).addTo(map);routeLine=L.geoJSON(r.geometry,{style:{color:'#20c67a',weight:7,opacity:.95}}).addTo(map);startMarker=L.circleMarker([a.lat,a.lng],{radius:8,color:'#fff',weight:3,fillColor:'#2c7df6',fillOpacity:1}).addTo(map);endMarker=L.circleMarker([b.lat,b.lng],{radius:8,color:'#fff',weight:3,fillColor:'#f7b816',fillOpacity:1}).addTo(map);map.fitBounds(routeLine.getBounds(),{padding:[45,45]});metrics(r);activeRoute=r;navigationStep=0;const restricted=$('#oversize').checked||$('#hazmat').checked,start=$('#start-navigation'),inApp=$('#in-app-navigation'),params=new URLSearchParams({api:'1',origin:o,destination:d,travelmode:'driving'});start.href='https://www.google.com/maps/dir/?'+params;start.hidden=restricted;inApp.hidden=restricted;try{localStorage.setItem('dl-v5-route',JSON.stringify({origin:o,destination:d,distance:r.distance,duration:r.duration,savedAt:new Date().toISOString()}))}catch(_){}$('#ai-recommendation').textContent=advice();toast($('#oversize').checked||$('#hazmat').checked?'General preview only — approved commercial route required':'Route preview ready — commercial restrictions are not applied')}catch(e){toast(e.message)}finally{loading(false);calculating=false;$('#calculate-route').disabled=false}}const toRad=n=>n*Math.PI/180;function distanceMeters(a,b){const dLat=toRad(b[0]-a[0]),dLon=toRad(b[1]-a[1]),x=Math.sin(dLat/2)**2+Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dLon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function maneuverLabel(step){const m=step?.maneuver||{},name=step?.name?(' onto '+step.name):'',modifier=m.modifier?m.modifier.replace(/_/g,' '):'';if(m.type==='arrive')return'Arrive at destination';if(m.type==='depart')return'Depart'+name;if(m.type==='roundabout'||m.type==='rotary')return'Enter the roundabout'+name;if(m.type==='merge')return'Merge '+modifier+name;if(m.type==='fork')return'Keep '+modifier+name;if(m.type==='turn')return'Turn '+modifier+name;return'Continue '+modifier+name}
function routeSteps(){return(activeRoute?.legs||[]).flatMap(leg=>leg.steps||[]).filter(step=>step?.maneuver?.location)}
function distanceToActiveRoute(ll){
 const coords=activeRoute?.geometry?.coordinates||[];if(!coords.length)return Infinity;
 const stride=Math.max(1,Math.floor(coords.length/300));let nearest=Infinity;
 for(let i=0;i<coords.length;i+=stride)nearest=Math.min(nearest,distanceMeters(ll,[coords[i][1],coords[i][0]]));
 const last=coords[coords.length-1];return Math.min(nearest,last?distanceMeters(ll,[last[1],last[0]]):Infinity)
}
function voicePrompt(message){
 if(!voice||!message||!('speechSynthesis'in window))return;
 speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.rate=1;utterance.pitch=1;speechSynthesis.speak(utterance)
}
async function acquireWakeLock(){
 if(!('wakeLock'in navigator)||document.visibilityState!=='visible')return;
 try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null})}catch(_){}
}
async function rerouteFromPosition(lat,lng){
 if(rerouting||!activeRoute)return;const coords=activeRoute.geometry?.coordinates||[],destination=coords[coords.length-1];if(!destination)return;
 rerouting=true;lastRerouteAt=Date.now();$('#route-status').textContent='Off route — calculating a new general route…';voicePrompt('Off route. Recalculating.');
 try{
  const routes=await routing({lat,lng,label:'Current GPS location'},{lat:destination[1],lng:destination[0],label:'Destination'}),route=routes[0];
  if(routeLine)map.removeLayer(routeLine);if(altLine){map.removeLayer(altLine);altLine=null}
  routeLine=L.geoJSON(route.geometry,{style:{color:'#20c67a',weight:7,opacity:.95}}).addTo(map);
  activeRoute=route;navigationStep=0;lastVoiceStep=-1;offRouteHits=0;metrics(route);
  $('#route-status').textContent='New general route ready. Truck restrictions are not applied.';voicePrompt('New route ready.')
 }catch(error){$('#route-status').textContent='Automatic reroute failed. Continue safely and plan again when stopped.';toast(error.message)}
 finally{rerouting=false}
}
function updateNavigationPosition(position){
 const lat=position.coords.latitude,lng=position.coords.longitude,ll=[lat,lng],steps=routeSteps(),accuracy=Number(position.coords.accuracy);
 currentLocationApproximate=false;if(currentLocation)map.removeLayer(currentLocation);
 currentLocation=L.circleMarker(ll,{radius:10,color:'#fff',weight:3,fillColor:'#2c7df6',fillOpacity:1}).addTo(map);map.setView(ll,16);
 $('#speed-value').textContent=Number.isFinite(position.coords.speed)?Math.max(0,Math.round(position.coords.speed*2.23694)):'—';
 const deviation=distanceToActiveRoute(ll);
 if(deviation>180)offRouteHits++;else offRouteHits=0;
 if(offRouteHits>=3&&!rerouting&&Date.now()-lastRerouteAt>120000){offRouteHits=0;void rerouteFromPosition(lat,lng);return}
 while(navigationStep<steps.length-1&&distanceMeters(ll,[steps[navigationStep].maneuver.location[1],steps[navigationStep].maneuver.location[0]])<70)navigationStep++;
 const step=steps[navigationStep];if(!step)return;
 const distance=distanceMeters(ll,[step.maneuver.location[1],step.maneuver.location[0]]),label=maneuverLabel(step),accuracyFeet=Number.isFinite(accuracy)?Math.round(accuracy*3.28084):null;
 $('#next-maneuver').textContent=label;$('#maneuver-distance').textContent=distance<305?Math.max(1,Math.round(distance*3.28084))+' ft':(distance/1609.344).toFixed(1)+' mi';
 $('#route-status').textContent='In-app general navigation active · '+label+(accuracyFeet?' · GPS ±'+accuracyFeet+' ft':'');
 if(lastVoiceStep!==navigationStep){lastVoiceStep=navigationStep;voicePrompt(label)}
}
function stopInAppNavigation(message='Navigation stopped.'){if(navigationWatch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(navigationWatch);navigationWatch=null;navigationStep=0;lastVoiceStep=-1;offRouteHits=0;if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null}if('speechSynthesis'in window)speechSynthesis.cancel();document.body.classList.remove('in-app-navigating');const button=$('#in-app-navigation');if(button){button.textContent='Start in-app navigation';button.classList.remove('active')}if(message)$('#route-status').textContent=message}
function startInAppNavigation(){if(navigationWatch!==null){stopInAppNavigation();return}if($('#oversize').checked||$('#hazmat').checked){toast('In-app general navigation is disabled for oversize or hazmat loads. Use an approved commercial route.');return}if(!activeRoute){toast('Plan a route preview first.');return}if(!navigator.geolocation){toast('This browser does not provide location tracking.');return}const button=$('#in-app-navigation');button.textContent='Stop in-app navigation';button.classList.add('active');document.body.classList.add('in-app-navigating');navigationStep=0;lastVoiceStep=-1;offRouteHits=0;void acquireWakeLock();$('#route-status').textContent='Starting GPS navigation…';voicePrompt('Starting navigation.');navigationWatch=navigator.geolocation.watchPosition(updateNavigationPosition,error=>{const reason=error.code===1?'Location permission is blocked. Allow location for Drivers Lounge in your browser settings.':'Live GPS is unavailable on this device. Use a phone with Location Services enabled, or continue with the route preview.';stopInAppNavigation(reason);toast(reason)},{enableHighAccuracy:true,maximumAge:3000,timeout:15000})}
$('#in-app-navigation')?.addEventListener('click',startInAppNavigation);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigationWatch!==null&&!wakeLock)void acquireWakeLock()});
function browserPosition(options){return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,options))}
function showPlanningLocation(latitude,longitude,{approximate=false,speed=null}={}){
 const ll=[latitude,longitude];currentLocationApproximate=approximate;
 if(currentLocation)map.removeLayer(currentLocation);
 currentLocation=L.circleMarker(ll,{radius:approximate?14:10,color:'#fff',weight:3,fillColor:approximate?'#f59e0b':'#2c7df6',fillOpacity:approximate?.75:1,dashArray:approximate?'5 4':null}).addTo(map);
 currentLocation.bindPopup(approximate?'Approximate network location — type your exact starting address for better accuracy.':'Current GPS location');
 map.setView(ll,approximate?10:13);
 $('#speed-value').textContent=Number.isFinite(speed)?Math.max(0,Math.round(speed*2.23694)):'—';
 return true
}
async function approximateNetworkLocation(){
 try{
  const response=await fetch('/api/location-fallback',{headers:{Accept:'application/json'},cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok||!Number.isFinite(Number(data.latitude))||!Number.isFinite(Number(data.longitude)))return false;
  showPlanningLocation(Number(data.latitude),Number(data.longitude),{approximate:true});
  const place=[data.city,data.region].filter(Boolean).join(', ');
  $('#route-status').textContent='Approximate starting area found'+(place?' near '+place:'')+'. Type your exact origin for a more accurate route.';
  toast('Using an approximate network location for planning. Live guidance still needs GPS.');
  return true
 }catch(_){return false}
}
async function locate(){
 if(navigator.geolocation){
  try{
   const precise=await browserPosition({enableHighAccuracy:true,timeout:12000,maximumAge:60000});
   showPlanningLocation(precise.coords.latitude,precise.coords.longitude,{speed:precise.coords.speed});
   $('#route-status').textContent='Precise current location found.';
   toast('Current GPS location found');
   return true
  }catch(firstError){
   if(firstError?.code===1){toast('Location permission is blocked. Allow it in the browser and operating-system settings.');return false}
   try{
    const nearby=await browserPosition({enableHighAccuracy:false,timeout:20000,maximumAge:300000});
    showPlanningLocation(nearby.coords.latitude,nearby.coords.longitude,{speed:nearby.coords.speed});
    $('#route-status').textContent='Current Wi-Fi location found.';
    toast('Current location found using Wi-Fi');
    return true
   }catch(secondError){
    if(secondError?.code===1){toast('Location permission is blocked. Allow it in the browser and operating-system settings.');return false}
   }
  }
 }
 if(await approximateNetworkLocation())return true;
 $('#route-status').textContent='This device could not provide a location. Type your starting address.';
 toast('Location is unavailable on this device. Enter an origin instead.');
 return false
}$('#calculate-route').onclick=calc;['origin','destination'].forEach(id=>document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void calc()}}));$('#swap-route').onclick=()=>{const o=$('#origin'),d=$('#destination'),v=o.value;o.value=d.value;d.value=v};$('#use-location').onclick=async()=>{if(await locate()){$('#origin').value='Current location';syncGeneralNavigation()}};$('#locate-map').onclick=locate;$('#recenter-truck').onclick=()=>currentLocation?map.setView(currentLocation.getLatLng(),12):locate();$('#fit-route').onclick=()=>routeLine?map.fitBounds(routeLine.getBounds(),{padding:[40,40]}):map.setView([39,-98],4);$$('[data-layer]').forEach(b=>b.onclick=()=>{const key=b.dataset.layer;const g=groups[key];if(!g)return;b.classList.toggle('active');map.hasLayer(g)?map.removeLayer(g):g.addTo(map)});$$('[data-quick]').forEach(b=>b.onclick=()=>{location.href=({parking:'/parking',fuel:'/fuel',scales:'/road-tools',weather:'/weather'})[b.dataset.quick]});$('#profile-toggle').onclick=()=>$('#profile-editor').hidden=!$('#profile-editor').hidden;$('#collapse-trip').onclick=()=>$('#trip-panel').classList.toggle('closed');$('#collapse-copilot').onclick=()=>$('#copilot-panel').classList.toggle('closed');$('#theme-toggle').onclick=e=>{isDark=!isDark;if(isDark){map.removeLayer(base);dark.addTo(map)}else{map.removeLayer(dark);base.addTo(map)}e.currentTarget.classList.toggle('active',isDark)};let voice=true;$('#voice-toggle')&&($('#voice-toggle').onclick=e=>{voice=!voice;e.currentTarget.classList.toggle('active',voice);toast(`Voice alerts ${voice?'on':'off'}`)});const advice=()=>{const errors=validateProfile();if(errors.length)return errors.join(' ');if($('#oversize').checked)return'Oversize/overweight load selected. This general preview is not a permitted route. Do not operate until the issuing authorities approve the route and permits are in the cab.';if($('#hazmat').checked)return'Hazmat Class '+$('#hazmat-class').value+' selected'+($('#hazmat-un').value?' ('+$('#hazmat-un').value.toUpperCase()+')':'')+'. This general preview does not apply hazmat restrictions. Use an approved hazmat route before travel.';return'Truck profile saved. This preview does not yet apply commercial restrictions. Verify clearances, weights, lengths, truck restrictions and posted signs.'};$('#refresh-advice').onclick=()=>{$('#ai-recommendation').textContent=advice();toast('Planning guidance refreshed')};$('#speak-advice').onclick=()=>{'speechSynthesis'in window?(speechSynthesis.cancel(),speechSynthesis.speak(new SpeechSynthesisUtterance(advice()))):toast('Voice unavailable')};try{const s=JSON.parse(localStorage.getItem('dl-v5-route')||'null');if(s){$('#origin').value=s.origin;$('#destination').value=s.destination}}catch(_){}const profileFields=['vehicle-preset','truck-height-ft','truck-height-in','truck-width-ft','truck-width-in','truck-length','trailer-length','truck-weight','truck-axles','kingpin-rear-axle','trailer-type','oversize','load-reference','load-commodity','load-height','load-width','load-length','load-weight','axle-weights','hazmat','hazmat-class','hazmat-un','avoid-tolls','national-network'];
const numberValue=id=>{const value=Number(document.getElementById(id).value);return Number.isFinite(value)?value:null};
function validateProfile(){
 const errors=[],heightIn=numberValue('truck-height-ft')*12+numberValue('truck-height-in'),widthIn=numberValue('truck-width-ft')*12+numberValue('truck-width-in');
 if(!Number.isFinite(heightIn)||heightIn<48||heightIn>240)errors.push('Enter a valid overall height.');
 if(!Number.isFinite(widthIn)||widthIn<48||widthIn>240)errors.push('Enter a valid overall width.');
 for(const [id,label] of [['truck-length','overall length'],['truck-weight','gross weight'],['truck-axles','axle count']])if(!numberValue(id))errors.push('Enter '+label+'.');
 if($('#oversize').checked)for(const [id,label] of [['load-height','loaded height'],['load-width','loaded width'],['load-length','loaded length'],['load-weight','loaded gross weight']])if(!numberValue(id))errors.push('Enter '+label+' for permit routing.');
 if($('#hazmat').checked&&!$('#hazmat-class').value)errors.push('Select the hazmat class.');
 return errors;
}
function profileSummary(){
 const feet=$('#truck-height-ft').value||'—',inches=$('#truck-height-in').value||'0',widthFeet=$('#truck-width-ft').value||'—',widthIn=$('#truck-width-in').value||'0',weight=Number($('#truck-weight').value||0).toLocaleString();
 $('#profile-summary-text').textContent=`${feet} ft ${inches} in · ${widthFeet} ft ${widthIn} in · ${weight} lb${$('#oversize').checked?' · OS/OW':''}${$('#hazmat').checked?' · Hazmat '+($('#hazmat-class').value||'class required'):''}`;
 $('#oversize-fields').hidden=!$('#oversize').checked;$('#hazmat-fields').hidden=!$('#hazmat').checked;
 const errors=validateProfile();$('#profile-status').textContent=errors.length?errors.join(' '):'Profile saved. Commercial routing connection required before these restrictions can be applied.';$('#profile-status').dataset.bad=errors.length?'1':'0';
}
function saveProfile(){try{localStorage.setItem('dl-truck-profile',JSON.stringify(Object.fromEntries(profileFields.map(key=>{const el=document.getElementById(key);return[key,el.type==='checkbox'?el.checked:el.value]}))))}catch(_){toast('Truck profile could not be saved on this device.')}profileSummary()}
function applyPreset(name){
 const presets={
  'standard-semi':{'truck-height-ft':13,'truck-height-in':6,'truck-width-ft':8,'truck-width-in':6,'truck-length':72,'trailer-length':53,'truck-weight':80000,'truck-axles':5,'trailer-type':'semi-53'},
  'straight-truck':{'truck-height-ft':13,'truck-height-in':6,'truck-width-ft':8,'truck-width-in':6,'truck-length':40,'trailer-length':0,'truck-weight':33000,'truck-axles':3,'trailer-type':'none'},
  hotshot:{'truck-height-ft':11,'truck-height-in':6,'truck-width-ft':8,'truck-width-in':6,'truck-length':65,'trailer-length':40,'truck-weight':40000,'truck-axles':5,'trailer-type':'hotshot'}
 };
 const preset=presets[name];if(!preset)return;for(const [id,value] of Object.entries(preset))document.getElementById(id).value=value;saveProfile();
}
try{const saved=JSON.parse(localStorage.getItem('dl-truck-profile')||'{}');profileFields.forEach(id=>{const el=document.getElementById(id);if(el&&id in saved){if(el.type==='checkbox')el.checked=Boolean(saved[id]);else el.value=saved[id]}})}catch(_){}
profileFields.forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{if(id==='vehicle-preset'&&$('#vehicle-preset').value!=='custom')applyPreset($('#vehicle-preset').value);else saveProfile()}));
profileSummary();
loadReports();setTimeout(()=>map.invalidateSize(),200)})();