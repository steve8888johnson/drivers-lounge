// Offline diagnostic contract. No map fetches, trusted-source adapter or driving authorization.
// HERE spans and reference syntax: see TRUCK-ROAD-BINDING-REVIEW.md.
import {decodeTruckPolyline, GEOMETRY_LIMITS} from './truck-route-geometry.mjs';
const fail = code => { throw Error(code); };
const text = value => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 300 && !/[\u0000-\u001f\u007f]/.test(value);
const pointEqual = (a, b) => a && b && typeof a.lat === 'number' && typeof a.lng === 'number' && Number.isFinite(a.lat) && Number.isFinite(a.lng) && a.lat === b.lat && a.lng === b.lng;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const maxAge = 24 * 60 * 60 * 1000; // Internal review window, NOT an authority update guarantee.

export function parseDirectedSegmentReference(value, replacements = {}) {
  if (typeof value !== 'string' || value.length > 2048 || /\s/.test(value) || !replacements || typeof replacements !== 'object' || Array.isArray(replacements)) fail('ROAD_REFERENCE_INVALID');
  const keys = Object.keys(replacements);
  if (keys.length > 100 || keys.some(key => !/^\d{1,3}$/.test(key) || typeof replacements[key] !== 'string' || replacements[key].length > 1024 || /[$#\s\u0000-\u001f\u007f]/.test(replacements[key]))) fail('ROAD_REPLACEMENTS_INVALID');
  // Expand complete colon-delimited tokens once. Recursive or inherited replacements never resolve.
  const expanded = value.split(':').map(token => {
    if (!/^\$\d{1,3}$/.test(token)) return token;
    const key = token.slice(1);
    if (!Object.hasOwn(replacements, key)) fail('ROAD_REPLACEMENT_MISSING');
    return replacements[key];
  }).join(':');
  if (expanded.length > 2048 || expanded.includes('$')) fail('ROAD_REFERENCE_INVALID');
  // Deliberately support only directed HERE cm topology segments. Unknown catalogs/schemas hold.
  const match = expanded.match(/^(hrn:here:data:[^:$#\s]*:[^:$#\s]+:[^:$#\s]+):(\d+):([^:$#\s]*):(\d+):(here:cm:segment:\d+)#([+-])(?:([01](?:\.\d+)?)\.\.([01](?:\.\d+)?))?$/);
  if (!match) fail('ROAD_REFERENCE_UNSUPPORTED');
  const [, catalog, version, layer, tile, segment, direction, startRaw, endRaw] = match;
  const offset = raw => {
    const [whole, fraction = ''] = raw.split('.');
    if (fraction.length > 64 || (whole === '1' && /[1-9]/.test(fraction))) fail('ROAD_REFERENCE_RANGE_INVALID');
    const decimals = fraction.replace(/0+$/, '');
    return {key: whole + (decimals ? `.${decimals}` : ''), scaled: BigInt(whole + fraction.padEnd(64, '0'))};
  };
  const startValue = offset(startRaw ?? '0'), endValue = offset(endRaw ?? '1');
  if (startValue.scaled >= endValue.scaled) fail('ROAD_REFERENCE_RANGE_INVALID');
  const startKey = startValue.key, endKey = endValue.key;
  const map = `${catalog}:${version}`;
  // Exact decimal keys prevent floating-point rounding from filling a gap or reaching a node.
  return {map, layer, tile, segment, direction, startKey, endKey,
    reference: `${map}:${layer}:${tile}:${segment}#${direction}${startKey}..${endKey}`};
}

function time(value) {
  const m = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/);
  if (!m) return NaN;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return NaN;
  if (m[7] !== 'Z') {
    const [h, min] = m[7].slice(1).split(':').map(Number);
    if (m[7] === '-00:00' || h > 14 || min > 59 || (h === 14 && min !== 0)) return NaN;
  }
  return Date.parse(value);
}

export function inspectRoadBinding(route, request, current, evidence) {
  const reasons = [];
  const add = (code, section = null) => { if (reasons.length < 200) reasons.push({code, section}); };
  const result = () => ({status: reasons.length ? 'HOLD' : 'REVIEW_REQUIRED', guidanceAllowed: false, reasons});
  const sections = route?.sections;
  if (!Array.isArray(sections) || !sections.length || sections.length > GEOMETRY_LIMITS.sections) {
    add('ROAD_SECTIONS_INVALID'); return result();
  }
  if (!text(request?.fingerprint) || request.fingerprint !== current?.fingerprint || !text(route?.id)) add('ROAD_REQUEST_CHANGED');
  let pointCount = 0, characters = 0, map = null, previousArrival = null;
  const occurrences = [], bindings = [];
  for (const section of sections) {
    const id = section?.id;
    const departure = time(section?.departure?.time), arrival = time(section?.arrival?.time);
    if (![departure, arrival].every(Number.isFinite) || arrival <= departure || (previousArrival !== null && departure !== previousArrival)) add('ROAD_TIMELINE_INVALID', id);
    previousArrival = arrival;
    characters += typeof section?.polyline === 'string' ? section.polyline.length : 0;
    if (characters > GEOMETRY_LIMITS.totalCharacters || pointCount + 2 > GEOMETRY_LIMITS.points) { add('ROAD_LIMIT_EXCEEDED'); return result(); }
    let points;
    try { points = decodeTruckPolyline(section?.polyline, GEOMETRY_LIMITS.points - pointCount); }
    catch { add('ROAD_GEOMETRY_INVALID', id); continue; }
    pointCount += points.length;
    bindings.push({id, polyline: section.polyline});
    const spans = section?.spans;
    if (!Array.isArray(spans) || !spans.length || spans.length >= points.length) { add('ROAD_SPANS_MISSING_OR_INVALID', id); continue; }
    for (let index = 0; index < spans.length; index++) {
      const span = spans[index], offset = span?.offset;
      const endOffset = index + 1 < spans.length ? spans[index + 1]?.offset : points.length - 1;
      if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(endOffset) || offset < 0 || endOffset >= points.length || endOffset <= offset || (index === 0 && offset !== 0)) {
        add('ROAD_SPAN_PARTITION_INVALID', id); continue;
      }
      let ref;
      try { ref = parseDirectedSegmentReference(span?.segmentRef, section.refReplacements); }
      catch (error) { add(error.message, id); continue; }
      if (map !== null && map !== ref.map) add('ROAD_MAP_VERSION_CONFLICT', id);
      map = ref.map;
      occurrences.push({sectionId: id, offset, endOffset, ...ref, first: points[offset], last: points[endOffset]});
    }
  }
  const departure = time(sections[0]?.departure?.time), arrival = time(sections.at(-1)?.arrival?.time), now = current?.now;
  if (!Number.isFinite(now) || !Number.isFinite(departure) || !Number.isFinite(arrival) || departure < now || departure !== time(request?.departure)) add('ROAD_TIMELINE_INVALID');
  if (!evidence || typeof evidence !== 'object') { add('ROAD_TOPOLOGY_AND_ENTRANCES_UNVERIFIED'); return result(); }
  if (evidence.requestFingerprint !== request?.fingerprint || evidence.routeId !== route?.id || evidence.complete !== true || !same(evidence.sectionBindings, bindings)) add('ROAD_EVIDENCE_BINDING');
  // These source fields are claims until a licensed, authenticated server adapter supplies them.
  // A metadata boolean, clean geometry or signed-in user can never authorize guidance here.
  function source(record, kind, id) {
    let urlValid = false;
    try { const u = new URL(record?.sourceUrl); urlValid = u.protocol === 'https:' && !u.username && !u.password; } catch {}
    if (record?.status !== 'supported' || !text(record.sourceRecordId) || !text(record.authority) || !urlValid) add(`${kind}_SOURCE_UNVERIFIED`, id);
    const observed = time(record?.observedAt), from = time(record?.validFrom), until = time(record?.validUntil);
    if (![observed, from, until, departure, arrival, now].every(Number.isFinite) || observed > now || from > departure || until <= arrival || until <= observed || now - observed >= maxAge || arrival >= observed + maxAge) add(`${kind}_SOURCE_STALE`, id);
  }
  const records = evidence.roads, transitions = evidence.transitions;
  if (!Array.isArray(records) || records.length !== occurrences.length || !occurrences.length) { add('ROAD_RECORDS_INCOMPLETE'); return result(); }
  if (!Array.isArray(transitions) || transitions.length !== occurrences.length - 1) add('ROAD_TURNS_INCOMPLETE');
  const nodes = new Map();
  for (let index = 0; index < occurrences.length; index++) {
    const occurrence = occurrences[index], record = records[index];
    const id = occurrence.sectionId;
    if (record?.occurrence !== index || record.sectionId !== id || record.offset !== occurrence.offset || record.segmentRef !== occurrence.reference) add('ROAD_RECORD_BINDING', id);
    if (!text(record?.startNode) || !text(record?.endNode) || record.startNode === record.endNode) add('ROAD_NODES_UNVERIFIED', id);
    const identity = `${occurrence.map}:${occurrence.segment}`, nodePair = [record?.startNode, record?.endNode];
    if (nodes.has(identity) && !same(nodes.get(identity), nodePair)) add('ROAD_NODES_CONFLICT', id);
    nodes.set(identity, nodePair);
    source(record, 'ROAD', id);
    if (index === 0) continue;
    const previous = occurrences[index - 1], before = records[index - 1];
    // Offsets are relative to travel direction, including negative segment references.
    const sameEdge = previous.map === occurrence.map && previous.segment === occurrence.segment && previous.direction === occurrence.direction;
    const fromNode = previous.direction === '+' ? before?.endNode : before?.startNode;
    const toNode = occurrence.direction === '+' ? record?.startNode : record?.endNode;
    if (sameEdge ? previous.endKey !== occurrence.startKey : previous.endKey !== '1' || occurrence.startKey !== '0' || !text(fromNode) || fromNode !== toNode) add('ROAD_CONNECTION_UNVERIFIED', id);
    const turn = transitions?.[index - 1];
    if (turn?.fromOccurrence !== index - 1 || turn.toOccurrence !== index || turn.allowed !== true) add('ROAD_TURN_UNVERIFIED', id);
    source(turn, 'ROAD_TURN', id);
  }
  for (const role of ['origin', 'destination']) {
    const access = evidence[role], occurrence = role === 'origin' ? occurrences[0] : occurrences.at(-1);
    const endpoint = role === 'origin' ? occurrence.first : occurrence.last;
    if (!access || !text(access.entranceId) || access.segmentRef !== occurrence.reference || !pointEqual(access.requestedLocation, request?.trip?.[role]) || !pointEqual(access.matchedLocation, endpoint)
        || access.method !== (role === 'origin' ? 'truck-exit' : 'truck-entrance')) add('ROAD_TRUCK_ENTRANCE_UNVERIFIED', role);
    source(access, 'ROAD_ACCESS', role);
  }
  return result();
}
