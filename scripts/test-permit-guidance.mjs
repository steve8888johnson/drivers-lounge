import test from 'node:test';
import assert from 'node:assert/strict';
import { blankTrip, blankPermit, buildMaster, confirmPermit, confirmGeometry, geometryErrors, locateOnMaster } from '../src/assets/permits/core.mjs';
import { createGuidanceSession, maneuverCue } from '../src/assets/permits/guidance.mjs';
import { walkthrough } from '../src/assets/permits/walkthrough.mjs';

const now = Date.parse('2026-10-14T15:00:00Z');
function fixture(lines = [[[40, -100], [40, -99.996]]]) {
  const trip = blankTrip(), p = blankPermit();
  Object.assign(trip, { name: 'SYNTHETIC ONLY — not a road or permit', departure: '2026-10-14', acknowledged: true });
  Object.assign(trip.profile, { heightFt: '14', widthFt: '12', lengthFt: '90', weightLb: '110000', axles: '7' });
  Object.assign(p, { state: 'UT', number: 'SYNTHETIC-UT', validFrom: trip.departure, validTo: '2026-10-16', timeZone: 'America/Denver', complete: true,
    entry: { label: 'Synthetic entry', state: '', road: 'TEST ROAD' }, exit: { label: 'Synthetic exit', state: '', road: 'TEST ROAD' },
    routeText: lines.map((_, i) => `Synthetic instruction ${i + 1}`).join('\n'), restrictions: 'SYNTHETIC ONLY — NOT FOR DRIVING',
    documents: [{ id: 'synthetic-original', name: 'not-a-permit.png', type: 'image/png', size: 1 }],
    steps: lines.map((points, i) => ({ points, routeLine: i + 1, text: `Synthetic instruction ${i + 1}`, road: 'TEST ROAD', lane: '' })) });
  trip.permits.push(p); confirmPermit(p); confirmGeometry(p); return trip;
}
const fix = (point, time = now, accuracy = 5) => ({ point, timestamp: time, accuracy });
const locate = (m, point, seconds = 0, previous = null) => locateOnMaster(m, fix(point, now + seconds * 1000), previous, now + seconds * 1000);

test('guidance callbacks are bound to one complete trip and cancelled generations cannot revive', () => {
  const trip = fixture(), session = createGuidanceSession(), first = session.start(trip);
  assert(session.matches(first, trip)); session.cancel(); assert(!session.matches(first, trip));
  const second = session.start(trip); assert(!session.active(first)); assert(session.matches(second, trip));
  assert.throws(() => { second.snapshot.permits[0].steps[0].points[0][0] = 50; }, TypeError);
  const changes = [t => t.id += 'other', t => t.revision++, t => t.departure = '2026-10-15', t => t.profile.widthFt = '13', t => t.acknowledged = false, t => t.completedAt = new Date(now).toISOString(), t => t.permits[0].review = null, t => t.permits[0].restrictions += ' changed', t => t.permits[0].steps[0].points[0][0] += .01, t => t.permits[0].documents[0].id = 'replacement', t => t.shared = { revision: 2 }];
  for (const change of changes) { const altered = structuredClone(trip); change(altered); assert(!session.matches(second, altered)); }
  trip.permits[0].routeText = 'EDITED'; assert.equal(second.snapshot.permits[0].routeText, 'Synthetic instruction 1'); assert(!session.matches(second, trip));
});

test('a missed turn leaves the supplied line and holds without inventing a detour', () => {
  const m = buildMaster(fixture([[[40, -100], [40, -99.998]], [[40, -99.998], [40.002, -99.998]]]), { geometry: true });
  const first = locate(m, [40, -99.999]); assert.equal(first.status, 'on-route');
  const missed = locate(m, [40, -99.996], 10, first); assert.equal(missed.status, 'deviation'); assert.match(missed.message, /No automatic reroute/); assert.equal(missed.step, undefined);
});

test('nearby return road is ambiguous even with a recent valid fix on the approach', () => {
  const m = buildMaster(fixture([[[39.998, -100], [40, -100], [40, -99.997], [40.0002, -99.997], [40.0002, -100]]]), { geometry: true });
  const first = locate(m, [39.9985, -100]); assert.equal(first.status, 'on-route');
  assert.equal(locate(m, [40, -99.9996], 10, first).status, 'ambiguous');
  assert.equal(locate(m, [40, -99.9996]).status, 'ambiguous');
});

test('small GPS jitter is tolerated but repeated backward movement cannot reset progress', () => {
  const m = buildMaster(fixture(), { geometry: true });
  const first = locate(m, [40, -99.998]);
  const jitter = locate(m, [40, -99.9982], 2, first); assert.equal(jitter.status, 'on-route'); assert.equal(jitter.highWater, first.progress);
  const backward = locate(m, [40, -99.9985], 4, jitter); assert.equal(backward.status, 'direction-hold'); assert.equal(backward.nextStep, undefined);
});

test('a GPS jump over multiple maneuvers holds instead of silently assuming the turns', () => {
  const m = buildMaster(fixture([[[40, -100], [40, -99.999]], [[40, -99.999], [40, -99.998]], [[40, -99.998], [40, -99.996]]]), { geometry: true });
  const first = locate(m, [40, -99.9998]);
  assert.equal(locate(m, [40, -99.9975], 10, first).status, 'continuity-hold');
});

test('missing, stale, future and malformed GPS/progress data never issue a maneuver', () => {
  const m = buildMaster(fixture(), { geometry: true });
  for (const bad of [null, {}, fix([40, -99.999], now - 16000), fix([40, -99.999], now + 6000), fix([40, -99.999], now, 51)]) assert.equal(locateOnMaster(m, bad, null, now).status, 'gps-uncertain');
  const first = locate(m, [40, -99.999]);
  assert.equal(locate(m, [40, -99.9989], 31, first).status, 'ambiguous');
  assert.equal(locate(m, [40, -99.9989], 1, { ...first, progress: NaN }).status, 'route-hold');
  assert.equal(locate(m, [40, -99.9989], 0, first).status, 'gps-uncertain');
});

function borderFixture() {
  const t = fixture(), p = t.permits[0], next = structuredClone(p); next.id += '-next'; next.state = 'WY'; next.number = 'SYNTHETIC-WY';
  p.exit = { label: 'Synthetic border', state: 'WY', road: 'TEST ROAD' };
  next.entry = { label: 'Synthetic border', state: 'UT', road: 'TEST ROAD' };
  next.steps[0].points = [[40, -99.996], [40, -99.992]];
  next.travelWindow = { from: '10:00', to: '18:00', days: [3], closedDates: [] };
  next.restrictions = 'SYNTHETIC NEXT STATE CONDITION';
  t.permits.push(next); for (const permit of t.permits) { confirmPermit(permit); confirmGeometry(permit); } return t;
}

test('the next state clock is checked before the border using that permit timezone', () => {
  const m = buildMaster(borderFixture(), { geometry: true }); assert(m.ready);
  const held = locate(m, [40, -99.999]); assert.equal(held.status, 'border-hold'); assert.match(held.message, /Upcoming WY border/); assert.equal(held.step, undefined);
  const openAt = Date.parse('2026-10-14T16:00:00Z');
  const clear = locateOnMaster(m, fix([40, -99.999], openAt), null, openAt); assert.equal(clear.status, 'on-route'); assert.equal(clear.upcomingBorder.permit.state, 'WY');
});

test('an upcoming expired permit is held before crossing, without replacing its route', () => {
  const t = borderFixture(); t.permits[1].validTo = '2026-10-14'; t.permits[1].travelWindow = null; confirmPermit(t.permits[1]); confirmGeometry(t.permits[1]);
  const m = buildMaster(t, { geometry: true }), later = Date.parse('2026-10-15T15:00:00Z');
  const result = locateOnMaster(m, fix([40, -99.999], later), null, later); assert.equal(result.status, 'border-hold'); assert.match(result.message, /effective dates/);
});

test('the end of supplied geometry stops guidance without claiming arrival or completing the permit', () => {
  const t = fixture(), m = buildMaster(t, { geometry: true }), result = locate(m, [40, -99.996]);
  assert.equal(result.status, 'end-of-geometry'); assert.match(result.message, /not confirmed/); assert.equal(t.completedAt, undefined); assert.equal(result.nextStep, undefined);
});

test('maneuvers sharing one printed source line still have separate spoken cue identities', () => {
  const t = fixture([[[40, -100], [40, -99.998]], [[40, -99.998], [40, -99.996]]]);
  t.permits[0].steps[1].routeLine = 1; confirmGeometry(t.permits[0]); const m = buildMaster(t, { geometry: true });
  const a = maneuverCue(locate(m, [40, -99.999])), b = maneuverCue(locate(m, [40, -99.997]));
  assert.equal(a.sourceLine, b.sourceLine); assert.notEqual(a.key, b.key); assert.equal(b.source, t.permits[0].routeText.split('\n')[0]); assert.equal(maneuverCue({ status: 'deviation' }), null);
});

test('parked border review shows exact source, next-state conditions and a current-time hold', () => {
  const t = borderFixture(), original = structuredClone(t), m = buildMaster(t, { geometry: true });
  const view = walkthrough(m, 0, 'driver', now);
  assert.equal(view.source, t.permits[0].routeText); assert.equal(view.border.permit.restrictions, 'SYNTHETIC NEXT STATE CONDITION');
  assert.match(view.border.clockMessage, /Current-time hold/); assert.match(view.border.windowText, /10:00–18:00/); assert.deepEqual(t, original);
  assert.equal(walkthrough(m, 1, 'driver', now).border, null);
});

test('zero-length geometry and blank source lines cannot pass review', () => {
  const p = fixture().permits[0]; p.steps[0].points = [[40, -100], [40, -100]]; assert(geometryErrors(p).some(e => /no usable/.test(e)));
  p.steps[0].points[1] = [40, -99.999]; p.routeText = ' \n'; assert(geometryErrors(p).some(e => /source route line/.test(e)));
});

test('a metadata-only route check cannot be used as reviewed geometry', () => {
  const t = fixture(); t.permits[0].geometryReview = null;
  const metadata = buildMaster(t); assert.equal(metadata.ready, true);
  assert.equal(locate(metadata, [40, -99.999]).status, 'route-hold'); assert.equal(walkthrough(metadata).available, false);
  assert.equal(buildMaster(t, { geometry: true }).ready, false);
});
