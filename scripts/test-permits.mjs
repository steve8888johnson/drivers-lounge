import test from 'node:test';
import assert from 'node:assert/strict';
import { blankPermit, blankTrip, buildMaster, confirmPermit, confirmGeometry, reviewed, geometryReviewed, geometryErrors, locateOnMaster, sanitizePermit, validDate, clone, crewKey, warnings, movementWindow } from '../src/assets/permits/core.mjs';
import { classifyQR, parsePermitText, importPublicQR } from '../src/assets/permits/import.mjs';
import { exampleTrip, illinoisText } from '../src/assets/permits/examples.mjs';
import { publicProviderURL, parsePublicProvider, decodePolyline } from '../src/assets/permits/provider.mjs';
import handler, { resolvePermitURL } from '../api/permit-route.mjs';

function permit(state, from, to, start, end) {
  const p = blankPermit(); Object.assign(p, { state, number: `TEST-${state}`, validFrom: '2026-09-22', validTo: '2026-09-27', timeZone: 'America/Chicago', complete: true, routeText: 'Follow the issued test road.', entry: { state: from, road: 'I-80', label: `${from} border I-80` }, exit: { state: to, road: 'I-80', label: `${to} border I-80` }, documents: [{ id: `original-${state}`, name: 'original.pdf', type: 'application/pdf', size: 20 }], steps: [{ text: 'Follow the issued test road.', road: 'I-80', lane: '', routeLine: 1, points: [[41, start], [41, end]] }] });
  confirmPermit(p); confirmGeometry(p); return p;
}
export function goodTrip() {
  const t = blankTrip(); t.name = 'Synthetic test only'; t.departure = '2026-09-24'; t.acknowledged = true;
  t.profile = { heightFt: '14', widthFt: '12', lengthFt: '90', weightLb: '110000', axles: '7', axleWeights: '', hazmat: '' };
  t.permits = [permit('OH', 'PA', 'IN', -80, -80.002), permit('IN', 'OH', 'IL', -80.002, -80.004), permit('IL', 'IN', 'IA', -80.004, -80.006)]; return t;
}
const now = Date.parse('2026-09-24T15:00:00Z');
test('Illinois photo route is retained verbatim, including toll ramp and printed mileage', () => {
  const p = parsePermitText(illinoisText); assert.equal(p.number, 'R38740590'); assert.equal(p.validFrom, '2026-09-22'); assert.equal(p.validTo, '2026-09-27'); assert.equal(p.entry.state, 'IN'); assert.equal(p.exit.state, 'IA'); assert.equal(p.routeText, illinoisText); assert.match(p.routeText, /US-6 toward I-294-TOLL N/); assert.match(p.routeText, /At exit 5 keep right/); assert.equal(reviewed(p), false);
});
test('Ohio/Illinois reference cannot become a continuous trip without Indiana and missing pages', () => {
  const t = exampleTrip(), m = buildMaster(t, { geometry: true }); assert.equal(t.permits[0].entry.label, 'I-80 PA Line'); assert.equal(t.permits[0].exit.label, ''); assert.equal(m.ready, false); assert.equal(m.segments.length, 0); assert(m.issues.some(i => /missing permit|order|border-road mismatch/i.test(i)));
});
test('geographical ordering preserves each permit instruction and geometry', () => {
  const t = goodTrip(), original = clone(t.permits); t.permits.reverse(); const m = buildMaster(t, { geometry: true }); assert.equal(m.ready, true); assert.deepEqual(m.permits.map(p => p.state), ['OH', 'IN', 'IL']); assert.deepEqual(m.permits, original); assert.equal(t.permits[0].state, 'IL');
});
test('missing state, border-road mismatch and competing continuations fail closed', () => {
  for (const change of [t => t.permits.splice(1, 1), t => t.permits[1].entry.road = 'I-90', t => t.permits.push(clone(t.permits[1]))]) { const t = goodTrip(); change(t); assert.equal(buildMaster(t, { geometry: true }).ready, false); }
});
test('border geometry gaps never get synthetic connecting roads', () => {
  const t = goodTrip(); t.permits[1].steps[0].points = [[41.001, -80.002], [41, -80.004]]; confirmGeometry(t.permits[1]); const m = buildMaster(t, { geometry: true }); assert.equal(m.ready, false); assert(m.issues.some(i => /border coordinates differ/.test(i))); assert.equal(m.segments.length, 3);
});
test('route edits, metadata edits, restrictions and replacement originals invalidate review', () => {
  for (const change of [p => p.routeText += '\nChanged', p => p.validTo = '2026-09-28', p => p.entry.road = 'I-90', p => p.restrictions = 'Daylight only', p => p.documents[0].id = 'replacement', p => p.limits = { heightFt: 13 }]) { const p = goodTrip().permits[0]; change(p); assert.equal(reviewed(p), false); assert.equal(geometryReviewed(p), false); }
});
test('geometry edits leave original confirmation intact but require geometry reconfirmation', () => { const p = goodTrip().permits[0]; p.steps[0].points[1][1] -= .0001; assert.equal(reviewed(p), true); assert.equal(geometryReviewed(p), false); });
test('invalid dates, expired permits and invalid load dimensions block guidance', () => {
  assert.equal(validDate('2026-99-99'), false); assert.equal(validDate('2026-02-29'), false); assert.equal(validDate('2028-02-29'), true);
  const t = goodTrip(); assert.equal(buildMaster(t, { date: '2026-09-28', geometry: true }).ready, false); t.profile.axles = '2.5'; assert.equal(buildMaster(t).ready, false);
});
test('completed single-trip moves cannot restart guidance', () => { const t=goodTrip(); t.completedAt='2026-09-24T12:00:00Z'; assert.equal(buildMaster(t,{geometry:true}).ready,false); });
test('known permit limits block overweight or overheight departure', () => { const t = goodTrip(); t.permits[0].limits = { heightFt: 13.5, weightLb: 100000 }; confirmPermit(t.permits[0]); confirmGeometry(t.permits[0]); assert.equal(buildMaster(t, { geometry: true }).ready, false); assert.equal(warnings(t.permits[0], t.profile).length, 2); });
test('sparse, invalid and discontinuous geometry is rejected', () => { const p = goodTrip().permits[0]; p.steps[0].points[1] = [41, -90]; assert.match(geometryErrors(p).join(' '), /too sparse/); p.steps[0].points[1] = [91, -80]; assert.match(geometryErrors(p).join(' '), /latitude/); });
test('route progression is deterministic, returns next state and does not reroute off corridor', () => {
  const m = buildMaster(goodTrip(), { geometry: true }); const first = locateOnMaster(m, { point: [41, -80.001], accuracy: 8, timestamp: now }, null, now); assert.equal(first.status, 'on-route'); assert.equal(first.permit.state, 'OH'); assert(first.toManeuver > 80 && first.toManeuver < 90);
  const second = locateOnMaster(m, { point: [41, -80.003], accuracy: 8, timestamp: now + 10000 }, first, now + 10000); assert.equal(second.permit.state, 'IN');
  const off = locateOnMaster(m, { point: [41.01, -80.003], accuracy: 8, timestamp: now }, null, now); assert.equal(off.status, 'deviation'); assert.equal(off.nextStep, undefined);
});
test('stale, inaccurate, future, invalid GPS and expired active permit pause guidance', () => {
  const m = buildMaster(goodTrip(), { geometry: true });
  for (const fix of [{ accuracy: 120 }, { timestamp: now - 20000 }, { timestamp: now + 6000 }, { point: [Infinity, 0] }]) assert.equal(locateOnMaster(m, { point: [41, -80], accuracy: 5, timestamp: now, ...fix }, null, now).status, 'gps-uncertain');
  const expired = Date.parse('2026-09-28T15:00:00Z'); assert.equal(locateOnMaster(m, { point: [41, -80], accuracy: 5, timestamp: expired }, null, expired).status, 'expired');
});
test('permit validity is evaluated in the issuing local time zone', () => { const m = buildMaster(goodTrip(), { geometry: true }), utc = Date.parse('2026-09-28T01:00:00Z'); assert.equal(locateOnMaster(m, { point: [41, -80], accuracy: 5, timestamp: utc }, null, utc).status, 'on-route'); });
test('role-specific warnings do not change route geometry', () => { const t = goodTrip(), before = crewKey(t); assert.match(warnings(t.permits[0], t.profile, 'lead').join(), /Lead escort/); assert.match(warnings(t.permits[0], t.profile, 'chase').join(), /Chase escort/); assert.equal(crewKey(t), before); });
test('encoded route imports strip all confirmations and validate coordinate payloads', () => { const p = goodTrip().permits[0], parsed = sanitizePermit(p); assert.equal(parsed.review, null); assert.equal(parsed.geometryReview, null); assert.equal(parsed.documents.length, 0); const raw = JSON.stringify({ schema: 'dl-permit-route/v1', permit: p }); assert.equal(classifyQR(raw).kind, 'encoded-route'); assert.throws(() => sanitizePermit({ steps: [{ points: [[null, 1]] }] })); });
test('proprietary, unsafe and unsupported QR formats never trigger an access bypass', () => { for (const raw of ['https://permit.promiles.com/secret', 'promiles://permit/abc', 'javascript:alert(1)', 'https://127.0.0.1/route', 'https://host.local/route', 'https://user:pass@permit.gov/route', '{"schema":"dl-permit-route/v1","permit":{"steps":[{"points":[]}]}}']) assert.notEqual(classifyQR(raw).kind, 'public-url'); assert.equal(classifyQR('https://permits.example.gov/route/123').kind, 'public-url'); });
test('public adapter omits credentials, refuses redirects, and retains text exactly', async () => {
  let options; const p = await importPublicQR('https://permits.example.gov/route', async (url, o) => { options = o; return new Response(illinoisText, { headers: { 'content-type': 'text/plain' } }); }); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.equal(p.routeText, illinoisText);
  await assert.rejects(() => importPublicQR('https://promiles.com/route', () => { throw Error('Must not fetch'); }), /Only public/);
  await assert.rejects(() => importPublicQR('https://permits.example.gov/login', async () => new Response('<html>Sign in</html>', { headers: { 'content-type': 'text/html' } })), /webpage/);
});
test('public adapter enforces response size limit', async () => { await assert.rejects(() => importPublicQR('https://permits.example.gov/route', async () => new Response('x'.repeat(1000001), { headers: { 'content-type': 'text/plain' } })), /too large/); });
test('known public QR endpoints use exact host and path allowlists', () => {
  assert(publicProviderURL('https://permitnav.promiles.com/permitnav3/api/Navigation/json/OH/PROD/6/123/t'));
  assert(publicProviderURL('https://webapps.dot.illinois.gov/ITAP/api/v1/permits/R123/ABC123/route/navigation'));
  for (const value of ['https://permitnav.promiles.com.evil.test/permitnav3/api/Navigation/json/OH/PROD/6/123/t', 'http://permitnav.promiles.com/permitnav3/api/Navigation/json/OH/PROD/6/123/t', 'https://permitnav.promiles.com:444/permitnav3/api/Navigation/json/OH/PROD/6/123/t', 'https://permitnav.promiles.com/admin', 'https://127.0.0.1/route', 'https://permitnav.promiles.com/permitnav3/api/Navigation/json/OH/PROD/6/123/t?redirect=elsewhere']) assert.equal(publicProviderURL(value), null);
});
test('public ProMiles response is decoded without retaining returned API credentials or scripts', () => {
  const payload = { jurisdiction: 'OH', apiKey: 'MUST-NOT-RETAIN', geometryPrecision: 5, data: JSON.stringify({ code: 'Ok', routes: [{ legs: [{ steps: [{ geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', name: 'Issued road', maneuver: { instruction: 'Keep left on issued road' }, voiceInstructions: [{ ssmlAnnouncement: '<script>bad()</script>' }] }] }] }], waypoints: [{ name: 'I-80 PA Line' }, { name: 'US-30 IN Line' }] }) };
  const p = parsePublicProvider(payload); assert.deepEqual(p.steps[0].points[0], [38.5, -120.2]); assert.equal(p.entry.state, 'PA'); assert.equal(p.exit.state, 'IN'); assert.equal(p.routeText, 'Keep left on issued road'); assert.equal(p.number, ''); assert.equal(p.validFrom, ''); assert.equal(reviewed(p), false); assert(!JSON.stringify(p).includes('MUST-NOT-RETAIN')); assert(!JSON.stringify(p).includes('script'));
  assert.throws(() => decodePolyline('_p~iF~ps|U_', 5), /Truncated/);
  assert.throws(() => parsePublicProvider({ ...payload, data: '{"code":"Ok","routes":[{},{}]}' }), /exactly one/);
});
test('authenticated and redirected provider routes fall back without retrying with credentials', async () => {
  const url = 'https://webapps.dot.illinois.gov/ITAP/api/v1/permits/R123/ABC123/route/navigation'; let calls = 0;
  await assert.rejects(() => resolvePermitURL(url, async (u, options) => { calls++; assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'manual'); return new Response('Requires access', { status: 401 }); }), /authorized access/); assert.equal(calls, 1);
  await assert.rejects(() => resolvePermitURL(url, async () => new Response('', { status: 302, headers: { location: 'http://127.0.0.1' } })), /unavailable/);
});
test('resolver rejects malformed origins and oversized bodies before contacting a provider', async () => {
  const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = JSON.parse(body); } });
  let res = response(); await handler({ method: 'POST', headers: { origin: 'not-a-url', host: 'localhost' } }, res); assert.equal(res.statusCode, 403);
  res = response(); await handler({ method: 'POST', headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' }, body: { url: 'x'.repeat(3000) } }, res); assert.equal(res.statusCode, 422);
});
test('copied movement windows use permit local time, close exclusively and handle overnight start days', () => {
  const p = goodTrip().permits[0]; p.travelWindow = { from: '08:00', to: '16:00', days: [4], closedDates: [] };
  assert.equal(movementWindow(p, Date.parse('2026-09-24T12:59:00Z')).allowed, false);
  assert.equal(movementWindow(p, Date.parse('2026-09-24T13:00:00Z')).allowed, true);
  assert.match(movementWindow(p, Date.parse('2026-09-24T20:50:00Z')).message, /10 minutes/);
  assert.equal(movementWindow(p, Date.parse('2026-09-24T21:00:00Z')).allowed, false);
  p.travelWindow = { from: '22:00', to: '04:00', days: [4], closedDates: [] };
  assert.equal(movementWindow(p, Date.parse('2026-09-25T08:00:00Z')).allowed, true);
  p.travelWindow.closedDates = ['2026-09-25']; assert.equal(movementWindow(p, Date.parse('2026-09-25T08:00:00Z')).allowed, false);
});
