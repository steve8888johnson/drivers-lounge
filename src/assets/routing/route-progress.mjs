import{distanceMeters,nearestGeometryDistance}from'./core.mjs';

const finite=(value,fallback=0)=>{const number=Number(value);return Number.isFinite(number)?number:fallback};
const positive=(value,fallback=0)=>Math.max(0,finite(value,fallback));

function cumulativeDistances(geometry=[]){
 const cumulative=[0];
 for(let index=1;index<geometry.length;index++)cumulative[index]=cumulative[index-1]+distanceMeters(geometry[index-1],geometry[index]);
 return cumulative;
}

function indexAtOrBefore(cumulative,target){
 let low=0,high=cumulative.length-1,best=0;
 while(low<=high){const middle=(low+high)>>1;if(cumulative[middle]<=target){best=middle;low=middle+1}else high=middle-1;}
 return best;
}
function indexAtOrAfter(cumulative,target){
 let low=0,high=cumulative.length-1,best=high;
 while(low<=high){const middle=(low+high)>>1;if(cumulative[middle]>=target){best=middle;high=middle-1}else low=middle+1;}
 return best;
}

function nearestInRange(point,geometry,start,end){
 let bestDistance=Infinity,bestIndex=Math.max(0,start);
 for(let index=Math.max(0,start);index<=Math.min(geometry.length-1,end);index++){
  const distance=distanceMeters(point,geometry[index]);
  if(distance<bestDistance){bestDistance=distance;bestIndex=index;}
 }
 return{distance:bestDistance,index:bestIndex};
}

function positionData(position){
 const latitude=finite(position?.coords?.latitude,NaN),longitude=finite(position?.coords?.longitude,NaN),accuracy=positive(position?.coords?.accuracy,999),speed=Math.max(0,finite(position?.coords?.speed,0)),timestamp=finite(position?.timestamp,Date.now());
 return{point:[latitude,longitude],accuracy,speed,timestamp,valid:Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180};
}

export function createRouteProgressTracker(route,{minimumCorridorMeters=120,backwardAllowanceMeters=350,forwardBaseMeters=1800,ambiguityMarginMeters=90,reanchorSamples=3}={}){
 const geometry=Array.isArray(route?.geometry)?route.geometry:[],cumulative=cumulativeDistances(geometry);
 let lastIndex=null,lastTimestamp=null,pendingIndex=null,pendingCount=0,held=false;

 function reset(){lastIndex=null;lastTimestamp=null;pendingIndex=null;pendingCount=0;held=false;}
 function snapshot(){return{lastIndex,lastTimestamp,pendingIndex,pendingCount,held};}
 function accept(candidate,data,status='accepted'){
  const previousIndex=lastIndex;lastIndex=candidate.index;lastTimestamp=data.timestamp;pendingIndex=null;pendingCount=0;held=false;
  return{accept:true,status,index:candidate.index,distanceMeters:candidate.distance,previousIndex,cumulativeMeters:cumulative[candidate.index]||0};
 }
 function keepProgress(candidate,data,status='minor-backward-jitter'){
  const previousIndex=lastIndex;lastTimestamp=data.timestamp;pendingIndex=null;pendingCount=0;held=false;
  return{accept:true,status,index:lastIndex,distanceMeters:candidate.distance,previousIndex,cumulativeMeters:cumulative[lastIndex]||0,observedIndex:candidate.index};
 }
 function hold(reason,global,local,data,window){
  held=true;
  const samePending=pendingIndex!==null&&Math.abs(pendingIndex-global.index)<=Math.max(3,Math.round(geometry.length*.002));
  pendingIndex=global.index;pendingCount=samePending?pendingCount+1:1;
  return{accept:false,status:'held',reason,global,local,index:lastIndex,pendingIndex,pendingCount,accuracyMeters:data.accuracy,window};
 }
 function update(position){
  const data=positionData(position);
  if(!data.valid||geometry.length<2)return{accept:true,status:'unverified',reason:'invalid-position-or-route',index:lastIndex};
  const global=nearestGeometryDistance(data.point,geometry);
  if(!Number.isFinite(global?.distance))return{accept:true,status:'unverified',reason:'route-match-unavailable',index:lastIndex};
  const corridor=Math.max(minimumCorridorMeters,data.accuracy*2.5);
  if(lastIndex===null||lastTimestamp===null)return accept(global,data,'anchored');
  if(data.accuracy>75)return{accept:true,status:'weak-gps',reason:'accuracy-too-weak-for-progress-match',index:lastIndex,global};

  const elapsed=Math.max(0,(data.timestamp-lastTimestamp)/1000),lastMeters=cumulative[lastIndex]||0;
  const backward=Math.max(backwardAllowanceMeters,data.accuracy*4);
  const plausibleTravel=data.speed>0?data.speed*Math.max(elapsed,1)*4:0;
  const forward=Math.max(forwardBaseMeters,plausibleTravel+900);
  const start=indexAtOrBefore(cumulative,Math.max(0,lastMeters-backward)),end=indexAtOrAfter(cumulative,Math.min(cumulative.at(-1)||0,lastMeters+forward));
  const local=nearestInRange(data.point,geometry,start,end),window={start,end,backwardMeters:backward,forwardMeters:forward,elapsedSeconds:elapsed};
  const globalMeters=cumulative[global.index]||0,localMeters=cumulative[local.index]||0;

  // When the truck is clearly away from every route candidate, pass the raw sample through so
  // the core guidance layer can count a true route deviation rather than hiding it as ambiguity.
  if(global.distance>corridor&&local.distance>corridor)return accept(global,data,'off-route-sample');

  const outsideWindow=global.index<start||global.index>end;
  const largeBackward=globalMeters<lastMeters-backward;
  const largeForward=globalMeters>lastMeters+forward;
  const competingSegments=Math.abs(globalMeters-localMeters)>Math.max(700,forward*.55)&&local.distance<=corridor;
  const ambiguousDistance=Math.abs(local.distance-global.distance)<=ambiguityMarginMeters;

  if(outsideWindow||largeBackward||largeForward||competingSegments){
   // Never silently jump backward to a prior crossing or parallel road, even when it is the
   // closest geometric point. The driver must remain on the reviewed direction of travel.
   if(largeBackward)return hold('backward-route-snap',global,local,data,window);
   if(local.distance<=corridor&&ambiguousDistance)return hold('parallel-or-crossing-road-ambiguity',global,local,data,window);

   // A much closer forward candidate can be a legitimate rejoin after a GPS interruption.
   // Require repeated precise fixes before re-anchoring; otherwise hold the last maneuver.
   const strongForward=globalMeters>lastMeters&&global.distance<=Math.min(45,corridor*.35)&&local.distance>Math.max(120,global.distance+ambiguityMarginMeters);
   const candidate=hold(strongForward?'forward-reanchor-pending':'implausible-route-jump',global,local,data,window);
   if(strongForward&&candidate.pendingCount>=reanchorSamples)return accept(global,data,'forward-reanchored');
   return candidate;
  }

  // Permit small GPS jitter backward, but retain monotonic state so later windows do not drift.
  if(global.index<lastIndex)return keepProgress(global,data);
  return accept(global,data,'advanced');
 }
 return{update,reset,snapshot,geometry,cumulative};
}
