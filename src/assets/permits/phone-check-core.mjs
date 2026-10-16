export const PHONE_CHECK_VERSION = '2026-10-14.2';
export const DEMO_CUES = Object.freeze([
  { title: 'Approaching a turn', text: 'Parked test only. In one half mile, take the right exit shown in the test instruction. This is not your route.' },
  { title: 'Turn coming up', text: 'Parked test only. In five hundred feet, take the right exit shown in the test instruction. This is not your route.' },
  { title: 'State border hold', text: 'Parked test only. The next state permit is not currently valid. Guidance is paused. Verify the permit before crossing. No detour is suggested.' },
  { title: 'GPS lost', text: 'Parked test only. GPS is unavailable. Guidance is off. Follow the issued permit and stop when safe to verify your position before restarting.' },
  { title: 'GPS returned after interruption', text: 'Parked test only. A returning GPS signal does not restart guidance. Stop when safe, verify your position and the current permit, then restart deliberately.' },
  { title: 'GPS position jumped', text: 'Parked test only. GPS jumped farther than elapsed time can support. Guidance is off. Stop when safe and verify your position. No turns or detours are assumed.' },
  { title: 'Permit changed', text: 'Parked test only. The permit route changed. Guidance is off. Review the current permit before restarting.' }
]);

// Discard coordinates at this boundary: only accuracy and timestamp enter the record.
export function receptionSample(position, now = Date.now()) {
  const c = position?.coords, time = position?.timestamp;
  if (!c || !Number.isFinite(c.latitude) || Math.abs(c.latitude) > 90 || !Number.isFinite(c.longitude) || Math.abs(c.longitude) > 180 || !Number.isFinite(c.accuracy) || c.accuracy < 0 || !Number.isFinite(time) || time > now + 5000 || now - time > 10000) return null;
  return { accuracyM: Math.ceil(c.accuracy), timestamp: time };
}

export function createReceptionCheck({ geolocation, visible = () => true, now = Date.now, onState = () => {}, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let generation = 0, watch = null, timer = null, active = false, samples = [];
  function stop(status = 'stopped', message = 'GPS check stopped.') {
    generation++; active = false; clearTimer(timer); timer = null;
    if (watch !== null) geolocation?.clearWatch(watch); watch = null;
    onState({ status, message, samples: samples.map(s => ({ ...s })) });
  }
  function start() {
    stop(); samples = [];
    if (!visible() || !geolocation) { stop('unavailable', 'GPS check is unavailable. Keep Safari visible and try on the phone.'); return; }
    active = true; const token = generation;
    onState({ status: 'waiting', message: 'Waiting up to 20 seconds for fresh GPS samples. Stay parked.', samples: [] });
    timer = setTimer(() => stop('limited', 'Check ended. Too few fresh samples; reception is not confirmed.'), 20000);
    try {
      const id = geolocation.watchPosition(position => {
        if (!active || token !== generation) return;
        if (!visible()) { stop(); return; }
        const sample = receptionSample(position, now());
        if (!sample || (samples.length && sample.timestamp <= samples.at(-1).timestamp)) return;
        samples.push(sample);
        if (samples.length >= 3) { stop(samples.every(s => s.accuracyM <= 50) ? 'samples-received' : 'limited', 'Three GPS samples received. Accuracy estimates do not verify a road, lane or legal route.'); return; }
        onState({ status: 'sampling', message: `${samples.length} of 3 fresh samples. Latest reported accuracy ±${sample.accuracyM} m.`, samples: samples.map(s => ({ ...s })) });
      }, error => {
        if (!active || token !== generation) return;
        stop('unavailable', error?.code === 1 ? 'Location access was denied. You can still check voice; retry GPS only when ready.' : 'GPS was unavailable or timed out. Try again while parked with clearer reception.');
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
      if (active && token === generation) watch = id; else geolocation.clearWatch(id);
    } catch { stop('unavailable', 'The browser could not start a GPS check.'); }
  }
  return { start, stop };
}

export function createScreenCheck({ wakeLock, visible = () => true, onState = () => {} }) {
  let generation = 0, lock = null;
  async function stop(message = 'Keep-screen-on is off.') {
    const token = ++generation, previous = lock; lock = null;
    if (previous) try { await previous.release(); } catch { /* It may already be released. */ }
    if (token === generation) onState({ status: 'off', message });
  }
  async function start() {
    const token = ++generation, previous = lock; lock = null;
    if (previous) try { await previous.release(); } catch { /* Already released. */ }
    if (token !== generation) return;
    if (!wakeLock || !visible()) { onState({ status: 'unavailable', message: 'Keep-screen-on is unavailable. Screen-lock behavior still needs a physical phone check.' }); return; }
    onState({ status: 'requesting', message: 'Requesting keep-screen-on for this parked check.' });
    try {
      const next = await wakeLock.request('screen');
      if (token !== generation || !visible()) { await next.release(); return; }
      lock = next;
      next.addEventListener('release', () => { if (token !== generation) return; lock = null; onState({ status: 'released', message: 'Keep-screen-on was released. Return to Safari and tap to enable it again; testing never resumes automatically.' }); });
      onState({ status: next.released ? 'released' : 'active', message: next.released ? 'Keep-screen-on was released by the device.' : 'Device reports keep-screen-on active. Locking the phone or leaving Safari stops the check.' });
    } catch { if (token === generation) onState({ status: 'unavailable', message: 'The device declined keep-screen-on. Check power settings and test screen locking manually.' }); }
  }
  return { start, stop };
}
