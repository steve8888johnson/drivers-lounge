# Truck provider evaluation — October 13, 2026

RouteXL reviewed: https://www.routexl.com/blog/api/ and https://docs.routexl.com/Options . Documented API is multi-stop ordering/time-window optimization. Vehicle choice exists, but inspected documentation does not establish complete US height, axle/bridge, length, or local truck restriction coverage. Not selected as truck-legality authority. If Steve meant a different product, obtain its exact listing.

HERE candidate, not a commercial commitment:
https://docs.here.com/routing/docs/routing-v8-truck-routing
https://docs.here.com/routing/docs/routing-v8-vehicle-properties
https://docs.here.com/routing/docs/routing-v8-admin-wide-restrictions
https://docs.here.com/routing/reference/routing-api-v8-calculateroutes

Findings: truck mode requires explicit vehicle attributes; omitted attributes can ignore physical restrictions. Time-independent planning ignores time-dependent restrictions. Provider may return violating routes. Administrative restriction notices can be info severity. Therefore neither route existence nor absence of critical notices proves suitability.

Implemented offline module src/assets/truck-provider-review.mjs. Prepares fixed-origin HERE request parameters using explicit metric dimensions/weights, axle group totals, real UTC departure, no alternatives and no car mode. Rejects missing measurements, unsupported hazmat/oversize, inconsistent weights, invalid locations/dates. Reviews one response candidate, rejects all notices conservatively, malformed structures, non-truck sections, missing geometry, changed or expired request context. Even clean responses remain REVIEW_REQUIRED and never expose maneuvers/geometry or enable guidance. No fetch implementation, API endpoint, keys, paid account, UI hookup or live routes.

Before live integration: verify licensing/pricing and credentials with owner approval; confirm full vehicle parameter coverage (including trailer length, axle spacing, kingpin distance and configuration as needed); define supported operating envelope; add secure request binding, bounded server-side transport, schema validation, geometry decoding/continuity, mapped jurisdiction coverage and independent restriction validation. Current request fingerprint must be supplied by trusted future server logic, not accepted as browser authority. Geometry presence alone is not geometry validation. Do not apply stop reordering or this generated-route adapter to issued permit routes.

Validation: seven new offline tests passed; syntax98 files+4 inline. Synthetic examples are test fixtures, not drivable routes. No new fees, external requests containing locations, or production changes.
