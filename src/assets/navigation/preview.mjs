import { createPreviewSession, formatDistance, samplePosition, sampleAnnouncement } from './session.mjs';
import { createSpeech } from '../permits/speech.mjs';

const $ = id => document.getElementById(id), dialog = $('navigation-preview');
const session = createPreviewSession(), reduced = matchMedia('(prefers-reduced-motion: reduce)');
let muted = true, overview = false, frame = null, lastTime = null, lastInstruction = -1, opener = null, previousOverflow = '';
const icons = { right: '↱', left: '↰', arrive: '⚑' };
const speech = createSpeech({ synthesis: window.speechSynthesis, Utterance: window.SpeechSynthesisUtterance,
  visible: () => dialog.open && document.visibilityState === 'visible',
  onFailure: message => { muted = true; voiceButton(); $('preview-status').textContent = message; }
});
function voiceButton() {
  $('preview-voice').textContent = muted ? 'Voice off' : 'Voice on';
  $('preview-voice').setAttribute('aria-pressed', String(!muted));
}
function announce(repeat = false) {
  if (muted) return;
  const cue = sampleAnnouncement(session.snapshot());
  speech.play(cue.text, { key: cue.key, repeat });
}
function draw() {
  const v = session.snapshot(), p = samplePosition(v.fraction);
  $('preview-arrow').textContent = icons[v.turn.maneuver];
  $('preview-distance').textContent = v.arrived ? 'Arrived' : formatDistance(v.untilTurn);
  $('preview-road').textContent = v.turn.road;
  $('preview-action').textContent = v.arrived ? 'Preview complete' : v.turn.maneuver === 'arrive' ? 'Continue to' : `Turn ${v.turn.maneuver}`;
  $('preview-next').textContent = v.next ? `${icons[v.next.maneuver]}  Then ${v.next.maneuver === 'arrive' ? 'arrive at' : 'turn ' + v.next.maneuver + ' onto'} ${v.next.road}` : 'Then end the sample trip';
  $('preview-time').textContent = v.arrived ? 'Complete' : `${Math.max(1, Math.ceil(v.remainingSeconds / 60))} min`;
  $('preview-remaining').textContent = `${formatDistance(v.remainingMeters)} left in sample`;
  $('preview-play').textContent = v.arrived ? 'Replay preview' : v.running ? 'Pause preview' : 'Play preview';
  $('preview-next-turn').disabled = v.arrived;
  $('preview-progress').value = v.fraction;
  $('preview-car').setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${p.heading})`);
  // No geolocation or real map matching; these coordinates are an illustration.
  const size = overview ? 1100 : 650;
  $('preview-map').setAttribute('viewBox', overview ? '-50 -50 1100 1100' : `${p.x - size / 2} ${p.y - size * .57} ${size} ${size}`);
  if (lastInstruction !== v.index || v.arrived) {
    const text = v.arrived ? 'Sample trip complete.' : `Step ${v.index + 1} of 3. ${v.turn.text}`;
    if ($('preview-instruction-status').textContent !== text) $('preview-instruction-status').textContent = text;
    lastInstruction = v.index;
  }
}
function stopFrame() { if (frame !== null) cancelAnimationFrame(frame); frame = null; lastTime = null; }
function pause(message = 'Preview paused. Tap Play to continue.') {
  session.pause(); stopFrame(); speech.stop(); draw(); $('preview-status').textContent = message;
}
function tick(now) {
  frame = null;
  if (!dialog.open || document.visibilityState !== 'visible') { pause('Preview paused while the page is hidden.'); return; }
  const delta = lastTime === null ? 0 : (now - lastTime) / 1000;
  if (!Number.isFinite(delta) || delta < 0 || delta > 1) { pause('Preview paused after an interruption. Tap Play to continue.'); return; }
  lastTime = now; const v = session.advance(delta); draw(); announce();
  if (v.running) frame = requestAnimationFrame(tick);
  else { lastTime = null; $('preview-status').textContent = v.arrived ? 'Preview complete. Replay it or return to your trip.' : 'Preview paused after an interruption. Tap Play to continue.'; }
}
function open() {
  opener = document.activeElement; previousOverflow = document.body.style.overflow;
  session.reset(); lastInstruction = -1; muted = true; overview = reduced.matches;
  dialog.showModal(); document.body.style.overflow = 'hidden'; voiceButton(); setView(); draw();
  $('preview-status').textContent = 'Fictional sample roads. No GPS or live directions. Test while parked.';
  $('preview-play').focus();
}
function close() {
  pause('Preview closed.'); muted = true; voiceButton();
  document.body.style.overflow = previousOverflow;
  opener?.focus();
}
function setView() {
  dialog.dataset.mapView = overview ? 'overview' : 'follow';
  $('preview-view').textContent = overview ? 'Follow arrow' : 'Route overview';
  $('preview-view').setAttribute('aria-pressed', String(overview));
}
$('open-navigation-preview').hidden = false;
$('open-navigation-preview').addEventListener('click', open);
$('preview-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', close);
$('preview-play').addEventListener('click', () => {
  if (session.snapshot().running) { pause(); return; }
  session.play(); lastTime = null; $('preview-status').textContent = 'Sample trip playing. You can pause or skip to the next turn.';
  draw(); announce(true); frame = requestAnimationFrame(tick);
});
$('preview-voice').addEventListener('click', () => { muted = !muted; voiceButton(); if (muted) { speech.stop(); $('preview-status').textContent = 'Voice off.'; } else { $('preview-status').textContent = 'Voice on. Check your speaker or Bluetooth volume.'; announce(true); } });
$('preview-repeat').addEventListener('click', () => { muted = false; voiceButton(); $('preview-status').textContent = 'Repeating the displayed instruction.'; announce(true); });
$('preview-next-turn').addEventListener('click', () => { pause(); session.next(); draw(); announce(true); $('preview-status').textContent = session.snapshot().arrived ? 'Preview complete.' : 'Moved to the next leg. Tap Play to continue.'; });
$('preview-restart').addEventListener('click', () => { pause(); session.reset(); lastInstruction = -1; draw(); $('preview-status').textContent = 'Sample reset. Tap Play when ready.'; });
$('preview-view').addEventListener('click', () => { overview = !overview; setView(); draw(); });
reduced.addEventListener('change', () => { if (reduced.matches) { overview = true; setView(); draw(); } });
document.addEventListener('visibilitychange', () => { if (dialog.open && document.visibilityState !== 'visible') pause('Paused when Safari left the foreground. Tap Play to resume.'); });
window.addEventListener('pagehide', () => { if (dialog.open) pause('Preview paused.'); });
window.addEventListener('resize', () => { if (dialog.open) draw(); });
window.addEventListener('blur', () => { if (dialog.open) pause('Preview paused when the window lost focus. Tap Play to resume.'); });
