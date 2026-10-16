(function (root) {
  'use strict';
  // Diagnostic contract only. Caller-provided evidence is not authenticated authority.
  const checks = Object.freeze(['truckAccess', 'clearance', 'weight', 'dimensions', 'closures', 'destinationAccess']);
  // Conservative diagnostic window, not an authority's update schedule or legal rule.
  const maxObservationAgeMs = 24 * 60 * 60 * 1000;
  function timestamp(value) {
    // Date.parse alone normalizes impossible dates (e.g. February30) into a later month.
    const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/);
    if (!match) return NaN;
    const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return NaN;
    if (match[7] !== 'Z' && (Number(match[9]) > 14 || Number(match[10]) > 59 || (Number(match[9]) === 14 && Number(match[10]) !== 0) || match[7] === '-00:00')) return NaN;
    return Date.parse(value);
  }
  function assess(input = {}) {
    if (!input || typeof input !== 'object') input = {};
    const issues = [];
    const add = (code, message, segmentId = null) => issues.push({ code, message, segmentId });
    const profile = input.profile || {};
    for (const key of ['heightIn', 'widthIn', 'lengthFt', 'grossWeightLb', 'axleCount']) {
      if (typeof profile[key] !== 'number' || !Number.isFinite(profile[key]) || profile[key] <= 0)
        add('PROFILE_INVALID', `Enter a positive measured ${key}.`);
    }
    if (!Number.isInteger(profile.axleCount) || profile.axleCount < 2) add('AXLES_INVALID', 'Enter a whole axle count of at least two.');
    if (profile.confirmed !== true) add('PROFILE_UNCONFIRMED', 'Confirm the actual loaded vehicle measurements; presets are not measurements.');
    if (profile.oversize !== false || profile.hazmat !== false) add('OUTSIDE_SCOPE', 'This first review supports standard, non-hazmat trucks only.');
    if (typeof profile.revision !== 'string' || !profile.revision.trim()) add('PROFILE_REVISION', 'Vehicle profile revision is missing.');
    const route = input.route;
    if (!route || !Array.isArray(route.segments) || !route.segments.length || route.segments.length > 1000) {
      add('NO_ROUTE_EVIDENCE', 'No truck-route candidate with complete road restriction evidence is connected.');
    } else {
      const departure = timestamp(route.departure), arrival = timestamp(route.arrival);
      const now = input.now;
      if (!Number.isFinite(now) || !Number.isFinite(departure) || !Number.isFinite(arrival) || departure < now || arrival < departure)
        add('TIME_INVALID', 'A current departure and arrival with explicit time zones are required.');
      if (typeof route.id !== 'string' || !route.id.trim() || route.profileRevision !== profile.revision)
        add('ROUTE_BINDING', 'Route evidence does not match the current vehicle profile.');
      if (route.providerMode !== 'truck') add('NOT_TRUCK_ROUTE', 'Car-route fallback is prohibited.');
      const seen = new Set();
      for (const segment of route.segments) {
        const id = segment?.id;
        if (typeof id !== 'string' || !id.trim() || seen.has(id)) add('SEGMENT_INVALID', 'Each directed route segment needs a unique identifier.');
        seen.add(id);
        for (const kind of checks) {
          const evidence = segment?.evidence?.[kind];
          if (!evidence || evidence.status !== 'supported') {
            add(evidence?.status === 'restricted' ? 'RESTRICTED' : 'UNRESOLVED', `${kind}: missing, restricted or unresolved evidence.`, id);
            continue;
          }
          if (evidence.routeId !== route.id || evidence.profileRevision !== profile.revision || evidence.segmentId !== id)
            add('EVIDENCE_BINDING', `${kind}: evidence belongs to another route, segment or vehicle.`, id);
          if(evidence.sourceType!=='directed-restriction-record'||evidence.coverage!=='complete'||typeof evidence.sourceRecordId!=='string'||!evidence.sourceRecordId.trim())
            add('COVERAGE_UNVERIFIED', `${kind}: a directory, inventory point, partial feed or missing source record cannot establish directed-road coverage.`, id);
          let validUrl = false;
          try { const url=new URL(evidence.sourceUrl);validUrl=url.protocol==='https:'&&!url.username&&!url.password; } catch (_) {}
          if (!validUrl || typeof evidence.authority !== 'string' || !evidence.authority.trim() || typeof evidence.version !== 'string' || !evidence.version.trim())
            add('SOURCE_MISSING', `${kind}: authority, source and version are required.`, id);
          const checked = timestamp(evidence.checkedAt), from = timestamp(evidence.validFrom), until = timestamp(evidence.validUntil);
          // Fetching an old inventory today does not refresh the underlying observation.
          const observed=timestamp(evidence.observedAt);
          if(![observed,checked,now,arrival].every(Number.isFinite)||observed>checked||observed>now||now-observed>=maxObservationAgeMs||arrival>=observed+maxObservationAgeMs)
            add('SOURCE_OBSERVATION_STALE', `${kind}: require a source observation that covers arrival within the preliminary 24-hour review window. A page-fetch time is not a road observation.`, id);
          if (![checked, from, until, departure, arrival, now].every(Number.isFinite) || checked > now || checked > departure || from > departure || until <= arrival || until <= checked || from > until)
            add('EVIDENCE_EXPIRED', `${kind}: evidence is invalid or does not cover the entire trip.`, id);
        }
      }
    }
    return { status: issues.length ? 'HOLD' : 'REVIEW_REQUIRED', guidanceAllowed: false, issues,
      message: issues.length ? 'Truck route unavailable. Resolve the listed gaps first.' : 'Evidence fields passed preliminary checks. Source authentication, road coverage and field validation are still required.' };
  }
  root.DLTruckRouteReadiness = Object.freeze({ assess, checks, maxObservationAgeMs });
})(typeof window === 'undefined' ? globalThis : window);
