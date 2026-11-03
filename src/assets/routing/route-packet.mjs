import{canonicalJson,sha256Hex}from'./route-safety-record.mjs';

const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const clone=value=>structuredClone(value);
const point=entry=>[Number(entry?.[0]),Number(entry?.[1])];

export async function createOfflineRoutePacket({route,origin,destination,profile,createdAt=new Date()}={}){
 if(!route?.safetyRecord?.recordId)throw Error('A route safety record is required before an offline packet can be created.');
 const payload={
  schema:'dl-offline-route-packet/v1',createdAt:new Date(createdAt).toISOString(),expiresAt:route.safetyRecord.expiresAt,
  safetyRecord:clone(route.safetyRecord),origin:clone(origin||{}),destination:clone(destination||{}),profile:clone(profile||route.profile||{}),
  route:{provider:clean(route.provider),calculatedAt:clean(route.calculatedAt),distanceMeters:Number(route.distanceMeters||0),durationSeconds:Number(route.durationSeconds||0),geometry:(route.geometry||[]).map(point),steps:clone(route.steps||[]),speedLimits:clone(route.speedLimits||[]),laneGuidance:clone(route.laneGuidance||[]),notices:clone(route.notices||[]),criticalNotices:clone(route.criticalNotices||[]),guidanceEligible:Boolean(route.guidanceEligible)}
 };
 const packetHash=await sha256Hex(payload);return{...payload,packetId:`dlrp_${packetHash.slice(0,24)}`,packetHash};
}

export async function validateOfflineRoutePacket(packet,{now=new Date(),requireAllowed=true}={}){
 const reasons=[];
 if(packet?.schema!=='dl-offline-route-packet/v1')reasons.push('Unsupported route-packet schema.');
 if(!packet?.packetHash)reasons.push('Route-packet hash is missing.');
 if(!packet?.safetyRecord?.recordId)reasons.push('Route safety record is missing.');
 if(!Array.isArray(packet?.route?.geometry)||packet.route.geometry.length<2)reasons.push('Route geometry is missing or incomplete.');
 if(!Array.isArray(packet?.route?.steps)||packet.route.steps.length<1)reasons.push('Turn-by-turn maneuvers are missing.');
 const expires=new Date(packet?.expiresAt||packet?.safetyRecord?.expiresAt||0);if(Number.isNaN(expires.valueOf())||expires<=new Date(now))reasons.push('The offline route packet is expired.');
 if(requireAllowed&&(packet?.safetyRecord?.decision!=='allowed'||packet?.route?.guidanceEligible!==true))reasons.push('The route packet is not approved for guidance.');
 if(packet?.packetHash){const copy=clone(packet);delete copy.packetHash;delete copy.packetId;const actual=await sha256Hex(copy);if(actual!==packet.packetHash)reasons.push('The route packet failed its integrity check.');}
 return{valid:reasons.length===0,reasons,packetId:clean(packet?.packetId),expiresAt:Number.isNaN(expires.valueOf())?'':expires.toISOString()};
}

export function routePacketFileName(packet){const id=clean(packet?.packetId||'route').replace(/[^a-z0-9_-]+/gi,'-');return`drivers-lounge-${id}.json`;}
export function serializeRoutePacket(packet){return`${canonicalJson(packet)}\n`;}
