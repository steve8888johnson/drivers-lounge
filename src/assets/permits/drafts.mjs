import { clone, sanitizePermit } from './core.mjs';

// Form capture is all-or-nothing. A malformed geometry field must not partially
// commit unrelated load, permit, or hazmat edits into the working trip.
export function captureTripDraft(trip, update) {
  const draft = clone(trip);
  update(draft);
  return draft;
}

export const maneuverKey = steps => JSON.stringify(steps.map(s => [s.text, s.road || '', s.lane || '', Number(s.routeLine), s.points]));

export function applyGeometryDraft(permit, json) {
  let steps;
  try { steps = JSON.parse(json || '[]'); }
  catch { throw Error('Route maneuvers contain invalid JSON. Correct the geometry before saving any changed fields.'); }
  const parsed = sanitizePermit({ steps });
  if (maneuverKey(permit.steps) !== maneuverKey(parsed.steps)) {
    permit.steps = parsed.steps;
    permit.geometrySource = null;
    permit.geometryReview = null;
  }
}
