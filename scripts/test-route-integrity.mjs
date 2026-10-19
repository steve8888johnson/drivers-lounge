import test from'node:test';
import assert from'node:assert/strict';
import{distanceMeters}from'../src/assets/routing/core.mjs';
import{applyRouteIntegrityAudit,auditRouteIntegrity}from'../src/assets/routing/route-integrity.mjs';

const geometry=[[40,-105],[40,-104.99],[40,-104.98],[40,-104.97]];
const geometricLength=Math.round(geometry.slice(1).reduce((sum,point,index)=>sum+distanceMeters(geometry[index],point),0));
const result=(overrides={})=>({
 origin:{lat:geometry[0][0],lng:geometry[0][1],label:'Exact origin'},
 destination:{lat:geometry.at(-1)[0],lng:geometry.at(-1)[1],label:'Exact destination'},
 route:{
  provider:'Commercial Provider',calculatedAt:new Date().toISOString(),guidanceEligible:true,
  distanceMeters:geometricLength,durationSeconds:180,
  geometry,
  steps:[
   {instruction:'Depart',road:'I-25',geometryIndex:0},
   {instruction:'Continue',road:'I-25',geometryIndex:2},
   {instruction:'Arrive',road:'I-25',geometryIndex:3}
  ],
  notices:[],criticalNotices:[],...overrides
 }
});

test('coherent route response passes integrity audit',()=>{
 const audit=auditRouteIntegrity(result());
 assert.equal(audit.status,'clear');
 assert.equal(audit.guidanceEligible,true);
 assert.equal(audit.criticalNotices.length,0);
 assert.equal(audit.metrics.geometryPointCount,4);
 assert.ok(audit.metrics.distanceDifferencePct<1);
});

test('corrupt geometry gap and invalid coordinates block guidance',()=>{
 const corrupt=result({geometry:[[40,-105],[40,-104.99],[40,-70],[999,-104]],distanceMeters:geometricLength});
 const audit=auditRouteIntegrity(corrupt);
 assert.equal(audit.status,'blocked');
 assert.ok(audit.criticalNotices.some(item=>item.code==='routeIntegrityInvalidCoordinates'));
 assert.ok(audit.criticalNotices.some(item=>item.code==='routeIntegrityGeometryGap'));
});

test('large decoded-distance mismatch blocks and moderate mismatch warns',()=>{
 const blocked=auditRouteIntegrity(result({distanceMeters:geometricLength*3}));
 assert.ok(blocked.criticalNotices.some(item=>item.code==='routeIntegrityDistanceMismatch'));
 const review=auditRouteIntegrity(result({distanceMeters:Math.round(geometricLength*1.4)}));
 assert.equal(review.status,'review');
 assert.equal(review.criticalNotices.length,0);
 assert.ok(review.notices.some(item=>item.code==='routeIntegrityDistanceReview'));
});

test('endpoint mismatch and retrograde maneuver order block guidance',()=>{
 const bad=result({steps:[{geometryIndex:0},{geometryIndex:3},{geometryIndex:1}]});
 bad.destination={lat:41,lng:-103};
 const audit=auditRouteIntegrity(bad);
 assert.ok(audit.criticalNotices.some(item=>item.code==='routeIntegrityDestinationMismatch'));
 assert.ok(audit.criticalNotices.some(item=>item.code==='routeIntegrityStepOrderInvalid'));
});

test('impossible average speed and future timestamp block guidance',()=>{
 const audit=auditRouteIntegrity(result({durationSeconds:20,calculatedAt:new Date(Date.now()+10*60*1000).toISOString()}));
 assert.ok(audit.criticalNotices.some(item=>item.code==='routeIntegrityImpossibleSpeed'));
 assert.ok(audit.criticalNotices.some(item=>item.code==='routeIntegrityFutureTimestamp'));
});

test('missing route fundamentals fail closed',()=>{
 const audit=auditRouteIntegrity({route:{provider:'',calculatedAt:'invalid',guidanceEligible:true,distanceMeters:0,durationSeconds:0,geometry:[],steps:[]}});
 for(const code of['routeIntegrityGeometryMissing','routeIntegrityDistanceMissing','routeIntegrityDurationMissing','routeIntegrityManeuversMissing','routeIntegrityTimestampMissing'])assert.ok(audit.criticalNotices.some(item=>item.code===code),`missing ${code}`);
});

test('applying audit preserves provider notices and prevents duplicate integrity notices',()=>{
 const initial=result({notices:[{code:'providerNotice',title:'Provider information',severity:'info'}]});
 const first=applyRouteIntegrityAudit(initial);
 assert.equal(first.route.notices[0].code,'providerNotice');
 assert.equal(first.route.guidanceEligible,true);
 const second=applyRouteIntegrityAudit(first);
 assert.equal(second.route.notices.filter(item=>item.audit==='route-integrity').length,first.route.notices.filter(item=>item.audit==='route-integrity').length);
});
