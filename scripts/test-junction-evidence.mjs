import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContextRequest,readRoadContext,compareRoadShape,sanitizeRoadContext,roadContextRequest,junctionRequest,roadEndpointContacts } from '../src/assets/permits/junction-evidence.mjs';
import {issuerRampPair,issuerRehearsal} from '../src/assets/permits/issuer-rehearsal.mjs';
import {issuerRowText} from '../src/assets/permits/issuer-map.mjs';
import { loadRoadContext } from '../server/texas-road-context.mjs';
import handler from '../api/permit-road-context.mjs';
const q={bounds:[-100.01,31.99,-99.99,32.01],prefix:'SH',number:31};
const fixture=()=>({spatialReference:{wkid:4326},features:[{attributes:{OBJECTID:123,RTE_NM:'SH0031-CN',RTE_PRFX:'SH',RTE_NBR:'31',RDBD_TYPE:'Connector',EXT_DATE:'10-01-2026'},geometry:{paths:[[[-100,32],[-100,32.001],[-100,32.002]]]}}]});
const paired=()=>{
 const rows=[{sequence:1,road:'SH171 se',instruction:'Take SH31 Ramp sw',miles:.1,cumulativeMiles:.1},{sequence:2,road:'SH31 Ramp sw',instruction:'Merge onto SH31 sw',miles:.1,cumulativeMiles:.2}];
 const p={state:'TX',number:'TEST',routeText:rows.map(issuerRowText).join('\n'),entry:{label:'A'},exit:{label:'B'}};
 p.issuerMap={format:'txpros-issuer-map/v2',sourceUrl:'https://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=10000001&QRUSER=1',permitNumber:p.number,routeText:p.routeText,entryLabel:'A',exitLabel:'B',retrievedAt:'2026-10-15T12:00:00Z',paths:[[[32,-100],[32.001,-100],[32.002,-100]]],rows};return p;
};
test('literal adjacent entry/merge pair shares a bounded query, never coordinates or approval',()=>{
 const p=paired(),before=JSON.stringify(p);assert.deepEqual(issuerRampPair(issuerRehearsal(p,0)),{entry:0,merge:1});assert.deepEqual(junctionRequest(p,0),junctionRequest(p,1));assert.deepEqual(junctionRequest(p,0).approach,{prefix:'SH',number:171});assert.equal(JSON.stringify(p),before);
 for(const change of [v=>v.rows[1].instruction='Merge onto SH31 ne',v=>v.rows[1].road='SH31 FR sw',v=>v.rows[1].instruction='Merge onto SH32 sw',v=>v.rows[0].instruction='Take SH31 Ramp sw if open',v=>v.rows[1].cumulativeMiles=3,v=>v.rows[1].cumulativeMiles=0,v=>v.rows[1].cumulativeMiles=NaN]){const v=issuerRehearsal(p);change(v);assert.equal(issuerRampPair(v),null);}
 assert.equal(issuerRampPair({available:false}),null);p.routeText='stale';assert.throws(()=>junctionRequest(p,0));
 p.issuerMap.rows[1].cumulativeMiles=20;assert.throws(()=>junctionRequest(p,1));
});

test('approach lookup is limited to one distinct road and response identity cannot be relabelled',()=>{
 const pairQ={...q,approach:{prefix:'SH',number:171}};
 for(const approach of [[],null,{prefix:"SH' OR 1=1",number:171},{prefix:'SH',number:31},{prefix:'SH',number:171,url:'https://evil.test'},{prefix:'SH',number:'171'}])assert.throws(()=>validateContextRequest({...q,approach}));
 const d=fixture();d.features.push({attributes:{...d.features[0].attributes,OBJECTID:124,RTE_PRFX:'SH',RTE_NBR:'171',RTE_NM:'SH0171-KG',RTE_SFX:'_',RDBD_TYPE:'Single Roadbed'},geometry:{paths:[[[-100.001,32.001],[-99.999,32.001]]]}});
 const c=readRoadContext(d,pairQ);assert.equal(c.features.find(f=>f.id===124).number,171);assert.deepEqual(sanitizeRoadContext(c,pairQ),c);
 delete c.features[0].prefix;assert.throws(()=>sanitizeRoadContext(c,pairQ));d.features[1].attributes.RTE_NBR='172';assert.throws(()=>readRoadContext(d,pairQ));
});

test('two-road query is one bounded public request with no permit data or arbitrary filters',async()=>{
 const pairQ={...q,approach:{prefix:'SH',number:171}};let count=0;
 await loadRoadContext(pairQ,async(url,options)=>{count++;const params=new URL(url).searchParams;assert.equal(params.get('where'),"(RTE_PRFX = 'SH' AND RTE_NBR = '31') OR (RTE_PRFX = 'SH' AND RTE_NBR = '171')");assert.equal(params.get('resultRecordCount'),'80');assert(params.get('outFields').includes('RTE_SFX'));assert.equal(options.credentials,'omit');return Response.json(fixture());});assert.equal(count,1);
});
test('endpoint inspection uses original endpoints and exposes all planar contacts without inventing a connection',()=>{
 const data=fixture();for(const [id,lon] of [[124,-100],[125,-100.000005],[126,-100.00002]])data.features.push({attributes:{...data.features[0].attributes,OBJECTID:id,RDBD_TYPE:'Left Roadbed'},geometry:{paths:[[[lon,31.999],[lon,32.003]]]}});
 const context=readRoadContext(data,q),f=context.features.find(f=>f.id===123),before=JSON.stringify(context),ends=roadEndpointContacts(f,context);
 assert.deepEqual(ends.map(e=>e.point),[f.paths[0][0],f.paths[0].at(-1)]);assert.deepEqual(ends[0].contacts.map(c=>c.id),[124,125]);assert.equal(ends[1].contacts.length,2);assert(!('approved' in ends[0]));assert(!('turnPoint' in ends[0]));assert.equal(JSON.stringify(context),before);
 assert.deepEqual(roadEndpointContacts(structuredClone(f),context),[]);f.paths.push([[32,-100.002],[32.001,-100.002]]);assert.deepEqual(roadEndpointContacts(f,context),[]);
});
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
