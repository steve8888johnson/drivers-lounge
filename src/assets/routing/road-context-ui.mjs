import{nearestGeometryDistance}from'./core.mjs';
import{providerRoadContextAt}from'./road-context.mjs';

const ROUTE_KEY='dl-routing-last-candidate-v1';
const $=selector=>document.querySelector(selector);
let patched=false;

function savedRoute(){
 try{return JSON.parse(localStorage.getItem(ROUTE_KEY)||'null')?.route||null}catch{return null}
}

function ensureHud(){
 const stats=$('.drive-stats');
 if(stats&&!$('#provider-speed-limit')){
  const box=document.createElement('div');box.className='provider-limit-stat';box.title='Provider-supplied speed limit. Posted signs and lower truck-specific limits control.';box.innerHTML='<small>PROVIDER LIMIT</small><strong id="provider-speed-limit">—</strong><span>MPH · SIGNS CONTROL</span>';stats.insertBefore(box,stats.children[1]||null);
 }
 const maneuver=$('.maneuver-card>div:last-child');
 if(maneuver&&!$('#provider-lane-guidance')){
  const lane=document.createElement('span');lane.id='provider-lane-guidance';lane.className='provider-lane-guidance';lane.textContent='Lane guidance appears only when supplied by the commercial provider.';maneuver.append(lane);
 }
}

function clearContext(){
 const limit=$('#provider-speed-limit'),lane=$('#provider-lane-guidance');if(limit)limit.textContent='—';if(lane)lane.textContent='Lane guidance unavailable · signs and markings control';
}

export function updateProviderRoadContext(position){
 ensureHud();const route=savedRoute(),geometry=route?.geometry;if(!route||!Array.isArray(geometry)||geometry.length<2){clearContext();return null;}
 const latitude=Number(position?.coords?.latitude),longitude=Number(position?.coords?.longitude);if(!Number.isFinite(latitude)||!Number.isFinite(longitude)){clearContext();return null;}
 const nearest=nearestGeometryDistance([latitude,longitude],geometry);if(!Number.isFinite(nearest?.distance)){clearContext();return null;}
 const context=providerRoadContextAt(route,nearest.index),limit=$('#provider-speed-limit'),lane=$('#provider-lane-guidance');
 if(limit){limit.textContent=context.speedLimit?.mph?String(context.speedLimit.mph):'—';limit.parentElement.title=context.speedLimit?.advisory||'No provider speed limit supplied. Posted signs control.';}
 if(lane){lane.textContent=context.laneGuidance?.label||'Lane guidance unavailable · signs and markings control';lane.title=context.laneGuidance?.advisory||'No provider lane guidance supplied.';}
 return{...context,geometryIndex:nearest.index,distanceFromRouteMeters:nearest.distance};
}

function patchGeolocation(){
 if(patched||!navigator.geolocation?.watchPosition)return;patched=true;
 const original=navigator.geolocation.watchPosition.bind(navigator.geolocation);
 navigator.geolocation.watchPosition=(success,error,options)=>original(position=>{try{updateProviderRoadContext(position)}catch{/* Context is advisory and must never stop core guidance. */}success(position);},error,options);
}

function attach(){ensureHud();patchGeolocation();window.addEventListener('storage',event=>{if(event.key===ROUTE_KEY)clearContext();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
