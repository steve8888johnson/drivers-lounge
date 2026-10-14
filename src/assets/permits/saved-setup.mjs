import { profileErrors } from './core.mjs';

export const REUSABLE_MEASUREMENTS = ['heightFt','widthFt','lengthFt','weightLb','axles'];
export function applySavedPermitSetup(trip, values) {
  // Only a genuinely empty new draft may receive convenience values. Existing
  // loads, imported packets and shared revisions retain their own measurements.
  if (trip.permits.length || trip.acknowledged || Object.values(trip.profile).some(Boolean) || !values || profileErrors(values).length) return trip;
  for (const key of REUSABLE_MEASUREMENTS) trip.profile[key] = String(values[key]);
  trip.acknowledged = false;
  trip.profileFromSavedSetup = true;
  return trip;
}
