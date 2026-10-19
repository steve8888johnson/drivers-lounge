import{nearestGeometryDistance}from'./core.mjs';

const ROUTE_KEY='dl-routing-last-candidate-v1';
const $=selector=>document.querySelector(selector);
let checking=false;

export function evaluateDeparturePosition(position,route,{maxAccuracyMeters=75,minimumCorridorMeters=120}={}){
 const latitude=Number(position?.coords?.latitude),longitude=Number(position?.coords?.longitude),accuracy=Number(position?.coords?.accuracy),timestamp=Number(position?.timestamp||Date.now());
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return{ok:false,code:'invalidPosition',message:'GPS returned an invalid position. Guidance was not started.'};
 if(!Number.isFinite(accuracy)||accuracy<=0||accuracy>maxAccuracyMeters)return{ok:false,code:'weakAccuracy',message:`Precise GPS is required before departure. Current accuracy is ${Number.isFinite(accuracy)?`±${Math.round(accuracy)} m`:'unknown'}.`};
 if(Date.now()-timestamp>15000)return{ok:false,code:'stalePosition',message:'The available GPS fix is stale. Wait for a fresh precise position before departure.'};
 if(!Array.isArray(route?.geometry)||route.geometry.length<2)return{ok:false,code:'missingRoute',message:'The reviewed route geometry is unavailable. Calculate and review a fresh route.'};
 const nearest=nearestGeometryDistance([latitude,longitude],route.geometry);if(!Number.isFinite(nearest?.distance))return{ok:false,code:'unmatchedRoute',message:'Your GPS position could not be compared with the reviewed route.'};
 const corridor=Math.max(minimumCorridorMeters,accuracy*2.5);
 if(nearest.distance>corridor)return{ok:false,code:'outsideRouteCorridor',message:`You are about ${Math.round(nearest.distance)} m from the reviewed truck route. Move to the confirmed route or recalculate while parked; no automatic connector or detour was created.`,distanceMeters:nearest.distance,corridorMeters:corridor,geometryIndex:nearest.index};
 return{ok:true,code:'ready',message:`Precise GPS confirmed within ${Math.round(nearest.distance)} m of the reviewed route.`,distanceMeters:nearest.distance,corridorMeters:corridor,geometryIndex:nearest.index,accuracyMeters:accuracy};
}

function savedRoute(){try{return JSON.parse(localStorage.getItem(ROUTE_KEY)||'null')?.route||null}catch{return null}}
function show(message,tone='bad'){
 const status=$('#route-status');if(status){status.textContent=message;status.className=`inline-status ${tone}`.trim();}
 const map=$('#map-message');if(map){map.textContent=message;map.className=`map-message ${tone}`.trim();map.hidden=false;}
}
function position(){return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:0,timeout:15000}))}

async function preflight(event){
 const button=event.currentTarget;
 if(button.dataset.departureVerified==='true'){delete button.dataset.departureVerified;return;}
 if(button.disabled||button.dataset.safetyInterlock==='blocked')return;
 event.preventDefault();event.stopImmediatePropagation();if(checking)return;checking=true;
 const prior=button.textContent;button.disabled=true;button.textContent='Confirming precise GPS…';show('Confirming your position against the reviewed route…','warning');
 try{
  if(!navigator.geolocation)throw Error('This device does not provide live GPS. Guidance was not started.');
  const fix=await position(),result=evaluateDeparturePosition(fix,savedRoute());if(!result.ok)throw Error(result.message);
  show(result.message,'good');button.dataset.departureVerified='true';button.disabled=false;button.textContent=prior;button.click();
 }catch(error){show(error?.code===1?'Location permission is blocked. Allow precise location before guidance.':error?.code===3?'GPS timed out. Wait for a fresh precise position before departure.':String(error?.message||'Unable to confirm departure position.'),'bad');button.disabled=false;button.textContent=prior;}
 finally{checking=false;}
}

function attach(){const button=$('#start-guidance');if(button)button.addEventListener('click',preflight,true);}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
}
