import test from'node:test';
import assert from'node:assert/strict';
import{applyRoutingPolicy,readRoutingPolicy,stateCodeFromStop}from'../src/assets/routing/routing-policy.mjs';

const baseResult=()=>({
 origin:{label:'611 East Carlson Street, Cheyenne, WY 82009'},destination:{label:'4701 Peoria Street, Denver, CO 80239'},
 route:{provider:'TomTom Routing API v1',guidanceEligible:true,notices:[],criticalNotices:[],crossCheck:{status:'single-provider'}}
});

test('production policy requires independent provider alignment by default',()=>{
 const policy=readRoutingPolicy({VERCEL_ENV:'production'});assert.equal(policy.requireCrossCheck,true);
 const result=applyRoutingPolicy(baseResult(),{profile:{}},policy);
 assert.equal(result.route.guidanceEligible,false);
 assert.ok(result.route.criticalNotices.some(item=>item.code==='independentCrossCheckRequired'));
});

test('preview policy allows a clearly labeled single-provider candidate',()=>{
 const policy=readRoutingPolicy({VERCEL_ENV:'preview'});assert.equal(policy.requireCrossCheck,false);
 const result=applyRoutingPolicy(baseResult(),{profile:{}},policy);assert.equal(result.route.guidanceEligible,true);
});

test('global, provider and state kill switches independently block guidance',()=>{
 const global=applyRoutingPolicy(baseResult(),{profile:{}},readRoutingPolicy({DL_ROUTING_KILL_SWITCH:'true'}));
 assert.ok(global.route.criticalNotices.some(item=>item.code==='routingKillSwitchActive'));
 const provider=applyRoutingPolicy(baseResult(),{profile:{}},readRoutingPolicy({DL_ROUTING_DISABLED_PROVIDERS:'tomtom'}));
 assert.ok(provider.route.criticalNotices.some(item=>item.code==='routingProviderDisabled'));
 const state=applyRoutingPolicy(baseResult(),{profile:{}},readRoutingPolicy({DL_ROUTING_DISABLED_STATES:'CO'}));
 assert.ok(state.route.criticalNotices.some(item=>item.code==='routingStateDisabled'&&item.state==='CO'));
});

test('ordinary routing rejects issued-permit movements',()=>{
 const result=applyRoutingPolicy(baseResult(),{profile:{permittedLoad:true}},readRoutingPolicy({VERCEL_ENV:'preview'}));
 assert.equal(result.route.guidanceEligible,false);assert.ok(result.route.criticalNotices.some(item=>item.code==='issuedPermitWorkflowRequired'));
});

test('state code extraction handles exact address labels',()=>{
 assert.equal(stateCodeFromStop({label:'611 East Carlson Street, Cheyenne, WY 82009'}),'WY');
 assert.equal(stateCodeFromStop({stateCode:'co'}),'CO');
});
