import { profileErrors, validDate } from './core.mjs';

export function planningPlaces(value) {
  const text = value => typeof value === 'string' ? value.trim().slice(0, 300) : '';
  return { origin: text(value?.origin), destination: text(value?.destination) };
}

// Preparation status never grants movement authority or selects intermediate states.
export function preparationStatus(trip) {
  const places = planningPlaces(trip?.planning), pending = [];
  if (!places.origin || !places.destination) pending.push('pickup and delivery places');
  if (!validDate(trip?.departure)) pending.push('travel date');
  if (profileErrors(trip?.profile || {}).length) pending.push('actual loaded dimensions, weight and axle count');
  if (!trip?.permits?.length) pending.push('issued state permits');
  return { pending, guidanceAllowed: false, message: pending.length ? `Draft only — still needed: ${pending.join('; ')}. No route has been calculated or authorized.` : 'Load details entered. Review every issued permit, route connection and condition. This preparation status does not authorize movement.' };
}

export function applyPlanningHandoff(trip, value) {
  const places = planningPlaces(value);
  trip.planning = places;
  if (places.origin && places.destination) trip.name = `${places.origin} → ${places.destination}`.slice(0, 120);
  trip.departure = ''; // A new load has no inferred travel date.
  return trip;
}
