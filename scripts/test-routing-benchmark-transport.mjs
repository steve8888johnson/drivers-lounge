import test from'node:test';
import assert from'node:assert/strict';
import{calculateDeployedTruckRoute,fetchDeployedRoutingHealth,normalizeBenchmarkEndpoint}from'./routing-benchmark-transport.mjs';

const beta=normalizeBenchmarkEndpoint('https://beta.driverslounge.app');

test('deployed benchmark endpoint accepts only Drivers Lounge HTTPS route origins',()=>{
 assert.equal(beta.routeUrl,'https://beta.driverslounge.app/api/truck-route-consensus');
 assert.equal(beta.healthUrl,'https://beta.driverslounge.app/api/truck-route-health');
 const preview=normalizeBenchmarkEndpoint('https://drivers-lounge-52stcpf2a-steves-projects-c46af6ff.vercel.app/api/truck-route-consensus/');
 assert.equal(preview.host,'drivers-lounge-52stcpf2a-steves-projects-c46af6ff.vercel.app');
 for(const value of[
  'http://beta.driverslounge.app','https://user:pass@beta.driverslounge.app',
  'https://beta.driverslounge.app?token=x','https://beta.driverslounge.app/#x',
  'https://example.com','https://drivers-lounge-evil.vercel.app','https://beta.driverslounge.app/api/other'
 ])assert.throws(()=>normalizeBenchmarkEndpoint(value));
});

test('health transport omits credentials, refuses redirects and validates readiness schema',async()=>{
 let seen;
 const fetchImpl=async(url,init)=>{seen={url,init};return new Response(JSON.stringify({readiness:{schema:'dl-routing-provider-readiness/v1',previewEligible:true,releaseEligible:false}}),{status:200,headers:{'content-type':'application/json'}})};
 const body=await fetchDeployedRoutingHealth(beta,{fetchImpl});
 assert.equal(body.readiness.previewEligible,true);assert.equal(seen.url,beta.healthUrl);
 assert.equal(seen.init.method,'GET');assert.equal(seen.init.credentials,'omit');assert.equal(seen.init.redirect,'error');
 assert.equal(Object.keys(seen.init.headers).some(key=>/authorization|cookie/i.test(key)),false);
 await assert.rejects(()=>fetchDeployedRoutingHealth(beta,{fetchImpl:async()=>new Response('{}',{status:200,headers:{'content-type':'application/json'}})}),/unsupported readiness schema/i);
});

test('route transport posts bounded JSON without browser credentials',async()=>{
 let seen;const input={origin:{address:'A'},destination:{address:'B'},profile:{heightFt:13}};
 const fetchImpl=async(url,init)=>{seen={url,init};return new Response(JSON.stringify({route:{provider:'fixture',geometry:[[1,2],[3,4]],steps:[{instruction:'Go'}]}}),{status:200,headers:{'content-type':'application/json'}})};
 const body=await calculateDeployedTruckRoute(input,{endpoint:beta,fetchImpl});
 assert.equal(body.route.provider,'fixture');assert.equal(seen.url,beta.routeUrl);assert.equal(seen.init.method,'POST');
 assert.deepEqual(JSON.parse(seen.init.body),input);assert.equal(seen.init.credentials,'omit');assert.equal(seen.init.redirect,'error');
});

test('deployed transport fails closed on non-JSON, oversized and HTTP error responses',async()=>{
 await assert.rejects(()=>calculateDeployedTruckRoute({}, {endpoint:beta,fetchImpl:async()=>new Response('login',{status:200,headers:{'content-type':'text/html'}})}),/did not return JSON/i);
 await assert.rejects(()=>calculateDeployedTruckRoute({}, {endpoint:beta,fetchImpl:async()=>new Response(JSON.stringify({error:'provider unavailable'}),{status:503,headers:{'content-type':'application/json'}})}),/provider unavailable/i);
 await assert.rejects(()=>calculateDeployedTruckRoute({}, {endpoint:beta,fetchImpl:async()=>new Response(JSON.stringify({route:{}}),{status:200,headers:{'content-type':'application/json','content-length':'3000000'}})}),/too large/i);
});
