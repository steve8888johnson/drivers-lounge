import { warnings, meters } from './core.mjs';
import { hazmatWarnings } from './hazmat.mjs';

// A parked, read-only review of the supplied instructions. No simulated GPS,
// route generation, movement authority or crew-location updates.
export function walkthrough(master, index = 0, role = 'driver', now = Date.now()) {
  if (!master.ready) return { available: false, reason: 'Resolve the permit, geometry and hazmat checks before walking through the route.' };
  const steps = master.permits.flatMap(permit => permit.steps.map(step => ({ permit, step })));
  if (!steps.length) return { available: false, reason: 'No reviewed maneuvers are available.' };
  const position = Math.max(0, Math.min(steps.length - 1, Number.isFinite(index) ? Math.trunc(index) : 0));
  const current = steps[position], previous = steps[position - 1], next = steps[position + 1];
  const trip = master.trip;
  return {
    available: true, index: position, total: steps.length, ...current,
    next: next || null,
    enteringState: !previous || previous.permit.id !== current.permit.id,
    meters: current.step.points.slice(1).reduce((sum, point, i) => sum + meters(current.step.points[i], point), 0),
    alerts: [
      ...warnings(current.permit, trip.profile, role, now),
      ...hazmatWarnings(trip, current.permit, current.step.routeLine),
      ...(next ? hazmatWarnings(trip, next.permit, next.step.routeLine).filter(a => a.startsWith('Hazmat route alert:')).map(a => 'Upcoming ' + a) : [])
    ]
  };
}
