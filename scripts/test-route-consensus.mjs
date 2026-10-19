import test from'node:test';
import assert from'node:assert/strict';
import{applyRouteConsensus,compareCommercialRoutes}from'../src/assets/routing/route-consensus.mjs';

const route=(provider,geometry,overrides={})=>({
 provider,guidanceEligible:true,distanceMeters:100000,durationSeconds:5400,geometry,
 steps:[{road:'I-25',instruction:'Continue on I-25',geometryIndex:0},{road:'I-70',instruction:'Continue on I-70',geometryIndex:geometry.length-1}],
 notices:[],criticalNotices:[],...overrides
});
const line=[[41.14,-104.82],[40.6,-104.9],[40.0,-104.95],[39.78,-104.85]];

test('closely aligned professional routes remain eligible after cross-check',()=>{
 const secondary=line.map(([lat,lng],index)=>[lat+(index?0.0004:0),lng+(index?0.0004:0)]);
 const comparison=compareCommercialRoutes(route('HERE',line),route('TomTom',secondary,{distanceMeters:103000,durationSeconds:5600}));
 assert.equal(comparison.status,'aligned');
 assert.equal(comparison.guidanceEligible,true);
 assert.equal(comparison.notice.blocking,false);
 assert.ok(comparison.metrics.meanSeparationMeters<1500);
});

test('material geometry divergence blocks unattended guidance',()=>{
 const far=[[41.14,-104.82],[41.0,-102.5],[40.0,-101.5],[39.78,-104.85]];
 const comparison=compareCommercialRoutes(route('HERE',line),route('TomTom',far,{distanceMeters:150000,durationSeconds:8000}));
 assert.equal(comparison.status,'blocked');
 assert.equal(comparison.guidanceEligible,false);
 assert.equal(comparison.notice.severity,'critical');
 assert.match(comparison.reasons.join(' '),/diverge/i);
});

test('a provider critical restriction always blocks consensus',()=>{
 const secondary=route('TomTom',line,{guidanceEligible:false,criticalNotices:[{code:'truckRestriction',severity:'critical'}]});
 const comparison=compareCommercialRoutes(route('HERE',line),secondary);
 assert.equal(comparison.status,'blocked');
 assert.match(comparison.reasons[0],/critical restriction/i);
});

test('moderate provider disagreement requires parked review',()=>{
 const alternate=[[41.14,-104.82],[40.6,-104.88],[40.0,-104.90],[39.78,-104.85]];
 const comparison=compareCommercialRoutes(route('HERE',line),route('TomTom',alternate,{distanceMeters:114000,durationSeconds:6500,steps:[{road:'US-85'},{road:'I-76'}]}));
 assert.equal(comparison.status,'review');
 assert.equal(comparison.notice.blocking,true);
 assert.ok(comparison.metrics.p95SeparationMeters<12000);
});

test('applying consensus preserves notices and fails closed',()=>{
 const primary={origin:{label:'A'},destination:{label:'B'},route:route('HERE',line,{notices:[{code:'providerInfo',severity:'info'}]})};
 const secondary={route:route('TomTom',[[41.14,-104.82],[40.8,-100],[39.78,-104.85]],{distanceMeters:180000})};
 const result=applyRouteConsensus(primary,secondary);
 assert.equal(result.route.guidanceEligible,false);
 assert.equal(result.route.notices[0].code,'providerInfo');
 assert.equal(result.route.notices.at(-1).code,'providerRouteDisagreement');
 assert.ok(result.route.criticalNotices.length>=1);
 assert.equal(result.crossCheck.secondary.provider,'TomTom');
});
