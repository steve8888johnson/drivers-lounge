import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context=vm.createContext({URL});
vm.runInContext(readFileSync('src/assets/truck-route-readiness.js','utf8'),context);
const {assess,checks}=context.DLTruckRouteReadiness;
function fixture(){
 const profile={heightIn:162,widthIn:102,lengthFt:72,grossWeightLb:80000,axleCount:5,confirmed:true,oversize:false,hazmat:false,revision:'v1'};
 const evidence=Object.fromEntries(checks.map(kind=>[kind,{status:'supported',sourceType:'directed-restriction-record',coverage:'complete',sourceRecordId:'synthetic-record-'+kind,observedAt:'2026-10-13T11:00:00Z',sourceUrl:'https://example.gov/test-fixture',authority:'TEST ONLY',version:'fixture-v1',routeId:'r1',profileRevision:'v1',segmentId:'east-1',checkedAt:'2026-10-13T12:00:00Z',validFrom:'2026-10-13T00:00:00Z',validUntil:'2026-10-14T00:00:00Z'}]));
 return {profile,now:Date.parse('2026-10-13T13:00:00Z'),route:{id:'r1',profileRevision:'v1',providerMode:'truck',departure:'2026-10-13T14:00:00Z',arrival:'2026-10-13T18:00:00Z',segments:[{id:'east-1',evidence}]}};
}
test('complete synthetic evidence still cannot authorize guidance',()=>{
 const result=assess(fixture());assert.equal(result.status,'REVIEW_REQUIRED');assert.equal(result.guidanceAllowed,false);
});
test('every evidence category is required on every segment',()=>{
 for(const kind of checks){const input=fixture();delete input.route.segments[0].evidence[kind];assert.equal(assess(input).status,'HOLD',kind);}
 const input=fixture();input.route.segments.push({id:'last-mile'});assert.equal(assess(input).status,'HOLD');
});
test('changed vehicle, reroute, direction, conflicts and car fallback are held',()=>{
 const mutations=[i=>i.profile.revision='v2',i=>i.route.id='rerouted',i=>i.route.segments[0].id='west-1',i=>i.route.providerMode='car',i=>i.route.segments[0].evidence.truckAccess.status='conflicting',i=>i.route.segments[0].evidence.weight.status='restricted',i=>i.route.segments.push(i.route.segments[0])];
 for(const mutate of mutations){const input=fixture();mutate(input);assert.equal(assess(input).status,'HOLD');}
});
test('expired, future, timezone-free and mid-trip expiring evidence are held',()=>{
 for(const [key,value] of [['validUntil','2026-10-13T17:00:00Z'],['validUntil','2026-10-13T18:00:00Z'],['checkedAt','2026-10-14T00:00:00Z'],['validFrom','2026-10-13T15:00:00Z'],['checkedAt','2026-10-13T12:00:00'],['validUntil','garbage']]){
 const input=fixture();input.route.segments[0].evidence.clearance[key]=value;assert.equal(assess(input).status,'HOLD');}
});
test('bad measurements, unconfirmed presets, hazmat and oversize stay held',()=>{
 for(const [key,value] of [['heightIn',0],['widthIn',NaN],['grossWeightLb','80000'],['lengthFt',-1],['axleCount',2.5],['confirmed',false],['hazmat',true],['oversize',true]]){
 const input=fixture();input.profile[key]=value;assert.equal(assess(input).status,'HOLD');}
 for(const input of [null,{},undefined])assert.equal(assess(input).status,'HOLD');
});
test('unattributed evidence and past trips stay held',()=>{
 for(const mutate of [i=>i.route.segments[0].evidence.weight.sourceUrl='http://example.gov',i=>i.route.segments[0].evidence.weight.version='',i=>i.route.departure='2026-10-12T14:00:00Z',i=>i.route.arrival='2026-10-13T13:30:00Z']){
 const input=fixture();mutate(input);assert.equal(assess(input).status,'HOLD');}
});
test('impossible calendar dates, ambiguous times and unbounded evidence stay held',()=>{
 for(const invalid of ['2026-02-30T12:00:00Z','2026-02-29T12:00:00Z','2026-04-31T12:00:00Z','2026-10-13T24:00:00Z','2026-10-13T12:00:00-00:00','2026-10-13T12:00:00+14:01','October 13, 2026 12:00:00Z']){
  const input=fixture();input.route.segments[0].evidence.clearance.checkedAt=invalid;
  assert.equal(assess(input).status,'HOLD',invalid);
 }
 const input=fixture();input.route.segments=Array(1001).fill(input.route.segments[0]);
 assert.equal(assess(input).status,'HOLD');
});
test('equivalent explicit UTC offsets remain comparable without host timezone assumptions',()=>{
 const input=fixture();input.route.departure='2026-10-13T08:00:00-06:00';input.route.arrival='2026-10-13T14:00:00-04:00';
 assert.equal(assess(input).status,'REVIEW_REQUIRED');
});
test('official directory URLs, bridge points and partial feeds cannot become clearance records',()=>{
 for(const change of [e=>e.sourceType='directory',e=>e.sourceType='bridge-inventory-point',e=>delete e.sourceType,e=>e.coverage='partial',e=>e.coverage='unknown',e=>e.sourceRecordId='']){const i=fixture();const e=i.route.segments[0].evidence.clearance;e.sourceUrl='https://geo.dot.gov/server/rest/services/Hosted/National_Bridge_Inventory/FeatureServer/0';change(e);const r=assess(i);assert.equal(r.status,'HOLD');assert(r.issues.some(x=>x.code==='COVERAGE_UNVERIFIED'));}
});
test('a new page-fetch date cannot refresh old, missing, future or mid-trip expiring road observations',()=>{
 for(const observedAt of ['2023-06-15T00:00:00Z',undefined,'2026-10-13T12:30:00Z','2026-10-12T13:00:00Z','2026-10-12T18:00:00Z']){const i=fixture();i.route.segments[0].evidence.closures.observedAt=observedAt;const r=assess(i);assert.equal(r.status,'HOLD');assert(r.issues.some(x=>x.code==='SOURCE_OBSERVATION_STALE'));}
 const i=fixture();i.route.segments[0].evidence.weight.sourceUrl='https://user:secret@example.gov/record';assert.equal(assess(i).status,'HOLD');
});
