import { createSpeech, speechPreferences } from './speech.mjs';
import { PHONE_CHECK_VERSION, DEMO_CUES, createReceptionCheck, createScreenCheck } from './phone-check-core.mjs';

const $ = id => document.getElementById(id);
const record = { version: PHONE_CHECK_VERSION, mode: 'parked-device-test-only', target: 'iPhone Safari; physical device not independently verified', startedAt: new Date().toISOString(), observations: { speechStarts: 0, speechEnds: 0, speechErrors: 0, gpsChecksCompleted: 0, screenGrants: 0 }, speech: { status: 'not-tested' }, gps: { status: 'not-tested', samples: [] }, screen: { status: 'not-tested' }, hiddenEvents: 0, userReported: { speaker: false, bluetooth: false, lockInterruption: false } };
let prefs; try { prefs = speechPreferences(localStorage); } catch { prefs = speechPreferences(null); }
let playCount = 0;
const visible = () => !document.hidden;
function summary() {
  record.userReported = { speaker: $('heard-speaker').checked, bluetooth: $('heard-bluetooth').checked, lockInterruption: $('checked-lock').checked };
  const heard = record.userReported.speaker || record.userReported.bluetooth;
  $('record-summary').textContent = `${heard ? 'You reported hearing audio.' : 'Audio audibility is unconfirmed.'} ${record.userReported.lockInterruption ? 'You reported checking a physical interruption.' : 'Physical interruption check is unconfirmed.'} GPS: ${record.gps.status}. Driving guidance remains off.`;
}
const speech = createSpeech({ synthesis: window.speechSynthesis, Utterance: window.SpeechSynthesisUtterance, visible,
  onState: state => { if (state.status === 'speaking') record.observations.speechStarts++; if (state.status === 'ended') record.observations.speechEnds++; if (state.status === 'error') record.observations.speechErrors++; record.speech = { ...state, at: new Date().toISOString() }; $('speech-status').textContent = state.message; summary(); } });
const gps = createReceptionCheck({ geolocation: navigator.geolocation, visible,
  onState: state => { if (state.samples?.length === 3 && state.status !== 'stopped') record.observations.gpsChecksCompleted++; record.gps = state; $('gps-status').textContent = state.message; summary(); } });
const screen = createScreenCheck({ wakeLock: navigator.wakeLock, visible,
  onState: state => { if (state.status === 'active') record.observations.screenGrants++; record.screen = state; $('screen-status').textContent = state.message; summary(); } });

function renderVoices() {
  const voices = speech.voices(), select = $('voice-choice'); select.replaceChildren();
  const automatic = new Option(voices.length ? 'Automatic on-device English voice' : 'No device voice loaded yet', ''); select.add(automatic);
  for (const v of voices) select.add(new Option(`${v.name} · ${v.lang}`, v.voiceURI));
  if (prefs.voiceURI && !voices.some(v => v.voiceURI === prefs.voiceURI)) select.add(new Option('Previously selected voice unavailable — choose another', prefs.voiceURI));
  select.value = prefs.voiceURI; $('voice-rate').value = String(prefs.rate);
  $('voice-availability').textContent = voices.length ? `${voices.length} on-device English voices reported. Test the selected voice with your audio output.` : 'Wait for voices to load, then tap Play sound check. Remote voices are not used for permit text.';
}
function settings() {
  speech.stop('Voice setting changed. Repeat your sound check.');
  prefs = { voiceURI: $('voice-choice').value, rate: Number($('voice-rate').value) };
  try { localStorage.setItem('dl-permit-voice', JSON.stringify(prefs)); } catch { $('voice-availability').textContent = 'Voice settings apply to this visit; browser storage is unavailable.'; }
  $('heard-speaker').checked = false; $('heard-bluetooth').checked = false; summary();
}
function demo() { const cue = DEMO_CUES[Number($('demo-choice').value)]; $('demo-heading').textContent = cue.title; $('demo-text').textContent = cue.text; }
function play(text, label) { speech.play(text, { ...prefs, key: `${label}-${++playCount}`, repeat: true }); }
function stopAll(message = 'All checks stopped. Tap a check to start again.') { speech.stop(message); gps.stop(); void screen.stop(); $('lifecycle-status').textContent = message; }

DEMO_CUES.forEach((cue, index) => $('demo-choice').add(new Option(cue.title, String(index))));
$('voice-choice').onchange = settings; $('voice-rate').onchange = settings;
$('play-sound').onclick = () => { renderVoices(); play('Drivers Lounge. Parked sound check. Please confirm you can hear this clearly. This is a test, not driving guidance.', 'sound'); };
$('stop-voice').onclick = () => speech.stop();
$('demo-choice').onchange = () => { speech.stop(); demo(); };
$('play-demo').onclick = () => play(DEMO_CUES[Number($('demo-choice').value)].text, 'demo');
$('next-demo').onclick = () => { speech.stop(); $('demo-choice').value = String((Number($('demo-choice').value) + 1) % DEMO_CUES.length); demo(); };
$('start-gps').onclick = () => gps.start(); $('stop-gps').onclick = () => gps.stop();
$('start-screen').onclick = () => void screen.start(); $('stop-screen').onclick = () => void screen.stop();
$('stop-all').onclick = () => stopAll();
for (const id of ['heard-speaker', 'heard-bluetooth', 'checked-lock']) $(id).onchange = summary;
$('save-record').onclick = () => {
  summary(); const exported = { ...record, savedAt: new Date().toISOString(), selectedVoice: $('voice-choice').selectedOptions[0]?.textContent, rate: prefs.rate, operationalGuidance: false };
  const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `drivers-lounge-phone-check-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  $('save-status').textContent = 'Record prepared for download. Use Safari’s download or sharing controls to keep it; nothing was submitted to a server.';
};
document.addEventListener('visibilitychange', () => { if (document.hidden) { record.hiddenEvents++; stopAll('Page hidden. Speech and GPS stopped. Return and tap to restart each check.'); } else $('lifecycle-status').textContent = 'Back in Safari. Nothing resumes automatically; tap the check you want to repeat.'; });
window.addEventListener('pagehide', () => stopAll('Page closed or left. Checks stopped.'));
window.speechSynthesis?.addEventListener('voiceschanged', renderVoices);
renderVoices(); demo(); summary();
if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => {});
