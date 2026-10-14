import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTomTomRequest,reviewTomTomCandidate} from '../server/tomtom-candidate.mjs';
import {requestTomTomCandidate} from '../server/tomtom-routing.mjs';
import {vehicleFixture} from './fixtures/truck-axles.mjs';
import {tripFixture} from './fixtures/truck-geometry.mjs';

// Synthetic fixtures are not a drivable route or evidence of real coverage.
const now=Date.parse('2026-10-13T12:00:00Z');
const draft=()=>({vehicle:vehicleFixture(),...tripFixture(),departure:'2026-10-13T13:00:00.000Z',now});
const payload=()=>({report:{effectiveSettings:Object.entries({travelMode:'truck',vehicleCommercial:'true',vehicleHeight:'4.12',vehicleWidth:'2.6',vehicleLength:'21.95',vehicleWeight:'35381',vehicleAxleWeight:'7485',vehicleNumberOfAxles:'5'}).map(([key,value])=>({key,value}))},routes:[{
 summary:{lengthInMeters:111,travelTimeInSeconds:60,departureTime:'2026-10-13T13:00:00Z',arrivalTime:'2026-10-13T13:01:00Z'},
 legs:[{points:[{latitude:32,longitude:-102},{latitude:32.001,longitude:-102}]}],
 sections:[{sectionType:'TRAVEL_MODE',travelMode:'truck',startPointIndex:0,endPointIndex:1}]
}]});
const opts=extra=>({enabled:true,freePlanVerified:true,apiKey:'synthetic-test-only-secret',clock:()=>now,fetchImpl:async()=>Response.json(payload()),...extra});
const code=(result,name)=>result.reasons.some(reason=>reason.code===name);
const review=p=>{const d=draft(),r=prepareTomTomRequest(d);return reviewTomTomCandidate(p,{query:r.query,trip:d,departure:d.departure});};

test('TomTom requires explicit enablement, free-account evidence and a server key before any request',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw Error('must not send');};
 for(const [options,reason] of [[{fetchImpl},'CONNECTION_DISABLED'],[opts({fetchImpl,freePlanVerified:false}),'FREE_PLAN_NOT_VERIFIED'],[opts({fetchImpl,apiKey:''}),'PROVIDER_NOT_CONFIGURED'],[opts({fetchImpl,timeoutMs:10001}),'INVALID_SERVER_LIMITS'],[opts({fetchImpl,maxBytes:1048577}),'INVALID_SERVER_LIMITS']]){
  const r=await requestTomTomCandidate(draft(),options);assert(code(r,reason));assert.equal(r.guidanceAllowed,false);
 }assert.equal(calls,0);
});
test('TomTom uses a fixed truck endpoint, measured metric dimensions, actual weight and maximum individual axle',()=>{
 const r=prepareTomTomRequest(draft()),q=new URLSearchParams(r.query);
 assert.equal(r.endpoint,'https://api.tomtom.com/routing/1/calculateRoute/32,-102:32.001,-102/json');
 for(const [key,value] of Object.entries({travelMode:'truck',vehicleCommercial:'true',vehicleHeight:'4.12',vehicleWidth:'2.6',vehicleLength:'21.95',vehicleWeight:'35381',vehicleAxleWeight:'7485',vehicleNumberOfAxles:'5',departAt:'2026-10-13T13:00:00.000Z',maxAlternatives:'0',report:'effectiveSettings',sectionType:'travelMode'}))assert.equal(q.get(key),value,key);
 assert.deepEqual(q.getAll('avoid'),['unpavedRoads','ferries']);assert.equal(q.has('key'),false);assert.equal(r.guidanceAllowed,false);
});

test('accidental outer key whitespace is trimmed, while empty or internally split keys never send',async()=>{
 let calls=0;
 const fetchImpl=async url=>{calls++;assert.equal(url.searchParams.get('key'),'synthetic-test-only-secret');return Response.json(payload());};
 for(const apiKey of [' synthetic-test-only-secret ','\r\nsynthetic-test-only-secret\t','\u00a0synthetic-test-only-secret\u00a0']){
  const r=await requestTomTomCandidate(draft(),opts({apiKey,fetchImpl}));
  assert.equal(r.structurePassed,true);assert.equal(r.guidanceAllowed,false);assert(!JSON.stringify(r).includes('synthetic-test-only-secret'));
 }
 assert.equal(calls,3);
 for(const apiKey of [' \r\n\t','synthetic test-only-secret',null,{}]){
  const r=await requestTomTomCandidate(draft(),opts({apiKey,fetchImpl}));assert(code(r,'PROVIDER_NOT_CONFIGURED'));
 }
 assert.equal(calls,3);
});
test('oversize, hazmat, unmeasured, stale and overloaded vehicles never reach TomTom',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;return Response.json(payload());};
 for(const change of [d=>d.vehicle.oversize=true,d=>d.vehicle.hazmat=true,d=>d.vehicle.heightCm=0,d=>d.vehicle.confirmed=false,d=>delete d.vehicle.axleMeasurement,d=>d.vehicle.axleMeasurement.unchangedSinceWeighing=false,d=>d.vehicle.axleMeasurement.measuredAt='2026-10-01T10:00:00.000Z',d=>delete d.vehicle.equipment,d=>d.vehicle.equipment.axles[0].gawrLb=11000,d=>d.departure='any',d=>d.origin.lat='32',d=>d.destination={...d.origin}]){
  const d=draft();change(d);const r=await requestTomTomCandidate(d,opts({fetchImpl}));assert(code(r,'INVALID_TRUCK_OR_TRIP'));
 }assert.equal(calls,0);
});
test('successful TomTom transport never releases geometry, credentials, legal clearance or guidance',async()=>{
 let calls=0;const r=await requestTomTomCandidate(draft(),opts({fetchImpl:async(url,init)=>{
  calls++;assert.equal(url.origin,'https://api.tomtom.com');assert.equal(url.searchParams.get('travelMode'),'truck');assert.equal(url.searchParams.get('key'),'synthetic-test-only-secret');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(init.method,'GET');return Response.json(payload());
 }}));
 assert.equal(calls,1);assert.equal(r.structurePassed,true);assert.equal(r.status,'HOLD');assert.equal(r.guidanceAllowed,false);
 assert(code(r,'AUTHORITATIVE_RESTRICTIONS_AND_ENTRANCES_UNVERIFIED'));assert(code(r,'AXLE_GROUP_AND_CONFIGURATION_COVERAGE_UNVERIFIED'));
 for(const text of ['synthetic-test-only-secret','latitude','points','query','api.tomtom.com'])assert.equal(JSON.stringify(r).includes(text),false);
});
test('free quota, rejection and unavailable responses stop once without paid or car fallback',async()=>{
 for(const [status,reason] of [[429,'FREE_QUOTA_OR_RATE_LIMIT'],[401,'PROVIDER_ACCESS_REJECTED'],[403,'PROVIDER_ACCESS_REJECTED'],[500,'PROVIDER_UNAVAILABLE'],[302,'PROVIDER_UNAVAILABLE']]){
  let calls=0;const r=await requestTomTomCandidate(draft(),opts({fetchImpl:async()=>{calls++;return new Response('private provider diagnostic',{status});}}));assert.equal(calls,1);assert(code(r,reason));assert(!JSON.stringify(r).includes('private provider diagnostic'));
 }
 const r=await requestTomTomCandidate(draft(),opts({fetchImpl:async()=>{throw Error('synthetic-test-only-secret');}}));assert(code(r,'PROVIDER_UNAVAILABLE'));assert(!JSON.stringify(r).includes('synthetic-test-only-secret'));
});
test('malformed JSON, encoding, content type and oversized bodies are rejected',async()=>{
 const cases=[
  [()=>new Response('{}'),'INVALID_PROVIDER_RESPONSE'],
  [()=>new Response('{bad',{headers:{'content-type':'application/json'}}),'INVALID_PROVIDER_RESPONSE'],
  [()=>new Response(Uint8Array.from([123,34,120,34,58,34,255,34,125]),{headers:{'content-type':'application/json'}}),'INVALID_PROVIDER_RESPONSE'],
  [()=>new Response('{}',{headers:{'content-type':'application/json','content-length':'9999999'}}),'RESPONSE_TOO_LARGE'],
  [()=>new Response(' '.repeat(1048577),{headers:{'content-type':'application/json'}}),'RESPONSE_TOO_LARGE']
 ];
 for(const [response,reason] of cases){const r=await requestTomTomCandidate(draft(),opts({fetchImpl:async()=>response()}));assert(code(r,reason));}
});
test('timeouts and expired requests hold, abort and never retry',async()=>{
 let calls=0,signal;const r=await requestTomTomCandidate(draft(),opts({timeoutMs:10,fetchImpl:async(url,init)=>{calls++;signal=init.signal;return new Promise(()=>{});}}));assert(code(r,'PROVIDER_TIMEOUT'));assert.equal(calls,1);assert.equal(signal.aborted,true);
 let clock=now;const expired=await requestTomTomCandidate(draft(),opts({clock:()=>clock,fetchImpl:async()=>{clock+=10000;return Response.json(payload());}}));assert(code(expired,'REQUEST_EXPIRED'));
});
test('a changed trip, vehicle, load or equipment cannot reuse an earlier response',async()=>{
 for(const change of [d=>d.destination.lat+=.001,d=>d.departure='2026-10-13T14:00:00.000Z',d=>d.vehicle.heightCm++,d=>d.vehicle.axleMeasurement.axles[4].positionIn+=12,d=>d.vehicle.axleMeasurement.loadReference='another-load',d=>d.vehicle.equipment.axles[0].tires[0].coldPsi=101]){
  const changed=draft();change(changed);const r=await requestTomTomCandidate(draft(),opts({currentInput:()=>changed}));assert(code(r,'REQUEST_CHANGED'));
 }
});
test('missing, mismatched or duplicated effective truck settings fail structural review',()=>{
 for(const change of [p=>delete p.report,p=>p.report.effectiveSettings[0].value='car',p=>p.report.effectiveSettings[4].value='0',p=>p.report.effectiveSettings.push(p.report.effectiveSettings[0]),p=>p.report.effectiveSettings[7].value='4',p=>p.report.effectiveSettings[7].value='0x5']){
  const p=payload();change(p);const r=review(p);assert.equal(r.structurePassed,false);assert(r.reasons.some(x=>x.code.startsWith('EFFECTIVE_')));
 }
});
test('provider errors, ambiguous candidates, warnings and non-truck or missing sections hold',()=>{
 for(const [change,reason] of [
  [p=>p.error='unavailable','PROVIDER_ERROR'],[p=>p.routes.push(structuredClone(p.routes[0])),'SINGLE_CANDIDATE_REQUIRED'],
  [p=>p.routes[0].legs.push(p.routes[0].legs[0]),'SINGLE_LEG_REQUIRED'],
  [p=>p.routes[0].legs[0].warnings=['restriction'],'PROVIDER_WARNING_REQUIRES_REVIEW'],
  [p=>p.routes[0].sections[0].travelMode='car','NON_TRUCK_SECTION'],
  [p=>p.routes[0].sections[0].travelMode='other','NON_TRUCK_SECTION'],
  [p=>p.routes[0].sections=[],'TRUCK_SECTION_COVERAGE_MISSING'],
  [p=>p.routes[0].sections[0].startPointIndex=1,'TRUCK_SECTION_COVERAGE_MISSING'],
  [p=>p.routes[0].sections[0].sectionType='UNKNOWN','UNREVIEWED_SECTION_TYPE']]){
  const p=payload();change(p);const r=review(p);assert(code(r,reason));assert.equal(r.structurePassed,false);
 }
});
test('corrupt geometry, endpoint mismatch, discontinuity and false length fail review',()=>{
 for(const [change,reason] of [
  [p=>p.routes[0].legs[0].points[0].latitude='32','GEOMETRY_INVALID'],
  [p=>p.routes[0].legs[0].points[0].latitude=91,'GEOMETRY_INVALID'],
  [p=>p.routes[0].legs[0].points[0].latitude=32.01,'GEOMETRY_ENDPOINT_MISMATCH'],
  [p=>p.routes[0].legs[0].points.splice(1,0,{latitude:33,longitude:-102}),'GEOMETRY_GAP'],
  [p=>p.routes[0].summary.lengthInMeters=20000,'GEOMETRY_LENGTH_MISMATCH']]){
  const p=payload();change(p);const r=review(p);assert(code(r,reason));assert.equal(r.structurePassed,false);
 }
});
test('timezones must be explicit, dates real and elapsed duration consistent',()=>{
 for(const change of [s=>s.departureTime='2026-10-13T13:00:00',s=>s.arrivalTime='2026-02-30T13:01:00Z',s=>s.arrivalTime='2026-10-13T13:01:00+25:00',s=>s.arrivalTime='2026-10-13T13:00:00Z',s=>s.travelTimeInSeconds=3600,s=>s.travelTimeInSeconds='60']){
  const p=payload();change(p.routes[0].summary);const r=review(p);assert(code(r,'TRIP_TIME_MISMATCH'));assert.equal(r.structurePassed,false);
 }
 const p=payload();p.routes[0].summary.departureTime='2026-10-13T07:00:00-06:00';p.routes[0].summary.arrivalTime='2026-10-13T07:01:00-06:00';assert.equal(review(p).structurePassed,true);
});
