// Device speech only. Browser events report playback, not human audibility.
export function localVoices(synthesis) {
  try { return (synthesis?.getVoices() || []).filter(v => v.localService === true && /^en(?:-|_|$)/i.test(v.lang)); }
  catch { return []; }
}

export function speechPreferences(storage) {
  try { const p = JSON.parse(storage.getItem('dl-permit-voice') || '{}'); return { voiceURI: typeof p.voiceURI === 'string' ? p.voiceURI.slice(0, 500) : '', rate: [.85, .95, 1.1].includes(p.rate) ? p.rate : .95 }; }
  catch { return { voiceURI: '', rate: .95 }; }
}

export function createSpeech({ synthesis, Utterance, visible = () => true, onState = () => {}, onFailure = () => {}, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let generation = 0, active = null, timer = null, lastKey = '';
  const clear = () => { clearTimer(timer); timer = null; };
  const emit = (status, message, key = '') => onState({ status, message, key });
  const cancel = () => { try { synthesis?.cancel(); } catch { /* Unsupported engines remain unavailable. */ } };
  function stop(message = 'Speech stopped. Tap to play again.') {
    generation++; clear(); active = null; lastKey = ''; cancel(); emit('stopped', message);
  }
  function failure(message, token = generation) {
    if (token !== generation) return;
    generation++; clear(); active = null; lastKey = ''; cancel(); emit('error', message); onFailure(message);
  }
  function play(text, { key = text, priority = 0, voiceURI = '', rate = .95, repeat = false } = {}) {
    if (!visible()) { stop('Speech stopped while the page is hidden. Tap again after returning.'); return false; }
    if (!synthesis || !Utterance) { failure('Device speech is unavailable in this browser. Use Safari on the iPhone and try again.'); return false; }
    if (typeof text !== 'string' || !text.trim() || text.length > 1800) { failure('This instruction cannot be read as one safe prompt. Read its full text while parked.'); return false; }
    const voices = localVoices(synthesis), voice = voiceURI ? voices.find(v => v.voiceURI === voiceURI) : voices.find(v => v.lang === 'en-US') || voices[0];
    if (!voice) { failure('No on-device English voice is ready. Wait for voices to load, then tap again.'); return false; }
    if (!repeat && key === lastKey) return true;
    if (active && active.priority > priority) return false;
    generation++; clear(); active = null; cancel();
    const token = generation; let utterance;
    try { utterance = new Utterance(text.trim()); } catch { failure('The device voice could not be initialized.', token); return false; }
    utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = [.85, .95, 1.1].includes(rate) ? rate : .95; utterance.volume = 1;
    active = { utterance, priority }; lastKey = key;
    utterance.onstart = () => {
      if (token !== generation) return;
      if (!visible()) { stop('Speech stopped while the page is hidden.'); return; }
      clear(); emit('speaking', 'Browser reports speech playing.', key);
      timer = setTimer(() => failure('Speech did not finish. Stop and check audio while parked; tap to retry.', token), Math.min(150000, Math.max(12000, text.length * 130)));
    };
    utterance.onend = () => { if (token !== generation) return; clear(); active = null; emit('ended', 'Browser reports speech finished. Confirm whether you heard it clearly.', key); };
    utterance.onerror = event => failure(event?.error === 'not-allowed' ? 'Speech was blocked. Keep Safari in front and tap the play button again.' : 'Speech failed or was interrupted. Check the speaker or Bluetooth output, then tap to retry.', token);
    emit('starting', 'Waiting for the device voice to start.', key);
    timer = setTimer(() => failure('The voice did not start. Check audio and tap again while Safari is visible.', token), 6000);
    try { synthesis.speak(utterance); return true; } catch { failure('The device could not start speech. Tap to retry while parked.', token); return false; }
  }
  return { play, stop, voices: () => localVoices(synthesis) };
}

export function parkedInstruction(view) {
  if (!view?.available) return null;
  return `Parked permit review. ${view.permit.state}. Instruction ${view.index + 1} of ${view.total}. ${view.step.text}. ${view.border ? `Next state ${view.border.permit.state}. Check its permit and conditions before the border.` : view.next ? `Next instruction: ${view.next.step.text}.` : 'End of supplied instructions. Confirm destination access from the permit.'} This is a review, not live guidance.`;
}

export function parkedSource(view) {
  if (!view?.available || typeof view.source !== 'string' || !view.source.trim()) return null;
  return `Parked source comparison. ${view.permit.state}. Saved route line ${view.step.routeLine}. ${view.source}. Compare this saved text with the original permit. This is not live guidance.`;
}
