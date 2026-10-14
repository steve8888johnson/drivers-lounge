import test from 'node:test';import assert from 'node:assert/strict';
import {requestTruckCandidate} from '../server/truck-routing.mjs';
import {sectionFixture,tripFixture} from './fixtures/truck-geometry.mjs';
import {vehicleFixture,equipmentFixture} from './fixtures/truck-axles.mjs';
const now=Date.parse('2026-10-13T12:00:00Z');
const draft=()=>({vehicle:vehicleFixture(),...tripFixture(),departure:'2026-10-13T13:00:00.000Z'});
const payload=()=>({routes:[{id:'r',sections:[sectionFixture()]}]});
const opts=extra=>({enabled:true,apiKey:'test-only',clock:()=>now,fetchImpl:async()=>Response.json(payload()),...extra});
test('server connection is off by default and invalid profiles never send',async()=>{let calls=0;const fetchImpl=async()=>{calls++;throw Error('no');};assert.equal((await requestTruckCandidate(draft(),{fetchImpl})).status,'HOLD');await requestTruckCandidate({},opts({fetchImpl}));assert.equal(calls,0);});
test('fixed truck request never follows redirects or returns geometry',async()=>{const r=await requestTruckCandidate(draft(),opts({fetchImpl:async(url,init)=>{assert.equal(url.origin,'https://router.hereapi.com');assert.equal(url.searchParams.get('transportMode'),'truck');assert.equal(init.redirect,'error');return Response.json(payload());}}));assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.guidanceAllowed,false);assert.equal(r.polyline,undefined);assert(!JSON.stringify(r).includes('test-only'));});
test('server holds malformed, oversized, throttled and timed-out responses without retry',async()=>{for(const fetchImpl of [async()=>new Response('x',{status:429}),async()=>new Response('bad',{headers:{'content-type':'application/json'}}),async()=>Response.json(payload()),()=>new Promise(()=>{})]){let calls=0;const r=await requestTruckCandidate(draft(),opts({maxBytes:8,timeoutMs:15,fetchImpl:(...a)=>{calls++;return fetchImpl(...a);}}));assert.equal(r.status,'HOLD');assert.equal(calls,1);}});
test('changed truck and provider violations hold even after successful transport',async()=>{let changed=draft();changed.vehicle.heightCm++;assert.equal((await requestTruckCandidate(draft(),opts({currentInput:()=>changed}))).status,'HOLD');const p=payload();p.routes[0].notices=[{code:'violatedRestriction',severity:'info'}];assert.equal((await requestTruckCandidate(draft(),opts({fetchImpl:async()=>Response.json(p)}))).status,'HOLD');});
test('successful HTTP response with wrong or broken geometry cannot escape review',async()=>{
 for(const change of [p=>p.routes[0].sections[0].polyline='synthetic',p=>p.routes[0].sections[0]=sectionFixture('wrong',33,33.001)]){
  const p=payload();change(p);
  const result=await requestTruckCandidate(draft(),opts({fetchImpl:async()=>Response.json(p)}));
  assert.equal(result.status,'HOLD');assert.equal(result.guidanceAllowed,false);
  assert(result.reasons.some(reason=>reason.code.startsWith('GEOMETRY_')));
 }
 const changed=draft();changed.destination.lat=33;
 const result=await requestTruckCandidate(draft(),opts({currentInput:()=>changed}));
 assert(result.reasons.some(reason=>reason.code==='REQUEST_CHANGED'));
});
test('malformed UTF-8 is not repaired into a valid provider response',async()=>{
 const data=Buffer.from(JSON.stringify(payload()));
 // A bad byte inside the route id would previously become a replacement character.
 const index=data.indexOf(Buffer.from('"id":"r"'))+6;data[index]=255;
 const result=await requestTruckCandidate(draft(),opts({fetchImpl:async()=>new Response(data,{headers:{'content-type':'application/json'}})}));
 assert.equal(result.status,'HOLD');assert.equal(result.reasons[0].code,'INVALID_PROVIDER_RESPONSE');
});
test('missing axle evidence never sends; changed axle spacing invalidates a late response',async()=>{
 let calls=0;const bad=draft();delete bad.vehicle.axleMeasurement;
 const result=await requestTruckCandidate(bad,opts({fetchImpl:async()=>{calls++;return Response.json(payload());}}));
 assert.equal(result.status,'HOLD');assert.equal(calls,0);
 const changed=draft();changed.vehicle.axleMeasurement.axles[4].positionIn+=12;
 const late=await requestTruckCandidate(draft(),opts({currentInput:()=>changed}));
 assert.equal(late.status,'HOLD');assert.equal(late.reasons[0].code,'REQUEST_CHANGED');
});
test('changed load reference or weighing time rejects a late response',async()=>{
 for(const change of [m=>m.loadReference='new-load',m=>m.measuredAt='2026-10-13T11:00:00.000Z',m=>m.unchangedSinceWeighing=false]){const changed=draft();change(changed.vehicle.axleMeasurement);const r=await requestTruckCandidate(draft(),opts({currentInput:()=>changed}));assert.equal(r.status,'HOLD');assert.equal(r.reasons[0].code,'REQUEST_CHANGED');}
});
test('a load review expiring during transport is rejected and stale loads never send',async()=>{
 let clock=now,calls=0;const d=draft();d.departure=new Date(now+500).toISOString();d.vehicle.axleMeasurement.measuredAt=new Date(now-86400000+1000).toISOString();
 d.vehicle.equipment=equipmentFixture(d.vehicle.axleMeasurement);
 const r=await requestTruckCandidate(d,opts({clock:()=>clock,fetchImpl:async()=>{calls++;clock+=1000;return Response.json(payload());}}));assert.equal(r.status,'HOLD');assert.equal(calls,1);
 calls=0;await requestTruckCandidate(d,opts({clock:()=>clock,fetchImpl:async()=>{calls++;return Response.json(payload());}}));assert.equal(calls,0);
});
test('missing or exceeded equipment limits prevent transport; changed ratings hold late results',async()=>{
 for(const change of [d=>delete d.vehicle.equipment,d=>d.vehicle.equipment.axles[0].gawrLb=11000,d=>d.vehicle.equipment.axles[0].tires[0].coldPsi=80]){const d=draft();change(d);let calls=0;const r=await requestTruckCandidate(d,opts({fetchImpl:async()=>{calls++;return Response.json(payload());}}));assert.equal(r.status,'HOLD');assert.equal(calls,0);}
 const changed=draft();changed.vehicle.equipment.axles[0].tires[0].coldPsi=101;
 const r=await requestTruckCandidate(draft(),opts({currentInput:()=>changed}));assert.equal(r.status,'HOLD');assert.equal(r.reasons[0].code,'REQUEST_CHANGED');
});
