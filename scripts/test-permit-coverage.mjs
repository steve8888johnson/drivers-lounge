import test from 'node:test';
import assert from 'node:assert/strict';
import { routeLineCoverage, coverageMarkup, maneuverChoices } from '../src/assets/permits/route-coverage.mjs';
import { buildMaster, confirmPermit, confirmGeometry, geometryErrors, locateOnMaster } from '../src/assets/permits/core.mjs';
import { reviewFixture } from './fixtures/permitted-review.mjs';
import { walkthrough } from '../src/assets/permits/walkthrough.mjs';

test('omitted first, middle or last issued lines cannot be confirmed even with continuous geometry', () => {
  for (const at of [0, 1, 2]) {
    const t = reviewFixture(), p = t.permits[0];
    const lines = p.routeText.split('\n'); lines.splice(at, 0, 'SYNTHETIC omitted instruction'); p.routeText = lines.join('\n');
    p.steps.forEach(step => { if (step.routeLine > at) step.routeLine++; });
    confirmPermit(p);
    assert.deepEqual(routeLineCoverage(p).missing, [at + 1]);
    assert.throws(() => confirmGeometry(p), /no maneuver reference/);
    assert(geometryErrors(p).some(error => /do not skip instructions/.test(error)));
    const m = buildMaster(t, { geometry: true });
    assert(!m.ready); assert(!walkthrough(m).available); assert.deepEqual(maneuverChoices(m), []);
    assert.equal(locateOnMaster(m, { point: [41, -80.001], accuracy: 5, timestamp: Date.now() }).status, 'route-hold');
  }
});

test('line numbers and exact text survive blanks, CRLF and repeated text', () => {
  const p = { routeText: '\r\nSame text\r\n \r\nSame text\r\n', steps: [{ routeLine: 2 }] };
  const c = routeLineCoverage(p);
  assert.deepEqual(c.rows.map(r => r.line), [2, 4]); assert.equal(c.rows[0].text, 'Same text\r');
  assert.deepEqual(c.missing, [4]); assert(!c.complete);
  p.steps.push({ routeLine: 4 }); assert(routeLineCoverage(p).complete);
});

test('multiple maneuvers may cite the same line but cannot conceal an uncovered line', () => {
  const p = { routeText: 'Two turns in one instruction\nFinal destination instruction', steps: [{ routeLine: 1 }, { routeLine: 1 }] };
  assert.deepEqual(routeLineCoverage(p).rows[0].maneuvers, [1, 2]);
  assert.deepEqual(routeLineCoverage(p).missing, [2]);
  p.steps.push({ routeLine: 2 }); assert(routeLineCoverage(p).complete);
});

test('blank, out-of-bounds and noninteger references are explicitly invalid', () => {
  const p = { routeText: 'Issued line\n\nFinal line', steps: [0, 2, 4, 1.5, '1', null, NaN].map(routeLine => ({ routeLine })) };
  const c = routeLineCoverage(p); assert.equal(c.invalidManeuvers.length, 7); assert.deepEqual(c.missing, [1, 3]);
  assert(!routeLineCoverage(null).complete); assert(!routeLineCoverage({ routeText: ' \n' }).complete);
});

test('coverage markup escapes all imported text and identifies missing references without certifying it', () => {
  const markup = coverageMarkup([{ state: '<img src=x onerror=alert(1)>', number: '<script>bad</script>', routeText: '<b>Keep left & stop</b>\nMissing final turn', steps: [{ routeLine: 1 }] }]);
  assert(!markup.includes('<img')); assert(!markup.includes('<script')); assert(!markup.includes('<b>'));
  assert(markup.includes('&lt;b&gt;Keep left &amp; stop&lt;/b&gt;'));
  assert.match(markup, /1 of 2 saved route lines referenced/); assert.match(markup, /Missing maneuver reference/);
  assert.match(markup, /References do not prove/);
});

test('jump choices follow the checked border order and are absent for incomplete geometry', () => {
  const t = reviewFixture(), m = buildMaster(t, { geometry: true }), before = structuredClone(t);
  const choices = maneuverChoices(m);
  assert.deepEqual(choices.map(c => c.state), ['OH','OH','IN','IN','IL','IL']);
  assert.equal(choices[4].text, t.permits[2].steps[0].text);
  assert.deepEqual(maneuverChoices({ ...m, geometryChecked: false }), []);
  assert.deepEqual(maneuverChoices({ ...m, ready: false }), []); assert.deepEqual(t, before);
});
