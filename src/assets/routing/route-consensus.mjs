import{distanceMeters,nearestGeometryDistance}from'./core.mjs';

const finite=(value,fallback=0)=>{const number=Number(value);return Number.isFinite(number)?number:fallback};
const positive=value=>Math.max(0,finite(value));
const fold=value=>String(value||'').toLowerCase().replace(/\b(?:north|south|east|west|nb|sb|eb|wb)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const relativeDelta=(a,b)=>{const left=positive(a),right=positive(b),base=Math.max(left,right,1);return Math.abs(left-right)/base};

function sampledPoints(geometry=[],limit=96){
 if(!Array.isArray(geometry)||!geometry.length)return[];
 if(geometry.length<=limit)return geometry;
 const points=[];for(let index=0;index<limit;index++){const source=Math.round(index*(geometry.length-1)/(limit-1));points.push(geometry[source]);}
 return points;
}

function routeSeparation(sourceGeometry,targetGeometry){
 const samples=sampledPoints(sourceGeometry),distances=[];
 for(const point of samples){const nearest=nearestGeometryDistance(point,targetGeometry);if(Number.isFinite(nearest?.distance))distances.push(nearest.distance);}
 if(!distances.length)return{meanMeters:Infinity,p95Meters:Infinity,maxMeters:Infinity,samples:0};
 const sorted=[...distances].sort((a,b)=>a-b),mean=distances.reduce((sum,value)=>sum+value,0)/distances.length,p95=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))];
 return{meanMeters:Math.round(mean),p95Meters:Math.round(p95),maxMeters:Math.round(sorted.at(-1)),samples:distances.length};
}

function roadSet(route){
 return new Set((route?.steps||[]).map(step=>fold(step?.road)).filter(value=>value.length>=2));
}

function roadOverlap(primary,secondary){
 const left=roadSet(primary),right=roadSet(secondary);if(!left.size&&!right.size)return{score:1,common:[],primaryOnly:[],secondaryOnly:[]};
 const common=[...left].filter(value=>right.has(value)),union=new Set([...left,...right]);
 return{
  score:union.size?common.length/union.size:1,
  common:common.slice(0,30),
  primaryOnly:[...left].filter(value=>!right.has(value)).slice(0,30),
  secondaryOnly:[...right].filter(value=>!left.has(value)).slice(0,30)
 };
}

function endpointDelta(primary,secondary){
 const first=route=>route?.geometry?.[0],last=route=>route?.geometry?.at?.(-1);
 const start=first(primary)&&first(secondary)?distanceMeters(first(primary),first(secondary)):Infinity;
 const end=last(primary)&&last(secondary)?distanceMeters(last(primary),last(secondary)):Infinity;
 return{startMeters:Math.round(start),endMeters:Math.round(end)};
}

export function compareCommercialRoutes(primary,secondary,{primaryProvider=primary?.provider||'Primary provider',secondaryProvider=secondary?.provider||'Secondary provider'}={}){
 const primaryCritical=(primary?.criticalNotices||[]).length,secondaryCritical=(secondary?.criticalNotices||[]).length;
 const distanceDelta=relativeDelta(primary?.distanceMeters,secondary?.distanceMeters),durationDelta=relativeDelta(primary?.durationSeconds,secondary?.durationSeconds);
 const forward=routeSeparation(primary?.geometry,secondary?.geometry),reverse=routeSeparation(secondary?.geometry,primary?.geometry);
 const meanSeparation=Math.round((forward.meanMeters+reverse.meanMeters)/2),p95Separation=Math.max(forward.p95Meters,reverse.p95Meters),maxSeparation=Math.max(forward.maxMeters,reverse.maxMeters);
 const roads=roadOverlap(primary,secondary),endpoints=endpointDelta(primary,secondary),reasons=[];
 let status='aligned';
 if(!primary?.guidanceEligible||!secondary?.guidanceEligible||primaryCritical||secondaryCritical){status='blocked';reasons.push('At least one professional provider returned a critical restriction or non-guidance route.');}
 if(endpoints.startMeters>500||endpoints.endMeters>500){status='blocked';reasons.push('Provider routes do not share sufficiently close start and destination access points.');}
 if(distanceDelta>.35||meanSeparation>5000||p95Separation>12000||maxSeparation>30000){status='blocked';reasons.push('Provider routes materially diverge in distance or road geometry.');}
 else if(status!=='blocked'&&(distanceDelta>.12||durationDelta>.22||meanSeparation>1500||p95Separation>5000||roads.score<.35)){status='review';reasons.push('Provider routes differ enough to require parked comparison before guidance.');}
 if(!reasons.length)reasons.push('The two professional route candidates are within the current alignment thresholds.');
 const confidence=status==='aligned'?'high':status==='review'?'limited':'blocked';
 return{
  schema:'dl-route-consensus/v1',status,confidence,checkedAt:new Date().toISOString(),
  providers:[primaryProvider,secondaryProvider],
  guidanceEligible:status==='aligned',
  metrics:{
   distanceDeltaPct:Math.round(distanceDelta*1000)/10,
   durationDeltaPct:Math.round(durationDelta*1000)/10,
   meanSeparationMeters:meanSeparation,
   p95SeparationMeters:p95Separation,
   maxSeparationMeters:maxSeparation,
   roadNameOverlapPct:Math.round(roads.score*1000)/10,
   endpointDeltaMeters:endpoints,
   sampleCount:forward.samples+reverse.samples
  },
  roads,reasons,
  notice:{
   code:status==='aligned'?'providerRoutesAligned':'providerRouteDisagreement',
   title:status==='aligned'?`Independent route cross-check aligned ${primaryProvider} with ${secondaryProvider}.`:`${primaryProvider} and ${secondaryProvider} did not agree closely enough for unattended guidance. Review both routes while parked.`,
   severity:status==='aligned'?'info':'critical',
   blocking:status!=='aligned'
  }
 };
}

export function applyRouteConsensus(primaryResult,secondaryResult,options={}){
 const comparison=compareCommercialRoutes(primaryResult?.route,secondaryResult?.route,options),route=primaryResult?.route||{},notices=[...(route.notices||[]),comparison.notice],criticalNotices=notices.filter(item=>item?.severity==='critical'||item?.blocking===true);
 return{
  ...primaryResult,
  route:{...route,notices,criticalNotices,guidanceEligible:Boolean(route.guidanceEligible)&&comparison.guidanceEligible,crossCheck:comparison},
  crossCheck:{
   ...comparison,
   secondary:{
    provider:secondaryResult?.route?.provider||options.secondaryProvider||'Secondary provider',
    distanceMeters:positive(secondaryResult?.route?.distanceMeters),
    durationSeconds:positive(secondaryResult?.route?.durationSeconds),
    guidanceEligible:Boolean(secondaryResult?.route?.guidanceEligible),
    criticalNoticeCount:(secondaryResult?.route?.criticalNotices||[]).length
   }
  }
 };
}
