import { warnings, meters, permitClock } from './core.mjs';
import { hazmatWarnings } from './hazmat.mjs';

// A parked, read-only review of the supplied instructions. No simulated GPS,
// route generation, movement authority or crew-location updates.
export function walkthrough(master, index = 0, role = 'driver', now = Date.now()) {
  if (!master?.ready || master.geometryChecked !== true) return { available: false, reason: 'Resolve the permit, geometry and hazmat checks before walking through the route.' };
  const steps = master.permits.flatMap(permit => permit.steps.map(step => ({ permit, step })));
  if (!steps.length) return { available: false, reason: 'No reviewed maneuvers are available.' };
  const position = Math.max(0, Math.min(steps.length - 1, Number.isFinite(index) ? Math.trunc(index) : 0));
  const current = steps[position], previous = steps[position - 1], next = steps[position + 1];
  const trip = master.trip;
  const borderPermit = next && next.permit.id !== current.permit.id ? next.permit : null;
  const clock = borderPermit && permitClock(borderPermit, now);
  const window = borderPermit?.travelWindow;
  return {
    available: true, index: position, total: steps.length, ...current,
    next: next || null,
    source: current.permit.routeText.split('\n')[current.step.routeLine - 1],
    border: borderPermit ? {
      permit: borderPermit,
      clockMessage: clock.allowed ? 'Dates and any copied clock window checked for now only. Recheck at your actual arrival; this is not permission to cross.' : `Current-time hold: ${clock.message}`,
      windowText: window ? `Copied window: ${window.from}–${window.to}; start days ${window.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}; closed dates: ${window.closedDates.join(', ') || 'none entered'}. Check the original for daylight, holiday and other conditions.` : 'No clock window copied. Read all original travel-time conditions; no unrestricted travel is assumed.'
    } : null,
    enteringState: !previous || previous.permit.id !== current.permit.id,
    meters: current.step.points.slice(1).reduce((sum, point, i) => sum + meters(current.step.points[i], point), 0),
    alerts: [
      ...warnings(current.permit, trip.profile, role, now),
      ...hazmatWarnings(trip, current.permit, current.step.routeLine),
      ...(next ? hazmatWarnings(trip, next.permit, next.step.routeLine).filter(a => a.startsWith('Hazmat route alert:')).map(a => 'Upcoming ' + a) : [])
    ]
  };
}
