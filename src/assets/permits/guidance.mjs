import { clone } from './core.mjs';

// Local session binding, not proof that a permit or a road is authentic.
// Include confirmations, originals, crew revision and the full loaded profile.
const binding = trip => JSON.stringify(trip);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export function createGuidanceSession() {
  let generation = 0;
  return {
    start(trip) { return Object.freeze({ generation: ++generation, key: binding(trip), snapshot: freeze(clone(trip)) }); },
    cancel() { generation++; },
    active(token) { return !!token && token.generation === generation; },
    matches(token, trip) { return this.active(token) && token.key === binding(trip); }
  };
}

export function maneuverCue(result) {
  if (result?.status !== 'on-route') return null;
  const band = result.toManeuver < 150 ? 'near' : result.toManeuver < 800 ? 'approach' : 'far';
  return {
    // Multiple maneuvers can legitimately cite the same printed route line.
    key: `${result.permit.id}-${result.stepIndex}-${band}`,
    current: result.step.text,
    next: result.nextStep?.text || null,
    source: result.permit.routeText.split('\n')[result.step.routeLine - 1],
    sourceLine: result.step.routeLine,
    band
  };
}
