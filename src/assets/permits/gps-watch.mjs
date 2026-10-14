import { pointOK } from './core.mjs';

// Internal freshness policy, not a claim of road/lane accuracy. Every failure
// ends this watch. Only a new explicit start can create another generation.
export const GPS_MAX_AGE_MS = 15000;
export function createGuidanceWatch({ geolocation, isCurrent = () => true, onFix, onHold = () => {}, now = Date.now, monotonic = () => performance.now(), setTimer = setInterval, clearTimer = clearInterval }) {
  let generation = 0, active = false, watch = null, timer = null, started = 0, received = null, stamp = null;
  function clear(id) { if (id !== null) try { geolocation?.clearWatch(id); } catch { /* Inactive generations still reject callbacks. */ } }
  function stop() {
    generation++; active = false; clearTimer(timer); timer = null;
    const old = watch; watch = null; clear(old); received = stamp = null;
  }
  function hold(message) { stop(); onHold(message); }
  function current() { try { return isCurrent() === true; } catch { hold('Trip checks failed. Guidance is off. Review the trip before restarting.'); return false; } }
  const elapsed = () => monotonic() - (received ?? started);
  function validSession(token) {
    if (!active || token !== generation) return false;
    if (!current()) { stop(); return false; }
    return active && token === generation;
  }
  function start() {
    stop();
    if (!geolocation) { hold('GPS could not start. Review the trip and retry while parked.'); return false; }
    if (!current()) return false;
    active = true; started = monotonic(); const token = generation;
    timer = setTimer(() => {
      if (!validSession(token)) return;
      if (!Number.isFinite(elapsed()) || elapsed() < 0 || elapsed() >= GPS_MAX_AGE_MS || (stamp !== null && (now() - stamp >= GPS_MAX_AGE_MS || stamp > now() + 5000))) hold('GPS updates stopped or became stale. Guidance is off. Stop when safe, verify your position, and restart deliberately.');
    }, 1000);
    try {
      const id = geolocation.watchPosition(position => {
        if (!validSession(token)) return;
        // A fresh callback after a suspended timer must not conceal the gap.
        if (!Number.isFinite(elapsed()) || elapsed() < 0 || elapsed() >= GPS_MAX_AGE_MS) { hold('GPS continuity was lost. Guidance is off. Stop when safe and verify your position before restarting.'); return; }
        const c = position?.coords, time = position?.timestamp, wall = now();
        const point = [c?.latitude, c?.longitude];
        if (!pointOK(point) || !Number.isFinite(c?.accuracy) || c.accuracy < 0 || c.accuracy > 50 || !Number.isFinite(wall) || !Number.isFinite(time) || wall - time >= GPS_MAX_AGE_MS || time > wall + 5000 || (stamp !== null && time <= stamp)) { hold('GPS is inaccurate, stale or out of order. Guidance is off. Verify your position before restarting.'); return; }
        received = monotonic(); stamp = time;
        try { if (onFix({ point, accuracy: c.accuracy, timestamp: time }) === false && active && token === generation) stop(); }
        catch { if (active && token === generation) hold('Position review failed. Guidance is off. Stop when safe and review the route.'); }
      }, error => {
        if (!validSession(token)) return;
        hold(error?.code === 1 ? 'Location permission is unavailable. Guidance is off; the permit wallet remains available.' : 'GPS is unavailable or timed out. Guidance is off. Stop when safe, verify your position, and restart deliberately.');
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
      if (active && token === generation) watch = id; else clear(id);
    } catch { if (active && token === generation) hold('The browser could not start GPS. Guidance is off; retry only while parked.'); }
    return active && token === generation;
  }
  return { start, stop, get active() { return active; } };
}
