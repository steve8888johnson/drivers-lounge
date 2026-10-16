import { prepareHereRequest } from '../src/assets/truck-provider-review.mjs';
import { reviewTomTomGuidance } from './tomtom-guidance.mjs';

// Server-only evaluation adapter. Reuse existing vehicle/load/equipment gates;
// changing provider must not bypass them. No credentials or network here.
export function prepareTomTomRequest(input, { instructions = false } = {}) {
  const validated = prepareHereRequest(input), vehicle = input.vehicle;
  if (input.origin.lat === input.destination.lat && input.origin.lng === input.destination.lng) throw Error('Distinct trip endpoints required.');
  const query = new URLSearchParams({
    travelMode: 'truck', vehicleCommercial: 'true', routeType: 'fastest',
    traffic: 'true', computeBestOrder: 'false', maxAlternatives: '0',
    routeRepresentation: 'polyline', report: 'effectiveSettings',
    sectionType: 'travelMode', departAt: input.departure,
    vehicleHeight: String(vehicle.heightCm / 100),
    vehicleWidth: String(vehicle.widthCm / 100),
    vehicleLength: String(vehicle.lengthCm / 100),
    vehicleWeight: String(vehicle.currentWeightKg),
    vehicleNumberOfAxles: String(vehicle.axleMeasurement.axles.length),
    // Maximum measured individual axle, rounded up. Never average group weights.
    vehicleAxleWeight: String(Math.ceil(Math.max(...vehicle.axleMeasurement.axles.map(axle => axle.weightLb)) * 0.45359237))
  });
  query.append('avoid', 'unpavedRoads'); query.append('avoid', 'ferries');
  // Opt-in private evaluation only; ordinary transport stays unchanged.
  if (instructions === true) { query.set('instructionsType', 'text'); query.set('language', 'en-US'); }
  const location = point => `${point.lat},${point.lng}`;
  return {
    endpoint: `https://api.tomtom.com/routing/1/calculateRoute/${location(input.origin)}:${location(input.destination)}/json`,
    query: query.toString(), vehicleReviewBinding: validated.vehicleReviewBinding,
    // This API's single axle value does not represent every group/spacing rule.
    guidanceAllowed: false
  };
}

const pointOK = point => point && ['latitude', 'longitude'].every(key => typeof point[key] === 'number' && Number.isFinite(point[key])) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
function meters(a, b) {
  const r = Math.PI / 180, h = Math.sin((b.latitude-a.latitude)*r/2)**2 + Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin((b.longitude-a.longitude)*r/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1,h)), Math.sqrt(Math.max(0,1-h)));
}
const point = value => ({latitude:value.lat,longitude:value.lng});
// Require a real calendar date with an explicit zone. Date.parse alone silently
// normalizes impossible dates and treats zone-free values as server-local time.
function timestamp(value) {
  if (typeof value !== 'string') return NaN;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts) return NaN;
  const [, year, month, day, hour, minute, second, zone] = parts;
  if (+year < 2000 || +month < 1 || +month > 12 || +day < 1 || +day > new Date(Date.UTC(+year,+month,0)).getUTCDate() || +hour > 23 || +minute > 59 || +second > 59) return NaN;
  if (zone !== 'Z' && (+zone.slice(1,3) > 14 || +zone.slice(4) > 59 || (+zone.slice(1,3) === 14 && +zone.slice(4) !== 0))) return NaN;
  return Date.parse(value);
}

export function reviewTomTomCandidate(payload, request) {
  const codes = new Set(), add = code => codes.add(code);
  if (!payload || typeof payload !== 'object' || payload.error || payload.detailedError) add('PROVIDER_ERROR');
  if (payload?.warnings || payload?.notices) add('PROVIDER_WARNING_REQUIRES_REVIEW');
  const settings = payload?.report?.effectiveSettings;
  if (!Array.isArray(settings) || settings.length > 200) add('EFFECTIVE_SETTINGS_MISSING');
  else {
    const expected = new URLSearchParams(request.query);
    for (const key of ['travelMode','vehicleCommercial','vehicleHeight','vehicleWidth','vehicleLength','vehicleWeight','vehicleAxleWeight','vehicleNumberOfAxles']) {
      const values = settings.filter(item => item?.key === key);
      const wanted = expected.get(key), actual = values[0]?.value;
      const equal = ['travelMode','vehicleCommercial'].includes(key) ? actual === wanted : typeof actual === 'string' && /^\d+(?:\.\d+)?$/.test(actual) && Number(actual) === Number(wanted);
      if (values.length !== 1 || !equal) add('EFFECTIVE_TRUCK_SETTINGS_MISMATCH');
    }
  }
  if (!Array.isArray(payload?.routes) || payload.routes.length !== 1) add('SINGLE_CANDIDATE_REQUIRED');
  const route = payload?.routes?.[0];
  if (route?.warnings || route?.notices) add('PROVIDER_WARNING_REQUIRES_REVIEW');
  const legs = route?.legs;
  if (!Array.isArray(legs) || legs.length !== 1) add('SINGLE_LEG_REQUIRED');
  if (legs?.[0]?.warnings || legs?.[0]?.notices) add('PROVIDER_WARNING_REQUIRES_REVIEW');
  const points = legs?.[0]?.points;
  if (!Array.isArray(points) || points.length < 2 || points.length > 100000 || !points.every(pointOK)) add('GEOMETRY_INVALID');
  else {
    if (meters(points[0],point(request.trip.origin)) > 25 || meters(points.at(-1),point(request.trip.destination)) > 25) add('GEOMETRY_ENDPOINT_MISMATCH');
    let length = 0;
    for (let i=1; i<points.length; i++) { const span=meters(points[i-1],points[i]); length+=span; if(span>20000)add('GEOMETRY_GAP'); }
    const stated = route?.summary?.lengthInMeters;
    if (typeof stated !== 'number' || !Number.isFinite(stated) || stated <= 0 || length <= 0 || Math.abs(stated-length)>Math.max(250,length*.15)) add('GEOMETRY_LENGTH_MISMATCH');
    const sections = route?.sections;
    if (!Array.isArray(sections) || !sections.length || sections.length > 10000) add('TRUCK_SECTION_COVERAGE_MISSING');
    else {
      let next = 0;
      for (const section of sections) {
        if (section?.sectionType !== 'TRAVEL_MODE') { add('UNREVIEWED_SECTION_TYPE'); continue; }
        if (section.travelMode !== 'truck') add('NON_TRUCK_SECTION');
        if (!Number.isSafeInteger(section.startPointIndex) || !Number.isSafeInteger(section.endPointIndex) || section.startPointIndex !== next || section.endPointIndex <= next || section.endPointIndex >= points.length) add('TRUCK_SECTION_COVERAGE_MISSING');
        next = section.endPointIndex;
      }
      if (next !== points.length-1) add('TRUCK_SECTION_COVERAGE_MISSING');
    }
  }
  const departure = timestamp(route?.summary?.departureTime), arrival = timestamp(route?.summary?.arrivalTime), seconds = route?.summary?.travelTimeInSeconds;
  if (departure !== Date.parse(request.departure) || !Number.isFinite(arrival) || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 || Math.abs(arrival-departure-seconds*1000)>1000) add('TRIP_TIME_MISMATCH');
  if (new URLSearchParams(request.query).get('instructionsType') === 'text') {
    const guidance = reviewTomTomGuidance(route);
    if (!guidance.structurePassed) for (const reason of guidance.reasons) add(reason.code);
  }
  const structurePassed = codes.size === 0;
  // A successful provider response cannot prove local access or a permit route.
  add('AUTHORITATIVE_RESTRICTIONS_AND_ENTRANCES_UNVERIFIED');
  add('AXLE_GROUP_AND_CONFIGURATION_COVERAGE_UNVERIFIED');
  return {status:'HOLD',guidanceAllowed:false,provider:'tomtom',structurePassed,reasons:[...codes].map(code=>({code}))};
}
