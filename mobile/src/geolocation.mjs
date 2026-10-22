// Adapt Capacitor's asynchronous watch IDs to the browser contract used by the app.
export function locationError(error) {
  const nativeCode = String(error?.code || '');
  const code = nativeCode === 'OS-PLUG-GLOC-0003' || error?.code === 1 ? 1 :
    nativeCode === 'OS-PLUG-GLOC-0010' || error?.code === 3 ? 3 : 2;
  return { code, message: error?.message || 'Location unavailable. Check location permission and GPS.',
    PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
}
export function createGeolocation(plugin, onWatchChange = () => {}) {
  let sequence = 0, generation = 0, active = true;
  const watches = new Map();
  const notify = () => onWatchChange(watches.size);
  const report = (callback, error) => { if (callback) callback(locationError(error)); };
  const optionsFor = options => ({ enableHighAccuracy: options.enableHighAccuracy === true,
    timeout: options.timeout ?? 15000, maximumAge: options.maximumAge ?? 0,
    minimumUpdateInterval: 1000 });
  const clearNative = id => plugin.clearWatch({ id }).catch(() => {});
  function clearWatch(id) {
    const watch = watches.get(id); if (!watch) return;
    watches.delete(id); notify();
    if (watch.nativeId !== null) void clearNative(watch.nativeId);
  }
  return {
    getCurrentPosition(success, error, options = {}) {
      const current = generation;
      if (!active) { report(error, {message:'Bring the app to the foreground to use GPS.'}); return; }
      plugin.getCurrentPosition(optionsFor(options)).then(
        position => { if (active && generation === current) success(position); },
        problem => { if (active && generation === current) report(error, problem); });
    },
    watchPosition(success, error, options = {}) {
      const id = ++sequence, watch = { nativeId: null };
      if (!active) { queueMicrotask(() => report(error, {message:'Bring the app to the foreground to start guidance.'})); return id; }
      watches.set(id, watch); notify();
      Promise.resolve().then(() => {
        if (!watches.has(id)) return null;
        return plugin.watchPosition(optionsFor(options), (position, problem) => {
          if (!watches.has(id) || !active) return;
          if (problem) report(error, problem); else if (position) success(position);
        });
      }).then(nativeId => {
        if (nativeId === null) return;
        if (watches.has(id)) watch.nativeId = nativeId;
        else void clearNative(nativeId); // Stop can happen while the permission dialog is open.
      }).catch(problem => { if (watches.has(id)) { clearWatch(id); report(error, problem); } });
      return id;
    },
    clearWatch,
    pause() { active = false; generation++; for (const id of [...watches.keys()]) clearWatch(id); },
    resume() { active = true; },
    get watchCount() { return watches.size; }
  };
}
