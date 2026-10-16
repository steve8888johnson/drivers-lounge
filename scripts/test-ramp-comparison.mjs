import test from 'node:test';
import assert from 'node:assert/strict';
import {joinedRampComparisons} from '../src/assets/permits/ramp-comparison.mjs';
import {permitRampRoads,rampRoadContacts} from '../src/assets/permits/ramp-road-match.mjs';
const fixture=()=>{
 const a=[32.001,-100],j=[32,-100],end=[31.998,-100.002];
 const metadata={prefix:'SH',number:31,suffix:'_'},first={...metadata,id:1,kind:'Connector',date:'10-01-2026',paths:[[a,j]]},second={...metadata,id:2,kind:'Grade Separated Connector',date:'10-01-2026',paths:[[[32.0002,-99.9998],j.slice(),[31.999,-100.001],end]]};
 return {first,context:{query:{bounds:[-100.01,31.99,-99.99,32.01],prefix:'SH',number:31,approach:{prefix:'SH',number:171}},features:[first,second]},view:{available:true,index:0,rows:[{road:'SH171 se',instruction:'Take SH31 Ramp sw',cumulativeMiles:1},{road:'SH31 Ramp sw',instruction:'Merge onto SH31 sw',cumulativeMiles:1.3}]}};
};

function withRoads(){const x=fixture();x.context.features.push(
 {id:3,prefix:'SH',number:171,suffix:'_',road:'SH0171-KG',kind:'Single Roadbed',date:'10-01-2026',paths:[[[32.001,-100.001],[32.001,-99.999]]]},
 {id:4,prefix:'SH',number:31,suffix:'_',road:'SH0031-LG',kind:'Left Roadbed',date:'10-01-2026',paths:[[[31.998,-100.003],[31.998,-100.001]]]}
);return x;}

test('candidate ends compare against the literal approach and merge without granting direction, level or cue approval',()=>{
 const x=withRoads(),before=JSON.stringify(x),chain=joinedRampComparisons(x.first,x.context,x.view)[0],result=rampRoadContacts(chain,x.context,x.view);
 assert(result.available&&result.uniqueContacts);assert.equal(result.approach[0].id,3);assert.equal(result.merge[0].id,4);assert(result.approach[0].distance<.001);assert.equal(result.approved,false);assert.equal(result.travelDirectionVerified,false);assert.match(result.message,/drawing comparison/);assert.equal(JSON.stringify(x),before);assert(!('turnPoint' in result));
 // Crossings may be grade separated, so even perfect geometry remains unapproved.
 assert.equal(result.proximityOnly,true);
});

test('frontage, branch, qualified directions and missing approach are never simplified into main-road matches',()=>{
 for(const road of ['IH35W s','SH171NFR se','SH171 frontage se','SH171 se [FM339]','SH171','',null]){const x=withRoads();x.view.rows[0].road=road;assert.equal(permitRampRoads(x.view),null);assert(!rampRoadContacts({},x.context,x.view).available);}
});

test('missing, stale, qualified and ambiguous endpoint records remain unresolved',()=>{
 for(const mutate of [x=>x.context.features[2].number=172,x=>x.context.features[2].date='09-01-2026',x=>x.context.features[2].suffix='W',x=>x.context.features[2].suffix=null,x=>x.context.features[2].kind='Frontage Road',x=>x.context.features[2].paths[0].forEach(p=>p[0]+=.00002)]){
  const x=withRoads();mutate(x);const result=rampRoadContacts(joinedRampComparisons(x.first,x.context,x.view)[0],x.context,x.view);assert(result.available);assert(!result.uniqueContacts);assert.equal(result.approach.length,0);assert.equal(result.approved,false);
 }
 const x=withRoads();x.context.features.push({...structuredClone(x.context.features[3]),id:5,kind:'Right Roadbed'});const result=rampRoadContacts(joinedRampComparisons(x.first,x.context,x.view)[0],x.context,x.view);assert(!result.uniqueContacts);assert.equal(result.merge.length,2);assert.match(result.message,/Multiple road lines/);
 const multi=withRoads();multi.context.features[3].paths.push(structuredClone(multi.context.features[3].paths[0]));const multipart=rampRoadContacts(joinedRampComparisons(multi.first,multi.context,multi.view)[0],multi.context,multi.view);assert(!multipart.uniqueContacts);assert.deepEqual(multipart.merge.map(m=>m.pathIndex),[0,1]);
});

test('a changed candidate, wrong query, reverse geometry or wrong connector road cannot inherit endpoint evidence',()=>{
 const x=withRoads(),chain=joinedRampComparisons(x.first,x.context,x.view)[0];
 for(const mutate of [c=>c.path.reverse(),c=>c.path[0][0]+=.00001,c=>c.id='changed',c=>c.recordIds=[],c=>c.recordIds=[99,2]]){const c=structuredClone(chain);mutate(c);assert(!rampRoadContacts(c,x.context,x.view).available);}
 delete x.context.query.approach;assert(!rampRoadContacts(chain,x.context,x.view).available);
 for(const mutate of [f=>f.number=171,f=>f.prefix='FM',f=>f.suffix='W']){const y=fixture();mutate(y.context.features[1]);assert.deepEqual(joinedRampComparisons(y.first,y.context,y.view),[]);}
});
test('joined comparison references original vertices, clips only at their exact common vertex, and never approves',()=>{
 const {first,context,view}=fixture(),before=JSON.stringify(context),all=joinedRampComparisons(first,context,view);assert.equal(all.length,1);const c=all[0];
 assert.deepEqual(c.path,[...first.paths[0],...context.features[1].paths[0].slice(2)]);assert.equal(c.approved,false);assert.equal(c.travelDirectionVerified,false);assert.equal(c.drawnDirection,'southwest');assert.equal(JSON.stringify(context),before);
 c.path[0][0]=0;assert.equal(first.paths[0][0][0],32.001);assert(!('steps' in c));assert(!('turnPoint' in c));
 first.paths[0].reverse();assert.equal(joinedRampComparisons(first,context,view).length,1);
});
test('near misses, overlaps, repeated vertices, multipart shapes, clipped endpoints, stale dates and non-pairs are not joined',()=>{
 for(const mutate of [
  x=>x.context.features[1].paths[0][1][0]+=.00000001,
  x=>x.context.features[1].paths[0].push(x.first.paths[0][0]),
  x=>x.first.paths[0].push(x.first.paths[0][0]),
  x=>x.first.paths.push([[32,-100],[32.001,-100]]),
  x=>x.context.query.bounds[1]=31.998,
  x=>x.context.features[1].date='09-01-2026',
  x=>x.context.features[1].kind='Left Roadbed',
  x=>x.view.rows[1].instruction='Merge onto SH31 ne',
  x=>x.view.rows[0].instruction='Turn right on SH31',
 ]){const x=fixture();mutate(x);assert.deepEqual(joinedRampComparisons(x.first,x.context,x.view),[]);}
 const x=fixture();assert.deepEqual(joinedRampComparisons(structuredClone(x.first),x.context,x.view),[]);
});
test('all competing geometric candidates are returned, none is selected or promoted by compass agreement',()=>{
 const x=fixture(),other=structuredClone(x.context.features[1]);other.id=3;other.paths[0].at(-1)[1]-=.001;x.context.features.push(other);
 const candidates=joinedRampComparisons(x.first,x.context,x.view);assert.equal(candidates.length,2);assert(candidates.every(c=>!c.approved&&!c.travelDirectionVerified&&!('selected' in c)));
});
