import{distanceMeters}from'./core.mjs';

const AUDIT_VERSION='dl-route-integrity/v1';
const finite=(value,fallback=NaN)=>{const number=Number(value);return Number.isFinite(number)?number:fallback};
const positive=value=>Math.max(0,finite(value,0));
const validPoint=point=>Array.isArray(point)&&Number.isFinite(Number(point[0]))&&Number.isFinite(Number(point[1]))&&Math.abs(Number(point[0]))<=90&&Math.abs(Number(point[1]))<=180;
const notice=(code,title,severity='warning',details={})=>({code,title,severity,blocking:severity==='critical',audit:'route-integrity',...details});
const percent=value=>Math.round(value*1000)/10;

function routeGeometryLength(geometry=[]){
 let length=0,maxGap=0,maxGapIndex=-1;
 for(let index=1;index<geometry.length;index++){
  if(!validPoint(geometry[index-1])||!validPoint(geometry[index]))continue;
  const gap=distanceMeters(geometry[index-1],geometry[index]);length+=gap;
  if(gap>maxGap){maxGap=gap;maxGapIndex=index;}
 }
 return{lengthMeters:Math.round(length),maxGapMeters:Math.round(maxGap),maxGapIndex};
}

function stopPoint(stop){
 const lat=finite(stop?.lat),lng=finite(stop?.lng);
 return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?[lat,lng]:null;
}

function stepMetrics(steps=[],geometryLength=0){
 let invalidIndexCount=0,retrogradeCount=0,missingIndexCount=0,previous=-1;
 for(const step of steps){
  const raw=Number(step?.geometryIndex);
  if(!Number.isFinite(raw)){missingIndexCount++;continue;}
  const index=Math.round(raw);
  if(index<0||index>=geometryLength){invalidIndexCount++;continue;}
  if(index<previous)retrogradeCount++;
  previous=Math.max(previous,index);
 }
 return{stepCount:steps.length,invalidIndexCount,retrogradeCount,missingIndexCount};
}

export function auditRouteIntegrity(result={},options={}){
 const route=result?.route||result||{},geometry=Array.isArray(route.geometry)?route.geometry:[],steps=Array.isArray(route.steps)?route.steps:[],notices=[];
 const thresholds={
  segmentWarningMeters:positive(options.segmentWarningMeters)||10000,
  segmentCriticalMeters:positive(options.segmentCriticalMeters)||30000,
  distanceWarningRatio:positive(options.distanceWarningRatio)||0.25,
  distanceCriticalRatio:positive(options.distanceCriticalRatio)||0.50,
  endpointWarningMeters:positive(options.endpointWarningMeters)||1000,
  endpointCriticalMeters:positive(options.endpointCriticalMeters)||5000,
  averageSpeedWarningMph:positive(options.averageSpeedWarningMph)||80,
  averageSpeedCriticalMph:positive(options.averageSpeedCriticalMph)||100,
  futureToleranceMs:positive(options.futureToleranceMs)||300000,
  staleWarningMs:positive(options.staleWarningMs)||3600000
 };

 const invalidPointCount=geometry.filter(point=>!validPoint(point)).length;
 const geometryMetrics=routeGeometryLength(geometry),reportedDistanceMeters=positive(route.distanceMeters),durationSeconds=positive(route.durationSeconds);
 const distanceDifferenceRatio=reportedDistanceMeters&&geometryMetrics.lengthMeters?Math.abs(reportedDistanceMeters-geometryMetrics.lengthMeters)/Math.max(reportedDistanceMeters,geometryMetrics.lengthMeters):1;
 const averageSpeedMph=durationSeconds>0?reportedDistanceMeters/durationSeconds*2.236936:null;
 const stepsAudit=stepMetrics(steps,geometry.length);
 const origin=stopPoint(result?.origin),destination=stopPoint(result?.destination),first=validPoint(geometry[0])?geometry[0]:null,last=validPoint(geometry.at?.(-1))?geometry.at(-1):null;
 const originDeltaMeters=origin&&first?Math.round(distanceMeters(origin,first)):null,destinationDeltaMeters=destination&&last?Math.round(distanceMeters(destination,last)):null;
 const calculatedAtMs=new Date(route.calculatedAt).valueOf(),now=Date.now(),routeAgeMs=Number.isFinite(calculatedAtMs)?now-calculatedAtMs:null;

 if(geometry.length<2)notices.push(notice('routeIntegrityGeometryMissing','The commercial provider returned fewer than two usable route points. Guidance is blocked.','critical'));
 if(invalidPointCount)notices.push(notice('routeIntegrityInvalidCoordinates',`The route contains ${invalidPointCount} invalid coordinate${invalidPointCount===1?'':'s'}. Guidance is blocked.`,'critical',{invalidPointCount}));
 if(geometryMetrics.maxGapMeters>thresholds.segmentCriticalMeters)notices.push(notice('routeIntegrityGeometryGap',`The route geometry jumps approximately ${geometryMetrics.maxGapMeters.toLocaleString()} m between adjacent points. This may indicate a corrupt or incomplete route response.`,'critical',{gapMeters:geometryMetrics.maxGapMeters,gapIndex:geometryMetrics.maxGapIndex}));
 else if(geometryMetrics.maxGapMeters>thresholds.segmentWarningMeters)notices.push(notice('routeIntegritySparseGeometry',`The route geometry contains an unusually large ${geometryMetrics.maxGapMeters.toLocaleString()} m point gap. Review the route line carefully while parked.`,'warning',{gapMeters:geometryMetrics.maxGapMeters,gapIndex:geometryMetrics.maxGapIndex}));

 if(reportedDistanceMeters<=0)notices.push(notice('routeIntegrityDistanceMissing','The provider route has no valid reported distance. Guidance is blocked.','critical'));
 if(durationSeconds<=0)notices.push(notice('routeIntegrityDurationMissing','The provider route has no valid travel duration. Guidance is blocked.','critical'));
 if(reportedDistanceMeters>0&&geometryMetrics.lengthMeters>0){
  if(distanceDifferenceRatio>thresholds.distanceCriticalRatio)notices.push(notice('routeIntegrityDistanceMismatch',`Reported route distance and decoded geometry differ by ${percent(distanceDifferenceRatio)}%. Guidance is blocked because the route response may be incomplete.`,'critical',{distanceDifferencePct:percent(distanceDifferenceRatio)}));
  else if(distanceDifferenceRatio>thresholds.distanceWarningRatio)notices.push(notice('routeIntegrityDistanceReview',`Reported route distance and decoded geometry differ by ${percent(distanceDifferenceRatio)}%. Review the full route line and maneuvers while parked.`,'warning',{distanceDifferencePct:percent(distanceDifferenceRatio)}));
 }

 if(Number.isFinite(averageSpeedMph)){
  if(averageSpeedMph>thresholds.averageSpeedCriticalMph)notices.push(notice('routeIntegrityImpossibleSpeed',`The route implies an average speed of ${Math.round(averageSpeedMph)} mph. Guidance is blocked because the distance or duration may be corrupt.`,'critical',{averageSpeedMph:Math.round(averageSpeedMph)}));
  else if(averageSpeedMph>thresholds.averageSpeedWarningMph)notices.push(notice('routeIntegrityHighAverageSpeed',`The route implies an unusually high average speed of ${Math.round(averageSpeedMph)} mph. Verify the route and ETA while parked.`,'warning',{averageSpeedMph:Math.round(averageSpeedMph)}));
 }

 if(!steps.length)notices.push(notice('routeIntegrityManeuversMissing','The provider route has no turn-by-turn maneuvers. Guidance is blocked.','critical'));
 if(stepsAudit.invalidIndexCount)notices.push(notice('routeIntegrityStepIndexInvalid',`${stepsAudit.invalidIndexCount} maneuver${stepsAudit.invalidIndexCount===1?'':'s'} point outside the decoded route geometry. Guidance is blocked.`,'critical',{invalidStepIndexCount:stepsAudit.invalidIndexCount}));
 if(stepsAudit.retrogradeCount)notices.push(notice('routeIntegrityStepOrderInvalid',`${stepsAudit.retrogradeCount} maneuver${stepsAudit.retrogradeCount===1?'':'s'} move backward through the route geometry. Guidance is blocked.`,'critical',{retrogradeStepCount:stepsAudit.retrogradeCount}));
 if(stepsAudit.missingIndexCount)notices.push(notice('routeIntegrityStepIndexMissing',`${stepsAudit.missingIndexCount} maneuver${stepsAudit.missingIndexCount===1?'':'s'} lack a route-geometry index. Review maneuver placement while parked.`,'warning',{missingStepIndexCount:stepsAudit.missingIndexCount}));

 for(const[role,delta]of[['origin',originDeltaMeters],['destination',destinationDeltaMeters]]){
  if(delta===null)continue;
  const label=role==='origin'?'origin':'destination';
  if(delta>thresholds.endpointCriticalMeters)notices.push(notice(`routeIntegrity${role==='origin'?'Origin':'Destination'}Mismatch`,`The route geometry begins or ends ${delta.toLocaleString()} m from the resolved ${label}. Guidance is blocked until the access point is corrected.`,'critical',{role,distanceMeters:delta}));
  else if(delta>thresholds.endpointWarningMeters)notices.push(notice(`routeIntegrity${role==='origin'?'Origin':'Destination'}AccessReview`,`The route geometry is ${delta.toLocaleString()} m from the resolved ${label}. Verify the correct gate, entrance and access road while parked.`,'warning',{role,distanceMeters:delta}));
 }

 if(!Number.isFinite(calculatedAtMs))notices.push(notice('routeIntegrityTimestampMissing','The route calculation time is missing or invalid. Guidance is blocked.','critical'));
 else if(calculatedAtMs-now>thresholds.futureToleranceMs)notices.push(notice('routeIntegrityFutureTimestamp','The route calculation time is in the future. Guidance is blocked until the device and server clocks are corrected.','critical'));
 else if(routeAgeMs>thresholds.staleWarningMs)notices.push(notice('routeIntegrityStaleRoute','The route response is more than one hour old. Calculate a fresh route before guidance.','warning',{routeAgeMinutes:Math.round(routeAgeMs/60000)}));
 if(!String(route.provider||'').trim())notices.push(notice('routeIntegrityProviderMissing','The route response does not identify its commercial routing provider. Review provenance before use.','warning'));

 const criticalNotices=notices.filter(item=>item.severity==='critical'||item.blocking===true);
 return{
  schema:AUDIT_VERSION,
  checkedAt:new Date().toISOString(),
  status:criticalNotices.length?'blocked':notices.length?'review':'clear',
  guidanceEligible:criticalNotices.length===0,
  metrics:{
   geometryPointCount:geometry.length,
   invalidPointCount,
   geometricLengthMeters:geometryMetrics.lengthMeters,
   reportedDistanceMeters,
   distanceDifferencePct:percent(distanceDifferenceRatio),
   maxSegmentGapMeters:geometryMetrics.maxGapMeters,
   averageSpeedMph:Number.isFinite(averageSpeedMph)?Math.round(averageSpeedMph*10)/10:null,
   originDeltaMeters,
   destinationDeltaMeters,
   routeAgeSeconds:routeAgeMs===null?null:Math.round(routeAgeMs/1000),
   ...stepsAudit
  },
  thresholds,
  notices,
  criticalNotices
 };
}

export function applyRouteIntegrityAudit(result={},options={}){
 const audit=auditRouteIntegrity(result,options),route=result?.route||{};
 const priorNotices=(route.notices||[]).filter(item=>item?.audit!=='route-integrity'),notices=[...priorNotices,...audit.notices];
 const criticalNotices=notices.filter(item=>item?.severity==='critical'||item?.blocking===true);
 return{
  ...result,
  route:{...route,notices,criticalNotices,integrityAudit:audit,guidanceEligible:Boolean(route.guidanceEligible)&&criticalNotices.length===0},
  integrityAudit:audit
 };
}
