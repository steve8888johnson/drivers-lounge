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
  if (changedRoute) { next.steps = []; next.geometrySource = null; next.issuerMap = null; }
  if (incoming.steps.length) { next.steps = incoming.steps; next.geometrySource = incoming.geometrySource; next.issuerMap = null; }
  if (incoming.issuerMap) { next.issuerMap = incoming.issuerMap; next.steps = []; next.geometrySource = null; }
  if (incoming.travelWindow) next.travelWindow = incoming.travelWindow;
  if (Object.keys(incoming.limits).length) next.limits = incoming.limits;
  next.confidence = incoming.confidence;
  next.complete = false; next.review = null; next.geometryReview = null;
  return next;
}

// Preview the exact merge; never manufacture a diff from a truncated excerpt.
export function previewPermitIntake(existing, value) {
  const next = mergePermitIntake(existing, value), changes = [], retained = [];
  const fields = [['state','Issuing state'],['number','Permit number'],['kind','Permit type'],['validFrom','Effective from'],['validTo','Effective through'],['timeZone','Permit time zone'],['entry','Origin / entry'],['exit','Destination / exit'],['routeText','Issued route text'],['restrictions','Conditions / restrictions'],['limits','Stated vehicle limits'],['travelWindow','Copied movement window']];
  const display = v => v == null || v === '' ? '(not supplied)' : typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  for (const [field, label] of fields) {
    if (JSON.stringify(existing[field]) !== JSON.stringify(next[field])) changes.push({ field, label, before: display(existing[field]), after: display(next[field]) });
    else if (['validFrom','validTo','timeZone','restrictions','limits','travelWindow'].includes(field) && existing[field] && (typeof existing[field] !== 'object' || Object.keys(existing[field]).length)) retained.push(label);
  }
  const geometryChanged = JSON.stringify(existing.steps) !== JSON.stringify(next.steps) || JSON.stringify(existing.geometrySource) !== JSON.stringify(next.geometrySource);
  return { next, changes, retained, geometryChanged, geometryBefore: existing.steps.length, geometryAfter: next.steps.length,
    warnings: ['This is an unconfirmed draft. Applying it clears the complete-pages checkbox and both permit and geometry confirmations.',
      ...(existing.steps.length && !next.steps.length ? ['The issued route changed without replacement geometry. The old maneuvers will be removed; no roads will be calculated between points.'] : []),
      ...(retained.length ? ['Unchanged saved fields are retained, not reverified by this import: ' + retained.join(', ') + '. Compare them with every current original page.'] : []),
      ...(next.steps.length ? ['Imported maneuver count is not proof of complete route or road coverage. Compare every instruction and original condition.'] : []),
      ...(next.issuerMap ? [`Texas supplied ${next.issuerMap.paths[0].length} map coordinates. This replaces any saved maneuvers with a parked overview only. Turn positions and GPS guidance are unavailable; retain every original condition page.`] : [])] };
}

export function intakeContext(tripId, permit) { return JSON.stringify([tripId, permit.id, permit]); }
export function intakeContextMatches(context, tripId, permit) { return !!permit && context === intakeContext(tripId, permit); }

export function createCameraSession() {
  let generation = 0;
  return {
    start(tripId, permitId) { return { generation: ++generation, tripId, permitId }; },
    cancel() { generation++; },
    current(token, tripId, permitId) { return !!token && token.generation === generation && token.tripId === tripId && token.permitId === permitId; }
  };
}
