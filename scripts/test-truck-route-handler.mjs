import test from 'node:test';
import assert from 'node:assert/strict';
import { createTruckRouteHandler } from '../server/truck-route-handler.mjs';
import { vehicleFixture } from './fixtures/truck-axles.mjs';
import { tripFixture } from './fixtures/truck-geometry.mjs';
const now=Date.parse('2026-10-13T12:00:00Z'), owner='11111111-1111-4111-8111-111111111111', session='22222222-2222-4222-8222-222222222222';
const env={DL_TOMTOM_EVALUATION_ENABLED:'true',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:'prj_WABuJ8HC4AVK1h2FC4Y8LyrblDPW',VERCEL_URL:'test-drivers.vercel.app',SUPABASE_URL:'https://opwaikfrnpvovnaslvfz.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-server-secret',TOMTOM_API_KEY:'synthetic-provider-secret'};
const token=(extra={})=>'synthetic.'+Buffer.from(JSON.stringify({sub:owner,session_id:session,role:'authenticated',exp:now/1000+3600,...extra})).toString('base64url')+'.synthetic';
const body=()=>({requestId:crypto.randomUUID(),input:{vehicle:vehicleFixture(),...tripFixture(),departure:'2026-10-13T13:00:00.000Z'}});
const request=(payload=body(),headers={})=>new Request('https://test-drivers.vercel.app/api/truck-route',{method:'POST',headers:{origin:'https://test-drivers.vercel.app',authorization:`Bearer ${token()}`,'content-type':'application/json',...headers},body:typeof payload==='string'?payload:JSON.stringify(payload)});
function harness(options={}) {
  const calls=[];
  const fetchImpl=async(url,opts)=>{
    calls.push({url,opts});
    assert.equal(opts.redirect,'error'); assert.equal(opts.cache,'no-store'); assert(opts.signal);
    if(url.endsWith('/auth/v1/user'))return options.userResponse?.()||Response.json({id:owner,is_anonymous:false,email_confirmed_at:'2026-10-10T00:00:00Z'});
    assert(url.endsWith('/rest/v1/rpc/dl_reserve_truck_route'));
    return options.budgetResponse?.()||Response.json({allowed:true,code:'RESERVED',expires_at:new Date(now+30000).toISOString()});
  };
  const provider=async(input,opts)=>{
    calls.push({provider:true,input,opts});
    if(options.provider) return options.provider(input,opts);
    return {status:'DO_NOT_FORWARD',guidanceAllowed:true,structurePassed:true,instructionCount:3,reasons:[{code:'ROAD_RESTRICTIONS_UNVERIFIED',message:'do not expose'}],instructions:['do not expose'],key:'do not expose'};
  };
  return {calls,run:createTruckRouteHandler({env:{...env,...options.env},fetchImpl,provider,clock:options.clock||(()=>now)})};
}
const code=async response=>(await response.json()).reasons[0].code;
test('public production is closed; origin, method, server config and malformed payloads send nothing',async()=>{
  for(const change of [{DL_TOMTOM_EVALUATION_ENABLED:'false'},{VERCEL_ENV:'production'},{VERCEL_PROJECT_ID:'another-project'}]){
    const h=harness({env:change});assert.equal(await code(await h.run(request())),'CONNECTION_DISABLED');assert.equal(h.calls.length,0);
  }
  for(const [req,expected] of [[new Request('https://test-drivers.vercel.app/api/truck-route'),'POST_REQUIRED'],[request(body(),{origin:'https://evil.test'}),'ORIGIN_REJECTED'],[request(body(),{origin:'null'}),'ORIGIN_REJECTED'],[request(body(),{authorization:''}),'SIGN_IN_REQUIRED'],[request(body(),{'content-type':'text/plain'}),'JSON_REQUIRED'],[request('{broken'),'INVALID_TRUCK_OR_TRIP'],[request({...body(),freePlanVerified:true}),'INVALID_TRUCK_OR_TRIP'],[request(' '.repeat(32769)),'INVALID_TRUCK_OR_TRIP']]){
    const h=harness();assert.equal(await code(await h.run(req)),expected);assert.equal(h.calls.length,0);
  }
  const h=harness({env:{SUPABASE_URL:'https://attacker.test'}});assert.equal(await code(await h.run(request())),'CONNECTION_NOT_CONFIGURED');assert.equal(h.calls.length,0);
});
test('vehicle, load and trip validation occurs before authentication or consuming quota',async()=>{
  for(const change of [d=>d.input.vehicle.oversize=true,d=>d.input.vehicle.hazmat=true,d=>delete d.input.vehicle.axleMeasurement,d=>d.input.vehicle.currentWeightKg=1,d=>d.input.departure='2020-01-01T00:00:00Z',d=>d.input.endpoint='https://evil.test']){
    const h=harness(),d=body();change(d);assert.equal(await code(await h.run(request(d))),'INVALID_TRUCK_OR_TRIP');assert.equal(h.calls.length,0);
  }
});
test('unverified, anonymous, unconfirmed, mismatched or expiring identity never reaches quota',async()=>{
  for(const userResponse of [()=>new Response('no',{status:401}),()=>Response.json({id:owner,is_anonymous:true,email_confirmed_at:'yes'}),()=>Response.json({id:session,email_confirmed_at:'yes'}),()=>Response.json({id:owner})]){
    const h=harness({userResponse});assert.equal(await code(await h.run(request())),'SIGN_IN_REQUIRED');assert.equal(h.calls.length,1);
  }
  for(const claims of [{role:'service_role'},{session_id:'bad'},{exp:now/1000+5}]){
    const h=harness();assert.equal(await code(await h.run(request(body(),{authorization:`Bearer ${token(claims)}`}))),'SIGN_IN_REQUIRED');assert.equal(h.calls.length,1);
  }
});
test('quota outages, refusals and malformed approvals fail closed with no provider retries',async()=>{
  for(const budgetResponse of [()=>new Response('server secret',{status:500}),()=>Response.json({allowed:false,code:'MONTHLY_LIMIT'}),()=>Response.json({allowed:true,code:'RESERVED',expires_at:new Date(now-1).toISOString()}),()=>Response.json({allowed:true,code:'RESERVED',expires_at:new Date(now+3600000).toISOString()}),()=>Response.json({allowed:true,code:'RESERVED'})]){
    const h=harness({budgetResponse}),r=await h.run(request());assert([429,503].includes(r.status));assert.equal(h.calls.length,2);assert(!JSON.stringify(await r.json()).includes('secret'));
  }
});
test('verified owner/session and a non-coordinate hash reserve exactly one provider attempt',async()=>{
  const h=harness(),d=body(),r=await h.run(request(d)),result=await r.json();
  assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('access-control-allow-origin'),null);
  assert.equal(h.calls.length,3);const reservation=JSON.parse(h.calls[1].opts.body);
  assert.equal(reservation.p_owner,owner);assert.equal(reservation.p_session,session);assert.equal(reservation.p_request,d.requestId);assert.match(reservation.p_fingerprint,/^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(reservation).sort(),['p_fingerprint','p_owner','p_request','p_session']);
  assert.equal(h.calls[2].opts.includeInstructionDiagnostics,true);assert.equal(h.calls[2].opts.freePlanVerified,true);
  assert.equal(result.guidanceAllowed,false);assert.equal(result.status,'HOLD');assert.equal(result.instructionCount,3);assert.equal(result.instructions,undefined);
  assert(!JSON.stringify(result).includes('expose'));assert(!JSON.stringify(result).includes('secret'));
});
test('provider faults consume the reservation, produce redacted holds, and never fall back',async()=>{
  for(const provider of [async()=>{throw Error('sensitive-token');},async()=>({status:'HOLD',reasons:[{code:'FREE_QUOTA_OR_RATE_LIMIT'}]})]){
    const h=harness({provider}),r=await h.run(request());assert.equal(h.calls.filter(c=>c.provider).length,1);assert(!JSON.stringify(await r.json()).includes('sensitive'));
  }
  let current=now;const h=harness({clock:()=>current,provider:async()=>{current+=31000;return {structurePassed:true};}});
  assert.equal(await code(await h.run(request())),'APPROVAL_EXPIRING');assert.equal(h.calls.filter(c=>c.provider).length,1);
});
test('changed route produces a different reservation fingerprint without storing its coordinates',async()=>{
  const a=harness(),b=harness(),one=body(),two=body();two.input.destination.lat+=.001;
  await a.run(request(one));await b.run(request(two));
  assert.notEqual(JSON.parse(a.calls[1].opts.body).p_fingerprint,JSON.parse(b.calls[1].opts.body).p_fingerprint);
});
