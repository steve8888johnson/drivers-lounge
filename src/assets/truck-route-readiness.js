(function (root) {
  'use strict';
  // Diagnostic contract only. Caller-provided evidence is not authenticated authority.
  const checks = Object.freeze(['truckAccess', 'clearance', 'weight', 'dimensions', 'closures', 'destinationAccess']);
  const timestamp = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
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
    if (!route || !Array.isArray(route.segments) || !route.segments.length) {
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
          let validUrl = false;
          try { validUrl = new URL(evidence.sourceUrl).protocol === 'https:'; } catch (_) {}
          if (!validUrl || typeof evidence.authority !== 'string' || !evidence.authority.trim() || typeof evidence.version !== 'string' || !evidence.version.trim())
            add('SOURCE_MISSING', `${kind}: authority, source and version are required.`, id);
          const checked = timestamp(evidence.checkedAt), from = timestamp(evidence.validFrom), until = timestamp(evidence.validUntil);
          if (![checked, from, until, departure, arrival, now].every(Number.isFinite) || checked > now || checked > departure || from > departure || until <= arrival || until <= checked || from > until)
            add('EVIDENCE_EXPIRED', `${kind}: evidence is invalid or does not cover the entire trip.`, id);
        }
      }
    }
    return { status: issues.length ? 'HOLD' : 'REVIEW_REQUIRED', guidanceAllowed: false, issues,
      message: issues.length ? 'Truck route unavailable. Resolve the listed gaps first.' : 'Evidence fields passed preliminary checks. Source authentication, road coverage and field validation are still required.' };
  }
  root.DLTruckRouteReadiness = Object.freeze({ assess, checks });
})(typeof window === 'undefined' ? globalThis : window);
