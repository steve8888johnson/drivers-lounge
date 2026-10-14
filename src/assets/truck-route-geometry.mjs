// Structural checks only, never road-access or truck-entrance authorization.
// Format: https://github.com/heremaps/flexible-polyline (v1 specification).
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const GEOMETRY_LIMITS = Object.freeze({
  encodedCharacters: 200000, totalCharacters: 500000, points: 50000,
  sections: 1000, endpointMeters: 25, joinMeters: 5, maxStepMeters: 20000
});
const fail = code => { throw new Error(code); };
const validPoint = p => p && typeof p.lat === 'number' && typeof p.lng === 'number'
  && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

export function decodeTruckPolyline(encoded, maxPoints = GEOMETRY_LIMITS.points) {
  if (typeof encoded !== 'string' || encoded.length < 2 || encoded.length > GEOMETRY_LIMITS.encodedCharacters
      || !/^[A-Za-z0-9_-]+$/.test(encoded)) fail('GEOMETRY_ENCODING_INVALID');
  if (!Number.isSafeInteger(maxPoints) || maxPoints < 2 || maxPoints > GEOMETRY_LIMITS.points) fail('GEOMETRY_LIMIT_EXCEEDED');
  let offset = 0;
  function unsigned() {
    let value = 0, multiplier = 1;
    // Seven base32 chunks suffice for supported precision; never bit-shift 32-bit coordinates.
    for (let chunk = 0; chunk < 7; chunk++) {
      if (offset >= encoded.length) fail('GEOMETRY_TRUNCATED');
      const part = alphabet.indexOf(encoded[offset++]);
      value += (part & 31) * multiplier;
      if (part < 32) {
        if (chunk > 0 && part === 0) fail('GEOMETRY_ENCODING_INVALID');
        return value;
      }
      multiplier *= 32;
    }
    fail('GEOMETRY_INTEGER_TOO_LARGE');
  }
  if (unsigned() !== 1) fail('GEOMETRY_VERSION_UNSUPPORTED');
  const header = unsigned();
  // Our request asks for 2D geometry. No silent dropping of an unhandled third dimension.
  if (header < 5 || header > 7) fail('GEOMETRY_FORMAT_UNSUPPORTED');
  const scale = 10 ** header;
  const signed = () => { const n = unsigned(); return n % 2 ? -(n + 1) / 2 : n / 2; };
  let latitude = 0, longitude = 0;
  const points = [];
  while (offset < encoded.length) {
    if (points.length >= maxPoints) fail('GEOMETRY_LIMIT_EXCEEDED');
    latitude += signed(); longitude += signed();
    const point = {lat: latitude / scale, lng: longitude / scale};
    if (!validPoint(point)) fail('GEOMETRY_COORDINATE_INVALID');
    points.push(point);
  }
  if (points.length < 2) fail('GEOMETRY_TOO_SHORT');
  return points;
}

function distance(a, b) {
  const radians = x => x * Math.PI / 180;
  const h = Math.sin(radians(b.lat - a.lat) / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function inspectTruckGeometry(sections, trip) {
  const reasons = [];
  const add = (code, section = null) => reasons.push({code, section});
  if (!validPoint(trip?.origin) || !validPoint(trip?.destination)) add('GEOMETRY_TRIP_ENDPOINTS_MISSING');
  if (!Array.isArray(sections) || !sections.length || sections.length > GEOMETRY_LIMITS.sections)
    return {status: 'HOLD', guidanceAllowed: false, reasons: [...reasons, {code: 'GEOMETRY_SECTIONS_INVALID', section: null}]};
  let totalPoints = 0, totalCharacters = 0, previousEnd = null;
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    const id = typeof section?.id === 'string' ? section.id : null;
    if (section?.type !== 'vehicle') add('GEOMETRY_SECTION_TYPE_UNSUPPORTED', id);
    if (typeof section?.polyline === 'string') totalCharacters += section.polyline.length;
    if (totalCharacters > GEOMETRY_LIMITS.totalCharacters || GEOMETRY_LIMITS.points - totalPoints < 2) {
      add('GEOMETRY_LIMIT_EXCEEDED', id); break;
    }
    let points;
    try { points = decodeTruckPolyline(section?.polyline, GEOMETRY_LIMITS.points - totalPoints); }
    catch (error) { add(error.message, id); previousEnd = null; continue; }
    totalPoints += points.length;
    const first = points[0], last = points.at(-1);
    if (previousEnd && distance(previousEnd, first) > GEOMETRY_LIMITS.joinMeters) add('GEOMETRY_SECTION_GAP', id);
    previousEnd = last;
    for (const [side, endpoint] of [['departure', first], ['arrival', last]]) {
      const place = section?.[side]?.place?.location;
      if (!validPoint(place)) add('GEOMETRY_SECTION_ENDPOINT_MISSING', id);
      else if (distance(place, endpoint) > GEOMETRY_LIMITS.joinMeters) add('GEOMETRY_SECTION_ENDPOINT_MISMATCH', id);
    }
    if (index === 0 && validPoint(trip?.origin) && distance(trip.origin, first) > GEOMETRY_LIMITS.endpointMeters)
      add('GEOMETRY_ORIGIN_MISMATCH', id);
    if (index === sections.length - 1 && validPoint(trip?.destination) && distance(trip.destination, last) > GEOMETRY_LIMITS.endpointMeters)
      add('GEOMETRY_DESTINATION_MISMATCH', id);
    let meters = 0, jump = false;
    for (let point = 1; point < points.length; point++) {
      const step = distance(points[point - 1], points[point]);
      meters += step;
      if (step > GEOMETRY_LIMITS.maxStepMeters) jump = true;
    }
    if (jump) add('GEOMETRY_LARGE_JUMP', id);
    if (meters < 0.5) add('GEOMETRY_DEGENERATE', id);
    const declared = section?.summary?.length;
    if (!Number.isSafeInteger(declared) || declared <= 0) add('GEOMETRY_LENGTH_MISSING', id);
    else if (Math.abs(declared - meters) > Math.max(50, declared * 0.02)) add('GEOMETRY_LENGTH_MISMATCH', id);
  }
  // Tolerances are engineering screening limits, not proof of a truck entrance or a legal road.
  // Never repair a gap with a straight line or reverse/reorder sections to make a candidate pass.
  return {status: reasons.length ? 'HOLD' : 'REVIEW_REQUIRED', guidanceAllowed: false, reasons};
}
