import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMaster, confirmGeometry, geometryReviewed, crewKey } from '../src/assets/permits/core.mjs';
import { captureTripDraft, applyGeometryDraft } from '../src/assets/permits/drafts.mjs';
import { walkthrough } from '../src/assets/permits/walkthrough.mjs';
import { confirmHazmatRoute } from '../src/assets/permits/hazmat.mjs';
import { reviewFixture } from './fixtures/permitted-review.mjs';
const now = Date.parse('2026-09-25T15:00:00Z');

test('failed capture cannot partially apply load or permit fields', () => {
  const trip = reviewFixture(), original = structuredClone(trip);
  assert.throws(() => captureTripDraft(trip, draft => {
    draft.name = 'unsaved name'; draft.permits[0].routeText = 'unsaved route';
    draft.hazmat.materials[0].quantity = '9999';
    applyGeometryDraft(draft.permits[0], '{broken');
  }), /invalid JSON/);
  assert.deepEqual(trip, original);
});
test('successful capture creates an independent draft and invalidates changed hazmat approval', () => {
  const trip = reviewFixture(), draft = captureTripDraft(trip, next => { next.hazmat.materials[0].quantity = '2000'; });
  assert.equal(trip.hazmat.materials[0].quantity, '1000');
  assert.equal(buildMaster(trip, { geometry: true }).ready, true);
  assert.equal(buildMaster(draft, { geometry: true }).ready, false);
});
test('reordering geometry JSON properties preserves public geometry provenance and confirmation', () => {
  const p = reviewFixture().permits[0]; p.geometrySource = { format: 'promiles-public-json/v1', note: 'Synthetic public geometry' }; confirmGeometry(p);
  const original = structuredClone(p), reordered = p.steps.map(s => ({ points: s.points, text: s.text, routeLine: s.routeLine, lane: s.lane, road: s.road }));
  applyGeometryDraft(p, JSON.stringify(reordered)); assert.deepEqual(p, original); assert(geometryReviewed(p));
});
test('meaningful coordinate, instruction, lane and line edits invalidate geometry', () => {
  for (const mutate of [s => s.points[1][1] -= .00001, s => s.text += ' changed', s => s.lane = 'changed', s => s.routeLine = 3]) {
    const p = reviewFixture().permits[0], steps = structuredClone(p.steps); mutate(steps[0]); applyGeometryDraft(p, JSON.stringify(steps));
    assert.equal(p.geometrySource, null); assert.equal(geometryReviewed(p), false);
  }
});
test('parked walkthrough follows every supplied maneuver in border order with exact text', () => {
  const trip = reviewFixture(), original = structuredClone(trip); trip.permits.reverse();
  // Changing the stored route order requires a renewed all-state hazmat review.
  for (const p of trip.permits) confirmHazmatRoute(trip, p, now);
  const master = buildMaster(trip, { geometry: true });
  for (let i = 0; i < 6; i++) {
    const view = walkthrough(master, i, 'driver', now), p = original.permits[Math.floor(i / 2)];
    assert.equal(view.available, true); assert.equal(view.total, 6); assert.equal(view.permit.state, p.state); assert.deepEqual(view.step, p.steps[i % 2]); assert.equal(view.enteringState, i % 2 === 0);
    assert(view.meters > 80 && view.meters < 90);
  }
  assert.equal(walkthrough(master, 1, 'driver', now).next.permit.state, 'IN');
  assert.equal(walkthrough(master, 5, 'driver', now).next, null);
  assert.equal(walkthrough(master, -1, 'driver', now).index, 0);
  assert.equal(walkthrough(master, 999, 'driver', now).index, 5);
});
test('walkthrough shows source-specific upcoming alerts and lead/chase notes without editing the trip', () => {
  const trip = reviewFixture(), before = crewKey(trip), master = buildMaster(trip, { geometry: true });
  assert.match(walkthrough(master, 0, 'lead', now).alerts.join(' '), /Upcoming Hazmat route alert: SYNTHETIC OH tunnel instruction/);
  assert.match(walkthrough(master, 0, 'lead', now).alerts.join(' '), /Lead escort/);
  assert.match(walkthrough(master, 1, 'chase', now).alerts.join(' '), /Chase escort/);
  assert.equal(crewKey(trip), before);
});
test('incomplete permits, missing states, hazmat conflicts and changed cargo block walkthrough', () => {
  for (const mutate of [t => t.permits.splice(1, 1), t => t.permits[0].review = null, t => t.hazmat.materials[0].quantity = '2000', t => t.permits[0].hazmatRoute.disposition = 'conflict']) {
    const trip = reviewFixture(); mutate(trip); const view = walkthrough(buildMaster(trip, { geometry: true }), 0, 'driver', now);
    assert.equal(view.available, false); assert.equal(view.step, undefined);
  }
});
