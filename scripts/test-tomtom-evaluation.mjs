import test from 'node:test';
import assert from 'node:assert/strict';
import {createTomTomEvaluation} from './evaluate-tomtom.mjs';
const now=Date.parse('2026-10-14T16:00:00Z');
const environment=()=>({VERCEL_ENV:'preview',VERCEL_PROJECT_ID:'prj_WABuJ8HC4AVK1h2FC4Y8LyrblDPW',TOMTOM_API_KEY:'synthetic-probe-key'});
const approved={freeAccountVerified:true,oneRequestApproved:true};

test('build evaluation refuses production, wrong project, expired approval and missing credentials without network',async()=>{
 let calls=0;
 for(const [change,clock,approval,reason] of [
  [e=>e.VERCEL_ENV='production',now,approved,'PREVIEW_PROJECT_REQUIRED'],
  [e=>e.VERCEL_PROJECT_ID='other',now,approved,'PREVIEW_PROJECT_REQUIRED'],
  [()=>{},Date.parse('2026-10-14T18:00:00Z'),approved,'EVALUATION_WINDOW_CLOSED'],
  [()=>{},now,{},'EXPLICIT_FREE_EVALUATION_REQUIRED'],
  [e=>delete e.TOMTOM_API_KEY,now,approved,'PROVIDER_NOT_CONFIGURED'],
  [e=>e.TOMTOM_API_KEY='00000000-0000-4000-8000-000000000000',now,approved,'KEY_ID_INSTEAD_OF_SECRET']]){
  const env=environment();change(env);
  const run=createTomTomEvaluation({env,clock:()=>clock,fetchImpl:async()=>{calls++;throw Error('Unexpected call');}});
  const r=await run(approval);assert(r.reasons.includes(reason));assert.equal(r.guidanceAllowed,false);
 }assert.equal(calls,0);
});
test('evaluation sends one synthetic truck request and reports no key, geometry, raw messages or real load',async()=>{
 let calls=0;const run=createTomTomEvaluation({env:environment(),clock:()=>now,fetchImpl:async(url,options)=>{
  calls++;assert.equal(url.origin,'https://api.tomtom.com');assert.equal(url.searchParams.get('travelMode'),'truck');assert.equal(options.redirect,'error');
  assert.equal(url.pathname,'/routing/1/calculateRoute/34.0522,-118.2437:32.7157,-117.1611/json');
  return Response.json({routes:[],private:'synthetic-probe-key',geometry:'private-route'});
 }});
 const r=await run(approved);assert.equal(r.httpStatus,200);assert.equal(r.requests,1);assert.equal(r.structurePassed,false);assert.equal(r.guidanceAllowed,false);
 assert(!JSON.stringify(r).includes('synthetic-probe-key'));assert(!JSON.stringify(r).includes('private-route'));
 const again=await run(approved);assert(again.reasons.includes('EVALUATION_ALREADY_USED'));assert.equal(calls,1);
});
test('evaluation stops on credential and quota errors and never retries',async()=>{
 for(const status of [401,403,429,500]){
  let calls=0;const run=createTomTomEvaluation({env:environment(),clock:()=>now,fetchImpl:async()=>{calls++;return new Response('sensitive provider error',{status});}});
  const r=await run(approved);await run(approved);assert.equal(calls,1);assert.equal(r.httpStatus,status);assert.equal(r.status,'HOLD');assert(!JSON.stringify(r).includes('sensitive provider error'));
 }
});
