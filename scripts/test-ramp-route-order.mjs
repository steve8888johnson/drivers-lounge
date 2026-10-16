import test from 'node:test';
import assert from 'node:assert/strict';
import {meters} from '../src/assets/permits/core.mjs';
import {issuerRowText} from '../src/assets/permits/issuer-map.mjs';
import {issuerRehearsal} from '../src/assets/permits/issuer-rehearsal.mjs';
import {joinedRampComparisons} from '../src/assets/permits/ramp-comparison.mjs';
import {rampRouteOrder} from '../src/assets/permits/ramp-route-order.mjs';

function fixture(transform=p=>p){
 const a=[32.001,-100],j=[32,-100],end=[31.998,-100.002];
 const meta={prefix:'SH',number:31,suffix:'_',date:'10-01-2026'};
 const first={...meta,id:1,kind:'Connector',paths:[[a,j]]},second={...meta,id:2,kind:'Grade Separated Connector',paths:[[[32.0002,-99.9998],j.slice(),[31.999,-100.001],end]]};
 const context={query:{bounds:[-100.01,31.99,-99.99,32.01],prefix:'SH',number:31,approach:{prefix:'SH',number:171}},features:[first,second]};
 const path=transform([a,j,[31.999,-100.001],end,[31.997,-100.003]]),length=path.slice(1).reduce((s,p,i)=>s+meters(path[i],p),0)/1609.344,total=Math.max(.3,Math.round(length*10)/10);
 const rows=[{sequence:1,road:'SH171 se',instruction:'Take SH31 Ramp sw',miles:0,cumulativeMiles:0},{sequence:2,road:'SH31 Ramp sw',instruction:'Merge onto SH31 sw',miles:.3,cumulativeMiles:.3},{sequence:3,road:'SH31 sw',instruction:'Arrive at destination.',miles:total-.3,cumulativeMiles:total}];
 const p={state:'TX',number:'TEST',routeText:rows.map(issuerRowText).join('\n'),entry:{label:'A'},exit:{label:'B'}};
 p.issuerMap={format:'txpros-issuer-map/v2',sourceUrl:'https://txpros.txdmv.gov/PermitDetails02.aspx?PermitID=10000001&QRUSER=1',permitNumber:p.number,routeText:p.routeText,entryLabel:'A',exitLabel:'B',retrievedAt:'2026-10-16T12:00:00Z',paths:[path],rows};
 const chain=joinedRampComparisons(first,context,issuerRehearsal(p,0))[0];assert(chain);
 return {p,context,chain};
}

test('forward route order preserves independent rounded mileages without approving or creating a maneuver',()=>{
 const x=fixture(),before=JSON.stringify(x),r=rampRouteOrder(x.p,0,x.chain,x.context);
 assert(r.available);assert.equal(r.order,'forward');assert.equal(r.printed.rampMiles,.3);assert(r.candidateMiles>.24&&r.candidateMiles<.26);assert(Math.abs(r.issuerBetweenMiles-r.candidateMiles)<1e-7);
 assert.equal(r.approved,false);assert.equal(r.guidanceAllowed,false);assert(!('turnPoint' in r));assert(!('steps' in r));assert.equal(JSON.stringify(x),before);
 assert.deepEqual(rampRouteOrder(x.p,1,x.chain,x.context),r);
});

test('an identical-looking candidate on a reversed issuer traversal cannot pass the order comparison',()=>{
 const x=fixture(p=>p.reverse()),r=rampRouteOrder(x.p,0,x.chain,x.context);assert.equal(r.order,'reversed');assert(r.issuerBetweenMiles<0);assert.equal(r.guidanceAllowed,false);
});

test('repeated nearby route occurrences are ambiguous instead of picking the first traversal',()=>{
 const x=fixture(p=>[...p,...p.slice(0,-1).reverse(),...p.slice(1)]),r=rampRouteOrder(x.p,0,x.chain,x.context);assert.equal(r.order,'ambiguous');assert(r.entry.occurrences>1);assert(r.merge.occurrences>1);assert.equal(r.issuerBetweenMiles,null);
});

test('adjacent segments and repeated zero-length vertices do not manufacture separate visits',()=>{
 const x=fixture(p=>[...p.slice(0,4),p[3].slice(),p[4]]),r=rampRouteOrder(x.p,0,x.chain,x.context);assert.equal(r.order,'forward');assert.equal(r.merge.occurrences,1);assert(Number.isFinite(r.entry.mapMiles));
});

test('sparse issuer geometry near a candidate end cannot establish traversal order',()=>{
 const x=fixture(p=>[[32.101,-100],p[0],...p.slice(1)]),r=rampRouteOrder(x.p,0,x.chain,x.context);assert.equal(r.order,'ambiguous');assert(r.entry.sparse);assert.equal(r.guidanceAllowed,false);
});

test('changed source, invalid row or altered candidate cannot inherit the order evidence',()=>{
 for(const change of [x=>x.p.number='OTHER',x=>x.p.routeText+=' changed',x=>x.chain.path[0][0]+=.00001,x=>x.chain.path.reverse(),x=>x.context.query.approach.number=172]){const x=fixture();change(x);assert(!rampRouteOrder(x.p,0,x.chain,x.context).available);}
 const x=fixture();assert(!rampRouteOrder(x.p,2,x.chain,x.context).available);assert(!rampRouteOrder(x.p,999,x.chain,x.context).available);
});
