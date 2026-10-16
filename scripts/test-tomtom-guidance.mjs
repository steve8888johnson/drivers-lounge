import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewTomTomGuidance } from '../server/tomtom-guidance.mjs';
import { prepareTomTomRequest, reviewTomTomCandidate } from '../server/tomtom-candidate.mjs';
import { vehicleFixture } from './fixtures/truck-axles.mjs';
import { tripFixture } from './fixtures/truck-geometry.mjs';
const point = latitude => ({ latitude, longitude: -102 });
const fixture = () => ({ summary: { lengthInMeters: 111.195, travelTimeInSeconds: 60 }, legs: [{ points: [point(32), point(32.0005), point(32.001)] }], guidance: { instructions: [
  { point: point(32), pointIndex: 0, routeOffsetInMeters: 0, travelTimeInSeconds: 0, instructionType: 'LOCATION_DEPARTURE', maneuver: 'DEPART', message: 'Head north.' },
  { point: point(32.0005), pointIndex: 1, routeOffsetInMeters: 55.5975, travelTimeInSeconds: 30, instructionType: 'DIRECTION_INFO', maneuver: 'STRAIGHT', message: 'Continue straight.', roadNumbers: ['US 83'], signpostText: 'Sample exit', exitNumber: '1A' },
  { point: point(32.001), pointIndex: 2, routeOffsetInMeters: 111.195, travelTimeInSeconds: 60, instructionType: 'LOCATION_ARRIVAL', maneuver: 'ARRIVE_RIGHT', message: 'Your destination is on the right.' }
] } });
const held = (change, code) => { const r = fixture(); change(r); const result = reviewTomTomGuidance(r); assert.equal(result.structurePassed, false); assert.equal(result.guidanceAllowed, false); assert.equal(result.instructions.length, 0); if (code) assert.equal(result.reasons[0].code, code); };
test('provider text, exit, road and side remain exact; structural success never authorizes guidance', () => {
  const r = fixture(), result = reviewTomTomGuidance(r);
  assert.equal(result.structurePassed, true); assert.equal(result.guidanceAllowed, false); assert.equal(result.status, 'REVIEW_ONLY');
  assert.equal(result.instructions[1].exitNumber, '1A'); assert.deepEqual(result.instructions[1].roadNumbers, ['US 83']);
  assert.equal(result.instructions[2].message, r.guidance.instructions[2].message);
  result.instructions[1].roadNumbers.push('mutation'); assert.deepEqual(r.guidance.instructions[1].roadNumbers, ['US 83']);
});
test('instruction points must belong to their declared segment and progress forward', () => {
  held(r => r.guidance.instructions[1].point.longitude += .01, 'INSTRUCTION_ROUTE_BINDING_MISMATCH');
  held(r => r.guidance.instructions[1].pointIndex = 2, 'INSTRUCTION_ROUTE_BINDING_MISMATCH');
  held(r => r.guidance.instructions[1].routeOffsetInMeters = 5, 'INSTRUCTION_ROUTE_BINDING_MISMATCH');
  held(r => r.guidance.instructions[1].pointIndex = -1, 'INSTRUCTION_POINT_INVALID');
  held(r => r.guidance.instructions[1].point.latitude = '32', 'INSTRUCTION_POINT_INVALID');
  const r = fixture(); r.guidance.instructions[1].point = point(32.00025); r.guidance.instructions[1].pointIndex = 0; r.guidance.instructions[1].routeOffsetInMeters = 27.79875;
  assert.equal(reviewTomTomGuidance(r).structurePassed, true);
});
test('missing, duplicate, out-of-order and unsupported maneuvers hold the whole instruction list', () => {
  held(r => delete r.guidance, 'INSTRUCTIONS_MISSING');
  held(r => r.guidance.instructions.splice(1, 0, structuredClone(r.guidance.instructions[1])), 'INSTRUCTION_DUPLICATED');
  held(r => r.guidance.instructions[1].travelTimeInSeconds = 61, 'INSTRUCTION_ORDER_INVALID');
  held(r => r.guidance.instructions[1].maneuver = 'FUTURE_UNSUPPORTED_CODE', 'INSTRUCTION_KIND_UNSUPPORTED');
  held(r => r.guidance.instructions[1].routeOffsetInMeters = NaN, 'INSTRUCTION_ORDER_INVALID');
});
test('invalid provider text, missing arrival and mismatched endpoints never become a spoken instruction', () => {
  for (const message of ['', '<b>Turn left</b>', 'Hidden\u202eright', 'x'.repeat(1001)]) held(r => r.guidance.instructions[1].message = message, 'INSTRUCTION_TEXT_INVALID');
  held(r => r.guidance.instructions[1].roadNumbers = 'US 83', 'INSTRUCTION_TEXT_INVALID');
  held(r => r.guidance.instructions[2].maneuver = 'TURN_LEFT', 'INSTRUCTION_ENDPOINTS_INVALID');
  held(r => r.guidance.instructions[0].travelTimeInSeconds = 1, 'INSTRUCTION_ENDPOINTS_INVALID');
  held(r => r.guidance.instructions[1].instructionType = 'LOCATION_ARRIVAL', 'INSTRUCTION_ENDPOINTS_INVALID');
  held(r => r.summary.lengthInMeters = 1000, 'INSTRUCTION_LENGTH_MISMATCH');
});
test('text instructions are opt-in; candidate review rejects missing instructions without exposing them', () => {
  const input = { vehicle: vehicleFixture(), ...tripFixture(), departure: '2026-10-13T13:00:00.000Z', now: Date.parse('2026-10-13T12:00:00Z') };
  assert.equal(new URLSearchParams(prepareTomTomRequest(input).query).has('instructionsType'), false);
  const request = prepareTomTomRequest(input, { instructions: true }), q = new URLSearchParams(request.query);
  assert.equal(q.get('instructionsType'), 'text'); assert.equal(q.get('language'), 'en-US'); assert.equal(q.get('travelMode'), 'truck');
  const r = fixture(); delete r.guidance;
  const result = reviewTomTomCandidate({ routes: [r] }, { ...request, trip: input, departure: input.departure });
  assert(result.reasons.some(r => r.code === 'INSTRUCTIONS_MISSING')); assert.equal(result.guidanceAllowed, false); assert.equal(result.instructions, undefined);
});
