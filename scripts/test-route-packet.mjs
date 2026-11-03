import test from'node:test';
import assert from'node:assert/strict';
import{createOfflineRoutePacket,routePacketFileName,serializeRoutePacket,validateOfflineRoutePacket}from'../src/assets/routing/route-packet.mjs';

const safety={schema:'dl-route-safety-record/v1',recordId:'dlrt_test',recordHash:'a'.repeat(64),decision:'allowed',generatedAt:'2026-11-03T12:00:00.000Z',expiresAt:'2026-11-03T13:00:00.000Z'};
const route={provider:'TomTom',calculatedAt:'2026-11-03T12:00:00.000Z',distanceMeters:1000,durationSeconds:120,guidanceEligible:true,geometry:[[41,-104],[40,-104]],steps:[{instruction:'Continue',road:'I-25',geometryIndex:0}],notices:[],criticalNotices:[],safetyRecord:safety};

test('reviewed routes create verifiable offline packets',async()=>{
 const packet=await createOfflineRoutePacket({route,origin:{label:'A'},destination:{label:'B'},profile:{heightInches:162},createdAt:new Date('2026-11-03T12:00:00Z')});
 const validation=await validateOfflineRoutePacket(packet,{now:new Date('2026-11-03T12:30:00Z')});assert.equal(validation.valid,true);assert.match(packet.packetId,/^dlrp_/);assert.match(routePacketFileName(packet),/drivers-lounge-dlrp_/);assert.ok(serializeRoutePacket(packet).endsWith('\n'));
});

test('tampering, expiration and blocked decisions fail closed',async()=>{
 const packet=await createOfflineRoutePacket({route,createdAt:new Date('2026-11-03T12:00:00Z')});
 const tampered=structuredClone(packet);tampered.route.distanceMeters=9999;assert.equal((await validateOfflineRoutePacket(tampered,{now:new Date('2026-11-03T12:30:00Z')})).valid,false);
 assert.ok((await validateOfflineRoutePacket(packet,{now:new Date('2026-11-03T14:00:00Z')})).reasons.some(reason=>/expired/i.test(reason)));
 const blockedRoute={...route,guidanceEligible:false,safetyRecord:{...safety,decision:'blocked'}};const blocked=await createOfflineRoutePacket({route:blockedRoute,createdAt:new Date('2026-11-03T12:00:00Z')});assert.ok((await validateOfflineRoutePacket(blocked,{now:new Date('2026-11-03T12:30:00Z')})).reasons.some(reason=>/not approved/i.test(reason)));
});

test('packet creation requires a route safety record',async()=>{await assert.rejects(()=>createOfflineRoutePacket({route:{geometry:[[1,1],[2,2]],steps:[{}]}}),/safety record/i);});
