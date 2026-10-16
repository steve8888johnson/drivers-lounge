import test from 'node:test';
import assert from 'node:assert/strict';
import { spanAgreement,sparseSpanQueries,matchInventorySpan,readSpanEvidence,TXDOT_ROADWAYS } from '../src/assets/permits/issuer-span-check.mjs';
import { addTexasSpanEvidence } from '../server/texas-span-evidence.mjs';
import { blankPermit,blankTrip,buildMaster,sanitizePermit } from '../src/assets/permits/core.mjs';
import { issuerRowText } from '../src/assets/permits/issuer-map.mjs';
import { routeOverview } from '../src/assets/permits/map-review.mjs';
const original=[[35,-100],[35.055,-100]],detail=Array.from({length:12},(_,i)=>[35+i*.005,-100]);
const row={sequence:1,road:'US83 s',instruction:'Continue on US83 s',miles:20,cumulativeMiles:20};
const span={edgeIndex:0,original,family:'US0083'};
const fixture=()=>({spatialReference:{wkid:4326},features:[{attributes:{OBJECTID:123,RTE_NM:'US0083-KG',RDBD_TYPE:'Single Roadbed',EXT_DATE:'10-01-2026'},geometry:{paths:[detail.map(([lat,lon])=>[lon,lat])]}}]});
function permit(){const p={...blankPermit(),state:'TX',number:'TEST',routeText:issuerRowText(row),entry:{label:'A'},exit:{label:'B'}};p.issuerMap={format:'txpros-issuer-map/v2',sourceUrl:'https://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=10000001&QRUSER=1',permitNumber:p.number,routeText:p.routeText,entryLabel:'A',exitLabel:'B',retrievedAt:'2026-10-15T12:00:00Z',paths:[original],rows:[row]};return p;}

test('detailed shape agreement keeps both original coordinates and geometry approval unchanged',()=>{
  const d=fixture(),e=matchInventorySpan(span,d,'2026-10-15T12:00:00Z');assert(e);assert(spanAgreement(original,e.detail).agrees);assert.deepEqual(e.original,original);assert(e.detail.length>2);
  const p=permit();p.issuerMap={...p.issuerMap,format:'txpros-issuer-map/v3',spanEvidence:[e],spanCheckNote:'Shape comparison only'};const s=sanitizePermit(p),v=routeOverview(s);assert.equal(v.spanEvidence.length,1);assert.equal(v.sparsePaths.length,1);assert.match(v.issues[0],/not road clearance/);assert.deepEqual(s.issuerMap.paths,[original]);assert.equal(s.steps.length,0);const trip=blankTrip();trip.permits=[s];assert.equal(buildMaster(trip,{geometry:true}).segments.length,0);
});
test('parallel offset, bowing road, backtracking and sparse detail cannot pass just because endpoints are close',()=>{
  const shifted=detail.map(p=>[p[0],p[1]+.001]);assert(!spanAgreement(original,shifted).agrees);
  const bowed=structuredClone(detail);bowed[5][1]+=.002;assert(!spanAgreement(original,bowed).agrees);
  const reverse=[...detail.slice(0,5),detail[3],detail[4],...detail.slice(5)];assert(!spanAgreement(original,reverse).agrees);
  assert.throws(()=>spanAgreement(original,[original[0],[35.025,-100],original[1]]));assert.throws(()=>spanAgreement(original,[[NaN,-100],...detail]));
});
test('ambiguous roadbeds, truncated responses and wrong route families never become a unique match',()=>{
  let d=fixture();d.features.push(structuredClone(d.features[0]));d.features[1].attributes.OBJECTID=124;assert.equal(matchInventorySpan(span,d,new Date().toISOString()),null);
  d=fixture();d.exceededTransferLimit=true;assert.throws(()=>matchInventorySpan(span,d,new Date().toISOString()));
  d=fixture();d.features[0].attributes.RTE_NM='US0084-KG';assert.equal(matchInventorySpan(span,d,new Date().toISOString()),null);
  d=fixture();d.spatialReference.wkid=3857;assert.throws(()=>matchInventorySpan(span,d,new Date().toISOString()));
});
test('changed source span, forged shape statistics or duplicate evidence cannot bless a new road',()=>{
  const e=matchInventorySpan(span,fixture(),'2026-10-15T12:00:00Z');assert.throws(()=>readSpanEvidence([e,e],original));assert.throws(()=>readSpanEvidence([e],[[35,-100],[35.056,-100]]));
  e.detail[5][1]+=.001;e.comparison={agrees:true,maxOffset:0};assert.throws(()=>readSpanEvidence([e],original));
});
test('span query excludes instruction boundaries, ramp names and excessive spans rather than guessing a road',()=>{
  assert.equal(sparseSpanQueries(original,[row]).length,1);assert.equal(sparseSpanQueries(original,[{...row,cumulativeMiles:3.8}]).length,0);assert.equal(sparseSpanQueries(original,[{...row,road:'US83 Ramp s'}]).length,0);assert.equal(sparseSpanQueries([[35,-100],[36,-100]],[row]).length,0);
});
test('optional inventory read is fixed-host, bounded and credential-free; failure retains the exact issuer map',async()=>{
  const p=permit(),before=JSON.stringify(p),calls=[];
  const result=await addTexasSpanEvidence(p,async(url,init)=>{calls.push({url,init});return Response.json(fixture());});assert.equal(calls.length,1);const u=new URL(calls[0].url);assert.equal(u.origin+u.pathname,TXDOT_ROADWAYS+'/query');assert(!calls[0].url.includes('PermitID'));assert.equal(calls[0].init.credentials,'omit');assert.equal(calls[0].init.redirect,'error');assert(!calls[0].init.headers.Cookie);assert.equal(result.issuerMap.spanEvidence.length,1);assert.equal(JSON.stringify(p),before);
  for(const bad of [()=>new Response('denied',{status:403}),()=>Response.json({error:{message:'unavailable'}}),()=>new Response('x'.repeat(2000001),{headers:{'content-type':'application/json'}}),()=>{throw Error('network down');}]){const r=await addTexasSpanEvidence(p,async()=>bad());assert.equal(r.issuerMap.spanEvidence.length,0);assert.deepEqual(r.issuerMap.paths,p.issuerMap.paths);assert.match(r.issuerMap.spanCheckNote,/could not/);assert.equal(r.steps.length,0);}
});
