// Offline review adapter. No requests, credentials, route activation or legal certification.
// HERE documentation: https://docs.here.com/routing/docs/routing-v8-truck-routing
// https://docs.here.com/routing/docs/routing-v8-admin-wide-restrictions
import {inspectTruckGeometry} from './truck-route-geometry.mjs';
export function prepareHereRequest(input) {
  const p = input?.vehicle;
  if (!p || p.confirmed !== true || p.oversize !== false || p.hazmat !== false)
    throw Error('Confirmed standard non-hazmat vehicle required.');
  const params = new URLSearchParams({transportMode:'truck',routingMode:'fast',return:'polyline,summary',alternatives:'0','avoid[features]':'uTurns,dirtRoad'});
  for (const [field, parameter] of Object.entries({heightCm:'height',widthCm:'width',lengthCm:'length',currentWeightKg:'currentWeight',grossWeightKg:'grossWeight'})) {
    if (!Number.isSafeInteger(p[field]) || p[field] <= 0) throw Error(`Missing or invalid ${field}; no default vehicle sizes allowed.`);
    params.set(`vehicle[${parameter}]`,String(p[field]));
  }
  if (p.currentWeightKg > p.grossWeightKg) throw Error('Current weight exceeds declared maximum loaded weight.');
  if (!Array.isArray(p.axleGroups) || !p.axleGroups.length) throw Error('Measured axle groups required.');
  const maximums = {};
  let total = 0;
  for (const group of p.axleGroups) {
    if (!['single','tandem','triple'].includes(group?.type) || !Number.isSafeInteger(group.weightKg) || group.weightKg <= 0)
      throw Error('Unsupported or unmeasured axle group.');
    total += group.weightKg;
    maximums[group.type] = Math.max(maximums[group.type] || 0,group.weightKg);
  }
  if (total !== p.currentWeightKg) throw Error('Axle group weights must sum to current loaded weight.');
  params.set('vehicle[weightPerAxleGroup]',Object.entries(maximums).sort().map(([type,weight])=>`${type}:${weight}`).join(','));
  for (const endpoint of ['origin','destination']) {
    const point = input[endpoint];
    if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number' || !Number.isFinite(point.lat) || !Number.isFinite(point.lng) || Math.abs(point.lat)>90 || Math.abs(point.lng)>180)
      throw Error(`Invalid ${endpoint} coordinates.`);
    params.set(endpoint,`${point.lat},${point.lng}`);
  }
  // Require canonical UTC to reject normalized impossible dates and departureTime=any.
  const departure = Date.parse(input.departure);
  if (!Number.isFinite(input.now) || !Number.isFinite(departure) || new Date(departure).toISOString() !== input.departure || departure < input.now)
    throw Error('Future canonical UTC departure required.');
  params.set('departureTime',input.departure);
  return {endpoint:'https://router.hereapi.com/v8/routes',query:params.toString(),networkEnabled:false,guidanceAllowed:false};
}
export function reviewHereCandidate(payload, request, current) {
  const reasons = [];
  const add = (code, section = null) => reasons.push({code, section});
  if (!request || !current || typeof request.fingerprint !== 'string' || !request.fingerprint.trim() || request.fingerprint !== current.fingerprint)
    add('REQUEST_CHANGED');
  if (request?.transportMode !== 'truck') add('TRUCK_MODE_REQUIRED');
  if (request?.scope !== 'standard-nonhazmat') add('UNSUPPORTED_SCOPE');
  if (!Number.isFinite(current?.now) || !Number.isFinite(request?.expiresAt) || current.now >= request.expiresAt || !Number.isFinite(request?.createdAt) || request.createdAt > current.now || request.createdAt >= request.expiresAt)
    add('REQUEST_EXPIRED');
  const inspectNotices = (notices, section) => {
    if (notices === undefined) return;
    if (!Array.isArray(notices)) { add('MALFORMED_NOTICES', section); return; }
    // Even info-severity notices can describe illegal vehicle restrictions.
    // Unknown notices stay on hold until their semantics have been reviewed.
    for (const notice of notices) {
      add(typeof notice?.code === 'string' && notice.code.startsWith('violated') ? 'RESTRICTION_VIOLATION' : 'PROVIDER_NOTICE_REQUIRES_REVIEW', section);
    }
  };
  if (!payload || typeof payload !== 'object' || payload.error || payload.error_description || payload.title)
    add('PROVIDER_ERROR');
  inspectNotices(payload?.notices, null);
  // Inspect exactly one requested candidate; never silently choose an alternative.
  if (!Array.isArray(payload?.routes) || payload.routes.length !== 1) add('SINGLE_CANDIDATE_REQUIRED');
  const route = payload?.routes?.[0];
  if (typeof route?.id !== 'string' || !route.id.trim()) add('ROUTE_ID_MISSING');
  inspectNotices(route?.notices, null);
  const sections = route?.sections;
  if (!Array.isArray(sections) || !sections.length || sections.length > 1000) add('SECTIONS_INVALID');
  else {
    const seen = new Set();
    for (const section of sections) {
      const id = section?.id;
      if (typeof id !== 'string' || !id.trim() || seen.has(id)) add('SECTION_ID_INVALID');
      seen.add(id);
      if (section?.transport?.mode !== 'truck') add('NON_TRUCK_SECTION', id);
      if (typeof section?.polyline !== 'string' || !section.polyline.trim()) add('GEOMETRY_MISSING', id);
      inspectNotices(section?.notices, id);
    }
  }
  reasons.push(...inspectTruckGeometry(sections, request?.trip).reasons);
  return {
    status: reasons.length ? 'HOLD' : 'REVIEW_REQUIRED',
    guidanceAllowed: false,
    reasons,
    // No geometry or maneuvers leave this reviewer. A clean response is not clearance.
    remainingChecks: ['authenticated provider response', 'geometry-to-road and direction verification', 'complete current state and local restrictions', 'vehicle and axle-group compliance', 'destination truck entrance and access', 'field validation']
  };
}
