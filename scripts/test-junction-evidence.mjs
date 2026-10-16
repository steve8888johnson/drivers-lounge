import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContextRequest,readRoadContext,compareRoadShape,sanitizeRoadContext,roadContextRequest } from '../src/assets/permits/junction-evidence.mjs';
import { loadRoadContext } from '../server/texas-road-context.mjs';
import handler from '../api/permit-road-context.mjs';
const q={bounds:[-100.01,31.99,-99.99,32.01],prefix:'SH',number:31};
const fixture=()=>({spatialReference:{wkid:4326},features:[{attributes:{OBJECTID:123,RTE_NM:'SH0031-CN',RTE_PRFX:'SH',RTE_NBR:'31',RDBD_TYPE:'Connector',EXT_DATE:'10-01-2026'},geometry:{paths:[[[-100,32],[-100,32.001],[-100,32.002]]]}}]});
test('bounded numbered-road lookup rejects arbitrary URLs, malformed areas and broad searches',()=>{
  for(const raw of [{...q,url:'https://evil.test'},{...q,prefix:"SH' OR 1=1"},{...q,number:'31'},{...q,bounds:[-100,32,-99,33]},{...q,bounds:[-99,32,-100,33]},{...q,bounds:[NaN,32,-100,33]}])assert.throws(()=>validateContextRequest(raw));
  const view={available:true,estimated:true,sparseArea:[],area:[[[32,-100],[32.001,-100]]],row:{instruction:'Take SH31 Ramp sw'}};assert.equal(roadContextRequest(view).number,31);assert.throws(()=>roadContextRequest({...view,estimated:false}));assert.throws(()=>roadContextRequest({...view,sparseArea:[view.area[0]]}));
});
test('inventory retains separate original geometry and records without selecting or approving a movement',()=>{
  const data=fixture();data.features[0].geometry.paths.push([[-100.002,32],[-100.002,32.001]]);const c=readRoadContext(data,q);assert.equal(c.features[0].paths.length,2);assert(!('approved' in c));assert(!('steps' in c));assert(!('selected' in c));assert.equal(sanitizeRoadContext(c,q).features[0].id,123);
  assert.throws(()=>sanitizeRoadContext(c,{...q,number:32}));c.source='https://evil.test';assert.throws(()=>sanitizeRoadContext(c,q));
});
test('incomplete, repeated, wrong-road, invalid and over-capacity evidence rejects',()=>{
  for(const change of [d=>d.exceededTransferLimit=true,d=>d.spatialReference.wkid=3857,d=>d.features.push(d.features[0]),d=>d.features[0].attributes.RTE_NBR='32',d=>d.features[0].geometry.paths[0][0]=[Infinity,32],d=>d.features[0].geometry.paths=[Array(30001).fill([-100,32])]]){const d=fixture();change(d);assert.throws(()=>readRoadContext(d,q));}
});
test('offset comparison exposes disagreement without converting near geometry into exact turn coordinates',()=>{
  const f=readRoadContext(fixture(),q).features[0],source=[[[32,-100],[32.002,-100]]];const close=compareRoadShape(f,source);assert(close.closeShape);assert(close.maxOffset<1e-6);const shifted=structuredClone(f);shifted.paths[0].forEach(p=>p[1]+=.0005);const far=compareRoadShape(shifted,source);assert(!far.closeShape);assert(far.maxOffset>40);assert(!('turnPoint' in close));assert(!('approved' in close));
});
test('a sparse inventory edge in the viewing area rejects the whole comparison instead of showing only a convincing fragment',()=>{
  const d=fixture();d.features[0].geometry.paths[0].push([-100,32.02]);assert.throws(()=>readRoadContext(d,q),/too sparse/);
});
test('public query never forwards permit text, cookies or keys and rejects failed/truncated/oversized data',async()=>{
  let calls=0;const result=await loadRoadContext(q,async(url,init)=>{calls++;const u=new URL(url);assert.equal(u.hostname,'services.arcgis.com');assert(!url.includes('PermitID'));assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');assert.deepEqual(init.headers,{Accept:'application/json'});return Response.json(fixture());});assert.equal(calls,1);assert.equal(result.features.length,1);
  for(const reply of [()=>new Response('no',{status:403}),()=>Response.json({...fixture(),exceededTransferLimit:true}),()=>new Response('x'.repeat(2000001),{headers:{'content-type':'application/json'}})])await assert.rejects(()=>loadRoadContext(q,async()=>reply()));
});
test('HTTP handler rejects cross-origin, non-POST, oversized and injected input without public calls',async()=>{
  const old=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('must not call');};
  try{for(const [req,status] of [[{method:'GET',headers:{}},405],[{method:'POST',headers:{host:'driverslounge.app',origin:'https://evil.test'}},403],[{method:'POST',headers:{host:'driverslounge.app',origin:'https://driverslounge.app','content-type':'application/json','content-length':'3000'}},400],[{method:'POST',headers:{host:'driverslounge.app',origin:'https://driverslounge.app','content-type':'application/json'},body:{...q,url:'https://evil.test'}},422]]){const res={setHeader(){},end(s){this.body=JSON.parse(s);}};await handler(req,res);assert.equal(res.statusCode,status);}assert.equal(calls,0);}finally{globalThis.fetch=old;}
});
