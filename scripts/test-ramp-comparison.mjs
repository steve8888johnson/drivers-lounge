import test from 'node:test';
import assert from 'node:assert/strict';
import {joinedRampComparisons} from '../src/assets/permits/ramp-comparison.mjs';
const fixture=()=>{
 const a=[32.001,-100],j=[32,-100],end=[31.998,-100.002];
 const first={id:1,kind:'Connector',date:'10-01-2026',paths:[[a,j]]},second={id:2,kind:'Grade Separated Connector',date:'10-01-2026',paths:[[[32.0002,-99.9998],j.slice(),[31.999,-100.001],end]]};
 return {first,context:{query:{bounds:[-100.01,31.99,-99.99,32.01]},features:[first,second]},view:{available:true,index:0,rows:[{instruction:'Take SH31 Ramp sw',cumulativeMiles:1},{road:'SH31 Ramp sw',instruction:'Merge onto SH31 sw',cumulativeMiles:1.3}]}};
};
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
