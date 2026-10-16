import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_ROUTE, createPreviewSession, samplePosition, sampleAnnouncement, formatDistance } from '../src/assets/navigation/session.mjs';

test('sample playback stays stationary until started and never allows guidance', () => {
  const s = createPreviewSession(); s.advance(.5); assert.equal(s.snapshot().seconds, 0);
  s.play(); s.advance(.5); assert.equal(s.snapshot().seconds, .5); assert.equal(s.snapshot().guidanceAllowed, false);
  s.pause(); s.advance(1); assert.equal(s.snapshot().seconds, .5);
  s.play(); s.advance(.5); assert.equal(s.snapshot().seconds, 1);
  assert.throws(() => createPreviewSession({ ...SAMPLE_ROUTE, mode: 'live' }));
});
test('a long frame, invalid time or background interruption pauses without jumping', () => {
  for (const delta of [2, 600, NaN, Infinity, -1]) {
    const s = createPreviewSession(); s.play(); s.advance(.5); s.advance(delta);
    assert.equal(s.snapshot().running, false); assert.equal(s.snapshot().seconds, .5);
  }
});
test('next, arrival, replay and reset keep the maneuver and remaining totals aligned', () => {
  const s = createPreviewSession(); s.play(); s.next();
  assert.equal(s.snapshot().running, false); assert.equal(s.snapshot().turn.maneuver, 'left');
  assert.equal(s.snapshot().distance, 290); assert.equal(s.snapshot().next.maneuver, 'arrive');
  s.next(); assert.equal(s.snapshot().turn.maneuver, 'arrive'); s.next();
  assert.equal(s.snapshot().remainingMeters, 0); assert.equal(s.snapshot().remainingSeconds, 0); assert.equal(s.snapshot().arrived, true);
  s.play(); assert.equal(s.snapshot().index, 0); assert.equal(s.snapshot().running, true);
  s.reset(); assert.equal(s.snapshot().running, false); assert.equal(s.snapshot().fraction, 0);
});
test('route mutations and corrupt order cannot replace a running sample', () => {
  const route = structuredClone(SAMPLE_ROUTE), s = createPreviewSession(route);
  route.turns[0].text = 'corrupted'; assert.notEqual(s.snapshot().turn.text, 'corrupted');
  for (const mutate of [r => r.turns[1].offset = 2, r => r.turns[1].seconds = 1, r => r.turns[0].text = '', r => r.turns[0].maneuver = 'unknown', r => r.turns.pop()]) {
    const r = structuredClone(SAMPLE_ROUTE); mutate(r); assert.throws(() => createPreviewSession(r));
  }
});
test('map arrow follows the illustrated path and clamps its endpoints', () => {
  assert.deepEqual(samplePosition(0), { x: 220, y: 900, heading: 0 });
  assert.deepEqual(samplePosition(1), { x: 700, y: 140, heading: 0 });
  assert.deepEqual(samplePosition(-1), samplePosition(0)); assert.deepEqual(samplePosition(2), samplePosition(1));
  assert.equal(samplePosition(.5).heading, 90);
});
test('speech keys prevent repeated distance chatter and change on approach or next turn', () => {
  const s = createPreviewSession(), start = sampleAnnouncement(s.snapshot());
  s.play(); s.advance(1); assert.equal(sampleAnnouncement(s.snapshot()).key, start.key);
  for (let n = 0; n < 31; n++) s.advance(1);
  assert.notEqual(sampleAnnouncement(s.snapshot()).key, start.key);
  s.next(); assert.match(sampleAnnouncement(s.snapshot()).text, /left onto Delivery Lane/);
  assert.match(sampleAnnouncement(s.snapshot()).text, /Sample route/);
  s.next(); s.next(); assert.equal(sampleAnnouncement(s.snapshot()).key, 'arrived');
});
test('distance formatting avoids a false zero before a turn and rejects invalid readings', () => {
  assert.equal(formatDistance(8), '25 ft'); assert.equal(formatDistance(0), 'At turn');
  assert.equal(formatDistance(NaN), '—'); assert.equal(formatDistance(-2), '—');
  assert.equal(formatDistance(290), '0.2 mi'); assert.equal(formatDistance(25, true), '75 feet');
});
