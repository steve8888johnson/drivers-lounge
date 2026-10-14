# Road references and truck entrance review — October 14, 2026

Local implementation only. Public source remains `4b8d06d`. This is an offline evidence contract and failure screen, not verified road coverage. No provider request, deployment or guidance activation occurred.

## Concrete change

The disabled HERE adapter now requests `spans=segmentRef`. `truck-road-binding.mjs` checks span indexes against decoded geometry and preserves map version, directed segment identity and partial-segment range. Compact references expand from their own section's replacement dictionary. Unknown formats, missing replacements, ambiguous directions, incomplete partitions and mixed map versions hold. Bounds reuse the geometry review's section, character and point limits.

Exact decimal comparisons prevent rounding `0.99999999999999999` to `1` from manufacturing an intersection. Negative direction reverses canonical start/end nodes. A normalized evidence record is required for every road occurrence and transition, including section boundaries. Missing/forbidden turns, disconnected nodes, partial-range gaps, inconsistent repeated nodes and reordered data hold. No gaps are repaired or shapes reordered.

Evidence binds the route ID, current request fingerprint, exact section shapes, segment references and occurrences. Origin/destination records must identify a truck exit/entrance on the exact directed segment and match requested and matched endpoint coordinates. An address pin, nearby gate or opposite carriageway is insufficient. This initial contract supports facility exits/entrances only; independently validated current road position needs a separate method. Internal facility paths, turning clearance and loading-area suitability are not established.

Attributed records must have observation times and validity through candidate arrival. Times must match requested departure and join across sections. The 24-hour observation limit is an internal review policy, not law or a live-condition guarantee. Observation may precede a future effective date; the effective interval must cover the trip.

## Trust boundary

`reviewHereCandidate` accepts normalized road evidence only as a separate fourth argument. A payload's own `roadEvidence` is ignored. The server has **no** road-evidence supplier and holds without one; it now snapshots outgoing departure with endpoints. Never wire browser-supplied metadata directly into this argument.

Complete synthetic fields return only `REVIEW_REQUIRED`, always `guidanceAllowed:false`, without geometry or maneuvers. Source strings and booleans are unauthenticated claims. No map topology is fetched or authenticated. Physical bridge level/lane, independently matched geometry, complete source retrieval, road-rule interpretation, facility access and field validation remain critical open gates. This cannot replace vehicle or road-restriction reviews.

## Primary references inspected

- [HERE span guide](https://docs.here.com/routing/docs/routing-v8-span): offsets index section geometry; references link to map entities.
- [HERE entity reference specification](https://docs.here.com/intro-to-mapping-concepts/docs/entities-referencing): replacement tokens, catalog/version identity and directed ranges. This parser supports only HERE `cm` segments with explicit positive/negative direction and nonzero ranges; other schemas hold.
- [HERE segment example](https://docs.here.com/routing/docs/routing-v8-avoid-segments): compact references and canonical node direction. No routing/avoidance request was made.
- [HERE waypoint guide](https://docs.here.com/routing/docs/routing-v8-waypoints-overview): requested and matched locations can differ. Proximity cannot establish access.
- [NYC DOT truck routing](https://www.nyc.gov/html/dot/html/motorist/truckrouting.shtml): through/local use depends on the trip and destination access is conditional. This is neither nationwide exemption nor connected road coverage.

A guessed HERE documentation URL failed once; the official linked entity reference above was then used. No repeated polling.

## Validation and risks

Sixteen new tests exercise official reference syntax and synthetic cases: span gaps/overlaps; changed map/shape/profile; disconnected carriageways/decks; reverse direction; partial ranges; missing/forbidden turns; wrong gates; stale/conflicting sources; changed/impossible trip times; section ordering; malformed records. Full suite: 190 passed. Syntax: 123 files plus four inline scripts and server. Internal references: 809 across 56 pages. No UI changed, so no new browser/deployment check was needed.

| Risk | Status |
| --- | --- |
| Nearby line/address mistaken for access | Contained locally: explicit road and gate evidence required. |
| Forged road, entrance or turn claims | Critical/open: metadata is not authenticated evidence; no supplier connected. |
| Partial/old data mistaken for full coverage | Critical/open: no complete source retrieval; all 51 jurisdiction coverage records remain unknown. |
| Real clearance and last-mile safety | Critical/open: actual road/vehicle applicability, facility path and field evidence absent. |

Next: bounded complete-retrieval diagnostics against an official source schema, preserving unknown coverage for inventories and unresolved dates. Keep SMTP, credentials, accounts, navigation activation and PR4 unchanged.
