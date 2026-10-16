# Trip preparation and permit drafts — October 14, 2026

Trigger: the owner entered a next load and expected a calculated route. The live planner had no connected truck-routing service, and its generic readiness action was a dead end. The owner then clarified that the load is overdimensional with actual dimensions still unknown. No route can be inferred from the two cities.

## Change

- State the routing-service blocker before collecting truck dimensions. Rename the action to Review trip details; validate missing/identical places and show the entered trip without geocoding, directions, distance, ETA or a route line. Mouse and Enter paths stop the old calculation handler.
- Keep entered place text in this tab's session storage with a clear action and honest storage-failure feedback. Do not restore transient Current location labels or old persistent route records. No provider request or account sync.
- Make the permit workflow reachable before dimensions are known. Same-tab handoff copies only bounded place text, never truck presets, date, acknowledgments, permits, intermediate states or geometry. No place text enters the URL. Create a separate draft; existing wallet loads remain intact.
- Add pickup/delivery planning notes to the permit wallet and a Save draft action that permits unknown measurements to remain blank. Draft status lists missing data. New trips have no assumed travel date. Device save and export/import retain the notes; legacy packets still work. Notes do not become authorized permit entry/exit points.
- Include new permit dependencies in a versioned offline shell. Operational guidance and account/payment gates remain closed.

## Evidence and limits

196 automated tests passed, including six new tests covering denied/malformed storage, missing/identical places, transient GPS labels, no route requests, pending-data holds, handoff and legacy/new packet persistence. 127 JavaScript files plus four inline scripts parsed, 815 local references passed, and existing store metadata/billing/schema checks passed. These are implementation checks, not store approval or route certification.

Actual local browser checked a synthetic standard-truck profile, Enter-key trip review, permit handoff, blank measurements/date, saved draft reload and disabled guidance. No real provider request or route evidence was created. Browser production verification belongs in the release record after deployment.

## Provider evaluation

TomTom remains a candidate for standard-truck evaluation. Its official pricing page checked October 14 lists 20K Routing API requests monthly and no credit card needed to start: https://docs.tomtom.com/pricing . Its route documentation exposes truck mode, physical dimensions, weights and axle count, but warns full restriction data is not available everywhere: https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/calculate-route . Free quota is not proof that every planned navigation/display use is licensed. No account, key, terms acceptance, charge or TomTom adapter activation was performed. Existing HERE transport remains disabled; provider selection/access and authoritative coverage remain unresolved.

For overdimensional loads, a generic truck provider does not replace issued permits. Wait for actual loaded measurements, all issued route/condition pages and readable QR references. Preserve the exact authorized roads and state boundaries, identify gaps/conflicts, and hold guidance rather than inventing connecting roads or detours.
