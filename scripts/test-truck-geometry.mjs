import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeTruckPolyline,inspectTruckGeometry,GEOMETRY_LIMITS} from '../src/assets/truck-route-geometry.mjs';
import {encodePoints,sectionFixture,tripFixture} from './fixtures/truck-geometry.mjs';
const has = (result, code) => result.reasons.some(reason => reason.code === code);

test('decoder matches HERE published v1 sample, including signed deltas', () => {
  assert.deepEqual(decodeTruckPolyline('BFoz5xJ67i1B1B7PzIhaxL7Y'), [
    {lat:50.10228,lng:8.69821},{lat:50.10201,lng:8.69567},
    {lat:50.10063,lng:8.6915},{lat:50.09878,lng:8.68752}
  ]);
});
test('rejects malformed, truncated, overlong and unsupported encodings', () => {
  for (const value of ['',null,'BF!','BF_','BF_'.concat('_'.repeat(40)), 'BFgAAA','AF','CF','BAAAAA','BVAAAA','BF','BFAA','BFAAA', 'BF'.concat('A'.repeat(200001))]) {
    assert.throws(() => decodeTruckPolyline(value), undefined, String(value).slice(0,30));
  }
  assert.throws(() => decodeTruckPolyline(encodePoints([{lat:91,lng:0},{lat:91.1,lng:0}])));
  assert.throws(() => decodeTruckPolyline(encodePoints([{lat:0,lng:181},{lat:0,lng:182}])));
  const three = encodePoints([{lat:0,lng:0},{lat:0.001,lng:0},{lat:0.002,lng:0}]);
  assert.throws(() => decodeTruckPolyline(three,2), /LIMIT/);
});
test('supports precision 5–7 and both hemispheres without 32-bit overflow', () => {
  const points = [{lat:-45.1234567,lng:-170.1234567},{lat:-45.1234566,lng:-170.1234566}];
  assert.deepEqual(decodeTruckPolyline(encodePoints(points,7)),points);
  assert.equal(decodeTruckPolyline(encodePoints(points,6))[0].lng,-170.123457);
});
test('coherent geometry stays review-only and does not expose coordinates', () => {
  const result = inspectTruckGeometry([sectionFixture()],tripFixture());
  assert.equal(result.status,'REVIEW_REQUIRED'); assert.equal(result.guidanceAllowed,false);
  assert.deepEqual(result.reasons,[]); assert(!JSON.stringify(result).includes('102'));
});
test('missing request endpoints or vehicle section metadata stays held', () => {
  assert(has(inspectTruckGeometry([sectionFixture()],null),'GEOMETRY_TRIP_ENDPOINTS_MISSING'));
  for (const mutate of [s=>delete s.type,s=>s.type='ferry',s=>delete s.departure,s=>s.arrival.place.location.lat='32.001',s=>s.summary.length=0]) {
    const section=sectionFixture(); mutate(section); assert.equal(inspectTruckGeometry([section],tripFixture()).status,'HOLD');
  }
});
test('wrong or reversed trip endpoints cannot pass with valid encoding', () => {
  const reverse=sectionFixture('reverse',32.001,32);
  const result=inspectTruckGeometry([reverse],tripFixture());
  assert(has(result,'GEOMETRY_ORIGIN_MISMATCH')); assert(has(result,'GEOMETRY_DESTINATION_MISMATCH'));
  const changed=tripFixture(); changed.destination={lat:33,lng:-84};
  assert(has(inspectTruckGeometry([sectionFixture()],changed),'GEOMETRY_DESTINATION_MISMATCH'));
});
test('section joins must be continuous and are never repaired or reordered', () => {
  const trip={origin:{lat:32,lng:-102},destination:{lat:32.002,lng:-102}};
  const sections=[sectionFixture('s1',32,32.001),sectionFixture('s2',32.001,32.002)];
  assert.equal(inspectTruckGeometry(sections,trip).status,'REVIEW_REQUIRED');
  sections[1]=sectionFixture('s2',32.0015,32.002);
  const before=JSON.stringify(sections);
  assert(has(inspectTruckGeometry(sections,trip),'GEOMETRY_SECTION_GAP')); assert.equal(JSON.stringify(sections),before);
  assert.equal(inspectTruckGeometry([...sections].reverse(),trip).status,'HOLD');
});
test('section metadata must match geometry and declared length', () => {
  const section=sectionFixture(); section.departure.place.location={lat:31,lng:-102};
  assert(has(inspectTruckGeometry([section],tripFixture()),'GEOMETRY_SECTION_ENDPOINT_MISMATCH'));
  section.summary.length=5000;
  assert(has(inspectTruckGeometry([section],tripFixture()),'GEOMETRY_LENGTH_MISMATCH'));
});
test('zero-length shapes, huge jumps and exhausted route bounds stay held', () => {
  assert(has(inspectTruckGeometry([sectionFixture('zero',32,32)],tripFixture()),'GEOMETRY_DEGENERATE'));
  assert(has(inspectTruckGeometry([sectionFixture('jump',32,35)],tripFixture()),'GEOMETRY_LARGE_JUMP'));
  assert(has(inspectTruckGeometry(Array(1001).fill(sectionFixture()),tripFixture()),'GEOMETRY_SECTIONS_INVALID'));
  const long=sectionFixture(); long.polyline=encodePoints(Array(20000).fill({lat:32,lng:-102}));
  assert(has(inspectTruckGeometry([long,long,long],tripFixture()),'GEOMETRY_LIMIT_EXCEEDED'));
  assert.equal(GEOMETRY_LIMITS.points,50000);
});
