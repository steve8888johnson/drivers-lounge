import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpeech, localVoices, parkedInstruction, speechPreferences } from '../src/assets/permits/speech.mjs';
import { createReceptionCheck, createScreenCheck, receptionSample, DEMO_CUES } from '../src/assets/permits/phone-check-core.mjs';
import { readFileSync } from 'node:fs';

function clock() { let seq = 0; const pending = new Map(); return { set(fn, delay) { const id = ++seq; pending.set(id, { fn, delay }); return id; }, clear(id) { pending.delete(id); }, fire() { const [id, task] = pending.entries().next().value; pending.delete(id); task.fn(); }, pending }; }
function audio() {
  const events = [], errors = [], utterances = [], timers = clock(); let visible = true, cancellations = 0;
  const voices = [{ name: 'Local', lang: 'en-US', voiceURI: 'local', localService: true }, { name: 'Remote', lang: 'en-US', voiceURI: 'remote', localService: false }];
  const synthesis = { getVoices: () => voices, cancel: () => { cancellations++; }, speak: u => utterances.push(u) };
  const speech = createSpeech({ synthesis, Utterance: class { constructor(text) { this.text = text; } }, visible: () => visible, onState: e => events.push(e), onFailure: e => errors.push(e), setTimer: timers.set, clearTimer: timers.clear });
  return { speech, synthesis, events, errors, utterances, timers, voices, hide() { visible = false; speech.stop('Hidden'); }, cancellations: () => cancellations };
}

test('device voices only: remote, missing and stale voice selection never receive permit text', () => {
  const a = audio(); assert.equal(localVoices(a.synthesis).length, 1);
  assert.equal(a.speech.play('private permit instruction', { voiceURI: 'remote' }), false); assert.equal(a.utterances.length, 0);
  a.voices.splice(0, 1); assert.equal(a.speech.play('private permit instruction'), false); assert.equal(a.utterances.length, 0);
  assert.match(a.events.at(-1).message, /on-device English/);
  a.voices.push({ name: 'English', lang: 'en', voiceURI: 'local-en', localService: true });
  assert.equal(localVoices(a.synthesis).length, 1); assert.equal(a.speech.play('Parked check'), true);
  assert.equal(a.utterances.at(-1).voice.voiceURI, 'local-en');
});
test('sound check tracks actual browser start/end separately from hearing confirmation', () => {
  const a = audio(); assert(a.speech.play('Parked test', { key: 'first' })); assert.equal(a.events.at(-1).status, 'starting');
  const u = a.utterances[0]; assert.equal(u.voice.voiceURI, 'local'); u.onstart(); assert.equal(a.events.at(-1).status, 'speaking');
  u.onend(); assert.equal(a.events.at(-1).status, 'ended'); assert.match(a.events.at(-1).message, /Confirm whether you heard/); assert.equal(a.timers.pending.size, 0);
});
test('a warning preempts a maneuver, later routine prompts do not interrupt it, and cancelled callbacks are ignored', () => {
  const a = audio(); a.speech.play('Turn', { key: 'turn' }); const first = a.utterances[0]; first.onstart();
  a.speech.play('GPS lost', { key: 'hold', priority: 3 }); const warning = a.utterances[1]; warning.onstart();
  assert.equal(a.speech.play('Next turn', { key: 'next', priority: 0 }), false); assert.equal(a.utterances.length, 2);
  first.onerror({ error: 'interrupted' }); first.onend(); assert.equal(a.errors.length, 0); assert.equal(a.events.at(-1).key, 'hold');
  warning.onend(); assert(a.speech.play('Next turn', { key: 'next' })); assert.equal(a.utterances.length, 3);
});
test('silent engine and stuck speech time out without automatically retrying', () => {
  for (const started of [false, true]) { const a = audio(); a.speech.play('Parked test'); if (started) a.utterances[0].onstart(); a.timers.fire(); assert.equal(a.errors.length, 1); assert.equal(a.utterances.length, 1); assert.equal(a.timers.pending.size, 0); assert.equal(a.events.at(-1).status, 'error'); }
});
test('permission/audio errors reset deduplication so a manual retry of the same instruction works', () => {
  const a = audio(); a.speech.play('Same instruction'); a.utterances[0].onerror({ error: 'not-allowed' }); assert.match(a.errors[0], /tap the play/);
  assert(a.speech.play('Same instruction')); assert.equal(a.utterances.length, 2);
});
test('hidden or stopped speech cannot resume from delayed browser events', () => {
  const a = audio(); a.speech.play('Parked test'); const old = a.utterances[0]; a.hide(); old.onstart(); old.onend(); old.onerror({ error: 'interrupted' });
  assert.equal(a.events.at(-1).status, 'stopped'); assert.equal(a.errors.length, 0); assert.equal(a.timers.pending.size, 0); assert.equal(a.speech.play('Hidden test'), false); assert.equal(a.utterances.length, 1);
});
test('repeat is deliberate and long instructions are rejected rather than silently truncated', () => {
  const a = audio(); a.speech.play('Same'); a.utterances[0].onend(); a.speech.play('Same'); assert.equal(a.utterances.length, 1);
  a.speech.play('Same', { repeat: true }); assert.equal(a.utterances.length, 2);
  assert.equal(a.speech.play('x'.repeat(1801)), false); assert.equal(a.utterances.length, 2); assert.match(a.errors.at(-1), /full text while parked/);
});
test('speech preferences reject malformed storage and unsafe rates', () => {
  for (const value of ['invalid', 'null', '{"rate":99,"voiceURI":3}']) assert.deepEqual(speechPreferences({ getItem: () => value }), { voiceURI: '', rate: .95 });
  assert.deepEqual(speechPreferences({ getItem: () => '{"rate":0.85,"voiceURI":"local"}' }), { voiceURI: 'local', rate: .85 });
});
test('parked speech preserves exact supplied instruction and always identifies its review context', () => {
  assert.equal(parkedInstruction({ available: false }), null);
  const text = parkedInstruction({ available: true, index: 1, total: 3, permit: { state: 'UT' }, step: { text: 'Keep right at the printed exit.' }, border: { permit: { state: 'WY' } } });
  assert.match(text, /Parked permit review/); assert.match(text, /Keep right at the printed exit\./); assert.match(text, /not live guidance/);
  assert(DEMO_CUES.every(c => c.text.startsWith('Parked test only.')));
});

const time = Date.parse('2026-10-14T17:00:00Z');
const position = (offset = 0, accuracy = 5) => ({ timestamp: time + offset, coords: { latitude: 40.123456, longitude: -111.987654, accuracy } });
function reception() {
  const callbacks = [], cleared = [], events = [], timers = clock(); let visible = true;
  const geolocation = { watchPosition: (success, error, options) => { callbacks.push({ success, error, options }); return callbacks.length; }, clearWatch: id => cleared.push(id) };
  const gps = createReceptionCheck({ geolocation, visible: () => visible, now: () => time + 5000, onState: e => events.push(e), setTimer: timers.set, clearTimer: timers.clear });
  return { gps, callbacks, cleared, events, timers, hide() { visible = false; gps.stop(); } };
}
test('reception samples discard precise coordinates and conservatively retain accuracy', () => {
  assert.deepEqual(receptionSample(position(0, 50.1), time), { accuracyM: 51, timestamp: time });
  for (const p of [null, position(-11000), position(6000), { ...position(), coords: { latitude: NaN, longitude: 0, accuracy: 1 } }]) assert.equal(receptionSample(p, time), null);
});
test('three fresh GPS samples stop the watcher and contain no coordinates in the record', () => {
  const r = reception(); r.gps.start(); const c = r.callbacks[0]; assert.equal(c.options.maximumAge, 0);
  for (const offset of [0, 1000, 2000]) c.success(position(offset));
  assert.equal(r.events.at(-1).status, 'samples-received'); assert.equal(r.events.at(-1).samples.length, 3); assert.deepEqual(r.cleared, [1]); assert.equal(r.timers.pending.size, 0);
  assert(!/latitude|longitude|40\.123456|111\.987654/.test(JSON.stringify(r.events)));
});
test('weak or repeated GPS samples never receive a successful reception result', () => {
  const r = reception(); r.gps.start(); const c = r.callbacks[0]; c.success(position()); c.success(position()); assert.equal(r.events.at(-1).samples.length, 1);
  c.success(position(1000, 50.1)); c.success(position(2000)); assert.equal(r.events.at(-1).status, 'limited');
});
test('denied GPS, timeout, hidden page and superseded callbacks stop without automatic retries', () => {
  const r = reception(); r.gps.start(); r.callbacks[0].error({ code: 1 }); assert.equal(r.events.at(-1).status, 'unavailable');
  r.gps.start(); const second = r.callbacks[1]; r.timers.fire(); assert.equal(r.events.at(-1).status, 'limited');
  r.gps.start(); second.success(position()); assert.equal(r.events.at(-1).status, 'waiting');
  r.hide(); r.callbacks[2].success(position()); assert.equal(r.events.at(-1).status, 'stopped'); assert.equal(r.timers.pending.size, 0);
});
test('a delayed wake-lock grant is released after stop and cannot reactivate the test', async () => {
  let grant, released = 0; const events = [];
  const screen = createScreenCheck({ wakeLock: { request: () => new Promise(resolve => { grant = resolve; }) }, onState: e => events.push(e) });
  const pending = screen.start(); await screen.stop(); grant({ release: async () => { released++; } }); await pending;
  assert.equal(released, 1); assert.equal(events.at(-1).status, 'off'); assert(!events.some(e => e.status === 'active'));
});
test('wake-lock release is reported and is never silently reacquired', async () => {
  let onRelease, requests = 0; const events = [];
  const screen = createScreenCheck({ wakeLock: { request: async () => { requests++; return { released: false, release: async () => {}, addEventListener: (_, fn) => { onRelease = fn; } }; } }, onState: e => events.push(e) });
  await screen.start(); assert.equal(events.at(-1).status, 'active'); onRelease(); assert.equal(events.at(-1).status, 'released'); assert.equal(requests, 1);
});
test('unsupported and rejected wake locks produce an explicit limitation', async () => {
  for (const wakeLock of [null, { request: async () => { throw Error('denied'); } }]) { const events = []; await createScreenCheck({ wakeLock, onState: e => events.push(e) }).start(); assert.equal(events.at(-1).status, 'unavailable'); }
});
test('phone rehearsal ships without a routing request or any navigation activation', () => {
  const app = readFileSync(new URL('../src/assets/permits/phone-check.mjs', import.meta.url), 'utf8');
  assert(!/fetch\(|XMLHttpRequest|sendBeacon|startGuidance|permitGuidanceEnabled\s*=/.test(app));
  const html = readFileSync(new URL('../src/permit-phone-check.html', import.meta.url), 'utf8'); assert.match(html, /DRIVING GUIDANCE IS OFF/);
});
