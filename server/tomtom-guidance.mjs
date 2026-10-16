// Private structural review only; never a permission to navigate.
// Contract: https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/guidance-instructions
const maneuvers = new Set(('ARRIVE ARRIVE_LEFT ARRIVE_RIGHT DEPART STRAIGHT KEEP_RIGHT BEAR_RIGHT TURN_RIGHT SHARP_RIGHT KEEP_LEFT BEAR_LEFT TURN_LEFT SHARP_LEFT MAKE_UTURN ENTER_MOTORWAY ENTER_FREEWAY ENTER_HIGHWAY TAKE_EXIT MOTORWAY_EXIT_LEFT MOTORWAY_EXIT_RIGHT TAKE_FERRY ROUNDABOUT_CROSS ROUNDABOUT_RIGHT ROUNDABOUT_LEFT ROUNDABOUT_BACK TRY_MAKE_UTURN FOLLOW SWITCH_PARALLEL_ROAD SWITCH_MAIN_ROAD ENTRANCE_RAMP WAYPOINT_LEFT WAYPOINT_RIGHT WAYPOINT_REACHED').split(' '));
const types = new Set(['TURN', 'ROAD_CHANGE', 'LOCATION_DEPARTURE', 'LOCATION_ARRIVAL', 'DIRECTION_INFO', 'LOCATION_WAYPOINT']);
const finite = x => typeof x === 'number' && Number.isFinite(x);
const pointOK = p => p && finite(p.latitude) && finite(p.longitude) && Math.abs(p.latitude) <= 85 && Math.abs(p.longitude) <= 180;
const textOK = (s, max = 1000) => typeof s === 'string' && s.trim().length > 0 && s.length <= max && !/[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(s);
function vector(a, b) { return [(b.longitude - a.longitude) * Math.cos((a.latitude + b.latitude) * Math.PI / 360) * 111195, (b.latitude - a.latitude) * 111195]; }
function span(a, b) { return Math.hypot(...vector(a, b)); }
function binding(p, a, b = a) {
  const [x, y] = vector(a, b), [px, py] = vector(a, p), square = x * x + y * y;
  const t = square ? Math.max(0, Math.min(1, (px * x + py * y) / square)) : 0;
  return { fraction: t, gap: Math.hypot(px - x * t, py - y * t) };
}

export function reviewTomTomGuidance(route) {
  const hold = code => ({ status: 'HOLD', guidanceAllowed: false, structurePassed: false, reasons: [{ code }], instructions: [] });
  const points = route?.legs?.[0]?.points, items = route?.guidance?.instructions, summary = route?.summary;
  if (!Array.isArray(route?.legs) || route.legs.length !== 1 || !Array.isArray(points) || points.length < 2 || points.length > 100000 || !points.every(pointOK)) return hold('INSTRUCTION_GEOMETRY_INVALID');
  if (!finite(summary?.lengthInMeters) || summary.lengthInMeters <= 0 || !finite(summary?.travelTimeInSeconds) || summary.travelTimeInSeconds <= 0) return hold('INSTRUCTION_SUMMARY_INVALID');
  if (!Array.isArray(items) || items.length < 2 || items.length > 5000) return hold('INSTRUCTIONS_MISSING');
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    const length = span(points[i - 1], points[i]);
    if (length > 20000 || Math.abs(points[i].longitude - points[i - 1].longitude) > 180) return hold('INSTRUCTION_GEOMETRY_GAP');
    cumulative.push(cumulative.at(-1) + length);
  }
  if (Math.abs(cumulative.at(-1) - summary.lengthInMeters) > Math.max(25, summary.lengthInMeters * .005)) return hold('INSTRUCTION_LENGTH_MISMATCH');
  let offset = -1, seconds = -1, position = -1;
  const instructions = [], seen = new Set();
  for (const item of items) {
    if (!item || !pointOK(item.point) || !Number.isSafeInteger(item.pointIndex) || item.pointIndex < 0 || item.pointIndex >= points.length) return hold('INSTRUCTION_POINT_INVALID');
    const meters = item.routeOffsetInMeters, time = item.travelTimeInSeconds;
    if (!finite(meters) || meters < 0 || meters < offset || meters > summary.lengthInMeters || !finite(time) || time < 0 || time < seconds || time > summary.travelTimeInSeconds) return hold('INSTRUCTION_ORDER_INVALID');
    const projection = binding(item.point, points[item.pointIndex], points[item.pointIndex + 1]);
    const along = cumulative[item.pointIndex] + projection.fraction * ((cumulative[item.pointIndex + 1] ?? cumulative[item.pointIndex]) - cumulative[item.pointIndex]);
    if (projection.gap > 10 || along < position - .01 || Math.abs(along - meters) > Math.max(25, meters * .005)) return hold('INSTRUCTION_ROUTE_BINDING_MISMATCH');
    if (!maneuvers.has(item.maneuver) || !types.has(item.instructionType)) return hold('INSTRUCTION_KIND_UNSUPPORTED');
    if (!textOK(item.message) || ['street', 'exitNumber', 'signpostText'].some(k => item[k] !== undefined && !textOK(item[k], 500)) || (item.roadNumbers !== undefined && (!Array.isArray(item.roadNumbers) || item.roadNumbers.length > 20 || !item.roadNumbers.every(s => textOK(s, 100))))) return hold('INSTRUCTION_TEXT_INVALID');
    const key = `${meters}:${item.pointIndex}:${item.maneuver}:${item.message}`;
    if (seen.has(key)) return hold('INSTRUCTION_DUPLICATED');
    seen.add(key); offset = meters; seconds = time; position = along;
    instructions.push({ offsetMeters: meters, elapsedSeconds: time, pointIndex: item.pointIndex,
      point: { ...item.point }, maneuver: item.maneuver, instructionType: item.instructionType,
      message: item.message, street: item.street || '', exitNumber: item.exitNumber || '',
      signpostText: item.signpostText || '', roadNumbers: [...(item.roadNumbers || [])] });
  }
  const first = instructions[0], last = instructions.at(-1);
  if (first.maneuver !== 'DEPART' || first.instructionType !== 'LOCATION_DEPARTURE' || first.offsetMeters !== 0 || first.elapsedSeconds !== 0 || last.instructionType !== 'LOCATION_ARRIVAL' || !['ARRIVE', 'ARRIVE_LEFT', 'ARRIVE_RIGHT'].includes(last.maneuver) || Math.abs(last.offsetMeters - summary.lengthInMeters) > 10 || Math.abs(last.elapsedSeconds - summary.travelTimeInSeconds) > 1 || instructions.slice(1, -1).some(i => ['LOCATION_ARRIVAL', 'LOCATION_DEPARTURE'].includes(i.instructionType) || i.maneuver === 'DEPART' || i.maneuver.startsWith('ARRIVE'))) return hold('INSTRUCTION_ENDPOINTS_INVALID');
  return { status: 'REVIEW_ONLY', guidanceAllowed: false, structurePassed: true,
    reasons: [{ code: 'ROAD_RESTRICTIONS_AND_OPERATIONAL_GUIDANCE_UNVERIFIED' }], instructions };
}
