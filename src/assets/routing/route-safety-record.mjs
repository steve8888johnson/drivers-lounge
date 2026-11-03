const textEncoder=new TextEncoder();
const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const round=(value,digits=6)=>{const number=Number(value);return Number.isFinite(number)?Number(number.toFixed(digits)):null;};

export function canonicalize(value){
 if(value===null||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(canonicalize);
 const object={};for(const key of Object.keys(value).sort()){const item=value[key];if(item!==undefined)object[key]=canonicalize(item);}return object;
}
export function canonicalJson(value){return JSON.stringify(canonicalize(value));}
export async function sha256Hex(value){
 const bytes=await globalThis.crypto.subtle.digest('SHA-256',textEncoder.encode(typeof value==='string'?value:canonicalJson(value)));
 return[...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
function stopSummary(stop={}){return{lat:round(stop.lat),lng:round(stop.lng),resultType:clean(stop.resultType||'location'),confidence:round(stop.confidence,4)};}
function noticeSummary(route={}){return(route.notices||[]).map(item=>({code:clean(item.code),severity:clean(item.severity),blocking:item.blocking===true,title:clean(item.title)}));}
function providerSummary(route={},crossCheck={}){return{primary:clean(route.provider),configured:Array.isArray(crossCheck.configuredProviders)?crossCheck.configuredProviders.map(item=>clean(item?.label||item)).filter(Boolean):Array.isArray(crossCheck.providers)?crossCheck.providers.map(clean).filter(Boolean):[],crossCheckStatus:clean(crossCheck.status||'unknown'),confidence:clean(crossCheck.confidence||'unknown')};}

export async function buildRouteSafetyRecord({input={},result={},policy={},now=new Date(),revision='unknown'}={}){
 const route=result.route||{},crossCheck=route.crossCheck||result.crossCheck||{},generatedAt=new Date(now),ttl=Math.max(5,Math.min(240,Number(policy.safetyRecordTtlMinutes||60))),expiresAt=new Date(generatedAt.getTime()+ttl*60000);
 const profile=route.profile||input.profile||{},geometry=Array.isArray(route.geometry)?route.geometry:[],steps=Array.isArray(route.steps)?route.steps:[];
 const profileHash=await sha256Hex(profile),geometryHash=await sha256Hex(geometry.map(point=>[round(point?.[0]),round(point?.[1])])),maneuverHash=await sha256Hex(steps.map(step=>({action:clean(step.action),instruction:clean(step.instruction),road:clean(step.road),geometryIndex:Number(step.geometryIndex),lengthMeters:Number(step.lengthMeters||0)})));
 const blockers=(route.criticalNotices||[]).map(item=>clean(item.code||item.title)).filter(Boolean),decision=Boolean(route.guidanceEligible)&&blockers.length===0?'allowed':'blocked';
 const core={
  schema:'dl-route-safety-record/v1',generatedAt:generatedAt.toISOString(),expiresAt:expiresAt.toISOString(),revision:clean(revision),decision,
  blockers,profileHash,routeHash:geometryHash,maneuverHash,
  origin:stopSummary(result.origin),destination:stopSummary(result.destination),
  route:{provider:clean(route.provider),distanceMeters:Math.round(Number(route.distanceMeters||0)),durationSeconds:Math.round(Number(route.durationSeconds||0)),calculatedAt:clean(route.calculatedAt),geometryPoints:geometry.length,stepCount:steps.length},
  verification:providerSummary(route,crossCheck),integrity:{status:clean(result.integrityAudit?.status||route.integrityAudit?.status||'unknown'),version:clean(result.integrityAudit?.version||route.integrityAudit?.version||'')},
  policy:{version:clean(route.policyDecision?.policyVersion||policy.version),environment:clean(route.policyDecision?.environment||policy.environment),requireCrossCheck:Boolean(route.policyDecision?.requireCrossCheck??policy.requireCrossCheck)},
  notices:noticeSummary(route)
 };
 const recordHash=await sha256Hex(core);
 return Object.freeze({...core,recordId:`dlrt_${recordHash.slice(0,24)}`,recordHash});
}

export async function attachRouteSafetyRecord(result,input,policy,options={}){
 const safetyRecord=await buildRouteSafetyRecord({input,result,policy,...options});
 return{...result,route:{...(result.route||{}),safetyRecord},safetyRecord};
}
