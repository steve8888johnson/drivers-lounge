import{
  distanceMeters,
  nearestGeometryDistance,
  normalizeTruckProfile,
  routeSummary,
  validateTruckProfile
}from'./core.mjs';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const PROFILE_KEY='dl-routing-profile-v1';
const ROUTE_KEY='dl-routing-last-candidate-v1';
const MAX_ROUTE_AGE_MS=60*60*1000;

const state={
  map:null,route:null,origin:null,destination:null,routeLine:null,startMarker:null,endMarker:null,truckMarker:null,
  originCoordinate:null,watchId:null,wakeLock:null,stepIndex:0,lastSpokenStep:-1,lastPromptBand:'',offRouteHits:0,
  guidanceFrozen:false,cumulative:[],latestPosition:null,calculating:false
};

function setStatus(message,tone=''){
  const element=$('#route-status');if(!element)return;element.textContent=message;element.className=`inline-status ${tone}`.trim();
}
function mapMessage(message,tone=''){
  const element=$('#map-message');if(!element)return;element.textContent=message;element.className=`map-message ${tone}`.trim();element.hidden=!message;
}
function setLoading(active){$('#map-loading').hidden=!active;$('#calculate-route').disabled=active;}
function formatMiles(meters,digits=1){const miles=Number(meters||0)/1609.344;return`${miles>=10?Math.round(miles):miles.toFixed(digits)} mi`;}
function formatDuration(seconds){const minutes=Math.max(0,Math.round(Number(seconds||0)/60)),hours=Math.floor(minutes/60),remainder=minutes%60;return hours?`${hours} hr ${remainder} min`:`${remainder} min`;}
function escapeText(value){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();}
function speak(message){
  if(!message||!('speechSynthesis'in window))return;
  speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.rate=.98;utterance.pitch=1;utterance.volume=1;speechSynthesis.speak(utterance);
}
function safeJsonParse(value){try{return JSON.parse(value)}catch{return null}}

const presets={
  'standard-semi':{heightFt:13,heightIn:6,widthFt:8,widthIn:6,overallLengthFt:72,trailerLengthFt:53,grossWeightLb:80000,currentWeightLb:80000,axleCount:5,trailerAxleCount:2,trailerCount:1,singleAxleGroupLb:12000,tandemAxleGroupLb:34000,tripleAxleGroupLb:0},
  'straight-truck':{heightFt:13,heightIn:0,widthFt:8,widthIn:6,overallLengthFt:40,trailerLengthFt:0,grossWeightLb:54000,currentWeightLb:45000,axleCount:3,trailerAxleCount:0,trailerCount:0,singleAxleGroupLb:12000,tandemAxleGroupLb:34000,tripleAxleGroupLb:0},
  hotshot:{heightFt:13,heightIn:6,widthFt:8,widthIn:6,overallLengthFt:65,trailerLengthFt:40,grossWeightLb:40000,currentWeightLb:30000,axleCount:5,trailerAxleCount:2,trailerCount:1,singleAxleGroupLb:12000,tandemAxleGroupLb:20000,tripleAxleGroupLb:0}
};

function readProfileForm(){
 const selectedHazmat=$('#hazmat-enabled').checked?$$('#hazmat-categories option:checked').map(option=>option.value):[];
 return normalizeTruckProfile({
  preset:$('#vehicle-preset').value,
  heightFt:$('#height-ft').value,heightIn:$('#height-in').value,widthFt:$('#width-ft').value,widthIn:$('#width-in').value,
  overallLengthFt:$('#overall-length').value,trailerLengthFt:$('#trailer-length').value,
  grossWeightLb:$('#gross-weight').value,currentWeightLb:$('#current-weight').value,axleCount:$('#axle-count').value,
  trailerAxleCount:$('#trailer-axles').value,trailerCount:$('#trailer-count').value,
  singleAxleGroupLb:$('#single-axle').value,tandemAxleGroupLb:$('#tandem-axle').value,tripleAxleGroupLb:$('#triple-axle').value,
  hazmatCategories:selectedHazmat,tunnelCategory:$('#tunnel-category').value,avoidTolls:$('#avoid-tolls').checked,
  routePreference:$('#route-preference').value,permittedLoad:$('#permitted-load').checked
 });
}
function writeProfileForm(profileInput){
 const profile=normalizeTruckProfile(profileInput),feet=Math.floor(profile.heightInches/12),inches=Math.round(profile.heightInches-feet*12),widthFeet=Math.floor(profile.widthInches/12),widthInches=Math.round(profile.widthInches-widthFeet*12);
 $('#vehicle-preset').value=profile.preset||'custom';$('#height-ft').value=feet||13;$('#height-in').value=inches;$('#width-ft').value=widthFeet||8;$('#width-in').value=widthInches;
 $('#overall-length').value=profile.overallLengthFt||72;$('#trailer-length').value=profile.trailerLengthFt||0;$('#gross-weight').value=profile.grossWeightLb||80000;$('#current-weight').value=profile.currentWeightLb||profile.grossWeightLb||80000;
 $('#axle-count').value=profile.axleCount||5;$('#trailer-axles').value=profile.trailerAxleCount||0;$('#trailer-count').value=profile.trailerCount||0;$('#single-axle').value=profile.singleAxleGroupLb||'';$('#tandem-axle').value=profile.tandemAxleGroupLb||'';$('#triple-axle').value=profile.tripleAxleGroupLb||'';
 $('#hazmat-enabled').checked=profile.hazmatCategories.length>0||Boolean(profile.tunnelCategory);$('#hazmat-editor').hidden=!$('#hazmat-enabled').checked;$$('#hazmat-categories option').forEach(option=>option.selected=profile.hazmatCategories.includes(option.value));$('#tunnel-category').value=profile.tunnelCategory||'';
 $('#avoid-tolls').checked=profile.avoidTolls;$('#route-preference').value=profile.routePreference||'fast';$('#permitted-load').checked=profile.permittedLoad;
 updateProfileStatus();
}
function profileSummary(profile=readProfileForm()){
 const heightFeet=Math.floor(profile.heightInches/12),heightInches=Math.round(profile.heightInches-heightFeet*12),widthFeet=Math.floor(profile.widthInches/12),widthInches=Math.round(profile.widthInches-widthFeet*12);
 return`${heightFeet} ft ${heightInches} in · ${widthFeet} ft ${widthInches} in · ${profile.overallLengthFt||'—'} ft · ${Number(profile.currentWeightLb||0).toLocaleString()} lb`;
}
function updateProfileStatus(){
 const validation=validateTruckProfile(readProfileForm()),status=$('#profile-status');$('#profile-summary').textContent=profileSummary(validation.profile);
 if(validation.errors.length){status.textContent=validation.errors[0];status.className='inline-status bad';}
 else if(validation.warnings.length){status.textContent=validation.warnings.join(' ');status.className='inline-status warning';}
 else{status.textContent='Complete profile ready for commercial route calculation.';status.className='inline-status good';}
 updateReadiness();
}
function saveProfile(){
 const validation=validateTruckProfile(readProfileForm());
 if(!validation.ready){$('#profile-editor').hidden=false;$('#profile-toggle').setAttribute('aria-expanded','true');setStatus(validation.errors[0],'bad');return false;}
 localStorage.setItem(PROFILE_KEY,JSON.stringify({...validation.profile,savedAt:new Date().toISOString()}));setStatus('Truck profile saved on this device.','good');updateProfileStatus();return true;
}
function loadProfile(){
 const saved=safeJsonParse(localStorage.getItem(PROFILE_KEY));writeProfileForm(saved||presets['standard-semi']);
}
function applyPreset(name){if(name==='custom')return;writeProfileForm({...presets[name],preset:name,avoidTolls:$('#avoid-tolls').checked,routePreference:$('#route-preference').value});}

function routeFresh(){return state.route&&Date.now()-new Date(state.route.calculatedAt).valueOf()<MAX_ROUTE_AGE_MS;}
function readinessItems(){
 const items=[];const origin=$('#origin').value.trim(),destination=$('#destination').value.trim(),validation=validateTruckProfile(readProfileForm());
 items.push({ok:Boolean(origin&&destination),text:origin&&destination?'Origin and destination entered.':'Enter an origin and destination.'});
 items.push({ok:validation.ready,text:validation.ready?'Complete truck profile passes local validation.':validation.errors[0]||'Complete the truck profile.'});
 if(validation.warnings.length)items.push({ok:false,warning:true,text:validation.warnings[0]});
 if(state.route){
  items.push({ok:state.route.guidanceEligible,text:state.route.guidanceEligible?'Commercial route returned without critical provider notices.':'Provider notices block guidance.'});
  items.push({ok:routeFresh(),text:routeFresh()?'Route candidate is fresh for guidance.':'Route candidate is over one hour old; calculate again.'});
 }else items.push({ok:false,text:'A licensed commercial route must return without critical notices.'});
 return items;
}
function updateReadiness(){
 const items=readinessItems(),list=$('#readiness-list');list.replaceChildren(...items.map(item=>{const li=document.createElement('li');li.className=item.ok?'good':item.warning?'':'bad';li.textContent=item.text;return li}));
 const ready=items.every(item=>item.ok||item.warning)&&Boolean(state.route?.guidanceEligible)&&routeFresh();$('#readiness-chip').textContent=ready?'Ready for parked review':'Not ready';$('#readiness-chip').className=`status-chip ${ready?'good':'warning'}`;$('#readiness-heading').textContent=ready?'Route candidate ready for parked review':'Complete the route and profile';
 const confirmed=$('#route-confirmed').checked;$('#start-guidance').disabled=!(ready&&confirmed);return ready;
}
function clearCalculatedRoute({keepInputs=true}={}){
 stopGuidance('');state.route=null;state.origin=null;state.destination=null;state.cumulative=[];$('#route-review').hidden=true;$('#route-confirmed').checked=false;$('#fit-route').disabled=true;$('#map-empty').hidden=false;mapMessage('');
 for(const layerName of['routeLine','startMarker','endMarker','truckMarker']){const layer=state[layerName];if(layer&&state.map)state.map.removeLayer(layer);state[layerName]=null;}
 if(!keepInputs){$('#origin').value='';$('#destination').value='';state.originCoordinate=null;}
 localStorage.removeItem(ROUTE_KEY);setStatus('No route has been calculated.');updateReadiness();
}

function initMap(){
 if(!window.L){mapMessage('The map library did not load. Route calculations can still be reviewed as text, but guidance is disabled.','bad');return;}
 state.map=L.map('truck-map',{zoomControl:false,preferCanvas:true}).setView([39,-98],4);L.control.zoom({position:'bottomright'}).addTo(state.map);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(state.map);
}
function markerIcon(kind){return L.divIcon({className:'',html:`<div class="route-${kind}-marker">${kind==='start'?'A':'B'}</div>`,iconSize:[30,30],iconAnchor:[15,15]});}
function truckIcon(){return L.divIcon({className:'',html:'<div class="truck-marker">🚛</div>',iconSize:[38,38],iconAnchor:[19,19]});}
function drawRoute(){
 if(!state.map||!state.route)return;for(const name of['routeLine','startMarker','endMarker'])if(state[name])state.map.removeLayer(state[name]);
 state.routeLine=L.polyline(state.route.geometry,{color:'#20c67a',weight:7,opacity:.94,lineJoin:'round'}).addTo(state.map);
 const first=state.route.geometry[0],last=state.route.geometry.at(-1);state.startMarker=L.marker(first,{icon:markerIcon('start')}).addTo(state.map);state.endMarker=L.marker(last,{icon:markerIcon('end')}).addTo(state.map);state.map.fitBounds(state.routeLine.getBounds(),{padding:[38,38]});$('#map-empty').hidden=true;$('#fit-route').disabled=false;
 state.cumulative=[0];for(let index=1;index<state.route.geometry.length;index++)state.cumulative[index]=state.cumulative[index-1]+distanceMeters(state.route.geometry[index-1],state.route.geometry[index]);
}
function addNotice(container,message,tone=''){
 const div=document.createElement('div');div.className=`route-notice ${tone}`.trim();div.textContent=message;container.append(div);
}
function renderReview(result){
 state.route=result.route;state.origin=result.origin;state.destination=result.destination;drawRoute();
 const summary=routeSummary(state.route);$('#review-distance').textContent=`${summary.miles} mi`;$('#review-duration').textContent=formatDuration(state.route.durationSeconds);$('#review-arrival').textContent=new Date(Date.now()+state.route.durationSeconds*1000).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});$('#provider-name').textContent=state.route.provider||'Commercial provider';
 const stops=$('#resolved-stops');stops.replaceChildren();for(const[type,stop]of[['origin',state.origin],['destination',state.destination]]){const row=document.createElement('div');row.className=`resolved-stop ${type}`;const badge=document.createElement('b');badge.textContent=type==='origin'?'A':'B';const copy=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=stop.label;small.textContent=`${stop.resultType||'location'} · confidence ${Math.round(Number(stop.confidence||1)*100)}%`;copy.append(strong,small);row.append(badge,copy);stops.append(row);}
 const noticeBox=$('#route-notices');noticeBox.className='notice-list';noticeBox.replaceChildren();for(const warning of result.profileWarnings||[])addNotice(noticeBox,warning,'warning');if(!state.route.notices.length)addNotice(noticeBox,'No provider notices were returned. This does not guarantee every restriction or temporary condition is known.');for(const notice of state.route.notices)addNotice(noticeBox,`${notice.title}${notice.code?` (${notice.code})`:''}`,notice.severity==='critical'?'critical':'warning');
 const list=$('#maneuver-list');list.replaceChildren();for(const step of state.route.steps){const li=document.createElement('li'),copy=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small'),distance=document.createElement('b');strong.textContent=step.instruction||'Continue';small.textContent=step.road||step.direction||'Road name unavailable';distance.textContent=step.lengthMeters?formatMiles(step.lengthMeters):'';copy.append(strong,small);li.append(copy,distance);list.append(li);}
 $('#route-confirmed').checked=false;$('#route-review').hidden=false;$('#route-review').scrollIntoView({behavior:'smooth',block:'start'});localStorage.setItem(ROUTE_KEY,JSON.stringify({route:state.route,origin:state.origin,destination:state.destination,savedAt:new Date().toISOString()}));
 setStatus(state.route.guidanceEligible?'Commercial route candidate ready for parked review.':'The route returned critical notices. Guidance is blocked.',state.route.guidanceEligible?'good':'bad');updateReadiness();
}
async function calculateRoute(event){
 event?.preventDefault();if(state.calculating)return;
 const validation=validateTruckProfile(readProfileForm());if(!validation.ready){$('#profile-editor').hidden=false;$('#profile-toggle').setAttribute('aria-expanded','true');setStatus(validation.errors[0],'bad');updateReadiness();return;}
 const originText=$('#origin').value.trim(),destinationText=$('#destination').value.trim();if(!originText||!destinationText){setStatus('Enter an origin and destination.','bad');return;}
 clearCalculatedRoute({keepInputs:true});state.calculating=true;setLoading(true);setStatus('Calculating a commercial restriction-aware route…');mapMessage('Checking the supplied truck profile and commercial road restrictions.');
 try{
  const response=await fetch('/api/truck-route',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({origin:state.originCoordinate||{address:originText},destination:{address:destinationText},departureTime:$('#departure-time').value||null,profile:validation.profile})});
  const payload=await response.json().catch(()=>({error:'The routing service returned an unreadable response.'}));if(!response.ok)throw new Error(payload.error||'Commercial route calculation failed.');renderReview(payload);mapMessage('');
 }catch(error){setStatus(error.message,'bad');mapMessage(error.message,'bad');$('#map-empty').hidden=false;}
 finally{state.calculating=false;setLoading(false);updateReadiness();}
}

function cumulativeRemaining(index){if(!state.cumulative.length)return state.route?.distanceMeters||0;return Math.max(0,state.cumulative.at(-1)-state.cumulative[Math.min(index,state.cumulative.length-1)]);}
function nextStepForIndex(index){
 const steps=state.route?.steps||[];if(!steps.length)return{step:null,index:-1};let found=steps.findIndex(step=>Number(step.geometryIndex)>=index+2);if(found<0)found=steps.length-1;return{step:steps[found],index:found};
}
function maneuverArrow(step){const text=`${step?.action||''} ${step?.direction||''}`.toLowerCase();if(text.includes('left'))return'↰';if(text.includes('right'))return'↱';if(text.includes('u-turn'))return'↶';if(text.includes('roundabout'))return'⟳';if(text.includes('arrive'))return'●';return'↑';}
function guidanceWarning(message){const element=$('#drive-warning');element.textContent=message;element.hidden=!message;}
async function requestWakeLock(){if(!('wakeLock'in navigator)||document.visibilityState!=='visible')return;try{state.wakeLock=await navigator.wakeLock.request('screen');state.wakeLock.addEventListener('release',()=>state.wakeLock=null)}catch{/* Device may refuse wake lock. */}}
function freezeForDeviation(distance,accuracy){
 if(state.guidanceFrozen)return;state.guidanceFrozen=true;guidanceWarning(`ROUTE DEVIATION: ${Math.round(distance)} m from the reviewed route (GPS ±${Math.round(accuracy)} m). Pull over safely. Do not accept an automatic detour.`);mapMessage('Route deviation detected. Guidance is frozen until the route is resolved.','bad');speak('Route deviation. Pull over safely. Do not take an automatic detour.');if(state.watchId!==null)navigator.geolocation.clearWatch(state.watchId);state.watchId=null;
}
function updateGuidance(position){
 if(!state.route||state.guidanceFrozen)return;const latitude=position.coords.latitude,longitude=position.coords.longitude,accuracy=Number(position.coords.accuracy||999),point=[latitude,longitude];state.latestPosition=position;
 if(state.truckMarker&&state.map)state.map.removeLayer(state.truckMarker);if(state.map){state.truckMarker=L.marker(point,{icon:truckIcon(),zIndexOffset:1000}).addTo(state.map);state.map.panTo(point,{animate:true,duration:.3});}
 $('#current-speed').textContent=Number.isFinite(position.coords.speed)?String(Math.max(0,Math.round(position.coords.speed*2.23694))):'—';
 if(accuracy>75){guidanceWarning(`GPS accuracy is weak (±${Math.round(accuracy)} m). Route-deviation decisions are paused.`);state.offRouteHits=0;return;}
 const nearest=nearestGeometryDistance(point,state.route.geometry);if(!Number.isFinite(nearest.distance))return;
 const threshold=Math.max(120,accuracy*2.5);if(nearest.distance>threshold)state.offRouteHits++;else{state.offRouteHits=0;guidanceWarning('');}
 if(state.offRouteHits>=3){freezeForDeviation(nearest.distance,accuracy);return;}
 const{step,index}=nextStepForIndex(nearest.index);if(!step)return;
 state.stepIndex=index;const stepDistance=step.coordinate?distanceMeters(point,step.coordinate):0,remaining=cumulativeRemaining(nearest.index);$('#maneuver-icon').textContent=maneuverArrow(step);$('#maneuver-road').textContent=escapeText(step.road||'TRUCK ROUTE').toUpperCase();$('#next-maneuver').textContent=escapeText(step.instruction||'Continue');$('#maneuver-distance').textContent=stepDistance<305?`${Math.max(1,Math.round(stepDistance*3.28084))} ft`:formatMiles(stepDistance);$('#remaining-distance').textContent=formatMiles(remaining);$('#arrival-time').textContent=new Date(Date.now()+state.route.durationSeconds*Math.max(0,remaining/state.route.distanceMeters)*1000).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
 const band=stepDistance<160?'now':stepDistance<500?'quarter':stepDistance<1800?'mile':'';if(index!==state.lastSpokenStep||band&&band!==state.lastPromptBand){state.lastSpokenStep=index;state.lastPromptBand=band;speak(`${band==='mile'?'In about one mile, ':band==='quarter'?'In a quarter mile, ':band==='now'?'Now, ':''}${step.instruction||'continue'}`);}
}
function guidanceError(error){const message=error.code===1?'Location permission is blocked. Allow precise location before guidance.':error.code===3?'GPS timed out. Pull over safely and restore location service.':'GPS is unavailable. Pull over safely and restore location service.';guidanceWarning(message);mapMessage(message,'bad');speak(message);}
function startGuidance(){
 if(!updateReadiness()||!state.route?.guidanceEligible||!$('#route-confirmed').checked){setStatus('Complete the parked route review before guidance.','bad');return;}
 if(!navigator.geolocation){setStatus('This device does not provide live GPS.','bad');return;}
 if(state.route.profile?.permittedLoad){location.href='/permitted-loads';return;}
 state.guidanceFrozen=false;state.offRouteHits=0;state.lastSpokenStep=-1;state.lastPromptBand='';document.body.classList.add('drive-mode');$('#drive-hud').hidden=false;$('#route-review').hidden=true;mapMessage('');guidanceWarning('');void requestWakeLock();speak('Commercial truck guidance started. Posted signs and official restrictions control.');state.watchId=navigator.geolocation.watchPosition(updateGuidance,guidanceError,{enableHighAccuracy:true,maximumAge:1000,timeout:15000});setTimeout(()=>state.map?.invalidateSize(),80);
}
function stopGuidance(message='Guidance stopped.'){
 if(state.watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(state.watchId);state.watchId=null;if(state.wakeLock){state.wakeLock.release().catch(()=>{});state.wakeLock=null}if('speechSynthesis'in window)speechSynthesis.cancel();document.body.classList.remove('drive-mode');$('#drive-hud').hidden=true;guidanceWarning('');state.guidanceFrozen=false;state.offRouteHits=0;if(message)setStatus(message);setTimeout(()=>state.map?.invalidateSize(),80);
}

function useCurrentLocation(){
 if(!navigator.geolocation){setStatus('This browser does not provide location access.','bad');return;}
 setStatus('Requesting precise current location…');navigator.geolocation.getCurrentPosition(position=>{state.originCoordinate={lat:position.coords.latitude,lng:position.coords.longitude,label:'Current GPS location'};$('#origin').value='Current GPS location';setStatus(`Current location ready (GPS ±${Math.round(position.coords.accuracy)} m).`,'good');updateReadiness();if(state.map){state.map.setView([position.coords.latitude,position.coords.longitude],14);}},guidanceError,{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
}
async function checkEngine(){
 const badge=$('#engine-badge');try{const response=await fetch('/api/truck-route-health',{cache:'no-store'}),data=await response.json();if(data.configured){badge.textContent='Commercial engine configured';badge.className='status-chip good';}else{badge.textContent='Engine setup required';badge.className='status-chip warning';}}catch{badge.textContent='Engine status unavailable';badge.className='status-chip bad';}
}
function updateNetwork(){const badge=$('#network-badge');if(navigator.onLine){badge.textContent='Online';badge.className='status-chip good';}else{badge.textContent='Offline · review only';badge.className='status-chip bad';mapMessage('Offline: new route calculation and live restriction checks are unavailable. Saved permit packets remain available.','bad');}}

function bind(){
 $('#route-form').addEventListener('submit',calculateRoute);$('#swap-stops').addEventListener('click',()=>{const origin=$('#origin').value;$('#origin').value=$('#destination').value;$('#destination').value=origin;state.originCoordinate=null;clearCalculatedRoute({keepInputs:true});updateReadiness();});
 $('#use-location').addEventListener('click',useCurrentLocation);$('#origin').addEventListener('input',()=>{if($('#origin').value!=='Current GPS location')state.originCoordinate=null;clearCalculatedRoute({keepInputs:true});updateReadiness();});$('#destination').addEventListener('input',()=>{clearCalculatedRoute({keepInputs:true});updateReadiness();});
 $('#profile-toggle').addEventListener('click',()=>{const editor=$('#profile-editor'),open=editor.hidden;editor.hidden=!open;$('#profile-toggle').setAttribute('aria-expanded',String(open));});$('#show-profile').addEventListener('click',()=>{$('#profile-editor').hidden=false;$('#profile-toggle').setAttribute('aria-expanded','true');$('#profile-toggle').scrollIntoView({behavior:'smooth'});});
 $('#vehicle-preset').addEventListener('change',event=>applyPreset(event.target.value));$('#hazmat-enabled').addEventListener('change',()=>{$('#hazmat-editor').hidden=!$('#hazmat-enabled').checked;updateProfileStatus();});
 for(const element of$$('#profile-editor input,#profile-editor select,#avoid-tolls,#route-preference,#permitted-load'))element.addEventListener('change',()=>{clearCalculatedRoute({keepInputs:true});updateProfileStatus();});
 $('#save-profile').addEventListener('click',saveProfile);$('#clear-route').addEventListener('click',()=>clearCalculatedRoute({keepInputs:false}));$('#route-confirmed').addEventListener('change',updateReadiness);$('#start-guidance').addEventListener('click',startGuidance);$('#stop-guidance').addEventListener('click',()=>stopGuidance());$('#recenter').addEventListener('click',()=>{if(state.latestPosition&&state.map)state.map.setView([state.latestPosition.coords.latitude,state.latestPosition.coords.longitude],16);});$('#fit-route').addEventListener('click',()=>state.routeLine&&state.map?.fitBounds(state.routeLine.getBounds(),{padding:[35,35]}));
 window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.watchId!==null&&!state.wakeLock)void requestWakeLock();});window.addEventListener('beforeunload',()=>stopGuidance(''));
}

function boot(){loadProfile();initMap();bind();updateNetwork();void checkEngine();updateReadiness();const now=new Date(Date.now()+15*60*1000);now.setMinutes(Math.ceil(now.getMinutes()/15)*15,0,0);$('#departure-time').value=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);}
boot();
