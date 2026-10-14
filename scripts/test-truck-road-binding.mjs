import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDirectedSegmentReference,inspectRoadBinding} from '../src/assets/truck-road-binding.mjs';
import {reviewHereCandidate} from '../src/assets/truck-provider-review.mjs';
import {roadBindingFixture,roadRef} from './fixtures/truck-road-binding.mjs';
import {encodePoints} from './fixtures/truck-geometry.mjs';
const inspect = f => inspectRoadBinding(f.route,f.request,f.current,f.evidence);
const has = (r,code) => r.reasons.some(reason=>reason.code===code);

test('documented compact map reference preserves version, direction and partial range',()=>{
  const ref=parseDirectedSegmentReference('$0:377570872:$1:76764732#+0.6376674544619554..1',{'0':'hrn:here:data::olp-here:rib-2:3217:','1':'here:cm:segment'});
  assert.equal(ref.map,'hrn:here:data::olp-here:rib-2:3217');assert.equal(ref.direction,'+');assert.equal(ref.startKey,'0.6376674544619554');assert.equal(ref.endKey,'1');
  assert.equal(parseDirectedSegmentReference(roadRef(101,'-')).reference,roadRef(101,'-0..1'));
});

test('ambiguous direction, malformed ranges and unresolvable replacements hold',()=>{
  for(const suffix of ['*0..1','?0..1','+1..0','+0.2..0.2','+0..1.1','+0.5','+0..1junk','+1e-3..1','+0..1#-']) assert.throws(()=>parseDirectedSegmentReference(roadRef(101,suffix)));
  for(const replacements of [{},Object.create({'0':'hrn:here:data::olp-here:rib-2:3217:'}),{'0':'$0'},{'0':'a'.repeat(1025)}]) assert.throws(()=>parseDirectedSegmentReference('$0:377570872:here:cm:segment:101#+',replacements));
  assert.throws(()=>parseDirectedSegmentReference(roadRef(101).replace('here:cm:segment','here:xs1:segment')));
  assert.throws(()=>parseDirectedSegmentReference(roadRef(101).repeat(20)));
});

test('complete synthetic topology remains review-only without geometry output or navigation',()=>{
  const f=roadBindingFixture(),before=JSON.stringify(f),r=inspect(f);
  assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.guidanceAllowed,false);assert.deepEqual(r.reasons,[]);assert.equal(JSON.stringify(f),before);
  const integrated=reviewHereCandidate({routes:[f.route]},f.request,f.current,f.evidence);
  assert.equal(integrated.status,'REVIEW_REQUIRED');assert.equal(integrated.guidanceAllowed,false);assert.equal(integrated.polyline,undefined);
});

test('provider data cannot supply its own entrance clearance and default adapter holds',()=>{
  const f=roadBindingFixture();
  const r=reviewHereCandidate({routes:[f.route],roadEvidence:f.evidence},f.request,f.current);
  assert.equal(r.status,'HOLD');assert(has(r,'ROAD_TOPOLOGY_AND_ENTRANCES_UNVERIFIED'));
});

test('spans must partition every polyline edge in order with bounded geometry',()=>{
  for(const mutate of [s=>delete s.spans,s=>s.spans=[],s=>s.spans[0].offset=1,s=>s.spans[1].offset=0,s=>s.spans[1].offset=2,s=>s.spans[1].offset='1',s=>s.spans.push(s.spans[1]),s=>s.polyline='BFAA']){
    const f=roadBindingFixture();mutate(f.route.sections[0]);assert.equal(inspect(f).status,'HOLD');
  }
  const f=roadBindingFixture();f.route.sections=Array(1001).fill(f.route.sections[0]);assert(has(inspect(f),'ROAD_SECTIONS_INVALID'));
});

test('changed road direction, map snapshot, shape or trip revokes evidence',()=>{
  for(const change of [f=>f.route.sections[0].spans[1].segmentRef=roadRef(102,'-'),f=>f.route.sections[0].spans[1].segmentRef=roadRef(102).replace(':3217:',':3218:'),f=>f.route.sections[0].polyline=encodePoints([{lat:32,lng:-102},{lat:32.001,lng:-101.99999},{lat:32.002,lng:-102}]),f=>f.request.fingerprint='new',f=>f.current.fingerprint='other',f=>f.evidence.routeId='other',f=>f.evidence.complete=false]){
    const f=roadBindingFixture();change(f);assert.equal(inspect(f).status,'HOLD');
  }
});

test('nearby overpasses or carriageways cannot connect without the same directed node',()=>{
  const f=roadBindingFixture();f.evidence.roads[1].startNode='separate-bridge-deck';
  assert(has(inspect(f),'ROAD_CONNECTION_UNVERIFIED'));
  for(const change of [f=>delete f.evidence.roads[0].endNode,f=>f.evidence.roads.pop(),f=>f.evidence.roads[1]=null,f=>f.evidence.roads.reverse()]){const f=roadBindingFixture();change(f);assert.equal(inspect(f).status,'HOLD');}
});

test('negative direction uses reversed canonical nodes, not signposted cardinal direction',()=>{
  const f=roadBindingFixture();f.route.sections[0].spans[1].segmentRef=roadRef(102,'-');
  f.evidence.roads[1].segmentRef=roadRef(102,'-0..1');f.evidence.destination.segmentRef=roadRef(102,'-0..1');
  f.evidence.roads[1].startNode='node-C';f.evidence.roads[1].endNode='node-B';assert.equal(inspect(f).status,'REVIEW_REQUIRED');
  f.evidence.roads[1].endNode='node-D';assert(has(inspect(f),'ROAD_CONNECTION_UNVERIFIED'));
});

test('partial same-edge ranges must meet exactly and cannot jump to another road mid-edge',()=>{
  const f=roadBindingFixture();const s=f.route.sections[0];s.spans[0].segmentRef=roadRef(101,'+0.2..0.5');s.spans[1].segmentRef=roadRef(101,'+0.5..0.9');
  for(let i=0;i<2;i++){f.evidence.roads[i].segmentRef=s.spans[i].segmentRef;f.evidence.roads[i].startNode='node-A';f.evidence.roads[i].endNode='node-B';}
  f.evidence.origin.segmentRef=s.spans[0].segmentRef;f.evidence.destination.segmentRef=s.spans[1].segmentRef;
  assert.equal(inspect(f).status,'REVIEW_REQUIRED');
  s.spans[1].segmentRef=roadRef(101,'+0.6..0.9');f.evidence.roads[1].segmentRef=s.spans[1].segmentRef;f.evidence.destination.segmentRef=s.spans[1].segmentRef;assert(has(inspect(f),'ROAD_CONNECTION_UNVERIFIED'));
  const g=roadBindingFixture();g.route.sections[0].spans[0].segmentRef=roadRef(101,'+0..0.9');g.evidence.roads[0].segmentRef=roadRef(101,'+0..0.9');g.evidence.origin.segmentRef=roadRef(101,'+0..0.9');assert(has(inspect(g),'ROAD_CONNECTION_UNVERIFIED'));
});

test('connected nodes cannot override forbidden, missing or mismatched turn evidence',()=>{
  for(const change of [e=>e.transitions=[],e=>e.transitions[0].allowed=false,e=>e.transitions[0].fromOccurrence=1,e=>e.transitions[0].status='conflicting',e=>e.transitions[0].sourceRecordId='']){
    const f=roadBindingFixture();change(f.evidence);assert.equal(inspect(f).status,'HOLD');
  }
});

test('address pins, opposite-side roads and nearby unverified entrances hold',()=>{
  for(const change of [e=>delete e.destination,e=>e.destination.method='geocoded-address',e=>e.destination.segmentRef=roadRef(102,'-0..1'),e=>e.destination.requestedLocation={lat:32.00201,lng:-102},e=>e.destination.matchedLocation={lat:32.00201,lng:-102},e=>e.origin.method='nearest-road',e=>e.destination.status='unknown']){
    const f=roadBindingFixture();change(f.evidence);assert.equal(inspect(f).status,'HOLD');
  }
});

test('old, future, conflicting or mid-trip expiring source evidence holds',()=>{
  for(const part of ['road','turn','destination']) for(const [field,value] of [['observedAt','2023-06-15T00:00:00Z'],['observedAt','2026-10-13T12:01:00Z'],['validUntil','2026-10-13T13:00:30Z'],['validUntil','2026-02-30T00:00:00Z'],['validFrom','2026-10-13T14:00:00Z'],['sourceUrl','https://name:password@example.gov/source'],['status','conflicting']]){
    const f=roadBindingFixture(),record=part==='road'?f.evidence.roads[0]:part==='turn'?f.evidence.transitions[0]:f.evidence.destination;record[field]=value;assert.equal(inspect(f).status,'HOLD');
  }
});

test('actual trip times must match requested departure and remain continuous between sections',()=>{
  for(const change of [f=>f.route.sections[0].departure.time='2026-10-13T13:01:00Z',f=>f.route.sections[0].arrival.time='2026-10-13T12:59:00Z',f=>f.route.sections[0].arrival.time='2026-02-30T13:01:00Z',f=>f.route.sections[0].arrival.time='2026-10-13T13:01:00-00:00',f=>f.request.departure='any']){const f=roadBindingFixture();change(f);assert(has(inspect(f),'ROAD_TIMELINE_INVALID'));}
  const f=roadBindingFixture();f.route.sections[0].departure.time='2026-10-13T07:00:00-06:00';assert.equal(inspect(f).status,'REVIEW_REQUIRED');
});

test('sub-floating-point gaps cannot be rounded into a connected road or end node',()=>{
  assert.equal(parseDirectedSegmentReference(roadRef(101,'+0.50000000000000001..0.50000000000000002')).startKey,'0.50000000000000001');
  assert.equal(parseDirectedSegmentReference(roadRef(101,'+0.20..1.000')).reference,roadRef(101,'+0.2..1'));
  assert.throws(()=>parseDirectedSegmentReference(roadRef(101,'+0..1.00000000000000001')));
  const f=roadBindingFixture();f.route.sections[0].spans[0].segmentRef=roadRef(101,'+0..0.99999999999999999');
  f.evidence.roads[0].segmentRef=f.route.sections[0].spans[0].segmentRef;f.evidence.origin.segmentRef=f.evidence.roads[0].segmentRef;
  assert(has(inspect(f),'ROAD_CONNECTION_UNVERIFIED'));
});

test('section boundaries retain exact road ordering and require continuous time and topology',()=>{
  const f=roadBindingFixture(),s=f.route.sections[0],mid={lat:32.001,lng:-102};
  const next=structuredClone(s);s.polyline=encodePoints([f.request.trip.origin,mid]);s.spans=s.spans.slice(0,1);s.arrival={time:'2026-10-13T13:00:30Z',place:{location:mid}};s.summary.length=111;
  next.id='s2';next.polyline=encodePoints([mid,f.request.trip.destination]);next.spans=[{offset:0,segmentRef:roadRef(102)}];next.departure=structuredClone(s.arrival);next.summary.length=111;
  f.route.sections.push(next);f.evidence.sectionBindings=f.route.sections.map(s=>({id:s.id,polyline:s.polyline}));f.evidence.roads[1].sectionId='s2';f.evidence.roads[1].offset=0;
  assert.equal(inspect(f).status,'REVIEW_REQUIRED');
  next.departure.time='2026-10-13T13:00:31Z';assert(has(inspect(f),'ROAD_TIMELINE_INVALID'));
  next.departure.time=s.arrival.time;f.route.sections.reverse();assert.equal(inspect(f).status,'HOLD');
});

test('null and malformed source records yield holds instead of crashes',()=>{
  for(const value of [null,0,'',[],false])for(const key of ['origin','destination']){const f=roadBindingFixture();f.evidence[key]=value;assert.equal(inspect(f).status,'HOLD');}
  for(const value of [null,{},0,false]){const f=roadBindingFixture();f.evidence.transitions[0]=value;assert.equal(inspect(f).status,'HOLD');}
  for(const value of [null,{},[],false])assert.equal(inspectRoadBinding(value,null,null,null).status,'HOLD');
});
