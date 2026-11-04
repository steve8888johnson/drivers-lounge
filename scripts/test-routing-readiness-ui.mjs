import test from'node:test';
import assert from'node:assert/strict';
import{buildRoutingReadinessView,loadRoutingReadiness,routingReadinessHtml}from'../src/assets/routing/provider-readiness-ui.mjs';

const single={readiness:{schema:'dl-routing-provider-readiness/v1',status:'single_provider_unverified',activeProviderCount:1,independentProviderCount:1,previewEligible:true,releaseEligible:false,crossCheckConfigured:false,blockers:[],providers:[{id:'here',configured:false,valid:false,active:false,credentialIssue:'missing'},{id:'tomtom',configured:true,valid:true,active:true,credentialIssue:'outer_whitespace_trimmed',credentialNormalized:true}]}};

test('single-provider beta is clearly separated from release readiness',()=>{
 const view=buildRoutingReadinessView(single);assert.equal(view.tone,'warning');assert.equal(view.previewEligible,true);assert.equal(view.releaseEligible,false);assert.equal(view.independentCount,1);
 assert.match(view.title,/TomTom Routing API v1 beta routing is active/);assert.match(view.summary,/no independent cross-check/i);assert.ok(view.actions.some(item=>/DL_RELEASE blocked/i.test(item)));
 const tomtom=view.providers.find(item=>item.id==='tomtom');assert.equal(tomtom.state,'Active');assert.match(tomtom.detail,/outer whitespace/i);
});

test('one-provider heading follows the active engine rather than assuming TomTom',()=>{
 const health={readiness:{...single.readiness,providers:[{id:'here',configured:true,valid:true,active:true,credentialIssue:'none'},{id:'tomtom',configured:false,valid:false,active:false,credentialIssue:'missing'}]}};
 const view=buildRoutingReadinessView(health);assert.match(view.title,/HERE Routing API v8 beta routing is active/);assert.doesNotMatch(view.title,/TomTom/);
});

test('dual-provider readiness still requires benchmark and field validation',()=>{
 const health={readiness:{...single.readiness,status:'dual_provider_ready',activeProviderCount:2,independentProviderCount:2,previewEligible:true,releaseEligible:true,crossCheckConfigured:true,providers:[{id:'here',configured:true,valid:true,active:true,credentialIssue:'none'},{id:'tomtom',configured:true,valid:true,active:true,credentialIssue:'none'}]}};
 const view=buildRoutingReadinessView(health);assert.equal(view.tone,'ready');assert.equal(view.releaseEligible,true);assert.match(view.summary,/physical-device field validation/i);assert.ok(view.actions.some(item=>/deployed consensus benchmark/i.test(item)));
});

test('invalid and unknown payload data cannot leak into rendered readiness HTML',()=>{
 const secret='SUPER_SECRET_PROVIDER_VALUE';
 const health={readiness:{schema:'dl-routing-provider-readiness/v1',status:'invalid_configuration',activeProviderCount:0,independentProviderCount:0,previewEligible:false,releaseEligible:false,crossCheckConfigured:false,blockers:['invalid_provider_credentials'],providers:[{id:'tomtom',label:secret,credentialValue:secret,configured:true,valid:false,active:false,credentialIssue:'too_short'},{id:'evil',label:secret,active:true}]},secret};
 const html=routingReadinessHtml(buildRoutingReadinessView(health));assert.equal(html.includes(secret),false);assert.match(html,/too short/i);assert.match(html,/release gate/i);
});

test('unsupported readiness schema fails closed',()=>{assert.throws(()=>buildRoutingReadinessView({readiness:{schema:'other'}}),/unsupported/i)});

function documentFixture(){
 const nodes=new Map([['#mc-routing-readiness',{dataset:{}}],['#mc-routing-content',{innerHTML:''}],['#mc-routing-refresh',{disabled:false}]]);
 return{nodes,querySelector(selector){return nodes.get(selector)||null}};
}

test('loader uses same-origin no-store health request and renders the safe view',async()=>{
 const documentRef=documentFixture();let seen;
 const fetchImpl=async(url,init)=>{seen={url,init};return new Response(JSON.stringify(single),{status:200,headers:{'content-type':'application/json'}})};
 const view=await loadRoutingReadiness({fetchImpl,documentRef});assert.equal(view.tone,'warning');assert.equal(seen.url,'/api/truck-route-health');assert.equal(seen.init.credentials,'same-origin');assert.equal(seen.init.cache,'no-store');assert.equal(seen.init.redirect,'error');assert.match(documentRef.nodes.get('#mc-routing-content').innerHTML,/BETA · ONE PROVIDER/);
});

test('loader renders a fail-closed message on network or schema failure',async()=>{
 const documentRef=documentFixture();const result=await loadRoutingReadiness({documentRef,fetchImpl:async()=>new Response('<html>',{status:500,headers:{'content-type':'text/html'}})});
 assert.equal(result,null);assert.equal(documentRef.nodes.get('#mc-routing-readiness').dataset.state,'blocked');assert.match(documentRef.nodes.get('#mc-routing-content').innerHTML,/Do not rely on route generation/i);
});
