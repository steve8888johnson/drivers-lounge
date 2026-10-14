import { blankHazmat, blankHazmatRoute, sanitizeHazmat, sanitizeHazmatRoute, hazmatErrors } from './hazmat.mjs';
// Permit text is evidence. Geometry is a reviewed transcription, never a new route.
export const CONTROLLING_NOTICE = 'Drivers Lounge assists with following issued permits. The issued permit and state restrictions remain controlling. Never take an unapproved detour.';
export const STATES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' ');
export const id = () => crypto.randomUUID();
export const clone = value => JSON.parse(JSON.stringify(value));
export const clean = (value, max = 20000) => String(value ?? '').slice(0, max);
// Issued text must fit in full. A shortened instruction is different evidence.
export function sourceText(value, max = 20000, label = 'Permit text') {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw Error(`${label} must be text. Keep the original and review this unsupported format.`);
  if (value.length > max) throw Error(`${label} exceeds ${max} characters. Nothing was shortened; keep the full original for manual review.`);
  return value;
}
export function blankPermit() {
  return { id: id(), state: '', number: '', kind: 'single-trip', validFrom: '', validTo: '', timeZone: '',
    entry: { label: '', state: '', road: '' }, exit: { label: '', state: '', road: '' }, routeText: '',
    restrictions: '', complete: false, qr: [], documents: [], steps: [], confidence: {}, limits: {}, travelWindow: null, geometrySource: null, review: null, geometryReview: null, hazmatRoute: blankHazmatRoute() };
}
export function blankTrip() {
  return { schema: 'dl-permit-trip/v1', id: id(), revision: 1, name: '', departure: '', planning: { origin: '', destination: '' },
    profile: { heightFt: '', widthFt: '', lengthFt: '', weightLb: '', axles: '', axleWeights: '', hazmat: '' }, permits: [], acknowledged: false, hazmat: blankHazmat() };
}
export const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && Number.isFinite(Date.parse(s + 'T12:00:00Z')) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s;
export const pointOK = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;
export const roadKey = s => clean(s).toUpperCase().replace(/INTERSTATE/g, 'I').replace(/[^A-Z0-9]/g, '');
export function meters(a, b) {
  const r = Math.PI / 180, h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function reviewKey(p) {
  return JSON.stringify([p.state, p.number, p.kind, p.validFrom, p.validTo, p.timeZone, p.entry, p.exit, p.routeText, p.restrictions, p.complete, p.limits, p.travelWindow, p.documents, p.qr]);
}
export const geometryKey = p => JSON.stringify([reviewKey(p), p.steps, p.geometrySource]);
export const reviewed = p => p.review?.key === reviewKey(p);
export const geometryReviewed = p => reviewed(p) && p.geometryReview?.key === geometryKey(p);
export const crewKey = trip => JSON.stringify([trip.profile, sanitizeHazmat(trip.hazmat), trip.permits.map(p => [p.state, p.number, p.kind, p.validFrom, p.validTo, p.timeZone, p.entry, p.exit, p.routeText, p.restrictions, p.complete, p.limits, p.travelWindow, p.steps.map(s => [s.text, s.road || '', s.lane || '', Number(s.routeLine), s.points]), p.geometrySource, sanitizeHazmatRoute(p.hazmatRoute)])]);
export function confirmPermit(p, reviewer = 'Device operator') {
  const errors = permitErrors(p, false);
  if (errors.length) throw Error(errors.join(' '));
  p.review = { key: reviewKey(p), at: new Date().toISOString(), by: reviewer };
}
export function confirmGeometry(p, reviewer = 'Device operator') {
  if (!reviewed(p)) throw Error('Confirm the issued permit first.');
  const errors = geometryErrors(p);
  if (errors.length) throw Error(errors.join(' '));
  p.geometryReview = { key: geometryKey(p), at: new Date().toISOString(), by: reviewer };
}
export function permitErrors(p, requireReview = true) {
  const e = [], label = p.number || p.state || 'Permit';
  if (!STATES.includes(p.state)) e.push(`${label}: choose issuing state.`);
  if (!p.number.trim()) e.push(`${label}: permit number is missing.`);
  if (!validDate(p.validFrom) || !validDate(p.validTo) || p.validFrom > p.validTo) e.push(`${label}: confirm effective dates.`);
  try { if (!p.timeZone) throw Error(); new Intl.DateTimeFormat('en', { timeZone: p.timeZone }); } catch { e.push(`${label}: choose the permit's local time zone.`); }
  if (!p.entry.label || !p.exit.label) e.push(`${label}: confirm origin and destination.`);
  for (const edge of [p.entry, p.exit]) if (edge.state && (!STATES.includes(edge.state) || !edge.road)) e.push(`${label}: confirm border state and road.`);
  if (!p.complete || !p.routeText.trim()) e.push(`${label}: the complete authorized route and all restriction pages are required.`);
  if (!p.documents.length) e.push(`${label}: retain an original permit image or PDF.`);
  if (p.travelWindow && !windowValid(p.travelWindow)) e.push(`${label}: correct the copied movement window and closed dates.`);
  if (requireReview && !reviewed(p)) e.push(`${label}: compare with the original and confirm extraction.`);
  return e;
}
export function profileErrors(p) {
  const errors = [];
  for (const [key, label, max] of [['heightFt', 'Loaded height', 40], ['widthFt', 'Loaded width', 60], ['lengthFt', 'Loaded length', 500], ['weightLb', 'Gross weight', 2000000], ['axles', 'Axle count', 40]]) {
    const n = Number(p[key]); if (!Number.isFinite(n) || n <= 0 || n > max || (key === 'axles' && !Number.isInteger(n))) errors.push(`${label} must be entered accurately.`);
  }
  return errors;
}
export function geometryErrors(p) {
  const e = [], label = p.number || p.state;
  if (!Array.isArray(p.steps) || !p.steps.length) return [`${label}: reviewed route geometry is needed for GPS guidance.`];
  if (p.steps.length > 1000) return [`${label}: too many maneuvers.`];
  p.steps.forEach((s, i) => {
    if (!s.text?.trim() || !Number.isInteger(s.routeLine) || s.routeLine < 1 || s.routeLine > p.routeText.split('\n').length || !p.routeText.split('\n')[s.routeLine - 1]?.trim()) e.push(`${label}: maneuver ${i + 1} needs an instruction and a source route line.`);
    if (!Array.isArray(s.points) || s.points.length < 2 || s.points.length > 20000 || !s.points.every(pointOK)) e.push(`${label}: maneuver ${i + 1} needs detailed latitude/longitude geometry.`);
    else {
      // A sparse line across miles of terrain is not road geometry.
      // Issuer-delivered encoded lines simplify long straight roads. Retain them
      // exactly, with a larger sanity bound; never densify or route between points.
      const maxSpacing = p.geometrySource?.format === 'promiles-public-json/v1' ? 5000 : 500;
      if (!s.points.some((pt, n) => n && meters(s.points[n - 1], pt) >= .01)) e.push(`${label}: maneuver ${i + 1} has no usable route length.`);
      if (s.points.some((pt, n) => n && meters(s.points[n - 1], pt) > maxSpacing)) e.push(`${label}: maneuver ${i + 1} geometry is too sparse (over ${maxSpacing} m between points).`);
      if (i && pointOK(p.steps[i - 1].points?.at(-1)) && meters(p.steps[i - 1].points.at(-1), s.points[0]) > 25) e.push(`${label}: geometry gap before maneuver ${i + 1}.`);
    }
    if (i && s.routeLine < p.steps[i - 1].routeLine) e.push(`${label}: maneuvers reverse the issued route order.`);
  });
  return [...new Set(e)];
}
const connects = (a, b) => a.exit.state === b.state && b.entry.state === a.state && !!roadKey(a.exit.road) && roadKey(a.exit.road) === roadKey(b.entry.road);
export function orderPermits(permits) {
  if (permits.length < 2) return { permits: [...permits], issues: [] };
  const starts = permits.filter(p => !permits.some(other => other !== p && connects(other, p)));
  if (starts.length !== 1) return { permits: [...permits], issues: ['Cannot determine one geographic order. Check missing states, duplicate coverage and border roads.'] };
  const ordered = [starts[0]], issues = [];
  while (ordered.length < permits.length) {
    const next = permits.filter(p => !ordered.includes(p) && connects(ordered.at(-1), p));
    if (next.length !== 1) { issues.push(next.length ? 'Overlapping permits create more than one continuation.' : 'Permit gap or border mismatch: no authorized continuation.'); break; }
    ordered.push(next[0]);
  }
  return { permits: [...ordered, ...permits.filter(p => !ordered.includes(p))], issues };
}
export function buildMaster(trip, { date = trip.departure, geometry = false } = {}) {
  const sorted = orderPermits(trip.permits), issues = [...profileErrors(trip.profile), ...sorted.issues, ...hazmatErrors(trip, { date })], segments = [], boundaries = [];
  if (!trip.permits.length) issues.push('Add every state permit for this load.');
  if (trip.completedAt && trip.permits.some(p => p.kind === 'single-trip')) issues.push('This single-trip move is marked complete. Obtain new permits for another move.');
  if (!validDate(date)) issues.push('Choose a valid travel date.');
  if (!trip.acknowledged) issues.push('Acknowledge that issued permits and state restrictions control.');
  if (sorted.permits[0]?.entry.state) issues.push(`Start coverage is incomplete: the first saved permit enters from ${sorted.permits[0].entry.state}. Add the preceding coverage or verify the actual authorized pickup inside the first state.`);
  if (sorted.permits.at(-1)?.exit.state) issues.push(`End coverage is incomplete: the last saved permit exits to ${sorted.permits.at(-1).exit.state}. Add the remaining coverage or verify the actual authorized delivery inside the final state.`);
  let offset = 0;
  sorted.permits.forEach((p, i) => {
    issues.push(...permitErrors(p));
    if (date < p.validFrom || date > p.validTo) issues.push(`${p.state}: permit is not effective on ${date}.`);
    if (trip.permits.some((other, j) => other !== p && j < trip.permits.indexOf(p) && other.state === p.state && other.number === p.number)) issues.push(`${p.state}: duplicate permit ${p.number}.`);
    const previous = sorted.permits[i - 1];
    if (previous && !connects(previous, p)) issues.push(`${previous.state} → ${p.state}: missing permit or border-road mismatch.`);
    if (geometry) {
      for (const [key, limit] of Object.entries(p.limits || {})) if (Number(limit) > 0 && Number(trip.profile[key]) > Number(limit)) issues.push(`${p.state}: loaded ${key} exceeds the stated permit limit. Resolve before guidance.`);
      issues.push(...geometryErrors(p));
      if (!geometryReviewed(p)) issues.push(`${p.state}: route geometry has not been checked against the issued route.`);
      const a = previous?.steps.at(-1)?.points?.at(-1), b = p.steps[0]?.points?.[0];
      if (previous && pointOK(a) && pointOK(b) && meters(a, b) > 25) issues.push(`${previous.state} → ${p.state}: border coordinates differ by ${Math.round(meters(a, b))} m. No connecting road will be invented.`);
    }
    boundaries.push({ state: p.state, permitId: p.id, at: offset, entry: p.entry.label });
    for (const [stepIndex, step] of p.steps.entries()) {
      if (!Array.isArray(step.points) || !step.points.every(pointOK)) continue;
      for (let n = 1; n < step.points.length; n++) {
        const distance = meters(step.points[n - 1], step.points[n]);
        if (distance < .01) continue;
        segments.push({ a: step.points[n - 1], b: step.points[n], start: offset, end: offset + distance, permitId: p.id, state: p.state, stepIndex, step }); offset += distance;
      }
    }
  });
  return { permits: sorted.permits, issues: [...new Set(issues)], ready: issues.length === 0, geometryChecked: geometry === true, segments, boundaries, meters: offset, trip };
}
function project(point, segment) {
  const k = Math.cos(point[0] * Math.PI / 180), a = [segment.a[0] - point[0], (segment.a[1] - point[1]) * k], b = [segment.b[0] - point[0], (segment.b[1] - point[1]) * k];
  const d = [b[0] - a[0], b[1] - a[1]], t = Math.max(0, Math.min(1, -(a[0] * d[0] + a[1] * d[1]) / (d[0] ** 2 + d[1] ** 2 || 1)));
  return { distance: Math.hypot(a[0] + t * d[0], a[1] + t * d[1]) * 111195, progress: segment.start + t * (segment.end - segment.start), segment };
}
export function locateOnMaster(master, fix, previous = null, now = Date.now()) {
  if (!master?.ready || master.geometryChecked !== true) return { status: 'route-hold', message: 'Route review is incomplete. Guidance paused; verify every issued permit.' };
  if (!fix || !Number.isFinite(now) || !pointOK(fix.point) || !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 50 || !Number.isFinite(fix.timestamp) || now - fix.timestamp > 15000 || fix.timestamp > now + 5000) return { status: 'gps-uncertain', message: 'GPS is stale or inaccurate. Guidance paused; follow the issued permit.' };
  if (previous && (previous.status !== 'on-route' || !Number.isFinite(previous.progress) || !Number.isFinite(previous.timestamp) || !Number.isFinite(previous.highWater) || !Number.isFinite(previous.accuracy))) return { status: 'route-hold', message: 'Route progress cannot be verified. Stop when safe and review your position before restarting.' };
  if (previous && fix.timestamp <= previous.timestamp) return { status: 'gps-uncertain', message: 'GPS update is out of order. Guidance paused; follow the issued permit.' };
  if (previous && fix.timestamp - previous.timestamp > 30000) return { status: 'ambiguous', message: 'GPS continuity was lost. Stop when safe, verify your position and restart guidance.' };
  const allCandidates = master.segments.map(s => project(fix.point, s));
  let candidates = allCandidates;
  if (previous) {
    // Stay on the same ordered corridor at crossings and loops. Never jump ahead to a nearby later road.
    const elapsed = Math.max(0, (fix.timestamp - previous.timestamp) / 1000);
    candidates = candidates.filter(c => c.progress >= previous.progress - 80 && c.progress <= previous.progress + Math.max(200, elapsed * 45));
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const nearest = candidates[0], tolerance = Math.max(35, fix.accuracy * 1.5);
  if (!nearest || nearest.distance > tolerance) return { status: 'deviation', message: 'Off the authorized route. Stop when safe and verify the permit. No automatic reroute.' };
  // Progress history cannot prove which road, ramp or level a nearby fix is on.
  // Check the entire line, including occurrences excluded by the progress filter.
  if (allCandidates.some(c => c.distance <= tolerance && Math.abs(c.progress - nearest.progress) > Math.max(80, tolerance * 2 + 20))) return { status: 'ambiguous', message: 'Location matches multiple parts of the route. Stop when safe and verify your position before guidance.' };
  const { segment, progress } = nearest;
  if (previous && previous.highWater - progress > Math.max(35, previous.accuracy + fix.accuracy)) return { status: 'direction-hold', message: 'GPS progress conflicts with the issued direction. Stop when safe and verify the road and direction. No U-turn or detour is suggested.' };
  if (previous) {
    const crossed = master.segments.filter((s, i, list) => i && s.start > previous.progress && s.start <= progress && (s.permitId !== list[i - 1].permitId || s.stepIndex !== list[i - 1].stepIndex));
    if (crossed.length > 1) return { status: 'continuity-hold', message: 'GPS skipped more than one supplied maneuver. Stop when safe and verify the intervening turns before restarting.' };
  }
  const permit = master.permits.find(p => p.id === segment.permitId);
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: permit.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  if (localDate < permit.validFrom || localDate > permit.validTo) return { status: 'expired', message: `${permit.state} permit is outside its effective dates. Guidance paused.` };
  const hazmatIssues = master.trip ? hazmatErrors(master.trip, { date: localDate, permit }) : [];
  if (hazmatIssues.length) return { status: 'hazmat-hold', message: hazmatIssues[0] };
  const window = movementWindow(permit, now);
  if (!window.allowed) return { status: 'curfew', message: window.message };
  const border = master.boundaries.find(b => b.at >= progress && b.permitId !== permit.id);
  const nextPermit = border && master.permits.find(p => p.id === border.permitId);
  const upcomingBorder = nextPermit ? { permit: nextPermit, distance: border.at - progress, ...permitClock(nextPermit, now) } : null;
  if (upcomingBorder && upcomingBorder.distance <= 800 && !upcomingBorder.allowed) return { status: 'border-hold', message: `Upcoming ${nextPermit.state} border: ${upcomingBorder.message} Stop at a lawful safe place before the border; no detour is suggested.` };
  if (master.meters - progress <= Math.max(10, fix.accuracy)) return { status: 'end-of-geometry', message: 'End of supplied route geometry. Stop when safe and check the permit destination instructions. Arrival and site access are not confirmed.' };
  const stepEnd = master.segments.find(s => s.start >= segment.start && (s.permitId !== segment.permitId || s.stepIndex !== segment.stepIndex));
  return { status: 'on-route', permit, step: segment.step, stepIndex: segment.stepIndex, progress, highWater: Math.max(previous?.highWater ?? 0, progress), accuracy: fix.accuracy, timestamp: fix.timestamp, remaining: master.meters - progress, toManeuver: (stepEnd?.start ?? master.meters) - progress, nextStep: stepEnd?.step || null, nextPermitId: stepEnd?.permitId || null, upcomingBorder, distance: nearest.distance };
}
// Current-time checks only; this does not predict permission at arrival.
export function permitClock(permit, now = Date.now()) {
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: permit.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  if (localDate < permit.validFrom || localDate > permit.validTo) return { allowed: false, message: `${permit.state} permit is outside its effective dates in ${permit.timeZone}.` };
  return movementWindow(permit, now);
}
export function warnings(permit, profile, role = 'driver', now = Date.now()) {
  const alerts = [];
  for (const [key, label] of [['heightFt', 'Height / low clearance'], ['widthFt', 'Width'], ['lengthFt', 'Length'], ['weightLb', 'Weight'], ['axles', 'Axle count']]) {
    if (Number(permit.limits?.[key]) > 0 && Number(profile[key]) > Number(permit.limits[key])) alerts.push(`${label} exceeds the entered permit limit.`);
  }
  if (profile.hazmat) alerts.push(`Hazmat ${profile.hazmat}: verify permit and road restrictions.`);
  if (permit.restrictions) alerts.push(permit.restrictions);
  const window = movementWindow(permit, now); if (window.message) alerts.push(window.message);
  if (role === 'lead') alerts.push('Lead escort: verify upcoming clearances, turns and permit escort instructions before the truck reaches them.');
  if (role === 'chase') alerts.push('Chase escort: follow the authorized route and watch rear clearance and separation from the truck.');
  return alerts;
}
const clockMinutes = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '') ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3)) : null;
export function windowValid(w) { return clockMinutes(w.from) !== null && clockMinutes(w.to) !== null && w.from !== w.to && Array.isArray(w.days) && w.days.length > 0 && w.days.every(n => Number.isInteger(n) && n >= 0 && n <= 6) && Array.isArray(w.closedDates) && w.closedDates.every(validDate); }
export function movementWindow(permit, now = Date.now()) {
  const w = permit.travelWindow; if (!w) return { allowed: true, message: '' };
  if (!windowValid(w)) return { allowed: false, message: 'Movement window is invalid. Verify the original permit.' };
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: permit.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  const date = `${fields.year}-${fields.month}-${fields.day}`, day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(fields.weekday), minutes = Number(fields.hour) * 60 + Number(fields.minute), from = clockMinutes(w.from), to = clockMinutes(w.to), overnight = from > to;
  const startDay = overnight && minutes < to ? (day + 6) % 7 : day;
  const allowed = !w.closedDates.includes(date) && w.days.includes(startDay) && (overnight ? minutes >= from || minutes < to : minutes >= from && minutes < to);
  if (!allowed) return { allowed: false, message: `${permit.state}: outside the copied permitted movement window or on a closed date. Stop when safe; verify the issued restrictions.` };
  const remaining = (to - minutes + 1440) % 1440;
  return { allowed: true, message: remaining <= 15 ? `${permit.state}: copied movement window closes in ${remaining} minutes. Arrange a lawful safe stopping point.` : '' };
}

// Strict data boundary shared by QR adapters, offline packets and crew downloads.
// Imported confirmations are deliberately discarded; each device must review evidence.
export function sanitizePermit(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Permit data must be an object.');
  const p = blankPermit();
  for (const [field, max] of Object.entries({ state: 2, number: 100, kind: 30, validFrom: 10, validTo: 10, timeZone: 100, routeText: 20000, restrictions: 20000 })) p[field] = sourceText(value[field], max, field);
  p.state = p.state.toUpperCase(); p.complete = value.complete === true;
  for (const key of ['entry', 'exit']) for (const [field, max] of Object.entries({ label: 300, state: 2, road: 100 })) p[key][field] = sourceText(value[key]?.[field], max, `${key} ${field}`);
  for (const key of ['heightFt', 'widthFt', 'lengthFt', 'weightLb', 'axles']) {
    const n = value.limits?.[key]; if (n === undefined || n === null || n === '') continue;
    if (!['number', 'string'].includes(typeof n) || !Number.isFinite(Number(n)) || Number(n) <= 0 || (key === 'axles' && !Number.isInteger(Number(n)))) throw Error(`Invalid stated permit limit: ${key}. Compare with the original.`);
    p.limits[key] = Number(n);
  }
  if (value.steps !== undefined && (!Array.isArray(value.steps) || value.steps.length > 1000)) throw Error('Invalid maneuver list.');
  let count = 0;
  p.steps = (value.steps || []).map(s => {
    if (!s || !Array.isArray(s.points) || !s.points.every(pointOK) || (count += s.points.length) > 100000) throw Error('Invalid or excessive route geometry.');
    return { text: sourceText(s.text, 1000, 'Maneuver instruction'), road: sourceText(s.road, 200, 'Maneuver road'), lane: sourceText(s.lane, 300, 'Lane instruction'), routeLine: Number(s.routeLine), points: s.points.map(pt => [...pt]) };
  });
  p.confidence = Object.fromEntries(['state', 'number', 'validFrom', 'validTo', 'entry', 'exit', 'routeText'].map(field => [field, { score: p[field] && (typeof p[field] !== 'object' || p[field].label) ? .8 : 0, source: 'Imported data; compare with original' }]));
  if (value.geometrySource?.format === 'promiles-public-json/v1') p.geometrySource = { format: 'promiles-public-json/v1', note: 'Geometry supplied by public issued-route endpoint; full original review required' };
  if (value.travelWindow) { if (!windowValid(value.travelWindow)) throw Error('Invalid copied movement window.'); p.travelWindow = { from: value.travelWindow.from, to: value.travelWindow.to, days: [...value.travelWindow.days], closedDates: [...value.travelWindow.closedDates] }; }
  if (value.qr !== undefined && (!Array.isArray(value.qr) || value.qr.length > 20)) throw Error('Too many or unsupported QR references. Keep all originals; import at most 20 references per permit.');
  p.qr = (value.qr || []).map(s => sourceText(s, 50000, 'QR reference'));
  p.hazmatRoute = sanitizeHazmatRoute(value.hazmatRoute);
  return p;
}
