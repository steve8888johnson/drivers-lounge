import test from'node:test';
import assert from'node:assert/strict';
import{appendIncidentEvent,createIncidentEvent,sanitizeIncidentPosition,verifyIncidentChain}from'../src/assets/routing/route-incident-log.mjs';

test('incident positions are rounded and privacy fields are removed',async()=>{
 const event=await createIncidentEvent({routeId:'dlrt_1',type:'route-deviation',position:{coords:{latitude:39.1234567,longitude:-104.9876543,accuracy:12.34,speed:10}},details:{address:'private',vin:'secret',distanceMeters:144},at:new Date('2026-11-03T12:00:00Z')});
 assert.deepEqual(event.position,{lat:39.12346,lng:-104.98765,accuracyMeters:12.3,speedMph:22.4,heading:null});assert.equal(JSON.stringify(event).includes('private'),false);assert.equal(event.details.distanceMeters,144);
});

test('incident chain verifies and detects tampering',async()=>{
 let events=[];events=await appendIncidentEvent(events,{routeId:'r1',type:'route-reviewed',at:new Date('2026-11-03T12:00:00Z')});events=await appendIncidentEvent(events,{routeId:'r1',type:'guidance-started',at:new Date('2026-11-03T12:01:00Z')});
 assert.deepEqual(await verifyIncidentChain(events),{valid:true,count:2,lastHash:events[1].eventHash});
 const tampered=structuredClone(events);tampered[0].type='changed';assert.equal((await verifyIncidentChain(tampered)).valid,false);
});

test('position sanitizer tolerates missing values',()=>{assert.deepEqual(sanitizeIncidentPosition({}),{lat:null,lng:null,accuracyMeters:null,speedMph:null,heading:null});});
