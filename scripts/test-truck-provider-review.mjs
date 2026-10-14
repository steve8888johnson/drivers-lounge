import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewHereCandidate,prepareHereRequest} from '../src/assets/truck-provider-review.mjs';
const request={fingerprint:'route-and-profile-v1',transportMode:'truck',scope:'standard-nonhazmat',createdAt:100,expiresAt:200};
const current={fingerprint:request.fingerprint,now:150};
const candidate=()=>({routes:[{id:'r1',sections:[{id:'s1',transport:{mode:'truck'},polyline:'synthetic-not-decoded'}]}]});
const review=p=>reviewHereCandidate(p,request,current);
const draft=()=>({vehicle:{confirmed:true,oversize:false,hazmat:false,heightCm:412,widthCm:260,lengthCm:2195,currentWeightKg:36000,grossWeightKg:40000,axleGroups:[{type:'single',weightKg:6000},{type:'tandem',weightKg:15000},{type:'tandem',weightKg:15000}]},origin:{lat:32,lng:-102},destination:{lat:33,lng:-84},departure:'2026-10-15T12:00:00.000Z',now:Date.parse('2026-10-13T12:00:00Z')});
test('request preparation preserves explicit dimensions and distinct weight meanings',()=>{
 const result=prepareHereRequest(draft()),q=new URLSearchParams(result.query);
 assert.equal(q.get('vehicle[currentWeight]'),'36000');assert.equal(q.get('vehicle[grossWeight]'),'40000');
 assert.equal(q.get('vehicle[weightPerAxleGroup]'),'single:6000,tandem:15000');assert.equal(q.get('transportMode'),'truck');
 assert.equal(q.has('apiKey'),false);assert.equal(result.networkEnabled,false);
});
test('request preparation rejects defaults, inconsistent axle groups and timeless routes',()=>{
 for(const mutate of [i=>delete i.vehicle.heightCm,i=>i.vehicle.widthCm='260',i=>i.vehicle.axleGroups[0].weightKg=1,i=>i.vehicle.hazmat=true,i=>i.vehicle.currentWeightKg=50000,i=>i.departure='any',i=>i.departure='2026-02-30T12:00:00.000Z',i=>i.origin.lat=NaN]){
 const i=draft();mutate(i);assert.throws(()=>prepareHereRequest(i));}
});
test('provider route never grants driving authorization or returns geometry',()=>{
 const result=review(candidate());assert.equal(result.status,'REVIEW_REQUIRED');assert.equal(result.guidanceAllowed,false);assert.equal(result.polyline,undefined);
});
test('info-severity state-wide violation blocks the candidate',()=>{
 const p=candidate();p.routes[0].sections[0].notices=[{code:'violatedAdminWideVehicleRestriction',severity:'info'}];
 assert.equal(review(p).status,'HOLD');assert.equal(review(p).reasons[0].code,'RESTRICTION_VIOLATION');
});
test('unknown or malformed notices never disappear at any response level',()=>{
 for(const level of ['root','route','section'])for(const notice of [[{code:'newNotice',severity:'info'}],{},[null]]){
 const p=candidate();(level==='root'?p:level==='route'?p.routes[0]:p.routes[0].sections[0]).notices=notice;assert.equal(review(p).status,'HOLD');}
});
test('missing routes, alternatives, car sections and missing geometry block',()=>{
 for(const mutate of [p=>p.routes=[],p=>p.routes.push(p.routes[0]),p=>p.routes[0].sections[0].transport.mode='car',p=>delete p.routes[0].sections[0].polyline,p=>p.routes[0].sections.push(p.routes[0].sections[0]),p=>p.routes[0].sections=[null],p=>p.error='denied']){
 const p=candidate();mutate(p);assert.equal(review(p).status,'HOLD');}
 assert.equal(review(null).status,'HOLD');
});
test('late result after a changed vehicle or trip is unusable',()=>{
 for(const c of [{...current,fingerprint:'changed'}, {...current,now:200},{...current,now:99}])assert.equal(reviewHereCandidate(candidate(),request,c).status,'HOLD');
 for(const r of [{...request,transportMode:'car'},{...request,scope:'oversize'},{...request,fingerprint:''}])assert.equal(reviewHereCandidate(candidate(),r,current).status,'HOLD');
});
