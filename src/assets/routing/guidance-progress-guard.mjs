import{createRouteProgressTracker}from'./route-progress.mjs';

const ROUTE_KEY='dl-routing-last-candidate-v1';
const $=selector=>document.querySelector(selector);
let installed=false,lastSpokenReason='',lastSpokenAt=0;

function savedRoute(){try{return JSON.parse(localStorage.getItem(ROUTE_KEY)||'null')?.route||null}catch{return null}}
function driving(){return Boolean(document.body?.classList.contains('drive-mode'))}
function speak(message,reason){
 if(!('speechSynthesis'in window)||!message)return;
 const now=Date.now();if(reason===lastSpokenReason&&now-lastSpokenAt<15000)return;
 lastSpokenReason=reason;lastSpokenAt=now;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.rate=.96;utterance.volume=1;speechSynthesis.speak(utterance);
}
function holdMessage(result){
 const repeated=result.pendingCount>=4;
 const reason=result.reason==='backward-route-snap'?'GPS matched an earlier part of the reviewed route.':result.reason==='parallel-or-crossing-road-ambiguity'?'GPS cannot safely distinguish nearby parallel or crossing route segments.':result.reason==='forward-reanchor-pending'?'GPS appears to have rejoined the route farther ahead, but confirmation is still pending.':'GPS indicated an implausible jump along the reviewed route.';
 return`ROUTE MATCH ${repeated?'UNRESOLVED':'UNCERTAIN'}: ${reason} Guidance is holding the last confirmed maneuver. ${repeated?'Pull over safely and verify your road before continuing.':'Follow posted signs and remain on the reviewed route.'}`;
}
function showHold(result){
 const message=holdMessage(result),warning=$('#drive-warning'),map=$('#map-message');
 if(warning){warning.textContent=message;warning.hidden=false;warning.dataset.progressGuard='true';}
 if(map){map.textContent=message;map.className='map-message bad';map.hidden=false;map.dataset.progressGuard='true';}
 document.body?.classList.add('route-progress-held');
 speak(result.pendingCount>=4?'Route match unresolved. Pull over safely and verify the road.':'Route match uncertain. Guidance is holding the last confirmed maneuver.',result.reason);
}
function clearHold(){
 const warning=$('#drive-warning'),map=$('#map-message');
 if(warning?.dataset.progressGuard==='true'){warning.textContent='';warning.hidden=true;delete warning.dataset.progressGuard;}
 if(map?.dataset.progressGuard==='true'){map.textContent='';map.hidden=true;map.className='map-message';delete map.dataset.progressGuard;}
 document.body?.classList.remove('route-progress-held');lastSpokenReason='';
}
function dispatch(result){document.dispatchEvent(new CustomEvent('routing-progress-match',{detail:result}));}

export function installGuidanceProgressGuard({scope=globalThis}={}){
 const geolocation=scope.navigator?.geolocation;if(installed||!geolocation?.watchPosition)return false;
 installed=true;const nativeWatch=geolocation.watchPosition.bind(geolocation);
 geolocation.watchPosition=(success,error,options)=>{
  const route=savedRoute(),tracker=route?.geometry?.length>=2?createRouteProgressTracker(route):null;
  return nativeWatch(position=>{
   if(!driving()||!tracker){clearHold();success(position);return;}
   const result=tracker.update(position);dispatch(result);
   if(!result.accept){showHold(result);return;}
   if(result.status==='advanced'||result.status==='anchored'||result.status==='forward-reanchored'||result.status==='minor-backward-jitter')clearHold();
   success(position);
  },error,options);
 };
 window.addEventListener('storage',event=>{if(event.key===ROUTE_KEY)clearHold();});
 window.addEventListener('beforeunload',clearHold);
 return true;
}

if(typeof window!=='undefined'&&typeof document!=='undefined')installGuidanceProgressGuard();
