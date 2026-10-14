(function(){const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];const B=window.DLBackend;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const family=t=>t?.startsWith('scale_')?'scale':t?.startsWith('parking_')?'parking':['high_wind','weather'].includes(t)?'weather':t;const toast=m=>{const e=$('#map-toast');e.textContent=m;e.hidden=false;$('#route-status').textContent=m;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2800)},loading=x=>$('#map-loading').hidden=!x;
function syncGeneralNavigation(){const link=document.getElementById('start-navigation');if(link){link.hidden=true;link.removeAttribute('href');}const button=document.getElementById('in-app-navigation');if(button)button.hidden=true;}
['origin','destination'].forEach(id=>document.getElementById(id)?.addEventListener('input',syncGeneralNavigation));
['oversize','hazmat'].forEach(id=>document.getElementById(id)?.addEventListener('change',syncGeneralNavigation));
syncGeneralNavigation();
const planning=window.DLMapPlanningSafety;
if(!window.L||!planning){const status=$('#map-health');if(status)status.textContent='Map unavailable. Reconnect and reload this page.';$('#route-status').textContent='The interactive map could not load. Try again when connected. This tool does not provide validated commercial driving directions.';$('#calculate-route').disabled=true;return}async function requestJson(url,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(url,{...options,signal:controller.signal});if(!response.ok)throw Error(response.status===429?'The map service is busy. Wait a minute and try again.':'The map service is unavailable. Please try again shortly.');return await response.json()}catch(error){if(error.name==='AbortError')throw Error('The map service timed out. Check your connection and try again.');if(error instanceof TypeError)throw Error('Could not reach the map service. Check your connection or browser blocking settings.');throw error}finally{clearTimeout(timer)}}const map=L.map('truck-map',{zoomControl:false,preferCanvas:true}).setView([39,-98],4);window.DLNavigationMap=map;L.control.zoom({position:'bottomright'}).addTo(map);const base=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map),dark=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,attribution:'© OpenStreetMap © CARTO'});let isDark=false,routeLine,altLine,startMarker,endMarker,currentLocation,currentLocationApproximate=false,reports=[],activeRoute=null,navigationWatch=null,navigationStep=0,lastVoiceStep=-1,lastRerouteAt=0,offRouteHits=0,rerouting=false,wakeLock=null;const groups={parking:L.layerGroup().addTo(map),scales:L.layerGroup().addTo(map),weather:L.layerGroup().addTo(map),events:L.layerGroup().addTo(map)};const ico={parking:'🅿️',scale:'⚖️',weather:'🌦️',crash:'💥',construction:'🚧',hazard:'⚠️'},clr={parking:'#2563eb',scale:'#f59e0b',weather:'#7c3aed',crash:'#dc2626',construction:'#f97316',hazard:'#dc2626'};function markerIcon(t){return L.divIcon({className:'',html:`<div class="commercial-marker" style="background:${clr[t]||'#64748b'}">${ico[t]||'•'}</div>`,iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-17]})}function ahead(){const el=$('#nav-ahead-list');const recent=reports.filter(r=>(!r.expires_at||new Date(r.expires_at)>new Date())).slice(0,6);el.innerHTML=recent.length?recent.map(r=>`<div class="nav-ahead-item"><span>${ico[family(r.report_type)]||'⚠️'}</span><div><strong>${esc(String(r.report_type||'Road report').replace(/_/g,' '))}</strong><small>${esc(r.note||'Driver report')}</small></div><b>${new Date(r.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</b></div>`).join(''):'<div class="nav-ahead-item"><span>🛰️</span><div><strong>No recent located reports</strong><small>Community reports will appear here.</small></div></div>'}async function loadReports(){if(!B?.configured)return;try{reports=await B.list('road_reports',{eq:{status:'active'},limit:200,order:'created_at'});Object.values(groups).forEach(g=>g.clearLayers());reports.filter(r=>(!r.expires_at||new Date(r.expires_at)>new Date())&&r.latitude!=null&&r.longitude!=null).forEach(r=>{const t=family(r.report_type),group=t==='scale'?groups.scales:t==='parking'?groups.parking:t==='weather'?groups.weather:groups.events;L.marker([r.latitude,r.longitude],{icon:markerIcon(t)}).bindPopup(`<strong>${esc(String(r.report_type||'report').replace(/_/g,' '))}</strong><br><small>${esc(r.note||'Driver-submitted report')}</small>`).addTo(group)});ahead()}catch(e){console.debug('Road reports unavailable',e)}}async function geo(q){if(q==='Current location'){expireLocation();if(currentLocation&&locationFix&&!currentLocationApproximate){const p=currentLocation.getLatLng();return{lat:p.lat,lng:p.lng,label:q}}throw Error('Current location is unavailable. Allow location access or type your starting address.')}const d=await requestJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`,{headers:{'Accept-Language':'en-US'}});if(!d[0])throw Error(`Could not find ${q}`);return{lat:+d[0].lat,lng:+d[0].lon,label:d[0].display_name}}async function routing(){throw Error('Truck routing is unavailable until current road restrictions are validated. No car-route fallback is provided.')}const ft=s=>Math.floor(Math.round(s/60)/60)+'h '+(Math.round(s/60)%60)+'m';function metrics(r){const miles=Math.round(r.distance/1609.344),arr=new Date(Date.now()+r.duration*1000),arrival=arr.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});$('#route-distance').textContent=$('#route-distance-bottom').textContent=`${miles} mi`;$('#route-duration').textContent=ft(r.duration);$('#route-arrival').textContent=$('#route-arrival-bottom').textContent=arrival;const step=r.legs?.[0]?.steps?.find(s=>s.name&&s.distance>50);if(step){$('#next-maneuver').textContent=`${step.maneuver?.instruction||'Continue'} ${step.name?'on '+step.name:''}`.trim();$('#maneuver-distance').textContent=`${Math.max(1,Math.round(step.distance/1609.344))} mi`}}let calculating=false;async function calc(){stopInAppNavigation('');activeRoute=null;syncGeneralNavigation();showTruckReadiness();toast('Truck routing is unavailable until current road restrictions are validated. No car-route fallback is provided.')}const toRad=n=>n*Math.PI/180;function distanceMeters(a,b){const dLat=toRad(b[0]-a[0]),dLon=toRad(b[1]-a[1]),x=Math.sin(dLat/2)**2+Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dLon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
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
function stopInAppNavigation(message='Navigation stopped.'){if(navigationWatch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(navigationWatch);navigationWatch=null;navigationStep=0;lastVoiceStep=-1;offRouteHits=0;if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null}if('speechSynthesis'in window)speechSynthesis.cancel();document.body.classList.remove('in-app-navigating');const button=$('#in-app-navigation');if(button){button.textContent='Start in-app navigation';button.classList.remove('active')}if(message)$('#route-status').textContent=message}
function startInAppNavigation(){stopInAppNavigation('General routes are planning previews only. Truck restrictions are not validated.');toast('Use the issued-permit workflow and verify current official restrictions.');}
$('#in-app-navigation')?.addEventListener('click',startInAppNavigation);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigationWatch!==null&&!wakeLock)void acquireWakeLock()});
// Map failures remain visible until a deliberate successful retry.
let tileState=navigator.onLine===false?'offline':'loading',tileTimer;
const tileMessages={loading:'Loading map…',ready:'Map shown for planning. Truck restrictions are not verified.',failed:'Map incomplete. Some roads may be missing. Check your connection and retry.',offline:'Offline. The visible map may be incomplete or out of date.',retry:'Connection restored. Retry to refresh the map.'};
function renderMapHealth(){const el=$('#map-health');el.textContent=tileMessages[tileState];el.dataset.state=tileState;const retry=$('#retry-map');retry.hidden=!['failed','offline','retry'].includes(tileState);retry.disabled=tileState==='offline';}
function tileEvent(event){tileState=planning.mapState(tileState,event);clearTimeout(tileTimer);if(tileState==='loading')tileTimer=setTimeout(()=>tileEvent('timeout'),15000);renderMapHealth();}
for(const layer of [base,dark]){layer.on('loading',()=>{if(map.hasLayer(layer))tileEvent('loading')});layer.on('tileerror',()=>{if(map.hasLayer(layer))tileEvent('error')});layer.on('load',()=>{if(map.hasLayer(layer))tileEvent('loaded')});}
window.addEventListener('offline',()=>tileEvent('offline'));
window.addEventListener('online',()=>tileEvent('online'));
$('#retry-map').onclick=()=>{if(navigator.onLine===false)return;tileEvent('retry');(isDark?dark:base).redraw();};
tileEvent(tileState==='offline'?'offline':(base.isLoading()?'loading':'loaded'));
let locationFix=null,accuracyCircle=null,locationTimer,locationBusy=false;
let originRevision=0;
$('#origin').addEventListener('input',()=>{originRevision++;});
async function useCurrentOrigin(){const revision=originRevision;if(await locate()&&originRevision===revision){$('#origin').value='Current location';syncGeneralNavigation();}}
const locationMessage=message=>{$('#location-health').textContent=message;};
function clearPlanningLocation(){
 clearTimeout(locationTimer);locationFix=null;
 if(currentLocation)map.removeLayer(currentLocation);currentLocation=null;
 if(accuracyCircle)map.removeLayer(accuracyCircle);accuracyCircle=null;
 for(const id of ['origin','destination'])if($('#'+id).value==='Current location')$('#'+id).value='';
 $('#speed-value').textContent='—';syncGeneralNavigation();
}
function expireLocation(){
 if(locationFix&&!planning.assessPosition({coords:locationFix,timestamp:locationFix.timestamp}).usable){clearPlanningLocation();locationMessage('Location expired. Use current location again or type your starting address.');}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')expireLocation();});
function browserPosition(options){return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,options))}
function showPlanningLocation(fix,{approximate=false}={}){
 clearPlanningLocation();const ll=[fix.latitude,fix.longitude];currentLocationApproximate=approximate;
 currentLocation=L.circleMarker(ll,{radius:approximate?14:10,color:'#fff',weight:3,fillColor:approximate?'#a66400':'#2c7df6',fillOpacity:.8,dashArray:approximate?'5 4':null}).addTo(map);
 currentLocation.bindPopup(approximate?'Approximate network area. This is not your starting point.':'Device location. The circle shows reported uncertainty, not a verified road or entrance.');
 if(!approximate){locationFix=fix;accuracyCircle=L.circle(ll,{radius:fix.accuracy,color:'#2467e8',weight:1,fillOpacity:.12,interactive:false}).addTo(map);locationTimer=setTimeout(expireLocation,Math.max(1,fix.expiresAt-Date.now()));}
 map.setView(ll,approximate?10:15);
}
async function approximateNetworkLocation(){
 try{
  const data=await requestJson('/api/location-fallback',{headers:{Accept:'application/json'},cache:'no-store'});
  const fix=planning.assessNetwork(data);if(!fix.usable)return false;
  showPlanningLocation(fix,{approximate:true});
  locationMessage('Approximate network area only. Type your exact starting address; this marker cannot be used as an origin.');
  return true;
 }catch(_){return false;}
}
async function locate(){
 if(locationBusy)return false;
 locationBusy=true;clearPlanningLocation();locationMessage('Checking device location…');
 const buttons=[$('#use-location'),$('#locate-map'),$('#recenter-truck')];buttons.forEach(b=>{b.disabled=true;});
 try{
  if(navigator.geolocation){
   // Browsers do not tell us whether a reading came from GPS or Wi-Fi.
   for(const highAccuracy of [true,false]){
    try{
     const position=await browserPosition({enableHighAccuracy:highAccuracy,timeout:12000,maximumAge:0});
     const fix=planning.assessPosition(position);
     if(fix.usable){showPlanningLocation(fix);locationMessage(fix.message);return true;}
     locationMessage(fix.message);
    }catch(error){
     if(error?.code===1){locationMessage('Location permission is blocked. Type your starting address or change your browser settings.');return false;}
    }
   }
  }
  if(await approximateNetworkLocation())return false;
  locationMessage('A recent, accurate device location is unavailable. Type your starting address.');
  return false;
 }finally{locationBusy=false;buttons.forEach(b=>{b.disabled=false;});}
}$('#calculate-route').onclick=calc;['origin','destination'].forEach(id=>document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void calc()}}));$('#swap-route').onclick=()=>{const o=$('#origin'),d=$('#destination'),v=o.value;o.value=d.value;d.value=v};$('#use-location').onclick=useCurrentOrigin;$('#locate-map').onclick=locate;$('#recenter-truck').onclick=()=>{expireLocation();return currentLocation?map.setView(currentLocation.getLatLng(),12):locate()};$('#fit-route').onclick=()=>routeLine?map.fitBounds(routeLine.getBounds(),{padding:[40,40]}):map.setView([39,-98],4);$$('[data-layer]').forEach(b=>b.onclick=()=>{const key=b.dataset.layer;const g=groups[key];if(!g)return;b.classList.toggle('active');map.hasLayer(g)?map.removeLayer(g):g.addTo(map)});$$('[data-quick]').forEach(b=>b.onclick=()=>{location.href=({parking:'/parking',fuel:'/fuel',scales:'/road-tools',weather:'/weather'})[b.dataset.quick]});$('#profile-toggle').onclick=()=>{const editor=$('#profile-editor');editor.hidden=!editor.hidden;$('#profile-toggle').setAttribute('aria-expanded',String(!editor.hidden))};$('#collapse-trip').onclick=()=>$('#trip-panel').classList.toggle('closed');$('#collapse-copilot').onclick=()=>$('#copilot-panel').classList.toggle('closed');$('#theme-toggle').onclick=e=>{isDark=!isDark;if(isDark){map.removeLayer(base);dark.addTo(map)}else{map.removeLayer(dark);base.addTo(map)}e.currentTarget.classList.toggle('active',isDark)};let voice=true;$('#voice-toggle')&&($('#voice-toggle').onclick=e=>{voice=!voice;e.currentTarget.classList.toggle('active',voice);toast(`Voice alerts ${voice?'on':'off'}`)});const advice=()=>{const errors=validateProfile();if(errors.length)return errors.join(' ');if($('#oversize').checked)return'Oversize/overweight load selected. Standard-truck readiness does not authorize a permitted route. Do not operate until the issuing authorities approve the route and permits are in the cab.';if($('#hazmat').checked)return'Hazmat Class '+$('#hazmat-class').value+' selected'+($('#hazmat-un').value?' ('+$('#hazmat-un').value.toUpperCase()+')':'')+'. Standard-truck readiness does not validate hazmat restrictions. Use an approved hazmat route before travel.';return'Truck profile saved. Routing remains unavailable until commercial restrictions are validated. Verify clearances, weights, lengths, truck restrictions and posted signs.'};$('#refresh-advice').onclick=()=>{$('#ai-recommendation').textContent=advice();toast('Planning guidance refreshed')};$('#speak-advice').onclick=()=>{'speechSynthesis'in window?(speechSynthesis.cancel(),speechSynthesis.speak(new SpeechSynthesisUtterance(advice()))):toast('Voice unavailable')};try{const s=JSON.parse(localStorage.getItem('dl-v5-route')||'null');if(s){$('#origin').value=s.origin;$('#destination').value=s.destination}}catch(_){}const profileFields=['vehicle-preset','truck-height-ft','truck-height-in','truck-width-ft','truck-width-in','truck-length','trailer-length','truck-weight','truck-axles','kingpin-rear-axle','trailer-type','oversize','load-reference','load-commodity','load-height','load-width','load-length','load-weight','axle-weights','hazmat','hazmat-class','hazmat-un','avoid-tolls','national-network'];
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
function showTruckReadiness(){
 const engine=window.DLTruckRouteReadiness;
 const target=document.getElementById('truck-readiness-details');
 if(!target)return;
 if(window.DLTruckFirst?.isConfirmed?.()!==true){target.textContent='Confirm the loaded truck details first. Road restrictions have not been verified.';return;}
 const profile={heightIn:numberValue('truck-height-ft')*12+numberValue('truck-height-in'),widthIn:numberValue('truck-width-ft')*12+numberValue('truck-width-in'),lengthFt:numberValue('truck-length'),grossWeightLb:numberValue('truck-weight'),axleCount:numberValue('truck-axles'),oversize:$('#oversize').checked,hazmat:$('#hazmat').checked,confirmed:window.DLTruckFirst?.isConfirmed?.()===true,revision:'draft'};
 const result=engine?.assess({profile});
 target.textContent=result?result.issues.map(issue=>issue.message).join(' '):'Routing checks could not load. Truck guidance remains unavailable.';
}
function profileSummary(){
 const feet=$('#truck-height-ft').value||'—',inches=$('#truck-height-in').value||'0',widthFeet=$('#truck-width-ft').value||'—',widthIn=$('#truck-width-in').value||'0',weight=Number($('#truck-weight').value||0).toLocaleString();
 $('#profile-summary-text').textContent=!$('#truck-height-ft').value||!$('#truck-width-ft').value||!$('#truck-weight').value?'Enter your loaded measurements':`${feet} ft ${inches} in · ${widthFeet} ft ${widthIn} in · ${weight} lb${$('#oversize').checked?' · OS/OW':''}${$('#hazmat').checked?' · Hazmat '+($('#hazmat-class').value||'class required'):''}`;
 $('#oversize-fields').hidden=!$('#oversize').checked;$('#hazmat-fields').hidden=!$('#hazmat').checked;
 const errors=validateProfile();$('#profile-status').textContent=errors.length?errors.join(' '):'Profile saved. Commercial routing connection required before these restrictions can be applied.';$('#profile-status').dataset.bad=errors.length?'1':'0';
}
function saveProfile(){try{localStorage.setItem('dl-truck-profile',JSON.stringify(Object.fromEntries(profileFields.map(key=>{const el=document.getElementById(key);return[key,el.type==='checkbox'?el.checked:el.value]}))))}catch(_){toast('Truck profile could not be saved on this device.')}profileSummary();showTruckReadiness()}
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
profileSummary();showTruckReadiness();
loadReports();setTimeout(()=>map.invalidateSize(),200)})();
