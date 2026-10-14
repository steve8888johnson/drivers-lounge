import { clone, sanitizePermit } from './core.mjs';

// A QR is an unconfirmed source. It must not silently replace another permit,
// reuse an old line after route text changes, or carry approval into this wallet.
export function mergePermitIntake(existing, value) {
  const incoming = sanitizePermit(value), next = clone(existing);
  for (const field of ['state', 'number']) {
    const oldValue = String(existing[field] || '').trim().toUpperCase();
    const newValue = String(incoming[field] || '').trim().toUpperCase();
    if (oldValue && newValue && oldValue !== newValue) throw Error('This QR belongs to a different state or permit number. Add a separate state permit; the existing route was kept.');
  }
  const changedRoute = (incoming.routeText && incoming.routeText !== existing.routeText) || ['entry','exit'].some(side => ['label','state','road'].some(field => incoming[side][field] && incoming[side][field] !== existing[side][field]));
  for (const key of ['state', 'number', 'validFrom', 'validTo', 'timeZone', 'routeText', 'restrictions']) if (incoming[key]) next[key] = incoming[key];
  // Preserve an already-entered permit type when a partial extraction lacks it.
  if (incoming.kind && !existing.number && !existing.routeText) next.kind = incoming.kind;
  for (const side of ['entry', 'exit']) for (const field of ['label', 'state', 'road']) if (incoming[side]?.[field]) next[side][field] = incoming[side][field];
  if (changedRoute) { next.steps = []; next.geometrySource = null; }
  if (incoming.steps.length) { next.steps = incoming.steps; next.geometrySource = incoming.geometrySource; }
  if (incoming.travelWindow) next.travelWindow = incoming.travelWindow;
  if (Object.keys(incoming.limits).length) next.limits = incoming.limits;
  next.confidence = incoming.confidence;
  next.complete = false; next.review = null; next.geometryReview = null;
  return next;
}

export function createCameraSession() {
  let generation = 0;
  return {
    start(tripId, permitId) { return { generation: ++generation, tripId, permitId }; },
    cancel() { generation++; },
    current(token, tripId, permitId) { return !!token && token.generation === generation && token.tripId === tripId && token.permitId === permitId; }
  };
}
